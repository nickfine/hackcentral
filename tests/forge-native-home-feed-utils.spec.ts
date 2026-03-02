import { describe, expect, it } from 'vitest';
import type { HomeFeedActivityItem, HomeFeedRecommendation } from '../forge-native/static/frontend/src/types';
import {
  HOME_FEED_ACTIVITY_SUBCOPY,
  HOME_FEED_RECOMMENDATION_SUBCOPY,
  resolveHomeFeedActivityTarget,
  resolveHomeFeedRecommendationTarget,
} from '../forge-native/static/frontend/src/utils/homeFeed';

function makeActivity(overrides: Partial<HomeFeedActivityItem> = {}): HomeFeedActivityItem {
  return {
    id: 'activity-1',
    type: 'new_hack',
    title: 'New hack: Fast Search',
    description: 'Demo ready.',
    occurredAt: '2026-03-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeRecommendation(overrides: Partial<HomeFeedRecommendation> = {}): HomeFeedRecommendation {
  return {
    id: 'recommendation-1',
    type: 'team_artifact',
    title: 'Artifact: Jira Breakdown Prompt',
    reason: 'Used by your team recently.',
    score: 5,
    ...overrides,
  };
}

describe('home feed utility helpers', () => {
  it('maps activity items to deterministic fallback destinations', () => {
    expect(resolveHomeFeedActivityTarget(makeActivity({ type: 'new_hack', relatedId: 'hack-1' }))).toEqual({
      view: 'hacks',
      context: {
        relatedId: 'hack-1',
        filter: 'New hack: Fast Search',
        tab: 'completed',
      },
    });

    expect(
      resolveHomeFeedActivityTarget(
        makeActivity({ type: 'trending_problem', domain: 'Operations', relatedId: 'problem-7' })
      )
    ).toEqual({
      view: 'problem_exchange',
      context: {
        relatedId: 'problem-7',
        filter: 'New hack: Fast Search',
        domain: 'Operations',
      },
    });

    expect(resolveHomeFeedActivityTarget(makeActivity({ type: 'pipeline_movement' })).view).toBe('pipeline');
    expect(resolveHomeFeedActivityTarget(makeActivity({ type: 'upcoming_hackday' })).view).toBe('hackdays');
  });

  it('prefers explicit activity target view and context when provided', () => {
    const target = resolveHomeFeedActivityTarget(
      makeActivity({
        type: 'new_artifact',
        relatedId: 'artifact-2',
        targetView: 'library',
        targetContext: {
          filter: 'artifact filter',
          tab: 'in_progress',
        },
      })
    );

    expect(target).toEqual({
      view: 'library',
      context: {
        relatedId: 'artifact-2',
        filter: 'artifact filter',
        tab: 'in_progress',
        domain: undefined,
        team: undefined,
        role: undefined,
      },
    });
  });

  it('maps recommendations to deterministic fallback destinations', () => {
    expect(resolveHomeFeedRecommendationTarget(makeRecommendation({ type: 'team_artifact' })).view).toBe('library');
    expect(resolveHomeFeedRecommendationTarget(makeRecommendation({ type: 'problem_domain' })).view).toBe(
      'problem_exchange'
    );
    expect(resolveHomeFeedRecommendationTarget(makeRecommendation({ type: 'pathway_role' })).view).toBe('guide');
  });

  it('prefers explicit recommendation target view and context when provided', () => {
    const target = resolveHomeFeedRecommendationTarget(
      makeRecommendation({
        targetView: 'team_pulse',
        targetContext: {
          relatedId: 'team-1',
          filter: 'cross-team adoption',
        },
      })
    );

    expect(target).toEqual({
      view: 'team_pulse',
      context: {
        relatedId: 'team-1',
        filter: 'cross-team adoption',
        tab: undefined,
        domain: undefined,
        team: undefined,
        role: undefined,
      },
    });
  });

  it('uses user-facing copy without roadmap requirement IDs', () => {
    expect(HOME_FEED_ACTIVITY_SUBCOPY).not.toMatch(/R\d+\.\d+/);
    expect(HOME_FEED_RECOMMENDATION_SUBCOPY).not.toMatch(/R\d+\.\d+/);
  });
});
