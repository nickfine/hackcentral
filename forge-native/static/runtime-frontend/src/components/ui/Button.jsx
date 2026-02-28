/**
 * Button Component
 * A versatile button with multiple variants and sizes
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn, SIZE_CLASSES, BUTTON_VARIANTS } from '../../lib/design-system';

const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  ...props
}, ref) => {
  const variantStyles = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeStyles = SIZE_CLASSES.button[size] || SIZE_CLASSES.button.md;
  const iconSize = SIZE_CLASSES.icon[size] || SIZE_CLASSES.icon.md;

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-bold transition-all duration-200',
        'focus-ring-control',
        'rounded-card',
        sizeStyles,
        variantStyles.base,
        !isDisabled && variantStyles.hover,
        !isDisabled && variantStyles.active,
        variantStyles.focus,
        isDisabled && 'opacity-50 cursor-not-allowed',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2 
          className={cn(iconSize, 'animate-spin', children && 'mr-2')} 
          aria-hidden="true"
        />
      )}
      
      {!loading && leftIcon && (
        <span className={cn(iconSize, 'flex-shrink-0')} aria-hidden="true">
          {leftIcon}
        </span>
      )}
      
      {children && <span>{children}</span>}
      
      {!loading && rightIcon && (
        <span className={cn(iconSize, 'flex-shrink-0')} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export const IconButton = forwardRef(({
  variant = 'ghost',
  size = 'md',
  icon,
  label,
  loading = false,
  disabled = false,
  className,
  ...props
}, ref) => {
  const variantStyles = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.ghost;
  const iconSize = SIZE_CLASSES.icon[size] || SIZE_CLASSES.icon.md;
  
  const sizeMap = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  };
  
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 rounded-card',
        'focus-ring-control',
        sizeMap[size],
        variantStyles.base,
        !isDisabled && variantStyles.hover,
        !isDisabled && variantStyles.active,
        variantStyles.focus,
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, 'animate-spin')} aria-hidden="true" />
      ) : (
        <span className={iconSize} aria-hidden="true">{icon}</span>
      )}
    </button>
  );
});

IconButton.displayName = 'IconButton';

export const ButtonGroup = ({ children, className, ...props }) => (
  <div className={cn('inline-flex', className)} role="group" {...props}>
    {children}
  </div>
);

ButtonGroup.displayName = 'ButtonGroup';

export default Button;
