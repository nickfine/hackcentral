import { describe, expect, it, vi } from 'vitest';
import {
  buildAppModeResolverPayload,
  invokeEventScopedResolver,
  mergeAppModeResolverPayload,
} from '../forge-native/static/runtime-frontend/src/lib/appModeResolverPayload';

describe('runtime app-mode resolver payload helper', () => {
  it('builds a page-scoped payload only for non-empty page ids', () => {
    expect(buildAppModeResolverPayload(null)).toBeNull();
    expect(buildAppModeResolverPayload('')).toBeNull();
    expect(buildAppModeResolverPayload('   ')).toBeNull();
    expect(buildAppModeResolverPayload(' 24510466 ')).toEqual({
      appMode: true,
      pageId: '24510466',
    });
  });

  it('merges page-scoped app payload into event-scoped resolver payloads', () => {
    expect(
      mergeAppModeResolverPayload(
        { appMode: true, pageId: '24510466' },
        { limit: 20, teamId: 'team-1' }
      )
    ).toEqual({
      limit: 20,
      teamId: 'team-1',
      appMode: true,
      pageId: '24510466',
    });
  });

  it('invokes resolvers without a payload when no app-mode page context exists', async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });

    await invokeEventScopedResolver(invoke, 'getSchedule', null);

    expect(invoke).toHaveBeenCalledWith('getSchedule');
  });

  it('invokes resolvers with merged app-mode payload when page context exists', async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });

    await invokeEventScopedResolver(
      invoke,
      'getActivityFeed',
      { appMode: true, pageId: '24510466' },
      { limit: 20 }
    );

    expect(invoke).toHaveBeenCalledWith('getActivityFeed', {
      limit: 20,
      appMode: true,
      pageId: '24510466',
    });
  });
});
