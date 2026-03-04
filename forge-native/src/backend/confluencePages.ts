import api, { route } from '@forge/api';

const DEFAULT_APP_ID = 'f828e0d4-e9d0-451d-b818-533bc3e95680';
const DEFAULT_MACRO_KEY = 'hackday-central-macro';
const DEFAULT_RUNTIME_MACRO_KEY = 'hackday-runtime-macro';
const DEFAULT_LEGACY_MACRO_KEYS = ['hackday-2026-customui', 'hackday-central-customui', 'hackday-template-macro'];
const FULL_WIDTH_APPEARANCE_VALUE = 'full-width';
const FULL_WIDTH_PAGE_PROPERTY_KEYS = ['content-appearance-draft', 'content-appearance-published'] as const;
const HACKS_PARENT_PAGE_PROPERTY_KEY = 'hackcentral.hacks-parent-page-id';
const DEFAULT_HACKS_PARENT_TITLE = 'Hacks';
const SUBMISSIONS_PARENT_PAGE_PROPERTY_KEY = 'hackcentral.submissions-parent-page-id';
const DEFAULT_SUBMISSIONS_PARENT_TITLE = 'Submissions';

interface ForgeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

interface ConfluencePage {
  id: string;
  status?: string;
  title?: string;
  spaceId?: string | number;
  parentId?: string | number;
  version?: {
    number?: number;
    message?: string;
  };
  body?: {
    storage?: {
      value?: string;
      representation?: string;
    };
  };
  _links?: {
    base?: string;
    webui?: string;
  };
}

interface ConfluencePageProperty {
  id: string;
  key?: string;
  value?: unknown;
  version?: {
    number?: number;
  };
}

interface ConfluencePagePropertyListResponse {
  results?: ConfluencePageProperty[];
}

interface ParentPagePayload {
  id: string;
  spaceId?: string | number;
  body?: {
    storage?: {
      value?: string;
    };
  };
}

interface LegacyParentPagePayload {
  id: string;
  space?: {
    id?: number;
    key?: string;
  };
  body?: {
    storage?: {
      value?: string;
    };
  };
}

interface LegacySearchResponse {
  results?: ConfluencePage[];
}

interface MacroStorageSnippetOptions {
  targetAppId: string;
  targetEnvironmentId: string;
  targetMacroKey: string;
  fallbackLabel?: string;
}

export type MacroSignatureClass = 'runtime' | 'legacy' | 'missing';

export interface HackdayPageStylingInspection {
  pageId: string;
  reachable: boolean;
  requester: Requester | null;
  macroSignature: MacroSignatureClass;
  macroExtensionKey: string | null;
  hasLeadingParagraphBeforeMacro: boolean;
  fullWidthDraftValue: string | null;
  fullWidthPublishedValue: string | null;
  fullWidthDraftOk: boolean;
  fullWidthPublishedOk: boolean;
  recommendedAction: 'none' | 'repair_macro' | 'enforce_full_width' | 'strip_intro_paragraph' | 'repair_all';
  riskLevel: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface RepairHackdayPageStylingOptions {
  dryRun?: boolean;
  targetAppId?: string;
  targetEnvironmentId?: string;
  targetMacroKey?: string;
  fallbackLabel?: string;
}

export interface RepairHackdayPageStylingResult {
  pageId: string;
  dryRun: boolean;
  changed: boolean;
  macroRewritten: boolean;
  fullWidthUpdated: boolean;
  introParagraphRemoved: boolean;
  inspection: HackdayPageStylingInspection;
  reason?: string;
}

async function parseJson<T>(response: ForgeResponse): Promise<T> {
  const body = await response.text();
  if (!body) {
    throw new Error(`Confluence API returned empty response (${response.status}).`);
  }
  return JSON.parse(body) as T;
}

async function assertOk(response: ForgeResponse, operation: string): Promise<void> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${operation} failed (${response.status}): ${message}`);
  }
}

type Requester = 'app' | 'user';

function confluenceClient(requester: Requester) {
  return requester === 'user' ? api.asUser() : api.asApp();
}

function escapeStorageText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeConfluencePageId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

export function buildConfluencePageUrl(siteUrl: string | null | undefined, pageId: string): string {
  const normalizedPageId = normalizeConfluencePageId(pageId);
  if (!normalizedPageId) return '';
  const normalizedSiteUrl = typeof siteUrl === 'string' ? siteUrl.trim().replace(/\/$/, '') : '';
  if (!normalizedSiteUrl || normalizedSiteUrl === 'unknown-site') {
    return `/wiki/pages/viewpage.action?pageId=${encodeURIComponent(normalizedPageId)}`;
  }
  return `${normalizedSiteUrl}/wiki/pages/viewpage.action?pageId=${encodeURIComponent(normalizedPageId)}`;
}

function compactStorageSnippet(value: string | null | undefined, max = 400): string {
  if (!value) return '';
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

function extractAppUuid(appIdOrAri: string): string {
  const trimmed = appIdOrAri.trim();
  const ariMatch = trimmed.match(/app\/([0-9a-fA-F-]{36})$/);
  if (ariMatch) return ariMatch[1];
  const uuidMatch = trimmed.match(/[0-9a-fA-F-]{36}/);
  if (uuidMatch) return uuidMatch[0];
  return trimmed;
}

function normalizeEnvironmentId(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/apps\/[0-9a-fA-F-]{36}\/([0-9a-fA-F-]{36})\//i);
  if (urlMatch) return urlMatch[1];
  const uuidMatch = trimmed.match(/[0-9a-fA-F-]{36}/);
  if (uuidMatch) return uuidMatch[0];
  return trimmed;
}

function resolveExtensionEnvironmentId(targetEnvironmentId?: string): string {
  const explicit = normalizeEnvironmentId(targetEnvironmentId);
  if (explicit) return explicit;
  const forgeEnvironmentId = normalizeEnvironmentId(process.env.FORGE_ENVIRONMENT_ID);
  if (forgeEnvironmentId) return forgeEnvironmentId;
  return crypto.randomUUID();
}

function getMacroStorageSnippet(options?: MacroStorageSnippetOptions): string {
  const appId = options?.targetAppId || process.env.FORGE_APP_ID || DEFAULT_APP_ID;
  const appUuid = extractAppUuid(appId);
  const extensionEnvironmentId = resolveExtensionEnvironmentId(options?.targetEnvironmentId);
  const macroKey = options?.targetMacroKey || process.env.FORGE_MACRO_KEY || DEFAULT_MACRO_KEY;
  const fallbackLabel = options?.fallbackLabel || 'HackDay Central macro';
  const localId = crypto.randomUUID();

  return [
    '<ac:adf-extension>',
    '<ac:adf-node type="extension">',
    '<ac:adf-attribute key="extension-key">',
    `${appUuid}/${extensionEnvironmentId}/static/${macroKey}`,
    '</ac:adf-attribute>',
    '<ac:adf-attribute key="extension-type">com.atlassian.ecosystem</ac:adf-attribute>',
    '<ac:adf-attribute key="parameters">',
    `<ac:adf-parameter key="local-id">${localId}</ac:adf-parameter>`,
    '</ac:adf-attribute>',
    '</ac:adf-node>',
    '<ac:adf-fallback>',
    `<p>${escapeStorageText(fallbackLabel)}</p>`,
    '</ac:adf-fallback>',
    '</ac:adf-extension>',
  ].join('');
}

function extractMacroExtensionBlock(storageValue: string | undefined): string | null {
  if (!storageValue) return null;
  const match = storageValue.match(/<ac:adf-extension>[\s\S]*?<\/ac:adf-extension>/i);
  return match ? match[0] : null;
}

function extractMacroExtensionKey(macroBlock: string | null): string | null {
  if (!macroBlock) return null;
  const match = macroBlock.match(/<ac:adf-attribute key="extension-key">([\s\S]*?)<\/ac:adf-attribute>/i);
  if (!match?.[1]) return null;
  const value = match[1].trim();
  return value || null;
}

function parseMacroKeys(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getRuntimeMacroKeys(): Set<string> {
  const fromEnv = [
    ...parseMacroKeys(process.env.HDC_RUNTIME_MACRO_KEY),
    ...parseMacroKeys(process.env.FORGE_MACRO_KEY),
  ];
  return new Set([DEFAULT_RUNTIME_MACRO_KEY, DEFAULT_MACRO_KEY, ...fromEnv]);
}

function getLegacyMacroKeys(): Set<string> {
  const fromEnv = parseMacroKeys(process.env.HACKDAY_TEMPLATE_MACRO_KEY);
  return new Set([...DEFAULT_LEGACY_MACRO_KEYS, ...fromEnv]);
}

function inferMacroSignatureClass(macroExtensionKey: string | null): MacroSignatureClass {
  if (!macroExtensionKey) return 'missing';
  const runtimeKeys = getRuntimeMacroKeys();
  for (const key of runtimeKeys) {
    if (macroExtensionKey.includes(`/static/${key}`)) return 'runtime';
  }
  const legacyKeys = getLegacyMacroKeys();
  for (const key of legacyKeys) {
    if (macroExtensionKey.includes(`/static/${key}`)) return 'legacy';
  }
  if (macroExtensionKey.includes('/static/')) return 'legacy';
  return 'missing';
}

function replaceAdfAttributeValue(snippet: string, attributeKey: string, value: string): string {
  const pattern = new RegExp(
    `(<ac:adf-attribute key="${attributeKey}">)[\\s\\S]*?(<\\/ac:adf-attribute>)`,
    'ig'
  );
  return snippet.replace(pattern, `$1${value}$2`);
}

function replaceAdfParameterValue(snippet: string, parameterKey: string, value: string): string {
  const pattern = new RegExp(
    `(<ac:adf-parameter key="${parameterKey}">)[\\s\\S]*?(<\\/ac:adf-parameter>)`,
    'ig'
  );
  return snippet.replace(pattern, `$1${value}$2`);
}

function retargetMacroExtensionBlock(
  parentSnippet: string,
  options: Required<Pick<MacroStorageSnippetOptions, 'targetAppId' | 'targetMacroKey' | 'targetEnvironmentId'>> & {
    fallbackLabel: string;
  }
): string {
  const appUuid = extractAppUuid(options.targetAppId);
  const extensionEnvironmentId = resolveExtensionEnvironmentId(options.targetEnvironmentId);
  const localId = crypto.randomUUID();
  const extensionKey = `${appUuid}/${extensionEnvironmentId}/static/${options.targetMacroKey}`;
  const extensionAri = `ari:cloud:ecosystem::extension/${appUuid}/${extensionEnvironmentId}/static/${options.targetMacroKey}`;

  let snippet = parentSnippet;
  snippet = replaceAdfAttributeValue(snippet, 'extension-key', extensionKey);
  snippet = replaceAdfAttributeValue(snippet, 'extension-id', extensionAri);
  snippet = replaceAdfParameterValue(snippet, 'local-id', localId);
  snippet = replaceAdfParameterValue(snippet, 'extension-id', extensionAri);
  snippet = replaceAdfParameterValue(snippet, 'app-id', appUuid);
  snippet = replaceAdfParameterValue(snippet, 'environment-id', extensionEnvironmentId);
  snippet = replaceAdfParameterValue(snippet, 'key', options.targetMacroKey);
  snippet = snippet.replace(
    /(<ac:adf-fallback>[\s\S]*?<p>)[\s\S]*?(<\/p>[\s\S]*?<\/ac:adf-fallback>)/i,
    `$1${escapeStorageText(options.fallbackLabel)}$2`
  );
  return snippet;
}

function storageParagraph(label: string, value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  const rendered = trimmed.length > 0 ? trimmed : 'Not provided';
  return `<p><strong>${escapeStorageText(label)}:</strong> ${escapeStorageText(rendered)}</p>`;
}

function storageList(items: string[]): string {
  if (items.length === 0) {
    return '<p>None listed.</p>';
  }
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

export interface HackPageStorageInput {
  title: string;
  description?: string | null;
  assetType: string;
  visibility: string;
  authorName: string;
  tags: string[];
  sourceEventId?: string | null;
  demoUrl?: string | null;
  teamMembers: string[];
  outputLinks: Array<{ title: string; url: string }>;
  backLinkUrl?: string | null;
}

export function buildHackPageStorageValue(input: HackPageStorageInput): string {
  const outputItems = input.outputLinks.map((output) => {
    const title = escapeStorageText(output.title);
    const url = escapeStorageText(output.url);
    return `<a href="${url}">${title}</a>`;
  });
  const backLinkUrl = typeof input.backLinkUrl === 'string' ? input.backLinkUrl.trim() : '';
  return [
    '<h1>Hack Overview</h1>',
    `<p>${escapeStorageText(input.description?.trim() || 'No description provided.')}</p>`,
    '<h2>Metadata</h2>',
    storageParagraph('Type', input.assetType),
    storageParagraph('Visibility', input.visibility),
    storageParagraph('Author', input.authorName),
    storageParagraph('Source event', input.sourceEventId || null),
    storageParagraph('Demo URL', input.demoUrl || null),
    storageParagraph('Tags', input.tags.join(', ')),
    '<h2>Team</h2>',
    storageList(input.teamMembers.map((member) => escapeStorageText(member))),
    '<h2>Outputs</h2>',
    storageList(outputItems),
    '<h2>Navigation</h2>',
    backLinkUrl
      ? `<p><a href="${escapeStorageText(backLinkUrl)}">Back to HackCentral</a></p>`
      : '<p>Back link unavailable.</p>',
  ].join('');
}

export interface HackOutputPageStorageInput {
  outputTitle: string;
  sourceReference: string;
  content?: string | null;
}

export function buildHackOutputPageStorageValue(input: HackOutputPageStorageInput): string {
  return [
    '<h1>Hack Output</h1>',
    storageParagraph('Output title', input.outputTitle),
    storageParagraph('Source reference', input.sourceReference),
    '<h2>Main content</h2>',
    `<p>${escapeStorageText(input.content?.trim() || 'No content captured yet.')}</p>`,
    '<h2>Notes</h2>',
    '<p>Document usage guidance, assumptions, and follow-up actions here.</p>',
  ].join('');
}

async function getParentPageMetadata(parentPageId: string): Promise<{ spaceId: string; macroSnippet: string | null }> {
  const attempts: Array<{ requester: Requester; apiVersion: 'v2' | 'v1' }> = [
    { requester: 'app', apiVersion: 'v2' },
    { requester: 'user', apiVersion: 'v2' },
    { requester: 'app', apiVersion: 'v1' },
    { requester: 'user', apiVersion: 'v1' },
  ];
  let lastFailure = '';

  for (const attempt of attempts) {
    if (attempt.apiVersion === 'v2') {
      let response: ForgeResponse;
      try {
        response = await confluenceClient(attempt.requester).requestConfluence(
          route`/wiki/api/v2/pages/${parentPageId}?body-format=storage`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        );
      } catch (error) {
        lastFailure = `${attempt.requester}/v2 request error: ${error instanceof Error ? error.message : String(error)}`;
        continue;
      }

      if (!response.ok) {
        lastFailure = `${attempt.requester}/v2 ${response.status}: ${await response.text()}`;
        continue;
      }
      const payload = await parseJson<ParentPagePayload>(response);
      const spaceId = payload.spaceId;
      if (!spaceId) {
        lastFailure = `${attempt.requester}/v2 missing spaceId`;
        continue;
      }

      return {
        spaceId: String(spaceId),
        macroSnippet: extractMacroExtensionBlock(payload.body?.storage?.value),
      };
    }

    let legacyResponse: ForgeResponse;
    try {
      legacyResponse = await confluenceClient(attempt.requester).requestConfluence(
        route`/wiki/rest/api/content/${parentPageId}?expand=body.storage,space`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );
    } catch (error) {
      lastFailure = `${attempt.requester}/v1 request error: ${error instanceof Error ? error.message : String(error)}`;
      continue;
    }
    if (!legacyResponse.ok) {
      lastFailure = `${attempt.requester}/v1 ${legacyResponse.status}: ${await legacyResponse.text()}`;
      continue;
    }
    const legacyPayload = await parseJson<LegacyParentPagePayload>(legacyResponse);
    const legacySpaceId = legacyPayload.space?.id;
    if (!legacySpaceId) {
      lastFailure = `${attempt.requester}/v1 missing space.id`;
      continue;
    }

    return {
      spaceId: String(legacySpaceId),
      macroSnippet: extractMacroExtensionBlock(legacyPayload.body?.storage?.value),
    };
  }

  throw new Error(
    `Fetching parent page failed for ${parentPageId}. Last attempt: ${lastFailure || 'unknown failure'}.`
  );
}

function extractPageUrl(payload: ConfluencePage): string {
  const base = payload._links?.base || '';
  const webui = payload._links?.webui || '';
  if (!base || !webui) {
    return '';
  }
  return `${base}${webui}`;
}

function escapeCqlString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function isDuplicateConfluenceTitleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('A page with this title already exists');
}

export async function findChildPageByTitleUnderParent(input: {
  parentPageId: string;
  title: string;
}): Promise<{ pageId: string; pageUrl: string } | null> {
  const parentPageId = normalizeConfluencePageId(input.parentPageId);
  const title = input.title.trim();
  if (!parentPageId || !title) return null;

  const cqlVariants = [
    `type=page and parent=${parentPageId} and title="${escapeCqlString(title)}"`,
    `type=page and title="${escapeCqlString(title)}"`,
  ];
  for (const requester of ['app', 'user'] as const) {
    for (const cql of cqlVariants) {
      try {
        const response = await confluenceClient(requester).requestConfluence(
          route`/wiki/rest/api/content/search?cql=${cql}&limit=5`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        );
        if (!response.ok) {
          continue;
        }
        const payload = await parseJson<LegacySearchResponse>(response);
        const page = Array.isArray(payload.results)
          ? payload.results.find((item) => normalizeConfluencePageId(item.id))
          : null;
        if (!page?.id) continue;
        return {
          pageId: page.id,
          pageUrl: extractPageUrl(page) || buildConfluencePageUrl(null, page.id),
        };
      } catch {
        // Continue and try alternate requester/query.
      }
    }
  }
  return null;
}

async function createPageUnderParentWithStorage(input: {
  parentPageId: string;
  title: string;
  storageValue: string;
  nonBlockingFullWidth?: boolean;
}): Promise<{ pageId: string; pageUrl: string }> {
  const parentMetadata = await getParentPageMetadata(input.parentPageId);
  let payload: ConfluencePage | null = null;
  let lastFailure = '';

  for (const requester of ['app', 'user'] as const) {
    let response: ForgeResponse;
    try {
      response = await confluenceClient(requester).requestConfluence(route`/wiki/api/v2/pages`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'current',
          title: input.title,
          spaceId: parentMetadata.spaceId,
          parentId: input.parentPageId,
          body: {
            storage: {
              representation: 'storage',
              value: input.storageValue,
            },
          },
        }),
      });
    } catch (error) {
      const failure = `${requester}/v2 request error: ${error instanceof Error ? error.message : String(error)}`;
      if (!(requester === 'user' && failure.includes('AUTH_TYPE_UNAVAILABLE'))) {
        lastFailure = failure;
      }
      continue;
    }
    if (!response.ok) {
      const failure = `${requester}/v2 ${response.status}: ${await response.text()}`;
      if (!(requester === 'user' && failure.includes('AUTH_TYPE_UNAVAILABLE'))) {
        lastFailure = failure;
      }
      continue;
    }
    payload = await parseJson<ConfluencePage>(response);
    break;
  }

  if (!payload) {
    throw new Error(`Creating child page failed. Last attempt: ${lastFailure || 'unknown failure'}`);
  }
  if (!payload.id) {
    throw new Error('Confluence API did not return child page id.');
  }

  const childPageId = payload.id;
  const logFullWidthWarning = (error: unknown): void => {
    console.warn(
      '[hdc-page-layout-warning]',
      JSON.stringify({
        pageId: childPageId,
        message: error instanceof Error ? error.message : String(error),
      })
    );
  };

  if (input.nonBlockingFullWidth) {
    void ensurePageFullWidthByDefault(childPageId).catch(logFullWidthWarning);
  } else {
    try {
      await ensurePageFullWidthByDefault(childPageId);
    } catch (error) {
      logFullWidthWarning(error);
    }
  }

  return {
    pageId: childPageId,
    pageUrl: extractPageUrl(payload),
  };
}

async function getPagePropertyByKey(
  pageId: string,
  propertyKey: string,
  requester: Requester
): Promise<ConfluencePageProperty | null> {
  const response = await confluenceClient(requester).requestConfluence(
    route`/wiki/api/v2/pages/${pageId}/properties?key=${propertyKey}&limit=1`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );
  await assertOk(response, `Fetching page property '${propertyKey}' for page ${pageId}`);
  const payload = await parseJson<ConfluencePagePropertyListResponse>(response);
  const results = Array.isArray(payload.results) ? payload.results : [];
  return results[0] || null;
}

async function getPagePropertyValueByKeyWithFallback(pageId: string, propertyKey: string): Promise<string | null> {
  for (const requester of ['app', 'user'] as const) {
    try {
      const property = await getPagePropertyByKey(pageId, propertyKey, requester);
      const value = property?.value;
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (value && typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return null;
        }
      }
      return null;
    } catch {
      // Continue and try alternate requester.
    }
  }
  return null;
}

async function upsertPageProperty(
  pageId: string,
  propertyKey: string,
  value: string,
  requester: Requester
): Promise<void> {
  const existing = await getPagePropertyByKey(pageId, propertyKey, requester);
  if (existing?.id) {
    const currentVersion = Number(existing.version?.number || 1);
    const response = await confluenceClient(requester).requestConfluence(
      route`/wiki/api/v2/pages/${pageId}/properties/${existing.id}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: propertyKey,
          value,
          version: {
            number: currentVersion + 1,
            message: 'Set default page appearance to full-width',
          },
        }),
      }
    );
    await assertOk(response, `Updating page property '${propertyKey}' for page ${pageId}`);
    return;
  }

  const response = await confluenceClient(requester).requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: propertyKey,
      value,
    }),
  });
  await assertOk(response, `Creating page property '${propertyKey}' for page ${pageId}`);
}

export async function ensurePageFullWidthByDefault(pageId: string): Promise<void> {
  const failures: string[] = [];
  for (const propertyKey of FULL_WIDTH_PAGE_PROPERTY_KEYS) {
    let success = false;
    let lastFailure = '';
    for (const requester of ['app', 'user'] as const) {
      try {
        await upsertPageProperty(pageId, propertyKey, FULL_WIDTH_APPEARANCE_VALUE, requester);
        success = true;
        break;
      } catch (error) {
        lastFailure = `${requester}: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    if (!success) {
      failures.push(`${propertyKey} -> ${lastFailure || 'unknown error'}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed to set full-width appearance properties. ${failures.join(' | ')}`);
  }
}

async function fetchPageContent(pageId: string, requester: Requester): Promise<ConfluencePage> {
  const response = await confluenceClient(requester).requestConfluence(
    route`/wiki/api/v2/pages/${pageId}?body-format=storage`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );
  await assertOk(response, `Fetching page content for ${pageId}`);
  return parseJson<ConfluencePage>(response);
}

async function fetchPageContentWithFallback(
  pageId: string
): Promise<{ page: ConfluencePage; requester: Requester } | null> {
  for (const requester of ['app', 'user'] as const) {
    try {
      const page = await fetchPageContent(pageId, requester);
      return { page, requester };
    } catch {
      // Continue and try alternate requester.
    }
  }
  return null;
}

async function updatePageContentStorage(
  page: ConfluencePage,
  bodyStorageValue: string,
  requester: Requester
): Promise<void> {
  const pageId = page.id;
  const title = page.title?.trim();
  if (!pageId || !title) {
    throw new Error('Missing page id/title for page content update.');
  }
  const nextVersion = Number(page.version?.number || 0) + 1;
  const response = await confluenceClient(requester).requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: pageId,
      status: page.status || 'current',
      title,
      ...(page.spaceId ? { spaceId: String(page.spaceId) } : {}),
      ...(page.parentId ? { parentId: String(page.parentId) } : {}),
      version: {
        number: nextVersion,
        message: 'Remove injected child page intro paragraph',
      },
      body: {
        representation: 'storage',
        value: bodyStorageValue,
      },
    }),
  });
  await assertOk(response, `Updating page content for ${pageId}`);
}

export async function setPageStorageContent(pageId: string, bodyStorageValue: string): Promise<void> {
  const failures: string[] = [];
  for (const requester of ['app', 'user'] as const) {
    try {
      const page = await fetchPageContent(pageId, requester);
      await updatePageContentStorage(page, bodyStorageValue, requester);
      return;
    } catch (error) {
      failures.push(`${requester}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to update page content for ${pageId}. ${failures.join(' | ') || 'unknown error'}`);
}

export async function stripInjectedChildPageIntroParagraph(pageId: string): Promise<{
  updated: boolean;
  reason?: string;
}> {
  let page: ConfluencePage | null = null;
  const failures: string[] = [];
  let successfulRequester: Requester | null = null;

  for (const requester of ['app', 'user'] as const) {
    try {
      page = await fetchPageContent(pageId, requester);
      successfulRequester = requester;
      break;
    } catch (error) {
      failures.push(`${requester}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!page || !successfulRequester) {
    throw new Error(`Unable to fetch page ${pageId}. ${failures.join(' | ') || 'unknown error'}`);
  }

  const original = page.body?.storage?.value || '';
  if (!original.trim()) {
    return { updated: false, reason: 'empty_body' };
  }

  if (!extractMacroExtensionBlock(original)) {
    return { updated: false, reason: 'no_macro_extension_block' };
  }

  const stripped = original.replace(/^\s*<p>[\s\S]*?<\/p>\s*(?=<ac:adf-extension>)/i, '');
  if (stripped === original) {
    return { updated: false, reason: 'no_leading_paragraph_before_macro' };
  }

  await updatePageContentStorage(page, stripped, successfulRequester);
  return { updated: true };
}

export async function inspectHackdayPageStyling(pageId: string): Promise<HackdayPageStylingInspection> {
  const fetched = await fetchPageContentWithFallback(pageId);
  if (!fetched) {
    return {
      pageId,
      reachable: false,
      requester: null,
      macroSignature: 'missing',
      macroExtensionKey: null,
      hasLeadingParagraphBeforeMacro: false,
      fullWidthDraftValue: null,
      fullWidthPublishedValue: null,
      fullWidthDraftOk: false,
      fullWidthPublishedOk: false,
      recommendedAction: 'repair_all',
      riskLevel: 'high',
      reason: 'page_unreachable',
    };
  }

  const storage = fetched.page.body?.storage?.value || '';
  const macroBlock = extractMacroExtensionBlock(storage);
  const macroExtensionKey = extractMacroExtensionKey(macroBlock);
  const macroSignature = inferMacroSignatureClass(macroExtensionKey);
  const hasLeadingParagraphBeforeMacro = /^\s*<p>[\s\S]*?<\/p>\s*(?=<ac:adf-extension>)/i.test(storage);
  const [fullWidthDraftValue, fullWidthPublishedValue] = await Promise.all([
    getPagePropertyValueByKeyWithFallback(pageId, 'content-appearance-draft'),
    getPagePropertyValueByKeyWithFallback(pageId, 'content-appearance-published'),
  ]);
  const fullWidthDraftOk = fullWidthDraftValue === FULL_WIDTH_APPEARANCE_VALUE;
  const fullWidthPublishedOk = fullWidthPublishedValue === FULL_WIDTH_APPEARANCE_VALUE;

  const needsMacroRepair = macroSignature === 'legacy';
  const needsFullWidthRepair = !fullWidthDraftOk || !fullWidthPublishedOk;
  const needsIntroStrip = hasLeadingParagraphBeforeMacro;
  const issueCount = [needsMacroRepair, needsFullWidthRepair, needsIntroStrip].filter(Boolean).length;

  const recommendedAction: HackdayPageStylingInspection['recommendedAction'] =
    issueCount === 0
      ? 'none'
      : issueCount > 1
        ? 'repair_all'
        : needsMacroRepair
          ? 'repair_macro'
          : needsFullWidthRepair
            ? 'enforce_full_width'
            : 'strip_intro_paragraph';
  const riskLevel: HackdayPageStylingInspection['riskLevel'] =
    !fetched.page.id || macroSignature === 'missing' ? 'high' : recommendedAction === 'none' ? 'low' : 'medium';

  return {
    pageId,
    reachable: true,
    requester: fetched.requester,
    macroSignature,
    macroExtensionKey,
    hasLeadingParagraphBeforeMacro,
    fullWidthDraftValue,
    fullWidthPublishedValue,
    fullWidthDraftOk,
    fullWidthPublishedOk,
    recommendedAction,
    riskLevel,
  };
}

export async function repairHackdayPageStyling(
  pageId: string,
  options: RepairHackdayPageStylingOptions = {}
): Promise<RepairHackdayPageStylingResult> {
  const inspection = await inspectHackdayPageStyling(pageId);
  if (!inspection.reachable) {
    return {
      pageId,
      dryRun: options.dryRun === true,
      changed: false,
      macroRewritten: false,
      fullWidthUpdated: false,
      introParagraphRemoved: false,
      inspection,
      reason: inspection.reason || 'page_unreachable',
    };
  }

  const dryRun = options.dryRun === true;
  const fetched = await fetchPageContentWithFallback(pageId);
  if (!fetched) {
    return {
      pageId,
      dryRun,
      changed: false,
      macroRewritten: false,
      fullWidthUpdated: false,
      introParagraphRemoved: false,
      inspection,
      reason: 'page_unreachable',
    };
  }

  const targetAppId = options.targetAppId || process.env.HDC_RUNTIME_APP_ID || process.env.FORGE_APP_ID || DEFAULT_APP_ID;
  const targetEnvironmentId =
    options.targetEnvironmentId || process.env.HDC_RUNTIME_ENVIRONMENT_ID || process.env.FORGE_ENVIRONMENT_ID || '';
  const targetMacroKey = options.targetMacroKey || process.env.HDC_RUNTIME_MACRO_KEY || DEFAULT_RUNTIME_MACRO_KEY;
  const fallbackLabel = options.fallbackLabel || 'HackDay runtime macro';

  const originalStorage = fetched.page.body?.storage?.value || '';
  let nextStorage = originalStorage;
  let macroRewritten = false;
  let introParagraphRemoved = false;

  if (inspection.macroSignature === 'legacy') {
    const macroBlock = extractMacroExtensionBlock(nextStorage);
    if (macroBlock) {
      const rewrittenMacro = retargetMacroExtensionBlock(macroBlock, {
        targetAppId,
        targetEnvironmentId,
        targetMacroKey,
        fallbackLabel,
      });
      if (rewrittenMacro !== macroBlock) {
        nextStorage = nextStorage.replace(macroBlock, rewrittenMacro);
        macroRewritten = true;
      }
    }
  }

  const stripped = nextStorage.replace(/^\s*<p>[\s\S]*?<\/p>\s*(?=<ac:adf-extension>)/i, '');
  if (stripped !== nextStorage) {
    nextStorage = stripped;
    introParagraphRemoved = true;
  }

  let fullWidthUpdated = false;
  if (!inspection.fullWidthDraftOk || !inspection.fullWidthPublishedOk) {
    fullWidthUpdated = true;
    if (!dryRun) {
      await ensurePageFullWidthByDefault(pageId);
    }
  }

  const contentChanged = nextStorage !== originalStorage;
  if (contentChanged && !dryRun) {
    await updatePageContentStorage(fetched.page, nextStorage, fetched.requester);
  }

  return {
    pageId,
    dryRun,
    changed: contentChanged || fullWidthUpdated,
    macroRewritten,
    fullWidthUpdated,
    introParagraphRemoved,
    inspection,
    reason: contentChanged || fullWidthUpdated ? undefined : 'no_repairs_needed',
  };
}

export async function createChildPageUnderParent(input: {
  parentPageId: string;
  title: string;
  tagline?: string;
  targetAppId?: string;
  targetEnvironmentId?: string;
  targetMacroKey?: string;
  fallbackLabel?: string;
  nonBlockingFullWidth?: boolean;
}): Promise<{ pageId: string; pageUrl: string }> {
  const parentMetadata = await getParentPageMetadata(input.parentPageId);
  const hasExplicitTargetMacro = Boolean(input.targetAppId && input.targetMacroKey && input.targetEnvironmentId);
  const macroSnippet = hasExplicitTargetMacro
    ? parentMetadata.macroSnippet
      ? retargetMacroExtensionBlock(parentMetadata.macroSnippet, {
          targetAppId: input.targetAppId!,
          targetEnvironmentId: input.targetEnvironmentId!,
          targetMacroKey: input.targetMacroKey!,
          fallbackLabel: input.fallbackLabel || 'HackDay template macro',
        })
      : getMacroStorageSnippet({
          targetAppId: input.targetAppId!,
          targetEnvironmentId: input.targetEnvironmentId!,
          targetMacroKey: input.targetMacroKey!,
          fallbackLabel: input.fallbackLabel,
        })
    : parentMetadata.macroSnippet || getMacroStorageSnippet();
  console.info(
    '[hdc-template-macro-debug]',
    JSON.stringify({
      parentPageId: input.parentPageId,
      hasExplicitTargetMacro,
      targetAppId: input.targetAppId || null,
      targetEnvironmentId: input.targetEnvironmentId || null,
      targetMacroKey: input.targetMacroKey || null,
      parentMacroSnippet: compactStorageSnippet(parentMetadata.macroSnippet),
      generatedMacroSnippet: compactStorageSnippet(macroSnippet),
    })
  );
  return createPageUnderParentWithStorage({
    parentPageId: input.parentPageId,
    title: input.title,
    // Keep child pages visually clean; the macro renders the real event hero/title.
    storageValue: macroSnippet,
    nonBlockingFullWidth: input.nonBlockingFullWidth,
  });
}

export async function createStandardChildPage(input: {
  parentPageId: string;
  title: string;
  storageValue: string;
  nonBlockingFullWidth?: boolean;
}): Promise<{ pageId: string; pageUrl: string }> {
  return createPageUnderParentWithStorage(input);
}

export async function ensureHacksParentPageUnderParent(input: {
  parentPageId: string;
  title?: string;
  description?: string;
  nonBlockingFullWidth?: boolean;
}): Promise<{ pageId: string; pageUrl: string }> {
  return ensureNamedParentPageUnderParent({
    parentPageId: input.parentPageId,
    propertyKey: HACKS_PARENT_PAGE_PROPERTY_KEY,
    defaultTitle: DEFAULT_HACKS_PARENT_TITLE,
    title: input.title,
    description: input.description || 'Container page for HackCentral hack records.',
    nonBlockingFullWidth: input.nonBlockingFullWidth,
  });
}

export async function ensureSubmissionsParentPageUnderEventPage(input: {
  eventPageId: string;
  title?: string;
  description?: string;
  nonBlockingFullWidth?: boolean;
}): Promise<{ pageId: string; pageUrl: string }> {
  return ensureNamedParentPageUnderParent({
    parentPageId: input.eventPageId,
    propertyKey: SUBMISSIONS_PARENT_PAGE_PROPERTY_KEY,
    defaultTitle: DEFAULT_SUBMISSIONS_PARENT_TITLE,
    title: input.title,
    description: input.description || 'Container page for HackDay submission documentation.',
    nonBlockingFullWidth: input.nonBlockingFullWidth,
  });
}

async function ensureNamedParentPageUnderParent(input: {
  parentPageId: string;
  propertyKey: string;
  defaultTitle: string;
  title?: string;
  description?: string;
  nonBlockingFullWidth?: boolean;
}): Promise<{ pageId: string; pageUrl: string }> {
  const parentPageId = normalizeConfluencePageId(input.parentPageId);
  if (!parentPageId) {
    throw new Error('A valid parentPageId is required to ensure a child parent page.');
  }

  const description = input.description?.trim() || 'Container page for HackCentral records.';
  const desiredTitle = input.title?.trim() || input.defaultTitle;
  const storedPageIdCandidates: string[] = [];

  for (const requester of ['app', 'user'] as const) {
    try {
      const prop = await getPagePropertyByKey(parentPageId, input.propertyKey, requester);
      const fromValue = normalizeConfluencePageId(prop?.value);
      if (fromValue) {
        storedPageIdCandidates.push(fromValue);
      }
    } catch {
      // Continue and attempt creation path.
    }
  }

  const uniqueStoredIds = [...new Set(storedPageIdCandidates)];
  for (const pageId of uniqueStoredIds) {
    try {
      const page = await fetchPageContent(pageId, 'app');
      return {
        pageId,
        pageUrl: extractPageUrl(page) || buildConfluencePageUrl(null, pageId),
      };
    } catch {
      // Continue to user requester fallback.
    }
    try {
      const page = await fetchPageContent(pageId, 'user');
      return {
        pageId,
        pageUrl: extractPageUrl(page) || buildConfluencePageUrl(null, pageId),
      };
    } catch {
      // Continue to create if inaccessible/missing.
    }
  }

  let created: { pageId: string; pageUrl: string };
  try {
    created = await createStandardChildPage({
      parentPageId,
      title: desiredTitle,
      storageValue: `<h1>${escapeStorageText(desiredTitle)}</h1><p>${escapeStorageText(description)}</p>`,
      nonBlockingFullWidth: input.nonBlockingFullWidth,
    });
  } catch (error) {
    if (!isDuplicateConfluenceTitleError(error)) {
      throw error;
    }
    const existing = await findChildPageByTitleUnderParent({
      parentPageId,
      title: desiredTitle,
    });
    if (existing) {
      created = existing;
    } else {
      created = await createStandardChildPage({
        parentPageId,
        title: `${desiredTitle} (${parentPageId})`,
        storageValue: `<h1>${escapeStorageText(desiredTitle)}</h1><p>${escapeStorageText(description)}</p>`,
        nonBlockingFullWidth: input.nonBlockingFullWidth,
      });
    }
  }

  for (const requester of ['app', 'user'] as const) {
    try {
      await upsertPageProperty(parentPageId, input.propertyKey, created.pageId, requester);
      break;
    } catch {
      // Best-effort property write.
    }
  }

  return created;
}

export async function deletePage(pageId: string): Promise<void> {
  const response = await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${pageId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  // Confluence may return 204 (deleted) or 404 (already absent).
  if (response.status === 404 || response.status === 204) {
    return;
  }

  await assertOk(response, `Deleting page ${pageId}`);
}

export async function getCurrentUserEmail(accountId: string): Promise<string | null> {
  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/user/email?accountId=${accountId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await parseJson<{ email?: string }>(response));
  if (!payload.email) {
    return null;
  }

  return payload.email;
}
