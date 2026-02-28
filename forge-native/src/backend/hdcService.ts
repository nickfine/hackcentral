import {
  ALLOWED_EMAIL_DOMAIN,
  DEFAULT_TIMEZONE,
} from '../shared/types';
import type {
  AppRouteVersion,
  AppRuntimeOwner,
  AppViewUrlResult,
  CreateInstanceDraftInput,
  CreateInstanceDraftResult,
  DerivedProfileSnapshot,
  DeleteDraftResult,
  EventBranding,
  EventRegistryItem,
  EventLifecycleResult,
  EventRules,
  EventSchedule,
  EventSyncState,
  HdcContextResponse,
  InstanceRuntime,
  LifecycleStatus,
  ScheduleCustomEvent,
  ScheduleEventSignal,
  SubmissionRequirement,
  SubmitHackInput,
  SubmitHackResult,
  SyncErrorCategory,
  SyncResult,
  ThemePreference,
  ViewerContext,
} from '../shared/types';
import { createChildPageUnderParent, deletePage, getCurrentUserEmail } from './confluencePages';
import { SupabaseRepository } from './supabase/repositories';

function ensureAdaptavistEmail(email: string): void {
  if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} users can create HackDay instances.`);
  }
}

function fallbackEmailFromAccount(accountId: string): string {
  const safe = accountId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safe}${ALLOWED_EMAIL_DOMAIN}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeEmailList(emails: string[] | undefined): string[] {
  if (!emails || emails.length === 0) return [];

  const deduped = new Set<string>();
  for (const rawEmail of emails) {
    const email = normalizeEmail(rawEmail);
    if (email) {
      deduped.add(email);
    }
  }
  return [...deduped];
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const SCHEDULE_EVENT_SIGNALS = new Set<ScheduleEventSignal>([
  'start',
  'deadline',
  'ceremony',
  'presentation',
  'judging',
  'neutral',
]);

function normalizeOptionalStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeScheduleCustomEvents(value: unknown): ScheduleCustomEvent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized: ScheduleCustomEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<ScheduleCustomEvent>;
    const name = normalizeOptionalString(candidate.name);
    const timestamp = normalizeOptionalString(candidate.timestamp);
    const signal =
      typeof candidate.signal === 'string' && SCHEDULE_EVENT_SIGNALS.has(candidate.signal as ScheduleEventSignal)
        ? (candidate.signal as ScheduleEventSignal)
        : null;
    if (!name || !timestamp || !signal) continue;
    const description = normalizeOptionalString(candidate.description);
    normalized.push({
      name,
      timestamp,
      signal,
      ...(description ? { description } : {}),
    });
  }
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeScheduleDuration(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(1, Math.min(3, Math.floor(value)));
}

function normalizeInstanceRuntime(runtime: CreateInstanceDraftInput['instanceRuntime']): InstanceRuntime {
  return runtime === 'hdc_native' ? 'hdc_native' : 'hackday_template';
}

function resolveTemplateTarget(runtimeType: InstanceRuntime): 'hackday' | null {
  if (runtimeType !== 'hackday_template') return null;
  return 'hackday';
}

const HDC_RUNTIME_OWNER_HACKCENTRAL = 'hackcentral' as const;
const HDC_RUNTIME_OWNER_HD26FORGE = 'hd26forge' as const;
const HDC_RUNTIME_MACRO_KEY_DEFAULT = 'hackday-runtime-macro';

function resolveHackdayTemplateRuntimeOwner(): AppRuntimeOwner {
  const normalized = (process.env.HDC_RUNTIME_OWNER || '').trim().toLowerCase();
  return normalized === HDC_RUNTIME_OWNER_HACKCENTRAL
    ? HDC_RUNTIME_OWNER_HACKCENTRAL
    : HDC_RUNTIME_OWNER_HD26FORGE;
}

function getHackdayTemplateAppRouteConfig(): {
  targetAppId: string;
  targetEnvironmentId: string;
} | null {
  const targetAppId = process.env.HACKDAY_TEMPLATE_APP_ID?.trim();
  const targetEnvironmentId = process.env.HACKDAY_TEMPLATE_ENVIRONMENT_ID?.trim();
  if (!targetAppId || !targetEnvironmentId) {
    return null;
  }
  return { targetAppId, targetEnvironmentId };
}

function getHackcentralRuntimeAppRouteConfig(): {
  targetAppId: string;
  targetEnvironmentId: string;
} | null {
  const targetAppId = process.env.HDC_RUNTIME_APP_ID?.trim() || process.env.FORGE_APP_ID?.trim();
  const targetEnvironmentId = process.env.HDC_RUNTIME_ENVIRONMENT_ID?.trim() || process.env.FORGE_ENVIRONMENT_ID?.trim();
  if (!targetAppId || !targetEnvironmentId) {
    return null;
  }
  return { targetAppId, targetEnvironmentId };
}

function getHackdayTemplateMacroConfig(): {
  targetAppId: string;
  targetEnvironmentId: string;
  targetMacroKey: string;
} {
  const routeConfig = getHackdayTemplateAppRouteConfig();
  const targetAppId = routeConfig?.targetAppId;
  const targetEnvironmentId = routeConfig?.targetEnvironmentId;
  const targetMacroKey = process.env.HACKDAY_TEMPLATE_MACRO_KEY?.trim();
  if (!targetAppId || !targetEnvironmentId || !targetMacroKey) {
    throw new Error(
      'Missing required Forge variables for HackDay templates: HACKDAY_TEMPLATE_APP_ID, HACKDAY_TEMPLATE_ENVIRONMENT_ID, HACKDAY_TEMPLATE_MACRO_KEY.'
    );
  }
  return { targetAppId, targetEnvironmentId, targetMacroKey };
}

function getHackcentralRuntimeMacroConfig(): {
  targetAppId: string;
  targetEnvironmentId: string;
  targetMacroKey: string;
} | null {
  const routeConfig = getHackcentralRuntimeAppRouteConfig();
  if (!routeConfig?.targetAppId || !routeConfig?.targetEnvironmentId) {
    return null;
  }
  const targetMacroKey = process.env.HDC_RUNTIME_MACRO_KEY?.trim() || HDC_RUNTIME_MACRO_KEY_DEFAULT;
  return {
    targetAppId: routeConfig.targetAppId,
    targetEnvironmentId: routeConfig.targetEnvironmentId,
    targetMacroKey,
  };
}

function normalizeSiteBaseUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }
  if (/^[a-z0-9.-]+$/i.test(trimmed)) {
    return `https://${trimmed}`.replace(/\/+$/, '');
  }
  return null;
}

function resolveForgeAppRouteId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(trimmed)) {
    return trimmed;
  }

  const ariMatch = trimmed.match(/(?:\/app\/|::app\/)([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  if (ariMatch?.[1]) {
    return ariMatch[1];
  }

  return null;
}

function buildHackdayTemplateAppViewUrl(
  siteUrl: string | null | undefined,
  pageId: string,
  routeConfig: { targetAppId: string; targetEnvironmentId: string }
): string | null {
  const normalizedPageId = typeof pageId === 'string' ? pageId.trim() : '';
  if (!normalizedPageId) return null;
  const routeAppId = resolveForgeAppRouteId(routeConfig.targetAppId);
  if (!routeAppId) return null;

  const path = `/wiki/apps/${routeAppId}/${routeConfig.targetEnvironmentId}/hackday-app?pageId=${encodeURIComponent(
    normalizedPageId
  )}`;
  const siteBase = normalizeSiteBaseUrl(siteUrl);
  return siteBase ? `${siteBase}${path}` : path;
}

function buildRuntimeAppViewUrl(siteUrl: string | null | undefined, pageId: string): AppViewUrlResult {
  const preferredOwner = resolveHackdayTemplateRuntimeOwner();
  if (preferredOwner === HDC_RUNTIME_OWNER_HACKCENTRAL) {
    const runtimeRoute = getHackcentralRuntimeAppRouteConfig();
    if (!runtimeRoute) {
      throw new Error(
        'HackCentral runtime routing is enabled, but HDC_RUNTIME_APP_ID/FORGE_APP_ID or HDC_RUNTIME_ENVIRONMENT_ID/FORGE_ENVIRONMENT_ID is missing.'
      );
    }
    const url = buildHackdayTemplateAppViewUrl(siteUrl, pageId, runtimeRoute);
    if (!url) {
      throw new Error(
        'HackCentral runtime routing is enabled, but app-view URL could not be built. Verify HDC_RUNTIME_APP_ID and HDC_RUNTIME_ENVIRONMENT_ID.'
      );
    }
    return {
      url,
      runtimeOwner: HDC_RUNTIME_OWNER_HACKCENTRAL,
      routeVersion: 'v2',
    };
  }

  const legacyRoute = getHackdayTemplateAppRouteConfig();
  return {
    url: legacyRoute ? buildHackdayTemplateAppViewUrl(siteUrl, pageId, legacyRoute) : null,
    runtimeOwner: HDC_RUNTIME_OWNER_HD26FORGE,
    routeVersion: 'v1',
  };
}

function resolveRuntimeMacroConfigForHackdayTemplates(): {
  targetAppId: string;
  targetEnvironmentId: string;
  targetMacroKey: string;
  runtimeOwner: AppRuntimeOwner;
  routeVersion: AppRouteVersion;
} {
  const preferredOwner = resolveHackdayTemplateRuntimeOwner();
  if (preferredOwner === HDC_RUNTIME_OWNER_HACKCENTRAL) {
    const runtimeMacroConfig = getHackcentralRuntimeMacroConfig();
    if (!runtimeMacroConfig) {
      throw new Error(
        'HackCentral runtime macro is enabled, but HDC_RUNTIME_APP_ID/FORGE_APP_ID, HDC_RUNTIME_ENVIRONMENT_ID/FORGE_ENVIRONMENT_ID, or HDC_RUNTIME_MACRO_KEY is missing.'
      );
    }
    return {
      ...runtimeMacroConfig,
      runtimeOwner: HDC_RUNTIME_OWNER_HACKCENTRAL,
      routeVersion: 'v2',
    };
  }

  const legacyMacroConfig = getHackdayTemplateMacroConfig();
  return {
    ...legacyMacroConfig,
    runtimeOwner: HDC_RUNTIME_OWNER_HD26FORGE,
    routeVersion: 'v1',
  };
}

function normalizeEventSchedule(
  input: CreateInstanceDraftInput['schedule'] | EventSchedule | null | undefined,
  fallback?: { timezone?: string | null; hackingStartsAt?: string | null; submissionDeadlineAt?: string | null }
): EventSchedule {
  return {
    timezone: normalizeOptionalString(input?.timezone) || normalizeOptionalString(fallback?.timezone) || DEFAULT_TIMEZONE,
    duration: normalizeScheduleDuration(input?.duration),
    selectedEvents: normalizeOptionalStringList((input as EventSchedule | undefined)?.selectedEvents),
    customEvents: normalizeScheduleCustomEvents((input as EventSchedule | undefined)?.customEvents),
    registrationOpensAt: normalizeOptionalString(input?.registrationOpensAt),
    registrationClosesAt: normalizeOptionalString(input?.registrationClosesAt),
    teamFormationStartsAt: normalizeOptionalString(input?.teamFormationStartsAt),
    teamFormationEndsAt: normalizeOptionalString(input?.teamFormationEndsAt),
    openingCeremonyAt: normalizeOptionalString(input?.openingCeremonyAt),
    hackingStartsAt: normalizeOptionalString(input?.hackingStartsAt) || normalizeOptionalString(fallback?.hackingStartsAt),
    lunchBreakDay1At: normalizeOptionalString((input as EventSchedule | undefined)?.lunchBreakDay1At),
    afternoonCheckinDay1At: normalizeOptionalString((input as EventSchedule | undefined)?.afternoonCheckinDay1At),
    dinnerBreakDay1At: normalizeOptionalString((input as EventSchedule | undefined)?.dinnerBreakDay1At),
    eveningCheckinDay1At: normalizeOptionalString((input as EventSchedule | undefined)?.eveningCheckinDay1At),
    lunchBreakDay2At: normalizeOptionalString((input as EventSchedule | undefined)?.lunchBreakDay2At),
    afternoonCheckinDay2At: normalizeOptionalString((input as EventSchedule | undefined)?.afternoonCheckinDay2At),
    dinnerBreakDay2At: normalizeOptionalString((input as EventSchedule | undefined)?.dinnerBreakDay2At),
    eveningCheckinDay2At: normalizeOptionalString((input as EventSchedule | undefined)?.eveningCheckinDay2At),
    lunchBreakDay3At: normalizeOptionalString((input as EventSchedule | undefined)?.lunchBreakDay3At),
    afternoonCheckinDay3At: normalizeOptionalString((input as EventSchedule | undefined)?.afternoonCheckinDay3At),
    dinnerBreakDay3At: normalizeOptionalString((input as EventSchedule | undefined)?.dinnerBreakDay3At),
    submissionDeadlineAt:
      normalizeOptionalString(input?.submissionDeadlineAt) || normalizeOptionalString(fallback?.submissionDeadlineAt),
    presentationsAt: normalizeOptionalString(input?.presentationsAt),
    judgingStartsAt: normalizeOptionalString(input?.judgingStartsAt),
    votingStartsAt: normalizeOptionalString(input?.votingStartsAt),
    votingEndsAt: normalizeOptionalString(input?.votingEndsAt),
    resultsAnnounceAt: normalizeOptionalString(input?.resultsAnnounceAt),
  };
}

function ensureDateOrder(start: string | undefined, end: string | undefined, message: string): void {
  if (start && end && start > end) {
    throw new Error(message);
  }
}

function validateSchedule(schedule: EventSchedule): void {
  ensureDateOrder(
    schedule.registrationOpensAt,
    schedule.registrationClosesAt,
    'Registration close must be after registration open.'
  );
  ensureDateOrder(
    schedule.teamFormationStartsAt,
    schedule.teamFormationEndsAt,
    'Team formation end must be after team formation start.'
  );
  ensureDateOrder(
    schedule.hackingStartsAt,
    schedule.submissionDeadlineAt,
    'Submission deadline must be after the hacking start time.'
  );
  ensureDateOrder(schedule.votingStartsAt, schedule.votingEndsAt, 'Voting end must be after voting start.');
}

type MilestoneInsert = {
  eventId: string;
  title: string;
  description: string | null;
  phase: string;
  signal?: ScheduleEventSignal | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
};

function parseScheduleTimestampMs(value: string | undefined): number | null {
  if (!value) return null;
  const timestampMs = Date.parse(value);
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function mapHackdayCustomEventSignalToPhase(signal: ScheduleEventSignal): string {
  switch (signal) {
    case 'deadline':
      return 'SUBMISSION';
    case 'presentation':
      return 'SUBMISSION';
    case 'judging':
      return 'JUDGING';
    case 'start':
    case 'neutral':
    case 'ceremony':
    default:
      return 'HACKING';
  }
}

function createCustomMilestonesFromSchedule(eventId: string, schedule: EventSchedule): MilestoneInsert[] {
  if (!schedule.customEvents || schedule.customEvents.length === 0) {
    return [];
  }

  const milestones: MilestoneInsert[] = [];
  const hackingStartMs = parseScheduleTimestampMs(schedule.hackingStartsAt);

  for (const customEvent of schedule.customEvents) {
    const eventTimestampMs = parseScheduleTimestampMs(customEvent.timestamp);
    if (eventTimestampMs === null) {
      console.warn(
        '[createInstanceDraft] Skipping custom schedule event milestone due to invalid timestamp',
        JSON.stringify({ name: customEvent.name, timestamp: customEvent.timestamp })
      );
      continue;
    }

    const isPreEvent = hackingStartMs !== null && eventTimestampMs < hackingStartMs;
    const phase = isPreEvent ? 'REGISTRATION' : mapHackdayCustomEventSignalToPhase(customEvent.signal);

    milestones.push({
      eventId,
      title: customEvent.name,
      description: customEvent.description ?? null,
      phase,
      signal: customEvent.signal,
      startTime: customEvent.timestamp,
      endTime: null,
      location: null,
    });
  }

  return milestones;
}

function buildScheduleMilestonesForRuntime(
  eventId: string,
  schedule: EventSchedule,
  runtimeType: InstanceRuntime
): MilestoneInsert[] {
  const standardMilestones = createMilestonesFromSchedule(eventId, schedule);
  const includeCustomMilestones = runtimeType === 'hdc_native' || runtimeType === 'hackday_template';
  const customMilestones = includeCustomMilestones ? createCustomMilestonesFromSchedule(eventId, schedule) : [];
  return [...standardMilestones, ...customMilestones];
}

/**
 * Transform EventSchedule data into Milestone records for HD26Forge Schedule page display
 * Maps Schedule Builder V2 output fields to milestone records
 */
function createMilestonesFromSchedule(eventId: string, schedule: EventSchedule): MilestoneInsert[] {
  const milestones: MilestoneInsert[] = [];

  // PRE-EVENT MILESTONES
  // - registrationOpensAt
  // - teamFormationStartsAt
  // - registrationClosesAt

  // Registration Opens
  if (schedule.registrationOpensAt) {
    milestones.push({
      eventId,
      title: 'Registration Opens',
      description: 'Portal opens for sign-ups',
      phase: 'REGISTRATION',
      signal: 'start',
      startTime: schedule.registrationOpensAt,
      endTime: null,
      location: null,
    });
  }

  // Team Formation Opens
  if (schedule.teamFormationStartsAt) {
    milestones.push({
      eventId,
      title: 'Team Formation Opens',
      description: 'Marketplace opens for team building',
      phase: 'TEAM_FORMATION',
      signal: 'start',
      startTime: schedule.teamFormationStartsAt,
      endTime: null,
      location: null,
    });
  }

  // Registration Closes
  if (schedule.registrationClosesAt) {
    milestones.push({
      eventId,
      title: 'Registration Closes',
      description: 'Final deadline to register',
      phase: 'REGISTRATION',
      signal: 'deadline',
      startTime: schedule.registrationClosesAt,
      endTime: null,
      location: null,
    });
  }

  // HACK DAY EVENTS
  // - openingCeremonyAt
  // - hackingStartsAt (anchor - always present)
  // - submissionDeadlineAt (code freeze)
  // - presentationsAt
  // - judgingStartsAt
  // - resultsAnnounceAt

  // Opening Ceremony
  if (schedule.openingCeremonyAt) {
    milestones.push({
      eventId,
      title: 'Opening Ceremony',
      description: 'Kickoff and announcements',
      phase: 'HACKING',
      signal: 'ceremony',
      startTime: schedule.openingCeremonyAt,
      endTime: null,
      location: null,
    });
  }

  // Hacking Begins (anchor event)
  if (schedule.hackingStartsAt) {
    milestones.push({
      eventId,
      title: 'Hacking Begins',
      description: 'Teams start building',
      phase: 'HACKING',
      signal: 'start',
      startTime: schedule.hackingStartsAt,
      endTime: null,
      location: null,
    });

    // For multi-day events, create "Hacking Continues" milestones for intermediate days
    const duration = schedule.duration || 1;
    if (duration > 1) {
      const hackStartDate = new Date(schedule.hackingStartsAt);
      // Extract the time portion (e.g., "09:30:00")
      const hackStartTime = schedule.hackingStartsAt.includes('T')
        ? schedule.hackingStartsAt.split('T')[1]
        : '09:00:00.000Z';

      // Create milestones for days 2 through (duration - 1)
      // Last day has its own events (Code Freeze, etc.)
      for (let dayIndex = 1; dayIndex < duration - 1; dayIndex++) {
        const intermediateDate = new Date(hackStartDate);
        intermediateDate.setDate(intermediateDate.getDate() + dayIndex);
        const dateStr = intermediateDate.toISOString().split('T')[0];
        const timestamp = `${dateStr}T${hackStartTime}`;

        milestones.push({
          eventId,
          title: `Day ${dayIndex + 1} - Hacking Continues`,
          description: 'Teams continue building their projects',
          phase: 'HACKING',
          signal: 'neutral',
          startTime: timestamp,
          endTime: null,
          location: null,
        });
      }
    }
  }

  // Code Freeze / Submission Deadline
  if (schedule.submissionDeadlineAt) {
    milestones.push({
      eventId,
      title: 'Code Freeze',
      description: 'Final submissions due',
      phase: 'SUBMISSION',
      signal: 'deadline',
      startTime: schedule.submissionDeadlineAt,
      endTime: null,
      location: null,
    });
  }

  // Presentations
  if (schedule.presentationsAt) {
    milestones.push({
      eventId,
      title: 'Presentations',
      description: 'Teams present their projects',
      phase: 'SUBMISSION',
      signal: 'presentation',
      startTime: schedule.presentationsAt,
      endTime: null,
      location: null,
    });
  }

  // Judging Period
  if (schedule.judgingStartsAt) {
    milestones.push({
      eventId,
      title: 'Judging Period',
      description: 'Judges evaluate submissions',
      phase: 'JUDGING',
      signal: 'judging',
      startTime: schedule.judgingStartsAt,
      endTime: null,
      location: null,
    });
  }

  // Results Announcement
  if (schedule.resultsAnnounceAt) {
    milestones.push({
      eventId,
      title: 'Results Announced',
      description: 'Winners announced and celebrated',
      phase: 'RESULTS',
      signal: 'ceremony',
      startTime: schedule.resultsAnnounceAt,
      endTime: null,
      location: null,
    });
  }

  return milestones;
}

function validateRulesInput(input: CreateInstanceDraftInput['rules'] | undefined): void {
  if (!input) return;
  const minTeamSizeRaw = Number(input.minTeamSize);
  const maxTeamSizeRaw = Number(input.maxTeamSize);

  if (Number.isFinite(minTeamSizeRaw) && minTeamSizeRaw < 1) {
    throw new Error('Minimum team size must be at least 1.');
  }
  if (Number.isFinite(maxTeamSizeRaw) && maxTeamSizeRaw < 1) {
    throw new Error('Maximum team size must be at least 1.');
  }
  if (Number.isFinite(minTeamSizeRaw) && Number.isFinite(maxTeamSizeRaw) && minTeamSizeRaw > maxTeamSizeRaw) {
    throw new Error('Minimum team size must be less than or equal to maximum team size.');
  }
}

function validateWizardMetadata(input: CreateInstanceDraftInput): void {
  if (typeof input.wizardSchemaVersion !== 'undefined' && input.wizardSchemaVersion !== 2) {
    throw new Error('Unsupported wizard schema version.');
  }
  if (typeof input.completedStep !== 'undefined' && (input.completedStep < 1 || input.completedStep > 6)) {
    throw new Error('Invalid wizard step value.');
  }
}

function normalizeEventRules(
  input: CreateInstanceDraftInput['rules'] | EventRules | null | undefined
): EventRules {
  const minTeamSizeRaw = Number(input?.minTeamSize);
  const maxTeamSizeRaw = Number(input?.maxTeamSize);
  const minTeamSize = Number.isFinite(minTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(minTeamSizeRaw))) : null;
  const judgingModel =
    input?.judgingModel === 'panel' || input?.judgingModel === 'popular_vote' || input?.judgingModel === 'hybrid'
      ? input.judgingModel
      : 'hybrid';
  const maxTeamSizeBase = Number.isFinite(maxTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(maxTeamSizeRaw))) : 6;
  const maxTeamSize = minTeamSize === null ? maxTeamSizeBase : Math.max(minTeamSize, maxTeamSizeBase);

  const submissionRequirements = input?.submissionRequirements;
  const normalizedRequirements = Array.isArray(submissionRequirements)
    ? submissionRequirements.filter(
        (item): item is SubmissionRequirement =>
          item === 'video_demo' || item === 'working_prototype' || item === 'documentation'
      )
    : [];
  const categories = input?.categories;
  const normalizedCategories = Array.isArray(categories)
    ? [...new Set(categories.map((item) => item.trim()).filter((item) => item.length > 0))]
    : [];
  const prizesText = typeof input?.prizesText === 'string' && input.prizesText.trim() ? input.prizesText.trim() : null;

  const rules: EventRules = {
    allowCrossTeamMentoring: input?.allowCrossTeamMentoring ?? true,
    maxTeamSize,
    requireDemoLink: input?.requireDemoLink ?? false,
    judgingModel,
  };
  if (minTeamSize !== null) {
    rules.minTeamSize = minTeamSize;
  }
  if (normalizedRequirements.length > 0) {
    rules.submissionRequirements = normalizedRequirements;
  }
  if (normalizedCategories.length > 0) {
    rules.categories = normalizedCategories;
  }
  if (prizesText) {
    rules.prizesText = prizesText;
  }

  return rules;
}

function normalizeEventBranding(
  input: CreateInstanceDraftInput['branding'] | EventBranding | null | undefined
): EventBranding {
  const themePreference: ThemePreference | null =
    input?.themePreference === 'system' || input?.themePreference === 'light' || input?.themePreference === 'dark'
      ? input.themePreference
      : null;
  const branding: EventBranding = {
    accentColor: input?.accentColor?.trim() || '#0f766e',
  };
  if (input?.bannerMessage?.trim()) {
    branding.bannerMessage = input.bannerMessage.trim();
  }
  if (input?.bannerImageUrl?.trim()) {
    branding.bannerImageUrl = input.bannerImageUrl.trim();
  }
  if (themePreference) {
    branding.themePreference = themePreference;
  }
  return branding;
}

const LIFECYCLE_NEXT_STATUS: Partial<Record<LifecycleStatus, LifecycleStatus>> = {
  draft: 'registration',
  registration: 'team_formation',
  team_formation: 'hacking',
  hacking: 'voting',
  voting: 'results',
  results: 'completed',
};

const DERIVED_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const DERIVED_PROFILE_CACHE_MAX_ENTRIES = 500;
const derivedProfileCache = new Map<string, { expiresAt: number; snapshot: DerivedProfileSnapshot }>();

function isReadOnlyLifecycle(status: LifecycleStatus): boolean {
  return status === 'completed' || status === 'archived';
}

function getSyncGuidance(syncStatus: SyncResult['syncStatus'], lastError: string | null): {
  syncErrorCategory: SyncErrorCategory;
  retryable: boolean;
  retryGuidance: string | null;
} {
  if (syncStatus === 'complete' || syncStatus === 'not_started' || syncStatus === 'in_progress') {
    return {
      syncErrorCategory: 'none',
      retryable: false,
      retryGuidance: null,
    };
  }

  if (syncStatus === 'partial') {
    return {
      syncErrorCategory: 'partial_failure',
      retryable: true,
      retryGuidance: 'Some hacks did not sync. Retry sync now; if failures repeat, review recent project updates and retry.',
    };
  }

  const message = (lastError ?? '').toLowerCase();
  if (message.includes('only event admins')) {
    return {
      syncErrorCategory: 'permission',
      retryable: false,
      retryGuidance: 'You must be a primary admin or co-admin for this instance to run sync.',
    };
  }
  if (message.includes('at least one submitted hack')) {
    return {
      syncErrorCategory: 'validation',
      retryable: false,
      retryGuidance: 'Submit at least one hack in this instance before running Complete + Sync.',
    };
  }
  if (
    message.includes('failed to sync') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('network') ||
    message.includes('connection')
  ) {
    return {
      syncErrorCategory: 'transient',
      retryable: true,
      retryGuidance: 'This appears transient. Retry sync in a few seconds; if it persists, capture the error text and escalate.',
    };
  }

  return {
    syncErrorCategory: 'unknown',
    retryable: true,
    retryGuidance: 'Retry sync once. If the same error repeats, escalate with the event ID and timestamp.',
  };
}

function withSyncGuidance(state: {
  syncStatus: SyncResult['syncStatus'];
  lastError: string | null;
  pushedCount: number;
  skippedCount: number;
  eventId: string;
  lastAttemptAt: string | null;
}): EventSyncState {
  const guidance = getSyncGuidance(state.syncStatus, state.lastError);
  return {
    ...state,
    ...guidance,
  };
}

function logContextRegistryNavigability(pageType: 'parent' | 'instance', pageId: string, registry: EventRegistryItem[]): void {
  const total = registry.length;
  const nonNavigable = registry.filter((item) => !item.isNavigable).length;
  const withMissingPageId = registry.filter((item) => !item.confluencePageId).length;
  console.info(
    '[hdc-switcher-telemetry]',
    JSON.stringify({ source: 'hdcGetContext', pageType, pageId, total, nonNavigable, withMissingPageId })
  );
}

function logSyncExecutionTelemetry(input: {
  action: 'completeAndSync' | 'retrySync';
  eventId: string;
  durationMs: number;
  outcome: 'success' | 'error';
  syncStatus?: SyncResult['syncStatus'];
  syncErrorCategory?: SyncErrorCategory;
  retryable?: boolean;
  warning?: string | null;
}): void {
  console.info(
    '[hdc-performance-telemetry]',
    JSON.stringify({
      metric: 'sync_execution',
      ...input,
    })
  );
}

export class HdcService {
  private readonly repository: SupabaseRepository;

  constructor(repository = new SupabaseRepository()) {
    this.repository = repository;
  }

  private async getDerivedProfile(userId: string): Promise<DerivedProfileSnapshot> {
    const cached = derivedProfileCache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.snapshot;
    }

    const snapshot = await this.repository.getDerivedProfile(userId, DERIVED_PROFILE_CACHE_TTL_MS);
    derivedProfileCache.set(userId, {
      expiresAt: now + DERIVED_PROFILE_CACHE_TTL_MS,
      snapshot,
    });
    if (derivedProfileCache.size > DERIVED_PROFILE_CACHE_MAX_ENTRIES) {
      const oldestKey = derivedProfileCache.keys().next().value as string | undefined;
      if (oldestKey) {
        derivedProfileCache.delete(oldestKey);
      }
    }
    return snapshot;
  }

  private invalidateDerivedProfile(userId: string): void {
    derivedProfileCache.delete(userId);
  }

  async getContext(viewer: ViewerContext, pageId: string): Promise<HdcContextResponse> {
    const [event, viewerUser] = await Promise.all([
      this.repository.getEventByConfluencePageId(pageId),
      this.repository.ensureUser(viewer),
    ]);

    if (!event) {
      const registry = await this.repository.listEventsByParentPageId(pageId);
      logContextRegistryNavigability('parent', pageId, registry);
      const createAppUrl = process.env.HACKDAY_CREATE_APP_URL?.trim() || null;
      return {
        pageType: 'parent',
        pageId,
        event: null,
        registry,
        syncState: null,
        createAppUrl,
        permissions: {
          canCreateInstances: true,
          isPrimaryAdmin: false,
          isCoAdmin: false,
        },
      };
    }

    const [registry, rawSyncState, admins] = await Promise.all([
      this.repository.listEventsByParentPageId(event.confluence_parent_page_id ?? pageId),
      this.repository.getSyncState(event.id),
      this.repository.listEventAdmins(event.id),
    ]);
    const syncState = rawSyncState ? withSyncGuidance(rawSyncState) : null;

    const isPrimaryAdmin = admins.some((admin) => admin.user_id === viewerUser.id && admin.role === 'primary');
    const isCoAdmin = admins.some((admin) => admin.user_id === viewerUser.id && admin.role === 'co_admin');
    const schedule = normalizeEventSchedule(event.event_schedule, {
      timezone: event.timezone,
      hackingStartsAt: event.hacking_starts_at,
      submissionDeadlineAt: event.submission_deadline_at,
    });
    const confluencePageId =
      typeof event.confluence_page_id === 'string' && event.confluence_page_id.trim()
        ? event.confluence_page_id.trim()
        : null;
    logContextRegistryNavigability('instance', pageId, registry);

    const derivedProfile = await this.getDerivedProfile(viewerUser.id);

    const createAppUrl = process.env.HACKDAY_CREATE_APP_URL?.trim() || null;
    return {
      pageType: 'instance',
      pageId,
      event: {
        id: event.id,
        eventName: event.name,
        icon: event.icon ?? '🚀',
        tagline: event.tagline,
        runtimeType: event.runtime_type ?? 'hdc_native',
        templateTarget: event.template_target,
        lifecycleStatus: event.lifecycle_status,
        confluencePageId,
        isNavigable: Boolean(confluencePageId),
        confluenceParentPageId: event.confluence_parent_page_id,
        schedule,
        hackingStartsAt: schedule.hackingStartsAt ?? event.hacking_starts_at,
        submissionDeadlineAt: schedule.submissionDeadlineAt ?? event.submission_deadline_at,
        rules: normalizeEventRules(event.event_rules),
        branding: normalizeEventBranding(event.event_branding),
      },
      registry,
      syncState,
      derivedProfile,
      createAppUrl,
      permissions: {
        canCreateInstances: true,
        isPrimaryAdmin,
        isCoAdmin,
      },
    };
  }

  async getAppViewUrl(viewer: ViewerContext, pageId: string): Promise<AppViewUrlResult> {
    const normalizedPageId = typeof pageId === 'string' ? pageId.trim() : '';
    if (!normalizedPageId) {
      const runtimeOwner = resolveHackdayTemplateRuntimeOwner();
      return {
        url: null,
        runtimeOwner,
        routeVersion: runtimeOwner === HDC_RUNTIME_OWNER_HACKCENTRAL ? 'v2' : 'v1',
      };
    }
    const routeResult = buildRuntimeAppViewUrl(viewer.siteUrl, normalizedPageId);
    console.info(
      '[hdc-runtime-routing]',
      JSON.stringify({
        pageId: normalizedPageId,
        runtimeOwner: routeResult.runtimeOwner,
        routeVersion: routeResult.routeVersion,
        hasUrl: Boolean(routeResult.url),
      })
    );
    return routeResult;
  }

  async rebuildScheduleMilestonesForExistingEvent(eventId: string): Promise<{
    eventId: string;
    runtimeType: InstanceRuntime;
    deletedCount: number;
    createdCount: number;
    customEventCount: number;
    skipped: boolean;
    reason?: string;
  }> {
    const event = await this.repository.getEventById(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found.`);
    }

    const runtimeType = event.runtime_type ?? 'hdc_native';
    const schedule = normalizeEventSchedule(event.event_schedule, {
      timezone: event.timezone,
      hackingStartsAt: event.hacking_starts_at,
      submissionDeadlineAt: event.submission_deadline_at,
    });
    const customEventCount = schedule.customEvents?.length ?? 0;
    if (customEventCount === 0) {
      return {
        eventId,
        runtimeType,
        deletedCount: 0,
        createdCount: 0,
        customEventCount,
        skipped: true,
        reason: 'no_custom_events',
      };
    }

    const milestones = buildScheduleMilestonesForRuntime(eventId, schedule, runtimeType);
    const deletedCount = await this.repository.deleteMilestonesByEventId(eventId);
    await this.repository.createMilestones(milestones);

    return {
      eventId,
      runtimeType,
      deletedCount,
      createdCount: milestones.length,
      customEventCount,
      skipped: false,
    };
  }

  /**
   * Options for creation when invoked from the web (Phase 3). When set, the creator
   * is resolved by email instead of Atlassian viewer context.
   */
  async createInstanceDraft(
    viewer: ViewerContext,
    input: CreateInstanceDraftInput,
    options?: { overrideCreatorEmail?: string }
  ): Promise<CreateInstanceDraftResult> {
    if (!input.basicInfo.eventName.trim()) {
      throw new Error('Event name is required.');
    }

    validateWizardMetadata(input);
    validateRulesInput(input.rules);
    const launchMode = input.launchMode === 'go_live' ? 'go_live' : 'draft';
    const eventSchedule = normalizeEventSchedule(input.schedule);
    validateSchedule(eventSchedule);

    if (launchMode === 'go_live' && (!eventSchedule.hackingStartsAt || !eventSchedule.submissionDeadlineAt)) {
      throw new Error('Go live requires hacking start and submission deadline.');
    }

    const existingByRequest = await this.repository.getEventByCreationRequestId(input.creationRequestId);
    if (existingByRequest) {
      const existingProvisionStatus =
        existingByRequest.runtime_type === 'hackday_template'
          ? (await this.repository.getHackdayTemplateSeedByConfluencePageId(existingByRequest.confluence_page_id))
              ?.provision_status ?? 'provisioned'
          : null;
      const existingAppView = existingByRequest.runtime_type === 'hackday_template'
        ? buildRuntimeAppViewUrl(viewer.siteUrl, existingByRequest.confluence_page_id)
        : { url: null, runtimeOwner: HDC_RUNTIME_OWNER_HD26FORGE, routeVersion: 'v1' as const };
      console.info(
        '[hdc-runtime-routing-create-existing]',
        JSON.stringify({
          eventId: existingByRequest.id,
          pageId: existingByRequest.confluence_page_id,
          runtimeOwner: existingAppView.runtimeOwner,
          routeVersion: existingAppView.routeVersion,
          appViewUrl: existingAppView.url,
        })
      );
      return {
        eventId: existingByRequest.id,
        childPageId: existingByRequest.confluence_page_id,
        childPageUrl: existingByRequest.confluence_page_url ?? '',
        appViewUrl: existingAppView.url,
        appViewRuntimeOwner: existingAppView.runtimeOwner,
        appViewRouteVersion: existingAppView.routeVersion,
        templateProvisionStatus: existingProvisionStatus,
      };
    }

    const normalizedViewerEmail = options?.overrideCreatorEmail
      ? normalizeEmail(options.overrideCreatorEmail)
      : normalizeEmail(
          (await getCurrentUserEmail(viewer.accountId)) ||
            (await this.repository.getUserByAccountId(viewer.accountId))?.email ||
            fallbackEmailFromAccount(viewer.accountId)
        );
    ensureAdaptavistEmail(normalizedViewerEmail);

    const primaryAdminEmail = normalizeEmail(input.basicInfo.primaryAdminEmail || normalizedViewerEmail);
    ensureAdaptavistEmail(primaryAdminEmail);

    const normalizedCoAdminEmails = normalizeEmailList(input.basicInfo.coAdminEmails).filter(
      (email) => email !== primaryAdminEmail
    );
    for (const email of normalizedCoAdminEmails) {
      ensureAdaptavistEmail(email);
    }

    const conflicts = await this.repository.getEventNameConflicts(
      input.basicInfo.eventName,
      input.parentPageId
    );
    if (conflicts.length > 0) {
      throw new Error('Event name must be unique under this HackDay Central parent page.');
    }

    const runtimeType = normalizeInstanceRuntime(input.instanceRuntime);
    const templateTarget = resolveTemplateTarget(runtimeType);
    const templateMacroConfig = runtimeType === 'hackday_template' ? resolveRuntimeMacroConfigForHackdayTemplates() : null;

    const childPage = await createChildPageUnderParent({
      parentPageId: input.parentPageId,
      title: input.basicInfo.eventName,
      tagline: input.basicInfo.eventTagline,
      ...(templateMacroConfig
        ? {
            targetAppId: templateMacroConfig.targetAppId,
            targetEnvironmentId: templateMacroConfig.targetEnvironmentId,
            targetMacroKey: templateMacroConfig.targetMacroKey,
            fallbackLabel: 'HackDay template macro',
          }
        : {}),
    });

    try {
      const creator = options?.overrideCreatorEmail
        ? await this.repository.ensureUserByEmail(normalizedViewerEmail)
        : await this.repository.ensureUser(viewer, normalizedViewerEmail);
      const primaryAdmin =
        primaryAdminEmail === normalizedViewerEmail
          ? creator
          : await this.repository.ensureUserByEmail(primaryAdminEmail);

      const coAdminUserIds = new Set<string>();
      for (const email of normalizedCoAdminEmails) {
        if (email === normalizedViewerEmail) {
          coAdminUserIds.add(creator.id);
          continue;
        }
        if (email === primaryAdminEmail) {
          continue;
        }
        const coAdminUser = await this.repository.ensureUserByEmail(email);
        coAdminUserIds.add(coAdminUser.id);
      }

      if (primaryAdmin.id !== creator.id) {
        coAdminUserIds.add(creator.id);
      }

      const eventRules = normalizeEventRules(input.rules);
      const eventBranding = normalizeEventBranding(input.branding);

      const event = await this.repository.createEvent({
        eventName: input.basicInfo.eventName,
        icon: input.basicInfo.eventIcon || '🚀',
        tagline: input.basicInfo.eventTagline,
        timezone: eventSchedule.timezone || DEFAULT_TIMEZONE,
        lifecycleStatus: launchMode === 'go_live' ? 'registration' : 'draft',
        confluencePageId: childPage.pageId,
        confluencePageUrl: childPage.pageUrl,
        confluenceParentPageId: input.parentPageId,
        hackingStartsAt: eventSchedule.hackingStartsAt,
        submissionDeadlineAt: eventSchedule.submissionDeadlineAt,
        eventSchedule,
        creationRequestId: input.creationRequestId,
        createdByUserId: creator.id,
        eventRules,
        eventBranding,
        runtimeType,
        templateTarget,
      });

      // Create Milestone records from schedule for HD26Forge Schedule page display
      console.log('[createInstanceDraft] Creating milestones from schedule:', JSON.stringify(eventSchedule, null, 2));
      const milestones = buildScheduleMilestonesForRuntime(event.id, eventSchedule, runtimeType);
      console.log('[createInstanceDraft] Generated milestones:', JSON.stringify(milestones, null, 2));
      await this.repository.createMilestones(milestones);

      const coAdminIds = [...coAdminUserIds].filter((id) => id !== primaryAdmin.id);

      await this.repository.addEventAdmin(event.id, primaryAdmin.id, 'primary');
      for (const userId of coAdminIds) {
        await this.repository.addEventAdmin(event.id, userId, 'co_admin');
      }

      let templateProvisionStatus: CreateInstanceDraftResult['templateProvisionStatus'] = null;
      if (runtimeType === 'hackday_template') {
        const seed = await this.repository.createHackdayTemplateSeed({
          confluencePageId: childPage.pageId,
          confluenceParentPageId: input.parentPageId,
          hdcEventId: event.id,
          templateName: input.basicInfo.eventName,
          primaryAdminEmail,
          coAdminEmails: normalizedCoAdminEmails,
          seedPayload: {
            source: 'hdc_template_seed',
            createdAt: new Date().toISOString(),
            launchMode,
            wizardSchemaVersion: input.wizardSchemaVersion ?? 2,
            completedStep: input.completedStep ?? 6,
            basicInfo: {
              eventName: input.basicInfo.eventName,
              eventIcon: input.basicInfo.eventIcon || '🚀',
              eventTagline: input.basicInfo.eventTagline,
            },
            schedule: eventSchedule,
            rules: eventRules,
            branding: eventBranding,
          },
          provisionStatus: 'provisioned',
        });
        templateProvisionStatus = seed.provision_status;
      }
      const appView = runtimeType === 'hackday_template'
        ? buildRuntimeAppViewUrl(viewer.siteUrl, childPage.pageId)
        : { url: null, runtimeOwner: HDC_RUNTIME_OWNER_HD26FORGE, routeVersion: 'v1' as const };
      console.info(
        '[hdc-runtime-routing-create-new]',
        JSON.stringify({
          eventId: event.id,
          pageId: childPage.pageId,
          runtimeOwner: appView.runtimeOwner,
          routeVersion: appView.routeVersion,
          appViewUrl: appView.url,
        })
      );

      await Promise.all([
        this.repository.upsertSyncState(event.id, {
          syncStatus: 'not_started',
          pushedCount: 0,
          skippedCount: 0,
          lastAttemptAt: new Date().toISOString(),
          lastError: null,
        }),
        this.repository.logAudit({
          eventId: event.id,
          actorUserId: creator.id,
          action: 'event_created',
          newValue: {
            eventName: event.name,
            confluencePageId: event.confluence_page_id,
            primaryAdminEmail,
            coAdminEmails: normalizedCoAdminEmails,
            launchMode,
            runtimeType,
            templateTarget,
            templateProvisionStatus,
            completedStep: input.completedStep,
            schedule: eventSchedule,
            rules: eventRules,
            branding: eventBranding,
          },
        }),
      ]);

      return {
        eventId: event.id,
        childPageId: childPage.pageId,
        childPageUrl: childPage.pageUrl,
        appViewUrl: appView.url,
        appViewRuntimeOwner: appView.runtimeOwner,
        appViewRouteVersion: appView.routeVersion,
        templateProvisionStatus,
      };
    } catch (error) {
      await deletePage(childPage.pageId);
      throw error;
    }
  }

  async launchInstance(viewer: ViewerContext, eventId: string): Promise<EventLifecycleResult> {
    const user = await this.repository.ensureUser(viewer);
    const event = await this.repository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found for lifecycle update.');
    }
    const admins = await this.repository.listEventAdmins(eventId);

    const canAdmin = admins.some((admin) => admin.user_id === user.id);
    if (!canAdmin) {
      throw new Error('Only event admins can launch an instance.');
    }

    const currentStatus = event.lifecycle_status;
    const nextStatus = LIFECYCLE_NEXT_STATUS[currentStatus];
    if (!nextStatus) {
      throw new Error(
        currentStatus === 'archived'
          ? 'Archived instances cannot be transitioned.'
          : 'Instance lifecycle cannot be advanced further.'
      );
    }

    if (currentStatus === 'results' && nextStatus === 'completed') {
      const syncState = await this.repository.getSyncState(eventId);
      if (!syncState || syncState.syncStatus !== 'complete') {
        throw new Error('Cannot move to completed until sync status is complete.');
      }
    }

    await this.repository.updateEventLifecycle(eventId, nextStatus);
    await this.repository.logAudit({
      eventId,
      actorUserId: user.id,
      action: 'status_changed',
      previousValue: { lifecycle_status: currentStatus },
      newValue: { lifecycle_status: nextStatus },
    });

    return { lifecycleStatus: nextStatus };
  }

  async deleteDraftInstance(viewer: ViewerContext, eventId: string): Promise<DeleteDraftResult> {
    const user = await this.repository.ensureUser(viewer);
    const event = await this.repository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found for draft deletion.');
    }

    const admins = await this.repository.listEventAdmins(eventId);
    const isPrimaryAdmin = admins.some((admin) => admin.user_id === user.id && admin.role === 'primary');
    if (!isPrimaryAdmin) {
      throw new Error('Only the primary admin can delete a draft instance.');
    }
    if (event.lifecycle_status !== 'draft') {
      throw new Error('Only draft instances can be deleted.');
    }

    const eventProjects = await this.repository.listProjectsByEventId(eventId);
    if (eventProjects.length > 0) {
      throw new Error('Draft cannot be deleted after hacks or projects have been created.');
    }

    await this.repository.logAudit({
      eventId,
      actorUserId: user.id,
      action: 'draft_deleted',
      previousValue: {
        eventName: event.name,
        confluencePageId: event.confluence_page_id,
      },
    });

    if (event.confluence_page_id) {
      await deletePage(event.confluence_page_id);
    }
    await this.repository.deleteEventCascade(eventId);

    return { deleted: true };
  }

  async bulkCleanupTestEvents(viewer: ViewerContext): Promise<{
    deletedCount: number;
    failedCount: number;
    deletedPages: number;
    failedPages: number;
    errors: string[];
  }> {
    const user = await this.repository.ensureUser(viewer);

    // Only allow admins to perform bulk cleanup
    // Add your own authorization logic here

    const allEvents = await this.repository.listAllEvents();
    let deletedCount = 0;
    let failedCount = 0;
    let deletedPages = 0;
    let failedPages = 0;
    const errors: string[] = [];

    for (const event of allEvents) {
      try {
        // Delete Confluence page
        if (event.confluencePageId) {
          try {
            await deletePage(event.confluencePageId);
            deletedPages++;
          } catch (pageError) {
            failedPages++;
            errors.push(`Failed to delete Confluence page for ${event.eventName}: ${pageError instanceof Error ? pageError.message : String(pageError)}`);
          }
        }

        // Delete event and all related records
        await this.repository.deleteEventCascade(event.id);
        deletedCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Failed to delete event ${event.eventName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      deletedCount,
      failedCount,
      deletedPages,
      failedPages,
      errors,
    };
  }

  async submitHack(viewer: ViewerContext, payload: SubmitHackInput): Promise<SubmitHackResult> {
    const event = await this.repository.getEventById(payload.eventId);
    if (!event) {
      throw new Error('Event not found for hack submission.');
    }
    if (isReadOnlyLifecycle(event.lifecycle_status)) {
      throw new Error('Instance is read-only after completion; hack submissions are disabled.');
    }

    if (!payload.title.trim()) {
      throw new Error('Hack title is required.');
    }

    const result = await this.repository.submitHack(viewer, payload);
    const user = await this.repository.ensureUser(viewer);

    await this.repository.logAudit({
      eventId: payload.eventId,
      actorUserId: user.id,
      action: 'hack_submitted',
      newValue: {
        projectId: result.projectId,
        title: payload.title,
      },
    });
    this.invalidateDerivedProfile(user.id);

    return result;
  }

  async completeAndSync(viewer: ViewerContext, eventId: string): Promise<SyncResult> {
    const syncStartedAt = Date.now();
    const user = await this.repository.ensureUser(viewer);
    const event = await this.repository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found for sync.');
    }
    if (isReadOnlyLifecycle(event.lifecycle_status)) {
      throw new Error('Instance is read-only after completion; sync actions are disabled.');
    }

    const admins = await this.repository.listEventAdmins(eventId);
    if (!admins.some((admin) => admin.user_id === user.id)) {
      throw new Error('Only event admins can complete and sync this instance.');
    }

    const hacks = await this.repository.listEventHackProjects(eventId);
    if (hacks.length === 0) {
      throw new Error('Cannot complete sync: at least one submitted hack is required.');
    }

    const existingSyncState = await this.repository.getSyncState(eventId);
    const fallbackPushedCount = existingSyncState?.pushedCount ?? 0;
    const fallbackSkippedCount = existingSyncState?.skippedCount ?? 0;

    await this.repository.upsertSyncState(eventId, {
      syncStatus: 'in_progress',
      pushedCount: fallbackPushedCount,
      skippedCount: fallbackSkippedCount,
      lastAttemptAt: new Date().toISOString(),
      lastError: null,
    });

    try {
      const syncResult = await this.repository.completeAndSync(eventId);
      const resultWithGuidance = {
        ...syncResult,
        ...getSyncGuidance(syncResult.syncStatus, syncResult.lastError),
      };
      const auditAction =
        syncResult.syncStatus === 'partial'
          ? 'sync_partial'
          : syncResult.syncStatus === 'failed'
            ? 'sync_failed'
            : 'sync_complete';
      await this.repository.logAudit({
        eventId,
        actorUserId: user.id,
        action: auditAction,
        newValue: resultWithGuidance,
      });
      this.invalidateDerivedProfile(user.id);
      logSyncExecutionTelemetry({
        action: 'completeAndSync',
        eventId,
        durationMs: Math.max(0, Date.now() - syncStartedAt),
        outcome: 'success',
        syncStatus: resultWithGuidance.syncStatus,
        syncErrorCategory: resultWithGuidance.syncErrorCategory,
        retryable: resultWithGuidance.retryable,
        warning: resultWithGuidance.lastError,
      });
      return resultWithGuidance;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync failure.';
      const guidance = getSyncGuidance('failed', message);
      await this.repository.upsertSyncState(eventId, {
        syncStatus: 'failed',
        pushedCount: fallbackPushedCount,
        skippedCount: fallbackSkippedCount,
        lastAttemptAt: new Date().toISOString(),
        lastError: message,
      });
      logSyncExecutionTelemetry({
        action: 'completeAndSync',
        eventId,
        durationMs: Math.max(0, Date.now() - syncStartedAt),
        outcome: 'error',
        syncStatus: 'failed',
        syncErrorCategory: guidance.syncErrorCategory,
        retryable: guidance.retryable,
        warning: message,
      });
      throw new Error(`${message} ${guidance.retryGuidance ?? ''}`.trim());
    }
  }

  async retrySync(viewer: ViewerContext, eventId: string): Promise<SyncResult> {
    const syncStartedAt = Date.now();
    const user = await this.repository.ensureUser(viewer);
    const event = await this.repository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found for sync.');
    }
    if (isReadOnlyLifecycle(event.lifecycle_status)) {
      throw new Error('Instance is read-only after completion; sync actions are disabled.');
    }

    const admins = await this.repository.listEventAdmins(eventId);
    if (!admins.some((admin) => admin.user_id === user.id)) {
      throw new Error('Only event admins can retry sync.');
    }

    const syncResult = await this.repository.completeAndSync(eventId);
    const resultWithGuidance = {
      ...syncResult,
      ...getSyncGuidance(syncResult.syncStatus, syncResult.lastError),
    };
    await this.repository.logAudit({
      eventId,
      actorUserId: user.id,
      action: 'sync_retry',
      newValue: resultWithGuidance,
    });
    this.invalidateDerivedProfile(user.id);
    logSyncExecutionTelemetry({
      action: 'retrySync',
      eventId,
      durationMs: Math.max(0, Date.now() - syncStartedAt),
      outcome: 'success',
      syncStatus: resultWithGuidance.syncStatus,
      syncErrorCategory: resultWithGuidance.syncErrorCategory,
      retryable: resultWithGuidance.retryable,
      warning: resultWithGuidance.lastError,
    });

    return resultWithGuidance;
  }
}
