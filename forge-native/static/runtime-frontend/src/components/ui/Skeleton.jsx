/**
 * Skeleton Component
 * Animated placeholder for loading states.
 */

import { memo } from 'react';
import { cn } from '../../lib/design-system';

// Base skeleton animation class
const baseClass = 'animate-pulse bg-arena-elevated rounded';

/**
 * Base Skeleton - simple animated placeholder
 */
export const Skeleton = memo(function Skeleton({ 
  className,
  ...props 
}) {
  return (
    <div 
      className={cn(baseClass, className)} 
      {...props} 
    />
  );
});

/**
 * SkeletonText - multi-line text placeholder
 */
export const SkeletonText = memo(function SkeletonText({ 
  lines = 3,
  className,
  lastLineWidth = '60%',
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4" 
          style={{ 
            width: i === lines - 1 ? lastLineWidth : '100%' 
          }} 
        />
      ))}
    </div>
  );
});

/**
 * SkeletonAvatar - circular avatar placeholder
 */
export const SkeletonAvatar = memo(function SkeletonAvatar({ 
  size = 'md',
  className,
}) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton 
      className={cn(
        'rounded-full',
        sizeClasses[size] || sizeClasses.md,
        className
      )} 
    />
  );
});

/**
 * SkeletonCard - card-shaped placeholder
 */
export const SkeletonCard = memo(function SkeletonCard({ 
  className,
  hasHeader = true,
  hasFooter = false,
}) {
  return (
    <div className={cn(
      'bg-arena-card border border-arena-border rounded-card p-4',
      className
    )}>
      {hasHeader && (
        <div className="flex items-center gap-3 mb-4">
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      )}
      <SkeletonText lines={2} className="mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      {hasFooter && (
        <div className="mt-4 pt-4 border-t border-arena-border">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      )}
    </div>
  );
});

/**
 * SkeletonStatCard - stat card placeholder
 */
export const SkeletonStatCard = memo(function SkeletonStatCard({ 
  className,
}) {
  return (
    <div className={cn(
      'bg-arena-card border border-arena-border rounded-card p-4 text-center',
      className
    )}>
      <Skeleton className="h-3 w-16 mx-auto mb-2" />
      <Skeleton className="h-8 w-12 mx-auto" />
    </div>
  );
});

/**
 * SkeletonTable - table placeholder with rows
 */
export const SkeletonTable = memo(function SkeletonTable({ 
  rows = 5,
  columns = 4,
  className,
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-arena-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                'h-4 flex-1',
                colIndex === 0 && 'max-w-[200px]'
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
});

/**
 * SkeletonList - list items placeholder
 */
export const SkeletonList = memo(function SkeletonList({ 
  items = 3,
  hasAvatar = true,
  className,
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-arena-elevated rounded-lg">
          {hasAvatar && <SkeletonAvatar size="sm" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * DashboardSkeleton - full dashboard loading state
 */
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard hasHeader hasFooter />
        <SkeletonCard hasHeader hasFooter />
      </div>

      {/* Activity Feed */}
      <div className="bg-arena-card border border-arena-border rounded-card p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <SkeletonList items={4} />
      </div>
    </div>
  );
});

/**
 * MarketplaceSkeleton - marketplace/ideas loading state
 */
export const MarketplaceSkeleton = memo(function MarketplaceSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-32 mx-auto rounded-full" />
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <Skeleton className="h-12 w-full max-w-md mx-auto rounded-xl" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 justify-center">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard hasHeader hasFooter />
        <SkeletonCard hasHeader hasFooter />
        <SkeletonCard hasHeader hasFooter />
        <SkeletonCard hasHeader hasFooter />
      </div>
    </div>
  );
});

/**
 * ProfileSkeleton - profile page loading state
 */
export const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-arena-card border border-arena-border rounded-card p-6">
        <div className="flex items-start gap-4">
          <SkeletonAvatar size="xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-arena-card border border-arena-border rounded-card p-6">
        <Skeleton className="h-5 w-24 mb-4" />
        <SkeletonCard hasHeader />
      </div>

      {/* Skills Section */}
      <div className="bg-arena-card border border-arena-border rounded-card p-6">
        <Skeleton className="h-5 w-20 mb-4" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
});

export default Skeleton;
