import type { View } from '../constants/nav';
import type {
  HomeFeedActivityItem,
  HomeFeedRecommendation,
  HomeFeedTargetContext,
  HomeFeedTargetView,
} from '../types';

export const HOME_FEED_ACTIVITY_SUBCOPY =
  'Recent activity across hacks, pains, artifacts, and upcoming HackDays.';
export const HOME_FEED_RECOMMENDATION_SUBCOPY =
  'Suggestions based on your team activity and role.';

export interface HomeFeedNavigationTarget {
  view: HomeFeedTargetView;
  context: HomeFeedTargetContext;
}

function normalizeContext(context: HomeFeedTargetContext | undefined): HomeFeedTargetContext {
  return {
    relatedId: context?.relatedId?.trim() || undefined,
    filter: context?.filter?.trim() || undefined,
    tab: context?.tab?.trim() || undefined,
    domain: context?.domain?.trim() || undefined,
    team: context?.team?.trim() || undefined,
    role: context?.role?.trim() || undefined,
  };
}

function withFallbackView(view: HomeFeedTargetView | undefined, fallback: HomeFeedTargetView): HomeFeedTargetView {
  return (view || fallback) as View as HomeFeedTargetView;
}

export function resolveHomeFeedActivityTarget(item: HomeFeedActivityItem): HomeFeedNavigationTarget {
  const context = normalizeContext(item.targetContext);
  const fallbackFilter = context.filter || item.title;
  const fallbackRelatedId = context.relatedId || item.relatedId || undefined;

  if (item.targetView) {
    return {
      view: withFallbackView(item.targetView, 'hacks'),
      context: {
        ...context,
        filter: fallbackFilter,
        relatedId: fallbackRelatedId,
      },
    };
  }

  switch (item.type) {
    case 'new_hack':
    case 'new_artifact':
      return {
        view: 'hacks',
        context: {
          relatedId: fallbackRelatedId,
          filter: fallbackFilter,
          tab: 'completed',
        },
      };
    case 'trending_problem':
      return {
        view: 'problem_exchange',
        context: {
          relatedId: fallbackRelatedId,
          filter: fallbackFilter,
          domain: context.domain || item.domain || undefined,
        },
      };
    case 'pipeline_movement':
      return {
        view: 'pipeline',
        context: {
          relatedId: fallbackRelatedId,
          filter: fallbackFilter,
        },
      };
    case 'upcoming_hackday':
      return {
        view: 'hackdays',
        context: {
          relatedId: fallbackRelatedId,
          filter: fallbackFilter,
        },
      };
  }
}

export function resolveHomeFeedRecommendationTarget(item: HomeFeedRecommendation): HomeFeedNavigationTarget {
  const context = normalizeContext(item.targetContext);
  const fallbackFilter = context.filter || item.title;
  const fallbackRelatedId = context.relatedId || item.relatedId || undefined;

  if (item.targetView) {
    return {
      view: withFallbackView(item.targetView, 'guide'),
      context: {
        ...context,
        filter: fallbackFilter,
        relatedId: fallbackRelatedId,
      },
    };
  }

  switch (item.type) {
    case 'problem_domain':
      return {
        view: 'problem_exchange',
        context: {
          relatedId: fallbackRelatedId,
          filter: fallbackFilter,
          domain: context.domain || item.context?.[0] || undefined,
        },
      };
    case 'team_artifact':
      return {
        view: 'library',
        context: {
          relatedId: fallbackRelatedId,
          filter: fallbackFilter,
          team: context.team || item.context?.[0] || undefined,
        },
      };
    case 'pathway_role':
      return {
        view: 'guide',
        context: {
          relatedId: fallbackRelatedId,
          filter: fallbackFilter,
          role: context.role || item.context?.[0] || undefined,
        },
      };
  }
}
