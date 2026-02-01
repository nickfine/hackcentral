/**
 * PersonCard - Profile card with avatar, name, experience badge, capability tags, mentor status.
 * Matches design system: card p-4 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5.
 */

import { GraduationCap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { BadgeGroup, type BadgeGroupBadge } from './BadgeGroup';
import { EXPERIENCE_LEVEL_LABELS } from '@/constants/profile';

export type ExperienceLevelKey = keyof typeof EXPERIENCE_LEVEL_LABELS;

const EXPERIENCE_BADGE_CLASSES: Record<string, string> = {
  newbie: 'bg-gray-100 text-gray-700 border border-gray-200',
  curious: 'bg-blue-50 text-blue-700 border border-blue-200',
  comfortable: 'bg-green-50 text-green-700 border border-green-200',
  power_user: 'bg-violet-50 text-violet-700 border border-violet-200',
  expert: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export interface PersonCardProfile {
  _id: string;
  avatarUrl?: string;
  fullName?: string;
  email: string;
  experienceLevel?: ExperienceLevelKey | string;
  capabilityTags: Array<{ id: string; label: string }>;
  mentorCapacity: number;
  mentorSessionsUsed: number;
}

export interface PersonCardProps {
  profile: PersonCardProfile;
  onClick?: () => void;
  showMentorStatus?: boolean;
  className?: string;
}

export function PersonCard({
  profile,
  onClick,
  showMentorStatus = true,
  className = '',
}: PersonCardProps) {
  const isMentor = profile.mentorCapacity > 0;
  const availableSlots = profile.mentorCapacity - profile.mentorSessionsUsed;
  const hasCapacity = availableSlots > 0;

  const tags: BadgeGroupBadge[] = profile.capabilityTags.map((t) => ({
    id: t.id,
    label: t.label,
    variant: 'outline',
  }));

  const experienceBadgeClass =
    profile.experienceLevel && EXPERIENCE_BADGE_CLASSES[profile.experienceLevel]
      ? EXPERIENCE_BADGE_CLASSES[profile.experienceLevel]
      : 'bg-muted text-muted-foreground border border-border';

  const displayName = profile.fullName ?? profile.email;

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
        'rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm transition-all duration-200 ease-out',
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="avatar relative size-10 shrink-0 rounded-full overflow-hidden bg-primary/10 text-primary font-semibold flex items-center justify-center">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="avatar-image w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm">{getInitials(profile.fullName, profile.email)}</span>
            )}
            {showMentorStatus && isMentor && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 size-5 rounded-full p-0.5 flex items-center justify-center',
                  hasCapacity ? 'bg-[var(--color-success)] text-white' : 'bg-muted text-muted-foreground'
                )}
                title={hasCapacity ? 'Available Mentor' : 'Fully booked'}
                aria-hidden
              >
                {hasCapacity ? (
                  <GraduationCap className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{displayName}</h3>
            {profile.experienceLevel && (
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1',
                  experienceBadgeClass
                )}
              >
                {EXPERIENCE_LEVEL_LABELS[profile.experienceLevel] ?? profile.experienceLevel}
              </span>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <BadgeGroup badges={tags} maxVisible={3} size="sm" />
        )}

        {showMentorStatus && isMentor && (
          <div className="flex items-center gap-2 text-xs">
            {hasCapacity ? (
              <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium bg-success/10 text-success border-success/30">
                <GraduationCap className="h-3 w-3 shrink-0" />
                Available: {availableSlots} {availableSlots === 1 ? 'slot' : 'slots'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                Fully booked
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
