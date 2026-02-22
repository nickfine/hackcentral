/**
 * BadgeGroup - Display group of badges with overflow handling (maxVisible + "+N more").
 * Matches design system: px-2.5 py-1 text-xs font-medium rounded-full.
 */

import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'prompt'
  | 'skill'
  | 'app'
  | 'verified'
  | 'muted'
  | 'outline';

const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary border border-primary/20',
  prompt: 'bg-blue-50 text-blue-700 border border-blue-200',
  skill: 'bg-orange-50 text-orange-700 border border-orange-200',
  app: 'bg-gray-100 text-gray-800 border border-gray-200',
  verified: 'bg-green-100 text-green-800 border border-green-200',
  muted: 'bg-muted text-muted-foreground border border-border',
  outline: 'border border-border text-foreground',
};

export interface BadgeGroupBadge {
  id: string;
  label: string;
  variant?: BadgeVariant;
}

export interface BadgeGroupProps {
  badges: BadgeGroupBadge[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function BadgeGroup({
  badges,
  maxVisible = 3,
  size = 'sm',
  className = '',
}: BadgeGroupProps) {
  if (badges.length === 0) return null;

  const visible = badges.slice(0, maxVisible);
  const overflowBadges = badges.slice(maxVisible);
  const overflowCount = overflowBadges.length;
  const overflowTitle = overflowCount > 0 ? overflowBadges.map((b) => b.label).join(', ') : undefined;

  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          className={cn(
            'inline-flex items-center rounded-full font-medium border',
            sizeClass,
            BADGE_VARIANT_CLASSES[badge.variant ?? 'default']
          )}
        >
          {badge.label}
        </span>
      ))}
      {overflowCount > 0 && (
        <span
          title={overflowTitle}
          className={cn(
            'inline-flex items-center rounded-full font-medium border bg-muted text-muted-foreground border-border',
            sizeClass
          )}
        >
          +{overflowCount} more
        </span>
      )}
    </div>
  );
}
