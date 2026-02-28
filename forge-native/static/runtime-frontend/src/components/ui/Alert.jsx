/**
 * Alert Component
 * Display important messages, notifications, and feedback.
 */

import { forwardRef, useState } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { cn } from '../../lib/design-system';

const VARIANT_STYLES = {
  info: {
    container: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    icon: 'text-cyan-400',
    title: 'text-cyan-400',
    Icon: Info,
  },
  success: {
    container: 'bg-success/10 border-success/30 text-success',
    icon: 'text-success',
    title: 'text-success',
    Icon: CheckCircle,
  },
  warning: {
    container: 'bg-warning/10 border-warning/30 text-warning',
    icon: 'text-warning',
    title: 'text-warning',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-error/10 border-error/30 text-error',
    icon: 'text-error',
    title: 'text-error',
    Icon: AlertCircle,
  },
};

const Alert = forwardRef(({
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  showIcon = true,
  icon,
  action,
  className,
  children,
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = useState(true);
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const IconComponent = styles.Icon;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex gap-3 p-4 border-2 rounded-card',
        styles.container,
        className
      )}
      {...props}
    >
      {/* Icon */}
      {showIcon && (
        <div className="flex-shrink-0">
          {icon || <IconComponent className={cn('w-5 h-5', styles.icon)} />}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-bold mb-1', styles.title)}>
            {title}
          </h4>
        )}
        <div className="text-sm">
          {children}
        </div>
        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 -m-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

Alert.displayName = 'Alert';

/**
 * InlineAlert - Compact alert for inline messages
 */
export const InlineAlert = forwardRef(({
  variant = 'info',
  showIcon = true,
  className,
  children,
  ...props
}, ref) => {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const IconComponent = styles.Icon;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex items-center gap-2 text-sm',
        variant === 'error' && 'text-error',
        variant === 'warning' && 'text-warning',
        variant === 'success' && 'text-success',
        variant === 'info' && 'text-text-secondary',
        className
      )}
      {...props}
    >
      {showIcon && (
        <IconComponent className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
});

InlineAlert.displayName = 'InlineAlert';

/**
 * Toast - Brief notification message
 */
export const Toast = forwardRef(({
  variant = 'info',
  title,
  message,
  dismissible = true,
  onDismiss,
  className,
  ...props
}, ref) => {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const IconComponent = styles.Icon;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 bg-arena-elevated border-2 border-arena-border shadow-lg rounded-card min-w-[300px] max-w-md',
        'animate-slide-up',
        className
      )}
      {...props}
    >
      <IconComponent className={cn('w-5 h-5 flex-shrink-0', styles.icon)} />
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-bold text-text-primary mb-0.5">
            {title}
          </h4>
        )}
        {message && (
          <p className="text-sm text-text-secondary">
            {message}
          </p>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-1 -m-1 rounded hover:bg-arena-card transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  );
});

Toast.displayName = 'Toast';

/**
 * Banner - Full-width alert banner
 */
export const Banner = forwardRef(({
  variant = 'info',
  dismissible = false,
  onDismiss,
  className,
  children,
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = useState(true);
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const IconComponent = styles.Icon;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex items-center justify-center gap-3 px-4 py-3 text-sm',
        styles.container,
        className
      )}
      {...props}
    >
      <IconComponent className={cn('w-4 h-4 flex-shrink-0', styles.icon)} />
      <span>{children}</span>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 -m-1 rounded hover:bg-white/10 transition-colors ml-auto"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

Banner.displayName = 'Banner';

export default Alert;
