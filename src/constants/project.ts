/**
 * Shared project constants for status labels and badge styling.
 * Used by Projects list, ProjectDetail page, and filters.
 */

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  building: 'Building',
  incubation: 'Incubation',
  completed: 'Completed',
  archived: 'Archived',
};

export const PROJECT_STATUS_BADGE_COLORS: Record<string, string> = {
  idea: 'bg-amber-100 text-amber-800 border-amber-200',
  building: 'bg-blue-100 text-blue-800 border-blue-200',
  incubation: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

/** Hack type (project category) labels for display (plural). */
export const HACK_TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompts',
  skill: 'Skills',
  app: 'Apps',
};

/** Hack type labels singular (e.g. for asset cards, search results). */
export const HACK_TYPE_LABELS_SINGULAR: Record<string, string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  app: 'App',
};

/** Hack types for dropdowns (value + label). */
export const HACK_TYPES = [
  { value: 'prompt', label: 'Prompts' },
  { value: 'skill', label: 'Skills' },
  { value: 'app', label: 'Apps' },
] as const;

/** Hack type badge colors for list/detail. */
export const HACK_TYPE_BADGE_COLORS: Record<string, string> = {
  prompt: 'bg-violet-100 text-violet-800 border-violet-200',
  skill: 'bg-amber-100 text-amber-800 border-amber-200',
  app: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};
