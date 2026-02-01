import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

interface DerivedBadge {
  badgeType: string;
  label: string;
  metricValue: number;
}

interface UserCounts {
  projectCount?: number;
  libraryAssetCount?: number;
  assetReuseCount?: number;
}

interface PersonalizedNudgeProps {
  profile: unknown;
  userCounts: UserCounts | null | undefined;
  derivedBadges: DerivedBadge[] | undefined;
}

export function PersonalizedNudge({
  userCounts,
  derivedBadges,
}: PersonalizedNudgeProps) {
  const assetReuseCount = userCounts?.assetReuseCount ?? 0;

  if (assetReuseCount === 0) return null;

  const needsMoreReuses = assetReuseCount < 3;
  const hasReuserBadge =
    derivedBadges?.some((b) => b.badgeType === 'most_reused') ?? false;

  if (!needsMoreReuses || hasReuserBadge) return null;

  const remaining = 3 - assetReuseCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent p-4"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">You&apos;re close to a badge!</h3>
          <p className="text-sm text-muted-foreground">
            Your hack has been reused {assetReuseCount}×. Get {remaining} more
            reuse{remaining > 1 ? 's' : ''} to unlock the{' '}
            <span className="font-semibold text-primary">Reuser Magnet</span>{' '}
            badge.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
