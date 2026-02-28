/**
 * Badge Component
 * A label component for displaying status, skills, and other tags
 */

import { forwardRef } from 'react';
import { X } from 'lucide-react';
import { cn, BADGE_VARIANTS, SIZE_CLASSES } from '../../lib/design-system';

const Badge = forwardRef(({
  variant = 'default',
  size = 'sm',
  icon,
  removable = false,
  onRemove,
  dot = false,
  dotColor,
  className,
  children,
  ...props
}, ref) => {
  const variantStyles = BADGE_VARIANTS[variant] || BADGE_VARIANTS.default;
  const sizeStyles = SIZE_CLASSES.badge[size] || SIZE_CLASSES.badge.sm;

  const getDotColor = () => {
    if (dotColor) return dotColor;
    const dotColors = {
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
      default: 'bg-text-muted',
      outline: 'bg-text-muted',
      neutral: 'bg-text-muted',
    };
    return dotColors[variant] || dotColors.default;
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap',
        sizeStyles,
        variantStyles,
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', getDotColor())} />
      )}
      
      {icon && (
        <span className="flex-shrink-0 w-3 h-3">
          {icon}
        </span>
      )}
      
      <span>{children}</span>
      
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 -mr-1 ml-0.5 p-0.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

export const StatusBadge = forwardRef(({
  status,
  size = 'sm',
  className,
  ...props
}, ref) => {
  const statusConfig = {
    submitted: { variant: 'success', label: 'Submitted', dot: true },
    in_progress: { variant: 'warning', label: 'In Progress', dot: true },
    not_started: { variant: 'default', label: 'Not Started', dot: true },
    draft: { variant: 'default', label: 'Draft', dot: true },
    approved: { variant: 'success', label: 'Approved', dot: true },
    rejected: { variant: 'error', label: 'Rejected', dot: true },
    pending: { variant: 'warning', label: 'Pending', dot: true },
    live: { variant: 'success', label: 'Live', dot: true },
  };

  const config = statusConfig[status] || { variant: 'default', label: status, dot: false };

  return (
    <Badge
      ref={ref}
      variant={config.variant}
      size={size}
      dot={config.dot}
      className={className}
      {...props}
    >
      {config.label}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

export const RoleBadge = forwardRef(({
  role,
  size = 'sm',
  className,
  ...props
}, ref) => {
  const roleConfig = {
    participant: { variant: 'default', label: 'Participant' },
    ambassador: { variant: 'success', label: 'Ambassador' },
    judge: { variant: 'warning', label: 'Judge' },
    admin: { variant: 'error', label: 'Admin' },
  };

  const config = roleConfig[role] || roleConfig.participant;

  return (
    <Badge
      ref={ref}
      variant={config.variant}
      size={size}
      className={cn('font-bold', className)}
      {...props}
    >
      {config.label}
    </Badge>
  );
});

RoleBadge.displayName = 'RoleBadge';

export const LiveBadge = forwardRef(({
  className,
  children = 'LIVE',
  ...props
}, ref) => (
  <Badge
    ref={ref}
    variant="error"
    size="xs"
    className={cn('uppercase tracking-wider', className)}
    {...props}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse mr-1" />
    {children}
  </Badge>
));

LiveBadge.displayName = 'LiveBadge';

/**
 * CallsignBadge - Display user's callsign in quotes
 */
export const CallsignBadge = forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center px-1.5 py-0.5 text-xs font-medium',
      'text-brand bg-brand/10 rounded',
      className
    )}
    {...props}
  >
    "{children}"
  </span>
));

CallsignBadge.displayName = 'CallsignBadge';

/**
 * SkillChip - Compact skill tag
 */
export const SkillChip = forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center px-2 py-0.5 text-xs font-medium',
      'text-text-secondary bg-arena-elevated border border-arena-border rounded-full',
      className
    )}
    {...props}
  >
    {children}
  </span>
));

SkillChip.displayName = 'SkillChip';

export default Badge;
