import type {
  BootstrapData,
  CreateHackInput,
  CreateHackResult,
  CreateProjectInput,
  CreateProjectResult,
  EventBranding,
  EventRegistryItem,
  EventRules,
  EventSyncState,
  LifecycleStatus,
  PersonSnapshot,
  SubmitHackInput,
  SubmitHackResult,
  SyncResult,
  SyncStatus,
  UpdateMentorProfileInput,
  UpdateMentorProfileResult,
  ViewerContext,
} from '../../shared/types';
import { SupabaseRestClient, type QueryFilter } from './client';

const EVENT_TABLE = 'Event';
const USER_TABLE = 'User';
const PROJECT_TABLE = 'Project';
const EVENT_ADMIN_TABLE = 'EventAdmin';
const EVENT_SYNC_STATE_TABLE = 'EventSyncState';
const EVENT_AUDIT_LOG_TABLE = 'EventAuditLog';

const EVENT_SELECT_CORE =
  'id,name,icon,tagline,timezone,lifecycle_status,confluence_page_id,confluence_page_url,confluence_parent_page_id,hacking_starts_at,submission_deadline_at,creation_request_id,created_by_user_id';
const EVENT_SELECT_WITH_CONFIG = `${EVENT_SELECT_CORE},event_rules,event_branding`;

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
  return message.includes('column') && (message.includes('event_rules') || message.includes('event_branding'));
}

function withNullEventConfig(row: Omit<DbEvent, 'event_rules' | 'event_branding'>): DbEvent {
  return {
    ...row,
    event_rules: null,
    event_branding: null,
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
  const maxTeamSizeRaw = Number(candidate.maxTeamSize);
  const judgingModel =
    candidate.judgingModel === 'panel' || candidate.judgingModel === 'popular_vote' || candidate.judgingModel === 'hybrid'
      ? candidate.judgingModel
      : 'hybrid';

  return {
    allowCrossTeamMentoring: candidate.allowCrossTeamMentoring ?? true,
    maxTeamSize: Number.isFinite(maxTeamSizeRaw) ? Math.min(20, Math.max(1, Math.floor(maxTeamSizeRaw))) : 6,
    requireDemoLink: candidate.requireDemoLink ?? false,
    judgingModel,
  };
}

function asEventBranding(value: unknown): EventBranding {
  const defaults = defaultEventBranding();
  if (!value || typeof value !== 'object') return defaults;
  const candidate = value as Partial<EventBranding>;
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
  return branding;
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

  async getBootstrapData(viewer: ViewerContext): Promise<BootstrapData> {
    const [users, projects] = await Promise.all([
      this.client.selectMany<DbUser>(
        USER_TABLE,
        'id,email,full_name,experience_level,mentor_capacity,mentor_sessions_used,happy_to_mentor,seeking_mentor,capability_tags'
      ),
      this.client.selectMany<DbProject>(
        PROJECT_TABLE,
        'id,title,description,status,hack_type,visibility,owner_id,workflow_transformed,ai_impact_hypothesis,ai_tools_used,time_saved_estimate,failures_and_lessons,source_type,synced_to_library_at,event_id,created_at'
      ),
    ]);

    const userNameById = new Map(users.map((user) => [user.id, user.full_name || user.email]));

    const hackRows = projects.filter((project) => project.source_type === 'hack_submission');
    const projectRows = projects.filter((project) => project.source_type !== 'hack_submission');

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
    };
  }

  async createHack(viewer: ViewerContext, input: CreateHackInput): Promise<CreateHackResult> {
    const user = await this.ensureUser(viewer);
    const inserted = await this.client.insert<DbProject>(PROJECT_TABLE, {
      title: input.title,
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
      title: inserted.title,
    };
  }

  async createProject(viewer: ViewerContext, input: CreateProjectInput): Promise<CreateProjectResult> {
    const user = await this.ensureUser(viewer);
    const inserted = await this.client.insert<DbProject>(PROJECT_TABLE, {
      title: input.title,
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
      title: inserted.title,
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
      const legacy = await this.client.selectOne<Omit<DbEvent, 'event_rules' | 'event_branding'>>(
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
      const legacy = await this.client.selectOne<Omit<DbEvent, 'event_rules' | 'event_branding'>>(
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
      const legacy = await this.client.selectOne<Omit<DbEvent, 'event_rules' | 'event_branding'>>(
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
      const legacy = await this.client.selectMany<Omit<DbEvent, 'event_rules' | 'event_branding'>>(
        EVENT_TABLE,
        EVENT_SELECT_CORE,
        [{ field: 'confluence_parent_page_id', op: 'eq', value: parentPageId }]
      );
      events = legacy.map((row) => withNullEventConfig(row));
    }

    return events
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((event) => ({
        id: event.id,
        eventName: event.name,
        icon: event.icon ?? '🚀',
        tagline: event.tagline,
        lifecycleStatus: event.lifecycle_status,
        confluencePageId: event.confluence_page_id,
        confluenceParentPageId: event.confluence_parent_page_id,
        hackingStartsAt: event.hacking_starts_at,
        submissionDeadlineAt: event.submission_deadline_at,
        rules: asEventRules(event.event_rules),
        branding: asEventBranding(event.event_branding),
      }));
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
      });
    } catch (error) {
      if (!hasMissingEventConfigColumns(error)) {
        throw error;
      }
      const legacy = await this.client.insert<Omit<DbEvent, 'event_rules' | 'event_branding'>>(
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
    const inserted = await this.client.insert<DbProject>(PROJECT_TABLE, {
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

    return this.client.selectMany<DbProject>(
      PROJECT_TABLE,
      'id,title,description,status,hack_type,visibility,owner_id,workflow_transformed,ai_impact_hypothesis,ai_tools_used,time_saved_estimate,failures_and_lessons,source_type,synced_to_library_at,event_id,created_at',
      filters
    );
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
