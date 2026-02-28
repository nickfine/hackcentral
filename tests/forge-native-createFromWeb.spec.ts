import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createInstanceDraftMock } = vi.hoisted(() => ({
  createInstanceDraftMock: vi.fn(),
}));

vi.mock('../forge-native/src/backend/hdcService', () => ({
  HdcService: class MockHdcService {
    createInstanceDraft = createInstanceDraftMock;
  },
}));

describe('forge-native createFromWeb handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.HACKDAY_CREATE_WEB_SECRET = 'test-secret';
    process.env.CONFLUENCE_HDC_PARENT_PAGE_ID = 'parent-123';
    process.env.FORGE_SITE_URL = 'https://example.atlassian.net';

    createInstanceDraftMock.mockResolvedValue({
      eventId: 'event-1',
      childPageId: 'child-1',
      childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-1',
      appViewUrl: 'https://example.atlassian.net/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/86632806-eb9b-42b5-ae6d-ee09339702b6/hackday-app?pageId=child-1',
      appViewRuntimeOwner: 'hackcentral',
      appViewRouteVersion: 'v2',
      templateProvisionStatus: 'provisioned',
    });
  });

  it('passes schedule.customEvents through to HdcService.createInstanceDraft', async () => {
    const { handler } = await import('../forge-native/src/createFromWeb');
    const customEvents = [
      {
        name: 'Mentor Office Hours',
        description: 'Optional coaching',
        timestamp: '2026-03-02T10:00:00.000Z',
        signal: 'neutral',
      },
    ];

    const response = await handler({
      method: 'POST',
      headers: {
        'X-HackDay-Create-Secret': 'test-secret',
      },
      body: JSON.stringify({
        creatorEmail: 'owner@adaptavist.com',
        basicInfo: {
          eventName: 'HackDay Spring 2026',
          eventIcon: '🚀',
        },
        schedule: {
          timezone: 'Europe/London',
          duration: 3,
          customEvents,
        },
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(createInstanceDraftMock).toHaveBeenCalledTimes(1);
    expect(createInstanceDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'web:owner@adaptavist.com',
        siteUrl: 'https://example.atlassian.net',
      }),
      expect.objectContaining({
        parentPageId: 'parent-123',
        basicInfo: expect.objectContaining({
          eventName: 'HackDay Spring 2026',
        }),
        schedule: expect.objectContaining({
          timezone: 'Europe/London',
          duration: 3,
          customEvents,
        }),
      }),
      { overrideCreatorEmail: 'owner@adaptavist.com' }
    );
  });

  it('rejects unauthorized requests before calling HdcService', async () => {
    const { handler } = await import('../forge-native/src/createFromWeb');

    const response = await handler({
      method: 'POST',
      headers: {
        'X-HackDay-Create-Secret': 'wrong-secret',
      },
      body: JSON.stringify({
        creatorEmail: 'owner@adaptavist.com',
        basicInfo: { eventName: 'HackDay Spring 2026' },
      }),
    });

    expect(response.statusCode).toBe(401);
    expect(createInstanceDraftMock).not.toHaveBeenCalled();
  });

  it('fails fast when hackcentral runtime is enabled but appViewUrl is missing', async () => {
    const previousOwner = process.env.HDC_RUNTIME_OWNER;
    try {
      process.env.HDC_RUNTIME_OWNER = 'hackcentral';
      createInstanceDraftMock.mockResolvedValue({
        eventId: 'event-2',
        childPageId: 'child-2',
        childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/child-2',
        appViewUrl: null,
        appViewRuntimeOwner: 'hackcentral',
        appViewRouteVersion: 'v2',
        templateProvisionStatus: 'provisioned',
      });

      const { handler } = await import('../forge-native/src/createFromWeb');
      const response = await handler({
        method: 'POST',
        headers: {
          'X-HackDay-Create-Secret': 'test-secret',
        },
        body: JSON.stringify({
          creatorEmail: 'owner@adaptavist.com',
          basicInfo: { eventName: 'HackDay Spring 2026' },
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errorCode).toBe('HDC_RUNTIME_CONFIG_INVALID');
      expect(body.error).toContain('appViewUrl is missing');
      expect(body.owner).toBe('hackcentral');
      expect(body.configValid).toBe(false);
      expect(body.routeSource).toBe('create_from_web_result_guard');
      expect(body.missingVars).toEqual(
        expect.arrayContaining([
          'HDC_RUNTIME_APP_ID',
          'FORGE_APP_ID',
          'HDC_RUNTIME_ENVIRONMENT_ID',
          'FORGE_ENVIRONMENT_ID',
          'HDC_RUNTIME_MACRO_KEY',
        ])
      );
    } finally {
      process.env.HDC_RUNTIME_OWNER = previousOwner;
    }
  });
});
