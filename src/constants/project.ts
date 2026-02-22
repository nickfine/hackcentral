/**
 * Shared project constants for status labels, badge styling, and type icons.
 * Used by Projects list, ProjectDetail page, Library, and filters.
 */
import { FileText, Code, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  building: 'Building',
  incubation: 'Incubation',
  completed: 'Completed',
  archived: 'Archived',
};

export const PROJECT_STATUS_BADGE_COLORS: Record<string, string> = {
  idea: 'bg-amber-100 text-amber-800 border-amber-200',
  building: 'bg-teal-100 text-teal-800 border-teal-200',
  incubation: 'bg-gray-100 text-gray-800 border-gray-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
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
  prompt: 'bg-gray-100 text-gray-800 border-gray-200',
  skill: 'bg-amber-100 text-amber-800 border-amber-200',
  app: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

/** Hack type icon components — render as `<Icon className="h-4 w-4" />` at call site. */
export const HACK_TYPE_ICON_COMPONENTS: Record<string, LucideIcon> = {
  prompt: FileText,
  skill: Code,
  app: Bot,
};
