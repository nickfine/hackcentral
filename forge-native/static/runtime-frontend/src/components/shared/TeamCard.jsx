/**
 * TeamCard Component
 * Display a team with members and status.
 */

import { forwardRef } from 'react';
import { Users, ChevronRight, Crown } from 'lucide-react';
import { Badge, Avatar, AvatarGroup, Button } from '../ui';
import { cn, DESIGN_SYSTEM_CARD } from '../../lib/design-system';

const TeamCard = forwardRef(({
  team,
  variant = 'default',
  showMembers = true,
  showLookingFor = true,
  showStatus = false,
  clickable = true,
  onClick,
  className,
  ...props
}, ref) => {
  if (!team) return null;

  // Calculate member stats
  const memberCount = team.members?.length || 0;
  const maxMembers = team.maxMembers || 5;
  const hasOpenSlots = memberCount < maxMembers;

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        ref={ref}
        onClick={clickable ? onClick : undefined}
        className={cn(
          DESIGN_SYSTEM_CARD,
          'marketplace-idea-card p-3 transition-all duration-200',
          clickable && cn('cursor-pointer hover:-translate-y-0.5'),
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          {/* Team Icon */}
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-full bg-teal-500/10 text-teal-500">
            <Users className="w-5 h-5 text-teal-500" />
          </div>

          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <h4 className="marketplace-card-team-name text-lg font-semibold text-gray-900 dark:text-white truncate">
              {team.name}
            </h4>
            <div className="flex items-center gap-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              <Users className="w-3 h-3" />
              {memberCount}/{maxMembers}
            </div>
          </div>

          {clickable && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
    );
  }

  // Full variant
  if (variant === 'full') {
    return (
      <div
        ref={ref}
        onClick={clickable ? onClick : undefined}
        className={cn(
          DESIGN_SYSTEM_CARD,
          'p-5 transition-all duration-200',
          clickable && cn('cursor-pointer hover:-translate-y-0.5'),
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-teal-500/10 text-teal-500 shrink-0">
              <Users className="w-6 h-6 text-teal-500" />
            </div>
            <div>
              <h3 className="marketplace-card-team-name text-lg font-semibold text-gray-900 dark:text-white">
                {team.name}
              </h3>
            </div>
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {team.description}
          </p>
        )}

        {/* Members */}
        {showMembers && team.members && team.members.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Members ({memberCount}/{maxMembers})
            </div>
            <div className="flex items-center gap-2">
              <AvatarGroup
                users={team.members}
                max={5}
                size="sm"
              />
              {hasOpenSlots && (
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {maxMembers - memberCount} slots open
                </span>
              )}
            </div>
          </div>
        )}

        {/* Looking For */}
        {showLookingFor && team.lookingFor && team.lookingFor.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Looking For
            </div>
            <div className="flex flex-wrap gap-1">
              {team.lookingFor.map((skill, idx) => (
                <Badge key={idx} variant="default" size="sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      ref={ref}
      onClick={clickable ? onClick : undefined}
      className={cn(
        DESIGN_SYSTEM_CARD,
        'marketplace-idea-card p-5 transition-all duration-200 flex flex-col min-h-[220px]',
        clickable && cn('cursor-pointer hover:-translate-y-0.5'),
        className
      )}
      {...props}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-full bg-teal-500/10 text-teal-500">
            <Users className="w-5 h-5 text-teal-500" />
          </div>
          <div>
<h4 className="marketplace-card-team-name text-lg font-semibold text-gray-900 dark:text-white">
            {team.name}
          </h4>
            <div className="flex items-center gap-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              <Users className="w-3 h-3" />
              <span>{memberCount}/{maxMembers}</span>
              {hasOpenSlots && (
                <span>• Open</span>
              )}
            </div>
          </div>
        </div>

        {clickable && (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Description / Summary */}
      <div className="flex-1 mb-3">
        {team.description ? (
          <p className="text-sm font-normal text-gray-700 dark:text-gray-300 line-clamp-4">
            {team.description}
          </p>
        ) : (
          <p className="text-xs font-normal italic text-gray-500 dark:text-gray-400">
            No description provided
          </p>
        )}
      </div>

      {/* Looking For Tags */}
      {showLookingFor && team.lookingFor && team.lookingFor.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {team.lookingFor.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="marketplace-card-skill-tag rounded-lg text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {skill}
            </span>
          ))}
          {team.lookingFor.length > 3 && (
            <span className="marketplace-card-skill-tag rounded-lg text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
              +{team.lookingFor.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

TeamCard.displayName = 'TeamCard';

/**
 * TeamList - Grid of team cards
 */
export const TeamList = ({
  teams = [],
  variant = 'default',
  columns = 2,
  emptyMessage = 'No ideas found',
  onTeamClick,
  className,
  ...props
}) => {
  if (teams.length === 0) {
    return (
      <div className={cn('text-sm text-gray-500 dark:text-gray-400 text-center py-8', className)}>
        {emptyMessage}
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)} {...props}>
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          variant={variant}
          onClick={() => onTeamClick?.(team.id)}
        />
      ))}
    </div>
  );
};

TeamList.displayName = 'TeamList';

/**
 * TeamMemberItem - Single team member row
 */
export const TeamMemberItem = ({
  member,
  isCaptain = false,
  onRemove,
  removable = false,
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center justify-between py-2',
      className
    )}>
      <div className="flex items-center gap-3">
        <Avatar
          name={member.name}
          size="sm"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {member.name}
            </span>
            {isCaptain && (
              <Crown className="w-4 h-4 text-amber-500" />
            )}
          </div>
          {member.callsign && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              "{member.callsign}"
            </span>
          )}
        </div>
      </div>

      {removable && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(member.id)}
          className="text-error hover:text-error/80"
        >
          Remove
        </Button>
      )}
    </div>
  );
};

TeamMemberItem.displayName = 'TeamMemberItem';

export default TeamCard;
