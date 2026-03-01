import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke, router, view } from './forgeBridge';
import type {
  CreateInstanceDraftInput,
  Defs,
  EventDuration,
  EventRegistryItem,
  HdcContextResponse,
  ScheduleEventType,
  SubmissionRequirement,
  SyncResult,
  ThemePreference,
  WizardStep,
} from './types';
import { DEFAULT_TIMEZONE } from './types';
import { ScheduleBuilder, type ScheduleBuilderOutput } from './ScheduleBuilder';
import { ScheduleBuilderV2, ScheduleBuilderV2Preview } from './components/schedule-builder-v2';
import type { ScheduleBuilderState as ScheduleBuilderV2State } from './types/scheduleBuilderV2';
import { EventSelectionPanel } from './components/EventSelectionPanel';
import { getDefaultSelections } from './scheduleEvents';
import {
  buildConfluencePagePath,
  buildSwitcherSections,
  getHomePageId,
  invalidateSwitcherRegistryCache,
  isNavigableRegistryItem,
  readSwitcherRegistryCache,
  runSwitcherNavigation,
  sortByMostRecent,
  summarizeSwitcherNavigability,
  switcherRowMetaText,
  writeSwitcherRegistryCache,
} from './appSwitcher';
import { getInstanceAdminActionState } from './instanceAdminActions';

/** Bump when deploying to help bust Atlassian CDN cache; check console to confirm loaded bundle */
const HACKCENTRAL_MACRO_VERSION = '0.6.44';
if (typeof console !== 'undefined' && console.log) {
  console.log('[HackCentral Macro UI] loaded', HACKCENTRAL_MACRO_VERSION);
}

const LOCAL_PREVIEW = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const CREATE_DRAFT_TIMEOUT_MS = 15_000;
const APP_VIEW_NAV_TIMEOUT_MS = 2_500;
const DUPLICATE_EVENT_NAME_ERROR = 'Event name must be unique under this HackDay Central parent page.';
const WIZARD_STORAGE_KEY_PREFIX = 'hdc-create-wizard:';
const SUBMISSION_REQUIREMENT_OPTIONS: SubmissionRequirement[] = ['video_demo', 'working_prototype', 'documentation'];
const RUNTIME_CONFIG_ERROR_CODE = 'HDC_RUNTIME_CONFIG_INVALID';
const HDC_PERF_CREATE_HANDOFF_V1 = String(import.meta.env.VITE_HDC_PERF_CREATE_HANDOFF_V1 || '').trim().toLowerCase() === 'true';
const HDC_PERF_LOADING_UX_V1 = String(import.meta.env.VITE_HDC_PERF_LOADING_UX_V1 || '').trim().toLowerCase() === 'true';

type RuntimeConfigErrorLike = {
  code?: unknown;
  message?: unknown;
  diagnostics?: {
    owner?: unknown;
    routeSource?: unknown;
    missingVars?: unknown;
  };
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

function isRuntimeConfigError(error: unknown): boolean {
  const maybeError = error as RuntimeConfigErrorLike;
  const message = getErrorMessage(error);
  return maybeError?.code === RUNTIME_CONFIG_ERROR_CODE || message.includes(RUNTIME_CONFIG_ERROR_CODE);
}

function getRuntimeConfigOperatorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  const diagnostics = (error as RuntimeConfigErrorLike)?.diagnostics;
  const routeSource = typeof diagnostics?.routeSource === 'string' ? diagnostics.routeSource : 'unknown';
  const missingVars = Array.isArray(diagnostics?.missingVars)
    ? diagnostics.missingVars.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
  if (missingVars.length > 0) {
    return `Runtime route configuration is invalid (${routeSource}). Missing vars: ${missingVars.join(', ')}.`;
  }
  return `Runtime route configuration is invalid (${routeSource}). ${message}`;
}

function navigateTopWindow(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  if (window.top && window.top !== window) {
    // Best-effort attempt; in Forge iframe contexts this may be blocked/no-op.
    try {
      window.top.location.assign(targetUrl);
    } catch {
      // Ignore and continue to other launch strategies.
    }
    return false;
  }
  window.location.assign(targetUrl);
  return true;
}

async function navigateWithRouterTimeout(targetUrl: string): Promise<boolean> {
  return navigateWithRouterTimeoutBudget(targetUrl, APP_VIEW_NAV_TIMEOUT_MS);
}

async function navigateWithRouterTimeoutBudget(targetUrl: string, timeoutMs: number): Promise<boolean> {
  if (timeoutMs <= 0) return false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      router.navigate(targetUrl).then(() => 'navigated' as const),
      new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), timeoutMs);
      }),
    ]);
    return outcome === 'navigated';
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function openWithRouterTimeout(targetUrl: string): Promise<boolean> {
  return openWithRouterTimeoutBudget(targetUrl, APP_VIEW_NAV_TIMEOUT_MS);
}

async function openWithRouterTimeoutBudget(targetUrl: string, timeoutMs: number): Promise<boolean> {
  if (timeoutMs <= 0) return false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      router.open(targetUrl).then(() => 'opened' as const),
      new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), timeoutMs);
      }),
    ]);
    return outcome === 'opened';
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function launchAppViewUrl(targetUrl: string): Promise<boolean> {
  if (navigateTopWindow(targetUrl)) return true;
  if (await navigateWithRouterTimeout(targetUrl)) return true;
  return openWithRouterTimeout(targetUrl);
}

async function launchAppViewUrlFastPath(targetUrl: string): Promise<boolean> {
  if (navigateTopWindow(targetUrl)) return true;
  const budgetStartedAt = Date.now();
  if (await navigateWithRouterTimeoutBudget(targetUrl, APP_VIEW_NAV_TIMEOUT_MS)) return true;
  const remainingBudgetMs = APP_VIEW_NAV_TIMEOUT_MS - Math.max(0, Date.now() - budgetStartedAt);
  if (remainingBudgetMs <= 0) return false;
  return openWithRouterTimeoutBudget(targetUrl, remainingBudgetMs);
}

function logCreateHandoffTelemetry(input: {
  creationRequestId: string;
  eventId?: string | null;
  childPageId?: string | null;
  durationMs: number;
  stageMs: Record<string, number>;
  outcome: 'opened_app_view' | 'fallback_child_page' | 'context_refreshed' | 'timeout' | 'error';
  warning?: string | null;
}): void {
  console.info(
    '[hdc-performance-telemetry]',
    JSON.stringify({
      metric: 'create_handoff',
      source: 'macro',
      mode: HDC_PERF_CREATE_HANDOFF_V1 ? 'v1' : 'legacy',
      ...input,
    })
  );
}

interface WizardDraftState {
  eventName: string;
  eventIcon: string;
  eventTagline: string;
  primaryAdminEmail: string;
  coAdminsInput: string;
  timezone: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  teamFormationStartsAt: string;
  teamFormationEndsAt: string;
  hackingStartsAt: string;
  submissionDeadlineAt: string;
  votingStartsAt: string;
  votingEndsAt: string;
  resultsAnnounceAt: string;
  allowCrossTeamMentoring: boolean;
  minTeamSize: string;
  maxTeamSize: string;
  requireDemoLink: boolean;
  submissionRequirements: SubmissionRequirement[];
  judgingModel: 'panel' | 'popular_vote' | 'hybrid';
  categoriesInput: string;
  prizesText: string;
  bannerMessage: string;
  accentColor: string;
  bannerImageUrl: string;
  themePreference: ThemePreference;
  scheduleBuilderState?: ScheduleBuilderV2State | null;
}

function wizardStorageKey(pageId: string): string {
  return `${WIZARD_STORAGE_KEY_PREFIX}${pageId}`;
}

function isScheduleBuilderStateDraft(value: unknown): value is ScheduleBuilderV2State {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (!(candidate.duration === 1 || candidate.duration === 2 || candidate.duration === 3)) return false;
  if (typeof candidate.anchorDate !== 'string') return false;
  if (typeof candidate.anchorTime !== 'string') return false;
  if (typeof candidate.timezone !== 'string') return false;
  if (typeof candidate.activePhase !== 'string') return false;
  if (!candidate.eventStates || typeof candidate.eventStates !== 'object' || Array.isArray(candidate.eventStates)) {
    return false;
  }
  if (!Array.isArray(candidate.customEvents)) return false;
  return true;
}

const LOCAL_CONTEXT: HdcContextResponse = {
  pageType: 'parent',
  pageId: 'local-parent-page',
  event: null,
  registry: [],
  syncState: null,
  permissions: {
    canCreateInstances: true,
    isPrimaryAdmin: true,
    isCoAdmin: false,
  },
};

class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

function isRequestTimeoutError(error: unknown): error is RequestTimeoutError {
  return error instanceof RequestTimeoutError;
}

function isDuplicateEventNameError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes(DUPLICATE_EVENT_NAME_ERROR);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RequestTimeoutError(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function invokeTyped<K extends keyof Defs>(
  name: K,
  payload: Parameters<Defs[K]>[0]
): Promise<ReturnType<Defs[K]>> {
  return invoke(name as string, payload) as Promise<ReturnType<Defs[K]>>;
}

function formatLifecycle(status: EventRegistryItem['lifecycleStatus']): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const LIFECYCLE_NEXT_LABEL: Partial<Record<EventRegistryItem['lifecycleStatus'], string>> = {
  draft: '🚀 Launch → Open for Registration',
  registration: 'Advance → Team Formation',
  team_formation: 'Advance → Hacking',
  hacking: 'Advance → Voting',
  voting: 'Advance → Results',
  results: 'Complete',
};

/** Map lifecycle to design-system status class: complete=emerald, pending=amber, blocked=red */
function getLifecycleStatusClass(
  status: EventRegistryItem['lifecycleStatus']
): 'status-complete' | 'status-pending' | 'status-blocked' {
  if (status === 'completed' || status === 'archived') return 'status-complete';
  if (status === 'draft') return 'status-pending';
  return 'status-pending';
}

function formatSyncErrorCategory(category: SyncResult['syncErrorCategory']): string {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const ALLOWED_EMAIL_DOMAIN = '@adaptavist.com';

function isAdaptavistEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function isDateRangeInvalid(start: string, end: string): boolean {
  return Boolean(start && end && start > end);
}

function formatSubmissionRequirement(requirement: SubmissionRequirement): string {
  if (requirement === 'video_demo') return 'Video demo';
  if (requirement === 'working_prototype') return 'Working prototype';
  return 'Documentation';
}

function logSwitcherNavigabilityTelemetry(source: string, registry: HdcContextResponse['registry']): void {
  const { total, nonNavigable, withMissingPageId } = summarizeSwitcherNavigability(registry);
  console.info('[hdc-switcher-telemetry]', JSON.stringify({ source, total, nonNavigable, withMissingPageId }));
}

export function App(): JSX.Element {
  const [context, setContext] = useState<HdcContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [eventName, setEventName] = useState('');
  const [eventIcon, setEventIcon] = useState('🚀');
  const [eventTagline, setEventTagline] = useState('');
  const [eventNameError, setEventNameError] = useState('');
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState('');
  const [coAdminsInput, setCoAdminsInput] = useState('');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardLoaded, setWizardLoaded] = useState(false);
  const [pendingCreateRequestId, setPendingCreateRequestId] = useState<string | null>(null);
  const [createDraftTimedOut, setCreateDraftTimedOut] = useState(false);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [scheduleOutput, setScheduleOutput] = useState<ScheduleBuilderOutput | null>(null);
  const [scheduleBuilderState, setScheduleBuilderState] = useState<ScheduleBuilderV2State | null>(null);
  const [registrationOpensAt, setRegistrationOpensAt] = useState('');
  const [registrationClosesAt, setRegistrationClosesAt] = useState('');
  const [teamFormationStartsAt, setTeamFormationStartsAt] = useState('');
  const [teamFormationEndsAt, setTeamFormationEndsAt] = useState('');
  const [hackingStartsAt, setHackingStartsAt] = useState('');
  const [submissionDeadlineAt, setSubmissionDeadlineAt] = useState('');
  const [votingStartsAt, setVotingStartsAt] = useState('');
  const [votingEndsAt, setVotingEndsAt] = useState('');
  const [resultsAnnounceAt, setResultsAnnounceAt] = useState('');
  const [allowCrossTeamMentoring, setAllowCrossTeamMentoring] = useState(true);
  const [minTeamSize, setMinTeamSize] = useState('1');
  const [maxTeamSize, setMaxTeamSize] = useState('6');
  const [requireDemoLink, setRequireDemoLink] = useState(false);
  const [submissionRequirements, setSubmissionRequirements] = useState<SubmissionRequirement[]>([]);
  const [judgingModel, setJudgingModel] = useState<'panel' | 'popular_vote' | 'hybrid'>('hybrid');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [prizesText, setPrizesText] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [accentColor, setAccentColor] = useState('#0f766e');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [eventDuration, setEventDuration] = useState<EventDuration>(2);
  const [selectedEvents, setSelectedEvents] = useState<ScheduleEventType[]>(getDefaultSelections());

  const [hackTitle, setHackTitle] = useState('');
  const [hackDescription, setHackDescription] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherWarning, setSwitcherWarning] = useState('');
  const [refreshingSwitcherRegistry, setRefreshingSwitcherRegistry] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const switcherMenuRef = useRef<HTMLDivElement | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError('');
    let pageIdForCache: string | null = null;

    try {
      if (LOCAL_PREVIEW) {
        setContext(LOCAL_CONTEXT);
        setSwitcherWarning('');
        return;
      }

      const bridgeContext = (await view.getContext()) as {
        extension?: {
          content?: { id?: string | number };
          page?: { id?: string | number };
          id?: string | number;
        };
      };
      const pageId = String(
        bridgeContext?.extension?.content?.id ??
          bridgeContext?.extension?.page?.id ??
          bridgeContext?.extension?.id ??
          ''
      );

      if (!pageId) {
        throw new Error('Could not determine Confluence page id from macro context.');
      }
      pageIdForCache = pageId;

      const payload = await invokeTyped('hdcGetContext', { pageId });
      setContext(payload);
      writeSwitcherRegistryCache(pageId, payload.registry);
      logSwitcherNavigabilityTelemetry('macro.context.live', payload.registry);
      setSwitcherWarning('');
    } catch (err) {
      if (pageIdForCache) {
        const cachedRegistry = readSwitcherRegistryCache(pageIdForCache);
        if (cachedRegistry) {
          setContext((current) => (current ? { ...current, registry: cachedRegistry } : current));
          logSwitcherNavigabilityTelemetry('macro.context.cache', cachedRegistry);
          setSwitcherWarning('Using cached app switcher entries; live refresh failed.');
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to load macro context.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const refreshSwitcherRegistry = useCallback(async () => {
    setRefreshingSwitcherRegistry(true);
    try {
      await loadContext();
      setMessage('Switcher registry refreshed.');
      setError('');
    } finally {
      setRefreshingSwitcherRegistry(false);
    }
  }, [loadContext]);

  useEffect(() => {
    setSwitcherOpen(false);
  }, [context?.pageId]);

  useEffect(() => {
    if (!switcherOpen) return;

    const handlePointerDown = (event: MouseEvent): void => {
      if (switcherRef.current && event.target instanceof Node && !switcherRef.current.contains(event.target)) {
        setSwitcherOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSwitcherOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [switcherOpen]);

  useEffect(() => {
    if (!switcherOpen || !switcherMenuRef.current) return;
    const firstOption = switcherMenuRef.current.querySelector<HTMLButtonElement>(
      'button[data-switcher-option="true"]:not(:disabled)'
    );
    firstOption?.focus();
  }, [switcherOpen]);

  const canAdminInstance = Boolean(context?.permissions.isPrimaryAdmin || context?.permissions.isCoAdmin);
  const isPrimaryAdmin = Boolean(context?.permissions.isPrimaryAdmin);
  const isTemplateRuntime = Boolean(context?.event?.runtimeType === 'hackday_template');
  const isReadOnlyInstance = Boolean(
    context?.event && (context.event.lifecycleStatus === 'completed' || context.event.lifecycleStatus === 'archived')
  );
  const instanceAdminActionState = useMemo(
    () =>
      getInstanceAdminActionState({
        lifecycleStatus: context?.event?.lifecycleStatus,
        syncStatus: context?.syncState?.syncStatus ?? null,
        canAdminInstance,
        isPrimaryAdmin,
        saving,
      }),
    [canAdminInstance, context?.event?.lifecycleStatus, context?.syncState?.syncStatus, isPrimaryAdmin, saving]
  );

  const sortedRegistry = useMemo(
    () => sortByMostRecent([...(context?.registry ?? [])]),
    [context?.registry]
  );
  const switcherSections = useMemo(
    () => buildSwitcherSections(context?.registry ?? []),
    [context?.registry]
  );
  const hasNonNavigableSwitcherItems = useMemo(
    () => (context?.registry ?? []).some((item) => !isNavigableRegistryItem(item)),
    [context?.registry]
  );

  const invalidateSwitcherCaches = useCallback((current: HdcContextResponse | null) => {
    if (!current) return;
    const pageIds = new Set<string>();
    pageIds.add(current.pageId);
    if (current.event?.confluencePageId) {
      pageIds.add(current.event.confluencePageId);
    }
    if (current.event?.confluenceParentPageId) {
      pageIds.add(current.event.confluenceParentPageId);
    }
    for (const pageId of pageIds) {
      invalidateSwitcherRegistryCache(pageId);
    }
  }, []);

  const wizardDraft = useMemo<WizardDraftState>(
    () => ({
      eventName,
      eventIcon,
      eventTagline,
      primaryAdminEmail,
      coAdminsInput,
      timezone,
      registrationOpensAt,
      registrationClosesAt,
      teamFormationStartsAt,
      teamFormationEndsAt,
      hackingStartsAt,
      submissionDeadlineAt,
      votingStartsAt,
      votingEndsAt,
      resultsAnnounceAt,
      allowCrossTeamMentoring,
      minTeamSize,
      maxTeamSize,
      requireDemoLink,
      submissionRequirements,
      judgingModel,
      categoriesInput,
      prizesText,
      bannerMessage,
      accentColor,
      bannerImageUrl,
      themePreference,
      scheduleBuilderState,
    }),
    [
      accentColor,
      allowCrossTeamMentoring,
      bannerImageUrl,
      bannerMessage,
      categoriesInput,
      coAdminsInput,
      eventIcon,
      eventName,
      eventTagline,
      hackingStartsAt,
      judgingModel,
      maxTeamSize,
      minTeamSize,
      prizesText,
      primaryAdminEmail,
      registrationClosesAt,
      registrationOpensAt,
      requireDemoLink,
      resultsAnnounceAt,
      submissionDeadlineAt,
      submissionRequirements,
      teamFormationEndsAt,
      teamFormationStartsAt,
      themePreference,
      timezone,
      votingEndsAt,
      votingStartsAt,
      scheduleBuilderState,
    ]
  );

  const resetWizard = useCallback(
    (clearSaved: boolean) => {
      setWizardStep(1);
      setEventName('');
      setEventIcon('🚀');
      setEventTagline('');
      setEventNameError('');
      setPrimaryAdminEmail('');
      setCoAdminsInput('');
      setTimezone(DEFAULT_TIMEZONE);
      setScheduleOutput(null);
      setRegistrationOpensAt('');
      setRegistrationClosesAt('');
      setTeamFormationStartsAt('');
      setTeamFormationEndsAt('');
      setHackingStartsAt('');
      setSubmissionDeadlineAt('');
      setVotingStartsAt('');
      setVotingEndsAt('');
      setResultsAnnounceAt('');
      setAllowCrossTeamMentoring(true);
      setMinTeamSize('1');
      setMaxTeamSize('6');
      setRequireDemoLink(false);
      setSubmissionRequirements([]);
      setJudgingModel('hybrid');
      setCategoriesInput('');
      setPrizesText('');
      setBannerMessage('');
      setAccentColor('#0f766e');
      setBannerImageUrl('');
      setThemePreference('system');
      setScheduleBuilderState(null);
      setPendingCreateRequestId(null);
      setCreateDraftTimedOut(false);

      if (clearSaved && context?.pageType === 'parent' && typeof window !== 'undefined') {
        window.localStorage.removeItem(wizardStorageKey(context.pageId));
      }
    },
    [context?.pageId, context?.pageType]
  );

  useEffect(() => {
    if (wizardLoaded) return;
    if (LOCAL_PREVIEW) {
      setWizardLoaded(true);
      return;
    }
    if (!context || context.pageType !== 'parent') return;
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(wizardStorageKey(context.pageId));
    if (!raw) {
      setWizardLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<WizardDraftState>;
      if (typeof parsed.eventName === 'string') setEventName(parsed.eventName);
      if (typeof parsed.eventIcon === 'string' && parsed.eventIcon.trim()) setEventIcon(parsed.eventIcon);
      if (typeof parsed.eventTagline === 'string') setEventTagline(parsed.eventTagline);
      if (typeof parsed.primaryAdminEmail === 'string') setPrimaryAdminEmail(parsed.primaryAdminEmail);
      if (typeof parsed.coAdminsInput === 'string') setCoAdminsInput(parsed.coAdminsInput);
      if (typeof parsed.timezone === 'string' && parsed.timezone.trim()) setTimezone(parsed.timezone);
      if (typeof parsed.registrationOpensAt === 'string') setRegistrationOpensAt(parsed.registrationOpensAt);
      if (typeof parsed.registrationClosesAt === 'string') setRegistrationClosesAt(parsed.registrationClosesAt);
      if (typeof parsed.teamFormationStartsAt === 'string') setTeamFormationStartsAt(parsed.teamFormationStartsAt);
      if (typeof parsed.teamFormationEndsAt === 'string') setTeamFormationEndsAt(parsed.teamFormationEndsAt);
      if (typeof parsed.hackingStartsAt === 'string') setHackingStartsAt(parsed.hackingStartsAt);
      if (typeof parsed.submissionDeadlineAt === 'string') setSubmissionDeadlineAt(parsed.submissionDeadlineAt);
      if (typeof parsed.votingStartsAt === 'string') setVotingStartsAt(parsed.votingStartsAt);
      if (typeof parsed.votingEndsAt === 'string') setVotingEndsAt(parsed.votingEndsAt);
      if (typeof parsed.resultsAnnounceAt === 'string') setResultsAnnounceAt(parsed.resultsAnnounceAt);
      if (typeof parsed.allowCrossTeamMentoring === 'boolean') {
        setAllowCrossTeamMentoring(parsed.allowCrossTeamMentoring);
      }
      if (typeof parsed.minTeamSize === 'string') setMinTeamSize(parsed.minTeamSize);
      if (typeof parsed.maxTeamSize === 'string') setMaxTeamSize(parsed.maxTeamSize);
      if (typeof parsed.requireDemoLink === 'boolean') setRequireDemoLink(parsed.requireDemoLink);
      if (Array.isArray(parsed.submissionRequirements)) {
        setSubmissionRequirements(
          parsed.submissionRequirements.filter(
            (value): value is SubmissionRequirement =>
              value === 'video_demo' || value === 'working_prototype' || value === 'documentation'
          )
        );
      }
      if (parsed.judgingModel === 'panel' || parsed.judgingModel === 'popular_vote' || parsed.judgingModel === 'hybrid') {
        setJudgingModel(parsed.judgingModel);
      }
      if (typeof parsed.categoriesInput === 'string') setCategoriesInput(parsed.categoriesInput);
      if (typeof parsed.prizesText === 'string') setPrizesText(parsed.prizesText);
      if (typeof parsed.bannerMessage === 'string') setBannerMessage(parsed.bannerMessage);
      if (typeof parsed.accentColor === 'string' && parsed.accentColor.trim()) setAccentColor(parsed.accentColor);
      if (typeof parsed.bannerImageUrl === 'string') setBannerImageUrl(parsed.bannerImageUrl);
      if (parsed.themePreference === 'system' || parsed.themePreference === 'light' || parsed.themePreference === 'dark') {
        setThemePreference(parsed.themePreference);
      }
      if (isScheduleBuilderStateDraft(parsed.scheduleBuilderState)) {
        setScheduleBuilderState(parsed.scheduleBuilderState);
      }
    } catch {
      window.localStorage.removeItem(wizardStorageKey(context.pageId));
    } finally {
      setWizardLoaded(true);
    }
  }, [context, wizardLoaded]);

  useEffect(() => {
    if (!wizardLoaded) return;
    if (!context || context.pageType !== 'parent') return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(wizardStorageKey(context.pageId), JSON.stringify(wizardDraft));
  }, [context, wizardDraft, wizardLoaded]);

  const getValidationErrorForStep = useCallback(
    (step: WizardStep): string | null => {
      if (step >= 1) {
        setEventNameError('');
        if (!eventName.trim()) {
          setEventNameError('Event name is required.');
          return 'Event name is required.';
        }
        if (primaryAdminEmail.trim() && !isAdaptavistEmail(primaryAdminEmail)) {
          return `Primary admin email must be an ${ALLOWED_EMAIL_DOMAIN} address.`;
        }
        const invalidCoAdmin = coAdminsInput
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
          .some((email) => !isAdaptavistEmail(email));
        if (invalidCoAdmin) {
          return `All co-admin emails must be ${ALLOWED_EMAIL_DOMAIN} addresses.`;
        }
      }

      if (step >= 2) {
        if (isDateRangeInvalid(registrationOpensAt, registrationClosesAt)) {
          return 'Registration close must be after registration open.';
        }
        if (isDateRangeInvalid(teamFormationStartsAt, teamFormationEndsAt)) {
          return 'Team formation end must be after team formation start.';
        }
        if (isDateRangeInvalid(hackingStartsAt, submissionDeadlineAt)) {
          return 'Submission deadline must be after the hacking start time.';
        }
        if (isDateRangeInvalid(votingStartsAt, votingEndsAt)) {
          return 'Voting end must be after voting start.';
        }
      }

      if (step >= 4) {
        const minTeam = Math.max(1, Math.floor(Number(minTeamSize) || 1));
        const maxTeam = Math.max(1, Math.floor(Number(maxTeamSize) || 1));
        if (minTeam > maxTeam) {
          return 'Minimum team size must be less than or equal to maximum team size.';
        }
      }

      return null;
    },
    [
      coAdminsInput,
      eventName,
      hackingStartsAt,
      maxTeamSize,
      minTeamSize,
      primaryAdminEmail,
      registrationClosesAt,
      registrationOpensAt,
      submissionDeadlineAt,
      teamFormationEndsAt,
      teamFormationStartsAt,
      votingEndsAt,
      votingStartsAt,
    ]
  );

  const goToNextStep = useCallback(() => {
    setError('');
    setEventNameError('');
    const validationError = getValidationErrorForStep(wizardStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setWizardStep((step) => (step < 6 ? ((step + 1) as WizardStep) : step));
  }, [getValidationErrorForStep, wizardStep]);

  const goToPreviousStep = useCallback(() => {
    setError('');
    setEventNameError('');
    setWizardStep((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
  }, []);

  const resolveAppViewUrlForPage = useCallback(async (targetPageId: string): Promise<string | null> => {
    if (LOCAL_PREVIEW || !targetPageId) return null;
    try {
      const result = await invokeTyped('hdcGetAppViewUrl', { pageId: targetPageId });
      const url = typeof result?.url === 'string' ? result.url.trim() : '';
      if (url) {
        console.info(
          '[HackCentral macro app-view route]',
          JSON.stringify({
            pageId: targetPageId,
            runtimeOwner: result.runtimeOwner,
            routeVersion: result.routeVersion,
          })
        );
      }
      return url || null;
    } catch (err) {
      if (isRuntimeConfigError(err)) {
        setError(getRuntimeConfigOperatorMessage(err));
        throw err;
      }
      return null;
    }
  }, []);

  const handleCreateDraft = useCallback(async () => {
    if (!context) {
      setError('Event context is not loaded yet.');
      return;
    }
    if (LOCAL_PREVIEW) {
      setMessage('Local preview mode: create draft is disabled.');
      return;
    }

    setError('');
    setEventNameError('');
    const validationError = getValidationErrorForStep(wizardStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setMessage(HDC_PERF_LOADING_UX_V1 ? 'Creating HackDay draft...' : '');

    const requestId = pendingCreateRequestId || crypto.randomUUID();
    if (!pendingCreateRequestId) {
      setPendingCreateRequestId(requestId);
    }
    const handoffStartedAt = Date.now();
    const handoffStageMs: Record<string, number> = {};
    const markHandoffStage = (stage: string, stageStartedAt: number): void => {
      handoffStageMs[stage] = Math.max(0, Date.now() - stageStartedAt);
    };
    let handoffOutcome: 'opened_app_view' | 'fallback_child_page' | 'context_refreshed' | 'timeout' | 'error' = 'error';
    let handoffWarning: string | null = null;
    let handoffEventId: string | null = null;
    let handoffChildPageId: string | null = null;

    try {
      const normalizedPrimaryAdminEmail = primaryAdminEmail.trim().toLowerCase();
      const coAdminEmails = coAdminsInput
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);
      const minTeam = Math.max(1, Math.floor(Number(minTeamSize) || 1));
      const maxTeam = Math.max(minTeam, Math.floor(Number(maxTeamSize) || 1));
      const categories = categoriesInput
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const payload: CreateInstanceDraftInput = {
        parentPageId: context.pageId,
        creationRequestId: requestId,
        wizardSchemaVersion: 2,
        completedStep: wizardStep,
        launchMode: 'draft',
        instanceRuntime: 'hackday_template',
        templateTarget: 'hackday',
        basicInfo: {
          eventName: eventName.trim(),
          eventIcon: eventIcon || '🚀',
          eventTagline: eventTagline.trim() || undefined,
          primaryAdminEmail: normalizedPrimaryAdminEmail || undefined,
          coAdminEmails: coAdminEmails.length > 0 ? coAdminEmails : undefined,
        },
        schedule: {
          timezone: scheduleOutput?.timezone || timezone,
          duration: eventDuration,
          selectedEvents: selectedEvents,
          ...(scheduleOutput || {}),
          registrationOpensAt: scheduleOutput?.registrationOpensAt || registrationOpensAt || undefined,
          registrationClosesAt: scheduleOutput?.registrationClosesAt || registrationClosesAt || undefined,
          teamFormationStartsAt: scheduleOutput?.teamFormationStartsAt || teamFormationStartsAt || undefined,
          teamFormationEndsAt: scheduleOutput?.teamFormationEndsAt || teamFormationEndsAt || undefined,
          hackingStartsAt: scheduleOutput?.hackingStartsAt || hackingStartsAt || undefined,
          submissionDeadlineAt: scheduleOutput?.submissionDeadlineAt || submissionDeadlineAt || undefined,
          votingStartsAt: scheduleOutput?.votingStartsAt || votingStartsAt || undefined,
          votingEndsAt: scheduleOutput?.votingEndsAt || votingEndsAt || undefined,
          resultsAnnounceAt: scheduleOutput?.resultsAnnounceAt || resultsAnnounceAt || undefined,
        },
        rules: {
          allowCrossTeamMentoring,
          minTeamSize: minTeam,
          maxTeamSize: maxTeam,
          requireDemoLink,
          judgingModel,
          submissionRequirements: submissionRequirements.length > 0 ? submissionRequirements : undefined,
          categories: categories.length > 0 ? categories : undefined,
          prizesText: prizesText.trim() || undefined,
        },
        branding: {
          bannerMessage: bannerMessage.trim() || undefined,
          accentColor: accentColor.trim() || undefined,
          bannerImageUrl: bannerImageUrl.trim() || undefined,
          themePreference,
        },
      };

      const createResolverStartedAt = Date.now();
      const result = await withTimeout(
        invokeTyped('hdcCreateInstanceDraft', payload),
        CREATE_DRAFT_TIMEOUT_MS,
        `Creation timed out after ${CREATE_DRAFT_TIMEOUT_MS / 1000} seconds.`
      );
      markHandoffStage('create_resolver', createResolverStartedAt);
      setMessage(
        `Draft created. Child page id: ${result.childPageId}. Template provision status: ${result.templateProvisionStatus ?? 'provisioned'}. Open that page and click "Open App View" for the full runtime.`
      );
      setCreateDraftTimedOut(false);
      resetWizard(true);
      invalidateSwitcherCaches(context);
      const childPageId = typeof result.childPageId === 'string' ? result.childPageId.trim() : '';
      handoffEventId = typeof result.eventId === 'string' ? result.eventId : null;
      handoffChildPageId = childPageId || null;

      if (childPageId) {
        if (HDC_PERF_LOADING_UX_V1) {
          setMessage('Draft created. Preparing app context...');
        }
        const activationStartedAt = Date.now();
        try {
          const activation = HDC_PERF_CREATE_HANDOFF_V1 && handoffEventId
            ? await invokeTyped('hdcSetActiveAppModeContext', { pageId: childPageId, eventId: handoffEventId })
            : await invokeTyped('hdcActivateAppModeContext', { pageId: childPageId });
          if (!activation?.success) {
            console.warn('[HackCentral Macro] hdcActivateAppModeContext returned non-success during create flow', activation);
          }
        } catch (activationErr) {
          console.warn('[HackCentral Macro] Failed to prime app mode context during create flow', activationErr);
          handoffWarning = activationErr instanceof Error ? activationErr.message : String(activationErr);
        }
        markHandoffStage('context_activation', activationStartedAt);
      }

      const appViewUrlLookupStartedAt = Date.now();
      const appViewUrl = result.appViewUrl || (await resolveAppViewUrlForPage(result.childPageId));
      markHandoffStage('app_view_url_lookup', appViewUrlLookupStartedAt);
      const appViewRuntimeOwner = typeof result.appViewRuntimeOwner === 'string'
        ? result.appViewRuntimeOwner.trim().toLowerCase()
        : '';
      if (appViewRuntimeOwner === 'hackcentral' && !appViewUrl) {
        throw new Error(
          `[${RUNTIME_CONFIG_ERROR_CODE}] HackCentral runtime owner returned no appViewUrl during create flow.`
        );
      }
      let appViewOpened = false;
      if (appViewUrl) {
        setMessage('Draft created. Opening full app view now...');
        const appViewLaunchStartedAt = Date.now();
        appViewOpened = HDC_PERF_CREATE_HANDOFF_V1
          ? await launchAppViewUrlFastPath(appViewUrl)
          : await launchAppViewUrl(appViewUrl);
        markHandoffStage('app_view_launch', appViewLaunchStartedAt);
        if (appViewOpened) {
          handoffOutcome = 'opened_app_view';
          setMessage('Draft created. App view opened.');
          return;
        }
        setMessage('Draft created. App view launch was blocked, opening child page instead.');
      }

      const childPagePath = childPageId ? buildConfluencePagePath(childPageId) : '';
      const absoluteChildTarget =
        childPagePath && typeof window !== 'undefined'
          ? `${window.location.origin}${childPagePath}`
          : childPagePath;

      if (childPagePath) {
        setMessage('Draft created. Redirecting to the child page. Then use "Open App View" in the page header.');
        const childNavigateStartedAt = Date.now();
        try {
          await router.navigate(childPagePath);
          markHandoffStage('child_page_navigation', childNavigateStartedAt);
          handoffOutcome = 'fallback_child_page';
          return;
        } catch {
          // Fall through to broader navigation options.
        }

        if (absoluteChildTarget) {
          try {
            await router.open(absoluteChildTarget);
            markHandoffStage('child_page_navigation', childNavigateStartedAt);
            handoffOutcome = 'fallback_child_page';
            return;
          } catch {
            if (typeof window !== 'undefined') {
              markHandoffStage('child_page_navigation', childNavigateStartedAt);
              handoffOutcome = 'fallback_child_page';
              window.location.assign(absoluteChildTarget);
              return;
            }
          }
        }
      }

      if (result.childPageUrl) {
        setMessage('Draft created. Redirecting to the child page. Then use "Open App View" in the page header.');
        const childNavigateStartedAt = Date.now();
        try {
          await router.navigate(result.childPageUrl);
          markHandoffStage('child_page_navigation', childNavigateStartedAt);
          handoffOutcome = 'fallback_child_page';
          return;
        } catch {
          if (typeof window !== 'undefined') {
            markHandoffStage('child_page_navigation', childNavigateStartedAt);
            handoffOutcome = 'fallback_child_page';
            window.location.assign(result.childPageUrl);
            return;
          }
        }
      }

      const contextRefreshStartedAt = Date.now();
      await loadContext();
      markHandoffStage('context_refresh', contextRefreshStartedAt);
      handoffOutcome = 'context_refreshed';
    } catch (err) {
      if (isRuntimeConfigError(err)) {
        setCreateDraftTimedOut(false);
        setError(getRuntimeConfigOperatorMessage(err));
        handoffWarning = err instanceof Error ? err.message : String(err);
        handoffOutcome = 'error';
        return;
      }
      if (isRequestTimeoutError(err)) {
        setCreateDraftTimedOut(true);
        setMessage(
          `Creation is taking longer than ${CREATE_DRAFT_TIMEOUT_MS / 1000} seconds. Retry to continue with the same request id.`
        );
        handoffOutcome = 'timeout';
        handoffWarning = err.message;
        return;
      }
      if (isDuplicateEventNameError(err)) {
        setEventNameError('An instance with this name already exists under this parent page.');
        setPendingCreateRequestId(null);
        setCreateDraftTimedOut(false);
        handoffWarning = getErrorMessage(err);
        handoffOutcome = 'error';
        return;
      }

      handoffWarning = err instanceof Error ? err.message : String(err);
      setError(err instanceof Error ? err.message : 'Failed to create draft instance.');
    } finally {
      logCreateHandoffTelemetry({
        creationRequestId: requestId,
        eventId: handoffEventId,
        childPageId: handoffChildPageId,
        durationMs: Math.max(0, Date.now() - handoffStartedAt),
        stageMs: handoffStageMs,
        outcome: handoffOutcome,
        warning: handoffWarning,
      });
      setSaving(false);
    }
  }, [
    coAdminsInput,
    context,
    eventIcon,
    eventName,
    eventTagline,
    allowCrossTeamMentoring,
    requireDemoLink,
    judgingModel,
    bannerMessage,
    accentColor,
    bannerImageUrl,
    categoriesInput,
    hackingStartsAt,
    loadContext,
    maxTeamSize,
    minTeamSize,
    pendingCreateRequestId,
    prizesText,
    primaryAdminEmail,
    registrationClosesAt,
    registrationOpensAt,
    resetWizard,
    invalidateSwitcherCaches,
    submissionDeadlineAt,
    submissionRequirements,
    teamFormationEndsAt,
    teamFormationStartsAt,
    themePreference,
    timezone,
    votingEndsAt,
    votingStartsAt,
    wizardStep,
    resultsAnnounceAt,
    getValidationErrorForStep,
    resolveAppViewUrlForPage,
  ]);

  const handleSubmitHack = useCallback(async () => {
    if (!context?.event) {
      setError('No instance context available for hack submission.');
      return;
    }
    if (context.event.runtimeType === 'hackday_template') {
      setError('This template instance is managed in HackDay. Submit hacks in the HackDay app.');
      return;
    }
    if (context.event.lifecycleStatus === 'completed' || context.event.lifecycleStatus === 'archived') {
      setError('Instance is read-only after completion; hack submissions are disabled.');
      return;
    }
    if (!hackTitle.trim()) {
      setError('Hack title is required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await invokeTyped('hdcSubmitHack', {
        eventId: context.event.id,
        title: hackTitle.trim(),
        description: hackDescription.trim() || undefined,
      });
      setMessage(`Hack submitted as project ${result.projectId}.`);
      setHackTitle('');
      setHackDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit hack.');
    } finally {
      setSaving(false);
    }
  }, [context?.event, hackDescription, hackTitle]);

  const runSync = useCallback(
    async (mode: 'complete' | 'retry') => {
      if (!context?.event) {
        setError('No instance selected for sync.');
        return;
      }
      if (context.event.runtimeType === 'hackday_template') {
        setError('This template instance is managed in HackDay. Sync actions are disabled in HackDay Central.');
        return;
      }
      if (context.event.lifecycleStatus === 'completed' || context.event.lifecycleStatus === 'archived') {
        setError('Instance is read-only after completion; sync actions are disabled.');
        return;
      }

      setSaving(true);
      setError('');
      setMessage('');

      try {
        const result: SyncResult = await invokeTyped(
          mode === 'complete' ? 'hdcCompleteAndSync' : 'hdcRetrySync',
          { eventId: context.event.id }
        );
        setMessage(
          `Sync status: ${result.syncStatus}. Pushed: ${result.pushedCount}, skipped: ${result.skippedCount}.${
            result.retryGuidance ? ` Guidance: ${result.retryGuidance}` : ''
          }`
        );
        invalidateSwitcherCaches(context);
        await loadContext();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed.');
        await loadContext();
      } finally {
        setSaving(false);
      }
    },
    [context, loadContext, invalidateSwitcherCaches, resolveAppViewUrlForPage]
  );

  const handleLaunch = useCallback(async () => {
    if (!context?.event) {
      setError('No instance selected for lifecycle update.');
      return;
    }
    if (context.event.lifecycleStatus === 'completed' || context.event.lifecycleStatus === 'archived') {
      setError('Instance is read-only after completion; lifecycle updates are disabled.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await invokeTyped('hdcLaunchInstance', { eventId: context.event.id });
      setMessage(`Instance lifecycle updated to ${result.lifecycleStatus}.`);
      invalidateSwitcherCaches(context);
      await loadContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance lifecycle.');
    } finally {
      setSaving(false);
    }
  }, [context, loadContext, invalidateSwitcherCaches]);

  const handleDeleteDraft = useCallback(async () => {
    if (!context?.event) {
      setError('No instance selected to delete.');
      return;
    }
    if (context.event.runtimeType === 'hackday_template') {
      setError('Template seed rows must be deleted from the provisioning workflow; draft delete is disabled here.');
      return;
    }
    if (!isPrimaryAdmin) {
      setError('Only the primary admin can delete this draft.');
      return;
    }
    if (context.event.lifecycleStatus !== 'draft') {
      setError('Only draft instances can be deleted.');
      return;
    }
    if (LOCAL_PREVIEW) {
      setMessage('Local preview mode: draft deletion is disabled.');
      return;
    }
    if (!window.confirm('Delete this draft instance? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await invokeTyped('hdcDeleteDraftInstance', { eventId: context.event.id });
      setMessage('Draft deleted.');
      invalidateSwitcherCaches(context);
      await loadContext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft instance.');
    } finally {
      setSaving(false);
    }
  }, [context, isPrimaryAdmin, loadContext, invalidateSwitcherCaches]);

  const homePageId = context ? getHomePageId(context) : null;
  const currentContextPageId =
    context?.pageType === 'instance' ? context.event?.confluencePageId ?? context.pageId : context?.pageId ?? null;
  const currentSwitcherLabel =
    context?.pageType === 'instance' && context.event ? context.event.eventName : 'HackDay Central';
  const currentSwitcherIcon =
    context?.pageType === 'instance' && context.event ? context.event.icon || '🚀' : '🏠';
  const switcherGroups = [
    { title: 'Live Events', items: switcherSections.live },
    { title: 'Upcoming', items: switcherSections.upcoming },
    { title: 'Recent', items: switcherSections.recent },
  ];

  const navigateToPageId = useCallback(
    async (targetPageId: string) => {
      if (!targetPageId) return;
      if (targetPageId === currentContextPageId) {
        setSwitcherOpen(false);
        return;
      }
      let appViewUrl: string | null = null;
      try {
        appViewUrl = await resolveAppViewUrlForPage(targetPageId);
      } catch (err) {
        if (isRuntimeConfigError(err)) {
          return;
        }
        appViewUrl = null;
      }
      const targetPath = buildConfluencePagePath(targetPageId);
      const absoluteTarget =
        typeof window !== 'undefined' ? `${window.location.origin}${targetPath}` : targetPath;

      setSwitcherOpen(false);
      if (LOCAL_PREVIEW) {
        setMessage(`Local preview mode: would navigate to ${appViewUrl || targetPath}`);
        return;
      }

      if (appViewUrl) {
        if (await launchAppViewUrl(appViewUrl)) {
          return;
        }
      }

      try {
        await router.navigate(targetPath);
        return;
      } catch {
        // Fall through to broader navigation options.
      }

      try {
        await router.open(absoluteTarget);
        return;
      } catch {
        if (typeof window !== 'undefined') {
          window.location.assign(absoluteTarget);
        }
      }
    },
    [currentContextPageId, resolveAppViewUrlForPage]
  );

  const handleSwitcherMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!switcherMenuRef.current) return;
    const options = Array.from(
      switcherMenuRef.current.querySelectorAll<HTMLButtonElement>('button[data-switcher-option="true"]')
    ).filter((option) => !option.disabled);
    if (options.length === 0) return;

    const currentIndex = options.findIndex((option) => option === document.activeElement);
    const firstIndex = 0;
    const lastIndex = options.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < 0 || currentIndex >= lastIndex ? firstIndex : currentIndex + 1;
      options[nextIndex]?.focus();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = currentIndex <= firstIndex ? lastIndex : currentIndex - 1;
      options[nextIndex]?.focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      options[firstIndex]?.focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      options[lastIndex]?.focus();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setSwitcherOpen(false);
    }
  }, []);

  if (loading) {
    return <main className="shell">Loading HackDay Central macro…</main>;
  }

  if (!context) {
    return <main className="shell error">{error || 'No context returned.'}</main>;
  }

  return (
    <main className="shell">
      <header className="top">
        <div className="top-copy">
          <h1>HackDay Central</h1>
          <p>{context.pageType === 'parent' ? 'Parent page mode' : 'Instance page mode'}</p>
        </div>

        <div className="app-switcher" ref={switcherRef}>
          <button
            type="button"
            className="switcher-trigger"
            aria-expanded={switcherOpen}
            aria-haspopup="menu"
            aria-controls="app-switcher-menu"
            onClick={() => setSwitcherOpen((open) => !open)}
            onKeyDown={(event) => {
              if (!switcherOpen && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
                event.preventDefault();
                setSwitcherOpen(true);
              }
            }}
          >
            <span className="switcher-trigger-icon" aria-hidden>
              {currentSwitcherIcon}
            </span>
            <span className="switcher-trigger-label">{currentSwitcherLabel}</span>
            <span className="switcher-trigger-caret" aria-hidden>
              ▾
            </span>
          </button>

          {switcherOpen ? (
            <>
              <button
                type="button"
                className="switcher-overlay"
                aria-label="Close app switcher"
                onClick={() => setSwitcherOpen(false)}
              />
              <div
                id="app-switcher-menu"
                className="switcher-menu"
                role="menu"
                aria-label="HackDay app switcher"
                ref={switcherMenuRef}
                onKeyDown={handleSwitcherMenuKeyDown}
              >
                <section className="switcher-section" aria-label="Home">
                  <p className="switcher-section-title">Home</p>
                  <button
                    type="button"
                    data-switcher-option="true"
                    className={`switcher-row ${
                      currentContextPageId === homePageId || context.pageType === 'parent' ? 'current' : ''
                    }`}
                    disabled={!homePageId || currentContextPageId === homePageId}
                    onClick={() => {
                      if (homePageId) {
                        void navigateToPageId(homePageId);
                      }
                    }}
                  >
                    <span className="switcher-row-main">
                      <span className="switcher-row-title">🏠 HackDay Central</span>
                      <span className="switcher-row-meta">Parent page</span>
                    </span>
                    <span className="switcher-row-status">Home</span>
                  </button>
                </section>

                {switcherGroups.map((group) => (
                  <section key={group.title} className="switcher-section" aria-label={group.title}>
                    <p className="switcher-section-title">{group.title}</p>
                    {group.items.length === 0 ? (
                      <p className="switcher-empty">No events</p>
                    ) : (
                      group.items.map((item) => {
                        const isCurrent = currentContextPageId === item.confluencePageId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-switcher-option="true"
                            className={`switcher-row ${isCurrent ? 'current' : ''}`}
                            disabled={isCurrent || !isNavigableRegistryItem(item)}
                            onClick={() => {
                              runSwitcherNavigation(item, (targetPageId) => {
                                void navigateToPageId(targetPageId);
                              });
                            }}
                          >
                            <span className="switcher-row-main">
                              <span className="switcher-row-title">
                                {item.icon || '🚀'} {item.eventName}
                              </span>
                              <span className="switcher-row-meta">{switcherRowMetaText(item)}</span>
                            </span>
                            <span className={`switcher-row-status ${getLifecycleStatusClass(item.lifecycleStatus)}`}>
                              {formatLifecycle(item.lifecycleStatus)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </section>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </header>

      {LOCAL_PREVIEW ? <section className="note">Local preview mode: resolver calls are disabled.</section> : null}
      {switcherWarning ? <section className="note">{switcherWarning}</section> : null}
      {hasNonNavigableSwitcherItems ? (
        <section className="note">
          Some switcher entries are unavailable until their Confluence pages are provisioned.
          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="button-muted"
              onClick={() => void refreshSwitcherRegistry()}
              disabled={refreshingSwitcherRegistry}
            >
              {refreshingSwitcherRegistry ? 'Refreshing registry…' : 'Refresh switcher registry'}
            </button>
          </div>
        </section>
      ) : null}
      {message ? <section className="note success">{message}</section> : null}
      {error ? <section className="note error">{error}</section> : null}

      {context.pageType === 'parent' ? (
        <section className="grid">
          <article className="card">
            <h2>Create a HackDay</h2>
            <p>Use the 6-step wizard to create a new HackDay event. A child Confluence page is created first, then use "Open App View" on that page for full app-shell mode.</p>

            <div className="wizard-steps">
              {(['Basic', 'Schedule', 'Schedule Review', 'Rules', 'Branding', 'Review'] as const).map((label, idx) => (
                <span key={label} className={`wizard-step${wizardStep === idx + 1 ? ' wizard-step-active' : wizardStep > idx + 1 ? ' wizard-step-done' : ''}`}>
                  {idx + 1}. {label}
                </span>
              ))}
            </div>

            {eventNameError ? <p className="note error">{eventNameError}</p> : null}

            {wizardStep === 1 ? (
              <div className="wizard-fields">
                <label htmlFor="m-name">Event name *</label>
                <input id="m-name" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Spring HackDay 2026" />
                <label htmlFor="m-icon">Icon (emoji)</label>
                <input id="m-icon" value={eventIcon} onChange={(e) => setEventIcon(e.target.value)} placeholder="🚀" maxLength={4} />
                <label htmlFor="m-tagline">Tagline</label>
                <input id="m-tagline" value={eventTagline} onChange={(e) => setEventTagline(e.target.value)} placeholder="Optional short description" />
                <label htmlFor="m-admin">Primary admin email</label>
                <input id="m-admin" type="email" value={primaryAdminEmail} onChange={(e) => setPrimaryAdminEmail(e.target.value)} placeholder="you@adaptavist.com" />
                <label htmlFor="m-co">Co-admin emails (comma-separated)</label>
                <input id="m-co" value={coAdminsInput} onChange={(e) => setCoAdminsInput(e.target.value)} placeholder="co@adaptavist.com" />
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div className="wizard-fields">
                <ScheduleBuilderV2
                  timezone={timezone}
                  initialState={scheduleBuilderState ?? undefined}
                  onChange={(output) => {
                    setScheduleOutput(output);
                    // Sync timezone and duration from V2 output
                    if (output.timezone) setTimezone(output.timezone);
                    if (output.duration) setEventDuration(output.duration);
                  }}
                  onStateChange={setScheduleBuilderState}
                  showInlinePreview={false}
                />
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div className="wizard-fields">
                <p className="meta" style={{ marginTop: 0 }}>
                  Review the generated timeline before continuing. If anything looks off, go back to Schedule and edit the timing, enabled events, or custom events.
                </p>
                {scheduleBuilderState ? (
                  <ScheduleBuilderV2Preview
                    duration={scheduleBuilderState.duration}
                    anchorDate={scheduleBuilderState.anchorDate}
                    timezone={scheduleBuilderState.timezone || timezone}
                    eventStates={scheduleBuilderState.eventStates}
                    customEvents={scheduleBuilderState.customEvents}
                    showHeaderText={false}
                    surfaceVariant="flat"
                  />
                ) : (
                  <p className="note">
                    Preview is unavailable until the Schedule step is opened in this session. Go back to Schedule to generate it.
                  </p>
                )}
              </div>
            ) : null}

            {wizardStep === 4 ? (
              <div className="wizard-fields">
                <label htmlFor="m-min-team">Min team size</label>
                <input id="m-min-team" type="number" min="1" value={minTeamSize} onChange={(e) => setMinTeamSize(e.target.value)} />
                <label htmlFor="m-max-team">Max team size</label>
                <input id="m-max-team" type="number" min="1" value={maxTeamSize} onChange={(e) => setMaxTeamSize(e.target.value)} />
                <label htmlFor="m-judging">Judging model</label>
                <select id="m-judging" value={judgingModel} onChange={(e) => setJudgingModel(e.target.value as 'panel' | 'popular_vote' | 'hybrid')}>
                  <option value="hybrid">Hybrid</option>
                  <option value="panel">Panel</option>
                  <option value="popular_vote">Popular vote</option>
                </select>
                <div className="checkbox-row">
                  <input id="m-cross" type="checkbox" checked={allowCrossTeamMentoring} onChange={(e) => setAllowCrossTeamMentoring(e.target.checked)} />
                  <label htmlFor="m-cross">Allow cross-team mentoring</label>
                </div>
                <div className="checkbox-row">
                  <input id="m-demo" type="checkbox" checked={requireDemoLink} onChange={(e) => setRequireDemoLink(e.target.checked)} />
                  <label htmlFor="m-demo">Require demo link</label>
                </div>
                <label htmlFor="m-cats">Categories (comma-separated)</label>
                <input id="m-cats" value={categoriesInput} onChange={(e) => setCategoriesInput(e.target.value)} placeholder="e.g. AI, Productivity" />
                <label htmlFor="m-prizes">Prizes</label>
                <textarea id="m-prizes" value={prizesText} onChange={(e) => setPrizesText(e.target.value)} rows={3} placeholder="Describe prizes..." />
              </div>
            ) : null}

            {wizardStep === 5 ? (
              <div className="wizard-fields">
                <label htmlFor="m-accent">Accent colour</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input id="m-accent" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: '48px', height: '38px', padding: '2px', cursor: 'pointer' }} />
                  <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#0f766e" />
                </div>
                <label htmlFor="m-banner">Banner message</label>
                <input id="m-banner" value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} placeholder="Optional banner text" />
                <label htmlFor="m-banner-img">Banner image URL</label>
                <input id="m-banner-img" value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} placeholder="https://..." />
                <label htmlFor="m-theme">Theme</label>
                <select id="m-theme" value={themePreference} onChange={(e) => setThemePreference(e.target.value as 'system' | 'light' | 'dark')}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            ) : null}

            {wizardStep === 6 ? (
              <div className="wizard-fields">
                <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>Review</h3>
                <p><strong>Name:</strong> {eventIcon} {eventName || <em>Not set</em>}</p>
                {eventTagline ? <p><strong>Tagline:</strong> {eventTagline}</p> : null}
                {primaryAdminEmail ? <p><strong>Admin:</strong> {primaryAdminEmail}</p> : null}
                <p><strong>Timezone:</strong> {timezone}</p>
                {(scheduleOutput?.hackingStartsAt || hackingStartsAt) ? (
                  <p><strong>Hacking starts:</strong> {scheduleOutput?.hackingStartsAt
                    ? new Intl.DateTimeFormat('en-GB', { timeZone: scheduleOutput.timezone || timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(scheduleOutput.hackingStartsAt))
                    : hackingStartsAt}</p>
                ) : null}
                {(scheduleOutput?.submissionDeadlineAt || submissionDeadlineAt) ? (
                  <p><strong>Deadline:</strong> {scheduleOutput?.submissionDeadlineAt
                    ? new Intl.DateTimeFormat('en-GB', { timeZone: scheduleOutput.timezone || timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(scheduleOutput.submissionDeadlineAt))
                    : submissionDeadlineAt}</p>
                ) : null}
                <p><strong>Team size:</strong> {minTeamSize}–{maxTeamSize} · Judging: {judgingModel}</p>
                <p><strong>Accent:</strong> <span style={{ background: accentColor, padding: '2px 8px', borderRadius: '4px', color: '#fff', fontSize: '0.85em' }}>{accentColor}</span></p>
                <p className="meta">Will be created as a draft child page under this parent page. From the child page header, click "Open App View" for full runtime.</p>
                {createDraftTimedOut ? <p className="note error">Creation timed out. Click &quot;Create HackDay&quot; to retry with the same request ID.</p> : null}
              </div>
            ) : null}

            <div className="wizard-nav" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {wizardStep > 1 ? (
                <button type="button" className="button-muted" onClick={goToPreviousStep}>
                  {wizardStep === 3 ? '← Back to Schedule' : '← Back'}
                </button>
              ) : (
                <span />
              )}
              {wizardStep < 6 ? (
                <button type="button" className="button-primary" onClick={goToNextStep}>
                  {wizardStep === 3 ? 'Continue to Rules →' : 'Next →'}
                </button>
              ) : (
                <button type="button" className="button-primary" disabled={saving} onClick={() => void handleCreateDraft()}>
                  {saving ? 'Creating…' : 'Create HackDay'}
                </button>
              )}
            </div>
          </article>

          <article className="card">
            <h2>Registry</h2>
            {sortedRegistry.length > 0 ? (
              <p className="meta">Click a row to open that HackDay page, then click "Open App View".</p>
            ) : null}
            {sortedRegistry.length === 0 ? (
              <p>No instances yet.</p>
            ) : (
              <ul className="registry">
                {sortedRegistry.map((item) => {
                  const navigable = isNavigableRegistryItem(item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`registry-row ${!navigable ? 'registry-row--disabled' : ''}`}
                        disabled={!navigable}
                        title={navigable ? `Open ${item.eventName}` : 'Page not provisioned yet'}
                        onClick={() => {
                          if (navigable) {
                            runSwitcherNavigation(item, (targetPageId) => {
                              void navigateToPageId(targetPageId);
                            });
                          }
                        }}
                      >
                        <strong>
                          {item.icon} {item.eventName}
                        </strong>
                        <span className={getLifecycleStatusClass(item.lifecycleStatus)}>
                          {formatLifecycle(item.lifecycleStatus)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        </section>
      ) : null}

      {context.pageType === 'instance' && context.event ? (
        <section className="grid">
          <article className="card">
            <h2>
              {context.event.icon} {context.event.eventName}
            </h2>
            <p>
              Status:{' '}
              <span className={getLifecycleStatusClass(context.event.lifecycleStatus)}>
                {formatLifecycle(context.event.lifecycleStatus)}
              </span>
            </p>
            <p>{context.event.tagline || 'No tagline provided.'}</p>
            {context.derivedProfile ? (
              <p>
                Reputation: {context.derivedProfile.reputationTier} ({context.derivedProfile.reputationScore}) · Hacks:{' '}
                {context.derivedProfile.submittedHacks} · Synced: {context.derivedProfile.syncedHacks}
              </p>
            ) : null}

            <h3>Submit Hack</h3>
            {isTemplateRuntime ? (
              <p>This template is managed in HackDay. Complete local setup and submissions in the HackDay macro.</p>
            ) : null}
            {isReadOnlyInstance ? <p>This instance is read-only. Hack submissions are disabled.</p> : null}
            <label>
              Title
              <input
                disabled={saving || isReadOnlyInstance || isTemplateRuntime}
                value={hackTitle}
                onChange={(event) => setHackTitle(event.target.value)}
                placeholder="Meeting Notes Summarizer"
              />
            </label>
            <label>
              Description
              <textarea
                disabled={saving || isReadOnlyInstance || isTemplateRuntime}
                value={hackDescription}
                onChange={(event) => setHackDescription(event.target.value)}
                placeholder="What does this hack solve?"
              />
            </label>
            <button disabled={saving || isReadOnlyInstance || isTemplateRuntime} onClick={() => void handleSubmitHack()}>
              {saving ? 'Submitting…' : 'Submit Hack'}
            </button>
          </article>

          <article className="card">
            <h2>Instance Admin</h2>
            {isTemplateRuntime ? <p>This row is a HackDay template handoff. Continue setup and runtime operations in HackDay.</p> : null}
            <p>
              Rules: max team size {context.event.rules.maxTeamSize}, judging {context.event.rules.judgingModel},{' '}
              {context.event.rules.allowCrossTeamMentoring ? 'cross-team mentoring on' : 'cross-team mentoring off'}
            </p>
            <p>
              Branding: {context.event.branding.bannerMessage || 'no banner message'} · accent {context.event.branding.accentColor}
            </p>
            <p>Sync status: {context.syncState?.syncStatus || 'not_started'}</p>
            <p>
              Last run: {context.syncState?.lastAttemptAt || 'never'} | Pushed: {context.syncState?.pushedCount || 0} |
              Skipped: {context.syncState?.skippedCount || 0}
            </p>
            {context.syncState ? <p>Error category: {formatSyncErrorCategory(context.syncState.syncErrorCategory)}</p> : null}
            {context.syncState?.retryGuidance ? <p>Guidance: {context.syncState.retryGuidance}</p> : null}
            {canAdminInstance ? (
              <>
                {instanceAdminActionState.globalHint ? <p className="meta">{instanceAdminActionState.globalHint}</p> : null}
                <button
                  className={context?.event?.lifecycleStatus === 'draft' ? 'btn btn-primary' : undefined}
                  disabled={instanceAdminActionState.advanceLifecycle.disabled}
                  title={instanceAdminActionState.advanceLifecycle.reason ?? undefined}
                  onClick={() => void handleLaunch()}
                >
                  {saving ? 'Updating…' : (LIFECYCLE_NEXT_LABEL[context?.event?.lifecycleStatus ?? 'draft'] ?? 'Advance Lifecycle')}
                </button>
                <button
                  disabled={instanceAdminActionState.completeSync.disabled}
                  title={instanceAdminActionState.completeSync.reason ?? undefined}
                  onClick={() => void runSync('complete')}
                >
                  {saving ? 'Syncing…' : 'Complete + Sync'}
                </button>
                <button
                  disabled={instanceAdminActionState.retrySync.disabled}
                  title={instanceAdminActionState.retrySync.reason ?? undefined}
                  onClick={() => void runSync('retry')}
                >
                  {saving ? 'Retrying…' : 'Retry Sync'}
                </button>
                <button
                  disabled={instanceAdminActionState.deleteDraft.disabled}
                  title={instanceAdminActionState.deleteDraft.reason ?? undefined}
                  className="button-danger"
                  onClick={() => void handleDeleteDraft()}
                >
                  {saving ? 'Deleting…' : 'Delete Draft'}
                </button>
              </>
            ) : null}
          </article>
        </section>
      ) : null}
    </main>
  );
}
