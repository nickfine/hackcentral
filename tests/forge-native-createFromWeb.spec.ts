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
});
