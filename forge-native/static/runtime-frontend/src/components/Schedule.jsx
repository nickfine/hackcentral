import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Code, Flag, Globe, Mic, Sparkles, Trophy, Users } from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, Badge, Button } from './ui';
import { BackButton } from './shared';
import { useConfigMode } from '../configMode/ConfigModeContext';
import { getUserLocale, getUserTimezone, getTimezoneAbbr, EVENT_TIMEZONE } from '../data/constants';
import { ScheduleBuilderV2 } from '../../../frontend/src/components/schedule-builder-v2';
import {
  EVENT_TO_OUTPUT_FIELD,
  getEventStateKey,
  initializeEventStates,
} from '../../../frontend/src/schedule-builder-v2/scheduleEvents';

const CATEGORY_STYLES = {
  ceremony: { bg: 'bg-brand/10', text: 'text-[var(--text-orange-primary)]', border: 'border-brand/30' },
  hacking: { bg: 'bg-[var(--color-cyan-accent-bg)]', text: 'text-[var(--text-cyan-primary)]', border: 'border-[var(--border-cyan-subtle)]' },
  social: { bg: 'bg-[var(--color-purple-accent-bg)]', text: 'text-[var(--text-purple-primary)]', border: 'border-purple-500/30' },
  deadline: { bg: 'bg-error/10', text: 'text-[var(--status-danger-text)]', border: 'border-error/30' },
  presentation: { bg: 'bg-[var(--status-warning-subtle)]', text: 'text-[var(--status-warning-text)]', border: 'border-amber-500/30' },
  judging: { bg: 'bg-[var(--status-success-subtle)]', text: 'text-[var(--status-success-text)]', border: 'border-success/30' },
  logistics: { bg: 'bg-arena-elevated', text: 'text-text-secondary', border: 'border-arena-border' },
};

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

const PRE_EVENT_FIELDS = {
  'registration-opens': 'registrationOpensAt',
  'registration-closes': 'registrationClosesAt',
  'team-formation': 'teamFormationStartsAt',
};

const FIRST_DAY_FIELDS = {
  opening: 'openingCeremonyAt',
  'hacking-begins': 'hackingStartsAt',
};

const LAST_DAY_FIELDS = {
  'code-freeze': 'submissionDeadlineAt',
  presentations: 'presentationsAt',
  judging: 'judgingStartsAt',
  results: 'resultsAnnounceAt',
};

const NON_EDITABLE_SCHEDULE_FIELDS = [
  'teamFormationEndsAt',
  'lunchBreakDay1At',
  'afternoonCheckinDay1At',
  'dinnerBreakDay1At',
  'eveningCheckinDay1At',
  'lunchBreakDay2At',
  'afternoonCheckinDay2At',
  'dinnerBreakDay2At',
  'eveningCheckinDay2At',
  'lunchBreakDay3At',
  'afternoonCheckinDay3At',
  'dinnerBreakDay3At',
  'votingStartsAt',
  'votingEndsAt',
];

function getSignalColors(signal) {
  if (typeof signal !== 'string') return null;
  return SIGNAL_COLORS[signal] || null;
}

function formatIsoDate(date) {
  return date.toISOString().split('T')[0];
}

function formatIsoTime(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '09:00'
    : `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

function isDevMode() {
  try {
    return window.parent === window || !document.referrer.includes('atlassian');
  } catch {
    return true;
  }
}

function diffInWholeDays(startDate, targetDate) {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function inferDuration(schedule) {
  const explicitDuration = Number(schedule?.duration);
  if (Number.isFinite(explicitDuration) && explicitDuration >= 1 && explicitDuration <= 3) {
    return explicitDuration;
  }

  const start = schedule?.hackingStartsAt ? new Date(schedule.hackingStartsAt) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return 2;
  }

  const candidates = [
    schedule?.resultsAnnounceAt,
    schedule?.votingEndsAt,
    schedule?.judgingStartsAt,
    schedule?.presentationsAt,
    schedule?.submissionDeadlineAt,
  ]
    .map((value) => (typeof value === 'string' ? new Date(value) : null))
    .filter((value) => value && !Number.isNaN(value.getTime()));

  if (candidates.length === 0) {
    return 2;
  }

  const furthest = candidates.reduce((max, current) => (current > max ? current : max), candidates[0]);
  const days = diffInWholeDays(start, furthest) + 1;
  return Math.max(1, Math.min(3, days));
}

function buildBuilderInitialState(schedule) {
  if (!schedule || typeof schedule !== 'object') {
    return undefined;
  }

  const anchorIso = typeof schedule.hackingStartsAt === 'string' ? schedule.hackingStartsAt : null;
  const anchorDate = anchorIso ? formatIsoDate(new Date(anchorIso)) : undefined;
  const duration = inferDuration(schedule);
  const eventStates = initializeEventStates(duration);

  Object.entries(PRE_EVENT_FIELDS).forEach(([eventId, field]) => {
    if (!schedule[field]) {
      if (eventStates[eventId]) {
        eventStates[eventId] = { ...eventStates[eventId], enabled: false };
      }
      return;
    }
    if (anchorDate && eventStates[eventId]) {
      eventStates[eventId] = {
        ...eventStates[eventId],
        enabled: true,
        offsetDays: diffInWholeDays(anchorDate, formatIsoDate(new Date(schedule[field]))),
      };
    }
  });

  Object.entries(FIRST_DAY_FIELDS).forEach(([eventId, field]) => {
    const stateKey = getEventStateKey('hack-0', eventId);
    if (!eventStates[stateKey]) return;
    if (!schedule[field]) {
      eventStates[stateKey] = { ...eventStates[stateKey], enabled: false };
      return;
    }
    eventStates[stateKey] = {
      ...eventStates[stateKey],
      enabled: true,
      time: formatIsoTime(schedule[field]),
    };
  });

  const lastPhaseKey = `hack-${Math.max(duration - 1, 0)}`;
  Object.entries(LAST_DAY_FIELDS).forEach(([eventId, field]) => {
    const stateKey = getEventStateKey(lastPhaseKey, eventId);
    if (!eventStates[stateKey]) return;
    if (!schedule[field]) {
      eventStates[stateKey] = { ...eventStates[stateKey], enabled: false };
      return;
    }
    eventStates[stateKey] = {
      ...eventStates[stateKey],
      enabled: true,
      time: formatIsoTime(schedule[field]),
    };
  });

  const customEvents = Array.isArray(schedule.customEvents)
    ? schedule.customEvents
        .map((event, index) => {
          const timestamp = typeof event?.timestamp === 'string' ? new Date(event.timestamp) : null;
          if (!timestamp || Number.isNaN(timestamp.getTime())) return null;
          const eventDate = formatIsoDate(timestamp);
          const dayOffset = anchorDate ? diffInWholeDays(anchorDate, eventDate) : 0;
          const phase = dayOffset < 0 ? 'pre' : `hack-${Math.max(0, Math.min(duration - 1, dayOffset))}`;
          return {
            id: `custom-${index}-${timestamp.getTime()}`,
            name: String(event.name || 'Custom Event'),
            description: typeof event.description === 'string' ? event.description : '',
            signal: typeof event.signal === 'string' ? event.signal : 'neutral',
            phase,
            order: index,
            ...(phase === 'pre'
              ? { offsetDays: anchorDate ? dayOffset : -3 }
              : { time: formatIsoTime(event.timestamp) }),
            isCustom: true,
          };
        })
        .filter(Boolean)
    : [];

  return {
    duration,
    ...(anchorDate ? { anchorDate } : {}),
    ...(anchorIso ? { anchorTime: formatIsoTime(anchorIso) } : {}),
    timezone: schedule.timezone || EVENT_TIMEZONE,
    activePhase: 'pre',
    eventStates,
    customEvents,
  };
}

function hasPublishedSchedulePayload(schedule) {
  if (!schedule || typeof schedule !== 'object') return false;
  return Object.entries(EVENT_TO_OUTPUT_FIELD).some(([, field]) => Boolean(schedule[field])) ||
    (Array.isArray(schedule.customEvents) && schedule.customEvents.length > 0);
}

function mergeBuilderScheduleWithBase(baseSchedule, nextSchedule) {
  if (!nextSchedule || typeof nextSchedule !== 'object') {
    return nextSchedule;
  }

  const merged = { ...nextSchedule };

  if (baseSchedule && typeof baseSchedule === 'object') {
    NON_EDITABLE_SCHEDULE_FIELDS.forEach((field) => {
      if (typeof baseSchedule[field] === 'string' && !merged[field]) {
        merged[field] = baseSchedule[field];
      }
    });

    if (Array.isArray(baseSchedule.selectedEvents)) {
      const supportedEventIds = new Set(Object.keys(EVENT_TO_OUTPUT_FIELD));
      const preservedEventIds = baseSchedule.selectedEvents.filter((eventId) => !supportedEventIds.has(eventId));
      if (preservedEventIds.length > 0) {
        merged.selectedEvents = Array.from(new Set([...(nextSchedule.selectedEvents || []), ...preservedEventIds]));
      }
    }
  }

  return merged;
}

function getLocalPreviewEventId() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');
    return eventId && eventId.trim() ? eventId.trim() : null;
  } catch {
    return null;
  }
}

function getLocalPreviewConfigStorageKey(eventId) {
  return eventId ? `hd26forge:config-mode:v1:${eventId}` : null;
}

function readLocalPreviewPublishedSchedule() {
  if (typeof window === 'undefined') return null;
  const key = getLocalPreviewConfigStorageKey(getLocalPreviewEventId());
  if (!key) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.publishedSchedule && typeof parsed.publishedSchedule === 'object'
      ? parsed.publishedSchedule
      : null;
  } catch {
    return null;
  }
}

function buildLocalPreviewMilestones(schedule) {
  if (!hasPublishedSchedulePayload(schedule)) {
    return [];
  }

  const milestones = [];
  const defs = [
    ['registrationOpensAt', 'REGISTRATION', 'Registration Opens', 'Portal opens for sign-ups', 'start'],
    ['registrationClosesAt', 'REGISTRATION', 'Registration Closes', 'Final deadline to register', 'deadline'],
    ['teamFormationStartsAt', 'TEAM_FORMATION', 'Team Formation Opens', 'Marketplace opens for team building', 'start'],
    ['openingCeremonyAt', 'HACKING', 'Opening Ceremony', 'Kickoff and announcements', 'ceremony'],
    ['hackingStartsAt', 'HACKING', 'Hacking Begins', 'Teams start building', 'start'],
    ['submissionDeadlineAt', 'SUBMISSION', 'Code Freeze', 'Final submissions due', 'deadline'],
    ['presentationsAt', 'SUBMISSION', 'Presentations', 'Teams present their projects', 'presentation'],
    ['judgingStartsAt', 'JUDGING', 'Judging Period', 'Judges evaluate submissions', 'judging'],
    ['resultsAnnounceAt', 'RESULTS', 'Results Announced', 'Winners announced and celebrated', 'ceremony'],
  ];

  defs.forEach(([field, phase, title, description, signal]) => {
    if (!schedule[field]) return;
    milestones.push({
      id: field,
      title,
      description,
      phase,
      signal,
      startTime: schedule[field],
      endTime: null,
      location: null,
    });
  });

  (schedule.customEvents || []).forEach((event, index) => {
    if (!event?.timestamp || !event?.name) return;
    milestones.push({
      id: `custom-${index}`,
      title: event.name,
      description: event.description || null,
      phase: 'HACKING',
      signal: event.signal || 'neutral',
      startTime: event.timestamp,
      endTime: null,
      location: null,
    });
  });

  milestones.sort((left, right) => Date.parse(left.startTime) - Date.parse(right.startTime));
  return milestones;
}

function buildLocalizedScheduleColumns(milestones, userTimezone, userLocale) {
  const phaseIconMap = {
    REGISTRATION: { icon: Flag, category: 'logistics' },
    TEAM_FORMATION: { icon: Users, category: 'social' },
    HACKING: { icon: Code, category: 'hacking' },
    SUBMISSION: { icon: Flag, category: 'deadline' },
    PRESENTATION: { icon: Mic, category: 'presentation' },
    JUDGING: { icon: Trophy, category: 'judging' },
    RESULTS: { icon: Sparkles, category: 'ceremony' },
    signup: { icon: Flag, category: 'logistics' },
    team_formation: { icon: Users, category: 'social' },
    hacking: { icon: Code, category: 'hacking' },
    submission: { icon: Flag, category: 'deadline' },
    voting: { icon: Trophy, category: 'judging' },
    judging: { icon: Trophy, category: 'judging' },
    results: { icon: Sparkles, category: 'ceremony' },
  };

  const formatLocalDate = (dateStr, options) =>
    new Intl.DateTimeFormat(userLocale, { timeZone: userTimezone, ...options }).format(new Date(`${dateStr}T12:00:00Z`));
  const formatLocalTime = (isoValue) =>
    new Intl.DateTimeFormat(userLocale, {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(isoValue));

  const preEventPhases = new Set(['REGISTRATION', 'TEAM_FORMATION', 'registration', 'team_formation', 'signup']);
  const preEventMilestones = [];
  const hackDayMilestones = [];

  milestones.forEach((milestone) => {
    if (!milestone.startTime) return;
    const phase = milestone.phase || '';
    if (preEventPhases.has(phase)) {
      preEventMilestones.push(milestone);
    } else {
      hackDayMilestones.push(milestone);
    }
  });

  preEventMilestones.sort((left, right) => Date.parse(left.startTime) - Date.parse(right.startTime));
  hackDayMilestones.sort((left, right) => Date.parse(left.startTime) - Date.parse(right.startTime));

  const columns = [];

  if (preEventMilestones.length > 0) {
    const firstDate = preEventMilestones[0].startTime.split('T')[0];
    const lastDate = preEventMilestones[preEventMilestones.length - 1].startTime.split('T')[0];
    const startLabel = formatLocalDate(firstDate, { month: 'short', day: 'numeric' });
    const endLabel = formatLocalDate(lastDate, { month: 'short', day: 'numeric', year: 'numeric' });

    columns.push({
      id: 'pre-event',
      label: 'Pre-Event',
      date: firstDate === lastDate ? endLabel : `${startLabel} - ${endLabel}`,
      events: preEventMilestones.map((milestone) => {
        const meta = phaseIconMap[milestone.phase] || { icon: Calendar, category: 'logistics' };
        return {
          title: milestone.title,
          time: formatLocalDate(milestone.startTime.split('T')[0], { weekday: 'short', month: 'short', day: 'numeric' }),
          icon: meta.icon,
          category: meta.category,
          signal: milestone.signal || null,
          description: milestone.description,
        };
      }),
    });
  }

  const milestonesByDate = hackDayMilestones.reduce((acc, milestone) => {
    const date = milestone.startTime.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(milestone);
    return acc;
  }, {});

  Object.keys(milestonesByDate)
    .sort()
    .forEach((date, index, allDates) => {
      columns.push({
        id: `day-${index + 1}`,
        label: allDates.length === 1 ? 'Hack Day' : `Day ${index + 1}`,
        date: formatLocalDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        events: milestonesByDate[date].map((milestone) => {
          const meta = phaseIconMap[milestone.phase] || { icon: Calendar, category: 'logistics' };
          return {
            title: milestone.title,
            time: formatLocalTime(milestone.startTime),
            icon: meta.icon,
            category: meta.category,
            signal: milestone.signal || null,
            description: milestone.description,
          };
        }),
      });
    });

  return columns;
}

function PublishedScheduleView({ dayColumns }) {
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
          'flex items-start gap-4 rounded-card border p-4 transition-all hover:-translate-y-0.5',
          !signalColors && style.bg,
          !signalColors && style.border
        )}
        style={signalCardStyle}
      >
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
            !signalColors && 'bg-arena-card'
          )}
          style={signalIconWrapStyle}
        >
          <Icon className={cn('h-5 w-5', !signalColors && style.text)} style={signalIconStyle} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={cn('text-sm font-mono', !signalColors && style.text)} style={signalTextStyle}>
              {event.time}
            </span>
            <Badge variant="default" size="xs" className="capitalize" style={signalBadgeStyle}>
              {event.category}
            </Badge>
          </div>
          <h4 className="font-bold text-text-primary">{event.title}</h4>
          {event.description ? (
            <p className="mt-1 text-sm text-text-secondary">{event.description}</p>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {dayColumns.map((day) => (
          <Card key={day.id} padding="md" className="h-full">
            <div className="mb-4 border-b border-arena-border pb-3">
              <h2 className="text-xl font-bold text-text-primary">{day.label}</h2>
              <p className="text-sm text-text-secondary">{day.date}</p>
            </div>
            <div className="space-y-3">
              {day.events.map((event, index) => renderEventCard(event, `${day.id}-${index}`))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-card border border-arena-border bg-arena-card p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-muted">Event Categories</p>
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
    </>
  );
}

function UnpublishedScheduleState({ canEdit, isConfigEnabled, onNavigate }) {
  return (
    <Card padding="lg" className="border-dashed">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Schedule</p>
          <h2 className="mt-2 text-2xl font-black text-text-primary">Schedule not published yet</h2>
          <p className="mt-2 max-w-2xl text-text-secondary">
            The event team is still preparing key dates, deadlines, and judging windows. Check back soon for the live schedule.
          </p>
        </div>
        {canEdit ? (
          <div className="min-w-[220px] rounded-card border border-teal-500/25 bg-teal-500/5 p-4">
            <p className="text-sm font-semibold text-text-primary">Admin note</p>
            <p className="mt-1 text-sm text-text-secondary">
              {isConfigEnabled
                ? 'Config Mode is on. Start building the schedule below and publish when ready.'
                : 'Turn on Config Mode to draft and publish the event schedule.'}
            </p>
            {!isConfigEnabled ? (
              <Button className="mt-3 w-full justify-center" variant="secondary" onClick={() => onNavigate('admin')}>
                Open Admin Panel
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Schedule({ onNavigate }) {
  const configMode = useConfigMode();
  const [milestones, setMilestones] = useState([]);
  const [hasPublishedSchedule, setHasPublishedSchedule] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [builderResetKey, setBuilderResetKey] = useState(0);
  const userTimezone = getUserTimezone();
  const userLocale = getUserLocale();
  const tzAbbr = getTimezoneAbbr();
  const publishedSchedule = configMode.publishedSchedule;
  const effectiveSchedule = configMode.effectiveSchedule;
  const canEditSchedule = Boolean(configMode.canEdit);
  const showEditor = Boolean(configMode.isEnabled && canEditSchedule);

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isDevMode()) {
        const schedule = readLocalPreviewPublishedSchedule();
        setMilestones(buildLocalPreviewMilestones(schedule));
        setHasPublishedSchedule(hasPublishedSchedulePayload(schedule));
        return;
      }

      const { invoke } = await import('@forge/bridge');
      const response = await invoke('getSchedule');
      setMilestones(Array.isArray(response?.milestones) ? response.milestones : []);
      setHasPublishedSchedule(Boolean(response?.hasPublishedSchedule));
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
      setMilestones([]);
      setHasPublishedSchedule(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        if (isDevMode()) {
          const schedule = readLocalPreviewPublishedSchedule();
          if (!active) return;
          setMilestones(buildLocalPreviewMilestones(schedule));
          setHasPublishedSchedule(hasPublishedSchedulePayload(schedule));
          return;
        }

        const { invoke } = await import('@forge/bridge');
        const response = await invoke('getSchedule');
        if (!active) return;
        setMilestones(Array.isArray(response?.milestones) ? response.milestones : []);
        setHasPublishedSchedule(Boolean(response?.hasPublishedSchedule));
      } catch (error) {
        if (!active) return;
        console.error('Failed to fetch schedule:', error);
        setMilestones([]);
        setHasPublishedSchedule(false);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!configMode.publishSuccess?.at) {
      return;
    }
    void fetchSchedule();
  }, [configMode.publishSuccess?.at, fetchSchedule]);

  useEffect(() => {
    if (!configMode.hasUnsavedChanges) {
      setBuilderResetKey((current) => current + 1);
    }
  }, [configMode.hasUnsavedChanges, configMode.draftEnvelope, publishedSchedule]);

  const dayColumns = useMemo(
    () => buildLocalizedScheduleColumns(milestones, userTimezone, userLocale),
    [milestones, userTimezone, userLocale]
  );

  const builderInitialState = useMemo(
    () => buildBuilderInitialState(effectiveSchedule || publishedSchedule),
    [effectiveSchedule, publishedSchedule]
  );

  const hasPublishedData = hasPublishedSchedule || hasPublishedSchedulePayload(publishedSchedule);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Event Schedule</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">Schedule</h1>
            {showEditor ? <Badge variant="warning">Config Mode</Badge> : null}
            {configMode.hasDraft ? <Badge variant="default">Draft</Badge> : null}
          </div>
          <p className="mb-2 max-w-3xl text-text-secondary">
            {showEditor
              ? 'Draft the participant schedule here. Save Draft to keep working privately, then publish when the timeline is ready.'
              : 'Plan around key sessions, deadlines, and judging windows across the event.'}
          </p>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Globe className="h-4 w-4" />
            <span>
              Times shown in your local timezone ({tzAbbr}) <span className="ml-1">• Event base timezone: {EVENT_TIMEZONE}</span>
            </span>
          </div>
        </div>
      </div>

      {showEditor ? (
        <div className="space-y-6">
          <Card padding="md" className="border-teal-500/20 bg-teal-500/5">
            <p className="text-sm font-semibold text-text-primary">Editing in Config Mode</p>
            <p className="mt-1 text-sm text-text-secondary">
              Schedule changes stay in draft until you publish from the Config Mode panel.
            </p>
          </Card>

          <ScheduleBuilderV2
            key={`schedule-builder-${builderResetKey}`}
            timezone={(effectiveSchedule || publishedSchedule)?.timezone || EVENT_TIMEZONE}
            initialState={builderInitialState}
            onChange={(output) => {
              configMode.setScheduleDraft(mergeBuilderScheduleWithBase(effectiveSchedule || publishedSchedule, output));
            }}
          />
        </div>
      ) : isLoading ? (
        <Card padding="lg">
          <div className="flex items-center gap-3 text-text-secondary">
            <Clock className="h-5 w-5 animate-pulse" />
            <span>Loading schedule…</span>
          </div>
        </Card>
      ) : !hasPublishedData || dayColumns.length === 0 ? (
        <UnpublishedScheduleState
          canEdit={canEditSchedule}
          isConfigEnabled={configMode.isEnabled}
          onNavigate={onNavigate}
        />
      ) : (
        <PublishedScheduleView dayColumns={dayColumns} />
      )}
    </div>
  );
}

export default Schedule;
