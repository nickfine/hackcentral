/**
 * StatCard - KPI/metric display with icon, value, label, optional description/trend.
 * Matches design system: rounded-xl card, hover lift, icon bg-primary/10.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    label?: string;
  };
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  description,
  trend,
  className = '',
}: StatCardProps) {
  const trendIcon =
    trend?.direction === 'up' ? (
      <TrendingUp className="h-4 w-4" />
    ) : trend?.direction === 'down' ? (
      <TrendingDown className="h-4 w-4" />
    ) : (
      <Minus className="h-4 w-4" />
    );

  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600'
      : trend?.direction === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground';

  return (
    <div
      className={`rounded-xl border border-border bg-card shadow-sm p-5 md:p-6 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        {trend != null && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
            {trendIcon}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-4">
        <div>
          <div className="text-2xl md:text-3xl font-bold metric-number tabular-nums">
            {value}
          </div>
          <div className="text-sm uppercase tracking-wide text-muted-foreground mt-1">{label}</div>
        {description != null && description !== '' && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            {description}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
