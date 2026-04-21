/**
 * AppLayout Component
 * Main layout wrapper providing consistent header, sidebar navigation, and footer.
 * Adapted from HD26AI for Forge Custom UI.
 */

import { useState, useEffect, useRef, memo, useCallback, useMemo, useContext } from 'react';
import {
  Users,
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
import Modal from './ui/Modal';
import { cn } from '../lib/design-system';
import { ThemeStateContext } from '../contexts/ThemeContext';
import { useConfigMode } from '../configMode/ConfigModeContext';
import { hasCompletedRegistration } from '../lib/registrationState';
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

const PRE_HACKING_PHASES = new Set(['signup', 'team_formation']);

const getPhaseCountdownConfig = (eventPhase, schedule = {}) => {
  if (!PRE_HACKING_PHASES.has(eventPhase)) {
    return { label: null, target: null };
  }
  return {
    label: 'until hacking starts',
    target: (
      parseFlexibleDate(schedule.hackingStartsAt)
      || parseFlexibleDate(schedule.teamFormationEndsAt)
    ),
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
  if (!PRE_HACKING_PHASES.has(eventPhase)) return null;

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
      className="hidden md:flex flex-col items-center justify-center flex-shrink-0"
      style={{
        padding: '0 20px',
        borderRight: '0.5px solid var(--border-default)',
        ...(timeRemaining.status === 'live' ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {}),
      }}
      title={timeRemaining.status === 'countdown' && timeRemaining.localTargetDate
        ? `${timeRemaining.label}: ${timeRemaining.localTargetDate} at ${timeRemaining.localTargetTime} (${timeRemaining.userTzAbbr})`
        : undefined
      }
    >
      <div className="text-lg font-semibold tabular-nums text-text-primary leading-tight">
        {timeRemaining.display}
      </div>
      <div className="text-[10px] font-normal text-text-muted truncate">
        {timeRemaining.label}
      </div>
    </div>
  );
});

// ============================================================================
// THEME TOGGLE
// ============================================================================

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const getNavItems = (userRole, eventPhase = 'hacking', user = null, isEventAdmin = false) => {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  // Show Registration nav item until user has completed registration.
  const showSignup = !hasCompletedRegistration(user);
  
  if (showSignup) {
    baseItems.push({ id: 'signup', label: 'Signup', icon: UserPlus, highlight: 'signup' });
  }

  baseItems.push(
    { id: 'new-to-hackday', label: 'New to HackDay?', icon: Sparkles },
    { id: 'marketplace', label: 'Teams', icon: Users },
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
  realEventPhase = eventPhase,
  activeNav = 'dashboard',
  children,
  showSidebar = true,
  isDevMode = false,
  onDevModeToggle = null,
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
  const themeState = useContext(ThemeStateContext);
  const { theme: currentTheme, setTheme } = themeState ?? {};
  const configModeControls = useConfigMode();
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

  // Test/simulation controls stay available to event admins even in production.
  // They only affect local UI state unless a real backend admin action is invoked elsewhere.
  const isRealAdmin = (realUserRole || user?.role) === 'admin';
  const canUseDevControls = isDevMode || isRealAdmin || isEventAdmin;
  const devModeActive = canUseDevControls && Boolean(devRoleOverride || isDevMode);

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
          {/* TOPBAR — single compact card (wireframe layout) */}
          <header className="py-3">
            <div className="rounded-xl border border-arena-border bg-arena-card overflow-hidden">
              <div className="flex items-center" style={{ height: 52 }}>

                {/* Logo icon */}
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="flex-shrink-0 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    width: 52,
                    height: 52,
                    background: 'color-mix(in srgb, var(--accent) 50%, #000)',
                    borderRadius: 'var(--radius, 10px) 0 0 var(--radius, 10px)',
                  }}
                >
                  {useAdaptavistLogo ? (
                    <img src="./adaptlogo.png" alt="Adaptavist" className="h-7 w-7 object-contain" />
                  ) : (
                    <img
                      src="./hackday-icon.png"
                      alt="HackDay"
                      className="h-7 w-7 object-contain"
                      style={{ borderRadius: 7, opacity: 0.85 }}
                    />
                  )}
                </button>

                {/* War Timer */}
                <WarTimer eventMeta={eventMeta} eventPhase={eventPhase} />

                {/* Inline nav — xl and above */}
                {showSidebar && (
                  <nav className="hidden xl:flex flex-1 items-center gap-1 px-3 min-w-0" aria-label="Primary navigation">
                    {navItems.map((item) => (
                      <NavItem
                        key={item.id}
                        active={activeNav === item.id}
                        highlight={item.highlight}
                        onClick={() => handleNavClick(item.id)}
                        variant="horizontal"
                      >
                        {item.label}
                      </NavItem>
                    ))}
                  </nav>
                )}

                {/* Spacer when inline nav is hidden */}
                <div className={cn('flex-1', showSidebar && 'xl:hidden')} />
                {!showSidebar && <div className="flex-1" />}

                {/* Notification Center */}
                <div className="flex-shrink-0 px-2">
                  <NotificationCenter
                    notifications={notifications}
                    unreadCount={notificationUnreadCount}
                    loading={notificationLoading}
                    onMarkAsRead={handleMarkNotificationAsRead}
                    onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                    onNavigate={onNavigate}
                  />
                </div>

                {/* User */}
                <div
                  className="relative z-50 flex-shrink-0 flex items-center self-stretch"
                  style={{ borderLeft: '0.5px solid var(--border-default)', padding: '0 14px' }}
                >
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 focus-ring-control"
                  >
                    <Avatar user={user} size="sm" />
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-medium text-text-primary leading-tight">{user?.name || 'User'}</p>
                      <p className="text-[10px] text-text-muted leading-tight">
                        {user?.role && user.role !== 'participant'
                          ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}${captainedTeam ? ' · Team Captain' : ''}`
                          : (captainedTeam ? 'Team Captain' : (userTeam ? 'Team Member' : 'Free Agent'))}
                        {' ▾'}
                      </p>
                    </div>
                  </button>

                  {profileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-arena-card border border-arena-border rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* Profile */}
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

                        {/* Theme */}
                        <div className="border-t border-arena-border px-4 py-2">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Theme</p>
                          <div className="flex gap-1">
                            {[
                              { id: 'light', label: 'Light', Icon: Sun },
                              { id: 'dark', label: 'Dark', Icon: Moon },
                              { id: 'system', label: 'System', Icon: Monitor },
                            ].map(({ id, label, Icon }) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setTheme?.(id)}
                                className={cn(
                                  'flex flex-1 flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-colors',
                                  currentTheme === id
                                    ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                                    : 'border-arena-border text-text-muted hover:text-text-primary hover:bg-arena-elevated'
                                )}
                                title={label}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Config Mode toggle */}
                        {configModeControls.canEdit && (
                          <div className="border-t border-arena-border px-4 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                configModeControls.toggleConfigMode();
                                setProfileMenuOpen(false);
                              }}
                              className={cn(
                                'w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                                configModeControls.isEnabled
                                  ? 'border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                                  : 'border-orange-400/70 bg-orange-500/10 text-orange-400'
                              )}
                            >
                              <Wrench className="h-3.5 w-3.5 shrink-0" />
                              <span>{configModeControls.isEnabled ? 'Config On' : 'Config Off'}</span>
                            </button>
                          </div>
                        )}

                        {/* DEV Controls */}
                        {canUseDevControls && (
                          <div className={cn('px-4 py-2', !configModeControls.canEdit && 'border-t border-arena-border')}>
                            <button
                              type="button"
                              onClick={() => {
                                setProfileMenuOpen(false);
                                setDevControlsOpen(true);
                              }}
                              className={cn(
                                'w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                                devModeActive
                                  ? 'bg-yellow-500 text-black border-yellow-500'
                                  : 'border-arena-border text-text-muted hover:text-text-primary hover:bg-arena-elevated'
                              )}
                            >
                              <Wrench className="h-3.5 w-3.5 shrink-0" />
                              <span>Dev Controls</span>
                              {devModeActive && (
                                <span className="ml-auto rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-bold">ON</span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Open App View CTA — below topbar when present */}
            {showOpenAppViewCta && onOpenAppView && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={onOpenAppView}
                  disabled={openingAppView}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all',
                    'focus-ring-control',
                    openingAppView
                      ? 'cursor-wait border-arena-border bg-arena-card text-text-muted'
                      : 'border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]'
                  )}
                  title="Open this HackDay in the app shell view"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{openingAppView ? 'Opening...' : 'Open App View'}</span>
                </button>
                {openAppViewError && (
                  <p className="text-[11px] font-medium text-error">{openAppViewError}</p>
                )}
              </div>
            )}

            {/* Dev Controls Modal — rendered in tree, trigger is in user dropdown */}
            {canUseDevControls && (
              <Modal
                isOpen={devControlsOpen}
                onClose={() => setDevControlsOpen(false)}
                size="sm"
                title="Dev Controls"
              >
                <div className="space-y-5 p-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-arena-border">
                    <Wrench className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-text-primary">Development Controls</span>
                    {onDevModeToggle && (
                      <button
                        type="button"
                        onClick={onDevModeToggle}
                        className={cn(
                          'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase transition-colors',
                          devModeActive
                            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                            : 'bg-arena-elevated text-text-muted border border-arena-border hover:border-yellow-500 hover:text-yellow-500'
                        )}
                      >
                        {devModeActive ? 'ON' : 'OFF'}
                      </button>
                    )}
                  </div>
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
                  {onPhaseChange && (
                    <div>
                      <label className="text-xs font-bold text-text-muted mb-2 block">
                        Event Phase
                      </label>
                      <select
                        value={realEventPhase}
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
              </Modal>
            )}
          </header>

          {/* Mobile nav — below xl: */}
          {showSidebar && (
            <div className="xl:hidden rounded-xl border border-arena-border bg-arena-card overflow-hidden">
              <div className="px-2 sm:px-4 py-2.5">
                <nav aria-label="Primary navigation" className="flex items-center gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="relative">
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
            </div>
          )}
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
