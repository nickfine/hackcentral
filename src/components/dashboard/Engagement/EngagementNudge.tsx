/**
 * EngagementNudge - Personalized hook: "Hey [Name], X new team assets — copy one?"
 * Uses profile fullName (first name) and activity pulse newAssetsThisWeek.
 */

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export interface EngagementNudgeProps {
  /** User's display name (e.g. profile.fullName); first name used for "Hey [Name]" */
  displayName?: string | null;
  /** New assets count this week (e.g. from getActivityPulse.newAssetsThisWeek) */
  newAssetsCount?: number;
  /** Scroll to Community Hacks when CTA clicked */
  onScrollToHacks?: () => void;
}

function getFirstName(fullName: string | undefined | null): string {
  if (!fullName?.trim()) return '';
  const first = fullName.trim().split(/\s+/)[0];
  return first || '';
}

export function EngagementNudge({
  displayName,
  newAssetsCount = 0,
  onScrollToHacks,
}: EngagementNudgeProps) {
  const firstName = getFirstName(displayName);
  const showName = firstName.length > 0;
  const count = Math.max(0, newAssetsCount);

  if (count === 0 && !showName) return null;

  const copy = showName
    ? count > 0
      ? `Hey ${firstName}, ${count} new team asset${count !== 1 ? 's' : ''} — copy one?`
      : `Hey ${firstName}, copy a hack from your peers below.`
    : count > 0
      ? `${count} new team asset${count !== 1 ? 's' : ''} this week — copy one?`
      : null;

  if (!copy) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5"
    >
      <p className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">
        <Sparkles className="mr-2 inline-block h-4 w-4 shrink-0 text-primary" aria-hidden />
        {copy}
      </p>
      {onScrollToHacks && (
        <button
          type="button"
          onClick={onScrollToHacks}
          className="btn btn-primary btn-sm w-full min-h-[44px] shrink-0 touch-manipulation sm:w-auto"
          aria-label="Scroll to Community Hacks"
        >
          See hacks
        </button>
      )}
    </motion.div>
  );
}
