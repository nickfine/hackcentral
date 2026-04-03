import type { EventRegistryItem, FeaturedHack, SummaryStats } from '../types';

export type HomeHeroSignal =
  | { kind: 'loading' }
  | { kind: 'hackday'; title: string; detail: string; icon: string }
  | { kind: 'hack'; title: string; detail: string; icon: string }
  | { kind: 'notify'; title: string; icon: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDaysUntilHackday(startMs: number, nowMs: number): string {
  const diffDays = Math.max(0, Math.ceil((startMs - nowMs) / DAY_MS));

  if (diffDays === 0) return 'Hacking starts today';
  if (diffDays === 1) return 'Hacking starts in 1 day';
  return `Hacking starts in ${diffDays} days`;
}

export function hasAnyNonZeroSummaryStat(summary: SummaryStats): boolean {
  return Object.values(summary).some((value) => value > 0);
}

export function formatHomeRecommendationMatch(score: number): string {
  return `${Math.max(0, Math.round(score))}% match`;
}

export function selectHomeHeroSignal(input: {
  registry: EventRegistryItem[];
  featuredHacks: FeaturedHack[];
  now?: Date;
}): HomeHeroSignal {
  const nowMs = input.now?.getTime() ?? Date.now();
  const nextHackday = input.registry
    .map((event) => ({
      event,
      startMs: parseIsoToMs(event.hackingStartsAt),
    }))
    .filter((item): item is { event: EventRegistryItem; startMs: number } => item.startMs !== null && item.startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs)[0];

  if (nextHackday) {
    return {
      kind: 'hackday',
      title: nextHackday.event.eventName,
      detail: formatDaysUntilHackday(nextHackday.startMs, nowMs),
      icon: nextHackday.event.icon || '🚀',
    };
  }

  const latestHack = input.featuredHacks[0];
  if (latestHack) {
    return {
      kind: 'hack',
      title: latestHack.title,
      detail: `Most recently submitted by ${latestHack.authorName}`,
      icon: '⚡',
    };
  }

  return {
    kind: 'notify',
    title: 'First HackDay coming soon — get notified',
    icon: '🔔',
  };
}
