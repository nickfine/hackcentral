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

describe('hackday page styling inspection and repair', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    (globalThis as unknown as { __forge_fetch__?: typeof forgeFetchMock }).__forge_fetch__ = forgeFetchMock;
  });

  it('classifies legacy macro pages and recommends full repair', async () => {
    forgeFetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'legacy-page-1',
          title: 'Legacy Page',
          version: { number: 3 },
          body: {
            storage: {
              value:
                '<p>Legacy intro paragraph</p><ac:adf-extension><ac:adf-node type="extension"><ac:adf-attribute key="extension-key">legacy-app/legacy-env/static/hackday-2026-customui</ac:adf-attribute></ac:adf-node></ac:adf-extension>',
            },
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ results: [{ value: 'fixed-width' }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ value: 'fixed-width' }] }));

    const { inspectHackdayPageStyling } = await import('../forge-native/src/backend/confluencePages');
    const inspection = await inspectHackdayPageStyling('legacy-page-1');

    expect(inspection.reachable).toBe(true);
    expect(inspection.macroSignature).toBe('legacy');
    expect(inspection.hasLeadingParagraphBeforeMacro).toBe(true);
    expect(inspection.recommendedAction).toBe('repair_all');
    expect(inspection.fullWidthDraftOk).toBe(false);
    expect(inspection.fullWidthPublishedOk).toBe(false);
  });

  it('supports dry-run styling repair without mutating Confluence page storage', async () => {
    forgeFetchMock
      // inspect() fetch + properties
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'legacy-page-2',
          title: 'Legacy Page 2',
          version: { number: 9 },
          body: {
            storage: {
              value:
                '<p>Legacy intro paragraph</p><ac:adf-extension><ac:adf-node type="extension"><ac:adf-attribute key="extension-key">legacy-app/legacy-env/static/hackday-2026-customui</ac:adf-attribute></ac:adf-node></ac:adf-extension>',
            },
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      // repair() second page fetch
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'legacy-page-2',
          title: 'Legacy Page 2',
          version: { number: 9 },
          body: {
            storage: {
              value:
                '<p>Legacy intro paragraph</p><ac:adf-extension><ac:adf-node type="extension"><ac:adf-attribute key="extension-key">legacy-app/legacy-env/static/hackday-2026-customui</ac:adf-attribute></ac:adf-node></ac:adf-extension>',
            },
          },
        })
      );

    const { repairHackdayPageStyling } = await import('../forge-native/src/backend/confluencePages');
    const result = await repairHackdayPageStyling('legacy-page-2', { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.macroRewritten).toBe(true);
    expect(result.introParagraphRemoved).toBe(true);

    const putCalls = forgeFetchMock.mock.calls.filter(([, , init]) => init?.method === 'PUT');
    expect(putCalls.length).toBe(0);
  });
});
