/**
 * Web trigger: create HackDay instance from HackCentral web app (Phase 3).
 * Accepts the same wizard payload as the Confluence macro, plus creatorEmail.
 * Secured by shared secret (header or body).
 */

import {
  HDC_RUNTIME_CONFIG_ERROR_CODE,
} from './shared/types';
import type {
  AppRuntimeOwner,
  CreateInstanceDraftInput,
  CreateInstanceDraftResult,
  RuntimeConfigDiagnostics,
  ViewerContext,
} from './shared/types';
import { HdcService } from './backend/hdcService';

const HEADER_SECRET = 'x-hackday-create-secret';

interface WebTriggerRequest {
  method: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: string;
}

type RuntimeConfigError = Error & {
  code: string;
  diagnostics: RuntimeConfigDiagnostics;
};

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

function normalizeEnvValue(value: string | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? normalized : null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function resolveCreateFromWebRuntimeMissingVars(): string[] {
  const runtimeAppId = normalizeEnvValue(process.env.HDC_RUNTIME_APP_ID);
  const forgeAppId = normalizeEnvValue(process.env.FORGE_APP_ID);
  const runtimeEnvironmentId = normalizeEnvValue(process.env.HDC_RUNTIME_ENVIRONMENT_ID);
  const forgeEnvironmentId = normalizeEnvValue(process.env.FORGE_ENVIRONMENT_ID);
  const runtimeMacroKey = normalizeEnvValue(process.env.HDC_RUNTIME_MACRO_KEY);
  const forgeSiteUrl = normalizeEnvValue(process.env.FORGE_SITE_URL);
  const missingVars: string[] = [];

  if (!runtimeAppId && !forgeAppId) {
    missingVars.push('HDC_RUNTIME_APP_ID', 'FORGE_APP_ID');
  }
  if (!runtimeEnvironmentId && !forgeEnvironmentId) {
    missingVars.push('HDC_RUNTIME_ENVIRONMENT_ID', 'FORGE_ENVIRONMENT_ID');
  }
  if (!runtimeMacroKey) {
    missingVars.push('HDC_RUNTIME_MACRO_KEY');
  }
  if (!forgeSiteUrl) {
    missingVars.push('FORGE_SITE_URL');
  }

  return unique(missingVars);
}

function logRuntimeConfigFailure(message: string, diagnostics: RuntimeConfigDiagnostics): void {
  console.error(
    '[createFromWeb][runtime-config]',
    JSON.stringify({
      errorCode: HDC_RUNTIME_CONFIG_ERROR_CODE,
      message,
      owner: diagnostics.owner,
      configValid: diagnostics.configValid,
      missingVars: diagnostics.missingVars,
      routeSource: diagnostics.routeSource,
    })
  );
}

function createRuntimeConfigError(message: string, diagnostics: RuntimeConfigDiagnostics): RuntimeConfigError {
  const error = new Error(`[${HDC_RUNTIME_CONFIG_ERROR_CODE}] ${message}`) as RuntimeConfigError;
  error.code = HDC_RUNTIME_CONFIG_ERROR_CODE;
  error.diagnostics = diagnostics;
  logRuntimeConfigFailure(message, diagnostics);
  return error;
}

function normalizeRuntimeConfigDiagnostics(
  diagnostics: Partial<RuntimeConfigDiagnostics> | null | undefined
): RuntimeConfigDiagnostics {
  const owner = diagnostics?.owner === 'hd26forge' ? 'hd26forge' : 'hackcentral';
  const routeSource =
    typeof diagnostics?.routeSource === 'string' && diagnostics.routeSource.trim()
      ? diagnostics.routeSource
      : 'create_from_web';
  return {
    owner,
    configValid: Boolean(diagnostics?.configValid),
    missingVars: Array.isArray(diagnostics?.missingVars)
      ? diagnostics!.missingVars.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    routeSource,
  };
}

function getRuntimeConfigErrorDetails(error: unknown): {
  errorCode: string;
  message: string;
  diagnostics: RuntimeConfigDiagnostics;
} | null {
  if (!(error instanceof Error)) return null;
  const message = error.message || 'Runtime config error.';
  const code = (error as Partial<RuntimeConfigError>).code;
  const prefixed = message.includes(HDC_RUNTIME_CONFIG_ERROR_CODE);
  if (code !== HDC_RUNTIME_CONFIG_ERROR_CODE && !prefixed) {
    return null;
  }
  const diagnostics = normalizeRuntimeConfigDiagnostics(
    (error as Partial<RuntimeConfigError>).diagnostics
  );
  return {
    errorCode: HDC_RUNTIME_CONFIG_ERROR_CODE,
    message,
    diagnostics,
  };
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

    const runtimeOwner = String(result.appViewRuntimeOwner || '').trim().toLowerCase();
    const preferredRuntimeOwner = String(process.env.HDC_RUNTIME_OWNER || '').trim().toLowerCase();
    const expectsHackcentralRuntime = runtimeOwner === 'hackcentral' || preferredRuntimeOwner === 'hackcentral';
    const appViewUrl = typeof result.appViewUrl === 'string' ? result.appViewUrl.trim() : '';
    if (expectsHackcentralRuntime && !appViewUrl) {
      const diagnostics: RuntimeConfigDiagnostics = {
        owner: 'hackcentral' as AppRuntimeOwner,
        configValid: false,
        missingVars: resolveCreateFromWebRuntimeMissingVars(),
        routeSource: 'create_from_web_result_guard',
      };
      throw createRuntimeConfigError(
        'HackCentral runtime is enabled but appViewUrl is missing after draft creation.',
        diagnostics
      );
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify(result),
    };
  } catch (err) {
    const runtimeConfigError = getRuntimeConfigErrorDetails(err);
    if (runtimeConfigError) {
      const { diagnostics } = runtimeConfigError;
      return {
        statusCode: 400,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify({
          error: runtimeConfigError.message,
          errorCode: runtimeConfigError.errorCode,
          owner: diagnostics.owner,
          configValid: diagnostics.configValid,
          missingVars: diagnostics.missingVars,
          routeSource: diagnostics.routeSource,
        }),
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[createFromWeb]', message);
    return {
      statusCode: 400,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: message }),
    };
  }
}
