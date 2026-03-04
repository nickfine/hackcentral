import { SupabaseRepository } from './backend/supabase/repositories';
import { SupabaseRestClient } from './backend/supabase/client';
import {
  buildConfluencePageUrl,
  buildHackOutputPageStorageValue,
  buildHackPageStorageValue,
  createStandardChildPage,
  ensureHacksParentPageUnderParent,
  ensurePageFullWidthByDefault,
  findChildPageByTitleUnderParent,
  ensureSubmissionsParentPageUnderEventPage,
  inspectHackdayPageStyling,
  repairHackdayPageStyling,
  setPageStorageContent,
  stripInjectedChildPageIntroParagraph,
} from './backend/confluencePages';
import { HdcService } from './backend/hdcService';

interface WebTriggerRequest {
  method: string;
  body?: string;
}

interface DryRunPayload {
  action?:
    | 'dry_run'
    | 'seed_hack'
    | 'backfill_full_width'
    | 'resync_schedule_milestones'
    | 'strip_child_page_intro'
    | 'audit_hackday_page_styling'
    | 'repair_hackday_page_styling'
    | 'backfill_showcase_pages'
    | 'backfill_hackday_submission_pages';
  eventNameQuery?: string;
  eventId?: string;
  hackTitle?: string;
  hackDescription?: string;
  retryNoDelay?: boolean;
  dryRun?: boolean;
  cursor?: string;
  batchSize?: number;
  projectId?: string;
  sourceEventId?: string;
}

async function stripChildPageIntroForExistingHdcEvents(payload: DryRunPayload): Promise<{
  generatedAtUtc: string;
  eventNameQuery: string | null;
  eventId: string | null;
  candidateCount: number;
  processedCount: number;
  updatedCount: number;
  skippedCount: number;
  failureCount: number;
  results: Array<{
    eventId: string;
    eventName: string;
    confluencePageId: string | null;
    status: 'updated' | 'skipped' | 'failed' | 'not_found';
    reason?: string;
  }>;
}> {
  const repository = new SupabaseRepository();
  const explicitEventId = payload.eventId?.trim() || null;
  const fallbackEventNameQuery = payload.eventNameQuery?.trim() || 'Midsummer';
  const eventNameQuery = explicitEventId ? null : fallbackEventNameQuery;
  const candidates: Array<{ id: string; name: string; confluence_page_id: string | null }> = explicitEventId
    ? []
    : await repository.listMigrationEventCandidatesByName(fallbackEventNameQuery);

  const explicitEvent = explicitEventId ? await repository.getEventById(explicitEventId) : null;
  const allCandidates = explicitEvent
    ? [
        {
          id: explicitEvent.id,
          name: explicitEvent.name,
          confluence_page_id: explicitEvent.confluence_page_id,
        },
      ]
    : candidates;

  const results: Array<{
    eventId: string;
    eventName: string;
    confluencePageId: string | null;
    status: 'updated' | 'skipped' | 'failed' | 'not_found';
    reason?: string;
  }> = [];

  if (explicitEventId && !explicitEvent) {
    results.push({
      eventId: explicitEventId,
      eventName: '(unknown)',
      confluencePageId: null,
      status: 'not_found',
      reason: 'event_not_found',
    });
  }

  for (const event of allCandidates) {
    const confluencePageId =
      typeof event.confluence_page_id === 'string' && event.confluence_page_id.trim()
        ? event.confluence_page_id.trim()
        : null;

    if (!confluencePageId) {
      results.push({
        eventId: event.id,
        eventName: event.name,
        confluencePageId: null,
        status: 'skipped',
        reason: 'missing_confluence_page_id',
      });
      continue;
    }

    try {
      const outcome = await stripInjectedChildPageIntroParagraph(confluencePageId);
      results.push({
        eventId: event.id,
        eventName: event.name,
        confluencePageId,
        status: outcome.updated ? 'updated' : 'skipped',
        reason: outcome.updated ? undefined : outcome.reason,
      });
    } catch (error) {
      results.push({
        eventId: event.id,
        eventName: event.name,
        confluencePageId,
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    eventNameQuery,
    eventId: explicitEventId,
    candidateCount: allCandidates.length,
    processedCount: results.filter((r) => r.status !== 'not_found').length,
    updatedCount: results.filter((r) => r.status === 'updated').length,
    skippedCount: results.filter((r) => r.status === 'skipped').length,
    failureCount: results.filter((r) => r.status === 'failed').length,
    results,
  };
}

interface EventMigrationCheck {
  eventId: string;
  eventName: string;
  lifecycleStatus: string;
  confluencePageId: string | null;
  confluenceParentPageId: string | null;
  confluencePageUrl: string | null;
  creationRequestId: string | null;
  adminCount: number;
  primaryAdminCount: number;
  coAdminCount: number;
  syncStatePresent: boolean;
  syncStatus: string | null;
  submittedHackCount: number;
  totalProjectCount: number;
  auditLogCount: number;
  integrityChecks: {
    hasConfluencePageId: boolean;
    hasConfluenceParentPageId: boolean;
    hasPrimaryAdmin: boolean;
    hasSyncState: boolean;
  };
}

function parsePayload(body: string | undefined): DryRunPayload {
  if (!body || !body.trim()) return {};
  try {
    const parsed = JSON.parse(body) as DryRunPayload;
    return parsed ?? {};
  } catch {
    return {};
  }
}

const SHOWCASE_HACK_TABLE = 'ShowcaseHack';
const PROJECT_TABLE = 'Project';
const USER_TABLE = 'User';
const ARTIFACT_TABLE = 'Artifact';
const TEAM_TABLE = 'Team';
const EVENT_TABLE = 'Event';
const HACKDAY_SUBMISSION_PAGE_LINK_TABLE = 'HackdaySubmissionPageLink';

interface ShowcaseBackfillRow {
  project_id: string;
  featured: boolean | null;
  demo_url: string | null;
  confluence_page_id: string | null;
  confluence_page_url: string | null;
  output_page_ids: string[] | null;
  team_members: string[] | null;
  source_event_id: string | null;
  tags: string[] | null;
  linked_artifact_ids: string[] | null;
  context: string | null;
  limitations: string | null;
  risk_notes: string | null;
  source_repo_url: string | null;
  created_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ShowcaseProjectRow {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  hack_type?: 'prompt' | 'skill' | 'app' | null;
  hackType?: 'prompt' | 'skill' | 'app' | null;
  visibility?: 'private' | 'org' | 'public' | null;
  owner_id?: string | null;
  ownerId?: string | null;
  event_id?: string | null;
  eventId?: string | null;
  source_type?: string | null;
  sourceType?: string | null;
  submitted_at?: string | null;
  submittedAt?: string | null;
  team_id?: string | null;
  teamId?: string | null;
  video_url?: string | null;
  videoUrl?: string | null;
  repo_url?: string | null;
  repoUrl?: string | null;
  demo_url?: string | null;
  demoUrl?: string | null;
}

interface UserRow {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
}

interface ArtifactRow {
  id: string;
  title?: string | null;
  description?: string | null;
  source_url?: string | null;
  sourceUrl?: string | null;
  source_hack_project_id?: string | null;
  sourceHackProjectId?: string | null;
  archived_at?: string | null;
  archivedAt?: string | null;
}

interface RuntimeProjectRow {
  id: string;
  teamId?: string | null;
  team_id?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  video_url?: string | null;
  repoUrl?: string | null;
  repo_url?: string | null;
  demoUrl?: string | null;
  demo_url?: string | null;
  submittedAt?: string | null;
  submitted_at?: string | null;
}

interface RuntimeTeamRow {
  id: string;
  eventId?: string | null;
  event_id?: string | null;
  name?: string | null;
}

interface RuntimeEventRow {
  id: string;
  name?: string | null;
  confluence_page_id?: string | null;
  confluencePageId?: string | null;
}

interface SubmissionPageLinkRow {
  project_id: string;
  event_id: string | null;
  team_id: string | null;
  submission_page_id: string | null;
  submission_page_url: string | null;
  output_page_ids: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

function toBatchSize(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(Number(value))));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function withCursor<T extends { cursorValue: string }>(items: T[], cursor: string | undefined): T[] {
  const normalized = cursor?.trim();
  if (!normalized) return items;
  return items.filter((item) => item.cursorValue > normalized);
}

function normalizeStringArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isNonEmptyString).map((item) => item.trim());
}

function readStringField(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) return normalized;
    }
  }
  return null;
}

function normalizeShowcaseProjectRow(row: ShowcaseProjectRow): {
  id: string;
  title: string;
  description: string | null;
  hackType: 'prompt' | 'skill' | 'app' | null;
  visibility: 'private' | 'org' | 'public' | null;
  ownerId: string | null;
  eventId: string | null;
  sourceType: string | null;
} {
  const raw = row as unknown as Record<string, unknown>;
  const id = readStringField(raw, ['id']) || '';
  const submittedAt = readStringField(raw, ['submitted_at', 'submittedAt']);
  const sourceType = readStringField(raw, ['source_type', 'sourceType']);
  const normalizedSourceType = sourceType || (submittedAt ? 'hack_submission' : null);
  const visibility = readStringField(raw, ['visibility']);
  const hackType = readStringField(raw, ['hack_type', 'hackType']);
  const normalizedHackType = hackType === 'prompt' || hackType === 'skill' || hackType === 'app' ? hackType : null;
  const normalizedVisibility =
    visibility === 'private' || visibility === 'org' || visibility === 'public' ? visibility : null;

  return {
    id,
    title: readStringField(raw, ['title', 'name']) || `Hack ${id || 'unknown'}`,
    description: readStringField(raw, ['description']),
    hackType: normalizedHackType,
    visibility: normalizedVisibility,
    ownerId: readStringField(raw, ['owner_id', 'ownerId']),
    eventId: readStringField(raw, ['event_id', 'eventId']),
    sourceType: normalizedSourceType,
  };
}

function normalizeUserRow(row: UserRow): { id: string; fullName: string | null; email: string | null } {
  const raw = row as unknown as Record<string, unknown>;
  return {
    id: readStringField(raw, ['id']) || '',
    fullName: readStringField(raw, ['full_name', 'name']),
    email: readStringField(raw, ['email']),
  };
}

function normalizeArtifactRow(row: ArtifactRow): {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  sourceHackProjectId: string | null;
  archivedAt: string | null;
} {
  const raw = row as unknown as Record<string, unknown>;
  return {
    id: readStringField(raw, ['id']) || '',
    title: readStringField(raw, ['title']) || 'Untitled Artifact',
    description: readStringField(raw, ['description']) || '',
    sourceUrl: readStringField(raw, ['source_url', 'sourceUrl']) || '',
    sourceHackProjectId: readStringField(raw, ['source_hack_project_id', 'sourceHackProjectId']),
    archivedAt: readStringField(raw, ['archived_at', 'archivedAt']),
  };
}

function normalizeRuntimeProjectRow(row: RuntimeProjectRow): {
  id: string;
  teamId: string | null;
  name: string | null;
  description: string | null;
  videoUrl: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  submittedAt: string | null;
} {
  const raw = row as unknown as Record<string, unknown>;
  return {
    id: readStringField(raw, ['id']) || '',
    teamId: readStringField(raw, ['teamId', 'team_id']),
    name: readStringField(raw, ['name', 'title']),
    description: readStringField(raw, ['description']),
    videoUrl: readStringField(raw, ['videoUrl', 'video_url']),
    repoUrl: readStringField(raw, ['repoUrl', 'repo_url']),
    demoUrl: readStringField(raw, ['demoUrl', 'demo_url']),
    submittedAt: readStringField(raw, ['submittedAt', 'submitted_at']),
  };
}

function normalizeRuntimeTeamRow(row: RuntimeTeamRow): { id: string; eventId: string | null; name: string | null } {
  const raw = row as unknown as Record<string, unknown>;
  return {
    id: readStringField(raw, ['id']) || '',
    eventId: readStringField(raw, ['eventId', 'event_id']),
    name: readStringField(raw, ['name']),
  };
}

function normalizeRuntimeEventRow(row: RuntimeEventRow): {
  id: string;
  name: string;
  confluencePageId: string | null;
} {
  const raw = row as unknown as Record<string, unknown>;
  return {
    id: readStringField(raw, ['id']) || '',
    name: readStringField(raw, ['name']) || '',
    confluencePageId: readStringField(raw, ['confluence_page_id', 'confluencePageId']),
  };
}

function isDuplicateConfluenceTitleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('A page with this title already exists');
}

function buildSubmissionPageStorageValue(input: {
  projectName: string;
  teamName: string;
  description: string;
  demoVideoUrl: string | null;
  repoUrl: string | null;
  liveDemoUrl: string | null;
  outputLinks: Array<{ title: string; url: string }>;
}): string {
  const lines: string[] = [];
  lines.push('<h1>HackDay Submission</h1>');
  lines.push(`<p><strong>Project:</strong> ${input.projectName}</p>`);
  lines.push(`<p><strong>Team:</strong> ${input.teamName}</p>`);
  lines.push(`<p>${input.description || 'No description provided.'}</p>`);
  lines.push('<h2>Delivery Links</h2>');
  lines.push(`<p><strong>Demo video:</strong> ${input.demoVideoUrl || 'Not provided'}</p>`);
  lines.push(`<p><strong>Repository:</strong> ${input.repoUrl || 'Not provided'}</p>`);
  lines.push(`<p><strong>Live demo:</strong> ${input.liveDemoUrl || 'Not provided'}</p>`);
  lines.push('<h2>Output Pages</h2>');
  if (input.outputLinks.length === 0) {
    lines.push('<p>No output pages generated yet.</p>');
  } else {
    lines.push(
      `<ul>${input.outputLinks
        .map((link) => `<li><a href="${link.url}">${link.title}</a></li>`)
        .join('')}</ul>`
    );
  }
  return lines.join('');
}

async function listHackdayStylingCandidates(payload: DryRunPayload): Promise<
  Array<{
    eventId: string;
    eventName: string;
    pageId: string;
    cursorValue: string;
  }>
> {
  const repository = new SupabaseRepository();
  const explicitEventId = payload.eventId?.trim();
  const batchSize = toBatchSize(payload.batchSize, 50, 200);
  const eventNameQuery = payload.eventNameQuery?.trim().toLowerCase();

  const registry = await repository.listAllEvents();
  const candidates = registry
    .filter((event) => event.runtimeType === 'hackday_template')
    .filter((event) => (explicitEventId ? event.id === explicitEventId : true))
    .filter((event) => (eventNameQuery ? event.eventName.toLowerCase().includes(eventNameQuery) : true))
    .filter((event) => isNonEmptyString(event.confluencePageId))
    .map((event) => ({
      eventId: event.id,
      eventName: event.eventName,
      pageId: String(event.confluencePageId),
      cursorValue: event.id,
    }))
    .sort((a, b) => a.cursorValue.localeCompare(b.cursorValue));

  return withCursor(candidates, payload.cursor).slice(0, batchSize);
}

async function auditHackdayPageStyling(payload: DryRunPayload): Promise<{
  generatedAtUtc: string;
  eventId: string | null;
  eventNameQuery: string | null;
  batchSize: number;
  cursorIn: string | null;
  cursorOut: string | null;
  processedCount: number;
  runtimeMacroCount: number;
  legacyMacroCount: number;
  missingMacroCount: number;
  repairRecommendedCount: number;
  highRiskCount: number;
  results: Array<{
    eventId: string;
    eventName: string;
    pageId: string;
    reachable: boolean;
    macroSignature: 'runtime' | 'legacy' | 'missing';
    fullWidth: { draft: string | null; published: string | null };
    hasLeadingParagraphBeforeMacro: boolean;
    recommendedAction: string;
    riskLevel: 'low' | 'medium' | 'high';
    reason?: string;
  }>;
}> {
  const batchSize = toBatchSize(payload.batchSize, 50, 200);
  const candidates = await listHackdayStylingCandidates(payload);
  const results: Array<{
    eventId: string;
    eventName: string;
    pageId: string;
    reachable: boolean;
    macroSignature: 'runtime' | 'legacy' | 'missing';
    fullWidth: { draft: string | null; published: string | null };
    hasLeadingParagraphBeforeMacro: boolean;
    recommendedAction: string;
    riskLevel: 'low' | 'medium' | 'high';
    reason?: string;
  }> = [];

  for (const candidate of candidates) {
    const inspection = await inspectHackdayPageStyling(candidate.pageId);
    results.push({
      eventId: candidate.eventId,
      eventName: candidate.eventName,
      pageId: candidate.pageId,
      reachable: inspection.reachable,
      macroSignature: inspection.macroSignature,
      fullWidth: {
        draft: inspection.fullWidthDraftValue,
        published: inspection.fullWidthPublishedValue,
      },
      hasLeadingParagraphBeforeMacro: inspection.hasLeadingParagraphBeforeMacro,
      recommendedAction: inspection.recommendedAction,
      riskLevel: inspection.riskLevel,
      reason: inspection.reason,
    });
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    eventId: payload.eventId?.trim() || null,
    eventNameQuery: payload.eventNameQuery?.trim() || null,
    batchSize,
    cursorIn: payload.cursor?.trim() || null,
    cursorOut: candidates.length > 0 ? candidates[candidates.length - 1].cursorValue : null,
    processedCount: results.length,
    runtimeMacroCount: results.filter((result) => result.macroSignature === 'runtime').length,
    legacyMacroCount: results.filter((result) => result.macroSignature === 'legacy').length,
    missingMacroCount: results.filter((result) => result.macroSignature === 'missing').length,
    repairRecommendedCount: results.filter((result) => result.recommendedAction !== 'none').length,
    highRiskCount: results.filter((result) => result.riskLevel === 'high').length,
    results,
  };
}

async function repairHackdayPageStylingBatch(payload: DryRunPayload): Promise<{
  generatedAtUtc: string;
  dryRun: boolean;
  eventId: string | null;
  eventNameQuery: string | null;
  batchSize: number;
  cursorIn: string | null;
  cursorOut: string | null;
  processedCount: number;
  changedCount: number;
  failedCount: number;
  rollbackManifest: Array<{
    eventId: string;
    pageId: string;
    changed: boolean;
    macroRewritten: boolean;
    introParagraphRemoved: boolean;
    fullWidthUpdated: boolean;
  }>;
  results: Array<{
    eventId: string;
    eventName: string;
    pageId: string;
    status: 'updated' | 'noop' | 'failed';
    reason?: string;
    changed?: boolean;
    macroRewritten?: boolean;
    introParagraphRemoved?: boolean;
    fullWidthUpdated?: boolean;
  }>;
}> {
  const dryRun = payload.dryRun !== false;
  const batchSize = toBatchSize(payload.batchSize, 50, 200);
  const candidates = await listHackdayStylingCandidates(payload);
  const results: Array<{
    eventId: string;
    eventName: string;
    pageId: string;
    status: 'updated' | 'noop' | 'failed';
    reason?: string;
    changed?: boolean;
    macroRewritten?: boolean;
    introParagraphRemoved?: boolean;
    fullWidthUpdated?: boolean;
  }> = [];
  const rollbackManifest: Array<{
    eventId: string;
    pageId: string;
    changed: boolean;
    macroRewritten: boolean;
    introParagraphRemoved: boolean;
    fullWidthUpdated: boolean;
  }> = [];

  for (const candidate of candidates) {
    try {
      const repaired = await repairHackdayPageStyling(candidate.pageId, { dryRun });
      const status: 'updated' | 'noop' = repaired.changed ? 'updated' : 'noop';
      results.push({
        eventId: candidate.eventId,
        eventName: candidate.eventName,
        pageId: candidate.pageId,
        status,
        reason: repaired.reason,
        changed: repaired.changed,
        macroRewritten: repaired.macroRewritten,
        introParagraphRemoved: repaired.introParagraphRemoved,
        fullWidthUpdated: repaired.fullWidthUpdated,
      });
      rollbackManifest.push({
        eventId: candidate.eventId,
        pageId: candidate.pageId,
        changed: repaired.changed,
        macroRewritten: repaired.macroRewritten,
        introParagraphRemoved: repaired.introParagraphRemoved,
        fullWidthUpdated: repaired.fullWidthUpdated,
      });
    } catch (error) {
      results.push({
        eventId: candidate.eventId,
        eventName: candidate.eventName,
        pageId: candidate.pageId,
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    dryRun,
    eventId: payload.eventId?.trim() || null,
    eventNameQuery: payload.eventNameQuery?.trim() || null,
    batchSize,
    cursorIn: payload.cursor?.trim() || null,
    cursorOut: candidates.length > 0 ? candidates[candidates.length - 1].cursorValue : null,
    processedCount: results.length,
    changedCount: results.filter((result) => result.status === 'updated').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    rollbackManifest,
    results,
  };
}

async function backfillShowcasePages(payload: DryRunPayload): Promise<{
  generatedAtUtc: string;
  dryRun: boolean;
  sourceEventId: string | null;
  batchSize: number;
  cursorIn: string | null;
  cursorOut: string | null;
  processedCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  stoppedOnError: boolean;
  coverage: {
    total: number;
    pageBacked: number;
    legacyCount: number;
  };
  rollbackManifest: Array<{
    projectId: string;
    createdPageIds: string[];
  }>;
  results: Array<{
    projectId: string;
    status: 'created' | 'skipped' | 'failed';
    reason?: string;
    confluencePageId?: string;
    outputPageIds?: string[];
    createdPageIds?: string[];
  }>;
}> {
  const dryRun = payload.dryRun !== false;
  const sourceEventId = payload.sourceEventId?.trim() || null;
  const cursor = payload.cursor?.trim() || '';
  const batchSize = toBatchSize(payload.batchSize, 20, 200);
  const client = new SupabaseRestClient();
  const hdcParentPageId = process.env.CONFLUENCE_HDC_PARENT_PAGE_ID?.trim() || '';
  if (!hdcParentPageId) {
    throw new Error('CONFLUENCE_HDC_PARENT_PAGE_ID must be configured before backfill_showcase_pages.');
  }

  const [showcaseRows, projects, users, artifacts] = await Promise.all([
    client.selectMany<ShowcaseBackfillRow>(
      SHOWCASE_HACK_TABLE,
      'project_id,featured,demo_url,confluence_page_id,confluence_page_url,output_page_ids,team_members,source_event_id,tags,linked_artifact_ids,context,limitations,risk_notes,source_repo_url,created_by_user_id,created_at,updated_at'
    ),
    client.selectMany<ShowcaseProjectRow>(PROJECT_TABLE, '*'),
    client.selectMany<UserRow>(USER_TABLE, '*'),
    client.selectMany<ArtifactRow>(ARTIFACT_TABLE, '*'),
  ]);

  const normalizedProjects = projects.map(normalizeShowcaseProjectRow).filter((project) => isNonEmptyString(project.id));
  const normalizedUsers = users.map(normalizeUserRow).filter((user) => isNonEmptyString(user.id));
  const normalizedArtifacts = artifacts.map(normalizeArtifactRow).filter((artifact) => isNonEmptyString(artifact.id));

  const projectById = new Map(normalizedProjects.map((project) => [project.id, project]));
  const userById = new Map(normalizedUsers.map((user) => [user.id, user]));
  const artifactsByProjectId = new Map<string, ReturnType<typeof normalizeArtifactRow>[]>();
  for (const artifact of normalizedArtifacts) {
    if (artifact.archivedAt) continue;
    if (!isNonEmptyString(artifact.sourceHackProjectId)) continue;
    const projectArtifacts = artifactsByProjectId.get(artifact.sourceHackProjectId) || [];
    projectArtifacts.push(artifact);
    artifactsByProjectId.set(artifact.sourceHackProjectId, projectArtifacts);
  }

  const candidates = showcaseRows
    .filter((row) => !isNonEmptyString(row.confluence_page_id))
    .filter((row) => (sourceEventId ? row.source_event_id === sourceEventId : true))
    .map((row) => ({
      row,
      cursorValue: row.project_id,
    }))
    .sort((a, b) => a.cursorValue.localeCompare(b.cursorValue));
  const batch = withCursor(candidates, cursor).slice(0, batchSize);

  const results: Array<{
    projectId: string;
    status: 'created' | 'skipped' | 'failed';
    reason?: string;
    confluencePageId?: string;
    outputPageIds?: string[];
    createdPageIds?: string[];
  }> = [];
  const rollbackManifest: Array<{
    projectId: string;
    createdPageIds: string[];
  }> = [];
  let stoppedOnError = false;

  for (const candidate of batch) {
    const showcase = candidate.row;
    const project = projectById.get(showcase.project_id);
    if (!project) {
      results.push({
        projectId: showcase.project_id,
        status: 'skipped',
        reason: 'project_not_found',
      });
      continue;
    }
    if (project.sourceType && project.sourceType !== 'hack_submission') {
      results.push({
        projectId: showcase.project_id,
        status: 'skipped',
        reason: 'not_hack_submission',
      });
      continue;
    }

    const author = project.ownerId ? userById.get(project.ownerId) : null;
    const authorName = author?.fullName || author?.email || 'Unknown';
    const title = project.title || `Hack ${project.id}`;
    const tags = normalizeStringArray(showcase.tags);
    const teamMembers = normalizeStringArray(showcase.team_members);
    const createdPageIds: string[] = [];

    try {
      const projectArtifacts = artifactsByProjectId.get(project.id) || [];
      const outputPagesPlan = projectArtifacts.map((artifact) => ({
        outputTitle: `${artifact.title} · Linked Artifact`,
        sourceReference: `Artifact ID: ${artifact.id}`,
        content: artifact.description || `Artifact source URL: ${artifact.sourceUrl}`,
      }));

      const hacksParent = dryRun
        ? { pageId: 'dry-run-parent', pageUrl: '' }
        : await ensureHacksParentPageUnderParent({
            parentPageId: hdcParentPageId,
            nonBlockingFullWidth: true,
          });

      const backLinkUrl =
        process.env.CONFLUENCE_HDC_PARENT_PAGE_URL?.trim() || buildConfluencePageUrl(null, hdcParentPageId);

      const hackPage = dryRun
        ? { pageId: `dry-run-${project.id}`, pageUrl: '' }
        : await createStandardChildPage({
            parentPageId: hacksParent.pageId,
            title,
            storageValue: buildHackPageStorageValue({
              title,
              description: project.description || '',
              assetType: project.hackType ?? 'app',
              visibility: project.visibility ?? 'org',
              authorName,
              tags,
              sourceEventId: showcase.source_event_id || project.eventId || undefined,
              demoUrl: showcase.demo_url || undefined,
              teamMembers,
              outputLinks: [],
              backLinkUrl,
            }),
            nonBlockingFullWidth: true,
          });
      if (!dryRun) createdPageIds.push(hackPage.pageId);

      const outputPageIds: string[] = [];
      const outputLinks: Array<{ title: string; url: string }> = [];
      for (const outputPlan of outputPagesPlan) {
        const outputPage = dryRun
          ? { pageId: `dry-run-output-${project.id}-${outputPageIds.length + 1}`, pageUrl: '' }
          : await createStandardChildPage({
              parentPageId: hackPage.pageId,
              title: outputPlan.outputTitle,
              storageValue: buildHackOutputPageStorageValue(outputPlan),
              nonBlockingFullWidth: true,
            });
        if (!dryRun) createdPageIds.push(outputPage.pageId);
        outputPageIds.push(outputPage.pageId);
        outputLinks.push({
          title: outputPlan.outputTitle,
          url: outputPage.pageUrl || buildConfluencePageUrl(null, outputPage.pageId),
        });
      }

      if (!dryRun) {
        await setPageStorageContent(
          hackPage.pageId,
          buildHackPageStorageValue({
            title,
            description: project.description || '',
            assetType: project.hackType ?? 'app',
            visibility: project.visibility ?? 'org',
            authorName,
            tags,
            sourceEventId: showcase.source_event_id || project.eventId || undefined,
            demoUrl: showcase.demo_url || undefined,
            teamMembers,
            outputLinks,
            backLinkUrl,
          })
        );

        await client.upsert<ShowcaseBackfillRow>(
          SHOWCASE_HACK_TABLE,
          {
            project_id: project.id,
            featured: showcase.featured ?? false,
            demo_url: showcase.demo_url,
            confluence_page_id: hackPage.pageId,
            confluence_page_url: hackPage.pageUrl || null,
            output_page_ids: outputPageIds,
            team_members: teamMembers,
            source_event_id: showcase.source_event_id || project.eventId || null,
            tags,
            linked_artifact_ids: normalizeStringArray(showcase.linked_artifact_ids),
            context: showcase.context,
            limitations: showcase.limitations,
            risk_notes: showcase.risk_notes,
            source_repo_url: showcase.source_repo_url,
            created_by_user_id: showcase.created_by_user_id || project.ownerId || null,
          },
          'project_id'
        );
      }

      rollbackManifest.push({ projectId: project.id, createdPageIds });
      results.push({
        projectId: project.id,
        status: 'created',
        confluencePageId: hackPage.pageId,
        outputPageIds,
        createdPageIds,
      });
    } catch (error) {
      results.push({
        projectId: project.id,
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
      stoppedOnError = true;
      break;
    }
  }

  const finalShowcaseRows = dryRun
    ? showcaseRows
    : await client.selectMany<ShowcaseBackfillRow>(SHOWCASE_HACK_TABLE, 'project_id,confluence_page_id');
  const total = finalShowcaseRows.length;
  const pageBacked = finalShowcaseRows.filter((row) => isNonEmptyString(row.confluence_page_id)).length;
  const legacyCount = Math.max(0, total - pageBacked);

  return {
    generatedAtUtc: new Date().toISOString(),
    dryRun,
    sourceEventId,
    batchSize,
    cursorIn: cursor || null,
    cursorOut: batch.length > 0 ? batch[batch.length - 1].cursorValue : null,
    processedCount: results.length,
    createdCount: results.filter((result) => result.status === 'created').length,
    skippedCount: results.filter((result) => result.status === 'skipped').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    stoppedOnError,
    coverage: {
      total,
      pageBacked,
      legacyCount,
    },
    rollbackManifest,
    results,
  };
}

async function backfillHackdaySubmissionPages(payload: DryRunPayload): Promise<{
  generatedAtUtc: string;
  dryRun: boolean;
  eventId: string | null;
  batchSize: number;
  cursorIn: string | null;
  cursorOut: string | null;
  processedCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  stoppedOnError: boolean;
  rollbackManifest: Array<{ projectId: string; createdPageIds: string[] }>;
  results: Array<{
    projectId: string;
    eventId: string | null;
    teamId: string | null;
    status: 'created' | 'skipped' | 'failed';
    reason?: string;
    submissionPageId?: string;
    outputPageIds?: string[];
    createdPageIds?: string[];
  }>;
}> {
  const dryRun = payload.dryRun !== false;
  const eventIdFilter = payload.eventId?.trim() || null;
  const cursor = payload.cursor?.trim() || '';
  const batchSize = toBatchSize(payload.batchSize, 20, 200);
  const client = new SupabaseRestClient();

  const [projects, teams, events, existingLinks] = await Promise.all([
    client.selectMany<RuntimeProjectRow>(PROJECT_TABLE, '*'),
    client.selectMany<RuntimeTeamRow>(TEAM_TABLE, '*'),
    client.selectMany<RuntimeEventRow>(EVENT_TABLE, '*'),
    client
      .selectMany<SubmissionPageLinkRow>(
        HACKDAY_SUBMISSION_PAGE_LINK_TABLE,
        'project_id,event_id,team_id,submission_page_id,submission_page_url,output_page_ids,created_at,updated_at'
      )
      .catch(() => []),
  ]);

  const normalizedProjects = projects
    .map(normalizeRuntimeProjectRow)
    .filter((project) => isNonEmptyString(project.id));
  const normalizedTeams = teams.map(normalizeRuntimeTeamRow).filter((team) => isNonEmptyString(team.id));
  const normalizedEvents = events
    .map(normalizeRuntimeEventRow)
    .filter((event) => isNonEmptyString(event.id));

  const linkByProjectId = new Map(existingLinks.map((link) => [link.project_id, link]));
  const teamById = new Map(normalizedTeams.map((team) => [team.id, team]));
  const eventById = new Map(normalizedEvents.map((event) => [event.id, event]));

  const candidates = normalizedProjects
    .filter((project) => isNonEmptyString(project.submittedAt))
    .map((project) => {
      const team = project.teamId ? teamById.get(project.teamId) : null;
      return {
        project,
        team: team ?? null,
        event: team?.eventId ? eventById.get(team.eventId) ?? null : null,
        cursorValue: project.id,
      };
    })
    .filter((candidate) => (eventIdFilter ? candidate.team?.eventId === eventIdFilter : true))
    .sort((a, b) => a.cursorValue.localeCompare(b.cursorValue));

  const batch = withCursor(candidates, cursor).slice(0, batchSize);
  const results: Array<{
    projectId: string;
    eventId: string | null;
    teamId: string | null;
    status: 'created' | 'skipped' | 'failed';
    reason?: string;
    submissionPageId?: string;
    outputPageIds?: string[];
    createdPageIds?: string[];
  }> = [];
  const rollbackManifest: Array<{ projectId: string; createdPageIds: string[] }> = [];
  let stoppedOnError = false;

  for (const candidate of batch) {
    const existingLink = linkByProjectId.get(candidate.project.id);
    if (existingLink?.submission_page_id) {
      results.push({
        projectId: candidate.project.id,
        eventId: candidate.team?.eventId || null,
        teamId: candidate.team?.id || null,
        status: 'skipped',
        reason: 'already_page_backed',
      });
      continue;
    }
    if (!candidate.team?.eventId) {
      results.push({
        projectId: candidate.project.id,
        eventId: null,
        teamId: candidate.team?.id || null,
        status: 'skipped',
        reason: 'team_or_event_missing',
      });
      continue;
    }
    const eventPageId = candidate.event?.confluencePageId;
    if (!isNonEmptyString(eventPageId)) {
      results.push({
        projectId: candidate.project.id,
        eventId: candidate.team.eventId,
        teamId: candidate.team.id,
        status: 'skipped',
        reason: 'event_confluence_page_missing',
      });
      continue;
    }

    const createdPageIds: string[] = [];
    const projectName = candidate.project.name?.trim() || `Submission ${candidate.project.id}`;
    const teamName = candidate.team.name?.trim() || `Team ${candidate.team.id}`;
    try {
      const submissionsParent = dryRun
        ? { pageId: 'dry-run-submissions-parent', pageUrl: '' }
        : await ensureSubmissionsParentPageUnderEventPage({
            eventPageId: eventPageId,
            nonBlockingFullWidth: true,
          });

      const submissionPageTitle = `${teamName} · ${projectName}`;
      let submissionPage = { pageId: `dry-run-submission-${candidate.project.id}`, pageUrl: '' };
      if (!dryRun) {
        let createdSubmissionPage = false;
        try {
          submissionPage = await createStandardChildPage({
            parentPageId: submissionsParent.pageId,
            title: submissionPageTitle,
            storageValue: buildSubmissionPageStorageValue({
              projectName,
              teamName,
              description: candidate.project.description?.trim() || '',
              demoVideoUrl: candidate.project.videoUrl,
              repoUrl: candidate.project.repoUrl,
              liveDemoUrl: candidate.project.demoUrl,
              outputLinks: [],
            }),
            nonBlockingFullWidth: true,
          });
          createdSubmissionPage = true;
        } catch (error) {
          const existingSubmissionPage = await findChildPageByTitleUnderParent({
            parentPageId: submissionsParent.pageId,
            title: submissionPageTitle,
          });
          if (existingSubmissionPage) {
            submissionPage = existingSubmissionPage;
          } else if (isDuplicateConfluenceTitleError(error)) {
            const dedupeSuffix = `${candidate.project.id}-${Date.now().toString().slice(-6)}`;
            submissionPage = await createStandardChildPage({
              parentPageId: submissionsParent.pageId,
              title: `${submissionPageTitle} (${dedupeSuffix})`,
              storageValue: buildSubmissionPageStorageValue({
                projectName,
                teamName,
                description: candidate.project.description?.trim() || '',
                demoVideoUrl: candidate.project.videoUrl,
                repoUrl: candidate.project.repoUrl,
                liveDemoUrl: candidate.project.demoUrl,
                outputLinks: [],
              }),
              nonBlockingFullWidth: true,
            });
            createdSubmissionPage = true;
          } else {
            throw error;
          }
        }
        if (createdSubmissionPage) createdPageIds.push(submissionPage.pageId);
      }

      const outputPlans = [
        {
          key: 'demoVideo',
          title: `${projectName} · Demo Video`,
          sourceReference: 'Submission demoVideoUrl',
          content: candidate.project.videoUrl || null,
        },
        {
          key: 'repo',
          title: `${projectName} · Repository`,
          sourceReference: 'Submission repoUrl',
          content: candidate.project.repoUrl || null,
        },
        {
          key: 'liveDemo',
          title: `${projectName} · Live Demo`,
          sourceReference: 'Submission liveDemoUrl',
          content: candidate.project.demoUrl || null,
        },
      ].filter((plan) => isNonEmptyString(plan.content));

      const outputPageIds: string[] = [];
      const outputLinks: Array<{ title: string; url: string }> = [];
      for (const output of outputPlans) {
        let outputPage = { pageId: `dry-run-submission-output-${candidate.project.id}-${outputPageIds.length + 1}`, pageUrl: '' };
        if (!dryRun) {
          let createdOutputPage = false;
          try {
            outputPage = await createStandardChildPage({
              parentPageId: submissionPage.pageId,
              title: output.title,
              storageValue: buildHackOutputPageStorageValue({
                outputTitle: output.title,
                sourceReference: output.sourceReference,
                content: output.content,
              }),
              nonBlockingFullWidth: true,
            });
            createdOutputPage = true;
          } catch (error) {
            const existingOutputPage = await findChildPageByTitleUnderParent({
              parentPageId: submissionPage.pageId,
              title: output.title,
            });
            if (existingOutputPage) {
              outputPage = existingOutputPage;
            } else if (isDuplicateConfluenceTitleError(error)) {
              outputPage = await createStandardChildPage({
                parentPageId: submissionPage.pageId,
                title: `${output.title} (${candidate.project.id}-${output.key})`,
                storageValue: buildHackOutputPageStorageValue({
                  outputTitle: output.title,
                  sourceReference: output.sourceReference,
                  content: output.content,
                }),
                nonBlockingFullWidth: true,
              });
              createdOutputPage = true;
            } else {
              throw error;
            }
          }
          if (createdOutputPage) createdPageIds.push(outputPage.pageId);
        }
        outputPageIds.push(outputPage.pageId);
        outputLinks.push({
          title: output.title,
          url: outputPage.pageUrl || buildConfluencePageUrl(null, outputPage.pageId),
        });
      }

      if (!dryRun) {
        await setPageStorageContent(
          submissionPage.pageId,
          buildSubmissionPageStorageValue({
            projectName,
            teamName,
            description: candidate.project.description?.trim() || '',
            demoVideoUrl: candidate.project.videoUrl,
            repoUrl: candidate.project.repoUrl,
            liveDemoUrl: candidate.project.demoUrl,
            outputLinks,
          })
        );

        await client.upsert<SubmissionPageLinkRow>(
          HACKDAY_SUBMISSION_PAGE_LINK_TABLE,
          {
            project_id: candidate.project.id,
            event_id: candidate.team.eventId,
            team_id: candidate.team.id,
            submission_page_id: submissionPage.pageId,
            submission_page_url: submissionPage.pageUrl || null,
            output_page_ids: outputPageIds,
          },
          'project_id'
        );
      }

      rollbackManifest.push({
        projectId: candidate.project.id,
        createdPageIds,
      });
      results.push({
        projectId: candidate.project.id,
        eventId: candidate.team.eventId,
        teamId: candidate.team.id,
        status: 'created',
        submissionPageId: submissionPage.pageId,
        outputPageIds,
        createdPageIds,
      });
    } catch (error) {
      results.push({
        projectId: candidate.project.id,
        eventId: candidate.team.eventId,
        teamId: candidate.team.id,
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
      stoppedOnError = true;
      break;
    }
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    dryRun,
    eventId: eventIdFilter,
    batchSize,
    cursorIn: cursor || null,
    cursorOut: batch.length > 0 ? batch[batch.length - 1].cursorValue : null,
    processedCount: results.length,
    createdCount: results.filter((result) => result.status === 'created').length,
    skippedCount: results.filter((result) => result.status === 'skipped').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    stoppedOnError,
    rollbackManifest,
    results,
  };
}

async function buildMigrationDryRunReport(eventNameQuery: string): Promise<{
  generatedAtUtc: string;
  eventNameQuery: string;
  eventCount: number;
  summary: {
    eventsWithMissingPageId: number;
    eventsWithMissingParentPageId: number;
    eventsWithNoPrimaryAdmin: number;
    eventsWithNoSyncState: number;
    eventsWithNoSubmittedHacks: number;
    totalSubmittedHacks: number;
    totalProjects: number;
    totalAuditLogRows: number;
  };
  events: EventMigrationCheck[];
  rollbackChecklist: string[];
}> {
  const repository = new SupabaseRepository();
  const candidates = await repository.listMigrationEventCandidatesByName(eventNameQuery);

  const events: EventMigrationCheck[] = [];
  for (const event of candidates) {
    const [admins, syncState, submittedHacks, allProjects, auditLogCount] = await Promise.all([
      repository.listEventAdmins(event.id),
      repository.getSyncState(event.id),
      repository.listEventHackProjects(event.id),
      repository.listProjectsByEventId(event.id),
      repository.countEventAuditLogs(event.id),
    ]);
    const primaryAdminCount = admins.filter((admin) => admin.role === 'primary').length;
    const coAdminCount = admins.filter((admin) => admin.role === 'co_admin').length;
    const confluencePageId =
      typeof event.confluence_page_id === 'string' && event.confluence_page_id.trim()
        ? event.confluence_page_id.trim()
        : null;
    const confluenceParentPageId =
      typeof event.confluence_parent_page_id === 'string' && event.confluence_parent_page_id.trim()
        ? event.confluence_parent_page_id.trim()
        : null;

    events.push({
      eventId: event.id,
      eventName: event.name,
      lifecycleStatus: event.lifecycle_status,
      confluencePageId,
      confluenceParentPageId,
      confluencePageUrl: event.confluence_page_url,
      creationRequestId: event.creation_request_id,
      adminCount: admins.length,
      primaryAdminCount,
      coAdminCount,
      syncStatePresent: Boolean(syncState),
      syncStatus: syncState?.syncStatus ?? null,
      submittedHackCount: submittedHacks.length,
      totalProjectCount: allProjects.length,
      auditLogCount,
      integrityChecks: {
        hasConfluencePageId: Boolean(confluencePageId),
        hasConfluenceParentPageId: Boolean(confluenceParentPageId),
        hasPrimaryAdmin: primaryAdminCount > 0,
        hasSyncState: Boolean(syncState),
      },
    });
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    eventNameQuery,
    eventCount: events.length,
    summary: {
      eventsWithMissingPageId: events.filter((event) => !event.integrityChecks.hasConfluencePageId).length,
      eventsWithMissingParentPageId: events.filter((event) => !event.integrityChecks.hasConfluenceParentPageId).length,
      eventsWithNoPrimaryAdmin: events.filter((event) => !event.integrityChecks.hasPrimaryAdmin).length,
      eventsWithNoSyncState: events.filter((event) => !event.integrityChecks.hasSyncState).length,
      eventsWithNoSubmittedHacks: events.filter((event) => event.submittedHackCount === 0).length,
      totalSubmittedHacks: events.reduce((sum, event) => sum + event.submittedHackCount, 0),
      totalProjects: events.reduce((sum, event) => sum + event.totalProjectCount, 0),
      totalAuditLogRows: events.reduce((sum, event) => sum + event.auditLogCount, 0),
    },
    events,
    rollbackChecklist: [
      'Snapshot Event/EventAdmin/EventSyncState/EventAuditLog rows for affected event IDs before migration apply.',
      'If migration validation fails, restore event rows first, then EventAdmin, then EventSyncState, then EventAuditLog.',
      'Re-run this dry-run and verify zero regressions in page IDs, admin assignment, and sync state presence.',
      'Confirm Confluence child pages remain reachable for all restored confluencePageId values.',
    ],
  };
}

async function seedHackForEvent(payload: DryRunPayload): Promise<{
  seeded: boolean;
  eventId: string;
  actorUserId: string;
  projectId: string;
  title: string;
  skipped?: boolean;
}> {
  const eventId = payload.eventId?.trim();
  if (!eventId) {
    throw new Error('eventId is required for seed_hack action.');
  }
  const title =
    payload.hackTitle?.trim() || `phase5-seed-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const repository = new SupabaseRepository();
  const event = await repository.getEventById(eventId);
  if (!event) {
    throw new Error(`Event ${eventId} not found.`);
  }
  if (event.lifecycle_status === 'completed' || event.lifecycle_status === 'archived') {
    throw new Error('Seed hack blocked: target instance is read-only.');
  }

  const admins = await repository.listEventAdmins(eventId);
  const primaryAdmin = admins.find((admin) => admin.role === 'primary');
  const actorUserId = primaryAdmin?.user_id || admins[0]?.user_id;
  if (!actorUserId) {
    throw new Error('Seed hack blocked: target event has no admins.');
  }

  const existingHacks = await repository.listEventHackProjects(eventId);
  const normalizedTitle = title.trim().toLowerCase();
  const existing = existingHacks.find((hack) => hack.title.trim().toLowerCase() === normalizedTitle);
  if (existing) {
    return {
      seeded: false,
      skipped: true,
      eventId,
      actorUserId,
      projectId: existing.id,
      title,
    };
  }

  // Keep retry budget comfortably under Forge function timeout.
  const retryBackoffMs = [1500, 3000, 6000];
  let result: { projectId: string } | null = null;
  let lastRateLimitError: unknown = null;
  for (let attempt = 1; attempt <= retryBackoffMs.length + 1; attempt += 1) {
    try {
      result = await repository.seedHackForEventAsUser({
        eventId,
        userId: actorUserId,
        title,
        description: payload.hackDescription?.trim() || 'Phase 5 migration readiness seed submission.',
      });
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const isRateLimited = message.includes('(429)') || message.includes('too many requests');
      if (!isRateLimited) {
        throw error;
      }
      lastRateLimitError = error;
      if (attempt > retryBackoffMs.length) {
        break;
      }
      const waitMs = payload.retryNoDelay ? 0 : retryBackoffMs[attempt - 1];
      console.warn(
        '[hdc-migration-ops]',
        JSON.stringify({ action: 'seed_hack', eventId, attempt, outcome: 'rate_limited_retry', waitMs })
      );
      if (waitMs > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, waitMs);
        });
      }
    }
  }

  if (!result) {
    const message =
      lastRateLimitError instanceof Error ? lastRateLimitError.message : String(lastRateLimitError ?? 'Unknown error.');
    throw new Error(`Seed hack failed after rate-limit retries: ${message}`);
  }

  await repository.logAudit({
    eventId,
    actorUserId,
    action: 'hack_submitted',
    newValue: {
      projectId: result.projectId,
      title,
      source: 'phase5_seed',
    },
  });

  return {
    seeded: true,
    eventId,
    actorUserId,
    projectId: result.projectId,
    title,
  };
}

async function backfillFullWidthByEventQuery(eventNameQuery: string): Promise<{
  generatedAtUtc: string;
  eventNameQuery: string;
  eventCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  skippedMissingPageIdCount: number;
  events: Array<{
    eventId: string;
    eventName: string;
    confluencePageId: string | null;
    status: 'updated' | 'failed' | 'skipped_missing_page_id';
    error?: string;
  }>;
}> {
  const repository = new SupabaseRepository();
  const candidates = await repository.listMigrationEventCandidatesByName(eventNameQuery);

  const events: Array<{
    eventId: string;
    eventName: string;
    confluencePageId: string | null;
    status: 'updated' | 'failed' | 'skipped_missing_page_id';
    error?: string;
  }> = [];

  for (const event of candidates) {
    const confluencePageId =
      typeof event.confluence_page_id === 'string' && event.confluence_page_id.trim()
        ? event.confluence_page_id.trim()
        : null;

    if (!confluencePageId) {
      events.push({
        eventId: event.id,
        eventName: event.name,
        confluencePageId: null,
        status: 'skipped_missing_page_id',
      });
      continue;
    }

    try {
      await ensurePageFullWidthByDefault(confluencePageId);
      events.push({
        eventId: event.id,
        eventName: event.name,
        confluencePageId,
        status: 'updated',
      });
    } catch (error) {
      events.push({
        eventId: event.id,
        eventName: event.name,
        confluencePageId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    eventNameQuery,
    eventCount: candidates.length,
    processedCount: events.filter((event) => event.status !== 'skipped_missing_page_id').length,
    successCount: events.filter((event) => event.status === 'updated').length,
    failureCount: events.filter((event) => event.status === 'failed').length,
    skippedMissingPageIdCount: events.filter((event) => event.status === 'skipped_missing_page_id').length,
    events,
  };
}

async function resyncScheduleMilestonesForExistingHdcEvents(payload: DryRunPayload): Promise<{
  generatedAtUtc: string;
  eventNameQuery: string | null;
  eventId: string | null;
  candidateCount: number;
  processedCount: number;
  successCount: number;
  skippedCount: number;
  failureCount: number;
  results: Array<{
    eventId: string;
    eventName?: string;
    runtimeType?: string | null;
    status: 'resynced' | 'skipped' | 'failed' | 'not_found';
    deletedCount?: number;
    createdCount?: number;
    customEventCount?: number;
    reason?: string;
    error?: string;
  }>;
}> {
  const repository = new SupabaseRepository();
  const service = new HdcService(repository);
  const explicitEventId = payload.eventId?.trim() || null;
  const searchEventNameQuery = payload.eventNameQuery?.trim() || 'HDC';
  const eventNameQuery = explicitEventId ? null : searchEventNameQuery;

  const candidates = explicitEventId
    ? [{ id: explicitEventId, name: '(explicit eventId)' }]
    : await repository.listMigrationEventCandidatesByName(searchEventNameQuery);

  const results: Array<{
    eventId: string;
    eventName?: string;
    runtimeType?: string | null;
    status: 'resynced' | 'skipped' | 'failed' | 'not_found';
    deletedCount?: number;
    createdCount?: number;
    customEventCount?: number;
    reason?: string;
    error?: string;
  }> = [];

  for (const candidate of candidates) {
    try {
      const event = await repository.getEventById(candidate.id);
      if (!event) {
        results.push({
          eventId: candidate.id,
          eventName: candidate.name,
          status: 'not_found',
        });
        continue;
      }

      const rebuild = await service.rebuildScheduleMilestonesForExistingEvent(event.id);
      results.push({
        eventId: event.id,
        eventName: event.name,
        runtimeType: event.runtime_type ?? 'hdc_native',
        status: rebuild.skipped ? 'skipped' : 'resynced',
        deletedCount: rebuild.deletedCount,
        createdCount: rebuild.createdCount,
        customEventCount: rebuild.customEventCount,
        ...(rebuild.reason ? { reason: rebuild.reason } : {}),
      });
    } catch (error) {
      results.push({
        eventId: candidate.id,
        eventName: candidate.name,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    eventNameQuery,
    eventId: explicitEventId,
    candidateCount: candidates.length,
    processedCount: results.filter((result) => result.status !== 'not_found').length,
    successCount: results.filter((result) => result.status === 'resynced').length,
    skippedCount: results.filter((result) => result.status === 'skipped').length,
    failureCount: results.filter((result) => result.status === 'failed').length,
    results,
  };
}

export async function handler(request: WebTriggerRequest): Promise<{
  statusCode: number;
  headers: Record<string, string[]>;
  body: string;
}> {
  if (request.method !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const payload = parsePayload(request.body);
    const action = payload.action ?? 'dry_run';
    if (action === 'seed_hack') {
      const seedResult = await seedHackForEvent(payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(seedResult),
      };
    }

    if (action === 'backfill_full_width') {
      const eventNameQuery = payload.eventNameQuery?.trim() || 'HDC';
      const backfillReport = await backfillFullWidthByEventQuery(eventNameQuery);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(backfillReport),
      };
    }

    if (action === 'resync_schedule_milestones') {
      const report = await resyncScheduleMilestonesForExistingHdcEvents(payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(report),
      };
    }

    if (action === 'strip_child_page_intro') {
      const report = await stripChildPageIntroForExistingHdcEvents(payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(report),
      };
    }

    if (action === 'audit_hackday_page_styling') {
      const report = await auditHackdayPageStyling(payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(report),
      };
    }

    if (action === 'repair_hackday_page_styling') {
      const report = await repairHackdayPageStylingBatch(payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(report),
      };
    }

    if (action === 'backfill_showcase_pages') {
      const report = await backfillShowcasePages(payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(report),
      };
    }

    if (action === 'backfill_hackday_submission_pages') {
      const report = await backfillHackdaySubmissionPages(payload);
      return {
        statusCode: 200,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify(report),
      };
    }

    const eventNameQuery = payload.eventNameQuery?.trim() || 'HDC Auto';
    const report = await buildMigrationDryRunReport(eventNameQuery);
    return {
      statusCode: 200,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify(report),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': ['application/json'] },
      body: JSON.stringify({ error: message }),
    };
  }
}
