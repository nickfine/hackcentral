export type View = 'dashboard' | 'hacks' | 'library' | 'team_up' | 'team_pulse' | 'hackdays' | 'create_hackday' | 'profile' | 'search' | 'projects' | 'onboarding' | 'guide' | 'notifications';
export type HackTab = 'completed' | 'in_progress';
export type HackTypeFilter = 'all' | 'prompt' | 'skill' | 'app';
export type HackStatusFilter = 'all' | 'draft' | 'in_progress' | 'verified' | 'deprecated';
export type MentorFilter = 'hackers' | 'available';
export type ModalView = 'none' | 'submit_hack' | 'create_project' | 'mentor_profile';
export type RecognitionTab = 'recent' | 'contributors' | 'mentors' | 'reused';

export interface NavItem {
  id: View;
  label: string;
  icon: string;
  groupLabel?: string;
}

export const NAV_ITEMS: NavItem[] = [
  // Discover
  { id: 'dashboard',   label: 'Home',       icon: '🏠', groupLabel: 'Discover' },
  { id: 'hackdays',    label: 'HackDays',   icon: '🚀' },
  { id: 'hacks',       label: 'Hacks',      icon: '⚡' },
  { id: 'projects',    label: 'Projects',   icon: '📁' },

  // Collaborate
  { id: 'team_up',     label: 'Team Up',    icon: '🤝', groupLabel: 'Collaborate' },
  { id: 'team_pulse',  label: 'Team Pulse', icon: '📊' },

  // Learn
  { id: 'library',     label: 'Library',    icon: '📚', groupLabel: 'Learn' },
  { id: 'guide',       label: 'Guide',      icon: '📖' },
  { id: 'onboarding',  label: 'Get Started', icon: '✨' },
];
