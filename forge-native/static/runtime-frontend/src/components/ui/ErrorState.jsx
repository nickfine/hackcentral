/**
 * ErrorState Component
 * Consistent error display with retry functionality.
 */

import { memo } from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, FileQuestion } from 'lucide-react';
import { cn } from '../../lib/design-system';
import Button from './Button';

const ErrorState = memo(function ErrorState({
  variant = 'default', // 'default' | 'network' | 'server' | 'notfound' | 'inline'
  title,
  message = 'Something went wrong',
  onRetry,
  retryText = 'Try Again',
  isRetrying = false,
  showIcon = true,
  className,
  children,
}) {
  // Variant configurations
  const variants = {
    default: {
      icon: AlertCircle,
      title: title || 'Error',
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    network: {
      icon: WifiOff,
      title: title || 'Connection Error',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    server: {
      icon: ServerCrash,
      title: title || 'Server Error',
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    notfound: {
      icon: FileQuestion,
      title: title || 'Not Found',
      color: 'text-text-secondary',
      bgColor: 'bg-arena-elevated',
    },
    inline: {
      icon: AlertCircle,
      title: null,
      color: 'text-error',
      bgColor: 'transparent',
    },
  };

  const config = variants[variant] || variants.default;
  const Icon = config.icon;

  // Inline variant - compact error display
  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm',
        className
      )}>
        {showIcon && <Icon className={cn('w-4 h-4', config.color)} />}
        <span className={config.color}>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="text-brand hover:text-brand/80 underline text-sm"
          >
            {isRetrying ? 'Retrying...' : retryText}
          </button>
        )}
      </div>
    );
  }

  // Standard error state
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {/* Icon */}
      {showIcon && (
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-4',
          config.bgColor
        )}>
          <Icon className={cn('w-8 h-8', config.color)} />
        </div>
      )}

      {/* Title */}
      {config.title && (
        <h3 className="text-lg font-bold text-text-primary mb-2">
          {config.title}
        </h3>
      )}

      {/* Message */}
      <p className="text-text-secondary text-sm max-w-md mb-6">
        {message}
      </p>

      {/* Custom content */}
      {children}

      {/* Retry button */}
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          disabled={isRetrying}
          leftIcon={<RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />}
        >
          {isRetrying ? 'Retrying...' : retryText}
        </Button>
      )}
    </div>
  );
});

/**
 * ErrorBanner - Dismissible error banner
 */
export const ErrorBanner = memo(function ErrorBanner({
  message,
  onDismiss,
  onRetry,
  className,
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-lg',
      'bg-error/10 border border-error/30',
      className
    )}>
      <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
      <p className="flex-1 text-sm text-text-primary">{message}</p>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-brand hover:text-brand/80"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * EmptyState - For when there's no data (not an error)
 */
export const EmptyState = memo(function EmptyState({
  icon: CustomIcon,
  emoji,
  title = 'No data',
  message = 'There\'s nothing here yet.',
  action,
  actionText = 'Get Started',
  secondaryAction,
  secondaryActionText,
  compact = false,
  className,
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 px-4' : 'py-12 px-4',
      className
    )}>
      {/* Icon or Emoji */}
      <div className={cn(
        'rounded-full bg-arena-elevated flex items-center justify-center mb-4',
        compact ? 'w-12 h-12' : 'w-16 h-16'
      )}>
        {emoji ? (
          <span className={compact ? 'text-2xl' : 'text-3xl'}>{emoji}</span>
        ) : CustomIcon ? (
          <CustomIcon className={cn(compact ? 'w-6 h-6' : 'w-8 h-8', 'text-text-muted')} />
        ) : (
          <FileQuestion className={cn(compact ? 'w-6 h-6' : 'w-8 h-8', 'text-text-muted')} />
        )}
      </div>

      {/* Title */}
      <h3 className={cn(
        'font-bold text-text-primary mb-2',
        compact ? 'text-base' : 'text-lg'
      )}>
        {title}
      </h3>

      {/* Message */}
      <p className={cn(
        'text-text-secondary max-w-md',
        compact ? 'text-xs mb-4' : 'text-sm mb-6'
      )}>
        {message}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button variant="primary" size={compact ? 'sm' : 'md'} onClick={action}>
              {actionText}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="secondary" size={compact ? 'sm' : 'md'} onClick={secondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default ErrorState;
