import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockForgeResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  headers: {
    get: (name: string) => string | null;
  };
};

const forgeFetchMock = vi.fn<
  (
    ctx: Record<string, unknown>,
    path: string,
    init?: { method?: string; body?: string }
  ) => Promise<MockForgeResponse>
>();

function jsonResponse(payload: unknown, status = 200): MockForgeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    headers: {
      get: () => null,
    },
  };
}

function textResponse(body: string, status: number): MockForgeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    headers: {
      get: () => null,
    },
  };
}

describe('createChildPageUnderParent full-width defaults', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    (globalThis as unknown as { __forge_fetch__?: typeof forgeFetchMock }).__forge_fetch__ = forgeFetchMock;
  });

  it('sets both full-width appearance properties when creating a child page', async () => {
    forgeFetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'parent-1',
          spaceId: '42',
          body: { storage: { value: '<p>Parent page</p>' } },
        })
      ) // parent metadata
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'child-1',
          _links: {
            base: 'https://hackdaytemp.atlassian.net/wiki',
            webui: '/spaces/IS/pages/child-1',
          },
        })
      ) // create child
      .mockResolvedValueOnce(jsonResponse({ results: [] })) // draft property lookup
      .mockResolvedValueOnce(jsonResponse({ id: 'prop-draft', key: 'content-appearance-draft', value: 'full-width' })) // draft property create
      .mockResolvedValueOnce(jsonResponse({ results: [] })) // published property lookup
      .mockResolvedValueOnce(
        jsonResponse({ id: 'prop-published', key: 'content-appearance-published', value: 'full-width' })
      ); // published property create

    const { createChildPageUnderParent } = await import('../forge-native/src/backend/confluencePages');
    const result = await createChildPageUnderParent({
      parentPageId: 'parent-1',
      title: 'HDC Test Child',
      tagline: 'Test',
    });

    expect(result.pageId).toBe('child-1');
    expect(result.pageUrl).toBe('https://hackdaytemp.atlassian.net/wiki/spaces/IS/pages/child-1');

    const propertyCreateBodies = forgeFetchMock.mock.calls
      .filter(([, path, init]) => path.includes('/wiki/api/v2/pages/child-1/properties') && init?.method === 'POST')
      .map(([, , init]) => JSON.parse(String(init?.body)));

    expect(propertyCreateBodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'content-appearance-draft', value: 'full-width' }),
        expect.objectContaining({ key: 'content-appearance-published', value: 'full-width' }),
      ])
    );
  });

  it('falls back to asUser when asApp cannot update page appearance properties', async () => {
    forgeFetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'parent-2',
          spaceId: '42',
          body: { storage: { value: '<p>Parent page</p>' } },
        })
      ) // parent metadata via asApp
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'child-2',
          _links: {
            base: 'https://hackdaytemp.atlassian.net/wiki',
            webui: '/spaces/IS/pages/child-2',
          },
        })
      ) // create child via asApp
      .mockResolvedValueOnce(textResponse('forbidden', 403)) // draft property lookup via asApp
      .mockResolvedValueOnce(jsonResponse({ results: [] })) // draft property lookup via asUser
      .mockResolvedValueOnce(jsonResponse({ id: 'prop-draft-user', key: 'content-appearance-draft', value: 'full-width' })) // draft create via asUser
      .mockResolvedValueOnce(textResponse('forbidden', 403)) // published property lookup via asApp
      .mockResolvedValueOnce(jsonResponse({ results: [] })) // published property lookup via asUser
      .mockResolvedValueOnce(
        jsonResponse({ id: 'prop-published-user', key: 'content-appearance-published', value: 'full-width' })
      ); // published create via asUser

    const { createChildPageUnderParent } = await import('../forge-native/src/backend/confluencePages');
    const result = await createChildPageUnderParent({
      parentPageId: 'parent-2',
      title: 'HDC Fallback Child',
    });

    expect(result.pageId).toBe('child-2');
    const userCalls = forgeFetchMock.mock.calls.filter(([ctx]) => ctx.provider === 'user');
    expect(userCalls.length).toBeGreaterThan(0);
  });

  it('does not fail child-page creation when full-width property upsert fails', async () => {
    forgeFetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'parent-3',
          spaceId: '42',
          body: { storage: { value: '<p>Parent page</p>' } },
        })
      ) // parent metadata
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'child-3',
          _links: {
            base: 'https://hackdaytemp.atlassian.net/wiki',
            webui: '/spaces/IS/pages/child-3',
          },
        })
      ) // create child
      // all property operations fail for both app and user paths
      .mockResolvedValue(textResponse('forbidden', 403));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { createChildPageUnderParent } = await import('../forge-native/src/backend/confluencePages');
    const result = await createChildPageUnderParent({
      parentPageId: 'parent-3',
      title: 'HDC NonBlocking Child',
    });

    expect(result.pageId).toBe('child-3');
    expect(warnSpy).toHaveBeenCalledWith(
      '[hdc-page-layout-warning]',
      expect.stringContaining('"pageId":"child-3"')
    );
    warnSpy.mockRestore();
  });
});
