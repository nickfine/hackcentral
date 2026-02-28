/**
 * StatCard Component
 * Stat cards with count-up animation and Figma-style design
 */

import { useState, useEffect, useRef, memo } from 'react';
import { cn } from '../../lib/design-system';

const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

const useCountUp = (end, duration = 800, enabled = true) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);
  
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  useEffect(() => {
    if (!enabled || hasAnimated) return;
    
    if (prefersReducedMotion) {
      setCount(end);
      setHasAnimated(true);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            
            const startTime = performance.now();
            
            const animate = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easedProgress = easeOutQuart(progress);
              
              setCount(Math.floor(easedProgress * end));
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                setCount(end);
              }
            };
            
            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [end, duration, enabled, hasAnimated, prefersReducedMotion]);

  return { count, elementRef, hasAnimated };
};

const formatNumber = (num, format = 'default') => {
  if (format === 'compact') {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

const TrendIndicator = memo(function TrendIndicator({ value, label, showPercentage = true }) {
  if (value === undefined || value === null) return null;
  
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span 
        className={cn(
          'font-black text-base leading-none tabular-nums',
          isPositive && 'text-trend-up',
          isNegative && 'text-trend-down',
          !isPositive && !isNegative && 'text-[var(--text-secondary)]'
        )}
      >
        {isPositive ? '↑' : isNegative ? '↓' : '–'}
      </span>
      <span 
        className={cn(
          'font-black tabular-nums tracking-tight',
          isPositive && 'text-trend-up',
          isNegative && 'text-trend-down',
          !isPositive && !isNegative && 'text-[var(--text-secondary)]'
        )}
      >
        {showPercentage ? `${Math.abs(value)}%` : Math.abs(value)}
      </span>
      {label && (
        <span className="text-[var(--text-disabled)] font-semibold">{label}</span>
      )}
    </div>
  );
});

const StatCard = memo(function StatCard({
  value,
  label,
  icon: Icon,
  trend,
  trendLabel,
  format = 'default',
  className,
  accentColor = 'brand',
}) {
  const { count, elementRef, hasAnimated } = useCountUp(value);
  
  const accentStyles = {
    brand: {
      iconBg: 'bg-[var(--accent-brand-subtle)]',
      iconColor: 'text-[var(--accent-brand)]',
    },
    success: {
      iconBg: 'bg-[var(--status-success-subtle)]',
      iconColor: 'text-[var(--status-success)]',
    },
    warning: {
      iconBg: 'bg-[var(--status-warning-subtle)]',
      iconColor: 'text-[var(--status-warning)]',
    },
    info: {
      iconBg: 'bg-[var(--status-info-subtle)]',
      iconColor: 'text-[var(--status-info)]',
    },
  };
  
  const accent = accentStyles[accentColor] || accentStyles.brand;

  return (
    <div
      ref={elementRef}
      className={cn(
        'relative p-6 sm:p-7 transition-all duration-200 glass-panel glass-panel-hover',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p 
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </p>
          
          <div className="flex items-baseline gap-2">
            <span 
              className={cn(
                'text-3xl font-bold tabular-nums tracking-tight transition-opacity duration-300',
                hasAnimated ? 'opacity-100' : 'opacity-0'
              )}
              style={{ color: 'var(--text-primary)' }}
            >
              {formatNumber(count, format)}
            </span>
            
            {trend !== undefined && (
              <TrendIndicator value={trend} label={trendLabel} />
            )}
          </div>
        </div>
        
        {Icon && (
          <div className={cn('flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', accent.iconBg)}>
            <Icon className={cn('w-6 h-6', accent.iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
});

export const StatCardGroup = memo(function StatCardGroup({ children, className }) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-4', className)}>
      {children}
    </div>
  );
});

export const FigmaMetricsCard = memo(function FigmaMetricsCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel = 'from last event',
  icon: Icon,
  iconBgClass = 'bg-cyan-accent',
  className,
}) {
  const { count, elementRef, hasAnimated } = useCountUp(value, 800);

  return (
    <div
      ref={elementRef}
      className={cn(
        'relative p-6 sm:p-7 transition-all duration-200 glass-panel glass-panel-hover',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--text-secondary)]">
            {title}
          </p>
          
          <p 
            className={cn(
              'text-4xl font-bold tabular-nums mb-1 transition-opacity duration-300',
              hasAnimated ? 'opacity-100' : 'opacity-0'
            )}
            style={{ color: 'var(--text-primary)' }}
          >
            {formatNumber(count)}
          </p>
          
          <p className="text-sm text-[var(--text-secondary)] mb-3 font-medium">
            {subtitle}
          </p>
          
          {trend !== undefined && (
            <TrendIndicator value={trend} label={trendLabel} />
          )}
        </div>
        
        {Icon && (
          <div className={cn('flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', iconBgClass)}>
            <Icon className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
          </div>
        )}
      </div>
    </div>
  );
});

export const HeroStatCard = memo(function HeroStatCard({
  value,
  label,
  className,
  isUrgent = false,
}) {
  const { count, elementRef, hasAnimated } = useCountUp(
    typeof value === 'number' ? value : 0,
    1200
  );
  
  const displayValue = typeof value === 'string' ? value : formatNumber(count);

  return (
    <div
      ref={elementRef}
      className={cn(
        'relative p-8 rounded-2xl transition-all duration-300',
        'bg-[var(--surface-primary)] border-2 border-t-2 border-t-brand',
        isUrgent 
          ? 'border-[var(--accent-brand)] shadow-lg shadow-[var(--accent-brand)]/10' 
          : 'border-[var(--border-default)]',
        'hover:shadow-xl',
        className
      )}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div 
          className={cn(
            'text-5xl sm:text-6xl font-black font-mono tracking-tight transition-opacity duration-500',
            hasAnimated || typeof value === 'string' ? 'opacity-100' : 'opacity-0',
            isUrgent ? 'text-[var(--accent-brand)]' : 'text-[var(--text-primary)]'
          )}
        >
          {displayValue}
        </div>
        
        <p 
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </p>
      </div>
    </div>
  );
});

export const MiniStatCard = memo(function MiniStatCard({
  value,
  label,
  className,
}) {
  const { count, elementRef, hasAnimated } = useCountUp(value, 600);

  return (
    <div
      ref={elementRef}
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200',
        'bg-[var(--surface-secondary)] border border-[var(--border-subtle)]',
        'hover:bg-[var(--surface-primary)] hover:border-brand/30',
        className
      )}
    >
      <span 
        className={cn(
          'text-2xl font-bold font-mono tabular-nums transition-opacity duration-300',
          hasAnimated ? 'opacity-100' : 'opacity-0'
        )}
        style={{ color: 'var(--text-primary)' }}
      >
        {formatNumber(count)}
      </span>
      
      <span 
        className="text-xs font-medium uppercase tracking-wider mt-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
    </div>
  );
});

export default StatCard;
