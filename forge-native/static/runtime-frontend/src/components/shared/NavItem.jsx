/**
 * NavItem Component
 * Navigation item for sidebars and menus.
 */

import { forwardRef } from 'react';
import { cn } from '../../lib/design-system';

const NavItem = forwardRef(({
  icon,
  active = false,
  variant = 'vertical',
  highlight,
  badge,
  disabled = false,
  onClick,
  className,
  children,
  ...props
}, ref) => {
  const isHorizontal = variant === 'horizontal';

  const highlightStyles = {
    vertical: {
      amber: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-600 dark:text-amber-400 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:border-amber-400',
      purple: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-l-4 border-purple-500 dark:text-purple-300/70 dark:bg-purple-500/[0.06] dark:hover:bg-purple-500/[0.10] dark:border-purple-400/50',
      success: 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-l-4 border-emerald-600 dark:text-success dark:bg-success/10 dark:hover:bg-success/20 dark:border-success',
      signup: 'nav-item-signup-vertical border-l-4',
      error: 'text-red-700 bg-red-50 hover:bg-red-100 border-l-4 border-red-600 dark:text-error dark:bg-error/10 dark:hover:bg-error/20 dark:border-error',
    },
    horizontal: {
      amber: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 dark:text-amber-400 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:border-amber-400/40',
      purple: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 dark:text-purple-300/70 dark:bg-purple-500/[0.06] dark:hover:bg-purple-500/[0.10] dark:border-purple-400/20',
      success: 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 dark:text-success dark:bg-success/10 dark:hover:bg-success/20 dark:border-success/40',
      signup: 'nav-item-signup-horizontal border',
      error: 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 dark:text-error dark:bg-error/10 dark:hover:bg-error/20 dark:border-error/40',
    },
  };

  const activeStyles = isHorizontal
    ? 'bg-[var(--phase-active-bg)] text-[var(--phase-active-text)] border border-[var(--phase-active-border)]'
    : 'bg-arena-elevated text-text-primary border-l-4 border-brand';

  const defaultStyles = isHorizontal
    ? 'text-text-secondary hover:bg-arena-elevated hover:text-text-primary border border-transparent'
    : 'text-text-secondary hover:bg-arena-elevated hover:text-text-primary';

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center transition-all duration-200 rounded-lg',
        isHorizontal
          ? 'min-w-0 w-auto flex-shrink-0 gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold whitespace-nowrap'
          : 'w-full gap-3 px-3 py-2 text-sm font-bold',
        'focus-ring-control',
        active
          ? activeStyles
          : highlight
            ? highlightStyles[isHorizontal ? 'horizontal' : 'vertical'][highlight]
            : defaultStyles,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {/* Icon - decorative, hidden from screen readers */}
      {icon && (
        <span className="w-4 h-4 flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Label */}
      <span className={cn(
        isHorizontal ? 'text-center w-full leading-none whitespace-nowrap' : 'flex-1 text-left truncate'
      )}>
        {children}
      </span>

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'px-1.5 py-0.5 text-xs font-bold rounded-full min-w-[1.25rem] text-center',
          active
            ? 'bg-arena-card text-text-primary'
            : 'bg-error text-white'
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
});

NavItem.displayName = 'NavItem';

/**
 * NavGroup - Group of navigation items with optional label
 */
export const NavGroup = ({
  label,
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {label && (
        <div className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3 px-3">
          {label}
        </div>
      )}
      {children}
    </div>
  );
};

NavGroup.displayName = 'NavGroup';

/**
 * NavDivider - Visual separator between nav items
 */
export const NavDivider = ({ className }) => {
  return (
    <div className={cn('my-4 border-t border-arena-border', className)} />
  );
};

NavDivider.displayName = 'NavDivider';

export default NavItem;
