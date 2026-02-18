import api, { route } from '@forge/api';

const DEFAULT_APP_ID = 'f828e0d4-e9d0-451d-b818-533bc3e95680';
const DEFAULT_MACRO_KEY = 'hackday-central-macro';

interface ForgeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

interface ConfluencePage {
  id: string;
  spaceId?: string | number;
  _links?: {
    base?: string;
    webui?: string;
  };
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

interface MacroStorageSnippetOptions {
  targetAppId: string;
  targetEnvironmentId: string;
  targetMacroKey: string;
  fallbackLabel?: string;
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
      const response = await confluenceClient(attempt.requester).requestConfluence(
        route`/wiki/api/v2/pages/${parentPageId}?body-format=storage`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

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

    const legacyResponse = await confluenceClient(attempt.requester).requestConfluence(
      route`/wiki/rest/api/content/${parentPageId}?expand=body.storage,space`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );
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

export async function createChildPageUnderParent(input: {
  parentPageId: string;
  title: string;
  tagline?: string;
  targetAppId?: string;
  targetEnvironmentId?: string;
  targetMacroKey?: string;
  fallbackLabel?: string;
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
  const tagline = escapeStorageText(input.tagline || 'HackDay instance page');

  let payload: ConfluencePage | null = null;
  let lastFailure = '';
  for (const requester of ['app', 'user'] as const) {
    const response = await confluenceClient(requester).requestConfluence(route`/wiki/api/v2/pages`, {
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
            value: `<p>${tagline}</p>${macroSnippet}`,
          },
        },
      }),
    });
    if (!response.ok) {
      lastFailure = `${requester}/v2 ${response.status}: ${await response.text()}`;
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

  return {
    pageId: payload.id,
    pageUrl: extractPageUrl(payload),
  };
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
