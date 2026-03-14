import type {
  CreateProblemInput,
  FeaturedHack,
  ProblemFrequency,
  ProblemListItem,
  ProblemStatus,
} from '../types';

export type ProblemSortBy = 'votes' | 'time_wasted' | 'newest';

export const PROBLEM_FREQUENCIES: ProblemFrequency[] = ['daily', 'weekly', 'monthly'];
export const PROBLEM_STATUSES: ProblemStatus[] = ['open', 'claimed', 'solved', 'closed'];

export interface ProblemCreateDraft {
  title: string;
  description: string;
  frequency: ProblemFrequency;
  estimatedTimeWastedHours: string;
  team: string;
  domain: string;
  contactDetails: string;
}

export interface ProblemFilterSet {
  query?: string;
  teams?: string[];
  domains?: string[];
  statuses?: ProblemStatus[];
  sortBy: ProblemSortBy;
  includeHidden: boolean;
}

export interface ProblemFilterDraft {
  query: string;
  teamsInput: string;
  domainsInput: string;
  status: ProblemStatus | 'all';
  sortBy: ProblemSortBy;
  includeHidden: boolean;
}

export const DEFAULT_PROBLEM_FILTER_DRAFT: ProblemFilterDraft = {
  query: '',
  teamsInput: '',
  domainsInput: '',
  status: 'open',
  sortBy: 'votes',
  includeHidden: false,
};

export const DEFAULT_PROBLEM_FILTER_SET: ProblemFilterSet = {
  statuses: ['open'],
  sortBy: 'votes',
  includeHidden: false,
};

export interface ProblemStatusDraftValidationInput {
  status: ProblemStatus;
  linkedHackProjectId?: string | null;
  linkedArtifactId?: string | null;
}

export interface PreviewVoteMutationResult {
  nextItems: ProblemListItem[];
  nextVotedIds: string[];
  alreadyVoted: boolean;
}

export interface PreviewFlagMutationResult {
  nextItems: ProblemListItem[];
  nextFlaggedIds: string[];
  alreadyFlagged: boolean;
  autoHidden: boolean;
}

export type ProblemModerationAction = 'remove' | 'reinstate' | null;

export function buildProblemAppliedFilters(input: ProblemFilterDraft, canModerate: boolean): ProblemFilterSet {
  const query = input.query.trim();
  const teams = parseProblemFilterTokens(input.teamsInput);
  const domains = parseProblemFilterTokens(input.domainsInput);

  return {
    query: query || undefined,
    teams: teams.length > 0 ? teams : undefined,
    domains: domains.length > 0 ? domains : undefined,
    statuses: input.status === 'all' ? undefined : [input.status],
    sortBy: input.sortBy,
    includeHidden: resolveProblemIncludeHidden(input.includeHidden, canModerate),
  };
}

export function getDefaultProblemFilterDraft(): ProblemFilterDraft {
  return { ...DEFAULT_PROBLEM_FILTER_DRAFT };
}

export function getDefaultProblemFilterSet(): ProblemFilterSet {
  return {
    ...DEFAULT_PROBLEM_FILTER_SET,
    statuses: DEFAULT_PROBLEM_FILTER_SET.statuses ? [...DEFAULT_PROBLEM_FILTER_SET.statuses] : undefined,
  };
}

export function resolveProblemIncludeHidden(includeHidden: boolean, canModerate: boolean): boolean {
  return canModerate ? includeHidden : false;
}

export function validateProblemStatusDraft(input: ProblemStatusDraftValidationInput): string | null {
  if (input.status !== 'solved') return null;
  const hasHack = Boolean(input.linkedHackProjectId?.trim());
  const hasArtifact = Boolean(input.linkedArtifactId?.trim());
  if (hasHack || hasArtifact) return null;
  return 'Solved status requires linked hack project ID or linked artifact ID.';
}

export function applyPreviewVoteMutation(
  items: ProblemListItem[],
  votedIds: string[],
  problemId: string,
  nowIso = new Date().toISOString()
): PreviewVoteMutationResult {
  if (votedIds.includes(problemId)) {
    return {
      nextItems: items,
      nextVotedIds: votedIds,
      alreadyVoted: true,
    };
  }

  return {
    nextItems: items.map((item) =>
      item.id === problemId
        ? { ...item, voteCount: item.voteCount + 1, updatedAt: nowIso }
        : item
    ),
    nextVotedIds: [...votedIds, problemId],
    alreadyVoted: false,
  };
}

export function applyPreviewFlagMutation(
  items: ProblemListItem[],
  flaggedIds: string[],
  problemId: string,
  nowIso = new Date().toISOString()
): PreviewFlagMutationResult {
  if (flaggedIds.includes(problemId)) {
    return {
      nextItems: items,
      nextFlaggedIds: flaggedIds,
      alreadyFlagged: true,
      autoHidden: false,
    };
  }

  let autoHidden = false;
  const nextItems = items.map((item) => {
    if (item.id !== problemId) return item;
    const nextFlagCount = item.flagCount + 1;
    const nextState =
      nextFlagCount >= 3 && item.moderationState === 'visible'
        ? 'hidden_pending_review'
        : item.moderationState;
    if (nextState === 'hidden_pending_review' && item.moderationState === 'visible') {
      autoHidden = true;
    }
    return {
      ...item,
      flagCount: nextFlagCount,
      moderationState: nextState,
      updatedAt: nowIso,
    };
  });

  return {
    nextItems,
    nextFlaggedIds: [...flaggedIds, problemId],
    alreadyFlagged: false,
    autoHidden,
  };
}

export function resolveProblemModerationAction(
  canModerate: boolean,
  moderationState: ProblemListItem['moderationState']
): ProblemModerationAction {
  if (!canModerate) return null;
  return moderationState === 'removed' ? 'reinstate' : 'remove';
}

export function parseProblemFilterTokens(input: string): string[] {
  const normalized = input
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

export function validateProblemCreateDraft(input: ProblemCreateDraft): string | null {
  const title = input.title.trim();
  if (title.length < 5 || title.length > 180) {
    return 'Problem title must be 5-180 characters.';
  }

  const description = input.description.trim();
  if (description.length < 20 || description.length > 4000) {
    return 'Description must be 20-4000 characters.';
  }

  const estimatedHours = Number(input.estimatedTimeWastedHours);
  if (!Number.isFinite(estimatedHours) || estimatedHours <= 0 || estimatedHours > 500) {
    return 'Estimated time wasted must be a number > 0 and <= 500.';
  }

  if (!input.team.trim()) {
    return 'Team is required.';
  }

  if (!input.domain.trim()) {
    return 'Domain is required.';
  }

  if (!input.contactDetails.trim()) {
    return 'Contact details are required.';
  }

  return null;
}

export function createPreviewProblemListItem(input: CreateProblemInput, createdByName: string): ProblemListItem {
  const now = new Date().toISOString();
  return {
    id: `preview-problem-${Date.now()}`,
    title: input.title.trim(),
    description: input.description.trim(),
    frequency: input.frequency,
    estimatedTimeWastedHours: Math.round(Number(input.estimatedTimeWastedHours) * 100) / 100,
    team: input.team.trim(),
    domain: input.domain.trim(),
    contactDetails: input.contactDetails.trim(),
    status: 'open',
    moderationState: 'visible',
    voteCount: 0,
    flagCount: 0,
    linkedHackProjectId: undefined,
    linkedArtifactId: undefined,
    canRemove: true,
    createdAt: now,
    updatedAt: now,
    createdByName,
  };
}

export function seedPreviewProblems(featuredHacks: FeaturedHack[], createdByName: string): ProblemListItem[] {
  const nowIso = new Date().toISOString();

  return featuredHacks.slice(0, 6).map((hack, index) => {
    const rank = index + 1;
    return {
      id: `preview-seed-problem-${hack.id}`,
      title: `Improve ${hack.title}`,
      description: `Teams are repeatedly solving this manually. We should capture a reusable workflow around ${hack.title} and reduce repetition.`,
      frequency: rank % 3 === 0 ? 'monthly' : rank % 2 === 0 ? 'weekly' : 'daily',
      estimatedTimeWastedHours: 2 + rank,
      team: rank % 2 === 0 ? 'Engineering' : 'Delivery',
      domain: rank % 2 === 0 ? 'Automation' : 'Knowledge Management',
      contactDetails: `${createdByName} (preview)`,
      status: 'open',
      moderationState: 'visible',
      voteCount: Math.max(0, hack.reuseCount - rank),
      flagCount: 0,
      linkedHackProjectId: undefined,
      linkedArtifactId: undefined,
      canRemove: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdByName,
    };
  });
}

export function applyProblemFilters(items: ProblemListItem[], filters: ProblemFilterSet): ProblemListItem[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  const teams = new Set((filters.teams ?? []).map((team) => team.trim().toLowerCase()).filter(Boolean));
  const domains = new Set((filters.domains ?? []).map((domain) => domain.trim().toLowerCase()).filter(Boolean));
  const statuses = new Set(filters.statuses ?? []);

  let filtered = items.slice();

  if (!filters.includeHidden) {
    filtered = filtered.filter((item) => item.moderationState === 'visible');
  }

  if (statuses.size > 0) {
    filtered = filtered.filter((item) => statuses.has(item.status));
  }

  if (query) {
    filtered = filtered.filter((item) =>
      `${item.title} ${item.description}`.toLowerCase().includes(query)
    );
  }

  if (teams.size > 0) {
    filtered = filtered.filter((item) => teams.has(item.team.trim().toLowerCase()));
  }

  if (domains.size > 0) {
    filtered = filtered.filter((item) => domains.has(item.domain.trim().toLowerCase()));
  }

  return filtered.sort((left, right) => {
    if (filters.sortBy === 'time_wasted') {
      const hoursDiff = right.estimatedTimeWastedHours - left.estimatedTimeWastedHours;
      if (hoursDiff !== 0) return hoursDiff;
      const voteDiff = right.voteCount - left.voteCount;
      if (voteDiff !== 0) return voteDiff;
      return right.createdAt.localeCompare(left.createdAt);
    }

    if (filters.sortBy === 'newest') {
      return right.createdAt.localeCompare(left.createdAt);
    }

    const voteDiff = right.voteCount - left.voteCount;
    if (voteDiff !== 0) return voteDiff;
    const hoursDiff = right.estimatedTimeWastedHours - left.estimatedTimeWastedHours;
    if (hoursDiff !== 0) return hoursDiff;
    return right.createdAt.localeCompare(left.createdAt);
  });
}
