/**
 * Design System Utilities for HD26 Forge Custom UI
 * Simplified utilities and component variants
 */

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Merge class names, filtering out falsy values
 */
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Format name with callsign: "First 'Callsign' Last"
 * @param {string} name - Full name
 * @param {string} callsign - User's callsign
 * @returns {object} Formatted name parts or string
 */
export const formatNameWithCallsign = (name, callsign) => {
  if (!callsign || !name) return { formatted: name, hasCallsign: false };
  const parts = name.split(' ');
  if (parts.length < 2) return { formatted: name, hasCallsign: false };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, callsign, lastName, hasCallsign: true };
};

// =============================================================================
// SIZE PRESETS
// =============================================================================

export const SIZE_CLASSES = {
  button: {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
    xl: 'px-6 py-3 text-lg gap-2.5',
  },
  icon: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  },
  avatar: {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  },
  badge: {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  },
};

// =============================================================================
// VARIANT MAPPINGS
// =============================================================================

export const BUTTON_VARIANTS = {
  primary: {
    base: 'bg-[linear-gradient(135deg,#FF8A26_0%,#F97316_48%,#EA580C_100%)] text-[#1F1309] border border-[#FDBA74]/40 shadow-[0_10px_24px_rgba(249,115,22,0.3)]',
    hover: 'hover:translate-y-[-1px] hover:brightness-105 hover:shadow-[0_14px_28px_rgba(249,115,22,0.32)]',
    active: 'active:translate-y-0 active:brightness-95',
    focus: 'focus-ring-control',
  },
  secondary: {
    base: 'bg-arena-elevated text-text-primary border border-arena-border shadow-[0_6px_18px_rgba(9,17,40,0.16)]',
    hover: 'hover:translate-y-[-1px] hover:border-arena-border-strong',
    active: 'active:translate-y-0',
    focus: 'focus-ring-control',
  },
  ghost: {
    base: 'bg-transparent text-text-secondary border-2 border-transparent',
    hover: 'hover:bg-arena-elevated hover:text-text-primary',
    active: 'active:bg-arena-elevated',
    focus: 'focus-ring-control',
  },
  danger: {
    base: 'bg-error text-white border border-error',
    hover: 'hover:bg-error/90 hover:-translate-y-0.5',
    active: 'active:bg-error/80 active:translate-y-0',
    focus: 'focus-ring-control',
  },
};

/** Design-system card for Hack Ideas & Teams: white/gray-800, gray border, rounded-xl, shadow-sm (light only) */
export const DESIGN_SYSTEM_CARD =
  'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm dark:shadow-none';

export const CARD_VARIANTS = {
  default: 'bg-arena-card border border-arena-border rounded-card',
  primary: 'bg-arena-card border-2 border-arena-border-strong rounded-card shadow-lg',
  secondary: 'bg-arena-card border border-arena-border rounded-card',
  interactive: 'bg-arena-card border border-arena-border rounded-card hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
  outlined: 'bg-arena-card border-2 border-arena-border-strong rounded-card',
  elevated: 'bg-arena-elevated border border-arena-border rounded-card shadow-lg',
  ghost: 'bg-transparent border border-transparent rounded-card',
};

export const BADGE_VARIANTS = {
  default: 'bg-arena-elevated text-text-secondary border border-arena-border',
  outline: 'bg-transparent text-text-secondary border border-arena-border-strong',
  neutral: 'bg-arena-elevated text-text-muted border border-arena-border',
  success: 'bg-success/10 text-success border border-success/30',
  warning: 'bg-warning/10 text-warning border border-warning/30',
  error: 'bg-error/10 text-error border border-error/30',
};

// =============================================================================
// SKILL CATEGORIES
// =============================================================================

export const SKILL_CATEGORIES = {
  development: {
    label: 'Development',
    color: '#3B82F6',
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
  },
  design: {
    label: 'Design',
    color: '#EC4899',
    bgClass: 'bg-pink-500/15',
    textClass: 'text-pink-400',
    borderClass: 'border-pink-500/30',
  },
  data: {
    label: 'Data & AI',
    color: '#8B5CF6',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
  },
  infrastructure: {
    label: 'Infrastructure',
    color: '#10B981',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
  business: {
    label: 'Business',
    color: '#F59E0B',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  other: {
    label: 'Other',
    color: '#6B7280',
    bgClass: 'bg-neutral-500/15',
    textClass: 'text-neutral-400',
    borderClass: 'border-neutral-500/30',
  },
};

const SKILL_TO_CATEGORY_MAP = {
  'frontend development': 'development',
  'backend development': 'development',
  'mobile development': 'development',
  'ui/ux design': 'design',
  'graphic design': 'design',
  'machine learning': 'data',
  'data science': 'data',
  'ai/ml': 'data',
  'devops': 'infrastructure',
  'security': 'infrastructure',
  'cloud': 'infrastructure',
  'hardware/iot': 'infrastructure',
  'product management': 'business',
  'project management': 'business',
  'marketing': 'business',
};

export function getSkillCategory(skill) {
  if (!skill) return 'other';
  const normalizedSkill = skill.toLowerCase().trim();
  return SKILL_TO_CATEGORY_MAP[normalizedSkill] || 'other';
}

export function getSkillConfig(skill) {
  const category = getSkillCategory(skill);
  return SKILL_CATEGORIES[category] || SKILL_CATEGORIES.other;
}

export function getSkillClasses(skill) {
  const config = getSkillConfig(skill);
  return `${config.bgClass} ${config.textClass} ${config.borderClass}`;
}

export default {
  cn,
  formatNameWithCallsign,
  SIZE_CLASSES,
  BUTTON_VARIANTS,
  CARD_VARIANTS,
  BADGE_VARIANTS,
  SKILL_CATEGORIES,
  getSkillCategory,
  getSkillConfig,
  getSkillClasses,
};
