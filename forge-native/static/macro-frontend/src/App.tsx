import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke, router, view } from '@forge/bridge';
import type {
  CreateInstanceDraftInput,
  Defs,
  EventRegistryItem,
  HdcContextResponse,
  SubmissionRequirement,
  SyncResult,
  ThemePreference,
  WizardStep,
} from './types';
import { DEFAULT_TIMEZONE } from './types';
import {
  buildConfluencePagePath,
  buildSwitcherSections,
  getHomePageId,
  invalidateSwitcherRegistryCache,
  isNavigableRegistryItem,
  readSwitcherRegistryCache,
  runSwitcherNavigation,
  summarizeSwitcherNavigability,
  switcherRowMetaText,
  writeSwitcherRegistryCache,
} from './appSwitcher';
import { getInstanceAdminActionState } from './instanceAdminActions';

const LOCAL_PREVIEW = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const CREATE_DRAFT_TIMEOUT_MS = 15_000;
const DUPLICATE_EVENT_NAME_ERROR = 'Event name must be unique under this HackDay Central parent page.';
const WIZARD_STORAGE_KEY_PREFIX = 'hdc-create-wizard:';
const SUBMISSION_REQUIREMENT_OPTIONS: SubmissionRequirement[] = ['video_demo', 'working_prototype', 'documentation'];

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
}

function wizardStorageKey(pageId: string): string {
  return `${WIZARD_STORAGE_KEY_PREFIX}${pageId}`;
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

      const bridgeContext = await view.getContext();
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
    () => [...(context?.registry ?? [])].sort((a, b) => a.eventName.localeCompare(b.eventName)),
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

      if (step >= 3) {
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

    setWizardStep((step) => (step < 5 ? ((step + 1) as WizardStep) : step));
  }, [getValidationErrorForStep, wizardStep]);

  const goToPreviousStep = useCallback(() => {
    setError('');
    setEventNameError('');
    setWizardStep((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
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
    setMessage('');

    const requestId = pendingCreateRequestId || crypto.randomUUID();
    if (!pendingCreateRequestId) {
      setPendingCreateRequestId(requestId);
    }

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
          timezone,
          registrationOpensAt: registrationOpensAt || undefined,
          registrationClosesAt: registrationClosesAt || undefined,
          teamFormationStartsAt: teamFormationStartsAt || undefined,
          teamFormationEndsAt: teamFormationEndsAt || undefined,
          hackingStartsAt: hackingStartsAt || undefined,
          submissionDeadlineAt: submissionDeadlineAt || undefined,
          votingStartsAt: votingStartsAt || undefined,
          votingEndsAt: votingEndsAt || undefined,
          resultsAnnounceAt: resultsAnnounceAt || undefined,
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

      const result = await withTimeout(
        invokeTyped('hdcCreateInstanceDraft', payload),
        CREATE_DRAFT_TIMEOUT_MS,
        `Creation timed out after ${CREATE_DRAFT_TIMEOUT_MS / 1000} seconds.`
      );
      setMessage(
        `Draft created. Child page id: ${result.childPageId}. Template provision status: ${result.templateProvisionStatus ?? 'provisioned'}.`
      );
      setCreateDraftTimedOut(false);
      resetWizard(true);
      invalidateSwitcherCaches(context);

      if (result.childPageUrl) {
        setMessage('Draft created. Redirecting to the child page…');
        try {
          await router.navigate(result.childPageUrl);
          return;
        } catch {
          window.location.assign(result.childPageUrl);
          return;
        }
      }

      await loadContext();
    } catch (err) {
      if (isRequestTimeoutError(err)) {
        setCreateDraftTimedOut(true);
        setMessage(
          `Creation is taking longer than ${CREATE_DRAFT_TIMEOUT_MS / 1000} seconds. Retry to continue with the same request id.`
        );
        return;
      }
      if (isDuplicateEventNameError(err)) {
        setEventNameError('An instance with this name already exists under this parent page.');
        setPendingCreateRequestId(null);
        setCreateDraftTimedOut(false);
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to create draft instance.');
    } finally {
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
    [context, loadContext, invalidateSwitcherCaches]
  );

  const handleLaunch = useCallback(async () => {
    if (!context?.event) {
      setError('No instance selected for lifecycle update.');
      return;
    }
    if (context.event.runtimeType === 'hackday_template') {
      setError('This template instance is managed in HackDay. Lifecycle actions are disabled in HackDay Central.');
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
      const targetPath = buildConfluencePagePath(targetPageId);
      const absoluteTarget =
        typeof window !== 'undefined' ? `${window.location.origin}${targetPath}` : targetPath;

      setSwitcherOpen(false);
      if (LOCAL_PREVIEW) {
        setMessage(`Local preview mode: would navigate to ${targetPath}`);
        return;
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
    [currentContextPageId]
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
            <p>
              Create new HackDays in the HackCentral app. You&apos;ll set the event name, schedule, rules, and branding there, then the new event will appear in the Registry below and in the app switcher.
            </p>
            {context.createAppUrl ? (
              <p>
                <a
                  href={`${context.createAppUrl.replace(/\/$/, '')}/hackdays/create`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="create-app-link"
                >
                  Open Create HackDay in app →
                </a>
              </p>
            ) : (
              <p className="meta">
                To enable the link, set <strong>HACKDAY_CREATE_APP_URL</strong> (your HackCentral web app base URL) in the Forge app environment variables.
              </p>
            )}
          </article>

          <article className="card">
            <h2>Registry</h2>
            {sortedRegistry.length > 0 ? (
              <p className="meta">Click a row to open that HackDay.</p>
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
            {isTemplateRuntime ? null : (
              <>
                {instanceAdminActionState.globalHint ? <p className="meta">{instanceAdminActionState.globalHint}</p> : null}
                <button
                  disabled={instanceAdminActionState.advanceLifecycle.disabled}
                  title={instanceAdminActionState.advanceLifecycle.reason ?? undefined}
                  onClick={() => void handleLaunch()}
                >
                  {saving ? 'Updating…' : 'Advance Lifecycle'}
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
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}
