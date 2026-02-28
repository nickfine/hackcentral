/**
 * Dashboard Page - participant-first mission control view.
 */

import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge, Modal } from './ui';
import {
  EVENT_PHASE_ORDER,
  EVENT_PHASES,
  getUserLocale,
} from '../data/constants';
import {
  computeUserState,
  getMissionContent,
} from '../lib/missionBriefContent';
import { cn, BUTTON_VARIANTS } from '../lib/design-system';
import EditableText from '../configMode/EditableText';
import EditableTextArea from '../configMode/EditableTextArea';
import { useConfigMode } from '../configMode/ConfigModeContext';

// ============================================================================
// MOCK DATA (fallback when resolver data is unavailable)
// ============================================================================

const MOCK_ACTIVITY_FEED = [
  { id: 1, type: 'join', teamId: 'team-3', user: 'Maya Rodriguez', team: 'Rescue House', time: '2m ago' },
  { id: 2, type: 'create', teamId: 'team-1', user: 'Jordan Lee', team: 'Quantum Collective', time: '5m ago' },
  { id: 3, type: 'join', user: 'Casey Bento', team: 'Meteor Touch', time: '12m ago' },
  { id: 4, type: 'create', user: "Pat O'Brien", team: 'Carbon Cockfox', time: '18m ago' },
  { id: 5, type: 'join', teamId: 'team-2', user: 'Skylar Moore', team: 'Digital Overlords', time: '23m ago' },
];

const MOCK_MILESTONES = [
  {
    id: 'milestone-signup-close',
    title: 'Registration Closes',
    phase: 'signup',
    startTime: '2026-06-20T20:00:00.000Z',
    endTime: null,
    location: 'Registration Portal',
  },
  {
    id: 'milestone-team-formation',
    title: 'Team Formation Opens',
    phase: 'team_formation',
    startTime: '2026-06-20T20:30:00.000Z',
    endTime: null,
    location: 'Ideas Marketplace',
  },
  {
    id: 'milestone-hacking-start',
    title: 'Hacking Begins',
    phase: 'hacking',
    startTime: '2026-06-21T08:30:00.000Z',
    endTime: null,
    location: 'Remote Workspace',
  },
  {
    id: 'milestone-submission-open',
    title: 'Submission Opens',
    phase: 'submission',
    startTime: '2026-06-22T07:00:00.000Z',
    endTime: null,
    location: 'Submission Portal',
  },
  {
    id: 'milestone-submission-close',
    title: 'Code Freeze & Submission Deadline',
    phase: 'submission',
    startTime: '2026-06-22T09:00:00.000Z',
    endTime: null,
    location: 'Submission Portal',
  },
  {
    id: 'milestone-voting-open',
    title: 'Voting Opens',
    phase: 'voting',
    startTime: '2026-06-22T10:30:00.000Z',
    endTime: null,
    location: 'Voting Hub',
  },
  {
    id: 'milestone-results',
    title: 'Awards Ceremony',
    phase: 'results',
    startTime: '2026-06-22T15:00:00.000Z',
    endTime: null,
    location: 'Live Stream',
  },
];

const OWNER_WELCOME_STORAGE_KEY_PREFIX = 'ownerWelcome:v1:';
const OWNER_WELCOME_IMAGE_PATH = './jonmort.png';

const PHASE_ORDER_INDEX = EVENT_PHASE_ORDER.reduce((acc, phaseId, index) => {
  acc[phaseId] = index;
  return acc;
}, {});

const PHASE_LABELS = Object.entries(EVENT_PHASES).reduce((acc, [phaseId, phaseData]) => {
  acc[phaseId] = phaseData?.label || phaseId;
  return acc;
}, {});

const ACTIVITY_VERBS = {
  join: 'joined',
  create: 'created',
  submit: 'submitted',
  vote: 'voted for',
  comment: 'commented on',
  award: 'won',
  team_full: 'filled',
  login: 'checked in',
};

const TONE_STYLES = {
  green: {
    dot: 'dashboard-status-dot dashboard-status-dot--green',
    text: 'dashboard-status-text dashboard-status-text--green',
    pill: 'dashboard-readiness-pill dashboard-readiness-pill--green',
  },
  amber: {
    dot: 'dashboard-status-dot dashboard-status-dot--amber',
    text: 'dashboard-status-text dashboard-status-text--amber',
    pill: 'dashboard-readiness-pill dashboard-readiness-pill--amber',
  },
  red: {
    dot: 'dashboard-status-dot dashboard-status-dot--red',
    text: 'dashboard-status-text dashboard-status-text--red',
    pill: 'dashboard-readiness-pill dashboard-readiness-pill--red',
  },
  gray: {
    dot: 'dashboard-status-dot dashboard-status-dot--gray',
    text: 'dashboard-status-text dashboard-status-text--gray',
    pill: 'dashboard-readiness-pill dashboard-readiness-pill--gray',
  },
};

const TEAM_STATUS_META = {
  no_team: {
    label: 'Unassigned',
    detail: 'Join an idea to start building.',
    tone: 'amber',
  },
  incomplete: {
    label: 'In progress',
    detail: 'Confirm roles and scope now.',
    tone: 'amber',
  },
  ready: {
    label: 'Ready',
    detail: 'Your team setup is complete.',
    tone: 'green',
  },
  submitted: {
    label: 'Ready',
    detail: 'Submission is complete and locked.',
    tone: 'green',
  },
};

const AVATAR_TONE_CLASSES = [
  'dashboard-avatar-tone-0',
  'dashboard-avatar-tone-1',
  'dashboard-avatar-tone-2',
  'dashboard-avatar-tone-3',
  'dashboard-avatar-tone-4',
];

const ACTIVITY_ACCENTS = {
  join: 'dashboard-activity-accent--default',
  create: 'dashboard-activity-accent--default',
  default: 'dashboard-activity-accent--default',
};

function parseIsoTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeWindow(targetTimestamp) {
  const targetDate = parseIsoTimestamp(targetTimestamp);
  if (!targetDate) return null;

  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) return 'Live now';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `In ${days}d ${hours}h`;
  if (hours > 0) return `In ${hours}h ${minutes}m`;
  return `In ${Math.max(minutes, 1)}m`;
}

function formatActivityTime(timeInput) {
  if (!timeInput) return 'recently';
  if (typeof timeInput === 'string' && timeInput.includes('ago')) return timeInput;

  const parsed = new Date(timeInput);
  if (Number.isNaN(parsed.getTime())) return 'recently';

  const diffMs = Date.now() - parsed.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 30) return 'just now';
  if (diffMins < 1) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayMonth(value) {
  const parsed = parseIsoTimestamp(value);
  if (!parsed) return '--/--';
  return parsed.toLocaleDateString(getUserLocale(), { day: '2-digit', month: '2-digit' });
}

function formatDayMonthYear(value) {
  const parsed = parseIsoTimestamp(value);
  if (!parsed) return '--/--/----';
  return parsed.toLocaleDateString(getUserLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAvatarToneClass(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return AVATAR_TONE_CLASSES[0];
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TONE_CLASSES[hash % AVATAR_TONE_CLASSES.length];
}

function getActivityAccentClass(type) {
  return ACTIVITY_ACCENTS[type] || ACTIVITY_ACCENTS.default;
}

function normalizeTeamName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function getUpcomingMilestones(milestones = [], limit = 2) {
  const now = new Date();

  return (milestones || [])
    .map((milestone) => {
      const startDate = parseIsoTimestamp(milestone.startTime);
      const endDate = parseIsoTimestamp(milestone.endTime);
      if (!startDate) return null;

      const isNow = startDate <= now && (!endDate || endDate >= now);
      const isFuture = startDate >= now;
      if (!isNow && !isFuture) return null;

      return {
        id: milestone.id,
        title: milestone.title,
        phase: milestone.phase,
        phaseLabel: PHASE_LABELS[milestone.phase] || 'Upcoming',
        startTime: milestone.startTime,
        endTime: milestone.endTime,
        isNow,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aStart = parseIsoTimestamp(a.startTime)?.getTime() || 0;
      const bStart = parseIsoTimestamp(b.startTime)?.getTime() || 0;
      return aStart - bStart;
    })
    .slice(0, limit);
}

function derivePhaseEndDate(eventPhase, milestones = []) {
  const now = new Date();
  const currentPhaseOrder = PHASE_ORDER_INDEX[eventPhase];

  if (!Number.isFinite(currentPhaseOrder)) return null;

  const nextPhaseStarts = (milestones || [])
    .map((milestone) => ({
      phaseOrder: PHASE_ORDER_INDEX[milestone.phase],
      startDate: parseIsoTimestamp(milestone.startTime),
    }))
    .filter((entry) =>
      Number.isFinite(entry.phaseOrder) &&
      entry.phaseOrder > currentPhaseOrder &&
      entry.startDate &&
      entry.startDate > now
    )
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (nextPhaseStarts.length > 0) {
    return nextPhaseStarts[0].startDate.toISOString();
  }

  const currentPhaseEnds = (milestones || [])
    .map((milestone) => parseIsoTimestamp(milestone.endTime))
    .filter((endDate) => endDate && endDate > now)
    .sort((a, b) => a.getTime() - b.getTime());

  return currentPhaseEnds.length > 0 ? currentPhaseEnds[0].toISOString() : null;
}

function buildMyProgressModel({ eventPhase, userTeam, hasSubmitted, phaseEndDate }) {
  const memberCount = userTeam?.memberCount || (userTeam?.members?.length || 0) + (userTeam ? 1 : 0);
  const hasTeam = Boolean(userTeam);
  const isTeamReady = hasTeam && memberCount >= 2;
  const isSubmitted = Boolean(hasSubmitted);

  let deadlineRisk = 'low';
  if (phaseEndDate && !isSubmitted) {
    const endDate = parseIsoTimestamp(phaseEndDate);
    if (endDate) {
      const hoursRemaining = (endDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursRemaining <= 6) deadlineRisk = 'high';
      else if (hoursRemaining <= 18) deadlineRisk = 'medium';
    }
  }

  if (!hasTeam && (eventPhase === 'signup' || eventPhase === 'team_formation')) {
    return {
      teamStatus: 'no_team',
      submissionReady: false,
      deadlineRisk,
      nextActionLabel: 'Find a Team',
      nextActionRoute: 'marketplace',
      nextActionParams: { tab: 'ideas' },
    };
  }

  if (isSubmitted) {
    return {
      teamStatus: 'submitted',
      submissionReady: true,
      deadlineRisk: 'low',
      nextActionLabel: 'Review Entries',
      nextActionRoute: 'voting',
      nextActionParams: {},
    };
  }

  if (eventPhase === 'hacking' || eventPhase === 'submission') {
    return {
      teamStatus: isTeamReady ? 'ready' : 'incomplete',
      submissionReady: false,
      deadlineRisk,
      nextActionLabel: 'Open Submission',
      nextActionRoute: 'submission',
      nextActionParams: {},
    };
  }

  return {
    teamStatus: isTeamReady ? 'ready' : 'incomplete',
    submissionReady: false,
    deadlineRisk,
    nextActionLabel: 'Review Schedule',
    nextActionRoute: 'schedule',
    nextActionParams: {},
  };
}

const ReadinessPill = memo(function ReadinessPill({ label, value, tone = 'gray', title, testId }) {
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.gray;

  return (
    <div
      data-testid={testId}
      title={title}
      className={cn(
        'inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border px-4 py-2 text-sm font-normal transition-transform duration-150 motion-safe:hover:scale-[1.02]',
        toneStyle.pill
      )}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneStyle.dot}`} aria-hidden="true" />
      <span className="shrink-0 text-text-secondary">{label}:</span>
      <span className={cn('min-w-0 truncate font-normal', toneStyle.text)} title={title}>{value}</span>
    </div>
  );
});

const OwnerWelcomeModal = memo(function OwnerWelcomeModal({
  isOpen,
  onClose,
  ownerName = 'Jon Mort',
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      className="w-[calc(100vw-2rem)] max-w-[1180px] overflow-hidden border border-arena-border"
    >
      <div className="relative p-5 sm:p-8">
        <div className="relative flex flex-col gap-5 sm:gap-8 sm:flex-row sm:items-stretch">
          <div className="sm:w-1/2">
            <div className="h-full rounded-2xl border border-arena-border bg-arena-elevated">
              <img
                src={OWNER_WELCOME_IMAGE_PATH}
                alt="Jon Mort portrait"
                className="h-full min-h-[360px] w-full rounded-2xl object-contain sm:min-h-[480px]"
              />
            </div>
          </div>

          <div className="sm:w-1/2 flex flex-col justify-center">
            <h3 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              Welcome to mission control.
            </h3>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              Teams are assembling, ideas are locking in, and everything is primed to form up and hack.
              HackDay is ready to build at full speed on your command, {ownerName}.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-lg bg-accent-500 px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-600"
              >
                Enter Mission Control
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

// Check if running in dev mode (outside Forge)
const isDevMode = () => {
  try {
    return window.parent === window || !document.referrer.includes('atlassian');
  } catch {
    return true;
  }
};

function Dashboard({
  user,
  teams = [],
  eventPhase = 'signup',
  eventMotd = '',
  eventAdminMessage = null,
  onNavigate,
  onTrackEvent,
  devRoleOverride,
  useAdaptavistLogo = false,
  eventMeta = null,
}) {
  const configMode = useConfigMode();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showOwnerWelcome, setShowOwnerWelcome] = useState(false);
  const [dataLoadedAt, setDataLoadedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    const loadData = async () => {
      if (isDevMode()) {
        setData({
          registrations: [
            { id: 'dev-user-1', name: 'Maya Rodriguez', isFreeAgent: false },
            { id: 'dev-user-2', name: 'Jordan Lee', isFreeAgent: false },
            { id: 'dev-user-3', name: 'Casey Bento', isFreeAgent: false },
            { id: 'dev-user-4', name: "Pat O'Brien", isFreeAgent: true },
            { id: 'dev-user-5', name: 'Skylar Moore', isFreeAgent: true },
            { id: 'dev-user-6', name: 'Alex Chen', isFreeAgent: false },
          ],
          activities: MOCK_ACTIVITY_FEED,
          scheduleMilestones: MOCK_MILESTONES,
        });
        setDataLoadedAt(new Date().toISOString());
        setLoading(false);
        return;
      }

      try {
        const { invoke } = await import('@forge/bridge');

        const resolverCalls = [
          { key: 'registrations', promise: invoke('getRegistrations') },
          { key: 'activity', promise: invoke('getActivityFeed', { limit: 20 }) },
          { key: 'schedule', promise: invoke('getSchedule') },
        ];

        const settled = await Promise.allSettled(resolverCalls.map((entry) => entry.promise));
        const resultsByKey = resolverCalls.reduce((acc, entry, index) => {
          acc[entry.key] = settled[index];
          return acc;
        }, {});

        const registrations =
          resultsByKey.registrations?.status === 'fulfilled'
            ? (resultsByKey.registrations.value?.registrations || [])
            : [];

        const activities =
          resultsByKey.activity?.status === 'fulfilled'
            ? (resultsByKey.activity.value?.activities || [])
            : [];

        const scheduleMilestones =
          resultsByKey.schedule?.status === 'fulfilled'
            ? (resultsByKey.schedule.value?.milestones || [])
            : [];

        setData({ registrations, activities, scheduleMilestones });
        setDataLoadedAt(new Date().toISOString());

        const failures = Object.values(resultsByKey).filter((result) => result?.status === 'rejected').length;
        if (failures === Object.keys(resultsByKey).length) {
          setError('Failed to load data');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load dashboard data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.role]);

  // Track if reminder check has been done this session
  const reminderCheckDone = useRef(false);

  // Check for free agent reminders when dashboard loads
  useEffect(() => {
    if (reminderCheckDone.current) return;
    if (isDevMode()) return;

    const isFreeAgent = user?.isFreeAgent ||
      (user && !teams.some((t) => t.captainId === user.id || t.members?.some((m) => m.id === user.id)));

    if (!isFreeAgent || eventPhase !== 'team_formation') return;

    const checkReminders = async () => {
      try {
        reminderCheckDone.current = true;
        const { invoke } = await import('@forge/bridge');
        const result = await invoke('checkFreeAgentReminders', {});
        if (result.notified > 0) {
          console.log(`[Dashboard] Created ${result.notified} reminder notifications`);
        }
      } catch (err) {
        console.error('[Dashboard] Error checking reminders:', err);
      }
    };

    checkReminders();
  }, [user, teams, eventPhase]);

  const stats = useMemo(() => {
    const registrations = data?.registrations || [];
    const activeTeams = (teams || []).filter((team) => team.id !== 'team-observers');

    return {
      participants: registrations.length,
      teams: activeTeams.length,
      freeAgents: registrations.filter((r) => r.isFreeAgent).length,
      submissions: activeTeams.filter((t) => t.submission?.status === 'submitted').length,
    };
  }, [data, teams]);

  const scheduleMilestones = useMemo(() => {
    const milestones = data?.scheduleMilestones || [];
    return milestones.length > 0 ? milestones : MOCK_MILESTONES;
  }, [data]);

  const phaseEndDate = useMemo(
    () => derivePhaseEndDate(eventPhase, scheduleMilestones),
    [eventPhase, scheduleMilestones]
  );

  const nextMilestones = useMemo(
    () => getUpcomingMilestones(scheduleMilestones, 2),
    [scheduleMilestones]
  );

  const comingUpMilestones = useMemo(
    () => getUpcomingMilestones(scheduleMilestones, 4),
    [scheduleMilestones]
  );

  const activityFeed = useMemo(() => {
    if (!data?.activities || data.activities.length === 0) return MOCK_ACTIVITY_FEED;
    return data.activities;
  }, [data]);

  const teamIdsByName = useMemo(() => {
    const map = new Map();
    (teams || []).forEach((team) => {
      if (!team?.id || !team?.name) return;
      map.set(normalizeTeamName(team.name), team.id);
    });
    return map;
  }, [teams]);

  const resolveActivityTarget = useCallback((activity) => {
    if (!activity || typeof activity !== 'object') {
      return { view: 'marketplace', params: { tab: 'teams' } };
    }

    if (typeof activity.teamId === 'string' && activity.teamId) {
      return { view: 'team-detail', params: { teamId: activity.teamId } };
    }

    const resolvedTeamId = teamIdsByName.get(normalizeTeamName(activity.team));
    if (resolvedTeamId) {
      return { view: 'team-detail', params: { teamId: resolvedTeamId } };
    }

    return { view: 'marketplace', params: { tab: 'teams' } };
  }, [teamIdsByName]);

  const handleActivityItemClick = useCallback((activity) => {
    const target = resolveActivityTarget(activity);
    onNavigate?.(target.view, target.params);
  }, [onNavigate, resolveActivityTarget]);

  const userTeam = useMemo(() => {
    if (devRoleOverride === 'participant_guest') return null;
    if (!user) return null;

    return (
      (teams || []).find(
        (team) =>
          team.captainId === user.id || team.members?.some((m) => m.id === user.id)
      ) || null
    );
  }, [devRoleOverride, teams, user]);

  const hasSubmitted = Boolean(userTeam?.submission?.status === 'submitted');

  const myProgress = useMemo(
    () => buildMyProgressModel({ eventPhase, userTeam, hasSubmitted, phaseEndDate }),
    [eventPhase, userTeam, hasSubmitted, phaseEndDate]
  );

  const isRegisteredUser = useMemo(() => {
    if (!user) return false;
    const userName = user.name || user.displayName;
    return Boolean(userName && user.skills?.length > 0);
  }, [user]);

  const isEarlyExecutionPhase = eventPhase === 'signup' || eventPhase === 'team_formation';

  const profileReadiness = useMemo(() => {
    if (!isRegisteredUser) {
      return {
        label: 'Incomplete',
        tone: 'amber',
        detail: 'Complete your profile to unlock team formation.',
      };
    }

    if (!userTeam && isEarlyExecutionPhase) {
      return {
        label: 'Complete',
        tone: 'green',
        detail: 'Profile is complete. You can now join a team.',
      };
    }

    return {
      label: 'Complete',
      tone: 'green',
      detail: 'Profile and readiness checks are complete.',
    };
  }, [isRegisteredUser, userTeam, isEarlyExecutionPhase]);

  const inlineFreeAgentAlert = useMemo(() => {
    if (!user || !isRegisteredUser) return null;
    if (eventPhase !== 'team_formation') return null;
    if (userTeam) return null;
    if (user.role === 'judge' || user.role === 'admin') return null;

    return {
      title: 'Free agent action',
      body: 'Team formation is live. Join an idea now so you enter hacking with a committed squad.',
      ctaLabel: user.autoAssignOptIn ? null : 'Browse ideas',
      ctaAction: user.autoAssignOptIn ? null : 'marketplace',
      ctaParams: user.autoAssignOptIn ? null : { tab: 'ideas' },
    };
  }, [user, isRegisteredUser, eventPhase, userTeam]);

  const hasPostedIdea = Boolean(userTeam && userTeam.captainId === user?.id);
  const userState = useMemo(
    () => computeUserState({ userTeam, hasPostedIdea, hasSubmitted, isRegistered: isRegisteredUser }),
    [userTeam, hasPostedIdea, hasSubmitted, isRegisteredUser]
  );

  const missionContent = useMemo(
    () => getMissionContent(eventPhase, userState),
    [eventPhase, userState]
  );

  const resolvedStatus = useMemo(
    () => (typeof missionContent.status === 'function'
      ? missionContent.status({
        teamName: userTeam?.name,
        memberCount: userTeam?.memberCount || (userTeam?.members?.length || 0) + 1,
        ideaTitle: userTeam?.ideaTitle || 'Your Idea',
        projectTitle: userTeam?.projectTitle || userTeam?.name || 'Your Project',
      })
      : missionContent.status),
    [missionContent.status, userTeam]
  );

  const resolvedContext = useMemo(
    () => (typeof missionContent.context === 'function' ? missionContent.context(stats) : missionContent.context),
    [missionContent.context, stats]
  );

  const nextAction = useMemo(() => {
    const fallback = missionContent.primaryCTA || {};

    return {
      label: myProgress.nextActionLabel || fallback.label || 'Open Next Step',
      action: myProgress.nextActionRoute || fallback.action || 'schedule',
      params: myProgress.nextActionParams || fallback.params || {},
    };
  }, [myProgress, missionContent.primaryCTA]);

  const primaryMilestone = nextMilestones[0] || null;
  const secondaryMilestone = nextMilestones[1] || null;

  const countdownText = useMemo(() => {
    if (primaryMilestone) {
      const relative = formatRelativeWindow(primaryMilestone.startTime);
      if (!relative) return primaryMilestone.title;
      return `${primaryMilestone.title} ${relative.replace(/^In\s/, 'in ')}`;
    }

    const phaseWindow = formatRelativeWindow(phaseEndDate);
    if (!phaseWindow) return 'Milestones syncing';
    return `Current phase closes ${phaseWindow.replace(/^In\s/, 'in ')}`;
  }, [primaryMilestone, phaseEndDate]);

  const nextMilestoneText = useMemo(() => {
    if (!secondaryMilestone) return null;
    return `${secondaryMilestone.title} ${formatDayMonthYear(secondaryMilestone.startTime)}`;
  }, [secondaryMilestone]);

  const teamReadiness = TEAM_STATUS_META[myProgress.teamStatus] || TEAM_STATUS_META.incomplete;

  const submissionReadiness = useMemo(() => {
    if (myProgress.submissionReady || hasSubmitted) {
      return {
        label: 'Ready',
        tone: 'green',
        detail: 'Submission package is complete.',
      };
    }

    if ((eventPhase === 'hacking' || eventPhase === 'submission') && myProgress.deadlineRisk === 'high') {
      return {
        label: 'Blocked',
        tone: 'red',
        detail: 'Deadline risk is high. Prioritize submission now.',
      };
    }

    return {
      label: 'Not ready',
      tone: 'amber',
      detail: 'Keep building toward a complete handoff.',
    };
  }, [myProgress.submissionReady, myProgress.deadlineRisk, hasSubmitted, eventPhase]);

  const readinessItems = useMemo(() => ([
    {
      id: 'team',
      pillLabel: 'Team',
      value: teamReadiness.label,
      tone: teamReadiness.tone,
      detail: teamReadiness.detail,
      testId: 'readiness-pill-team',
    },
    {
      id: 'submission',
      pillLabel: 'Submission',
      value: submissionReadiness.label,
      tone: submissionReadiness.tone,
      detail: submissionReadiness.detail,
      testId: 'readiness-pill-submission',
    },
    {
      id: 'profile',
      pillLabel: 'Profile',
      value: profileReadiness.label,
      tone: profileReadiness.tone,
      detail: profileReadiness.detail,
      testId: 'readiness-pill-profile',
    },
  ]), [teamReadiness, submissionReadiness, profileReadiness]);

  const readinessCompleteCount = useMemo(
    () => readinessItems.filter((item) => item.tone === 'green').length,
    [readinessItems]
  );
  const readinessTotalCount = readinessItems.length || 3;
  const readinessProgressPercent = Math.round((readinessCompleteCount / readinessTotalCount) * 100);
  const readinessCardToneClass = readinessCompleteCount === readinessTotalCount
    ? 'dashboard-readiness-card dashboard-readiness-card--complete'
    : 'dashboard-readiness-card dashboard-readiness-card--partial';

  const missionImpressionKeyRef = useRef(null);
  useEffect(() => {
    if (typeof onTrackEvent !== 'function') return;

    const impressionKey = [
      eventPhase,
      userState,
      missionContent.heroVariant || 'standard',
      missionContent.headline || '',
      nextAction.action || 'none',
    ].join('|');

    if (missionImpressionKeyRef.current === impressionKey) return;

    missionImpressionKeyRef.current = impressionKey;
    onTrackEvent('mission_brief_impression', {
      component: 'mission_brief',
      eventPhase,
      userState,
      heroVariant: missionContent.heroVariant || 'standard',
      headline: missionContent.headline,
      impressionKey,
      primaryCtaLabel: nextAction.label,
      primaryCtaAction: nextAction.action,
      secondaryCtaLabel: null,
      secondaryCtaAction: null,
    });
  }, [onTrackEvent, eventPhase, userState, missionContent, nextAction]);

  const handlePrimaryAction = useCallback(() => {
    onTrackEvent?.('mission_brief_cta_click', {
      component: 'mission_brief',
      eventPhase,
      userState,
      heroVariant: missionContent.heroVariant || 'standard',
      headline: missionContent.headline,
      ctaSlot: 'primary',
      ctaLabel: nextAction.label,
      ctaAction: nextAction.action,
      hasParams: Boolean(nextAction.params && Object.keys(nextAction.params).length > 0),
    });

    onNavigate?.(nextAction.action, nextAction.params);
  }, [onTrackEvent, eventPhase, userState, missionContent, nextAction, onNavigate]);

  const isOwnerDevPreview = devRoleOverride === 'owner_jonmort';
  const ownerWelcomeStorageKey = useMemo(
    () => (user?.id ? `${OWNER_WELCOME_STORAGE_KEY_PREFIX}${user.id}` : null),
    [user?.id]
  );

  const configMotdTitle = useMemo(
    () => configMode.getFieldValue('dashboard.motd.title', eventAdminMessage?.title || ''),
    [configMode, eventAdminMessage?.title]
  );
  const configMotdBody = useMemo(
    () => configMode.getFieldValue('dashboard.motd.message', eventAdminMessage?.message || ''),
    [configMode, eventAdminMessage?.message]
  );
  const configMotdPriority = useMemo(
    () => configMode.getFieldValue('dashboard.motd.priority', eventAdminMessage?.priority || 'info') || 'info',
    [configMode, eventAdminMessage?.priority]
  );
  const heroTitleFallback = useMemo(
    () => (
      useAdaptavistLogo && eventMeta?.name?.trim()
        ? eventMeta.name.trim()
        : (missionContent.headline || 'Mission status')
    ),
    [useAdaptavistLogo, eventMeta?.name, missionContent.headline]
  );
  const heroSubtitlePrimaryFallback = useMemo(
    () => (
      useAdaptavistLogo && eventMeta?.tagline?.trim()
        ? eventMeta.tagline.trim()
        : (resolvedStatus || '')
    ),
    [useAdaptavistLogo, eventMeta?.tagline, resolvedStatus]
  );
  const heroSubtitleSecondaryFallback = useMemo(
    () => resolvedContext || '',
    [resolvedContext]
  );
  const showHeroSubtitleSecondary = useMemo(() => {
    const resolved = configMode.getFieldValue('dashboard.hero.subtitleSecondary', heroSubtitleSecondaryFallback);
    return Boolean(String(resolved || '').trim()) || (configMode.isEnabled && configMode.canEdit);
  }, [configMode, heroSubtitleSecondaryFallback]);
  const showAdminMessagePod = Boolean(
    String(configMotdTitle || '').trim() || String(configMotdBody || '').trim()
  );

  useEffect(() => {
    if (!user?.isHackdayOwner) {
      setShowOwnerWelcome(false);
      return;
    }

    if (isOwnerDevPreview) {
      setShowOwnerWelcome(true);
      onTrackEvent?.('owner_welcome_seen', { owner: 'jmort', source: 'dev_preview' });
      return;
    }

    if (!ownerWelcomeStorageKey) {
      setShowOwnerWelcome(false);
      return;
    }

    let shouldShow = true;
    try {
      const lastSeen = window.localStorage.getItem(ownerWelcomeStorageKey);
      shouldShow = lastSeen !== getTodayIsoDate();
    } catch (storageError) {
      console.warn('[Dashboard] Failed to read owner welcome state:', storageError);
    }

    setShowOwnerWelcome(shouldShow);
    if (shouldShow) {
      onTrackEvent?.('owner_welcome_seen', { owner: 'jmort' });
    }
  }, [user?.isHackdayOwner, isOwnerDevPreview, ownerWelcomeStorageKey, onTrackEvent]);

  const handleOwnerWelcomeDismiss = useCallback(() => {
    setShowOwnerWelcome(false);
    if (!isOwnerDevPreview && ownerWelcomeStorageKey) {
      try {
        window.localStorage.setItem(ownerWelcomeStorageKey, getTodayIsoDate());
      } catch (storageError) {
        console.warn('[Dashboard] Failed to persist owner welcome state:', storageError);
      }
    }
    onTrackEvent?.('owner_welcome_dismissed', {
      owner: 'jmort',
      source: isOwnerDevPreview ? 'dev_preview' : 'normal',
    });
  }, [isOwnerDevPreview, ownerWelcomeStorageKey, onTrackEvent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4" />
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-arena-border bg-arena-card p-6 text-center shadow-sm">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg bg-accent-500 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-energy-shell relative space-y-6 overflow-hidden rounded-2xl border border-arena-border bg-arena-bg p-6">

      <OwnerWelcomeModal
        isOpen={showOwnerWelcome}
        onClose={handleOwnerWelcomeDismiss}
        ownerName={user?.name || user?.displayName || 'Jon Mort'}
      />

      <section data-testid="dashboard-row1-status-card">
        <div
          data-testid="dashboard-hero-card"
          className="dashboard-hero-card relative overflow-hidden rounded-xl border border-arena-border border-l-2 border-l-teal-500 px-5 py-6 sm:py-8 shadow-sm"
        >
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex items-center gap-4">
              <img
                src={useAdaptavistLogo ? './adaptlogo.png' : './hd-glyph.png'}
                alt={useAdaptavistLogo ? 'Adaptavist' : 'HackDay logo'}
                data-testid="dashboard-hero-logo"
                className="dashboard-hero-logo shrink-0"
              />
              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <EditableText
                    contentKey="dashboard.hero.title"
                    fallback={heroTitleFallback}
                    as="h1"
                    data-testid="dashboard-hero-headline"
                    displayClassName="dashboard-hero-title text-4xl sm:text-5xl font-black tracking-tight"
                  />
                  <EditableTextArea
                    contentKey="dashboard.hero.subtitlePrimary"
                    fallback={heroSubtitlePrimaryFallback}
                    as="p"
                    rows={2}
                    displayClassName="dashboard-hero-support-primary text-sm font-normal"
                  />
                  {showHeroSubtitleSecondary && (
                    <EditableTextArea
                      contentKey="dashboard.hero.subtitleSecondary"
                      fallback={heroSubtitleSecondaryFallback}
                      as="p"
                      rows={3}
                      displayClassName="dashboard-hero-support-secondary text-sm font-normal"
                      placeholder={configMode.isEnabled ? 'Optional secondary support line' : ''}
                    />
                  )}
                </div>

                <div data-testid="dashboard-hero-next-action" className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-4 w-1 rounded-full bg-teal-300" />
                  <div className="space-y-1">
                    <p className="dashboard-hero-callout text-lg font-semibold">
                      Next action: {nextAction.label}
                    </p>
                    <p className="dashboard-hero-meta-text text-xs font-normal" data-testid="dashboard-row1-meta">
                      {countdownText}
                      {nextMilestoneText ? ` · ${nextMilestoneText}` : ''}
                    </p>
                  </div>
                </div>

                {inlineFreeAgentAlert && (
                  <div className="dashboard-hero-alert rounded-lg border px-3 py-2 text-sm">
                    <p className="font-normal">{inlineFreeAgentAlert.title}</p>
                    <p className="mt-0.5 font-normal">{inlineFreeAgentAlert.body}</p>
                    {inlineFreeAgentAlert.ctaAction && inlineFreeAgentAlert.ctaLabel && (
                      <button
                        type="button"
                        className="dashboard-hero-alert-link mt-2 inline-flex items-center text-sm font-normal underline underline-offset-4"
                        onClick={() => onNavigate?.(inlineFreeAgentAlert.ctaAction, inlineFreeAgentAlert.ctaParams)}
                      >
                        {inlineFreeAgentAlert.ctaLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-auto md:self-center">
              <button
                type="button"
                data-testid="dashboard-row1-open-next-step"
                onClick={handlePrimaryAction}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 md:w-auto',
                  BUTTON_VARIANTS.primary.base,
                  BUTTON_VARIANTS.primary.hover,
                  BUTTON_VARIANTS.primary.active,
                  BUTTON_VARIANTS.primary.focus
                )}
              >
                <span>Open Next Step</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {showAdminMessagePod && (
        <section data-testid="dashboard-admin-message">
          <div className="dashboard-main-card rounded-xl border border-teal-500/20 bg-arena-card p-0 shadow-sm">
            <div className="flex items-center justify-between dashboard-card-header">
              <p className="dashboard-card-label">Admin Update</p>
              <Badge
                variant={
                  configMotdPriority === 'urgent'
                    ? 'error'
                    : configMotdPriority === 'warning'
                      ? 'warning'
                      : 'default'
                }
              >
                {String(configMotdPriority || 'info').toUpperCase()}
              </Badge>
            </div>
            <div className="dashboard-card-body space-y-2">
              {(String(configMotdTitle || '').trim() || (configMode.isEnabled && configMode.canEdit)) && (
                <EditableText
                  contentKey="dashboard.motd.title"
                  fallback={configMotdTitle}
                  as="p"
                  displayClassName="text-sm font-bold text-text-primary"
                  placeholder={configMode.isEnabled ? 'Optional message title' : ''}
                />
              )}
              <EditableTextArea
                contentKey="dashboard.motd.message"
                fallback={configMotdBody}
                as="p"
                rows={4}
                displayClassName="text-sm text-text-secondary whitespace-pre-wrap"
                placeholder={configMode.isEnabled ? 'Set a participant-facing dashboard message' : ''}
              />
            </div>
          </div>
        </section>
      )}

      <section data-testid="dashboard-row2-readiness">
        <div className={`dashboard-main-card rounded-xl border p-0 shadow-sm transition-colors ${readinessCardToneClass}`}>
          <div className="dashboard-card-header">
            <p className="dashboard-card-label">Your Readiness</p>
          </div>
          <div className="dashboard-card-body">
            <div className="dashboard-readiness-strip rounded-lg border p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {readinessItems.map((item) => (
                <ReadinessPill
                  key={item.id}
                  testId={item.testId}
                  label={item.pillLabel}
                  value={item.value}
                  tone={item.tone}
                  title={item.detail}
                />
              ))}
              </div>
            </div>

            <div className="mt-3 border-t border-arena-border pt-3">
              <div className="mb-1 flex items-center justify-between">
                <p data-testid="dashboard-readiness-count" className="dashboard-meta-text text-xs font-normal">
                {readinessCompleteCount} of {readinessTotalCount} ready
                </p>
                <p className="dashboard-meta-text text-xs font-normal">{readinessProgressPercent}%</p>
              </div>
              <div data-testid="dashboard-readiness-progress" className="dashboard-readiness-progress-track h-1.5 overflow-hidden rounded-full border border-arena-border">
                <div
                  data-testid="dashboard-readiness-progress-fill"
                  className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
                  style={{ width: `${readinessProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5" data-testid="dashboard-below-fold">
        <div className="lg:col-span-3" data-testid="dashboard-live-activity">
          <div className="dashboard-main-card rounded-xl border border-arena-border bg-arena-card p-0 shadow-sm">
            <div className="flex items-center justify-between dashboard-card-header">
              <p className="dashboard-card-label">Live Activity</p>
              <span data-testid="dashboard-live-indicator" className="dashboard-live-chip inline-flex items-center gap-1.5 text-xs font-normal">
                <span data-testid="dashboard-live-indicator-dot" className="live-pulse h-2 w-2 rounded-full bg-green-500" />
                Live
              </span>
            </div>

            <div className="space-y-3 dashboard-card-body">
              {activityFeed.slice(0, 5).map((activity, index) => {
                const verb = ACTIVITY_VERBS[activity.type] || 'updated';
                const timestamp = formatActivityTime(activity.time);
                const avatarToneClass = getAvatarToneClass(activity.user);
                const activityAccentClass = getActivityAccentClass(activity.type);
                const activityTarget = resolveActivityTarget(activity);
                const resolvedTeamId = activityTarget?.view === 'team-detail'
                  ? activityTarget.params?.teamId
                  : null;

                return (
                  <div
                    key={activity.id || `activity-${index}`}
                    data-testid="dashboard-activity-item"
                    data-activity-team-id={resolvedTeamId || undefined}
                    className={cn(
                      'dashboard-activity-item activity-item-stagger flex w-full cursor-pointer items-start gap-3 rounded-lg border-l-2 px-3 py-3 text-left transition-colors duration-150 focus-ring-control',
                      activityAccentClass
                    )}
                    style={{ '--activity-index': index }}
                    onClick={() => handleActivityItemClick(activity)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleActivityItemClick(activity);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={activity.team ? `Open team ${activity.team}` : 'Open activity details'}
                  >
                    <div data-testid="dashboard-activity-avatar" className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarToneClass}`}>
                      {getInitials(activity.user)}
                    </div>
                    <div className="min-w-0 text-sm leading-5">
                      <p className="text-text-secondary">
                        <span className="font-normal text-text-primary">{activity.user}</span>
                        {' '}
                        <span>{verb}</span>
                        {activity.team ? (
                          <>
                            {' '}
                            <span className="font-normal text-text-primary">{activity.team}</span>
                          </>
                        ) : null}
                      </p>
                      <p className="text-xs text-text-muted">{timestamp}</p>
                    </div>
                  </div>
                );
              })}

              <div className="dashboard-card-footer mt-3 border-t border-arena-border pt-3">
                <button
                  type="button"
                  data-testid="dashboard-view-all-activity"
                  className="dashboard-inline-link text-sm font-medium"
                  onClick={() => onNavigate?.('marketplace', { tab: 'teams' })}
                >
                  View all activity
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2" data-testid="dashboard-at-a-glance">
          <div className="dashboard-main-card rounded-xl border border-arena-border bg-arena-card p-0 shadow-sm">
            <div className="dashboard-card-header">
              <p className="dashboard-card-label">Event Pulse</p>
            </div>
            <div className="dashboard-card-body-no-bottom">
              <ul
                className="overflow-hidden rounded-lg border border-arena-border"
                data-testid="dashboard-event-pulse-list"
                aria-label="Event statistics"
              >
                <li className="dashboard-metric-row dashboard-metric-row--divided flex items-center justify-between px-3 py-2">
                  <span className="dashboard-event-pulse-label text-sm font-normal">Participants</span>
                  <span data-testid="dashboard-event-pulse-value" className="dashboard-event-pulse-number text-lg font-semibold">{stats.participants}</span>
                </li>
                <li className="dashboard-metric-row dashboard-metric-row--divided flex items-center justify-between px-3 py-2">
                  <span className="dashboard-event-pulse-label text-sm font-normal">Free Agents</span>
                  <span data-testid="dashboard-event-pulse-value" className="dashboard-event-pulse-number text-lg font-semibold">{stats.freeAgents}</span>
                </li>
                <li className="dashboard-metric-row dashboard-metric-row--divided flex items-center justify-between px-3 py-2">
                  <span className="dashboard-event-pulse-label text-sm font-normal">Teams</span>
                  <span data-testid="dashboard-event-pulse-value" className="dashboard-event-pulse-number text-lg font-semibold">{stats.teams}</span>
                </li>
                <li className="dashboard-metric-row flex items-center justify-between px-3 py-2">
                  <span className="dashboard-event-pulse-label text-sm font-normal">Submissions</span>
                  <span data-testid="dashboard-event-pulse-value" className="dashboard-event-pulse-number text-lg font-semibold">{stats.submissions}</span>
                </li>
              </ul>
            </div>

            <div className="dashboard-coming-up-divider mt-4 border-t px-5 pt-4">
              <p className="dashboard-card-label pb-2">Coming Up</p>
              <ul className="relative space-y-3 pl-2" data-testid="dashboard-coming-up-list">
                {comingUpMilestones.length > 1 && (
                  <span aria-hidden className="timeline-line pointer-events-none absolute bottom-3 left-[1.35rem] top-3 w-px" />
                )}

                {comingUpMilestones.map((milestone, index) => (
                  <li key={milestone.id} data-testid="dashboard-coming-up-item" className="relative flex items-center gap-3 pl-4">
                    <span
                      data-testid="dashboard-coming-up-badge"
                      className={`relative z-10 inline-flex min-w-12 items-center justify-center rounded-md border px-2 py-1 text-[11px] font-semibold ${
                        index === 0
                          ? 'border-teal-500 bg-teal-500 text-white shadow-sm shadow-teal-500/20'
                          : 'dashboard-coming-up-badge--future'
                      }`}
                    >
                      {formatDayMonth(milestone.startTime)}
                    </span>
                    <span className="text-sm text-text-secondary">{milestone.title}</span>
                  </li>
                ))}
              </ul>

              <div className="dashboard-card-footer mt-3 border-t border-arena-border pt-3">
                <button
                  type="button"
                  data-testid="dashboard-view-full-schedule"
                  className="dashboard-inline-link text-sm font-medium"
                  onClick={() => onNavigate?.('schedule')}
                >
                  View full schedule →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="pt-1" data-testid="dashboard-footer">
        <p className="dashboard-meta-text text-xs font-normal">
          Last updated {new Date(dataLoadedAt).toLocaleString()}
        </p>
      </footer>

      {/* Diagnostic values for tests */}
      <span className="sr-only" data-testid="dashboard-phase-label">{PHASE_LABELS[eventPhase] || eventPhase}</span>
    </div>
  );
}

export default memo(Dashboard);
