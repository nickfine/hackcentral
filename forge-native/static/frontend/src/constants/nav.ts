export type View =
  | 'dashboard'
  | 'hacks'
  | 'hacks_exchange'
  | 'library'
  | 'problem_exchange'
  | 'hackdays'
  | 'pipeline'
  | 'team_up'
  | 'team_pulse'
  | 'roi'
  | 'create_hackday'
  | 'profile'
  | 'search'
  | 'projects'
  | 'onboarding'
  | 'guide'
  | 'notifications';
export type HackTab = 'completed' | 'in_progress';
export type LibraryTab = 'artifacts' | 'learnings';
export type HackTypeFilter = 'all' | 'prompt' | 'skill' | 'app';
export type HackStatusFilter = 'all' | 'draft' | 'in_progress' | 'verified' | 'deprecated';
export type MentorFilter = 'hackers' | 'available';
export type ModalView = 'none' | 'submit_hack' | 'create_project' | 'mentor_profile';
export type RecognitionTab = 'builders' | 'sharers' | 'solvers' | 'mentors';

export interface NavItem {
  id: View;
  label: string;
  icon: string;
  groupLabel?: string;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'hacks', label: 'Showcase', icon: '⚡' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'hacks_exchange', label: 'HackDay Hacks', icon: '🛠️' },
  { id: 'problem_exchange', label: 'Pains', icon: '🧩' },
  { id: 'hackdays', label: 'HackDays', icon: '🚀' },
  { id: 'pipeline', label: 'Pipeline', icon: '📈' },
];

export const OVERFLOW_NAV_ITEMS: NavItem[] = [
  { id: 'team_up', label: 'Team Up', icon: '🤝' },
  { id: 'team_pulse', label: 'Team Pulse', icon: '📊' },
  { id: 'guide', label: 'Guide', icon: '📖' },
  { id: 'onboarding', label: 'Get Started', icon: '✨' },
];

export const NAV_ITEMS: NavItem[] = [...PRIMARY_NAV_ITEMS, ...OVERFLOW_NAV_ITEMS];
