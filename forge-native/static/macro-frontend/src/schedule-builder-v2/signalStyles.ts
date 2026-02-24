/**
 * Signal Color System for Schedule Builder V2
 *
 * Defines the visual styling for different event signal types.
 * Colors align with the HackDay design system.
 */

import type { EventSignal } from '../types/scheduleBuilderV2';

/**
 * Color configuration for a signal type.
 */
export interface SignalColors {
  /** Human-readable name */
  name: string;
  /** Background color for the card */
  bg: string;
  /** Border color (with opacity) */
  border: string;
  /** Left accent border color */
  accent: string;
  /** Text color for labels */
  text: string;
  /** Background color for icon/indicator */
  iconBg: string;
}

/**
 * Signal color definitions.
 *
 * Two primary semantic colors:
 * - Teal (#14b8a6) for starts and openings
 * - Red (#ef4444) for deadlines and closings
 *
 * Additional category colors:
 * - Orange (#f97316) for ceremonies
 * - Pink (#ec4899) for presentations
 * - Blue (#3b82f6) for judging
 * - Neutral (gray) for everything else
 */
export const SIGNAL_COLORS: Record<EventSignal, SignalColors> = {
  start: {
    name: 'Start',
    bg: '#f0fdfa',
    border: 'rgba(20, 184, 166, 0.21)',
    accent: '#14b8a6',
    text: '#0d9488',
    iconBg: '#ccfbf1',
  },
  deadline: {
    name: 'Deadline',
    bg: '#fef2f2',
    border: 'rgba(239, 68, 68, 0.15)',
    accent: '#ef4444',
    text: '#dc2626',
    iconBg: 'rgba(239, 68, 68, 0.1)',
  },
  ceremony: {
    name: 'Ceremony',
    bg: '#fff7ed',
    border: 'rgba(249, 115, 22, 0.12)',
    accent: '#f97316',
    text: '#c2410c',
    iconBg: 'rgba(249, 115, 22, 0.1)',
  },
  presentation: {
    name: 'Presentation',
    bg: '#fdf2f8',
    border: 'rgba(236, 72, 153, 0.12)',
    accent: '#ec4899',
    text: '#be185d',
    iconBg: 'rgba(236, 72, 153, 0.1)',
  },
  judging: {
    name: 'Judging',
    bg: '#eff6ff',
    border: 'rgba(59, 130, 246, 0.12)',
    accent: '#3b82f6',
    text: '#1d4ed8',
    iconBg: 'rgba(59, 130, 246, 0.1)',
  },
  neutral: {
    name: 'Neutral',
    bg: '#ffffff',
    border: '#e5e7eb',
    accent: '#9ca3af',
    text: '#374151',
    iconBg: '#f3f4f6',
  },
};

/**
 * Get the color configuration for a signal type.
 */
export function getSignalStyle(signal: EventSignal): SignalColors {
  return SIGNAL_COLORS[signal] || SIGNAL_COLORS.neutral;
}

/**
 * Get CSS custom properties for a signal type.
 * Useful for applying styles via inline style objects.
 */
export function getSignalCssVars(signal: EventSignal): Record<string, string> {
  const colors = getSignalStyle(signal);
  return {
    '--signal-bg': colors.bg,
    '--signal-border': colors.border,
    '--signal-accent': colors.accent,
    '--signal-text': colors.text,
    '--signal-icon-bg': colors.iconBg,
  };
}

/**
 * Check if a signal type should have a colored left border accent.
 * Neutral signals don't get the accent border treatment.
 */
export function hasAccentBorder(signal: EventSignal): boolean {
  return signal !== 'neutral';
}
