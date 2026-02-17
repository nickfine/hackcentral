import { randomUUID } from 'node:crypto';
import type {
  BootstrapData,
  CreateHackInput,
  CreateHackResult,
  CreateProjectInput,
  CreateProjectResult,
  EventBranding,
  EventRegistryItem,
  EventRules,
  EventSchedule,
  EventSyncState,
  LifecycleStatus,
  PersonSnapshot,
  SubmissionRequirement,
  SubmitHackInput,
  SubmitHackResult,
  SyncResult,
  SyncStatus,
  ThemePreference,
  UpdateMentorProfileInput,
  UpdateMentorProfileResult,
  ViewerContext,
} from '../../shared/types';
import { SupabaseRestClient, type QueryFilter } from './client';

const EVENT_TABLE = 'Event';
const USER_TABLE = 'User';
const TEAM_TABLE = 'Team';
const PROJECT_TABLE = 'Project';
const EVENT_ADMIN_TABLE = 'EventAdmin';
const EVENT_SYNC_STATE_TABLE = 'EventSyncState';
const EVENT_AUDIT_LOG_TABLE = 'EventAuditLog';

const EVENT_SELECT_CORE =
  'id,name,icon,tagline,timezone,lifecycle_status,confluence_page_id,confluence_page_url,confluence_parent_page_id,hacking_starts_at,submission_deadline_at,creation_request_id,created_by_user_id';
const EVENT_SELECT_WITH_CONFIG = `${EVENT_SELECT_CORE},event_rules,event_branding,event_schedule`;

const EXPERIENCE_LABELS: Record<string, string> = {
  newbie: 'Newbie',
  curious: 'AI Curious',
  comfortable: 'Comfortable',
  power_user: 'Power User',
  expert: 'Expert',
};

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  building: 'Building',
  incubation: 'Incubation',
  completed: 'Completed',
  archived: 'Archived',
};

type Visibility = 'private' | 'org' | 'public';

interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  atlassian_account_id: string | null;
  experience_level: string | null;
  mentor_capacity: number | null;
  mentor_sessions_used: number | null;
  happy_to_mentor: boolean | null;
  seeking_mentor: boolean | null;
  capability_tags: string[] | null;
}

interface DbProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  hack_type: 'prompt' | 'skill' | 'app' | null;
  visibility: Visibility | null;
  owner_id: string | null;
  workflow_transformed: boolean | null;
  ai_impact_hypothesis: string | null;
  ai_tools_used: string[] | null;
  time_saved_estimate: number | null;
  failures_and_lessons: string | null;
  source_type: 'hack_submission' | 'project' | null;
  synced_to_library_at: string | null;
  event_id: string | null;
  created_at: string | null;
}
type DbProjectRow = Record<string, unknown>;

interface DbEvent {
  id: string;
  name: string;
  icon: string | null;
  tagline: string | null;
  timezone: string | null;
  lifecycle_status: LifecycleStatus;
  confluence_page_id: string;
  confluence_page_url: string | null;
  confluence_parent_page_id: string | null;
  hacking_starts_at: string | null;
  submission_deadline_at: string | null;
  creation_request_id: string | null;
  created_by_user_id: string | null;
  event_rules: EventRules | null;
  event_branding: EventBranding | null;
  event_schedule: EventSchedule | null;
}

interface DbEventAdmin {
  id: string;
  event_id: string;
  user_id: string;
  role: 'primary' | 'co_admin';
}

interface DbSyncState {
  event_id: string;
  sync_status: SyncStatus;
  last_error: string | null;
  last_attempt_at: string | null;
  pushed_count: number | null;
  skipped_count: number | null;
}

function asVisibility(value: string | null | undefined): Visibility {
  if (value === 'private' || value === 'public') return value;
  return 'org';
}

function nowIso(): string {
  return new Date().toISOString();
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function toExperienceLabel(level: string | null): string | null {
  if (!level) return null;
  return EXPERIENCE_LABELS[level] ?? level;
}

function asSyncState(row: DbSyncState): EventSyncState {
  return {
    eventId: row.event_id,
    syncStatus: row.sync_status,
    lastError: row.last_error,
    lastAttemptAt: row.last_attempt_at,
    pushedCount: row.pushed_count ?? 0,
    skippedCount: row.skipped_count ?? 0,
  };
}

function hasMissingEventConfigColumns(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('column') &&
    (message.includes('event_rules') || message.includes('event_branding') || message.includes('event_schedule'))
  );
}

function hasMissingProjectTitleColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('does not exist') &&
      (message.includes('project.title') || message.includes('"project"."title"'))) ||
    message.includes("could not find the 'title' column of 'project' in the schema cache")
  );
}

function hasMissingProjectNameColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('does not exist') &&
      (message.includes('project.name') || message.includes('"project"."name"'))) ||
    message.includes("could not find the 'name' column of 'project' in the schema cache")
  );
}

function hasMissingProjectColumn(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    ((message.includes('does not exist') &&
      (message.includes('project.') || message.includes('"project"."'))) ||
      (message.includes("could not find the '") &&
        message.includes("' column of 'project' in the schema cache")))
  );
}

function extractMissingProjectColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const quoted = normalized.match(/column\s+"Project"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = normalized.match(/column\s+Project\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = normalized.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Project' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

function extractProjectNotNullColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const match = normalized.match(
    /null value in column "([a-zA-Z0-9_]+)" of relation "Project" violates not-null constraint/i
  );
  return match ? match[1] : null;
}

function hasDuplicateProjectTeamId(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('23505') || message.includes('duplicate key value violates unique constraint')) &&
    (message.includes('"teamid"') || message.includes('(teamid)') || message.includes('teamid'))
  );
}

function hasProjectTeamForeignKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  return (
    (message.includes('23503') || message.includes('foreign key constraint')) &&
    (message.includes('"teamid"') || message.includes('(teamid)') || message.includes('teamid'))
  );
}

function normalizeSupabaseErrorMessage(error: Error): string {
  return error.message.replace(/\\+"/g, '"');
}

function extractMissingTeamColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const quoted = normalized.match(/column\s+"Team"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = normalized.match(/column\s+Team\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = normalized.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Team' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

function extractTeamNotNullColumn(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const normalized = normalizeSupabaseErrorMessage(error);
  const match = normalized.match(
    /null value in column "([a-zA-Z0-9_]+)" of relation "Team" violates not-null constraint/i
  );
  return match ? match[1] : null;
}

function defaultTeamFieldValue(column: string, teamId: string, ownerId: string | null, now: string): unknown {
  const col = column.toLowerCase();
  if (col === 'id') return teamId;
  if (col === 'name' || col === 'title') return `Forge Team ${teamId.slice(-8)}`;
  if (col === 'createdat' || col === 'updatedat') return now;
  if (col === 'created_at' || col === 'updated_at') return now;
  if (col === 'ownerid' || col === 'owner_id') return ownerId ?? 'forge-system';
  if (col === 'description') return '';
  if (col === 'slug') return `forge-${teamId.slice(-8)}`;
  return null;
}

async function ensureLegacyTeamRecord(
  client: SupabaseRestClient,
  ownerId: string | null,
  preferredTeamId?: string
): Promise<string | null> {
  const teamId = preferredTeamId || generateLegacyTeamId();
  const now = nowIso();
  const baseName = `Forge Team ${teamId.slice(-8)}`;
  const queue: Array<Record<string, unknown>> = [
    { id: teamId, name: baseName, ownerId: ownerId ?? undefined, createdAt: now, updatedAt: now },
    { id: teamId, name: baseName, owner_id: ownerId ?? undefined, created_at: now, updated_at: now },
    { id: teamId, name: baseName, createdAt: now, updatedAt: now },
    { id: teamId, name: baseName },
    { id: teamId },
  ];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const candidate = queue.shift()!;
    const signature = JSON.stringify(
      Object.entries(candidate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, value ?? null])
    );
    if (seen.has(signature)) continue;
    seen.add(signature);

    try {
      await client.insert(TEAM_TABLE, candidate);
      return teamId;
    } catch (error) {
      if (error instanceof Error) {
        const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();
        if (normalized.includes('23505') || normalized.includes('duplicate key value violates unique constraint')) {
          return teamId;
        }
      }

      const missingColumn = extractMissingTeamColumn(error);
      if (missingColumn && missingColumn in candidate) {
        const withoutMissing = { ...candidate };
        delete withoutMissing[missingColumn];
        queue.push(withoutMissing);
      }

      const notNullColumn = extractTeamNotNullColumn(error);
      if (notNullColumn && !(notNullColumn in candidate)) {
        const defaultValue = defaultTeamFieldValue(notNullColumn, teamId, ownerId, now);
        queue.push({
          ...candidate,
          [notNullColumn]: defaultValue,
        });
      }
    }
  }

  return null;
}

function generateLegacyTeamId(): string {
  return `confluence-team-${randomUUID()}`;
}

function getStringField(row: DbProjectRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') return value;
  }
  return null;
}

function getNumberField(row: DbProjectRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function getBooleanField(row: DbProjectRow, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') return value;
  }
  return null;
}

function getStringArrayField(row: DbProjectRow, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
  }
  return null;
}

function normalizeProjectRow(row: DbProjectRow): DbProject {
  const submittedAt = getStringField(row, ['submitted_at']);
  const title = getStringField(row, ['title', 'name']) ?? 'Untitled';
  const status = getStringField(row, ['status']) ?? (submittedAt ? 'completed' : 'idea');
  const sourceTypeRaw = getStringField(row, ['source_type']) as DbProject['source_type'];
  const sourceType =
    sourceTypeRaw === 'hack_submission'
      ? 'hack_submission'
      : submittedAt
        ? 'hack_submission'
        : 'project';

  return {
    id: getStringField(row, ['id']) ?? '',
    title,
    description: getStringField(row, ['description']),
    status,
    hack_type: (getStringField(row, ['hack_type']) as DbProject['hack_type']) ?? null,
    visibility: (getStringField(row, ['visibility']) as Visibility | null) ?? 'org',
    owner_id: getStringField(row, ['owner_id']),
    workflow_transformed: getBooleanField(row, ['workflow_transformed']) ?? false,
    ai_impact_hypothesis: getStringField(row, ['ai_impact_hypothesis']),
    ai_tools_used: getStringArrayField(row, ['ai_tools_used']) ?? [],
    time_saved_estimate: getNumberField(row, ['time_saved_estimate']),
    failures_and_lessons: getStringField(row, ['failures_and_lessons']),
    source_type: sourceType ?? 'project',
    synced_to_library_at: getStringField(row, ['synced_to_library_at']),
    event_id: getStringField(row, ['event_id']),
    created_at: getStringField(row, ['created_at']),
  };
}

function matchesProjectFilter(project: DbProject, filter: QueryFilter): boolean {
  let value: string | number | boolean | null | undefined;

  switch (filter.field) {
    case 'id':
      value = project.id;
      break;
    case 'event_id':
      value = project.event_id;
      break;
    case 'source_type':
      value = project.source_type;
      break;
    case 'owner_id':
      value = project.owner_id;
      break;
    default:
      return true;
  }

  if (filter.op === 'eq') return String(value ?? '') === String(filter.value ?? '');
  if (filter.op === 'neq') return String(value ?? '') !== String(filter.value ?? '');
  if (filter.op === 'is') {
    if (filter.value === null) return value === null;
    return String(value ?? '') === String(filter.value);
  }
  return true;
}

function withNullEventConfig(row: Omit<DbEvent, 'event_rules' | 'event_branding' | 'event_schedule'>): DbEvent {
  return {
    ...row,
    event_rules: null,
    event_branding: null,
    event_schedule: null,
  };
}

function defaultEventRules(): EventRules {
  return {
    allowCrossTeamMentoring: true,
    maxTeamSize: 6,
    requireDemoLink: false,
    judgingModel: 'hybrid',
  };
}

function defaultEventBranding(): EventBranding {
  return {
    accentColor: '#0f766e',
  };
}

function asEventRules(value: unknown): EventRules {
  if (!value || typeof value !== 'object') return defaultEventRules();
  const candidate = value as Partial<EventRules>;
  const minTeamSizeRaw = Number(candidate.minTeamSize);
  const maxTeamSizeRaw = Number(candidate.maxTeamSize);
  const minTeamSize = Number.isFinite(minTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(minTeamSizeRaw))) : null;
  const maxTeamSizeBase = Number.isFinite(maxTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(maxTeamSizeRaw))) : 6;
  const judgingModel =
    candidate.judgingModel === 'panel' || candidate.judgingModel === 'popular_vote' || candidate.judgingModel === 'hybrid'
      ? candidate.judgingModel
      : 'hybrid';
  const maxTeamSize = minTeamSize === null ? maxTeamSizeBase : Math.max(minTeamSize, maxTeamSizeBase);
  const submissionRequirements =
    Array.isArray(candidate.submissionRequirements)
      ? candidate.submissionRequirements.filter(
          (item): item is SubmissionRequirement =>
            item === 'video_demo' || item === 'working_prototype' || item === 'documentation'
        )
      : [];
  const categories =
    Array.isArray(candidate.categories)
      ? [...new Set(candidate.categories.map((item) => item.trim()).filter((item) => item.length > 0))]
      : [];
  const prizesText = typeof candidate.prizesText === 'string' && candidate.prizesText.trim()
    ? candidate.prizesText.trim()
    : null;

  const rules: EventRules = {
    allowCrossTeamMentoring: candidate.allowCrossTeamMentoring ?? true,
    maxTeamSize,
    requireDemoLink: candidate.requireDemoLink ?? false,
    judgingModel,
  };
  if (minTeamSize !== null) {
    rules.minTeamSize = minTeamSize;
  }
  if (submissionRequirements.length > 0) {
    rules.submissionRequirements = submissionRequirements;
  }
  if (categories.length > 0) {
    rules.categories = categories;
  }
  if (prizesText) {
    rules.prizesText = prizesText;
  }
  return rules;
}

function asEventBranding(value: unknown): EventBranding {
  const defaults = defaultEventBranding();
  if (!value || typeof value !== 'object') return defaults;
  const candidate = value as Partial<EventBranding>;
  const themePreference: ThemePreference | null =
    candidate.themePreference === 'system' || candidate.themePreference === 'light' || candidate.themePreference === 'dark'
      ? candidate.themePreference
      : null;
  const branding: EventBranding = {
    accentColor: typeof candidate.accentColor === 'string' && candidate.accentColor.trim()
      ? candidate.accentColor.trim()
      : defaults.accentColor,
  };
  if (typeof candidate.bannerMessage === 'string' && candidate.bannerMessage.trim()) {
    branding.bannerMessage = candidate.bannerMessage.trim();
  }
  if (typeof candidate.bannerImageUrl === 'string' && candidate.bannerImageUrl.trim()) {
    branding.bannerImageUrl = candidate.bannerImageUrl.trim();
  }
  if (themePreference) {
    branding.themePreference = themePreference;
  }
  return branding;
}

function sanitizeScheduleDatetime(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asEventSchedule(
  value: unknown,
  fallback: { timezone: string | null; hackingStartsAt: string | null; submissionDeadlineAt: string | null }
): EventSchedule {
  const schedule = value && typeof value === 'object' ? (value as Partial<EventSchedule>) : {};
  return {
    timezone:
      (typeof schedule.timezone === 'string' && schedule.timezone.trim() ? schedule.timezone.trim() : null) ||
      fallback.timezone ||
      'Europe/London',
    registrationOpensAt: sanitizeScheduleDatetime(schedule.registrationOpensAt),
    registrationClosesAt: sanitizeScheduleDatetime(schedule.registrationClosesAt),
    teamFormationStartsAt: sanitizeScheduleDatetime(schedule.teamFormationStartsAt),
    teamFormationEndsAt: sanitizeScheduleDatetime(schedule.teamFormationEndsAt),
    hackingStartsAt: sanitizeScheduleDatetime(schedule.hackingStartsAt) || fallback.hackingStartsAt || undefined,
    submissionDeadlineAt:
      sanitizeScheduleDatetime(schedule.submissionDeadlineAt) || fallback.submissionDeadlineAt || undefined,
    votingStartsAt: sanitizeScheduleDatetime(schedule.votingStartsAt),
    votingEndsAt: sanitizeScheduleDatetime(schedule.votingEndsAt),
    resultsAnnounceAt: sanitizeScheduleDatetime(schedule.resultsAnnounceAt),
  };
}

function toEventRegistryItem(event: DbEvent): EventRegistryItem {
  const schedule = asEventSchedule(event.event_schedule, {
    timezone: event.timezone,
    hackingStartsAt: event.hacking_starts_at,
    submissionDeadlineAt: event.submission_deadline_at,
  });
  return {
    id: event.id,
    eventName: event.name,
    icon: event.icon ?? '🚀',
    tagline: event.tagline,
    lifecycleStatus: event.lifecycle_status,
    confluencePageId: event.confluence_page_id,
    confluenceParentPageId: event.confluence_parent_page_id,
    schedule,
    hackingStartsAt: schedule.hackingStartsAt ?? event.hacking_starts_at,
    submissionDeadlineAt: schedule.submissionDeadlineAt ?? event.submission_deadline_at,
    rules: asEventRules(event.event_rules),
    branding: asEventBranding(event.event_branding),
  };
}

function buildAccountFallbackEmail(accountId: string): string {
  const safe = accountId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safe}@adaptavist.com`;
}

function buildDisplayNameFromEmail(email: string): string {
  const [localPart] = email.split('@');
  return localPart || email;
}

export class SupabaseRepository {
  private readonly client: SupabaseRestClient;

  constructor(client = new SupabaseRestClient()) {
    this.client = client;
  }

  getSourceInfo(): BootstrapData['source'] {
    return {
      provider: 'supabase',
      deploymentUrl: this.client.deploymentUrl,
      schema: this.client.schema,
    };
  }

  async getUserByAccountId(accountId: string): Promise<DbUser | null> {
    return this.client.selectOne<DbUser>(
      USER_TABLE,
      'id,email,full_name,atlassian_account_id,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
      [{ field: 'atlassian_account_id', op: 'eq', value: accountId }]
    );
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    return this.client.selectOne<DbUser>(
      USER_TABLE,
      'id,email,full_name,atlassian_account_id,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
      [{ field: 'email', op: 'eq', value: email.trim().toLowerCase() }]
    );
  }

  async getUserById(userId: string): Promise<DbUser | null> {
    return this.client.selectOne<DbUser>(
      USER_TABLE,
      'id,email,full_name,atlassian_account_id,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags',
      [{ field: 'id', op: 'eq', value: userId }]
    );
  }

  async ensureUser(viewer: ViewerContext, explicitEmail?: string): Promise<DbUser> {
    const existing = await this.getUserByAccountId(viewer.accountId);
    if (existing) return existing;

    const email = (explicitEmail || buildAccountFallbackEmail(viewer.accountId)).trim().toLowerCase();
    const existingByEmail = await this.getUserByEmail(email);
    if (existingByEmail) return existingByEmail;

    return this.client.insert<DbUser>(USER_TABLE, {
      email,
      full_name: `Atlassian User ${viewer.accountId.slice(0, 8)}`,
      atlassian_account_id: viewer.accountId,
      mentor_capacity: 0,
      mentor_sessions_used: 0,
      happy_to_mentor: false,
      seeking_mentor: false,
      capability_tags: [],
    });
  }

  async ensureUserByEmail(email: string): Promise<DbUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.getUserByEmail(normalizedEmail);
    if (existing) return existing;

    return this.client.insert<DbUser>(USER_TABLE, {
      email: normalizedEmail,
      full_name: buildDisplayNameFromEmail(normalizedEmail),
      atlassian_account_id: null,
      mentor_capacity: 0,
      mentor_sessions_used: 0,
      happy_to_mentor: false,
      seeking_mentor: false,
      capability_tags: [],
    });
  }

  private async getAnyTeamId(): Promise<string | null> {
    try {
      const row = await this.client.selectOne<{ id: string }>(TEAM_TABLE, 'id');
      return row?.id ?? null;
    } catch {
      return null;
    }
  }

  private async listTeamIds(): Promise<string[]> {
    try {
      const rows = await this.client.selectMany<{ id: string }>(TEAM_TABLE, 'id');
      return rows.map((row) => row.id).filter((id) => typeof id === 'string' && id.length > 0);
    } catch {
      return [];
    }
  }

  private async listProjects(filters: QueryFilter[] = []): Promise<DbProject[]> {
    try {
      const rows = await this.client.selectMany<DbProjectRow>(PROJECT_TABLE, '*', filters);
      return rows.map(normalizeProjectRow);
    } catch (error) {
      if (!hasMissingProjectColumn(error)) {
        throw error;
      }
      const rows = await this.client.selectMany<DbProjectRow>(PROJECT_TABLE, '*');
      const projects = rows.map(normalizeProjectRow);
      return projects.filter((project) => filters.every((filter) => matchesProjectFilter(project, filter)));
    }
  }

  private async insertProject(payload: Record<string, unknown> & { title: string }): Promise<{
    id: string;
    title?: string | null;
    name?: string | null;
  }> {
    const projectId = typeof payload.id === 'string' && payload.id.trim() ? payload.id : randomUUID();
    const ownerId =
      typeof payload.owner_id === 'string'
        ? payload.owner_id
        : typeof payload.ownerId === 'string'
          ? payload.ownerId
          : null;
    let fallbackTeamId = await this.getAnyTeamId();
    if (!fallbackTeamId) {
      fallbackTeamId = await ensureLegacyTeamRecord(this.client, ownerId);
    }
    const exhaustedTeamIds = new Set<string>();
    const legacyTimestamp = nowIso();
    const withLegacyTeam = fallbackTeamId ? { teamId: fallbackTeamId } : {};
    const withLegacyTimestamps = { createdAt: legacyTimestamp, updatedAt: legacyTimestamp };
    const queue: Array<Record<string, unknown>> = [
      { ...payload, id: projectId, name: payload.title, ...withLegacyTeam, ...withLegacyTimestamps },
      { ...payload, id: projectId, ...withLegacyTeam, ...withLegacyTimestamps },
      { ...payload, id: projectId, name: payload.title, ...withLegacyTimestamps },
      { ...payload, id: projectId, ...withLegacyTimestamps },
      { ...payload, id: projectId, name: payload.title },
      { ...payload, id: projectId },
    ];
    const seen = new Set<string>();
    let lastError: unknown = null;

    while (queue.length > 0) {
      const candidate = queue.shift()!;
      const signature = JSON.stringify(
        Object.entries(candidate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, value ?? null])
      );
      if (seen.has(signature)) continue;
      seen.add(signature);

      try {
        return await this.client.insert<{ id: string; title?: string | null; name?: string | null }>(
          PROJECT_TABLE,
          candidate
        );
      } catch (error) {
        lastError = error;

        if (hasDuplicateProjectTeamId(error) && candidate.teamId) {
          const currentTeamId = String(candidate.teamId);
          exhaustedTeamIds.add(currentTeamId);
          const alternatives = await this.listTeamIds();
          const alternativeTeamId = alternatives.find((teamId) => !exhaustedTeamIds.has(teamId));

          if (alternativeTeamId) {
            exhaustedTeamIds.add(alternativeTeamId);
            queue.push({
              ...candidate,
              teamId: alternativeTeamId,
            });
          } else {
            const freshTeamId = await ensureLegacyTeamRecord(this.client, ownerId);
            if (freshTeamId) {
              exhaustedTeamIds.add(freshTeamId);
              queue.push({
                ...candidate,
                teamId: freshTeamId,
              });
            }
          }
        }

        const notNullColumn = extractProjectNotNullColumn(error);
        if (notNullColumn === 'teamId' && !candidate.teamId) {
          if (!fallbackTeamId || exhaustedTeamIds.has(fallbackTeamId)) {
            const alternatives = await this.listTeamIds();
            fallbackTeamId = alternatives.find((teamId) => !exhaustedTeamIds.has(teamId)) ?? null;
          }
          if (!fallbackTeamId) {
            fallbackTeamId = await ensureLegacyTeamRecord(this.client, ownerId);
          }
          if (fallbackTeamId) {
            exhaustedTeamIds.add(fallbackTeamId);
            queue.push({
              ...candidate,
              teamId: fallbackTeamId,
            });
          }
        }
        if (notNullColumn === 'name' && !candidate.name) {
          queue.push({ ...candidate, name: String(candidate.title ?? payload.title) });
        }
        if (notNullColumn === 'updatedAt' && !candidate.updatedAt) {
          queue.push({ ...candidate, updatedAt: nowIso() });
        }
        if (notNullColumn === 'createdAt' && !candidate.createdAt) {
          queue.push({ ...candidate, createdAt: nowIso() });
        }

        if (!hasMissingProjectColumn(error)) {
          if (hasProjectTeamForeignKeyError(error) && typeof candidate.teamId === 'string' && candidate.teamId) {
            const ensured = await ensureLegacyTeamRecord(this.client, ownerId, candidate.teamId);
            if (ensured) {
              queue.push({ ...candidate, teamId: ensured });
              continue;
            }
          }
          if (
            hasDuplicateProjectTeamId(error) ||
            hasProjectTeamForeignKeyError(error) ||
            notNullColumn === 'teamId' ||
            notNullColumn === 'name' ||
            notNullColumn === 'updatedAt' ||
            notNullColumn === 'createdAt'
          ) {
            continue;
          }
          throw error;
        }

        const missingColumn = extractMissingProjectColumn(error);
        if (missingColumn && missingColumn in candidate) {
          const withoutMissing = { ...candidate };
          delete withoutMissing[missingColumn];
          queue.push(withoutMissing);
        }

        if (hasMissingProjectNameColumn(error) && 'name' in candidate) {
          const withoutName = { ...candidate };
          delete withoutName.name;
          queue.push(withoutName);
        }

        if (hasMissingProjectTitleColumn(error) && 'title' in candidate) {
          const withoutTitle = { ...candidate };
          delete withoutTitle.title;
          queue.push(withoutTitle);
        }

      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('Supabase insert Project failed: no compatible payload variant succeeded.');
  }

async getBootstrapData(viewer: ViewerContext): Promise<BootstrapData> {
    const [users, projects, registry] = await Promise.all([
      this.client.selectMany<DbUser>(
        USER_TABLE,
        'id,email,full_name,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags'
      ),
      this.listProjects(),
      this.listAllEvents(),
    ]);

    const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));

    let hackRows = projects.filter((project) => project.source_type === 'hack_submission');
    let projectRows = projects.filter((project) => project.source_type !== 'hack_submission');

    if (hackRows.length === 0 && projects.length > 0) {
      // Legacy schema/data can classify everything as generic projects; surface those as hacks instead of an empty UI.
      hackRows = projects;
      projectRows = projects;
    }

    const featuredHacks = hackRows
      .slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 8)
      .map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description ?? '',
        assetType: (project.hack_type ?? 'prompt') as 'prompt' | 'skill' | 'app',
        status: project.synced_to_library_at ? 'verified' : 'in_progress',
        reuseCount: project.synced_to_library_at ? 1 : 0,
        authorName: project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : 'Unknown',
        visibility: asVisibility(project.visibility),
        intendedUser: null,
        context: null,
        limitations: null,
        riskNotes: null,
        sourceRepoUrl: null,
        demoUrl: null,
      }));

    const recentProjects = projectRows
      .slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 8)
      .map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description ?? '',
        status: project.status,
        statusLabel: toStatusLabel(project.status),
        hackType: project.hack_type,
        ownerName: project.owner_id ? userNameById.get(project.owner_id) ?? 'Unknown' : 'Unknown',
        attachedHacksCount: 0,
        commentCount: 0,
        visibility: asVisibility(project.visibility),
        workflowTransformed: project.workflow_transformed ?? false,
        aiImpactHypothesis: project.ai_impact_hypothesis,
        aiToolsUsed: project.ai_tools_used ?? [],
        timeSavedEstimate: project.time_saved_estimate,
        failuresAndLessons: project.failures_and_lessons,
      }));

    const people: PersonSnapshot[] = users.slice(0, 12).map((user) => {
      const mentorCapacity = isFiniteNumber(user.mentor_capacity) ? user.mentor_capacity : 0;
      const mentorSessionsUsed = isFiniteNumber(user.mentor_sessions_used) ? user.mentor_sessions_used : 0;
      const capabilities = [...(user.capability_tags ?? [])];
      if (user.happy_to_mentor) capabilities.push('Happy to Mentor');
      if (user.seeking_mentor) capabilities.push('Seeking Mentor');

      return {
        id: user.id,
        fullName: user.full_name || user.email,
        email: user.email,
        experienceLevel: user.experience_level,
        experienceLabel: toExperienceLabel(user.experience_level),
        mentorCapacity,
        mentorSessionsUsed,
        mentorSlotsRemaining: Math.max(mentorCapacity - mentorSessionsUsed, 0),
        capabilities,
      };
    });

    const inProgressProjects = projectRows.filter((project) => ['idea', 'building', 'incubation'].includes(project.status));
    const completedProjects = projectRows.filter((project) => project.status === 'completed');

    return {
      viewer,
      source: this.getSourceInfo(),
      summary: {
        totalPeople: users.length,
        totalHacks: hackRows.length,
        featuredHacks: featuredHacks.length,
        inProgressProjects: inProgressProjects.length,
        completedProjects: completedProjects.length,
        activeMentors: people.filter((person) => person.mentorSlotsRemaining > 0).length,
      },
      featuredHacks,
      recentProjects,
      people,
      registry,
    };
  }

  async createHack(viewer: ViewerContext, input: CreateHackInput): Promise<CreateHackResult> {
    const user = await this.ensureUser(viewer);
    const inserted = await this.insertProject({
      title: input.title,
      name: input.title,
      description: input.description ?? null,
      status: 'completed',
      hack_type: input.assetType,
      visibility: input.visibility ?? 'org',
      owner_id: user.id,
      workflow_transformed: false,
      source_type: 'hack_submission',
      synced_to_library_at: null,
    });

    return {
      assetId: inserted.id,
      title: inserted.title ?? inserted.name ?? input.title,
    };
  }

  async createProject(viewer: ViewerContext, input: CreateProjectInput): Promise<CreateProjectResult> {
    const user = await this.ensureUser(viewer);
    const inserted = await this.insertProject({
      title: input.title,
      name: input.title,
      description: input.description ?? null,
      status: 'idea',
      hack_type: input.hackType ?? null,
      visibility: input.visibility ?? 'org',
      owner_id: user.id,
      workflow_transformed: false,
      source_type: 'project',
      synced_to_library_at: null,
    });

    return {
      projectId: inserted.id,
      title: inserted.title ?? inserted.name ?? input.title,
    };
  }

  async updateMentorProfile(
    viewer: ViewerContext,
    input: UpdateMentorProfileInput
  ): Promise<UpdateMentorProfileResult> {
    const user = await this.ensureUser(viewer);
    const rows = await this.client.patchMany<DbUser>(
      USER_TABLE,
      {
        mentor_capacity: Math.max(0, Math.floor(input.mentorCapacity)),
        happy_to_mentor: input.happyToMentor,
        seeking_mentor: input.seekingMentor,
      },
      [{ field: 'id', op: 'eq', value: user.id }]
    );

    const updated = rows[0] ?? user;
    return {
      profileId: updated.id,
      mentorCapacity: Math.max(0, Math.floor(updated.mentor_capacity ?? 0)),
    };
  }

  async getEventByConfluencePageId(pageId: string): Promise<DbEvent | null> {
    try {
      return await this.client.selectOne<DbEvent>(EVENT_TABLE, EVENT_SELECT_WITH_CONFIG, [
        { field: 'confluence_page_id', op: 'eq', value: pageId },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectOne<Omit<DbEvent, 'event_rules' | 'event_branding' | 'event_schedule'>>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'confluence_page_id', op: 'eq', value: pageId }]
      );
      return legacy ? withNullEventConfig(legacy) : null;
    }
  }

  async getEventByCreationRequestId(creationRequestId: string): Promise<DbEvent | null> {
    try {
      return await this.client.selectOne<DbEvent>(EVENT_TABLE, EVENT_SELECT_WITH_CONFIG, [
        { field: 'creation_request_id', op: 'eq', value: creationRequestId },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectOne<Omit<DbEvent, 'event_rules' | 'event_branding' | 'event_schedule'>>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'creation_request_id', op: 'eq', value: creationRequestId }]
      );
      return legacy ? withNullEventConfig(legacy) : null;
    }
  }

  async getEventById(eventId: string): Promise<DbEvent | null> {
    try {
      return await this.client.selectOne<DbEvent>(EVENT_TABLE, EVENT_SELECT_WITH_CONFIG, [
        { field: 'id', op: 'eq', value: eventId },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectOne<Omit<DbEvent, 'event_rules' | 'event_branding' | 'event_schedule'>>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'id', op: 'eq', value: eventId }]
      );
      return legacy ? withNullEventConfig(legacy) : null;
    }
  }

  async listEventsByParentPageId(parentPageId: string): Promise<EventRegistryItem[]> {
    let events: DbEvent[] = [];
    try {
      events = await this.client.selectMany<DbEvent>(EVENT_TABLE, `${EVENT_SELECT_WITH_CONFIG}`, [
        { field: 'confluence_parent_page_id', op: 'eq', value: parentPageId },
      ]);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectMany<Omit<DbEvent, 'event_rules' | 'event_branding' | 'event_schedule'>>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'confluence_parent_page_id', op: 'eq', value: parentPageId }]
      );
      events = legacy.map((row) => withNullEventConfig(row));
    }

    return events
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toEventRegistryItem);
  }

  async listAllEvents(): Promise<EventRegistryItem[]> {
    let events: DbEvent[] = [];
    try {
      events = await this.client.selectMany<DbEvent>(EVENT_TABLE, `${EVENT_SELECT_WITH_CONFIG}`);
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.selectMany<Omit<DbEvent, 'event_rules' | 'event_branding' | 'event_schedule'>>(
        EVENT_TABLE,
        EVENT_SELECT_CORE
      );
      events = legacy.map((row) => withNullEventConfig(row));
    }

    return events
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toEventRegistryItem);
  }

  async createEvent(input: {
    eventName: string;
    icon: string;
    tagline?: string;
    timezone: string;
    lifecycleStatus: LifecycleStatus;
    confluencePageId: string;
    confluencePageUrl?: string;
    confluenceParentPageId: string;
    hackingStartsAt?: string;
    submissionDeadlineAt?: string;
    eventSchedule: EventSchedule;
    creationRequestId: string;
    createdByUserId: string;
    eventRules: EventRules;
    eventBranding: EventBranding;
  }): Promise<DbEvent> {
    const basePayload = {
      name: input.eventName,
      icon: input.icon,
      tagline: input.tagline ?? null,
      timezone: input.timezone,
      lifecycle_status: input.lifecycleStatus,
      confluence_page_id: input.confluencePageId,
      confluence_page_url: input.confluencePageUrl ?? null,
      confluence_parent_page_id: input.confluenceParentPageId,
      hacking_starts_at: input.hackingStartsAt ?? null,
      submission_deadline_at: input.submissionDeadlineAt ?? null,
      creation_request_id: input.creationRequestId,
      created_by_user_id: input.createdByUserId,
    };

    try {
      return await this.client.insert<DbEvent>(EVENT_TABLE, {
        ...basePayload,
        event_rules: input.eventRules,
        event_branding: input.eventBranding,
        event_schedule: input.eventSchedule,
      });
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.insert<Omit<DbEvent, 'event_rules' | 'event_branding' | 'event_schedule'>>(
        EVENT_TABLE,
        basePayload
      );
      return withNullEventConfig(legacy);
    }
  }

  async addEventAdmin(eventId: string, userId: string, role: 'primary' | 'co_admin'): Promise<DbEventAdmin> {
    return this.client.insert<DbEventAdmin>(EVENT_ADMIN_TABLE, {
      event_id: eventId,
      user_id: userId,
      role,
      added_at: nowIso(),
    });
  }

  async listEventAdmins(eventId: string): Promise<DbEventAdmin[]> {
    return this.client.selectMany<DbEventAdmin>(
      EVENT_ADMIN_TABLE,
      'id,event_id,user_id,role',
      [{ field: 'event_id', op: 'eq', value: eventId }]
    );
  }

  async upsertSyncState(eventId: string, payload: Partial<EventSyncState> & { syncStatus: SyncStatus }): Promise<EventSyncState> {
    const row = await this.client.upsert<DbSyncState>(
      EVENT_SYNC_STATE_TABLE,
      {
        event_id: eventId,
        sync_status: payload.syncStatus,
        last_error: payload.lastError ?? null,
        last_attempt_at: payload.lastAttemptAt ?? nowIso(),
        pushed_count: payload.pushedCount ?? 0,
        skipped_count: payload.skippedCount ?? 0,
      },
      'event_id'
    );

    return asSyncState(row);
  }

  async getSyncState(eventId: string): Promise<EventSyncState | null> {
    const row = await this.client.selectOne<DbSyncState>(
      EVENT_SYNC_STATE_TABLE,
      'event_id,sync_status,last_error,last_attempt_at,pushed_count,skipped_count',
      [{ field: 'event_id', op: 'eq', value: eventId }]
    );
    return row ? asSyncState(row) : null;
  }

  async updateEventLifecycle(eventId: string, lifecycleStatus: LifecycleStatus): Promise<DbEvent> {
    const rows = await this.client.patchMany<DbEvent>(
      EVENT_TABLE,
      { lifecycle_status: lifecycleStatus },
      [{ field: 'id', op: 'eq', value: eventId }]
    );

    if (rows.length === 0) {
      throw new Error(`Event ${eventId} not found while updating lifecycle.`);
    }
    return rows[0];
  }

  async submitHack(viewer: ViewerContext, payload: SubmitHackInput): Promise<SubmitHackResult> {
    const user = await this.ensureUser(viewer);
    const inserted = await this.insertProject({
      title: payload.title,
      description: payload.description ?? null,
      status: 'completed',
      source_type: 'hack_submission',
      hack_type: 'prompt',
      visibility: 'org',
      owner_id: user.id,
      workflow_transformed: false,
      event_id: payload.eventId,
      synced_to_library_at: null,
    });

    return { projectId: inserted.id };
  }

  async listEventHackProjects(eventId: string): Promise<DbProject[]> {
    const filters: QueryFilter[] = [
      { field: 'event_id', op: 'eq', value: eventId },
      { field: 'source_type', op: 'eq', value: 'hack_submission' },
    ];

    return this.listProjects(filters);
  }

  async listProjectsByEventId(eventId: string): Promise<DbProject[]> {
    return this.listProjects([{ field: 'event_id', op: 'eq', value: eventId }]);
  }

  async markHackSynced(projectId: string): Promise<void> {
    await this.client.patchMany<DbProject>(
      PROJECT_TABLE,
      { synced_to_library_at: nowIso() },
      [{ field: 'id', op: 'eq', value: projectId }]
    );
  }

  async logAudit(input: {
    eventId: string;
    actorUserId: string;
    action: string;
    previousValue?: unknown;
    newValue?: unknown;
  }): Promise<void> {
    await this.client.insert(EVENT_AUDIT_LOG_TABLE, {
      event_id: input.eventId,
      actor_user_id: input.actorUserId,
      action: input.action,
      previous_value: input.previousValue ?? null,
      new_value: input.newValue ?? null,
      created_at: nowIso(),
    });
  }

  async deleteEventCascade(eventId: string): Promise<void> {
    await this.client.deleteMany(EVENT_ADMIN_TABLE, [{ field: 'event_id', op: 'eq', value: eventId }]);
    await this.client.deleteMany(EVENT_SYNC_STATE_TABLE, [{ field: 'event_id', op: 'eq', value: eventId }]);
    await this.client.deleteMany(EVENT_AUDIT_LOG_TABLE, [{ field: 'event_id', op: 'eq', value: eventId }]);

    const deleted = await this.client.deleteMany<DbEvent>(EVENT_TABLE, [{ field: 'id', op: 'eq', value: eventId }]);
    if (deleted.length === 0) {
      throw new Error(`Event ${eventId} not found while deleting draft.`);
    }
  }

  async getEventNameConflicts(eventName: string, parentPageId: string): Promise<EventRegistryItem[]> {
    const all = await this.listEventsByParentPageId(parentPageId);
    const normalized = eventName.trim().toLowerCase();
    return all.filter((event) => event.eventName.trim().toLowerCase() === normalized);
  }

  async completeAndSync(eventId: string): Promise<SyncResult> {
    const projects = await this.listEventHackProjects(eventId);
    let pushedCount = 0;
    let skippedCount = 0;
    const failedProjectIds: string[] = [];

    for (const project of projects) {
      if (project.synced_to_library_at) {
        skippedCount += 1;
        continue;
      }
      try {
        await this.markHackSynced(project.id);
        pushedCount += 1;
      } catch {
        failedProjectIds.push(project.id);
      }
    }

    const syncStatus: SyncStatus =
      failedProjectIds.length === 0
        ? 'complete'
        : pushedCount > 0 || skippedCount > 0
          ? 'partial'
          : 'failed';
    const syncFinishedAt = nowIso();

    if (syncStatus !== 'failed') {
      await this.updateEventLifecycle(eventId, 'completed');
    }

    const failedSample = failedProjectIds.slice(0, 3).join(', ');
    const failedSuffix = failedProjectIds.length > 3 ? ', ...' : '';
    const lastError =
      failedProjectIds.length > 0
        ? `Failed to sync ${failedProjectIds.length} hack(s)${
            failedSample ? ` (${failedSample}${failedSuffix})` : ''
          }.`
        : null;

    await this.upsertSyncState(eventId, {
      syncStatus,
      pushedCount,
      skippedCount,
      lastError,
      lastAttemptAt: syncFinishedAt,
    });

    return {
      syncStatus,
      pushedCount,
      skippedCount,
    };
  }
}
