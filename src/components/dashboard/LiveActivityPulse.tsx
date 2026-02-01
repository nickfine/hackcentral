import { motion, useReducedMotion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface LiveActivityPulseProps {
  /** Optional compact mode for showcase header */
  compact?: boolean;
  className?: string;
}

export function LiveActivityPulse({ compact = false, className = '' }: LiveActivityPulseProps) {
  const shouldReduceMotion = useReducedMotion();
  const pulse = useQuery(api.metrics.getActivityPulse);

  const copy = (() => {
    if (pulse === undefined) return null;
    if (pulse.newAssetsThisWeek > 0)
      return `${pulse.newAssetsThisWeek} new asset${pulse.newAssetsThisWeek !== 1 ? 's' : ''} this week`;
    if (pulse.reusesLast24h > 0)
      return `${pulse.reusesLast24h} new reuse${pulse.reusesLast24h !== 1 ? 's' : ''} in last 24h`;
    if (pulse.weeklyActiveCount > 0)
      return `Weekly active: ${pulse.weeklyActiveCount} — every copy counts`;
    return 'Knowledge spreading — join the wildfire!';
  })();

  if (!copy) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm text-foreground ${compact ? 'text-xs' : ''} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Activity: ${copy}`}
    >
      {!shouldReduceMotion ? (
        <motion.span
          animate={{ opacity: [1, 0.7, 1], scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="h-2 w-2 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
      ) : (
        <Activity className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      )}
      <span>{copy}</span>
    </motion.div>
  );
}
