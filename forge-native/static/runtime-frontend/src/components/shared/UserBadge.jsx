/**
 * UserBadge Component
 * Display a user with their avatar, name, and callsign.
 * Ported from HD26AI for feature parity.
 * 
 * @example
 * <UserBadge user={user} showCallsign />
 * <UserBadge user={user} variant="compact" />
 */

import { forwardRef } from 'react';
import { Avatar, RoleBadge, CallsignBadge, SkillChip } from '../ui';
import { cn, formatNameWithCallsign } from '../../lib/design-system';

/**
 * @typedef {Object} UserBadgeProps
 * @property {Object} user - User object
 * @property {'default' | 'compact' | 'full'} [variant='default']
 * @property {'sm' | 'md' | 'lg'} [size='md']
 * @property {boolean} [showCallsign=true]
 * @property {boolean} [showRole=false]
 * @property {boolean} [showSkills=false]
 * @property {boolean} [clickable=false]
 * @property {() => void} [onClick]
 * @property {string} [className]
 */

const SIZE_MAP = {
  sm: { avatar: 'sm', text: 'text-sm', subtext: 'text-xs' },
  md: { avatar: 'md', text: 'text-sm', subtext: 'text-xs' },
  lg: { avatar: 'lg', text: 'text-base', subtext: 'text-sm' },
};

const UserBadge = forwardRef(({
  user,
  variant = 'default',
  size = 'md',
  showCallsign = true,
  showRole = false,
  showSkills = false,
  clickable = false,
  onClick,
  className,
  ...props
}, ref) => {
  if (!user) return null;

  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const nameFormatted = formatNameWithCallsign(user.name, showCallsign ? user.callsign : null);

  const Component = clickable ? 'button' : 'div';

  // Compact variant - just avatar and name
  if (variant === 'compact') {
    return (
      <Component
        ref={ref}
        type={clickable ? 'button' : undefined}
        onClick={clickable ? onClick : undefined}
        className={cn(
          'inline-flex items-center gap-2',
          clickable && 'cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        {...props}
      >
        <Avatar
          src={user.image}
          name={user.name}
          size={sizeConfig.avatar}
        />
        <span className={cn('font-bold text-text-primary', sizeConfig.text)}>
          {user.name}
        </span>
      </Component>
    );
  }

  // Full variant - all details
  if (variant === 'full') {
    return (
      <Component
        ref={ref}
        type={clickable ? 'button' : undefined}
        onClick={clickable ? onClick : undefined}
        className={cn(
          'flex items-start gap-3 p-3 rounded-xl border border-arena-border bg-arena-card',
          clickable && 'cursor-pointer hover:bg-arena-elevated transition-colors',
          className
        )}
        {...props}
      >
        <Avatar
          src={user.image}
          name={user.name}
          size="lg"
          showBorder
        />
        <div className="flex-1 min-w-0 text-left">
          {/* Name with callsign */}
          <div className={cn('font-bold text-text-primary flex items-center gap-1 flex-wrap', sizeConfig.text)}>
            {nameFormatted.hasCallsign ? (
              <>
                {nameFormatted.firstName}
                <CallsignBadge>
                  {nameFormatted.callsign}
                </CallsignBadge>
                {nameFormatted.lastName && ` ${nameFormatted.lastName}`}
              </>
            ) : (
              user.name
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {showRole && user.role && user.role !== 'participant' && (
              <RoleBadge role={user.role} size="xs" />
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-xs text-text-secondary mt-2 line-clamp-2">
              {user.bio}
            </p>
          )}

          {/* Skills */}
          {showSkills && user.skills && user.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {user.skills.slice(0, 3).map((skill, idx) => (
                <SkillChip key={idx}>
                  {skill}
                </SkillChip>
              ))}
              {user.skills.length > 3 && (
                <SkillChip>+{user.skills.length - 3}</SkillChip>
              )}
            </div>
          )}
        </div>
      </Component>
    );
  }

  // Default variant
  return (
    <Component
      ref={ref}
      type={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
      className={cn(
        'flex items-center gap-3',
        clickable && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      {...props}
    >
      <Avatar
        src={user.image}
        name={user.name}
        size={sizeConfig.avatar}
        showBorder
      />
      <div className="flex-1 min-w-0 text-left">
        {/* Name with callsign */}
        <div className={cn('font-bold text-text-primary flex items-center gap-1 flex-wrap', sizeConfig.text)}>
          {nameFormatted.hasCallsign ? (
            <>
              {nameFormatted.firstName}
              <CallsignBadge>
                {nameFormatted.callsign}
              </CallsignBadge>
              {nameFormatted.lastName && ` ${nameFormatted.lastName}`}
            </>
          ) : (
            user.name
          )}
        </div>
        
        {/* Subtitle row */}
        <div className={cn('text-text-secondary flex items-center gap-2', sizeConfig.subtext)}>
          {showRole && user.role && user.role !== 'participant' && (
            <RoleBadge role={user.role} size="xs" />
          )}
        </div>
      </div>
    </Component>
  );
});

UserBadge.displayName = 'UserBadge';

/**
 * UserList - List of users with UserBadge
 */
export const UserList = ({
  users = [],
  variant = 'default',
  size = 'md',
  emptyMessage = 'No users found',
  className,
  ...props
}) => {
  if (users.length === 0) {
    return (
      <div className={cn('text-sm text-text-muted text-center py-4', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {users.map((user) => (
        <UserBadge
          key={user.id}
          user={user}
          variant={variant}
          size={size}
        />
      ))}
    </div>
  );
};

UserList.displayName = 'UserList';

export default UserBadge;
