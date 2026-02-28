/**
 * Avatar Component
 * User avatar with fallback to initials
 */

import { memo, forwardRef } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/design-system';

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

/**
 * Generate a consistent color based on a string
 */
function stringToColor(str) {
  if (!str) return 'bg-arena-elevated';
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'bg-cyan-500/20 text-cyan-400',
    'bg-orange-500/20 text-orange-400',
    'bg-purple-500/20 text-purple-400',
    'bg-green-500/20 text-green-400',
    'bg-pink-500/20 text-pink-400',
    'bg-blue-500/20 text-blue-400',
    'bg-yellow-500/20 text-yellow-400',
    'bg-red-500/20 text-red-400',
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from a name
 */
function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const Avatar = forwardRef(({
  user,
  name,
  src,
  size = 'md',
  className,
  ...props
}, ref) => {
  const displayName = user?.name || name || '';
  const avatarSrc = user?.avatar || user?.avatarUrl || src;
  const initials = getInitials(displayName);
  const colorClass = stringToColor(displayName);
  
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
        SIZE_CLASSES[size],
        !avatarSrc && colorClass,
        className
      )}
      {...props}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={displayName || 'User avatar'}
          className="w-full h-full object-cover"
        />
      ) : displayName ? (
        <span className="font-bold">{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-text-muted" />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

/**
 * AvatarGroup - Stack multiple avatars
 */
export const AvatarGroup = memo(({
  users = [],
  max = 4,
  size = 'sm',
  className,
}) => {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;
  
  return (
    <div className={cn('flex -space-x-2', className)}>
      {displayUsers.map((user, index) => (
        <Avatar
          key={user?.id || index}
          user={user}
          size={size}
          className="ring-2 ring-arena-bg"
        />
      ))}
      {remaining > 0 && (
        <div className={cn(
          'rounded-full flex items-center justify-center bg-arena-elevated text-text-secondary font-bold ring-2 ring-arena-bg',
          SIZE_CLASSES[size]
        )}>
          +{remaining}
        </div>
      )}
    </div>
  );
});

AvatarGroup.displayName = 'AvatarGroup';

export default Avatar;
