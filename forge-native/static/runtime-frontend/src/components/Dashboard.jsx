/**
 * Dashboard Page - participant-first mission control view.
 */

import { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from './ui';
import {
  EVENT_PHASE_ORDER,
  EVENT_PHASES,
  getUserLocale,
} from '../data/constants';
import {
  computeUserState,
  getMissionContent,
} from '../lib/missionBriefContent';
import { EditorialHeroCard, EditorialTimeline, EditorialStatGrid, EditorialRightRail } from './dashboard/index.js';
import { hasCompletedRegistration } from '../lib/registrationState';
import EditableText from '../configMode/EditableText';
import EditableTextArea from '../configMode/EditableTextArea';
import { useConfigMode } from '../configMode/ConfigModeContext';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import PainPointsSection from './PainPointsSection';

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

function buildMyProgressModel({ eventPhase, userTeam, hasSubmitted, phaseEndDate, isRegisteredUser }) {
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

  if (eventPhase === 'signup' && !isRegisteredUser) {
    return {
      teamStatus: 'no_team',
      submissionReady: false,
      deadlineRisk,
      nextActionLabel: 'Sign Up Now',
      nextActionRoute: 'signup',
      nextActionParams: {},
    };
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

// CORE UX IMPROVEMENT 3 — Compute daily deltas from createdAt timestamps
function useDailyDeltas(registrations, teams) {
  return useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const newParticipantsToday = (registrations || []).filter((r) => {
      const ts = r.createdAt ? new Date(r.createdAt) : null;
      return ts && !Number.isNaN(ts.getTime()) && ts >= todayStart;
    }).length;

    const newTeamsToday = (teams || []).filter((t) => {
      const ts = t.createdAt ? new Date(t.createdAt) : null;
      return ts && !Number.isNaN(ts.getTime()) && ts >= todayStart;
    }).length;

    return { newParticipantsToday, newTeamsToday };
  }, [registrations, teams]);
}

// ============================================================================
// INLINE SUB-COMPONENTS
// ============================================================================

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
  eventBranding = {},
  onNavigate,
  onTrackEvent,
  devRoleOverride,
  useAdaptavistLogo = false,
  eventMeta = null,
  appModeResolverPayload = null,
  allUsers = null,
  bootstrapActivityFeed = null,
  bootstrapSchedule = null,
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
            { id: 'dev-user-1', name: 'Maya Rodriguez', isFreeAgent: false, createdAt: new Date().toISOString() },
            { id: 'dev-user-2', name: 'Jordan Lee', isFreeAgent: false, createdAt: new Date().toISOString() },
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

      // Use bootstrap data when available; only fetch what's missing.
      const hasBootstrapActivity = bootstrapActivityFeed != null;
      const hasBootstrapSchedule = bootstrapSchedule != null;
      const hasBootstrapRegistrations = allUsers != null && allUsers.length > 0;

      if (hasBootstrapActivity && hasBootstrapSchedule && hasBootstrapRegistrations) {
        setData({
          registrations: allUsers,
          activities: bootstrapActivityFeed?.activities || [],
          scheduleMilestones: bootstrapSchedule?.milestones || [],
        });
        setDataLoadedAt(new Date().toISOString());
        setLoading(false);
        return;
      }

      try {
        const { invoke } = await import('@forge/bridge');

        const resolverCalls = [];
        if (!hasBootstrapRegistrations) {
          resolverCalls.push({
            key: 'registrations',
            promise: invokeEventScopedResolver(invoke, 'getRegistrations', appModeResolverPayload),
          });
        }
        if (!hasBootstrapActivity) {
          resolverCalls.push({
            key: 'activity',
            promise: invokeEventScopedResolver(invoke, 'getActivityFeed', appModeResolverPayload, { limit: 20 }),
          });
        }
        if (!hasBootstrapSchedule) {
          resolverCalls.push({
            key: 'schedule',
            promise: invokeEventScopedResolver(invoke, 'getSchedule', appModeResolverPayload),
          });
        }

        const settled = await Promise.allSettled(resolverCalls.map((entry) => entry.promise));
        const resultsByKey = resolverCalls.reduce((acc, entry, index) => {
          acc[entry.key] = settled[index];
          return acc;
        }, {});

        const registrations = hasBootstrapRegistrations
          ? allUsers
          : (resultsByKey.registrations?.status === 'fulfilled'
            ? (resultsByKey.registrations.value?.registrations || [])
            : []);

        const activities = hasBootstrapActivity
          ? (bootstrapActivityFeed?.activities || [])
          : (resultsByKey.activity?.status === 'fulfilled'
            ? (resultsByKey.activity.value?.activities || [])
            : []);

        const scheduleMilestones = hasBootstrapSchedule
          ? (bootstrapSchedule?.milestones || [])
          : (resultsByKey.schedule?.status === 'fulfilled'
            ? (resultsByKey.schedule.value?.milestones || [])
            : []);

        setData({ registrations, activities, scheduleMilestones });
        setDataLoadedAt(new Date().toISOString());

        const failures = Object.values(resultsByKey).filter((result) => result?.status === 'rejected').length;
        if (resolverCalls.length > 0 && failures === resolverCalls.length) {
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
  }, [appModeResolverPayload, user?.role, allUsers, bootstrapActivityFeed, bootstrapSchedule]);

  // Track if reminder check has been done this session
  const reminderCheckDone = useRef(false);

  const heroBannerImageUrl = (() => {
    const fallback = typeof eventBranding?.bannerImageUrl === 'string' ? eventBranding.bannerImageUrl : '';
    const next = configMode?.getFieldValue?.('branding.bannerImageUrl', fallback);
    return typeof next === 'string' ? next.trim() : '';
  })();
  const heroIconImageUrl = (() => {
    const fallback = typeof eventBranding?.heroIconImageUrl === 'string' ? eventBranding.heroIconImageUrl : '';
    const next = configMode?.getFieldValue?.('branding.heroIconImageUrl', fallback);
    return typeof next === 'string' ? next.trim() : '';
  })();
  const heroLogoSrc = heroIconImageUrl || './hackday-icon.png';
  const heroLogoAlt = heroIconImageUrl ? 'HackDay hero icon' : 'HackDay';

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
        await invokeEventScopedResolver(
          invoke,
          'checkFreeAgentReminders',
          appModeResolverPayload,
          {}
        );
      } catch (err) {
        console.error('[Dashboard] Error checking reminders:', err);
      }
    };

    checkReminders();
  }, [appModeResolverPayload, user, teams, eventPhase]);

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

  // CORE UX IMPROVEMENT 3 — Dynamic trends from real createdAt timestamps
  const dailyDeltas = useDailyDeltas(data?.registrations, teams);

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

  const isRegisteredUser = useMemo(() => {
    return hasCompletedRegistration(user);
  }, [user]);

  const myProgress = useMemo(
    () => buildMyProgressModel({
      eventPhase,
      userTeam,
      hasSubmitted,
      phaseEndDate,
      isRegisteredUser,
    }),
    [eventPhase, userTeam, hasSubmitted, phaseEndDate, isRegisteredUser]
  );

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

  const hackingCountdownText = useMemo(() => {
    if (eventPhase !== 'hacking') return null;
    if (!phaseEndDate) return null;
    const relative = formatRelativeWindow(phaseEndDate);
    if (!relative) return null;
    const suffix = relative === 'Live now' ? 'ending now' : relative.replace(/^In\s/, 'in ');
    return `Hacking ends ${suffix}`;
  }, [eventPhase, phaseEndDate]);

  const hackingStartText = useMemo(() => {
    if (eventPhase !== 'team_formation') return null;
    const hackingMilestone = scheduleMilestones.find((m) => m.phase === 'hacking');
    if (!hackingMilestone?.startTime) return null;
    const date = parseIsoTimestamp(hackingMilestone.startTime);
    if (!date) return null;
    const datePart = date.toLocaleDateString(getUserLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timePart = date.toLocaleTimeString(getUserLocale(), { hour: '2-digit', minute: '2-digit' });
    return `Hacking starts: ${datePart} ${timePart}`;
  }, [eventPhase, scheduleMilestones]);

  const teamReadiness = TEAM_STATUS_META[myProgress.teamStatus] || TEAM_STATUS_META.incomplete;

  const submissionReadiness = useMemo(() => {
    // Submission isn't open yet — don't flag it as a warning
    if (isEarlyExecutionPhase) {
      return {
        label: 'Not open',
        tone: 'gray',
        detail: 'Submission opens when hacking begins.',
      };
    }

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
  }, [myProgress.submissionReady, myProgress.deadlineRisk, hasSubmitted, eventPhase, isEarlyExecutionPhase]);

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

  // QUICK WIN 3: "Next Best Action" — hyper-personalised copy + route
  const nextBestAction = useMemo(() => {
    if (!isRegisteredUser) {
      return { label: 'Complete sign-up to join a team', route: 'signup', params: {} };
    }
    if (!userTeam && isEarlyExecutionPhase) {
      return { label: 'Browse ideas and find your team', route: 'marketplace', params: { tab: 'teams' } };
    }
    if (userTeam && profileReadiness.tone !== 'green') {
      return { label: 'Add your skills to complete your profile', route: 'profile', params: {} };
    }
    if (submissionReadiness.tone === 'amber' && (eventPhase === 'hacking' || eventPhase === 'submission')) {
      return { label: 'Start your submission before time runs out', route: 'submission', params: {} };
    }
    if (readinessCompleteCount === readinessTotalCount) {
      return { label: "You're all set — explore the marketplace", route: 'marketplace', params: {} };
    }
    return { label: 'View the full schedule', route: 'schedule', params: {} };
  }, [isRegisteredUser, userTeam, isEarlyExecutionPhase, profileReadiness, submissionReadiness, eventPhase, readinessCompleteCount, readinessTotalCount]);

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
  const isCreatedHackDay = useAdaptavistLogo;
  const heroTitleFallback = useMemo(
    () => (
      isCreatedHackDay && eventMeta?.name?.trim()
        ? eventMeta.name.trim()
        : (missionContent.headline || 'Mission status')
    ),
    [isCreatedHackDay, eventMeta?.name, missionContent.headline]
  );
  const heroSubtitlePrimaryFallback = useMemo(
    () => (
      isCreatedHackDay && eventMeta?.tagline?.trim()
        ? eventMeta.tagline.trim()
        : 'Turn friction into projects. Post a real problem, attract collaborators, and shape your approach before hacking starts.'
    ),
    [isCreatedHackDay, eventMeta?.tagline]
  );
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

  // ── Editorial metric text helpers ──────────────────────────────────────────
  const activeMetaText = eventPhase === 'hacking' && hackingCountdownText
    ? hackingCountdownText
    : eventPhase === 'team_formation' && hackingStartText
      ? hackingStartText
      : countdownText;

  return (
    <div className="space-y-6 pt-5 pb-1" data-testid="dashboard">

      <OwnerWelcomeModal
        isOpen={showOwnerWelcome}
        onClose={handleOwnerWelcomeDismiss}
        ownerName={user?.name || user?.displayName || 'Jon Mort'}
      />

      {/* ====== HERO ====== */}
      <EditorialHeroCard scheduleMilestones={scheduleMilestones}>

        {/* Phase badge */}
        <div data-testid="dashboard-row1-meta">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
            {PHASE_LABELS[eventPhase] || eventPhase}
          </span>
        </div>

        {/* Hero title */}
        <EditableText
          contentKey="dashboard.hero.title"
          fallback={heroTitleFallback}
          as="h1"
          data-testid="dashboard-hero-headline"
          displayClassName="mt-4 text-5xl font-semibold tracking-tight text-white lg:text-7xl"
          style={{ fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}
        />

        {/* Hero subtitle */}
        <EditableTextArea
          contentKey="dashboard.hero.subtitlePrimary"
          fallback={heroSubtitlePrimaryFallback}
          as="p"
          rows={2}
          displayClassName="mt-4 max-w-2xl text-lg leading-7 text-white/70"
        />

        {/* CTAs */}
        <div data-testid="dashboard-hero-next-action" className="mt-6 flex flex-wrap items-center gap-4">
          {!isRegisteredUser && isEarlyExecutionPhase ? (
            <button
              type="button"
              data-testid="dashboard-row1-open-next-step"
              onClick={() => onNavigate?.('signup')}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
            >
              Sign up
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : eventPhase === 'signup' ? (
            <button
              type="button"
              onClick={() => onNavigate?.('marketplace', { tab: 'pains' })}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
            >
              Post a pain point
            </button>
          ) : (
            <button
              type="button"
              data-testid="dashboard-row1-open-next-step"
              onClick={handlePrimaryAction}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
            >
              <span>{nextAction.label}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate?.('marketplace', { tab: 'teams' })}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/5"
          >
            Find a team
          </button>
        </div>

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/45">
          {activeMetaText && (
            <span className="inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <circle cx="12" cy="13" r="8"/><path strokeLinecap="round" d="M12 9v4l2 2M9 3h6"/>
              </svg>
              {activeMetaText}
            </span>
          )}
          {stats.participants > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              {stats.participants.toLocaleString()} participating
            </span>
          )}
        </div>

      </EditorialHeroCard>

      {/* ====== PHASE TIMELINE ====== */}
      <EditorialTimeline eventPhase={eventPhase} scheduleMilestones={scheduleMilestones} />

      {/* ====== STAT GRID ====== */}
      <EditorialStatGrid stats={[
        {
          label: 'Your activity',
          value: teamReadiness.label,
          meta: teamReadiness.detail,
          accent: `${readinessProgressPercent}% complete`,
          testId: 'dashboard-kpi-status',
        },
        {
          label: 'Participants',
          rawValue: stats.participants,
          meta: stats.freeAgents > 0 ? `${stats.freeAgents} unassigned` : null,
          accent: dailyDeltas.newParticipantsToday > 0 ? `+${dailyDeltas.newParticipantsToday} today` : null,
          testId: 'dashboard-kpi-participants',
        },
        {
          label: 'Teams',
          rawValue: stats.teams,
          accent: dailyDeltas.newTeamsToday > 0 ? `+${dailyDeltas.newTeamsToday} today` : 'Forming now',
          testId: 'dashboard-kpi-teams',
        },
        {
          label: 'Submissions',
          rawValue: stats.submissions,
          meta: isEarlyExecutionPhase ? 'Not open yet' : null,
          accent: isEarlyExecutionPhase ? 'Awaiting launch' : null,
          testId: 'dashboard-kpi-submissions',
        },
      ]} />

      {/* ====== MAIN CONTENT GRID ====== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.65fr]" data-testid="dashboard-below-fold">

        {/* LEFT COLUMN — pain points (early phases) or live activity (later phases) */}
        <div>
          {isEarlyExecutionPhase ? (
            <PainPointsSection appModeResolverPayload={appModeResolverPayload} onNavigate={onNavigate} />
          ) : (
            <div
              className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6"
              data-testid="dashboard-live-activity"
            >
              <div className="flex items-center justify-between border-b border-white/8 pb-5">
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Live Activity</div>
                <span data-testid="dashboard-live-indicator" className="flex items-center gap-1.5 text-xs text-white/55">
                  <span data-testid="dashboard-live-indicator-dot" className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {activityFeed.slice(0, 5).map((activity, index) => {
                  const verb = ACTIVITY_VERBS[activity.type] || 'updated';
                  const timestamp = formatActivityTime(activity.time);
                  const activityTarget = resolveActivityTarget(activity);
                  const resolvedTeamId = activityTarget?.view === 'team-detail'
                    ? activityTarget.params?.teamId
                    : null;
                  return (
                    <div
                      key={activity.id || `activity-${index}`}
                      data-testid="dashboard-activity-item"
                      data-activity-team-id={resolvedTeamId || undefined}
                      className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/12 hover:bg-white/[0.04]"
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
                      <div
                        data-testid="dashboard-activity-avatar"
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-[10px] font-semibold text-cyan-300"
                      >
                        {getInitials(activity.user)}
                      </div>
                      <div className="min-w-0 text-sm leading-5">
                        <p className="text-white/70">
                          <span className="font-medium text-white">{activity.user}</span>
                          {' '}
                          <span>{verb}</span>
                          {activity.team ? (
                            <> <span className="font-medium text-white">{activity.team}</span></>
                          ) : null}
                        </p>
                        <p className="text-xs text-white/40">{timestamp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  data-testid="dashboard-view-all-activity"
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
                  onClick={() => onNavigate?.('marketplace', { tab: 'teams' })}
                >
                  View all activity
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <div>
          {/* Announcements / Admin message */}
          {showAdminMessagePod && (
            <div
              className="mb-6 rounded-[26px] border border-white/8 bg-white/[0.03] p-6"
              data-testid="dashboard-admin-message"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Announcements</div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                {(String(configMotdTitle || '').trim() || (configMode.isEnabled && configMode.canEdit)) && (
                  <EditableText
                    contentKey="dashboard.motd.title"
                    fallback={configMotdTitle}
                    as="p"
                    displayClassName="text-xs font-semibold uppercase tracking-wider text-white/45 mb-1"
                    placeholder={configMode.isEnabled ? 'Optional message title' : ''}
                  />
                )}
                <EditableTextArea
                  contentKey="dashboard.motd.message"
                  fallback={configMotdBody}
                  as="p"
                  rows={3}
                  displayClassName="text-sm text-white/70 leading-snug"
                  placeholder={configMode.isEnabled ? 'Set a participant-facing dashboard message' : ''}
                />
              </div>
            </div>
          )}

          <EditorialRightRail
            comingUpMilestones={comingUpMilestones}
            onNavigate={onNavigate}
            readinessItems={readinessItems}
            readinessProgressPercent={readinessProgressPercent}
            nextBestAction={nextBestAction}
            isEarlyExecutionPhase={isEarlyExecutionPhase}
          />
        </div>

      </div>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-white/8 pt-4" data-testid="dashboard-footer">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/35">
            Last updated {new Date(dataLoadedAt).toLocaleString()}
          </p>
          <p className="text-xs text-white/25">HackCentral</p>
        </div>
      </footer>

      {/* Diagnostic values for tests */}
      <span className="sr-only" data-testid="dashboard-phase-label">{PHASE_LABELS[eventPhase] || eventPhase}</span>
    </div>
  );
}

export default memo(Dashboard);
