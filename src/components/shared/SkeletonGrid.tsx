/**
 * SkeletonGrid - Grid of skeleton cards for loading states.
 * Matches design system: responsive grid, gap-4 or gap-6.
 */

import { SkeletonCard } from './SkeletonCard';
import type { SkeletonCardProps } from './SkeletonCard';

export interface SkeletonGridProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  variant?: SkeletonCardProps['variant'];
  gap?: 4 | 6;
  className?: string;
}

const COLUMNS_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

export function SkeletonGrid({
  count = 6,
  columns = 3,
  variant = 'default',
  gap = 4,
  className = '',
}: SkeletonGridProps) {
  const gapClass = gap === 6 ? 'gap-6' : 'gap-4';
  const gridClass = COLUMNS_CLASS[columns];

  return (
    <div className={`grid ${gridClass} ${gapClass} ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}
