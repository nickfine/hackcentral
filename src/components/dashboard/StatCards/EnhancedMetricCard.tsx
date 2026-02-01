import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { AnimatedCounter } from './AnimatedCounter';
import { MicroStoryTooltip } from './MicroStoryTooltip';
import { WeeklyActiveSparkline } from '../DataViz/WeeklyActiveSparkline';

interface EnhancedMetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  microStory?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    label: string;
  };
  sparklineData?: number[];
}

export function EnhancedMetricCard({
  title,
  value,
  description,
  icon,
  microStory,
  trend,
  sparklineData,
}: EnhancedMetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card group relative overflow-hidden p-6 transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5"
      onMouseEnter={() => microStory && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          <div className="text-primary/70 transition-colors group-hover:text-primary">
            {icon}
          </div>
        </div>

        <div className="flex items-end gap-3">
          <AnimatedCounter value={value} className="text-3xl font-bold metric-number" />

          {trend && (
            <div
              className={`mb-1 flex items-center gap-1 text-sm font-medium ${
                trend.direction === 'up'
                  ? 'text-emerald-600'
                  : trend.direction === 'down'
                    ? 'text-red-600'
                    : 'text-muted-foreground'
              }`}
            >
              {trend.direction === 'up'
                ? '↑'
                : trend.direction === 'down'
                  ? '↓'
                  : '→'}
              {trend.value}%
            </div>
          )}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>

        {sparklineData != null && sparklineData.length > 0 && (
          <div className="h-8">
            <WeeklyActiveSparkline data={sparklineData} />
          </div>
        )}

        {microStory && (
          <div className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
        )}
      </div>

      <AnimatePresence>
        {microStory && showTooltip && (
          <MicroStoryTooltip content={microStory} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
