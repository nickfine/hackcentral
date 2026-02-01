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
