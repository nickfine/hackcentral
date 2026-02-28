/**
 * LiveActivityFeed Component
 * Activity feed with distinct icons, relative timestamps, and animations
 */

import { memo, useMemo } from 'react';
import { 
  UserPlus, 
  Lightbulb, 
  Upload, 
  Vote, 
  MessageSquare,
  Award,
  Users,
  LogIn
} from 'lucide-react';
import { cn } from '../../lib/design-system';

const ACTIVITY_CONFIG = {
  join: {
    icon: UserPlus,
    label: 'joined',
    color: 'var(--status-success)',
    bgColor: 'var(--status-success-subtle)',
  },
  create: {
    icon: Lightbulb,
    label: 'created',
    color: 'var(--status-info)',
    bgColor: 'var(--status-info-subtle)',
  },
  submit: {
    icon: Upload,
    label: 'submitted',
    color: 'var(--accent-brand)',
    bgColor: 'var(--accent-brand-subtle)',
  },
  vote: {
    icon: Vote,
    label: 'voted for',
    color: 'var(--status-warning)',
    bgColor: 'var(--status-warning-subtle)',
  },
  comment: {
    icon: MessageSquare,
    label: 'commented on',
    color: 'var(--text-secondary)',
    bgColor: 'var(--surface-secondary)',
  },
  award: {
    icon: Award,
    label: 'won',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
  team_full: {
    icon: Users,
    label: 'team is now full:',
    color: 'var(--status-success)',
    bgColor: 'var(--status-success-subtle)',
  },
  login: {
    icon: LogIn,
    label: 'logged in',
    color: 'var(--text-secondary)',
    bgColor: 'var(--surface-secondary)',
  },
};

const ACTIVITY_BORDER = {
  join: 'border-l-2 border-l-emerald-500/30',
  create: 'border-l-2 border-l-blue-500/30',
  submit: 'border-l-2 border-l-amber-500/30',
  vote: 'border-l-2 border-l-purple-500/30',
  comment: 'border-l-2 border-l-slate-500/30',
  award: 'border-l-2 border-l-yellow-500/30',
  team_full: 'border-l-2 border-l-emerald-500/30',
  login: 'border-l-2 border-l-slate-500/30',
  default: 'border-l-2 border-l-[var(--border-default)]',
};

const formatRelativeTime = (timeInput) => {
  if (!timeInput) return 'recently';
  
  if (typeof timeInput === 'string' && timeInput.includes('ago')) {
    return timeInput;
  }
  
  try {
    const now = new Date();
    const time = new Date(timeInput);
    
    if (isNaN(time.getTime())) {
      return timeInput || 'recently';
    }
    
    const diffMs = now - time;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffSecs < 30) return 'just now';
    if (diffMins < 1) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString(undefined, {
      month: 'short', 
      day: 'numeric' 
    });
  } catch (err) {
    console.error('Error formatting time:', err);
    return 'recently';
  }
};

const getAbsoluteTime = (timeInput) => {
  if (!timeInput) return '';
  
  try {
    const time = new Date(timeInput);
    if (isNaN(time.getTime())) return '';
    
    return time.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

export const LivePulse = memo(function LivePulse({ className }) {
  return (
    <span 
      className={cn(
        'relative inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider',
        className
      )}
      style={{ color: 'var(--text-secondary)' }}
    >
      <span className="relative flex h-2 w-2">
        <span 
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: 'var(--status-success)' }}
        />
        <span 
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: 'var(--status-success)' }}
        />
      </span>
      Live
    </span>
  );
});

const ActivityItem = memo(function ActivityItem({ 
  activity, 
  isNew = false,
  showIcon = true,
}) {
  const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.join;
  const Icon = config.icon;
  const relativeTime = formatRelativeTime(activity.time);
  const absoluteTime = getAbsoluteTime(activity.time);
  
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;
  
  return (
    <div 
      className={cn(
        'group flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 glass-item glass-item-hover',
        ACTIVITY_BORDER[activity.type] || ACTIVITY_BORDER.default,
        isNew && !prefersReducedMotion && 'activity-item-enter'
      )}
    >
      {showIcon && (
        <div className="glass-icon-orb flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-shadow duration-200">
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">
          <span 
            className="font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {activity.user}
          </span>
          
          <span style={{ color: 'var(--text-secondary)' }}>
            {' '}{config.label}{' '}
          </span>
          
          {activity.team && (
            <span 
              className="font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {activity.team}
            </span>
          )}
          {activity.project && (
            <span 
              className="font-medium italic"
              style={{ color: 'var(--text-primary)' }}
            >
              "{activity.project}"
            </span>
          )}
        </p>
        
        <p 
          className="text-xs mt-1 font-medium"
          style={{ color: 'var(--text-disabled)' }}
          title={absoluteTime}
        >
          {relativeTime}
        </p>
      </div>
    </div>
  );
});

const LiveActivityFeed = memo(function LiveActivityFeed({
  activities = [],
  maxItems = 5,
  showHeader = true,
  className,
  emptyMessage = 'No activity yet',
}) {
  const displayedActivities = useMemo(() => 
    activities.slice(0, maxItems),
    [activities, maxItems]
  );
  
  return (
    <div className={cn('', className)}>
      {showHeader && (
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Live Activity
          </h3>
          <LivePulse />
        </div>
      )}
      
      <div 
        className="space-y-2.5 max-h-96 overflow-y-auto rounded-xl"
        role="log"
        aria-live="polite"
        aria-label="Live activity feed"
      >
        {displayedActivities.length > 0 ? (
          displayedActivities.map((activity, index) => (
            <ActivityItem 
              key={activity.id || index}
              activity={activity}
              isNew={index === 0}
            />
          ))
        ) : (
          <div 
            className="py-8 text-center text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
});

export default LiveActivityFeed;
