import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventRegistryItem, HdcContextResponse } from '../forge-native/static/macro-frontend/src/types';
import {
  SWITCHER_UNAVAILABLE_LABEL,
  SWITCHER_CACHE_TTL_MS,
  buildConfluencePagePath,
  buildSwitcherSections,
  getHomePageId,
  invalidateSwitcherRegistryCache,
  isNavigableRegistryItem,
  readSwitcherRegistryCache,
  runSwitcherNavigation,
  summarizeSwitcherNavigability,
  switcherRowMetaText,
  writeSwitcherRegistryCache,
} from '../forge-native/static/macro-frontend/src/appSwitcher';

function makeEvent(
  id: string,
  lifecycleStatus: EventRegistryItem['lifecycleStatus'],
  overrides: Partial<EventRegistryItem> = {}
): EventRegistryItem {
  return {
    id,
    eventName: `Event ${id}`,
    icon: '🚀',
    tagline: null,
    lifecycleStatus,
    confluencePageId: `page-${id}`,
    isNavigable: true,
    confluenceParentPageId: 'parent-1',
    schedule: {},
    hackingStartsAt: null,
    submissionDeadlineAt: null,
    rules: {
      allowCrossTeamMentoring: true,
      maxTeamSize: 6,
      requireDemoLink: false,
      judgingModel: 'hybrid',
    },
    branding: {
      accentColor: '#0f766e',
    },
    ...overrides,
  };
}

describe('macro app switcher helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('groups registry entries into live/upcoming/recent and excludes archived + stale completed', () => {
    const now = new Date('2026-02-17T12:00:00.000Z');
    const liveA = makeEvent('live-a', 'hacking', { eventName: 'Alpha Live' });
    const liveB = makeEvent('live-b', 'voting', { eventName: 'Beta Live' });
    const upcoming = makeEvent('upcoming-a', 'registration', { eventName: 'Gamma Upcoming' });
    const recent = makeEvent('recent-a', 'completed', {
      eventName: 'Delta Recent',
      schedule: {
        resultsAnnounceAt: '2026-02-10T12:00:00.000Z',
      },
    });
    const stale = makeEvent('stale-a', 'completed', {
      eventName: 'Old Completed',
      schedule: {
        resultsAnnounceAt: '2025-09-01T00:00:00.000Z',
      },
    });
    const archived = makeEvent('archived-a', 'archived', { eventName: 'Archived Event' });

    const sections = buildSwitcherSections([upcoming, liveB, stale, recent, archived, liveA], now);

    expect(sections.live.map((item) => item.id)).toEqual(['live-a', 'live-b']);
    expect(sections.upcoming.map((item) => item.id)).toEqual(['upcoming-a']);
    expect(sections.recent.map((item) => item.id)).toEqual(['recent-a']);
    expect(sections.live.find((item) => item.id === 'archived-a')).toBeUndefined();
    expect(sections.upcoming.find((item) => item.id === 'stale-a')).toBeUndefined();
  });

  it('orders live and upcoming entries by recency, then numeric page id fallback', () => {
    const now = new Date('2026-02-17T12:00:00.000Z');
    const liveOld = makeEvent('live-old', 'hacking', {
      schedule: { hackingStartsAt: '2026-02-01T10:00:00.000Z' },
      confluencePageId: '101',
    });
    const liveNew = makeEvent('live-new', 'hacking', {
      schedule: { hackingStartsAt: '2026-02-18T10:00:00.000Z' },
      confluencePageId: '100',
    });

    const upcomingDateOld = makeEvent('upcoming-date-old', 'registration', {
      schedule: { registrationOpensAt: '2026-03-01T09:00:00.000Z' },
      confluencePageId: '999',
    });
    const upcomingDateNew = makeEvent('upcoming-date-new', 'registration', {
      schedule: { registrationOpensAt: '2026-04-01T09:00:00.000Z' },
      confluencePageId: '1',
    });
    const upcomingNoDateHighPage = makeEvent('upcoming-no-date-high-page', 'team_formation', {
      confluencePageId: '200',
      eventName: 'Zulu Event',
    });
    const upcomingNoDateLowPage = makeEvent('upcoming-no-date-low-page', 'team_formation', {
      confluencePageId: '150',
      eventName: 'Alpha Event',
    });

    const sections = buildSwitcherSections(
      [upcomingNoDateLowPage, liveOld, upcomingDateOld, upcomingNoDateHighPage, liveNew, upcomingDateNew],
      now
    );

    expect(sections.live.map((item) => item.id)).toEqual(['live-new', 'live-old']);
    expect(sections.upcoming.map((item) => item.id)).toEqual([
      'upcoming-date-new',
      'upcoming-date-old',
      'upcoming-no-date-high-page',
      'upcoming-no-date-low-page',
    ]);
  });

  it('builds the Confluence page path from page ID', () => {
    expect(buildConfluencePagePath('12345')).toBe('/wiki/pages/viewpage.action?pageId=12345');
    expect(buildConfluencePagePath('abc/123')).toBe('/wiki/pages/viewpage.action?pageId=abc%2F123');
  });

  it('resolves the home page from parent and instance contexts', () => {
    const parentContext: HdcContextResponse = {
      pageType: 'parent',
      pageId: 'parent-page',
      event: null,
      registry: [],
      syncState: null,
      permissions: {
        canCreateInstances: true,
        isPrimaryAdmin: false,
        isCoAdmin: false,
      },
    };
    const instanceContext: HdcContextResponse = {
      pageType: 'instance',
      pageId: 'instance-page',
      event: makeEvent('evt-1', 'hacking', {
        confluencePageId: 'instance-page',
        confluenceParentPageId: 'parent-page',
      }),
      registry: [],
      syncState: null,
      permissions: {
        canCreateInstances: true,
        isPrimaryAdmin: true,
        isCoAdmin: false,
      },
    };

    expect(getHomePageId(parentContext)).toBe('parent-page');
    expect(getHomePageId(instanceContext)).toBe('parent-page');
  });

  it('writes, reads, expires, and invalidates cached switcher registry data', () => {
    const pageId = 'page-cache';
    const registry = [makeEvent('cache-1', 'registration')];
    const nowMs = 1_000_000;

    writeSwitcherRegistryCache(pageId, registry);
    const cached = readSwitcherRegistryCache(pageId);
    expect(cached?.map((item) => item.id)).toEqual(['cache-1']);

    window.localStorage.setItem(
      `hdc-switcher-registry:${pageId}`,
      JSON.stringify({
        updatedAt: nowMs,
        registry,
      })
    );
    expect(readSwitcherRegistryCache(pageId, nowMs + SWITCHER_CACHE_TTL_MS + 1)).toBeNull();

    writeSwitcherRegistryCache(pageId, registry);
    invalidateSwitcherRegistryCache(pageId);
    expect(readSwitcherRegistryCache(pageId)).toBeNull();
  });

  it('flags non-navigable entries and exposes unavailable row text', () => {
    const missingPage = makeEvent('missing-page', 'draft', {
      confluencePageId: null,
      isNavigable: false,
      tagline: 'ignored',
    });
    const navigable = makeEvent('navigable-page', 'draft', {
      confluencePageId: 'page-live',
      isNavigable: true,
      tagline: null,
    });

    expect(isNavigableRegistryItem(missingPage)).toBe(false);
    expect(isNavigableRegistryItem(navigable)).toBe(true);
    expect(switcherRowMetaText(missingPage)).toBe(SWITCHER_UNAVAILABLE_LABEL);
    expect(switcherRowMetaText(navigable)).toBe('No tagline set');
  });

  it('guards navigation callback when switcher target is missing', () => {
    const onNavigate = vi.fn();
    const missingPage = makeEvent('missing-page', 'draft', { confluencePageId: null, isNavigable: false });
    const validPage = makeEvent('valid-page', 'draft', { confluencePageId: 'page-xyz', isNavigable: true });

    expect(runSwitcherNavigation(missingPage, onNavigate)).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();

    expect(runSwitcherNavigation(validPage, onNavigate)).toBe(true);
    expect(onNavigate).toHaveBeenCalledWith('page-xyz');
  });

  it('summarizes non-navigable and missing-page telemetry counts with contract guards', () => {
    const registry = [
      makeEvent('valid', 'draft', { confluencePageId: 'page-1', isNavigable: true }),
      makeEvent('explicit-false', 'draft', { confluencePageId: 'page-2', isNavigable: false }),
      makeEvent('missing-page-id', 'draft', { confluencePageId: null, isNavigable: true }),
      makeEvent('blank-page-id', 'draft', { confluencePageId: ' ', isNavigable: true }),
    ];

    expect(summarizeSwitcherNavigability(registry)).toEqual({
      total: 4,
      nonNavigable: 3,
      withMissingPageId: 2,
    });
  });
});
