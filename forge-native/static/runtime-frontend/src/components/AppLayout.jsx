/**
 * AppLayout Component
 * Main layout wrapper providing consistent header, sidebar navigation, and footer.
 * Adapted from HD26AI for Forge Custom UI.
 */

import { useState, useEffect, useRef, memo, useCallback, useMemo, useContext } from 'react';
import {
  Clock,
  Users,
  User,
  Calendar,
  Trophy,
  BookOpen,
  Gavel,
  Shield,
  Vote,
  Send,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  UserPlus,
  Wrench,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import NavItem from './shared/NavItem';
import { NotificationCenter } from './shared';
import { Container, HStack } from './layout';
import Avatar from './ui/Avatar';
import PhaseIndicator from './ui/PhaseIndicator';
import { cn } from '../lib/design-system';
import { ThemeStateContext } from '../contexts/ThemeContext';
import { useConfigMode } from '../configMode/ConfigModeContext';
import {
  USER_ROLES,
  EVENT_PHASES,
  getUserLocale,
  getUserTimezone,
  getTimezoneAbbr,
  EVENT_TIMEZONE,
} from '../data/constants';

// ============================================================================
// WAR TIMER - Countdown to event start/end (UK time baseline)
// ============================================================================

const FALLBACK_EVENT_META = Object.freeze({
  name: 'HackDay',
  timezone: EVENT_TIMEZONE,
  startAt: '2026-06-21T09:00:00+01:00',
  endAt: '2026-06-22T17:00:00+01:00',
});

const parseFlexibleDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsedFromNumber = new Date(value);
    if (!Number.isNaN(parsedFromNumber.getTime())) {
      return parsedFromNumber;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{13}$/.test(trimmed)) {
      const parsedEpochMs = new Date(Number(trimmed));
      if (!Number.isNaN(parsedEpochMs.getTime())) {
        return parsedEpochMs;
      }
    }
    if (/^\d{10}$/.test(trimmed)) {
      const parsedEpochSec = new Date(Number(trimmed) * 1000);
      if (!Number.isNaN(parsedEpochSec.getTime())) {
        return parsedEpochSec;
      }
    }
    const parsedFromString = new Date(trimmed);
    if (!Number.isNaN(parsedFromString.getTime())) {
      return parsedFromString;
    }
  }
  return null;
};

const parseDateOrFallback = (value, fallbackValue) => {
  const parsed = parseFlexibleDate(value) || parseFlexibleDate(fallbackValue) || new Date(fallbackValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date(fallbackValue);
};

const resolveEventMeta = (eventMeta = null) => {
  const name = typeof eventMeta?.name === 'string' && eventMeta.name.trim()
    ? eventMeta.name.trim()
    : FALLBACK_EVENT_META.name;
  const timezone = typeof eventMeta?.timezone === 'string' && eventMeta.timezone.trim()
    ? eventMeta.timezone.trim()
    : FALLBACK_EVENT_META.timezone;
  const startAt = parseDateOrFallback(eventMeta?.startAt, FALLBACK_EVENT_META.startAt);
  const endAt = parseDateOrFallback(eventMeta?.endAt, FALLBACK_EVENT_META.endAt);

  return {
    name,
    timezone,
    startAt,
    endAt,
    schedule: eventMeta?.schedule && typeof eventMeta.schedule === 'object' ? eventMeta.schedule : {},
  };
};

const getPhaseCountdownConfig = (eventPhase, schedule = {}) => {
  switch (eventPhase) {
    case 'signup':
      return {
        label: 'until Team Formation begins',
        target: (
          parseFlexibleDate(schedule.teamFormationStartsAt)
          || parseFlexibleDate(schedule.registrationClosesAt)
          || parseFlexibleDate(schedule.hackingStartsAt)
        ),
      };
    case 'team_formation':
      return {
        label: 'until Team Formation closes',
        target: (
          parseFlexibleDate(schedule.teamFormationEndsAt)
          || parseFlexibleDate(schedule.hackingStartsAt)
          || parseFlexibleDate(schedule.submissionDeadlineAt)
        ),
      };
    case 'hacking':
      return {
        label: 'until Submission closes',
        target: (
          parseFlexibleDate(schedule.submissionDeadlineAt)
          || parseFlexibleDate(schedule.votingOpensAt)
        ),
      };
    case 'submission':
      return {
        label: 'until Voting begins',
        target: (
          parseFlexibleDate(schedule.votingOpensAt)
          || parseFlexibleDate(schedule.votingStartsAt)
          || parseFlexibleDate(schedule.votingClosesAt)
        ),
      };
    case 'voting':
      return {
        label: 'until Voting closes',
        target: (
          parseFlexibleDate(schedule.votingClosesAt)
          || parseFlexibleDate(schedule.judgingStartsAt)
          || parseFlexibleDate(schedule.resultsAnnounceAt)
        ),
      };
    case 'judging':
      return {
        label: 'until Results announced',
        target: parseFlexibleDate(schedule.resultsAnnounceAt),
      };
    case 'results':
      return {
        label: 'until Event wrap-up',
        target: null,
      };
    default:
      return {
        label: 'until next phase',
        target: null,
      };
  };
};

const getTimerMeta = (eventMeta, eventPhase) => {
  const resolved = resolveEventMeta(eventMeta);
  const phaseConfig = getPhaseCountdownConfig(eventPhase, resolved.schedule);
  const targetDate = phaseConfig.target || resolved.startAt;
  const userTimezone = getUserTimezone();
  const userTzAbbr = getTimezoneAbbr();
  const userLocale = getUserLocale();
  const localTargetDate = targetDate.toLocaleDateString(userLocale, {
    timeZone: userTimezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const localTargetTime = new Intl.DateTimeFormat(userLocale, {
    timeZone: userTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(targetDate);

  return {
    eventStart: targetDate,
    eventEnd: resolved.endAt,
    userTzAbbr,
    localTargetDate,
    localTargetTime,
    countdownLabel: phaseConfig.label,
  };
};

const calculateTimeRemaining = (meta) => {
  const now = new Date();

  if (now < meta.eventStart) {
    const diff = meta.eventStart - now;
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let display;
    if (months > 0) {
      display = `${months}mo ${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (days > 0) {
      display = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
      display = `${hours}h ${minutes}m ${seconds}s`;
    }

    return {
      status: 'countdown',
      display,
      label: meta.countdownLabel,
      localTargetDate: meta.localTargetDate,
      localTargetTime: meta.localTargetTime,
      userTzAbbr: meta.userTzAbbr,
    };
  }

  if (now >= meta.eventStart && now < meta.eventEnd) {
    const diff = meta.eventEnd - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { status: 'live', display: `${hours}h ${minutes}m ${seconds}s`, label: '⚡ EVENT LIVE ⚡' };
  }

  return { status: 'ended', display: '0h 0m 0s', label: 'Event Complete' };
};

// Isolated timer component to prevent parent re-renders
const WarTimer = memo(function WarTimer({ eventMeta, eventPhase }) {
  const timerMeta = useMemo(() => getTimerMeta(eventMeta, eventPhase), [eventMeta, eventPhase]);
  const [timeRemaining, setTimeRemaining] = useState(() => calculateTimeRemaining(timerMeta));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(timerMeta));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerMeta]);

  return (
    <div
      className={cn(
        'hidden md:flex items-center gap-3 px-4 py-2 rounded-card border border-arena-border',
        timeRemaining.status === 'live'
          ? 'bg-arena-elevated animate-pulse'
          : 'bg-arena-card'
      )}
      title={timeRemaining.status === 'countdown' && timeRemaining.localTargetDate
        ? `${timeRemaining.label}: ${timeRemaining.localTargetDate} at ${timeRemaining.localTargetTime} (${timeRemaining.userTzAbbr})`
        : undefined
      }
    >
      <Clock className="w-5 h-5 text-text-secondary" />
      <div className="min-w-0">
        <div className="app-header-countdown-value font-mono text-2xl font-bold tracking-wider text-text-primary">
          {timeRemaining.display}
        </div>
        <div className="app-header-countdown-label text-xs font-normal uppercase tracking-wide text-text-secondary truncate">
          {timeRemaining.label}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// THEME TOGGLE
// ============================================================================

const ThemeToggle = memo(function ThemeToggle() {
  const themeState = useContext(ThemeStateContext);
  const { theme, setTheme, resolvedTheme, isSystemTheme } = themeState ?? {};
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const currentTheme = themes.find(t => t.id === theme) || themes[2];
  const CurrentIcon = currentTheme.icon;

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg transition-all',
          'bg-arena-card border border-arena-border',
          'text-text-secondary hover:text-text-primary hover:bg-arena-elevated',
          'focus-ring-control'
        )}
        title={`Theme: ${currentTheme.label}${isSystemTheme ? ` (${resolvedTheme})` : ''}`}
        aria-label="Toggle theme"
      >
        <CurrentIcon className="w-4 h-4" />
      </button>

      {/* Theme dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-36 bg-arena-card border border-arena-border rounded-lg shadow-xl z-[60] py-1 overflow-hidden">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-text-secondary hover:text-text-primary hover:bg-arena-elevated'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{t.label}</span>
                  {isActive && (
                    <span className="ml-auto text-brand">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

const CONFIG_STATUS_LABELS = {
  on_clean: 'Live',
  on_unsaved: 'Unsaved',
  on_draft: 'Draft saved',
  saving: 'Saving',
  publishing: 'Publishing',
  conflict: 'Conflict',
};

const ConfigModeHeaderControl = memo(function ConfigModeHeaderControl() {
  const {
    canEdit,
    isEnabled,
    isDrawerOpen,
    isLoading,
    status,
    toggleConfigMode,
    openDrawer,
    closeDrawer,
  } = useConfigMode();

  if (!canEdit) return null;

  const statusLabel = CONFIG_STATUS_LABELS[status] || 'On';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggleConfigMode}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all',
          'focus-ring-control',
          isEnabled
            ? 'border-teal-300/80 bg-[linear-gradient(135deg,#14b8a6_0%,#0d9488_100%)] text-white shadow-[0_10px_24px_rgba(20,184,166,0.35)] hover:brightness-105'
            : 'border-orange-400/70 bg-[linear-gradient(135deg,#fb923c_0%,#f97316_100%)] text-[#291406] shadow-[0_10px_22px_rgba(249,115,22,0.34)] hover:brightness-105'
        )}
        aria-label="Config Mode"
        title="Toggle Config Mode"
      >
        <Wrench className="h-3.5 w-3.5" />
        <span>{isEnabled ? 'Config On' : 'Config Off'}</span>
        {isLoading && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
        )}
      </button>

      {isEnabled && (
        <>
          <button
            type="button"
            onClick={isDrawerOpen ? closeDrawer : openDrawer}
            className={cn(
              'inline-flex items-center rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all',
              'border-arena-border bg-arena-card text-text-secondary hover:text-text-primary hover:bg-arena-elevated',
              'focus-ring-control'
            )}
            aria-label={isDrawerOpen ? 'Hide Actions' : 'Show Actions'}
          >
            {isDrawerOpen ? 'Hide Actions' : 'Show Actions'}
          </button>
          <span className="hidden rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-500 sm:inline-flex">
            {statusLabel}
          </span>
        </>
      )}
    </div>
  );
});

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const getNavItems = (userRole, eventPhase = 'hacking', user = null, isEventAdmin = false) => {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  // Show Registration nav item until user has completed registration.
  // Registration completion requires name/displayName and at least one skill.
  const userName = user?.name || user?.displayName;
  const hasCompletedRegistration = Boolean(user && userName && user.skills && user.skills.length > 0);
  const showSignup = !hasCompletedRegistration;
  
  if (showSignup) {
    baseItems.push({ id: 'signup', label: 'Signup', icon: UserPlus, highlight: 'signup' });
  }

  baseItems.push(
    { id: 'new-to-hackday', label: 'New to HackDay?', icon: Sparkles },
    { id: 'marketplace', label: 'Hack Ideas & Teams', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'rules', label: 'Rules', icon: BookOpen },
  );
  if (eventPhase === 'hacking' || eventPhase === 'submission') {
    baseItems.push({ id: 'submission', label: 'Submission', icon: Send });
  }

  const permissions = USER_ROLES[userRole] || USER_ROLES.participant;
  const canManage = permissions.canManage || isEventAdmin;

  if (permissions.canVote && eventPhase === 'voting') {
    baseItems.push({ id: 'voting', label: 'Voting', icon: Vote });
  }

  if (permissions.canJudge) {
    baseItems.push({ id: 'judge-scoring', label: 'Judging', icon: Gavel, highlight: 'amber' });
  }

  if (canManage) {
    baseItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield, highlight: 'purple' });
  }

  baseItems.push({ id: 'results', label: 'Results', icon: Trophy });

  return baseItems;
};

// ============================================================================
// COMPONENT
// ============================================================================

function AppLayout({
  user,
  realUserRole,
  teams = [],
  onNavigate,
  eventPhase = 'signup',
  activeNav = 'dashboard',
  children,
  showSidebar = true,
  isDevMode = false,
  devRoleOverride = null,
  onDevRoleChange = null,
  onPhaseChange = null,
  eventPhases = EVENT_PHASES,
  accountId = null,
  eventMeta = null,
  isMacroHost = false,
  showTeamContextInHeader = true,
  isEventAdmin = false,
  useAdaptavistLogo = false,
  showOpenAppViewCta = false,
  onOpenAppView = null,
  openingAppView = false,
  openAppViewError = null,
}) {
  const [devControlsOpen, setDevControlsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const mobileNavScrollRef = useRef(null);
  const mobileNavItemRefs = useRef(new Map());
  const [mobileNavOverflow, setMobileNavOverflow] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const contentContainerSize = isMacroHost ? 'full' : 'xl';
  const isEmbeddedContext = typeof window !== 'undefined' && window.parent !== window;
  const shouldUseViewportMinHeight = !isMacroHost && !isEmbeddedContext;
  const layoutShellClass = shouldUseViewportMinHeight
    ? 'min-h-screen overflow-x-clip'
    : (isMacroHost ? 'min-h-0 overflow-visible' : 'min-h-0 overflow-x-clip');

  // DEV MODE - Always visible when dev mode is active.
  // In non-dev mode, only real admins can see controls.
  const isRealAdmin = (realUserRole || user?.role) === 'admin';
  const showDevControls = isDevMode || isRealAdmin;
  const devModeActive = showDevControls && (devRoleOverride || isDevMode);

  // Memoize expensive calculations
  const captainedTeam = useMemo(() =>
    teams.find((team) => team.captainId === user?.id),
    [teams, user?.id]
  );

  const userTeam = useMemo(() =>
    teams.find((team) =>
      team.captainId === user?.id ||
      team.members?.some(m => m.id === user?.id)
    ),
    [teams, user?.id]
  );

  const userCallsign = user?.callsign || userTeam?.members?.find(m => m.id === user?.id)?.callsign;

  const effectiveRole = devRoleOverride || user?.role || 'participant';
  const navItems = useMemo(() => getNavItems(effectiveRole, eventPhase, user, isEventAdmin), [effectiveRole, eventPhase, user, isEventAdmin]);

  const handleNavClick = useCallback((itemId) => {
    onNavigate(itemId);
  }, [onNavigate]);

  const setMobileNavItemRef = useCallback((itemId, element) => {
    if (element) {
      mobileNavItemRefs.current.set(itemId, element);
    } else {
      mobileNavItemRefs.current.delete(itemId);
    }
  }, []);

  const updateMobileNavOverflow = useCallback(() => {
    const scrollContainer = mobileNavScrollRef.current;
    if (!scrollContainer) {
      setMobileNavOverflow({ canScrollLeft: false, canScrollRight: false });
      return;
    }

    const tolerance = 2;
    const canScrollLeft = scrollContainer.scrollLeft > tolerance;
    const canScrollRight = (
      scrollContainer.scrollLeft + scrollContainer.clientWidth
      < scrollContainer.scrollWidth - tolerance
    );

    setMobileNavOverflow({ canScrollLeft, canScrollRight });
  }, []);

  const scrollMobileNav = useCallback((direction) => {
    const scrollContainer = mobileNavScrollRef.current;
    if (!scrollContainer) return;

    const step = Math.max(120, Math.round(scrollContainer.clientWidth * 0.6));
    scrollContainer.scrollBy({
      left: direction * step,
      behavior: 'smooth',
    });
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!accountId || isDevMode) {
      setNotifications([]);
      setNotificationUnreadCount(0);
      return;
    }

    try {
      setNotificationLoading(true);
      const { invoke } = await import('@forge/bridge');
      const result = await invoke('getUserNotifications', {});
      if (result && !result.error) {
        setNotifications(result.notifications || []);
        setNotificationUnreadCount(result.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotificationLoading(false);
    }
  }, [accountId, isDevMode]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!accountId || isDevMode) return undefined;
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [accountId, isDevMode, loadNotifications]);

  useEffect(() => {
    const scrollContainer = mobileNavScrollRef.current;
    if (!scrollContainer) return undefined;

    const onScroll = () => updateMobileNavOverflow();
    const onResize = () => updateMobileNavOverflow();

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    updateMobileNavOverflow();

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [updateMobileNavOverflow, navItems.length]);

  useEffect(() => {
    const scrollContainer = mobileNavScrollRef.current;
    const activeElement = mobileNavItemRefs.current.get(activeNav);
    if (!scrollContainer || !activeElement) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const itemRect = activeElement.getBoundingClientRect();
    const targetDelta = itemRect.left - containerRect.left - ((containerRect.width - itemRect.width) / 2);

    scrollContainer.scrollTo({
      left: scrollContainer.scrollLeft + targetDelta,
      behavior: 'smooth',
    });
  }, [activeNav, navItems.length]);

  const handleMarkNotificationAsRead = useCallback(async (notificationId) => {
    if (!accountId || isDevMode) return;
    try {
      const { invoke } = await import('@forge/bridge');
      await invoke('markNotificationAsRead', { notificationId });
      setNotifications((prev) => prev.map((n) => (
        n.id === notificationId ? { ...n, read: true } : n
      )));
      setNotificationUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      loadNotifications();
    }
  }, [accountId, isDevMode, loadNotifications]);

  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    if (!accountId || isDevMode) return;
    try {
      const { invoke } = await import('@forge/bridge');
      await invoke('markAllNotificationsAsRead', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotificationUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      loadNotifications();
    }
  }, [accountId, isDevMode, loadNotifications]);

  return (
    <div
      className={cn(
        layoutShellClass,
        'bg-arena-bg text-text-primary'
      )}
    >
      {/* Skip Link for Keyboard Navigation */}
      <a href="#main-content" className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-brand focus:text-white focus:px-4 focus:py-2 focus:rounded">
        Skip to main content
      </a>

      {/* DEV MODE BANNER */}
      {devModeActive && (
        <div className={cn(
          'bg-yellow-500 text-black px-4 py-1 text-center text-xs font-bold z-50',
          isMacroHost ? 'relative' : 'sticky top-0'
        )}>
          🔧 DEVELOPMENT MODE ACTIVE - Testing with real data
        </div>
      )}

      {/* STICKY HEADER + EVENT BAR CONTAINER */}
      <div className={cn(
        'z-40 bg-arena-bg',
        isMacroHost ? 'relative' : (devModeActive ? 'sticky top-[24px]' : 'sticky top-0')
      )}>
        <Container size={contentContainerSize} padding="md">
          {/* HEADER */}
          <header className="py-4 mb-2">
            <HStack justify="between" align="center">
              {/* Logo */}
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="flex items-center flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
              >
                {useAdaptavistLogo ? (
                  <img
                    src="./adaptlogo.png"
                    alt="Adaptavist"
                    className="h-12 sm:h-16 w-auto header-logo"
                  />
                ) : (
                  <>
                    <img
                      src="./hd-text.png"
                      alt="HackDay"
                      className="h-12 sm:h-16 w-auto logo-dark-mode"
                    />
                    <img
                      src="./hd-text-dark.png"
                      alt="HackDay"
                      className="h-12 sm:h-16 w-auto logo-light-mode"
                    />
                  </>
                )}
              </button>

              {/* War Timer */}
              <WarTimer eventMeta={eventMeta} eventPhase={eventPhase} />

              {showOpenAppViewCta && onOpenAppView && (
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="button"
                    onClick={onOpenAppView}
                    disabled={openingAppView}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all',
                      'focus-ring-control',
                      openingAppView
                        ? 'cursor-wait border-arena-border bg-arena-card text-text-muted'
                        : 'border-teal-400/60 bg-teal-500/10 text-teal-500 hover:bg-teal-500/20'
                    )}
                    title="Open this HackDay in the app shell view"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{openingAppView ? 'Opening...' : 'Open App View'}</span>
                  </button>
                  {openAppViewError && (
                    <p className="max-w-[14rem] text-[11px] font-medium text-error">{openAppViewError}</p>
                  )}
                </div>
              )}

              {/* DEV MODE TOGGLE - Always visible for real admins (even when impersonating) */}
              {isRealAdmin && (
                <div className="relative z-[60]">
                  <button
                    type="button"
                    onClick={() => setDevControlsOpen(!devControlsOpen)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all',
                      'focus-ring-control',
                      devModeActive
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                        : 'bg-arena-card border border-arena-border text-text-secondary hover:text-text-primary'
                    )}
                    title="Dev Controls"
                  >
                    <Wrench className="w-3 h-3" />
                    <span className="hidden sm:inline">DEV</span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform', devControlsOpen && 'rotate-180')} />
                  </button>

                  {/* Dev Controls Dropdown */}
                  {devControlsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[55]"
                        onClick={() => setDevControlsOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-64 bg-arena-card border-2 border-yellow-500 rounded-lg shadow-xl z-[60] p-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-arena-border">
                            <Wrench className="w-5 h-5 text-yellow-500" />
                            <span className="font-bold text-text-primary">Dev Controls</span>
                          </div>

                          {/* Role Impersonation */}
                          {onDevRoleChange && (
                            <div>
                              <label className="text-xs font-bold text-text-muted mb-2 block">
                                Role Impersonation
                              </label>
                              <select
                                value={devRoleOverride || realUserRole || user?.role || 'participant'}
                                onChange={(e) => {
                                  const newRole = e.target.value;
                                  const realRole = realUserRole || user?.role || 'participant';
                                  onDevRoleChange?.(newRole === realRole ? null : newRole);
                                }}
                                className="w-full px-3 py-2 bg-arena-elevated border border-arena-border rounded text-text-primary text-sm focus-ring-control"
                              >
                                <option value={realUserRole || user?.role || 'participant'}>
                                  Real: {realUserRole || user?.role || 'participant'}
                                </option>
                                <option value="participant_guest">Participant - Needs Signup</option>
                                <option value="participant_no_team">Participant - Registered, No Team</option>
                                <option value="participant">Participant - Team Member</option>
                                <option value="participant_captain">Participant - Team Captain</option>
                                <option disabled>──────── Elevated Roles ────────</option>
                                <option value="ambassador">Ambassador</option>
                                <option value="judge">Judge</option>
                                <option value="admin">Admin</option>
                                <option value="owner_jonmort">Owner (Jon Mort)</option>
                              </select>
                              {devRoleOverride && (
                                <p className="mt-1 text-xs text-yellow-500">
                                  Impersonating: {devRoleOverride}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Phase Switcher */}
                          {onPhaseChange && (
                            <div>
                              <label className="text-xs font-bold text-text-muted mb-2 block">
                                Event Phase
                              </label>
                              <select
                                value={eventPhase}
                                onChange={(e) => {
                                  onPhaseChange(e.target.value);
                                  setDevControlsOpen(false);
                                }}
                                className="w-full px-3 py-2 bg-arena-elevated border border-arena-border rounded text-text-primary text-sm focus-ring-control"
                              >
                                {Object.entries(eventPhases).map(([key, phase]) => (
                                  <option key={key} value={key}>{phase.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Notification Center */}
              <NotificationCenter
                notifications={notifications}
                unreadCount={notificationUnreadCount}
                loading={notificationLoading}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                onNavigate={onNavigate}
              />

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Config Mode Controls */}
              <ConfigModeHeaderControl />

              {/* User Quick Access */}
              <div className="relative z-50">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className={cn(
                    'bg-arena-card border border-arena-border flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl cursor-pointer',
                    'transition-all duration-300 group',
                    'hover:-translate-y-0.5',
                    'focus-ring-control'
                  )}
                >
                  {/* Team info - hidden on mobile */}
                  {showTeamContextInHeader && userTeam && (
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shadow-lg bg-arena-elevated">
                        <Users className="w-5 h-5 text-text-secondary" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-text-primary text-sm">
                          {userTeam.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {captainedTeam ? 'Team Captain' : 'Team Member'}
                        </p>
                      </div>
                      <div className="hidden lg:block h-10 w-px bg-arena-border/50 mx-1" />
                    </div>
                  )}

                  {/* User avatar + name */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar user={user} size="md" />
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-text-primary text-sm">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {user?.role && user.role !== 'participant'
                          ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}${userCallsign ? ` · ${userCallsign}` : ''}`
                          : (userCallsign || (userTeam ? 'Team Member' : 'Free Agent'))}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className={cn(
                    'w-5 h-5 text-text-secondary transition-transform',
                    profileMenuOpen && 'rotate-90'
                  )} />
                </button>

                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-arena-card border border-arena-border rounded-xl shadow-xl z-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-arena-elevated transition-colors"
                      >
                        Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
            </HStack>
          </header>

          <div className="rounded-xl sm:rounded-2xl lg:rounded-[1.75rem] border border-arena-border bg-arena-card overflow-hidden">
            {/* PRIMARY NAVIGATION */}
            {showSidebar && (
              <div className="border-b border-arena-border px-2 sm:px-4 py-2.5">
                <nav aria-label="Primary navigation" className="flex items-center gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div
                      className="hidden xl:grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${Math.max(navItems.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {navItems.map((item) => (
                        <NavItem
                          key={item.id}
                          active={activeNav === item.id}
                          highlight={item.highlight}
                          onClick={() => handleNavClick(item.id)}
                          variant="horizontal"
                          className="w-full justify-center"
                        >
                          {item.label}
                        </NavItem>
                      ))}
                    </div>

                    <div className="relative xl:hidden">
                      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[var(--surface-primary)] to-transparent z-10" />
                      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[var(--surface-primary)] to-transparent z-10" />
                      <button
                        type="button"
                        aria-label="Scroll navigation left"
                        onClick={() => scrollMobileNav(-1)}
                        className={cn(
                          'absolute left-0.5 top-1/2 -translate-y-1/2 z-20 h-6.5 w-6.5 rounded-full',
                          'border border-arena-border bg-arena-card backdrop-blur-sm',
                          'inline-flex items-center justify-center transition-all',
                          'focus-ring-control',
                          mobileNavOverflow.canScrollLeft
                            ? 'opacity-100'
                            : 'opacity-0 pointer-events-none'
                        )}
                      >
                        <ChevronLeft className="w-4 h-4 text-text-secondary" />
                      </button>
                      <button
                        type="button"
                        aria-label="Scroll navigation right"
                        onClick={() => scrollMobileNav(1)}
                        className={cn(
                          'absolute right-0.5 top-1/2 -translate-y-1/2 z-20 h-6.5 w-6.5 rounded-full',
                          'border border-arena-border bg-arena-card backdrop-blur-sm',
                          'inline-flex items-center justify-center transition-all',
                          'focus-ring-control',
                          mobileNavOverflow.canScrollRight
                            ? 'opacity-100'
                            : 'opacity-0 pointer-events-none'
                        )}
                      >
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                      </button>
                      <div
                        ref={mobileNavScrollRef}
                        className="overflow-x-auto scrollbar-hide px-7 sm:px-8 scroll-smooth"
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5 w-max pr-10 sm:pr-12">
                          {navItems.map((item) => (
                            <NavItem
                              key={item.id}
                              ref={(element) => setMobileNavItemRef(item.id, element)}
                              active={activeNav === item.id}
                              highlight={item.highlight}
                              onClick={() => handleNavClick(item.id)}
                              variant="horizontal"
                              className="snap-start"
                            >
                              {item.label}
                            </NavItem>
                          ))}
                        </div>
                      </div>
                      {mobileNavOverflow.canScrollRight && (
                        <p className="mt-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted/80">
                          Swipe for more
                        </p>
                      )}
                    </div>
                  </div>
                </nav>
              </div>
            )}

            {/* EVENT STATUS BAR - Phase Timeline */}
            <div className="relative px-0 py-0">
              {/* Dev mode hint */}
              {devModeActive && onPhaseChange && (
                <div className="hidden lg:flex absolute right-2 top-0.5 flex-col items-end leading-tight pointer-events-none">
                  <span className="text-[9px] text-yellow-500/85 font-semibold uppercase tracking-wide">
                    Dev Mode
                  </span>
                  <span className="text-[9px] text-yellow-500/85 font-medium">
                    Click phase to switch
                  </span>
                </div>
              )}
              {/* Mobile: Compact phase indicator */}
              <div className="sm:hidden px-3 py-1.5">
                <PhaseIndicator
                  phases={eventPhases}
                  currentPhase={eventPhase}
                  onPhaseClick={devModeActive && onPhaseChange ? onPhaseChange : undefined}
                  compact
                  className="w-full"
                />
              </div>

              {/* Desktop: Full animated phase timeline */}
              <div className="hidden sm:block">
                <PhaseIndicator
                  phases={eventPhases}
                  currentPhase={eventPhase}
                  onPhaseClick={devModeActive && onPhaseChange ? onPhaseChange : undefined}
                  ultraCompact
                />
              </div>
            </div>
          </div>
        </Container>
      </div>
      {/* END STICKY HEADER + EVENT BAR CONTAINER */}

      {/* MAIN LAYOUT */}
      <Container size={contentContainerSize} padding="none">
        {/* MAIN CONTENT */}
        <main
          id="main-content"
          className={cn('flex-1', showSidebar && shouldUseViewportMinHeight && 'min-h-[calc(100vh-200px)]')}
          tabIndex={-1}
        >
          {children}
        </main>
      </Container>

      {/* Footer */}
      <footer className="border-t border-arena-border px-4 sm:px-6 py-4 bg-arena-bg mt-6">
        <Container size={contentContainerSize} padding="none">
          <HStack justify="between" className="text-xs text-text-muted">
            <span>MISSION CONTROL v2.0 - Custom UI</span>
          </HStack>
        </Container>
      </footer>
    </div>
  );
}

export default memo(AppLayout);
