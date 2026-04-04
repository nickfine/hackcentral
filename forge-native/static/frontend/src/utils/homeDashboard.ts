import type { EventRegistryItem, LatestHackSubmission, SummaryStats } from '../types';

export type HomeHeroSignal =
  | { kind: 'loading' }
  | { kind: 'hackday'; eventName: string; daysUntil: number }
  | { kind: 'hack'; title: string; authorName: string }
  | { kind: 'notify'; title: string; icon: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function calculateDaysUntilHackday(startMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((startMs - nowMs) / DAY_MS));
}

export function hasAnyNonZeroSummaryStat(summary: SummaryStats): boolean {
  return Object.values(summary).some((value) => value > 0);
}

export function formatHomeRecommendationMatch(score: number): string {
  return `${Math.max(0, Math.round(score))}% match`;
}

export function selectHomeHeroSignal(input: {
  registry: EventRegistryItem[];
  latestHackSubmission: LatestHackSubmission | null;
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
      eventName: nextHackday.event.eventName,
      daysUntil: calculateDaysUntilHackday(nextHackday.startMs, nowMs),
    };
  }

  const latestHack = input.latestHackSubmission;
  if (latestHack) {
    return {
      kind: 'hack',
      title: latestHack.title,
      authorName: latestHack.authorName,
    };
  }

  return {
    kind: 'notify',
    title: 'First HackDay coming soon — get notified',
    icon: '🔔',
  };
}
