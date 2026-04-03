import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatHomeRecommendationMatch,
  hasAnyNonZeroSummaryStat,
  selectHomeHeroSignal,
} from '../forge-native/static/frontend/src/utils/homeDashboard';
import type { FeaturedHack, SummaryStats } from '../forge-native/static/frontend/src/types';

const statCardsPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/components/Dashboard/StatCards.tsx');
const welcomeHeroPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/components/Dashboard/WelcomeHero.tsx');

const emptySummary: SummaryStats = {
  totalPeople: 0,
  totalHacks: 0,
  featuredHacks: 0,
  inProgressProjects: 0,
  completedProjects: 0,
  activeMentors: 0,
};

const populatedSummary: SummaryStats = {
  totalPeople: 12,
  totalHacks: 7,
  featuredHacks: 0,
  inProgressProjects: 3,
  completedProjects: 0,
  activeMentors: 2,
};

const featuredHack: FeaturedHack = {
  id: 'hack-1',
  title: 'Meeting Notes Summariser',
  description: 'Summarises long threads into action items.',
  assetType: 'prompt',
  status: 'verified',
  reuseCount: 8,
  authorName: 'Priya Shah',
  visibility: 'org',
  intendedUser: null,
  context: null,
  limitations: null,
  riskNotes: null,
  sourceRepoUrl: null,
  demoUrl: null,
};

describe('home dashboard utilities', () => {
  it('detects whether any summary stats are non-zero', () => {
    expect(hasAnyNonZeroSummaryStat(emptySummary)).toBe(false);
    expect(hasAnyNonZeroSummaryStat(populatedSummary)).toBe(true);
  });

  it('formats recommendation scores as human-readable match labels', () => {
    expect(formatHomeRecommendationMatch(94)).toBe('94% match');
    expect(formatHomeRecommendationMatch(93.6)).toBe('94% match');
  });

  it('prefers the next upcoming HackDay for the hero live signal', () => {
    const signal = selectHomeHeroSignal({
      registry: [
        {
          id: 'evt-1',
          eventName: 'Q2 Innovation Sprint',
          icon: '⚡',
          tagline: 'Quarterly build challenge',
          lifecycleStatus: 'registration',
          confluencePageId: 'page-1',
          isNavigable: true,
          confluenceParentPageId: null,
          schedule: {},
          hackingStartsAt: '2026-04-12T09:00:00.000Z',
          submissionDeadlineAt: null,
          rules: {
            allowCrossTeamMentoring: true,
            maxTeamSize: 5,
            requireDemoLink: false,
            judgingModel: 'panel',
          },
          branding: {
            accentColor: '#0f766e',
          },
        },
      ],
      featuredHacks: [featuredHack],
      now: new Date('2026-04-03T10:00:00.000Z'),
    });

    expect(signal).toEqual({
      kind: 'hackday',
      eventName: 'Q2 Innovation Sprint',
      daysUntil: 9,
    });
  });

  it('falls back to the most recent featured hack when there is no future HackDay', () => {
    const signal = selectHomeHeroSignal({
      registry: [],
      featuredHacks: [featuredHack],
      now: new Date('2026-04-03T10:00:00.000Z'),
    });

    expect(signal).toEqual({
      kind: 'hack',
      title: 'Meeting Notes Summariser',
      authorName: 'Priya Shah',
    });
  });

  it('uses the notify fallback only after resolved-empty data', () => {
    const signal = selectHomeHeroSignal({
      registry: [],
      featuredHacks: [],
      now: new Date('2026-04-03T10:00:00.000Z'),
    });

    expect(signal).toEqual({
      kind: 'notify',
      title: 'First HackDay coming soon — get notified',
      icon: '🔔',
    });
  });
});

describe('Home tab component contracts', () => {
  it('keeps stat filtering inside StatCards and returns null for all-zero summaries', () => {
    const source = fs.readFileSync(statCardsPath, 'utf8');

    expect(source).toContain('const visibleItems = METRIC_ITEMS.filter');
    expect(source).toContain('if (visibleItems.length === 0) {');
    expect(source).toContain('return null;');
    expect(source).toContain('{visibleItems.map');
  });

  it('shows a loading skeleton in WelcomeHero without hardcoding the resolved-empty fallback copy', () => {
    const source = fs.readFileSync(welcomeHeroPath, 'utf8');

    expect(source).toContain("if (signal.kind === 'loading') {");
    expect(source).toContain('aria-label="Loading live signal"');
    expect(source).toContain('Where AI ideas become shipped work.');
    expect(source).toContain('Submit a pain, form a team, run a hack.');
    expect(source).not.toContain('First HackDay coming soon — get notified');
  });

  it('renders a pulse dot only for the HackDay live-signal state', () => {
    const source = fs.readFileSync(welcomeHeroPath, 'utf8');

    expect(source).toContain("signal.kind === 'hackday'");
    expect(source).toContain('dashboard-hero-signal-pulse');
    expect(source).toContain("signal.kind === 'hack'");
    expect(source).toContain('Submitted by {signal.authorName}');
  });
});
