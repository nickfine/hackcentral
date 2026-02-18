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

interface MacroStorageSnippetOptions {
  targetAppId: string;
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

function escapeStorageText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getMacroStorageSnippet(options?: MacroStorageSnippetOptions): string {
  const appId = options?.targetAppId || process.env.FORGE_APP_ID || DEFAULT_APP_ID;
  const macroKey = options?.targetMacroKey || process.env.FORGE_MACRO_KEY || DEFAULT_MACRO_KEY;
  const fallbackLabel = options?.fallbackLabel || 'HackDay Central macro';
  const localId = crypto.randomUUID();

  return [
    '<ac:adf-extension>',
    '<ac:adf-node type="extension">',
    '<ac:adf-attribute key="extension-key">',
    macroKey,
    '</ac:adf-attribute>',
    '<ac:adf-attribute key="extension-type">com.atlassian.ecosystem</ac:adf-attribute>',
    `<ac:adf-attribute key="extension-id">${appId}/${macroKey}</ac:adf-attribute>`,
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

async function getParentPageMetadata(parentPageId: string): Promise<{ spaceId: string; macroSnippet: string | null }> {
  const response = await api.asApp().requestConfluence(
    route`/wiki/api/v2/pages/${parentPageId}?body-format=storage`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  await assertOk(response, 'Fetching parent page');
  const payload = await parseJson<ParentPagePayload>(response);
  const spaceId = payload.spaceId;
  if (!spaceId) {
    throw new Error(`Unable to determine Confluence space id for parent page ${parentPageId}.`);
  }

  return {
    spaceId: String(spaceId),
    macroSnippet: extractMacroExtensionBlock(payload.body?.storage?.value),
  };
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
  targetMacroKey?: string;
  fallbackLabel?: string;
}): Promise<{ pageId: string; pageUrl: string }> {
  const parentMetadata = await getParentPageMetadata(input.parentPageId);
  const hasExplicitTargetMacro = Boolean(input.targetAppId && input.targetMacroKey);
  const macroSnippet = hasExplicitTargetMacro
    ? getMacroStorageSnippet({
        targetAppId: input.targetAppId!,
        targetMacroKey: input.targetMacroKey!,
        fallbackLabel: input.fallbackLabel,
      })
    : parentMetadata.macroSnippet || getMacroStorageSnippet();
  const tagline = escapeStorageText(input.tagline || 'HackDay instance page');

  const response = await api.asApp().requestConfluence(route`/wiki/api/v2/pages`, {
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

  await assertOk(response, 'Creating child page');
  const payload = await parseJson<ConfluencePage>(response);

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
