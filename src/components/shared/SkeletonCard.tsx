/**
 * SkeletonCard - Loading state placeholder with pulse animation.
 * Matches design system: rounded-xl card, animate-pulse.
 */

import { cn } from '@/lib/utils';

export interface SkeletonCardProps {
  variant?: 'default' | 'compact' | 'wide' | 'stat';
  className?: string;
}

export function SkeletonCard({
  variant = 'default',
  className = '',
}: SkeletonCardProps) {
  if (variant === 'stat') {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-card p-5 md:p-6 animate-pulse',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="h-4 w-4 rounded bg-muted" />
        </div>
        <div className="mt-3">
          <div className="h-8 w-20 bg-muted rounded mb-2" />
          <div className="h-4 w-24 bg-muted rounded mb-1" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-card p-4 animate-pulse',
          className
        )}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-full bg-muted" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-muted rounded-full" />
          <div className="h-5 w-14 bg-muted rounded-full" />
        </div>
      </div>
    );
  }

  if (variant === 'wide') {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-card p-6 animate-pulse',
          className
        )}
      >
        <div className="flex items-start gap-6">
          <div className="size-24 rounded-full bg-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-6 w-48 bg-muted rounded mb-2" />
            <div className="h-4 w-64 bg-muted rounded mb-4" />
            <div className="h-9 w-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 md:p-6 animate-pulse',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded bg-muted shrink-0" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
      <div className="h-4 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-3/4 bg-muted rounded mb-4" />
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}
