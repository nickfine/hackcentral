import { SupabaseRepository } from './backend/supabase/repositories';

interface WebTriggerRequest {
  method: string;
  body?: string;
}

interface DryRunPayload {
  action?: 'dry_run' | 'seed_hack';
  eventNameQuery?: string;
  eventId?: string;
  hackTitle?: string;
  hackDescription?: string;
  retryNoDelay?: boolean;
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

    const eventNameQuery = payload.eventNameQuery?.trim() || 'HackDay 2026';
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
