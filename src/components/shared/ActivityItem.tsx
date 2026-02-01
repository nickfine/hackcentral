/**
 * ActivityItem - Activity feed item with avatar, name, action text, badge, timestamp.
 * Matches design system: card p-4 flex gap-4, hover:bg-accent/50.
 */

import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { BadgeGroup, type BadgeGroupBadge } from './BadgeGroup';

export type ActivityItemType = 'library' | 'project' | 'verification' | 'mentor' | 'story';

export interface ActivityItemProps {
  avatarUrl?: string;
  name: string;
  action: string;
  type: ActivityItemType;
  timestamp: number;
  badge?: {
    label: string;
    variant?: 'verified' | 'prompt' | 'skill' | 'app' | 'default';
  };
  onClick?: () => void;
  className?: string;
}

const BADGE_VARIANT_MAP: Record<string, 'verified' | 'prompt' | 'skill' | 'app' | 'default'> = {
  verified: 'verified',
  prompt: 'prompt',
  skill: 'skill',
  app: 'app',
  default: 'default',
};

export function ActivityItem({
  avatarUrl,
  name,
  action,
  type: _type,
  timestamp,
  badge,
  onClick,
  className = '',
}: ActivityItemProps) {
  const badgeForGroup: BadgeGroupBadge[] = badge
    ? [{ id: 'activity-badge', label: badge.label, variant: BADGE_VARIANT_MAP[badge.variant ?? 'default'] ?? 'default' }]
    : [];

  const formattedTime = (() => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  })();

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-xl border border-border bg-card p-4 flex items-center gap-4 transition-colors duration-200',
        onClick && 'cursor-pointer hover:bg-accent/50',
        className
      )}
    >
      <div className="avatar size-10 shrink-0 rounded-full overflow-hidden bg-primary/10 text-primary font-semibold flex items-center justify-center">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="avatar-image w-full h-full object-cover" />
        ) : (
          <span className="text-sm">{getInitials(name, '')}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{name}</span>
          {badgeForGroup.length > 0 && <BadgeGroup badges={badgeForGroup} maxVisible={1} size="sm" />}
        </div>
        <p className="text-sm text-muted-foreground truncate">{action}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {formattedTime}
      </span>
    </div>
  );
}
