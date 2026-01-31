/**
 * Shared profile constants for experience levels and visibility.
 * Used by Profile, People, and ProfileSetup.
 */

export const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  newbie: 'AI Newbie',
  curious: 'AI Curious',
  comfortable: 'AI Comfortable',
  power_user: 'AI Power User',
  expert: 'AI Expert',
};

export const EXPERIENCE_LEVELS = [
  { value: 'newbie', label: 'AI Newbie - Just starting to explore' },
  { value: 'curious', label: 'Curious - Trying things out' },
  { value: 'comfortable', label: 'Comfortable - Using AI regularly' },
  { value: 'power_user', label: 'Power User - Advanced usage' },
  { value: 'expert', label: 'Expert - Building AI solutions' },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private', description: 'Only you can see your profile' },
  { value: 'org', label: 'Organization', description: 'Visible to colleagues' },
  { value: 'public', label: 'Public', description: 'Visible to everyone' },
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]['value'];
export type Visibility = (typeof VISIBILITY_OPTIONS)[number]['value'];
