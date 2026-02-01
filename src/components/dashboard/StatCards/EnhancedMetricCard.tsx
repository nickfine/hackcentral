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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="card group relative overflow-hidden p-6"
      onMouseEnter={() => microStory && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div className="text-primary/70 transition-colors group-hover:text-primary">
            {icon}
          </div>
        </div>

        <div className="mb-2 flex items-end gap-3">
          <AnimatedCounter value={value} className="text-4xl font-bold metric-number" />

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
          <div className="mt-3 h-8">
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
