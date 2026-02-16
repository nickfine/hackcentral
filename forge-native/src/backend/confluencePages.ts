import { requestConfluence, route } from '@forge/api';

const DEFAULT_APP_ID = 'f828e0d4-e9d0-451d-b818-533bc3e95680';
const DEFAULT_MACRO_KEY = 'hackday-central-macro';

interface ForgeResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

interface ConfluencePage {
  id: string;
  _links?: {
    base?: string;
    webui?: string;
  };
}

interface ParentPagePayload {
  id: string;
  space?: {
    key?: string;
  };
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

function getMacroStorageSnippet(): string {
  const appId = process.env.FORGE_APP_ID || DEFAULT_APP_ID;
  const macroKey = process.env.FORGE_MACRO_KEY || DEFAULT_MACRO_KEY;
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
    '<p>HackDay Central macro</p>',
    '</ac:adf-fallback>',
    '</ac:adf-extension>',
  ].join('');
}

async function getParentSpaceKey(parentPageId: string): Promise<string> {
  const response = await requestConfluence(
    route`/wiki/rest/api/content/${parentPageId}?expand=space`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  await assertOk(response, 'Fetching parent page');
  const payload = await parseJson<ParentPagePayload>(response);
  const spaceKey = payload.space?.key;
  if (!spaceKey) {
    throw new Error(`Unable to determine Confluence space key for parent page ${parentPageId}.`);
  }
  return spaceKey;
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
}): Promise<{ pageId: string; pageUrl: string }> {
  const spaceKey = await getParentSpaceKey(input.parentPageId);

  const response = await requestConfluence(route`/wiki/rest/api/content`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'page',
      title: input.title,
      ancestors: [{ id: Number(input.parentPageId) }],
      space: { key: spaceKey },
      body: {
        storage: {
          representation: 'storage',
          value: `<p>${input.tagline || 'HackDay instance page'}</p>${getMacroStorageSnippet()}`,
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
  const response = await requestConfluence(route`/wiki/rest/api/content/${pageId}`, {
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
  const response = await requestConfluence(route`/wiki/rest/api/user/email?accountId=${accountId}`, {
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
