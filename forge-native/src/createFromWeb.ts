/**
 * Web trigger: create HackDay instance from HackCentral web app (Phase 3).
 * Accepts the same wizard payload as the Confluence macro, plus creatorEmail.
 * Secured by shared secret (header or body).
 */

import type { CreateInstanceDraftInput, CreateInstanceDraftResult, ViewerContext } from './shared/types';
import { HdcService } from './backend/hdcService';

const HEADER_SECRET = 'x-hackday-create-secret';

interface WebTriggerRequest {
  method: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
}

function getSecret(request: WebTriggerRequest): string | null {
  const headers = request.headers ?? {};
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === HEADER_SECRET
  );
  if (!key) return null;
  const raw = headers[key];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && raw.length > 0) return raw[0] ?? null;
  return null;
}

function parseBody(body: string | undefined): Record<string, unknown> {
  if (!body || !body.trim()) return {};
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function buildInput(raw: Record<string, unknown>, parentPageId: string): CreateInstanceDraftInput {
  const basicInfo = raw.basicInfo as CreateInstanceDraftInput['basicInfo'] | undefined;
  const schedule = raw.schedule as CreateInstanceDraftInput['schedule'] | undefined;
  const rules = raw.rules as CreateInstanceDraftInput['rules'] | undefined;
  const branding = raw.branding as CreateInstanceDraftInput['branding'] | undefined;
  const eventName =
    typeof basicInfo?.eventName === 'string' && basicInfo.eventName.trim()
      ? basicInfo.eventName.trim()
      : '';
  if (!eventName) {
    throw new Error('basicInfo.eventName is required.');
  }
  return {
    parentPageId,
    creationRequestId:
      typeof raw.creationRequestId === 'string' && raw.creationRequestId.trim()
        ? raw.creationRequestId.trim()
        : crypto.randomUUID(),
    wizardSchemaVersion: 2,
    completedStep: 6,
    launchMode: raw.launchMode === 'go_live' ? 'go_live' : 'draft',
    instanceRuntime: 'hackday_template',
    templateTarget: 'hackday',
    basicInfo: {
      eventName,
      eventIcon: typeof basicInfo?.eventIcon === 'string' ? basicInfo.eventIcon : '🚀',
      eventTagline:
        typeof basicInfo?.eventTagline === 'string' ? basicInfo.eventTagline : undefined,
      primaryAdminEmail:
        typeof basicInfo?.primaryAdminEmail === 'string'
          ? basicInfo.primaryAdminEmail.trim() || undefined
          : undefined,
      coAdminEmails: (() => {
        const emails = basicInfo?.coAdminEmails;
        return Array.isArray(emails)
          ? (emails as string[]).filter(
              (e): e is string => typeof e === 'string' && e.trim().length > 0
            )
          : undefined;
      })(),
    },
    schedule: schedule && typeof schedule === 'object' ? schedule : {},
    rules: rules && typeof rules === 'object' ? rules : undefined,
    branding: branding && typeof branding === 'object' ? branding : undefined,
  };
}

export async function handler(request: WebTriggerRequest): Promise<{
  statusCode: number;
  headers: Record<string, string[]>;
  body: string;
}> {
  if (request.method !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  const expectedSecret = process.env.HACKDAY_CREATE_WEB_SECRET?.trim();
  if (!expectedSecret) {
    console.error('[createFromWeb] HACKDAY_CREATE_WEB_SECRET is not set.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: 'Server configuration error.' }),
    };
  }

  const raw = parseBody(request.body);
  const secretFromHeader = getSecret(request);
  const secretFromBody = typeof raw.secret === 'string' ? raw.secret : undefined;
  const providedSecret = secretFromHeader ?? secretFromBody;
  if (providedSecret !== expectedSecret) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: 'Unauthorized.' }),
    };
  }

  const creatorEmail =
    typeof raw.creatorEmail === 'string' && raw.creatorEmail.trim()
      ? raw.creatorEmail.trim().toLowerCase()
      : null;
  if (!creatorEmail) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: 'creatorEmail is required.' }),
    };
  }

  const parentPageId =
    (typeof raw.parentPageId === 'string' && raw.parentPageId.trim()
      ? raw.parentPageId.trim()
      : null) ?? process.env.CONFLUENCE_HDC_PARENT_PAGE_ID?.trim() ?? null;
  if (!parentPageId) {
    console.error('[createFromWeb] CONFLUENCE_HDC_PARENT_PAGE_ID not set and parentPageId not in body.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: 'Server configuration error: parent page ID not set.' }),
    };
  }

  let input: CreateInstanceDraftInput;
  try {
    input = buildInput(raw, parentPageId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 400,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: message }),
    };
  }

  const syntheticViewer: ViewerContext = {
    accountId: `web:${creatorEmail}`,
    siteUrl: process.env.FORGE_SITE_URL ?? 'https://unknown.atlassian.net',
    timezone: 'UTC',
  };

  const hdcService = new HdcService();
  try {
    const result: CreateInstanceDraftResult = await hdcService.createInstanceDraft(
      syntheticViewer,
      input,
      { overrideCreatorEmail: creatorEmail }
    );
    return {
      statusCode: 200,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify(result),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[createFromWeb]', message);
    return {
      statusCode: 400,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: message }),
    };
  }
}
