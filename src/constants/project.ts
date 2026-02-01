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

/** Hack type (project category) labels for display. */
export const HACK_TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompts',
  app: 'Apps',
  extension: 'Extensions',
  skill: 'Skills',
  template: 'Templates',
  agent_flow: 'Agents / flows',
  playbook: 'Playbooks / guides',
};

/** Hack types for dropdowns (value + label). */
export const HACK_TYPES = [
  { value: 'prompt', label: 'Prompts' },
  { value: 'app', label: 'Apps' },
  { value: 'extension', label: 'Extensions' },
  { value: 'skill', label: 'Skills' },
  { value: 'template', label: 'Templates' },
  { value: 'agent_flow', label: 'Agents / flows' },
  { value: 'playbook', label: 'Playbooks / guides' },
] as const;

/** Hack type badge colors for list/detail. */
export const HACK_TYPE_BADGE_COLORS: Record<string, string> = {
  prompt: 'bg-violet-100 text-violet-800 border-violet-200',
  app: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  extension: 'bg-sky-100 text-sky-800 border-sky-200',
  skill: 'bg-amber-100 text-amber-800 border-amber-200',
  template: 'bg-slate-100 text-slate-800 border-slate-200',
  agent_flow: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  playbook: 'bg-teal-100 text-teal-800 border-teal-200',
};
