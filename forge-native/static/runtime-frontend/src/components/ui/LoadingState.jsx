/**
 * LoadingState Component
 * Consistent loading indicator for pages and sections.
 * Ported from HD26AI for feature parity.
 * 
 * @example
 * // Full page loading
 * <LoadingState message="Loading dashboard..." />
 * 
 * // Section loading
 * <LoadingState variant="section" message="Loading teams..." />
 * 
 * // Inline loading
 * <LoadingState variant="inline" />
 */

import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/design-system';

const LoadingState = memo(function LoadingState({
  variant = 'page', // 'page' | 'section' | 'inline' | 'overlay'
  message = 'Loading...',
  showMessage = true,
  size = 'md',
  className,
}) {
  const sizeConfig = {
    sm: { icon: 'w-4 h-4', text: 'text-xs' },
    md: { icon: 'w-6 h-6', text: 'text-sm' },
    lg: { icon: 'w-8 h-8', text: 'text-base' },
    xl: { icon: 'w-12 h-12', text: 'text-lg' },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Inline variant - just spinner
  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <Loader2 className={cn(config.icon, 'animate-spin text-brand')} />
        {showMessage && (
          <span className={cn(config.text, 'text-text-secondary')}>{message}</span>
        )}
      </span>
    );
  }

  // Section variant - centered in a section
  if (variant === 'section') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-12',
        className
      )}>
        <Loader2 className={cn(config.icon, 'animate-spin text-brand mb-3')} />
        {showMessage && (
          <p className={cn(config.text, 'text-text-secondary')}>{message}</p>
        )}
      </div>
    );
  }

  // Overlay variant - covers parent with semi-transparent backdrop
  if (variant === 'overlay') {
    return (
      <div className={cn(
        'absolute inset-0 flex flex-col items-center justify-center',
        'bg-arena-bg/80 backdrop-blur-sm z-10',
        className
      )}>
        <Loader2 className={cn(config.icon, 'animate-spin text-brand mb-3')} />
        {showMessage && (
          <p className={cn(config.text, 'text-text-secondary')}>{message}</p>
        )}
      </div>
    );
  }

  // Page variant (default) - full page centered
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px]',
      className
    )}>
      <div className="relative">
        {/* Animated ring */}
        <div className="absolute inset-0 rounded-full border-2 border-brand/20 animate-ping" 
             style={{ animationDuration: '1.5s' }} />
        
        {/* Spinner */}
        <div className="relative p-4 rounded-full bg-arena-card border border-arena-border">
          <Loader2 className={cn('w-8 h-8 animate-spin text-brand')} />
        </div>
      </div>
      
      {showMessage && (
        <p className="mt-4 text-text-secondary text-sm">{message}</p>
      )}
    </div>
  );
});

/**
 * LoadingOverlay - Loading state that overlays content
 */
export const LoadingOverlay = memo(function LoadingOverlay({
  isLoading,
  children,
  message = 'Loading...',
  className,
}) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <LoadingState variant="overlay" message={message} />
      )}
    </div>
  );
});

/**
 * LoadingButton - Button with loading state
 */
export const LoadingButton = memo(function LoadingButton({
  isLoading,
  loadingText = 'Loading...',
  children,
  disabled,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'transition-all duration-200',
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : children}
    </button>
  );
});

export default LoadingState;
