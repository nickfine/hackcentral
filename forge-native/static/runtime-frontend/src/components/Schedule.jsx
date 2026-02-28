/**
 * Schedule Page
 * Event timeline and schedule with timezone support
 */

import { useMemo, useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import {
  Calendar,
  Clock,
  MapPin,
  Code,
  Trophy,
  Mic,
  Flag,
  Moon,
  Sun,
  Sparkles,
  Users,
  Globe,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, Badge } from './ui';
import { BackButton } from './shared';
import {
  formatUKDateTimeToLocal,
  getUserLocale,
  getUserTimezone,
  getTimezoneAbbr,
  EVENT_TIMEZONE
} from '../data/constants';

// ============================================================================
// SCHEDULE DATA
// ============================================================================

const SCHEDULE_DATA = {
  preEvent: {
    rangeStart: '2026-06-01',
    rangeEnd: '2026-06-20',
    label: 'Pre-Event',
    events: [
      { date: '2026-06-01', title: 'Registration Opens', icon: Flag, category: 'logistics' },
      { date: '2026-06-10', title: 'Teams Webinar', icon: Mic, category: 'social' },
      { date: '2026-06-15', title: 'Social Matching Event', icon: Users, category: 'social' },
      { date: '2026-06-20', title: 'Registration Closes', icon: Clock, category: 'deadline' },
    ],
  },
  day1: {
    ukDate: '2026-06-21',
    label: 'Day 1 - Hack Day',
    events: [
      { ukTime: '09:00', title: 'Opening Ceremony', icon: Flag, category: 'ceremony' },
      { ukTime: '09:30', title: 'Hacking Begins!', icon: Code, category: 'hacking' },
      { ukTime: '12:00', title: 'Lunch Break', icon: Clock, category: 'logistics' },
      { ukTime: '15:00', title: 'Afternoon Check-in', icon: Mic, category: 'social' },
      { ukTime: '18:00', title: 'Dinner Break', icon: Clock, category: 'logistics' },
      { ukTime: '21:00', title: 'Night Owl Hangout', icon: Moon, category: 'social' },
    ],
  },
  day2: {
    ukDate: '2026-06-22',
    label: 'Day 2 - Submissions Day',
    events: [
      { ukTime: '08:00', title: 'Morning Kickoff', icon: Sun, category: 'ceremony' },
      { ukTime: '10:00', title: 'Code Freeze & Submissions Due', icon: Flag, category: 'deadline' },
      { ukTime: '11:00', title: 'Project Gallery Opens', icon: Trophy, category: 'ceremony' },
      { ukTime: '13:00', title: 'Presentations Begin', icon: Mic, category: 'presentation' },
      { ukTime: '15:00', title: 'Judging Period', icon: Trophy, category: 'judging' },
      { ukTime: '16:00', title: 'Awards Ceremony', icon: Trophy, category: 'ceremony' },
      { ukTime: '17:00', title: 'Closing Celebration', icon: Sparkles, category: 'ceremony' },
    ],
  },
};

const CATEGORY_STYLES = {
  ceremony: { bg: 'bg-brand/10', text: 'text-[var(--text-orange-primary)]', border: 'border-brand/30' },
  hacking: { bg: 'bg-[var(--color-cyan-accent-bg)]', text: 'text-[var(--text-cyan-primary)]', border: 'border-[var(--border-cyan-subtle)]' },
  social: { bg: 'bg-[var(--color-purple-accent-bg)]', text: 'text-[var(--text-purple-primary)]', border: 'border-purple-500/30' },
  deadline: { bg: 'bg-error/10', text: 'text-[var(--status-danger-text)]', border: 'border-error/30' },
  presentation: { bg: 'bg-[var(--status-warning-subtle)]', text: 'text-[var(--status-warning-text)]', border: 'border-amber-500/30' },
  judging: { bg: 'bg-[var(--status-success-subtle)]', text: 'text-[var(--status-success-text)]', border: 'border-success/30' },
  logistics: { bg: 'bg-arena-elevated', text: 'text-text-secondary', border: 'border-arena-border' },
};

// Exact signal palette parity with HackCentral Schedule Builder V2 for custom events.
const SIGNAL_COLORS = {
  start: {
    bg: '#f0fdfa',
    border: 'rgba(20, 184, 166, 0.21)',
    accent: '#14b8a6',
    text: '#0d9488',
    iconBg: '#ccfbf1',
  },
  deadline: {
    bg: '#fef2f2',
    border: 'rgba(239, 68, 68, 0.15)',
    accent: '#ef4444',
    text: '#dc2626',
    iconBg: 'rgba(239, 68, 68, 0.1)',
  },
  ceremony: {
    bg: '#fff7ed',
    border: 'rgba(249, 115, 22, 0.12)',
    accent: '#f97316',
    text: '#c2410c',
    iconBg: 'rgba(249, 115, 22, 0.1)',
  },
  presentation: {
    bg: '#fdf2f8',
    border: 'rgba(236, 72, 153, 0.12)',
    accent: '#ec4899',
    text: '#be185d',
    iconBg: 'rgba(236, 72, 153, 0.1)',
  },
  judging: {
    bg: '#eff6ff',
    border: 'rgba(59, 130, 246, 0.12)',
    accent: '#3b82f6',
    text: '#1d4ed8',
    iconBg: 'rgba(59, 130, 246, 0.1)',
  },
  neutral: {
    bg: '#ffffff',
    border: '#e5e7eb',
    accent: '#9ca3af',
    text: '#374151',
    iconBg: '#f3f4f6',
  },
};

function getSignalColors(signal) {
  if (typeof signal !== 'string') return null;
  return SIGNAL_COLORS[signal] || null;
}

// ============================================================================
// COMPONENT
// ============================================================================

function Schedule({ onNavigate }) {
  const [milestones, setMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const userTimezone = getUserTimezone();
  const userLocale = getUserLocale();
  const tzAbbr = getTimezoneAbbr();

  // Fetch schedule milestones from backend
  useEffect(() => {
    let mounted = true;

    async function fetchSchedule() {
      try {
        const response = await invoke('getSchedule');
        if (mounted && response?.milestones) {
          setMilestones(response.milestones);
        }
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSchedule();

    return () => {
      mounted = false;
    };
  }, []);

  const localizedSchedule = useMemo(() => {
    const formatLocalDate = (dateStr, options) =>
      formatUKDateTimeToLocal(dateStr, '12:00', options, userTimezone, userLocale);
    const formatLocalTime = (dateStr, timeStr) =>
      formatUKDateTimeToLocal(
        dateStr,
        timeStr,
        { hour: '2-digit', minute: '2-digit', hour12: true },
        userTimezone,
        userLocale
      );

    // If milestones exist, use them instead of hardcoded SCHEDULE_DATA
    if (milestones && milestones.length > 0) {
      // Map phase to icon and category
      const phaseIconMap = {
        REGISTRATION: { icon: Flag, category: 'logistics' },
        TEAM_FORMATION: { icon: Users, category: 'social' },
        HACKING: { icon: Code, category: 'hacking' },
        SUBMISSION: { icon: Flag, category: 'deadline' },
        PRESENTATION: { icon: Mic, category: 'presentation' },
        JUDGING: { icon: Trophy, category: 'judging' },
        RESULTS: { icon: Sparkles, category: 'ceremony' },
        // Lowercase fallbacks
        signup: { icon: Flag, category: 'logistics' },
        team_formation: { icon: Users, category: 'social' },
        hacking: { icon: Code, category: 'hacking' },
        submission: { icon: Flag, category: 'deadline' },
        voting: { icon: Trophy, category: 'judging' },
        judging: { icon: Trophy, category: 'judging' },
        results: { icon: Sparkles, category: 'ceremony' },
      };

      // Pre-event phases that should be grouped together
      const PRE_EVENT_PHASES = ['REGISTRATION', 'TEAM_FORMATION', 'registration', 'team_formation', 'signup'];

      // Separate pre-event milestones from hack day milestones
      const preEventMilestones = [];
      const hackDayMilestones = [];

      milestones.forEach(milestone => {
        if (!milestone.startTime) return;
        const phase = milestone.phase || '';
        if (PRE_EVENT_PHASES.includes(phase)) {
          preEventMilestones.push(milestone);
        } else {
          hackDayMilestones.push(milestone);
        }
      });

      // Sort milestones by startTime
      const sortByTime = (a, b) => new Date(a.startTime) - new Date(b.startTime);
      preEventMilestones.sort(sortByTime);
      hackDayMilestones.sort(sortByTime);

      // Group hack day milestones by date
      const hackDaysByDate = hackDayMilestones.reduce((acc, milestone) => {
        const date = milestone.startTime.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(milestone);
        return acc;
      }, {});

      // Build columns
      const columns = {};

      // Add pre-event column if there are pre-event milestones
      if (preEventMilestones.length > 0) {
        const firstDate = preEventMilestones[0].startTime.split('T')[0];
        const lastDate = preEventMilestones[preEventMilestones.length - 1].startTime.split('T')[0];
        const dateRange = firstDate === lastDate
          ? formatLocalDate(firstDate, { month: 'short', day: 'numeric' })
          : `${formatLocalDate(firstDate, { month: 'short', day: 'numeric' })} - ${formatLocalDate(lastDate, { month: 'short', day: 'numeric' })}`;

        columns['preEvent'] = {
          label: 'Pre-Event',
          date: dateRange,
          events: preEventMilestones.map(milestone => {
            const phaseData = phaseIconMap[milestone.phase] || { icon: Calendar, category: 'logistics' };
            const dateTime = milestone.startTime.split('T');
            const date = dateTime[0];
            const timeStr = dateTime[1] ? dateTime[1].split('.')[0] : '00:00:00';

            return {
              title: milestone.title,
              time: formatLocalDate(date, { weekday: 'short', month: 'short', day: 'numeric' }),
              icon: phaseData.icon,
              category: phaseData.category,
              signal: milestone.signal || null,
              description: milestone.description,
            };
          }),
        };
      }

      // Add hack day columns
      const hackDayDates = Object.keys(hackDaysByDate).sort();
      hackDayDates.forEach((date, index) => {
        const dateMilestones = hackDaysByDate[date];
        const dayLabel = hackDayDates.length === 1 ? 'Hack Day' : `Day ${index + 1}`;
        const colKey = `day${index + 1}`;

        columns[colKey] = {
          label: dayLabel,
          date: formatLocalDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
          events: dateMilestones.map(milestone => {
            const phaseData = phaseIconMap[milestone.phase] || { icon: Calendar, category: 'logistics' };
            const dateTime = milestone.startTime.split('T');
            const timeStr = dateTime[1] ? dateTime[1].split('.')[0] : '00:00:00';

            return {
              title: milestone.title,
              time: formatLocalTime(date, timeStr),
              icon: phaseData.icon,
              category: phaseData.category,
              signal: milestone.signal || null,
              description: milestone.description,
            };
          }),
        };
      });

      return columns;
    }

    // Fallback to hardcoded SCHEDULE_DATA if no milestones
    return {
      preEvent: {
        ...SCHEDULE_DATA.preEvent,
        date: `${formatLocalDate(SCHEDULE_DATA.preEvent.rangeStart, { month: 'short', day: 'numeric' })} - ${formatLocalDate(SCHEDULE_DATA.preEvent.rangeEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`,
        events: SCHEDULE_DATA.preEvent.events.map((event) => ({
          ...event,
          time: formatLocalDate(event.date, { month: 'short', day: 'numeric' }),
        })),
      },
      day1: {
        ...SCHEDULE_DATA.day1,
        date: formatLocalDate(SCHEDULE_DATA.day1.ukDate, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        events: SCHEDULE_DATA.day1.events.map((event) => ({
          ...event,
          time: formatLocalTime(SCHEDULE_DATA.day1.ukDate, event.ukTime),
        })),
      },
      day2: {
        ...SCHEDULE_DATA.day2,
        date: formatLocalDate(SCHEDULE_DATA.day2.ukDate, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        events: SCHEDULE_DATA.day2.events.map((event) => ({
          ...event,
          time: formatLocalTime(SCHEDULE_DATA.day2.ukDate, event.ukTime),
        })),
      },
    };
  }, [milestones, userTimezone, userLocale]);

  const dayColumns = useMemo(() => {
    return Object.entries(localizedSchedule).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  }, [localizedSchedule]);

  const renderEventCard = (event, key) => {
    const Icon = event.icon || Calendar;
    const style = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.logistics;
    const signalColors = getSignalColors(event.signal);
    const hasSignalAccent = signalColors && event.signal !== 'neutral';
    const signalCardStyle = signalColors
      ? {
          backgroundColor: signalColors.bg,
          borderColor: signalColors.border,
          ...(hasSignalAccent ? { borderLeftWidth: '4px', borderLeftColor: signalColors.accent } : {}),
        }
      : undefined;
    const signalIconWrapStyle = signalColors ? { backgroundColor: signalColors.iconBg } : undefined;
    const signalIconStyle = signalColors ? { color: signalColors.text } : undefined;
    const signalTextStyle = signalColors ? { color: signalColors.text } : undefined;
    const signalBadgeStyle = signalColors
      ? {
          backgroundColor: signalColors.iconBg,
          borderColor: signalColors.border,
          color: signalColors.text,
        }
      : undefined;

    return (
      <div
        key={key}
        className={cn(
          'flex items-start gap-4 p-4 rounded-card border transition-all hover:-translate-y-0.5',
          !signalColors && style.bg,
          !signalColors && style.border
        )}
        style={signalCardStyle}
      >
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          !signalColors && 'bg-arena-card'
        )} style={signalIconWrapStyle}>
          <Icon className={cn('w-5 h-5', !signalColors && style.text)} style={signalIconStyle} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-sm font-mono', !signalColors && style.text)} style={signalTextStyle}>
              {event.time}
            </span>
            <Badge variant="default" size="xs" className="capitalize" style={signalBadgeStyle}>
              {event.category}
            </Badge>
          </div>
          <h4 className="font-bold text-text-primary">{event.title}</h4>
          {event.description && (
            <p className="text-sm text-text-secondary mt-1">{event.description}</p>
          )}
        </div>
      </div>
    );
  };

  const renderDaySection = (dayData, dayKey) => (
    <div className="space-y-3">
      {dayData.events.map((event, index) => renderEventCard(event, `${dayKey}-${index}`))}
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Event Schedule
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
            Schedule
          </h1>
          <p className="text-text-secondary max-w-2xl mb-2">
            Plan your key sessions, deadlines, and judging windows across the event.
          </p>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Globe className="w-4 h-4" />
            <span className="text-sm">
              Times shown in your local timezone ({tzAbbr})
              <span className="ml-1">
                • Event base timezone: {EVENT_TIMEZONE} (UK)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Schedule Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {dayColumns.map((day) => (
          <Card key={day.id} padding="md" className="h-full">
            <div className="mb-4 pb-3 border-b border-arena-border">
              <h2 className="text-xl font-bold text-text-primary">
                {day.label}
              </h2>
              <p className="text-sm text-text-secondary">
                {day.date}
              </p>
            </div>
            {renderDaySection(day, day.id)}
          </Card>
        ))}
      </div>

      {/* Legend */}
          <div className="mt-6 p-4 bg-arena-card border border-arena-border rounded-card">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
          Event Categories
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
            <Badge
              key={key}
              variant="default"
              size="sm"
              className={cn('capitalize', style.bg, style.text, style.border)}
            >
              {key}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Schedule;
