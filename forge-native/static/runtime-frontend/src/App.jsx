/**
 * HackCentral Runtime UI (v2 host) - Main Application
 * Ported from HD26Forge runtime for staged consolidation.
 */

import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import AppModeContextError from './components/AppModeContextError';
import { ErrorBoundary } from './components/shared';
import { APP_VERSION, EVENT_PHASES, EVENT_TIMEZONE } from './data/constants';
import { ConfigModeProvider } from './configMode/ConfigModeContext';
import ConfigModeOverlays from './configMode/ConfigModeOverlays';

// Log once so you can verify in console that the deployed bundle is current (helps with CDN cache)
if (typeof console !== 'undefined' && console.log) {
  console.log(`[HackCentral Runtime v2] Module loaded - ${APP_VERSION}`);
}

const Profile = lazy(() => import('./components/Profile'));
const Marketplace = lazy(() => import('./components/Marketplace'));
const Schedule = lazy(() => import('./components/Schedule'));
const Rules = lazy(() => import('./components/Rules'));
const NewToHackDay = lazy(() => import('./components/NewToHackDay'));
const Submission = lazy(() => import('./components/Submission'));
const Voting = lazy(() => import('./components/Voting'));
const JudgeScoring = lazy(() => import('./components/JudgeScoring'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Results = lazy(() => import('./components/Results'));
const Signup = lazy(() => import('./components/Signup'));
const TeamDetail = lazy(() => import('./components/TeamDetail'));

const VIEW_TO_PATH = {
  dashboard: '/',
  schedule: '/schedule',
  marketplace: '/marketplace',
  submission: '/submission',
  results: '/results',
  rules: '/rules',
  'new-to-hackday': '/new-to-hackday',
  signup: '/signup',
  voting: '/voting',
  admin: '/admin',
  profile: '/profile',
  'judge-scoring': '/judge-scoring',
};

const PATH_TO_VIEW = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/schedule': 'schedule',
  '/marketplace': 'marketplace',
  '/ideas': 'marketplace',
  '/submission': 'submission',
  '/results': 'results',
  '/rules': 'rules',
  '/new-to-hackday': 'new-to-hackday',
  '/signup': 'signup',
  '/voting': 'voting',
  '/admin': 'admin',
  '/profile': 'profile',
  '/judge-scoring': 'judge-scoring',
};

const normalizePath = (pathname = '/') => {
  const safe = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const trimmed = safe.replace(/\/+$/, '');
  return trimmed || '/';
};

const resolveViewFromLocation = (pathname = '/', search = '') => {
  const normalizedPath = normalizePath(pathname);
  const teamMatch = normalizedPath.match(/^\/team\/([^/]+)$/i);
  if (teamMatch?.[1]) {
    return {
      view: 'team-detail',
      params: { teamId: decodeURIComponent(teamMatch[1]) },
    };
  }

  const view = PATH_TO_VIEW[normalizedPath] || 'dashboard';
  const params = {};

  if (view === 'marketplace' && search) {
    const query = new URLSearchParams(search);
    const tab = query.get('tab');
    if (tab === 'teams' || tab === 'agents') {
      params.tab = tab;
    }
  }

  return { view, params };
};

const resolvePathForView = (view, params = {}) => {
  if (view === 'team-detail' && params.teamId) {
    return `/team/${encodeURIComponent(params.teamId)}`;
  }

  const basePath = VIEW_TO_PATH[view];
  if (!basePath) return null;

  if (view === 'marketplace' && params.tab && ['teams', 'agents'].includes(params.tab)) {
    return `${basePath}?tab=${encodeURIComponent(params.tab)}`;
  }

  return basePath;
};

const resolvePageIdFromSearch = (search = '') => {
  if (!search) return null;
  try {
    const query = new URLSearchParams(search);
    const pageId = query.get('pageId');
    if (!pageId) return null;
    const trimmed = pageId.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  } catch {
    return null;
  }
};

const normalizeConfluencePageId = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
};

const resolvePageIdFromContext = (ctx) => {
  const candidates = [
    ctx?.extension?.page?.id,
    ctx?.extension?.content?.id,
    ctx?.extension?.contentId,
    ctx?.extension?.pageId,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeConfluencePageId(candidate);
    if (normalized) return normalized;
  }
  return null;
};

const isAppModeContextBlocked = (instanceContext) => {
  const source = instanceContext?.runtimeSource;
  return source === 'app_mode_context_required';
};

// Check if we're running inside Forge
const isForgeEnvironment = () => {
  try {
    return window.parent !== window &&
      (window.location.ancestorOrigins?.length > 0 ||
        document.referrer.includes('atlassian'));
  } catch {
    return false;
  }
};

// Mock user data for development
// NOTE: To test Sign Up nav visibility, temporarily remove or empty the skills array
const MOCK_USER = {
  id: 'demo-user-1',
  name: 'Demo User',
  role: 'admin', // Start as admin for dev mode
  callsign: 'Commander',
  atlassianAccountId: 'demo-123',
  skills: ['JavaScript', 'React', 'Node.js', 'UI/UX Design'], // Include skills so registration check works in dev mode
};

const MOCK_TEAMS = [
  {
    id: 'team-1',
    name: 'Quantum Collective',
    description: 'Build an AI teammate for hackathon squads.',
    problem: 'Teams lose momentum when coordination, ownership, and updates are fragmented.',
    moreInfo: 'Demo repo and architecture notes available for collaborators after join.',
    captainId: 'demo-user-2',
    maxMembers: 5,
    lookingFor: ['QA', 'Mobile Development', 'Security', 'Product Manager'],
    teamVibe: 'building',
    reactionCounts: {
      love: 4,
      join: 2,
      innovative: 3,
      ambitious: 1,
    },
    createdAt: '2026-02-18T12:10:00.000Z',
    updatedAt: '2026-02-20T13:29:00.000Z',
    joinRequests: [],
    members: [
      {
        id: 'demo-user-2',
        name: 'NickTestMonday',
        callsign: 'TestyMcTestBro',
        skills: ['UI/UX Design'],
      },
    ],
  },
  { id: 'team-2', name: 'Digital Overlords', captainId: 'demo-user-3', members: [] },
  { id: 'team-3', name: 'Rescue House', captainId: 'demo-user-4', members: [] },
];

import { normalizeAdminMessage } from './lib/normalizeAdminMessage';
import { ThemeContext, ThemeStateProvider } from './contexts/ThemeContext';

const DEFAULT_EVENT_META = Object.freeze({
  name: 'HackDay',
  tagline: null,
  timezone: EVENT_TIMEZONE,
  startAt: null,
  endAt: null,
  schedule: null,
});

const normalizeEventMeta = (value) => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_EVENT_META;
  }

  const name = typeof value.name === 'string' && value.name.trim()
    ? value.name.trim()
    : DEFAULT_EVENT_META.name;
  const tagline = typeof value.tagline === 'string' && value.tagline.trim()
    ? value.tagline.trim()
    : null;
  const timezone = typeof value.timezone === 'string' && value.timezone.trim()
    ? value.timezone.trim()
    : DEFAULT_EVENT_META.timezone;
  const startAt = typeof value.startAt === 'string' ? value.startAt : null;
  const endAt = typeof value.endAt === 'string' ? value.endAt : null;
  const schedule = value.schedule && typeof value.schedule === 'object' ? value.schedule : null;

  return {
    name,
    tagline,
    timezone,
    startAt,
    endAt,
    schedule,
  };
};

function App() {
  const urlRoutingEnabledRef = useRef(!isForgeEnvironment());
  const initialRouteRef = useRef(
    urlRoutingEnabledRef.current
      ? resolveViewFromLocation(window.location.pathname, window.location.search)
      : { view: 'dashboard', params: {} }
  );
  const urlRoutingEnabled = urlRoutingEnabledRef.current;

  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devMode, setDevMode] = useState(false);

  // View routing state
  const [currentView, setCurrentView] = useState(initialRouteRef.current.view);
  const [viewParams, setViewParams] = useState(initialRouteRef.current.params);

  // App data state
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [eventPhase, setEventPhase] = useState('signup');
  const [eventMotd, setEventMotd] = useState('');
  const [eventAdminMessage, setEventAdminMessage] = useState(null);
  const [eventMeta, setEventMeta] = useState(DEFAULT_EVENT_META);
  const [eventId, setEventId] = useState(null);
  const [maxVotesPerUser, setMaxVotesPerUser] = useState(3);
  const [maxTeamSize, setMaxTeamSize] = useState(5);
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Event-scoped theme default (from branding.themePreference for HD child instances)
  const [eventThemePreference, setEventThemePreference] = useState(null);
  const [eventPageId, setEventPageId] = useState(null);
  const [eventBranding, setEventBranding] = useState({});
  const [isEventAdmin, setIsEventAdmin] = useState(false);
  const [appModeContextError, setAppModeContextError] = useState(null);
  const [openAppViewError, setOpenAppViewError] = useState(null);
  const [openingAppView, setOpeningAppView] = useState(false);
  /** True only for HackDays created via HackCentral (template seed); original site uses VIBING logo. */
  const [useAdaptavistLogo, setUseAdaptavistLogo] = useState(false);
  const [configModeSnapshot, setConfigModeSnapshot] = useState(null);

  // Dev mode state
  const [devRoleOverride, setDevRoleOverride] = useState(null);
  const autoOpenAppViewAttemptedRef = useRef(false);

  const isMacroHost = useMemo(() => {
    const extensionType = String(context?.extension?.type || '').toLowerCase();
    const moduleKey = String(context?.moduleKey || context?.extension?.moduleKey || '').toLowerCase();

    // Some Confluence contexts report different extension/module-key variants.
    // Keep this detection permissive to avoid iframe height feedback loops.
    return (
      extensionType.includes('macro') ||
      moduleKey.includes('customui') ||
      moduleKey.includes('custom-ui') ||
      moduleKey.includes('macro')
    );
  }, [context]);

  // Load initial data
  useEffect(() => {
    const loadContext = async () => {
      // Check if running in Forge environment
      if (!isForgeEnvironment()) {
        setDevMode(true);
        setContext({ extension: { type: 'dev' } });
        setUser(MOCK_USER);
        setTeams(MOCK_TEAMS);
        setAllUsers([MOCK_USER]);
        setEventMotd('');
        setEventAdminMessage(null);
        setEventMeta(DEFAULT_EVENT_META);
        // Dev-only: simulate event theme for testing (?eventTheme=light|dark|system&eventPageId=...)
        const params = new URLSearchParams(window.location.search);
        const devTheme = params.get('eventTheme');
        const devPageId = params.get('eventPageId');
        const devEventId = params.get('eventId') || 'dev-local-event';
        setEventId(devEventId);
        if (devTheme && ['light', 'dark', 'system'].includes(devTheme)) {
          setEventThemePreference(devTheme);
        }
        if (devPageId && typeof devPageId === 'string') {
          setEventPageId(devPageId.trim() || null);
        }
        const devAdaptavist = params.get('useAdaptavistLogo');
        setUseAdaptavistLogo(devAdaptavist === '1' || devAdaptavist === 'true');
        setAppModeContextError(null);
        setOpenAppViewError(null);
        setLoading(false);
        return;
      }

      try {
        const { view, invoke } = await import('@forge/bridge');
        const ctx = await view.getContext();
        setContext(ctx);

        const appModePageId = resolvePageIdFromSearch(window.location.search);
        if (appModePageId) {
          try {
            await invoke('activateAppModeContext', { pageId: appModePageId });
          } catch (activationError) {
            console.warn('Failed to activate app-mode context:', activationError);
          }
        }

        // Load real data from resolver. Use allSettled so one resolver failure
        // doesn't silently force the UI into 3-item mock data.
        const [userResult, teamsResult, eventResult, freeAgentsResult, registrationsResult] = await Promise.allSettled([
          invoke('getCurrentUser'),
          invoke('getTeams'),
          invoke('getEventPhase', { appMode: true }),
          invoke('getFreeAgents'),
          invoke('getRegistrations'),
        ]);

        if (userResult.status === 'fulfilled') {
          setUser(userResult.value);
          setIsNewUser(userResult.value?.isNewUser || false);
        } else {
          console.error('Failed to load current user:', userResult.reason);
          // Keep dev controls available when identity lookup fails in Forge.
          setUser(MOCK_USER);
          setIsNewUser(false);
        }

        if (teamsResult.status === 'fulfilled') {
          const teamsData = teamsResult.value;
          // getTeams returns { teams: [] }, extract the array
          setTeams(teamsData?.teams || teamsData || []);
        } else {
          console.error('Failed to load teams:', teamsResult.reason);
          setTeams([]);
        }

        if (eventResult.status === 'fulfilled') {
          const eventInfo = eventResult.value;
          const instanceContext = eventInfo?.instanceContext;
          if (eventInfo?.phase) {
            setEventPhase(eventInfo.phase);
          }
          setEventId(eventInfo?.eventId || null);
          setEventMotd(eventInfo?.motd || '');
          setEventAdminMessage(normalizeAdminMessage(eventInfo?.motdMessage, eventInfo?.motd || ''));
          setEventMeta(normalizeEventMeta(eventInfo?.eventMeta));
          const maxVotes = Number(eventInfo?.maxVotesPerUser);
          if (Number.isFinite(maxVotes) && maxVotes > 0) {
            setMaxVotesPerUser(maxVotes);
          }
          const maxTeam = Number(eventInfo?.maxTeamSize);
          if (Number.isFinite(maxTeam) && maxTeam >= 2 && maxTeam <= 8) {
            setMaxTeamSize(maxTeam);
          }
          const pref = eventInfo?.branding?.themePreference ?? eventInfo?.branding?.theme_preference;
          if (pref && ['light', 'dark', 'system'].includes(pref)) {
            setEventThemePreference(pref);
          } else {
            setEventThemePreference(null);
          }
          setEventPageId(eventInfo?.instanceContext?.pageId ?? null);
          setEventBranding(eventInfo?.branding && typeof eventInfo.branding === 'object' ? eventInfo.branding : {});
          setIsEventAdmin(Boolean(eventInfo?.isEventAdmin));
          const src = instanceContext?.runtimeSource;
          setUseAdaptavistLogo(
            src === 'seed_mapping' || src === 'seed_hdc_event' || src === 'seed_bootstrap'
          );
          if (isAppModeContextBlocked(instanceContext)) {
            setAppModeContextError({
              code: instanceContext?.contextError?.code || 'APP_MODE_CONTEXT_REQUIRED',
              message: instanceContext?.contextError?.message || 'Open a HackDay page and launch App View again.',
            });
          } else {
            setAppModeContextError(null);
          }
        } else {
          console.error('Failed to load event phase:', eventResult.reason);
          setAppModeContextError(null);
        }

        if (freeAgentsResult.status === 'fulfilled') {
          const freeAgentsData = freeAgentsResult.value;
          setFreeAgents(freeAgentsData?.freeAgents || freeAgentsData || []);
        } else {
          console.error('Failed to load free agents:', freeAgentsResult.reason);
          setFreeAgents([]);
        }

        if (registrationsResult.status === 'fulfilled') {
          const registrationsData = registrationsResult.value;
          setAllUsers(registrationsData?.registrations || []);
        } else {
          console.error('Failed to load registrations:', registrationsResult.reason);
          setAllUsers([]);
        }

        // If any resolver fails in Forge, keep dev mode enabled for diagnosis.
        // Important: we do NOT restore mock teams fallback; teams stay real or [].
        const failures = [userResult, teamsResult, eventResult].filter((r) => r.status === 'rejected').length;
        setDevMode(failures > 0);

        // Surface a blocking error only if all core resolvers failed.
        if (failures === 3) {
          setError('Unable to load app data. Try refreshing the page.');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load Forge context:', err);
        // Preserve troubleshooting UX if Forge context fails to initialize.
        setDevMode(true);
        setContext({ extension: { type: 'dev-fallback' } });
        setUser(MOCK_USER);
        setTeams([]);
        setFreeAgents([]);
        setAllUsers([MOCK_USER]);
        setAppModeContextError(null);
        setError('Failed to initialize Forge context. Try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, []);

  // Navigation handler
  const handleNavigate = useCallback((view, params = {}, options = {}) => {
    setCurrentView(view);
    setViewParams(params);

    if (!urlRoutingEnabled || options.skipHistory) {
      return;
    }

    const nextPath = resolvePathForView(view, params);
    if (!nextPath) {
      return;
    }

    try {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== nextPath) {
        const historyMethod = options.replace ? 'replaceState' : 'pushState';
        window.history[historyMethod]({ view, params }, '', nextPath);
      }
    } catch (historyError) {
      console.warn('Failed to sync URL route:', historyError);
    }
  }, [urlRoutingEnabled]);

  useEffect(() => {
    if (!urlRoutingEnabled) return undefined;

    const handlePopState = () => {
      const route = resolveViewFromLocation(window.location.pathname, window.location.search);
      setCurrentView(route.view);
      setViewParams(route.params);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [urlRoutingEnabled]);

  // Phase change handler (dev mode only)
  const handlePhaseChange = useCallback((phase) => {
    setEventPhase(phase);
  }, []);

  const handleEventSettingsUpdate = useCallback((updates = {}) => {
    if (updates.motd !== undefined) {
      setEventMotd(updates.motd || '');
      if (updates.motdMessage === undefined) {
        const normalized = normalizeAdminMessage(null, updates.motd || '');
        setEventAdminMessage(normalized.message ? normalized : null);
      }
    }

    if (updates.motdMessage !== undefined) {
      const normalized = normalizeAdminMessage(updates.motdMessage, updates.motd || '');
      setEventAdminMessage(normalized.message ? normalized : null);
      if (updates.motd === undefined) {
        setEventMotd(normalized.message || '');
      }
    }

    if (updates.maxVotesPerUser !== undefined) {
      const parsedMaxVotes = Number(updates.maxVotesPerUser);
      if (Number.isFinite(parsedMaxVotes) && parsedMaxVotes > 0) {
        setMaxVotesPerUser(parsedMaxVotes);
      }
    }
  }, []);

  const refreshTeamsAndFreeAgents = useCallback(async () => {
    if (devMode) {
      return;
    }

    try {
      const { invoke } = await import('@forge/bridge');
      const [teamsResult, freeAgentsResult] = await Promise.allSettled([
        invoke('getTeams'),
        invoke('getFreeAgents'),
      ]);

      if (teamsResult.status === 'fulfilled') {
        const teamsData = teamsResult.value;
        setTeams(teamsData?.teams || teamsData || []);
      } else {
        console.error('Failed to refresh teams:', teamsResult.reason);
      }

      if (freeAgentsResult.status === 'fulfilled') {
        const freeAgentsData = freeAgentsResult.value;
        setFreeAgents(freeAgentsData?.freeAgents || freeAgentsData || []);
      } else {
        console.error('Failed to refresh free agents:', freeAgentsResult.reason);
      }
    } catch (err) {
      console.error('Failed to refresh team and free-agent data:', err);
    }
  }, [devMode]);

  const refreshRegistrations = useCallback(async () => {
    if (devMode) {
      return;
    }
    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invoke('getRegistrations');
      setAllUsers(result?.registrations || []);
    } catch (err) {
      console.error('Failed to refresh registrations:', err);
    }
  }, [devMode]);

  const refreshEventPhase = useCallback(async () => {
    if (devMode) return;
    try {
      const { invoke } = await import('@forge/bridge');
      const eventInfo = await invoke('getEventPhase', { appMode: true });
      const instanceContext = eventInfo?.instanceContext;
      if (eventInfo?.phase) setEventPhase(eventInfo.phase);
      setEventId(eventInfo?.eventId || null);
      if (eventInfo?.motd !== undefined) setEventMotd(eventInfo.motd || '');
      if (eventInfo?.motdMessage !== undefined) setEventAdminMessage(normalizeAdminMessage(eventInfo.motdMessage, eventInfo.motd || ''));
      if (eventInfo?.eventMeta) setEventMeta(normalizeEventMeta(eventInfo.eventMeta));
      if (eventInfo?.maxVotesPerUser != null && Number.isFinite(Number(eventInfo.maxVotesPerUser))) setMaxVotesPerUser(Number(eventInfo.maxVotesPerUser));
      const pref = eventInfo?.branding?.themePreference ?? eventInfo?.branding?.theme_preference;
      if (pref && ['light', 'dark', 'system'].includes(pref)) setEventThemePreference(pref);
      else setEventThemePreference(null);
      if (eventInfo?.instanceContext?.pageId != null) setEventPageId(eventInfo.instanceContext.pageId);
      if (eventInfo?.branding && typeof eventInfo.branding === 'object') setEventBranding(eventInfo.branding);
      if (eventInfo?.isEventAdmin !== undefined) setIsEventAdmin(Boolean(eventInfo.isEventAdmin));
      const src = instanceContext?.runtimeSource;
      setUseAdaptavistLogo(
        src === 'seed_mapping' || src === 'seed_hdc_event' || src === 'seed_bootstrap'
      );
      if (isAppModeContextBlocked(instanceContext)) {
        setAppModeContextError({
          code: instanceContext?.contextError?.code || 'APP_MODE_CONTEXT_REQUIRED',
          message: instanceContext?.contextError?.message || 'Open a HackDay page and launch App View again.',
        });
      } else {
        setAppModeContextError(null);
      }
    } catch (err) {
      console.error('Failed to refresh event phase:', err);
    }
  }, [devMode]);

  const handleOpenAppView = useCallback(async () => {
    if (devMode) {
      setOpenAppViewError('Open App View is only available inside Confluence.');
      return;
    }

    setOpenAppViewError(null);
    setOpeningAppView(true);
    try {
      const bridge = await import('@forge/bridge');
      const pageId =
        normalizeConfluencePageId(eventPageId) ||
        resolvePageIdFromContext(context) ||
        resolvePageIdFromSearch(window.location.search);

      if (!pageId) {
        throw new Error('Open App View is only available from a HackDay page.');
      }

      const activation = await bridge.invoke('activateAppModeContext', { pageId });
      if (!activation?.success) {
        throw new Error('Unable to activate HackDay context for App View.');
      }

      const moduleLocation = {
        target: 'module',
        moduleKey: 'hackday-global-nav',
      };

      if (bridge.router?.navigate) {
        await bridge.router.navigate(moduleLocation);
      } else if (bridge.router?.open) {
        await bridge.router.open(moduleLocation);
      } else {
        throw new Error('Forge navigation API unavailable.');
      }
    } catch (err) {
      console.error('Failed to open app view:', err);
      setOpenAppViewError(err?.message || 'Unable to open app view.');
    } finally {
      setOpeningAppView(false);
    }
  }, [context, devMode, eventPageId]);

  useEffect(() => {
    if (devMode) return;
    if (!isMacroHost) return;
    if (!useAdaptavistLogo) return;
    if (!eventPageId) return;
    if (appModeContextError) return;
    if (openingAppView) return;
    if (autoOpenAppViewAttemptedRef.current) return;

    autoOpenAppViewAttemptedRef.current = true;
    void handleOpenAppView();
  }, [appModeContextError, devMode, eventPageId, handleOpenAppView, isMacroHost, openingAppView, useAdaptavistLogo]);

  // Effective user role (with dev override)
  const effectiveUser = useMemo(() => {
    if (!user) return null;
    if (devRoleOverride) {
      if (devRoleOverride === 'owner_jonmort') {
        // Simulate Jon Mort owner login in dev mode.
        return {
          ...user,
          role: 'admin',
          id: `OWNER_JMORT_${user.id}`,
          name: 'Jon Mort',
          displayName: 'Jon Mort',
          email: 'jmort@adaptavist.com',
          isHackdayOwner: true,
          ownerDisplayTitle: 'CTO & HackDay Owner',
        };
      }
      if (devRoleOverride === 'participant_guest') {
        // Simulate an unjoined/unregistered participant in dev mode.
        return {
          ...user,
          role: 'participant',
          id: `GUEST_${user.id}`,
          teamId: null,
          skills: [],
          isFreeAgent: true,
        };
      }
      if (devRoleOverride === 'participant_no_team') {
        // Simulate a registered participant who has completed signup but has no team.
        return {
          ...user,
          role: 'participant',
          id: `FREE_AGENT_${user.id}`,
          teamId: null,
          isFreeAgent: true,
        };
      }
      if (devRoleOverride === 'participant_captain') {
        // Simulate a participant who is already a team captain.
        const captainTeam = teams.find((team) => team.id !== 'team-observers' && team.captainId);
        return {
          ...user,
          role: 'participant',
          id: captainTeam?.captainId || `CAPTAIN_${user.id}`,
          name: captainTeam?.captainName || user.name,
          displayName: captainTeam?.captainName || user.displayName || user.name,
          isFreeAgent: false,
        };
      }
      return { ...user, role: devRoleOverride };
    }
    return user;
  }, [user, devRoleOverride, teams]);

  // Handle user profile updates (from Signup or Profile)
  const handleUpdateUser = useCallback(async (updates) => {
    if (devMode) {
      // Dev mode: update local state only
      setUser(prev => ({ ...prev, ...updates }));
      setIsNewUser(false);
      return;
    }

    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invoke('updateRegistration', {
        updates,
      });
      if (result?.user) {
        setUser(result.user);
        setIsNewUser(false);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      // Still update local state as fallback
      setUser(prev => ({ ...prev, ...updates }));
      setIsNewUser(false);
    }
  }, [devMode]);

  const handleCreateTeam = useCallback(async (teamData) => {
    const normalizedTeam = {
      name: String(teamData?.name || '').trim(),
      description: String(teamData?.description || '').trim(),
      lookingFor: Array.isArray(teamData?.lookingFor) ? teamData.lookingFor : [],
      maxMembers: Number(teamData?.maxMembers) || 5,
    };

    if (!normalizedTeam.name) {
      throw new Error('Idea name is required');
    }

    if (devMode) {
      const nowIso = new Date().toISOString();
      const newTeamId = `team-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const localUserId = effectiveUser?.id || user?.id || 'dev-user';

      const localTeam = {
        id: newTeamId,
        name: normalizedTeam.name,
        description: normalizedTeam.description,
        captainId: localUserId,
        captainName: effectiveUser?.name || user?.name || 'You',
        members: [
          {
            id: localUserId,
            name: effectiveUser?.name || user?.name || 'You',
            callsign: effectiveUser?.callsign || user?.callsign || '',
            skills: effectiveUser?.skills || user?.skills || [],
          },
        ],
        lookingFor: normalizedTeam.lookingFor,
        maxMembers: normalizedTeam.maxMembers,
        joinRequests: [],
        createdAt: nowIso,
      };

      setTeams((prev) => [localTeam, ...prev]);
      setFreeAgents((prev) => prev.filter((agent) => agent.id !== localUserId));
      return { teamId: newTeamId };
    }

    const { invoke } = await import('@forge/bridge');
    const createResult = await invoke('createTeam', { teamData: normalizedTeam });

    const [teamsResult, freeAgentsResult] = await Promise.allSettled([
      invoke('getTeams'),
      invoke('getFreeAgents'),
    ]);

    if (teamsResult.status === 'fulfilled') {
      const teamsData = teamsResult.value;
      setTeams(teamsData?.teams || teamsData || []);
    } else {
      console.error('Failed to refresh teams after createTeam:', teamsResult.reason);
    }

    if (freeAgentsResult.status === 'fulfilled') {
      const freeAgentsData = freeAgentsResult.value;
      setFreeAgents(freeAgentsData?.freeAgents || freeAgentsData || []);
    } else {
      console.error('Failed to refresh free agents after createTeam:', freeAgentsResult.reason);
    }

    return createResult;
  }, [devMode, effectiveUser, user]);

  // Handle team updates (from TeamDetail)
  const handleUpdateTeam = useCallback(async (teamId, updates) => {
    if (!teamId || !updates || typeof updates !== 'object') {
      throw new Error('teamId and updates are required');
    }

    const previousTeam = teams.find((team) => team.id === teamId) || null;
    const previousSelectedTeam = selectedTeam?.id === teamId ? selectedTeam : null;

    // Optimistic update so team detail edits feel instant.
    setTeams((prev) => prev.map((team) =>
      team.id === teamId ? { ...team, ...updates } : team
    ));
    if (selectedTeam?.id === teamId) {
      setSelectedTeam((prev) => (prev ? { ...prev, ...updates } : prev));
    }

    if (devMode) {
      return { success: true };
    }

    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invoke('updateTeam', {
        teamId,
        updates,
      });
      if (result?.team) {
        setTeams(prev => prev.map(t =>
          t.id === teamId ? result.team : t
        ));
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(result.team);
        }
      }
      return result || { success: true };
    } catch (err) {
      console.error('Failed to update team:', err);
      const message = err instanceof Error ? err.message : 'Failed to update team.';
      let reconciledFromServer = false;

      // Attempt to reconcile with server truth before falling back to local rollback.
      try {
        const { invoke } = await import('@forge/bridge');
        const refreshResult = await invoke('getTeam', { teamId });
        if (refreshResult?.team) {
          reconciledFromServer = true;
          setTeams((prev) => prev.map((team) =>
            team.id === teamId ? refreshResult.team : team
          ));
          if (selectedTeam?.id === teamId) {
            setSelectedTeam(refreshResult.team);
          }
        }
      } catch {
        // If refresh fails, roll back optimistic state from local snapshot.
      }

      if (!reconciledFromServer) {
        if (previousTeam) {
          setTeams((prev) => prev.map((team) => (team.id === teamId ? previousTeam : team)));
        }
        if (previousSelectedTeam) {
          setSelectedTeam(previousSelectedTeam);
        }
      }
      throw new Error(message);
    }
  }, [devMode, teams, selectedTeam, setTeams, setSelectedTeam]);

  // Handle project submission
  const handleSubmitProject = useCallback(async (teamId, submissionData) => {
    if (!teamId || !submissionData) {
      throw new Error('teamId and submissionData are required');
    }

    if (devMode) {
      // In dev mode, update local state
      setTeams((prev) => prev.map((team) =>
        team.id === teamId
          ? { ...team, submission: submissionData }
          : team
      ));
      if (selectedTeam?.id === teamId) {
        setSelectedTeam((prev) => (prev ? { ...prev, submission: submissionData } : prev));
      }
      return { success: true };
    }

    const { invoke } = await import('@forge/bridge');
    await invoke('submitProject', { teamId, submissionData });

    // Refresh teams to get updated submission data
    const teamsResult = await invoke('getTeams');
    const teamsData = teamsResult?.teams || teamsResult || [];
    setTeams(teamsData);

    // If we have a selected team, refresh it too
    if (selectedTeam?.id === teamId) {
      const updatedTeam = teamsData.find((t) => t.id === teamId);
      if (updatedTeam) {
        setSelectedTeam(updatedTeam);
      }
    }

    return { success: true };
  }, [devMode, selectedTeam, setTeams, setSelectedTeam]);

  const handleDeleteTeam = useCallback(async (teamId) => {
    if (!teamId) {
      throw new Error('teamId is required');
    }

    if (devMode) {
      const localUserId = effectiveUser?.id || user?.id || null;
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setSelectedTeam((prev) => (prev?.id === teamId ? null : prev));
      if (localUserId) {
        setFreeAgents((prev) => {
          if (prev.some((agent) => agent.id === localUserId)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: localUserId,
              name: effectiveUser?.name || user?.name || 'You',
              callsign: effectiveUser?.callsign || user?.callsign || '',
              skills: effectiveUser?.skills || user?.skills || [],
            },
          ];
        });
      }
      return { success: true };
    }

    const { invoke } = await import('@forge/bridge');
    const result = await invoke('deleteTeam', { teamId });

    const [teamsResult, freeAgentsResult] = await Promise.allSettled([
      invoke('getTeams'),
      invoke('getFreeAgents'),
    ]);

    if (teamsResult.status === 'fulfilled') {
      const teamsData = teamsResult.value;
      setTeams(teamsData?.teams || teamsData || []);
    } else {
      console.error('Failed to refresh teams after deleteTeam:', teamsResult.reason);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    }

    if (freeAgentsResult.status === 'fulfilled') {
      const freeAgentsData = freeAgentsResult.value;
      setFreeAgents(freeAgentsData?.freeAgents || freeAgentsData || []);
    } else {
      console.error('Failed to refresh free agents after deleteTeam:', freeAgentsResult.reason);
    }

    setSelectedTeam((prev) => (prev?.id === teamId ? null : prev));
    return result;
  }, [devMode, effectiveUser, user]);

  const handleLeaveTeam = useCallback(async (teamId) => {
    if (!teamId) {
      throw new Error('teamId is required');
    }

    const localUser = effectiveUser || user;
    const localUserId = localUser?.id;

    if (devMode) {
      if (!localUserId) {
        return { success: true };
      }

      setTeams((prev) => prev.map((team) => {
        if (team.id !== teamId) return team;
        return {
          ...team,
          members: (team.members || []).filter((member) => member.id !== localUserId),
        };
      }));

      setFreeAgents((prev) => {
        if (prev.some((agent) => agent.id === localUserId)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: localUserId,
            name: localUser?.name || 'You',
            callsign: localUser?.callsign || '',
            skills: localUser?.skills || [],
          },
        ];
      });

      setSelectedTeam((prev) => {
        if (!prev || prev.id !== teamId) return prev;
        return {
          ...prev,
          members: (prev.members || []).filter((member) => member.id !== localUserId),
        };
      });

      return { success: true };
    }

    const { invoke } = await import('@forge/bridge');
    const result = await invoke('leaveTeam', { teamId });

    const [teamsResult, freeAgentsResult] = await Promise.allSettled([
      invoke('getTeams'),
      invoke('getFreeAgents'),
    ]);

    if (teamsResult.status === 'fulfilled') {
      const teamsData = teamsResult.value;
      setTeams(teamsData?.teams || teamsData || []);
    } else {
      console.error('Failed to refresh teams after leaveTeam:', teamsResult.reason);
      if (localUserId) {
        setTeams((prev) => prev.map((team) => {
          if (team.id !== teamId) return team;
          return {
            ...team,
            members: (team.members || []).filter((member) => member.id !== localUserId),
          };
        }));
      }
    }

    if (freeAgentsResult.status === 'fulfilled') {
      const freeAgentsData = freeAgentsResult.value;
      setFreeAgents(freeAgentsData?.freeAgents || freeAgentsData || []);
    } else {
      console.error('Failed to refresh free agents after leaveTeam:', freeAgentsResult.reason);
    }

    setSelectedTeam((prev) => (prev?.id === teamId ? null : prev));
    return result;
  }, [devMode, effectiveUser, user]);

  // Handle join request (from TeamDetail)
  const handleJoinRequest = useCallback(async (teamId, requestData) => {
    if (!teamId) {
      throw new Error('teamId is required');
    }

    const localUser = effectiveUser || user;
    const upsertPendingRequest = (team) => {
      if (!localUser?.id || !team) {
        return team;
      }
      const pendingRequest = {
        id: `request-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        userId: localUser.id,
        userName: localUser.name || 'You',
        userSkills: localUser.skills || [],
        message: requestData?.message || '',
        timestamp: new Date().toISOString(),
      };
      const existingRequests = team.joinRequests || [];
      const filteredRequests = existingRequests.filter((request) => request.userId !== localUser.id);
      return {
        ...team,
        joinRequests: [...filteredRequests, pendingRequest],
      };
    };

    if (devMode) {
      if (!localUser?.id) {
        return { success: true };
      }

      setTeams((prev) => prev.map((team) => (team.id === teamId ? upsertPendingRequest(team) : team)));
      setSelectedTeam((prev) => (prev?.id === teamId ? upsertPendingRequest(prev) : prev));
      return { success: true };
    }

    const { invoke } = await import('@forge/bridge');

    let requestResult;
    try {
      requestResult = await invoke('requestToJoin', {
        teamId,
        message: requestData?.message || '',
      });
    } catch (err) {
      console.error('Failed to send join request:', err);
      const message = err instanceof Error ? err.message : 'Failed to send join request.';
      throw new Error(message);
    }

    try {
      const result = await invoke('getTeam', { teamId });
      if (result?.team) {
        setSelectedTeam(result.team);
        setTeams((prev) => prev.map((team) => (team.id === teamId ? result.team : team)));
      }
    } catch (refreshError) {
      console.warn('Join request sent but team refresh failed:', refreshError);
      setTeams((prev) => prev.map((team) => (team.id === teamId ? upsertPendingRequest(team) : team)));
      setSelectedTeam((prev) => (prev?.id === teamId ? upsertPendingRequest(prev) : prev));
    }
    return requestResult;
  }, [devMode, effectiveUser, user]);

  // Handle request response (accept/decline from TeamDetail)
  const handleRequestResponse = useCallback(async (teamId, requestId, accepted) => {
    if (!teamId || !requestId) {
      throw new Error('teamId and requestId are required');
    }

    const updateLocalTeam = (team) => {
      const requests = team?.joinRequests || [];
      const request = requests.find((item) => item.id === requestId);
      const remainingRequests = requests.filter((item) => item.id !== requestId);

      if (!request) {
        return team;
      }

      if (!accepted) {
        return {
          ...team,
          joinRequests: remainingRequests,
        };
      }

      const nextMembers = [...(team.members || [])];
      const isAlreadyMember = nextMembers.some((member) => member.id === request.userId);
      if (!isAlreadyMember) {
        nextMembers.push({
          id: request.userId,
          name: request.userName || 'Unknown',
          callsign: '',
          skills: request.userSkills || [],
        });
      }

      return {
        ...team,
        joinRequests: remainingRequests,
        members: nextMembers,
      };
    };

    if (devMode) {
      setTeams((prev) => prev.map((team) => (team.id === teamId ? updateLocalTeam(team) : team)));
      setSelectedTeam((prev) => (prev?.id === teamId ? updateLocalTeam(prev) : prev));
      return { success: true };
    }

    const { invoke } = await import('@forge/bridge');

    let responseResult;
    try {
      responseResult = await invoke('handleJoinRequest', {
        requestId,
        accepted,
      });
    } catch (err) {
      console.error('Failed to respond to request:', err);
      const message = err instanceof Error ? err.message : 'Failed to respond to request.';
      throw new Error(message);
    }

    try {
      const result = await invoke('getTeam', { teamId });
      if (result?.team) {
        setSelectedTeam(result.team);
        // Also update teams list
        setTeams(prev => prev.map(t =>
          t.id === teamId ? result.team : t
        ));
      }
    } catch (refreshError) {
      console.warn('Join request response succeeded but team refresh failed:', refreshError);
      setTeams((prev) => prev.map((team) => (team.id === teamId ? updateLocalTeam(team) : team)));
      setSelectedTeam((prev) => (prev?.id === teamId ? updateLocalTeam(prev) : prev));
    }
    return responseResult;
  }, [devMode]);

  // Load team details when navigating to team-detail
  const loadTeamDetails = useCallback(async (teamId) => {
    if (devMode) {
      // Dev mode: use local team data
      const team = teams.find(t => t.id === teamId);
      setSelectedTeam(team || null);
      return;
    }

    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invoke('getTeam', { teamId });
      setSelectedTeam(result?.team || null);
    } catch (err) {
      console.error('Failed to load team details:', err);
      setSelectedTeam(null);
    }
  }, [devMode, teams]);

  // Load team details when navigating to team-detail
  useEffect(() => {
    if (currentView === 'team-detail' && viewParams.teamId) {
      loadTeamDetails(viewParams.teamId);
    }
  }, [currentView, viewParams.teamId, loadTeamDetails]);

  // Auto-redirect new users to signup
  useEffect(() => {
    if (!loading && isNewUser && currentView === 'dashboard') {
      handleNavigate('signup', {}, { replace: true });
    }
  }, [loading, isNewUser, currentView, handleNavigate]);

  // If role changes away from admin while on the admin view, redirect to dashboard.
  // This avoids trapping users on an access-denied page during role-switch testing.
  useEffect(() => {
    if (currentView !== 'admin') return;
    if (!effectiveUser) return;
    if (effectiveUser.role === 'admin') return;

    handleNavigate('dashboard', {}, { replace: true });
  }, [currentView, effectiveUser, handleNavigate]);

  // ============================================================================
  // AUTO-ASSIGN OPT-IN HANDLER
  // ============================================================================

  // Handle auto-assign opt-in for free agents
  const handleAutoAssignOptIn = useCallback(async (optIn) => {
    if (devMode) {
      // Dev mode: update local state only
      setUser(prev => prev ? { ...prev, autoAssignOptIn: optIn } : prev);
      return { success: true };
    }

    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invoke('updateAutoAssignOptIn', {
        optIn,
      });

      if (result?.success) {
        // Update local user state
        setUser(prev => prev ? { ...prev, autoAssignOptIn: optIn } : prev);
      }

      return result;
    } catch (err) {
      console.error('[App] Failed to update auto-assign opt-in:', err);
      return { success: false, error: err.message };
    }
  }, [devMode]);

  // Track client-side UI events via resolver (best effort).
  const handleTrackEvent = useCallback(async (eventName, payload = {}) => {
    if (!eventName || typeof eventName !== 'string') return;

    const eventData = {
      eventName,
      payload,
      view: currentView,
      timestamp: new Date().toISOString(),
    };

    const inForge = isForgeEnvironment();
    if (devMode && !inForge) {
      console.info('[Telemetry]', eventData);
      return;
    }

    try {
      const { invoke } = await import('@forge/bridge');
      await invoke('trackUiEvent', eventData);
    } catch (err) {
      console.warn('[Telemetry] Failed to track UI event:', eventName, err);
    }
  }, [devMode, currentView]);

  // Render the current view
  const effectiveEventBranding = configModeSnapshot?.effectiveBranding && typeof configModeSnapshot.effectiveBranding === 'object'
    ? configModeSnapshot.effectiveBranding
    : eventBranding;
  const effectiveEventAdminMessage = configModeSnapshot?.effectiveMotdMessage !== undefined
    ? configModeSnapshot.effectiveMotdMessage
    : eventAdminMessage;

  const renderView = () => {
    const commonProps = {
      user: effectiveUser,
      teams,
      onNavigate: handleNavigate,
      onTrackEvent: handleTrackEvent,
      onSubmitProject: handleSubmitProject,
      eventPhase,
      maxVotesPerUser,
      maxTeamSize,
      eventMotd,
      eventAdminMessage: effectiveEventAdminMessage,
      eventMeta,
      eventBranding: effectiveEventBranding,
      isEventAdmin,
      onRefreshEventPhase: refreshEventPhase,
      viewParams,
      useAdaptavistLogo,
    };

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            context={context}
            {...commonProps}
            devRoleOverride={devRoleOverride}
            onAutoAssignOptIn={handleAutoAssignOptIn}
          />
        );

      case 'profile':
        return (
          <Profile
            {...commonProps}
            updateUser={(data) => {
              setUser(prev => ({ ...prev, ...data }));
            }}
          />
        );

      case 'marketplace':
        return (
          <Marketplace
            {...commonProps}
            freeAgents={freeAgents}
            onCreateTeam={handleCreateTeam}
            initialTab={viewParams.tab || 'teams'}
          />
        );

      case 'schedule':
        return <Schedule {...commonProps} />;

      case 'rules':
        return <Rules {...commonProps} />;

      case 'new-to-hackday':
        return <NewToHackDay {...commonProps} />;

      case 'submission':
        return <Submission {...commonProps} />;

      case 'voting':
        return <Voting {...commonProps} />;

      case 'judge-scoring':
        return <JudgeScoring {...commonProps} />;

      case 'admin':
        return (
          <AdminPanel
            {...commonProps}
            onPhaseChange={devMode ? handlePhaseChange : null}
            onEventSettingsUpdate={handleEventSettingsUpdate}
            onIdeaSummaryChange={refreshTeamsAndFreeAgents}
            allUsers={allUsers}
            onRefreshUsers={refreshRegistrations}
            onUpdateUserRole={async (userId, newRole) => {
              if (devMode) return;
              try {
                const { invoke } = await import('@forge/bridge');
                await invoke('adminUpdateUserRole', { targetUserId: userId, role: newRole });
                refreshRegistrations();
              } catch (err) {
                console.error('Failed to update user role:', err);
              }
            }}
          />
        );

      case 'results':
        return <Results {...commonProps} awards={{}} />;

      case 'signup':
        return (
          <Signup
            user={effectiveUser}
            updateUser={handleUpdateUser}
            onNavigate={handleNavigate}
            teams={teams}
            eventPhase={eventPhase}
            onTrackEvent={handleTrackEvent}
          />
        );

      case 'team-detail':
        return (
          <TeamDetail
            team={selectedTeam}
            user={effectiveUser}
            teams={teams}
            onNavigate={handleNavigate}
            onUpdateTeam={handleUpdateTeam}
            onDeleteTeam={handleDeleteTeam}
            onJoinRequest={handleJoinRequest}
            onRequestResponse={handleRequestResponse}
            onLeaveTeam={handleLeaveTeam}
            eventPhase={eventPhase}
          />
        );

      // Placeholder views
      case 'analytics':
        return (
          <div className="p-6">
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-arena-elevated flex items-center justify-center">
                <span className="text-2xl">🚧</span>
              </div>
              <h1 className="text-2xl font-black text-text-primary mb-4">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1).replace(/-/g, ' ')}
              </h1>
              <p className="text-text-secondary mb-6">
                This page is coming soon. Check back later!
              </p>
              <button
                onClick={() => handleNavigate('dashboard')}
                className="px-6 py-3 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return <Dashboard context={context} {...commonProps} />;
    }
  };

  const themeContextValue = useMemo(
    () => ({
      eventDefaultTheme: ['light', 'dark', 'system'].includes(configModeSnapshot?.effectiveBranding?.themePreference)
        ? configModeSnapshot.effectiveBranding.themePreference
        : eventThemePreference,
      pageId: eventPageId,
    }),
    [eventThemePreference, eventPageId, configModeSnapshot]
  );

  // Loading state
  if (loading) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <ThemeStateProvider>
        <div className="flex items-center justify-center min-h-screen bg-arena-bg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading HackDay...</p>
          </div>
        </div>
        </ThemeStateProvider>
      </ThemeContext.Provider>
    );
  }

  // Error state
  if (error) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <ThemeStateProvider>
        <div className="flex items-center justify-center min-h-screen bg-arena-bg">
          <div className="text-center p-8 bg-arena-card rounded-card border border-arena-border">
            <p className="text-error mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 transition-opacity"
            >
            Retry
          </button>
        </div>
      </div>
        </ThemeStateProvider>
      </ThemeContext.Provider>
    );
  }

  if (appModeContextError) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <ThemeStateProvider>
          <AppModeContextError
            message={appModeContextError.message}
            onRetry={() => window.location.reload()}
          />
        </ThemeStateProvider>
      </ThemeContext.Provider>
    );
  }

  // Main app with layout
  return (
    <ConfigModeProvider
      user={effectiveUser}
      isEventAdmin={isEventAdmin}
      eventId={eventId}
      eventBranding={eventBranding}
      eventAdminMessage={eventAdminMessage}
      isForgeHost={isForgeEnvironment()}
      onRefreshEventPhase={refreshEventPhase}
      onStateChange={setConfigModeSnapshot}
      onNavigate={handleNavigate}
    >
      <ThemeContext.Provider value={themeContextValue}>
        <ThemeStateProvider>
        <ErrorBoundary onNavigateHome={() => handleNavigate('dashboard')}>
          <ConfigModeOverlays />
          <AppLayout
          user={effectiveUser}
          realUserRole={user?.role}
          teams={teams}
          onNavigate={handleNavigate}
          eventPhase={eventPhase}
          activeNav={currentView}
          showSidebar={true}
          isDevMode={devMode}
          devRoleOverride={devRoleOverride}
          onDevRoleChange={setDevRoleOverride}
          onPhaseChange={handlePhaseChange}
          eventPhases={EVENT_PHASES}
          accountId={context?.accountId}
          eventMeta={eventMeta}
          isMacroHost={isMacroHost}
          showTeamContextInHeader={currentView !== 'team-detail'}
          isEventAdmin={isEventAdmin}
          useAdaptavistLogo={useAdaptavistLogo}
          showOpenAppViewCta={Boolean(isMacroHost && useAdaptavistLogo && eventPageId)}
          onOpenAppView={handleOpenAppView}
          openingAppView={openingAppView}
          openAppViewError={openAppViewError}
        >
          <ErrorBoundary onNavigateHome={() => handleNavigate('dashboard')}>
            <Suspense
              fallback={(
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto mb-3"></div>
                    <p className="text-text-secondary">Loading view...</p>
                  </div>
                </div>
              )}
            >
              {renderView()}
            </Suspense>
          </ErrorBoundary>
        </AppLayout>
      </ErrorBoundary>
        </ThemeStateProvider>
      </ThemeContext.Provider>
    </ConfigModeProvider>
  );
}

export default App;
