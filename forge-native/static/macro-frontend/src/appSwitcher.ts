import type { EventRegistryItem, HdcContextResponse, LifecycleStatus } from './types';

export const SWITCHER_CACHE_TTL_MS = 5 * 60 * 1000;
const SWITCHER_CACHE_PREFIX = 'hdc-switcher-registry:';
const RECENT_WINDOW_DAYS = 90;
export const SWITCHER_UNAVAILABLE_LABEL = 'Page not provisioned yet';

export interface SwitcherSections {
  live: EventRegistryItem[];
  upcoming: EventRegistryItem[];
  recent: EventRegistryItem[];
}

function parseIsoToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function completionReferenceMs(item: EventRegistryItem): number | null {
  return (
    parseIsoToMs(item.schedule.resultsAnnounceAt) ??
    parseIsoToMs(item.schedule.votingEndsAt) ??
    parseIsoToMs(item.schedule.submissionDeadlineAt) ??
    parseIsoToMs(item.submissionDeadlineAt) ??
    parseIsoToMs(item.schedule.hackingStartsAt) ??
    parseIsoToMs(item.hackingStartsAt)
  );
}

function isRecentCompleted(item: EventRegistryItem, nowMs: number): boolean {
  if (item.lifecycleStatus !== 'completed') return false;
  const referenceMs = completionReferenceMs(item);
  if (referenceMs === null) return true;
  const ageMs = nowMs - referenceMs;
  return ageMs >= 0 && ageMs <= RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function sortByName(items: EventRegistryItem[]): EventRegistryItem[] {
  return items.sort((a, b) => a.eventName.localeCompare(b.eventName));
}

function sortRecent(items: EventRegistryItem[]): EventRegistryItem[] {
  return items.sort((a, b) => {
    const aMs = completionReferenceMs(a) ?? 0;
    const bMs = completionReferenceMs(b) ?? 0;
    if (aMs !== bMs) return bMs - aMs;
    return a.eventName.localeCompare(b.eventName);
  });
}

function isLiveStatus(status: LifecycleStatus): boolean {
  return status === 'hacking' || status === 'voting';
}

export function buildSwitcherSections(
  registry: EventRegistryItem[],
  now: Date = new Date()
): SwitcherSections {
  const nowMs = now.getTime();
  const live: EventRegistryItem[] = [];
  const upcoming: EventRegistryItem[] = [];
  const recent: EventRegistryItem[] = [];

  for (const item of registry) {
    if (item.lifecycleStatus === 'archived') {
      continue;
    }
    if (isLiveStatus(item.lifecycleStatus)) {
      live.push(item);
      continue;
    }
    if (item.lifecycleStatus === 'completed') {
      if (isRecentCompleted(item, nowMs)) {
        recent.push(item);
      }
      continue;
    }
    upcoming.push(item);
  }

  return {
    live: sortByName(live),
    upcoming: sortByName(upcoming),
    recent: sortRecent(recent),
  };
}

export function buildConfluencePagePath(pageId: string): string {
  return `/wiki/pages/viewpage.action?pageId=${encodeURIComponent(pageId)}`;
}

export function isNavigableConfluencePageId(pageId: string | null | undefined): pageId is string {
  return typeof pageId === 'string' && pageId.trim().length > 0;
}

export function isNavigableRegistryItem(item: EventRegistryItem): boolean {
  const explicit = (item as { isNavigable?: boolean }).isNavigable;
  if (typeof explicit === 'boolean') {
    return explicit && isNavigableConfluencePageId(item.confluencePageId);
  }
  return isNavigableConfluencePageId(item.confluencePageId);
}

export function switcherRowMetaText(item: EventRegistryItem): string {
  if (!isNavigableRegistryItem(item)) {
    return SWITCHER_UNAVAILABLE_LABEL;
  }
  return item.tagline || 'No tagline set';
}

export function runSwitcherNavigation(
  item: EventRegistryItem,
  onNavigate: (targetPageId: string) => void
): boolean {
  if (!isNavigableRegistryItem(item) || !isNavigableConfluencePageId(item.confluencePageId)) {
    return false;
  }
  onNavigate(item.confluencePageId);
  return true;
}

export function getHomePageId(context: HdcContextResponse): string | null {
  if (context.pageType === 'parent') return context.pageId;
  return context.event?.confluenceParentPageId ?? null;
}

export function switcherRegistryCacheKey(pageId: string): string {
  return `${SWITCHER_CACHE_PREFIX}${pageId}`;
}

export function writeSwitcherRegistryCache(pageId: string, registry: EventRegistryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      switcherRegistryCacheKey(pageId),
      JSON.stringify({
        updatedAt: Date.now(),
        registry,
      })
    );
  } catch {
    // Best-effort cache write.
  }
}

export function readSwitcherRegistryCache(
  pageId: string,
  nowMs = Date.now(),
  ttlMs = SWITCHER_CACHE_TTL_MS
): EventRegistryItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(switcherRegistryCacheKey(pageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { updatedAt?: number; registry?: EventRegistryItem[] };
    if (!parsed || !Array.isArray(parsed.registry) || typeof parsed.updatedAt !== 'number') {
      window.localStorage.removeItem(switcherRegistryCacheKey(pageId));
      return null;
    }
    if (nowMs - parsed.updatedAt > ttlMs) {
      window.localStorage.removeItem(switcherRegistryCacheKey(pageId));
      return null;
    }
    return parsed.registry;
  } catch {
    return null;
  }
}

export function invalidateSwitcherRegistryCache(pageId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(switcherRegistryCacheKey(pageId));
  } catch {
    // Best-effort cache clear.
  }
}
