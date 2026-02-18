import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventRegistryItem } from '../forge-native/static/frontend/src/types';
import {
  SWITCHER_UNAVAILABLE_LABEL,
  SWITCHER_CACHE_TTL_MS,
  buildConfluencePagePath,
  buildSwitcherSections,
  isNavigableConfluencePageId,
  isNavigableRegistryItem,
  readSwitcherRegistryCache,
  runSwitcherNavigation,
  switcherRowMetaText,
  writeSwitcherRegistryCache,
} from '../forge-native/static/frontend/src/appSwitcher';

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
    confluenceParentPageId: null,
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

describe('global app switcher helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('groups entries and excludes archived + stale completed from recent', () => {
    const now = new Date('2026-02-17T12:00:00.000Z');
    const live = makeEvent('live-a', 'hacking');
    const upcoming = makeEvent('upcoming-a', 'registration');
    const recent = makeEvent('recent-a', 'completed', {
      schedule: {
        resultsAnnounceAt: '2026-02-10T12:00:00.000Z',
      },
    });
    const stale = makeEvent('stale-a', 'completed', {
      schedule: {
        resultsAnnounceAt: '2025-05-10T12:00:00.000Z',
      },
    });
    const archived = makeEvent('archived-a', 'archived');

    const sections = buildSwitcherSections([stale, archived, recent, upcoming, live], now);

    expect(sections.live.map((item) => item.id)).toEqual(['live-a']);
    expect(sections.upcoming.map((item) => item.id)).toEqual(['upcoming-a']);
    expect(sections.recent.map((item) => item.id)).toEqual(['recent-a']);
  });

  it('builds Confluence view-page path', () => {
    expect(buildConfluencePagePath('123')).toBe('/wiki/pages/viewpage.action?pageId=123');
    expect(buildConfluencePagePath('abc/1')).toBe('/wiki/pages/viewpage.action?pageId=abc%2F1');
  });

  it('writes and expires registry cache by ttl', () => {
    const siteUrl = 'https://hackdaytemp.atlassian.net';
    const registry = [makeEvent('cache-a', 'registration')];
    writeSwitcherRegistryCache(siteUrl, registry);
    expect(readSwitcherRegistryCache(siteUrl)?.map((item) => item.id)).toEqual(['cache-a']);

    window.localStorage.setItem(
      'hdc-global-switcher-registry:https://hackdaytemp.atlassian.net',
      JSON.stringify({
        updatedAt: 10_000,
        registry,
      })
    );
    expect(readSwitcherRegistryCache(siteUrl, 10_000 + SWITCHER_CACHE_TTL_MS + 1)).toBeNull();
  });

  it('treats null page IDs as non-navigable and shows unavailable warning text', () => {
    const missingPage = makeEvent('missing-page', 'draft', {
      tagline: 'Custom tagline',
      confluencePageId: null,
      isNavigable: false,
    });
    const navigable = makeEvent('with-page', 'draft', {
      tagline: null,
      confluencePageId: 'page-with-id',
      isNavigable: true,
    });

    expect(isNavigableConfluencePageId(missingPage.confluencePageId)).toBe(false);
    expect(isNavigableConfluencePageId(navigable.confluencePageId)).toBe(true);
    expect(isNavigableRegistryItem(missingPage)).toBe(false);
    expect(isNavigableRegistryItem(navigable)).toBe(true);
    expect(switcherRowMetaText(missingPage)).toBe(SWITCHER_UNAVAILABLE_LABEL);
    expect(switcherRowMetaText(navigable)).toBe('No tagline set');
  });

  it('does not invoke navigation handler when page ID is missing', () => {
    const onNavigate = vi.fn();
    const missingPage = makeEvent('missing', 'draft', { confluencePageId: null, isNavigable: false });
    const blankPage = makeEvent('blank', 'draft', { confluencePageId: '', isNavigable: false });
    const validPage = makeEvent('valid', 'draft', { confluencePageId: 'page-123', isNavigable: true });

    expect(runSwitcherNavigation(missingPage, onNavigate)).toBe(false);
    expect(runSwitcherNavigation(blankPage, onNavigate)).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();

    expect(runSwitcherNavigation(validPage, onNavigate)).toBe(true);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('page-123');
  });
});
