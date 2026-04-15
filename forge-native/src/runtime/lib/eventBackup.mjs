import { createHash, randomUUID } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';

export const EVENT_BACKUP_SCOPE_VERSION = 'v1';
export const EVENT_BACKUP_BUCKET = 'event-backup-snapshots';
export const EVENT_BACKUP_RETENTION_DAYS = 90;
export const EVENT_BACKUP_MAX_PER_EVENT = 200;

const SNAPSHOT_TABLE = 'EventBackupSnapshot';
const RESTORE_RUN_TABLE = 'EventBackupRestoreRun';

const TABLE_SPECS = {
  Event: { keyCandidates: ['id'], required: true },
  EventAdmin: { keyCandidates: ['id'] },
  EventSyncState: { keyCandidates: ['event_id', 'eventId'] },
  Milestone: { keyCandidates: ['id'] },
  Project: { keyCandidates: ['id'] },
  Team: { keyCandidates: ['id'] },
  TeamMember: { keyCandidates: ['id'] },
  EventRegistration: { keyCandidates: ['id'] },
  Vote: { keyCandidates: ['id'] },
  JudgeScore: { keyCandidates: ['id'] },
  TeamInvite: { keyCandidates: ['id'], optional: true },
  HackdaySubmissionPageLink: { keyCandidates: ['project_id', 'projectId'] },
  ShowcaseHack: { keyCandidates: ['project_id', 'projectId'] },
  HackdayTemplateSeed: {
    keyCandidates: ['id', 'confluence_page_id', 'confluencePageId'],
    diffIgnoredFields: ['updated_at'],
  },
  HackdayExtractionPrompt: { keyCandidates: ['id'] },
  HackdayExtractionImport: { keyCandidates: ['id'] },
  EventAuditLog: { keyCandidates: ['id'], excludeFromDiff: true, excludeFromRestore: true },
};

const RESTORE_TABLE_ORDER = [
  'Event',
  'EventAdmin',
  'EventSyncState',
  'Milestone',
  'Team',
  'TeamMember',
  'Project',
  'EventRegistration',
  'Vote',
  'JudgeScore',
  'TeamInvite',
  'HackdaySubmissionPageLink',
  'ShowcaseHack',
  'HackdayTemplateSeed',
  'HackdayExtractionPrompt',
  'HackdayExtractionImport',
  'EventAuditLog',
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string') return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function hasMissingTable(error, tableName) {
  const message = normalizeErrorMessage(error).toLowerCase();
  const table = String(tableName || '').toLowerCase();
  return (
    message.includes(`relation \"${table}\" does not exist`) ||
    message.includes(`could not find the table '${table}'`) ||
    message.includes(`failed to find table '${table}'`)
  );
}

function hasMissingColumn(error, tableName, columnName) {
  const message = normalizeErrorMessage(error);
  const lower = message.toLowerCase();
  const table = String(tableName || '').toLowerCase();
  const column = String(columnName || '').toLowerCase();
  return (
    lower.includes(`column \"${table}\".\"${column}\" does not exist`) ||
    lower.includes(`column ${table}.${column} does not exist`) ||
    lower.includes(`could not find the '${column}' column of '${table}'`) ||
    lower.includes(`failed to find column '${column}'`)
  );
}

function toComparableJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toComparableJson(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, toComparableJson(value[key])])
    );
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(toComparableJson(value));
}

function toSha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function chunk(values, size) {
  const safe = Math.max(1, Math.floor(size || 1));
  const out = [];
  for (let index = 0; index < values.length; index += safe) {
    out.push(values.slice(index, index + safe));
  }
  return out;
}

function trimString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function dedupeValues(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = typeof value === 'string' ? value.trim() : String(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function readFirstValue(row, candidates) {
  if (!row || typeof row !== 'object') return null;
  for (const candidate of candidates) {
    if (row[candidate] !== undefined && row[candidate] !== null) {
      if (typeof row[candidate] === 'string') {
        const trimmed = row[candidate].trim();
        if (trimmed) return trimmed;
        continue;
      }
      return row[candidate];
    }
  }
  return null;
}

function resolveKeyField(rows, keyCandidates) {
  for (const key of keyCandidates || []) {
    if (rows.some((row) => row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '')) {
      return key;
    }
  }
  return null;
}

function rowStableHash(row) {
  return toSha256Hex(stableStringify(row));
}

function omitFields(row, fields) {
  if (!row || typeof row !== 'object' || !Array.isArray(fields) || fields.length === 0) {
    return row;
  }
  const next = { ...row };
  for (const field of fields) {
    delete next[field];
  }
  return next;
}

function normalizeRowForDiff(tableName, row) {
  const spec = TABLE_SPECS[tableName] || {};
  return omitFields(row, spec.diffIgnoredFields || []);
}

function rowMapByKey(rows, keyCandidates) {
  const keyField = resolveKeyField(rows, keyCandidates);
  const map = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    let key = null;
    if (keyField && row[keyField] !== undefined && row[keyField] !== null) {
      const raw = typeof row[keyField] === 'string' ? row[keyField].trim() : String(row[keyField]);
      key = raw ? `${keyField}:${raw}` : null;
    }
    if (!key) {
      key = `hash:${rowStableHash(row)}`;
    }
    map.set(key, row);
  }
  return { keyField, map };
}

function buildPageSnapshotMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const pageId = trimString(row?.pageId);
    if (!pageId) continue;
    map.set(pageId, row);
  }
  return map;
}

async function selectAllRows(supabase, table, { filters = [], pageSize = 1000 } = {}) {
  const rows = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select('*').range(from, from + pageSize - 1);
    for (const filter of filters) {
      if (!filter || !filter.field) continue;
      if (filter.op === 'in') {
        const values = Array.isArray(filter.value) ? filter.value : [];
        if (values.length === 0) {
          return [];
        }
        query = query.in(filter.field, values);
      } else {
        query = query.eq(filter.field, filter.value);
      }
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
    if (from > 200_000) {
      break;
    }
  }
  return rows;
}

async function selectByEqFieldCandidates(supabase, table, fieldCandidates, value, warnings, { required = false } = {}) {
  let lastError = null;
  for (const field of fieldCandidates) {
    try {
      const rows = await selectAllRows(supabase, table, { filters: [{ op: 'eq', field, value }] });
      return { rows, usedField: field };
    } catch (error) {
      if (hasMissingTable(error, table)) {
        if (!TABLE_SPECS[table]?.optional && required) {
          throw new Error(`Missing required table ${table} while building event backup scope.`);
        }
        warnings.push(`Table ${table} is missing; scope capture skipped.`);
        return { rows: [], usedField: null, missingTable: true };
      }
      if (hasMissingColumn(error, table, field)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (required) {
    throw new Error(
      `Unable to scope table ${table}: none of columns [${fieldCandidates.join(', ')}] exist in this schema.`
    );
  }
  if (lastError) {
    warnings.push(
      `Unable to scope table ${table}: no matching scope column found among [${fieldCandidates.join(', ')}].`
    );
  }
  return { rows: [], usedField: null };
}

async function selectByInFieldCandidates(supabase, table, fieldCandidates, values, warnings, { required = false } = {}) {
  const normalizedValues = dedupeValues(values);
  if (normalizedValues.length === 0) {
    return { rows: [], usedField: null };
  }

  let lastError = null;
  for (const field of fieldCandidates) {
    try {
      const rows = await selectAllRows(supabase, table, { filters: [{ op: 'in', field, value: normalizedValues }] });
      return { rows, usedField: field };
    } catch (error) {
      if (hasMissingTable(error, table)) {
        if (!TABLE_SPECS[table]?.optional && required) {
          throw new Error(`Missing required table ${table} while building event backup scope.`);
        }
        warnings.push(`Table ${table} is missing; scoped lookup skipped.`);
        return { rows: [], usedField: null, missingTable: true };
      }
      if (hasMissingColumn(error, table, field)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (required) {
    throw new Error(
      `Unable to scope table ${table}: none of columns [${fieldCandidates.join(', ')}] exist in this schema.`
    );
  }
  if (lastError) {
    warnings.push(`Unable to scope table ${table} by any of [${fieldCandidates.join(', ')}].`);
  }
  return { rows: [], usedField: null };
}

function getArrayFieldValues(row, candidates) {
  for (const candidate of candidates) {
    const value = row?.[candidate];
    if (Array.isArray(value)) {
      return value.map((item) => trimString(item)).filter(Boolean);
    }
  }
  return [];
}

function buildDbRowCounts(scope) {
  const counts = {};
  for (const tableName of Object.keys(TABLE_SPECS)) {
    counts[tableName] = Array.isArray(scope.tables?.[tableName]) ? scope.tables[tableName].length : 0;
  }
  return counts;
}

function buildPageCounts(pageBodies, requestedCount) {
  const failed = (pageBodies || []).filter((row) => row && row.reachable === false).length;
  const captured = (pageBodies || []).filter((row) => row && row.reachable !== false).length;
  return {
    requested: Number(requestedCount || 0),
    captured,
    failed,
  };
}

function collectEventOwnedPageIds(scope) {
  const pageIds = [];
  const eventRow = scope.tables?.Event?.[0] || null;
  const eventPageId = readFirstValue(eventRow, ['confluence_page_id', 'confluencePageId']);
  if (eventPageId) {
    pageIds.push(eventPageId);
  }

  for (const row of scope.tables?.ShowcaseHack || []) {
    const pageId = readFirstValue(row, ['confluence_page_id', 'confluencePageId']);
    if (pageId) pageIds.push(pageId);
    const outputIds = getArrayFieldValues(row, ['output_page_ids', 'outputPageIds']);
    pageIds.push(...outputIds);
  }

  for (const row of scope.tables?.HackdaySubmissionPageLink || []) {
    const submissionPageId = readFirstValue(row, ['submission_page_id', 'submissionPageId']);
    if (submissionPageId) pageIds.push(submissionPageId);
    const outputIds = getArrayFieldValues(row, ['output_page_ids', 'outputPageIds']);
    pageIds.push(...outputIds);
  }

  return dedupeValues(pageIds);
}

export async function buildEventBackupScope({
  supabase,
  eventId,
  includePages = true,
  fetchPageStorageById,
  logger = console,
}) {
  const warnings = [];

  const eventResult = await selectByEqFieldCandidates(
    supabase,
    'Event',
    ['id'],
    eventId,
    warnings,
    { required: true }
  );
  const eventRow = eventResult.rows?.[0] || null;
  if (!eventRow) {
    throw new Error(`Event ${eventId} was not found.`);
  }

  const eventAdmins = await selectByEqFieldCandidates(
    supabase,
    'EventAdmin',
    ['eventId', 'event_id'],
    eventId,
    warnings
  );

  const eventSyncState = await selectByEqFieldCandidates(
    supabase,
    'EventSyncState',
    ['eventId', 'event_id'],
    eventId,
    warnings
  );

  const milestones = await selectByEqFieldCandidates(
    supabase,
    'Milestone',
    ['eventId', 'event_id'],
    eventId,
    warnings
  );

  const projects = await selectByEqFieldCandidates(
    supabase,
    'Project',
    ['eventId', 'event_id'],
    eventId,
    warnings
  );

  const teams = await selectByEqFieldCandidates(
    supabase,
    'Team',
    ['eventId', 'event_id'],
    eventId,
    warnings
  );

  const teamIds = dedupeValues([
    ...teams.rows.map((row) => readFirstValue(row, ['id'])),
    ...projects.rows.map((row) => readFirstValue(row, ['teamId', 'team_id'])),
  ]);

  const projectIds = dedupeValues(projects.rows.map((row) => readFirstValue(row, ['id'])));

  const teamMembers = await selectByInFieldCandidates(
    supabase,
    'TeamMember',
    ['teamId', 'team_id'],
    teamIds,
    warnings
  );

  const registrations = await selectByEqFieldCandidates(
    supabase,
    'EventRegistration',
    ['eventId', 'event_id'],
    eventId,
    warnings
  );

  const votes =
    projectIds.length > 0
      ? await selectByInFieldCandidates(
          supabase,
          'Vote',
          ['project_id', 'projectId'],
          projectIds,
          warnings
        )
      : { rows: [], usedField: null };

  const judgeScoresByProject = await selectByInFieldCandidates(
    supabase,
    'JudgeScore',
    ['project_id', 'projectId'],
    projectIds,
    warnings
  );
  const judgeScores = {
    rows: dedupeValues([
      ...judgeScoresByProject.rows.map((row) => stableStringify(row)),
    ]).map((serialized) => JSON.parse(serialized)),
  };

  const teamInvites = await selectByInFieldCandidates(
    supabase,
    'TeamInvite',
    ['team_id', 'teamId'],
    teamIds,
    warnings
  );

  const submissionPageLinks = await selectByEqFieldCandidates(
    supabase,
    'HackdaySubmissionPageLink',
    ['event_id', 'eventId'],
    eventId,
    warnings
  );

  const showcaseHacks = await selectByEqFieldCandidates(
    supabase,
    'ShowcaseHack',
    ['source_event_id', 'sourceEventId'],
    eventId,
    warnings
  );

  let templateSeeds = await selectByEqFieldCandidates(
    supabase,
    'HackdayTemplateSeed',
    ['hdc_event_id', 'hdcEventId'],
    eventId,
    warnings
  );
  if ((templateSeeds.rows?.length || 0) === 0) {
    const eventPageId = readFirstValue(eventRow, ['confluence_page_id', 'confluencePageId']);
    if (eventPageId) {
      templateSeeds = await selectByEqFieldCandidates(
        supabase,
        'HackdayTemplateSeed',
        ['confluence_page_id', 'confluencePageId'],
        eventPageId,
        warnings
      );
    }
  }

  const extractionPrompt = await selectByEqFieldCandidates(
    supabase,
    'HackdayExtractionPrompt',
    ['event_id', 'eventId'],
    eventId,
    warnings
  );

  const extractionImport = await selectByEqFieldCandidates(
    supabase,
    'HackdayExtractionImport',
    ['event_id', 'eventId'],
    eventId,
    warnings
  );

  const eventAuditLogs = await selectByEqFieldCandidates(
    supabase,
    'EventAuditLog',
    ['event_id', 'eventId'],
    eventId,
    warnings
  );

  const scope = {
    eventId,
    scopeVersion: EVENT_BACKUP_SCOPE_VERSION,
    capturedAt: nowIso(),
    warnings,
    tables: {
      Event: [eventRow],
      EventAdmin: eventAdmins.rows,
      EventSyncState: eventSyncState.rows,
      Milestone: milestones.rows,
      Project: projects.rows,
      Team: teams.rows,
      TeamMember: teamMembers.rows,
      EventRegistration: registrations.rows,
      Vote: votes.rows,
      JudgeScore: judgeScores.rows,
      TeamInvite: teamInvites.rows,
      HackdaySubmissionPageLink: submissionPageLinks.rows,
      ShowcaseHack: showcaseHacks.rows,
      HackdayTemplateSeed: templateSeeds.rows,
      HackdayExtractionPrompt: extractionPrompt.rows,
      HackdayExtractionImport: extractionImport.rows,
      EventAuditLog: eventAuditLogs.rows,
    },
    pageBodies: [],
    pageIds: [],
  };

  const pageIds = collectEventOwnedPageIds(scope);
  scope.pageIds = pageIds;

  if (includePages && typeof fetchPageStorageById === 'function') {
    for (const pageId of pageIds) {
      try {
        const page = await fetchPageStorageById(pageId);
        scope.pageBodies.push({
          pageId,
          reachable: true,
          title: page?.title || null,
          pageUrl: page?.pageUrl || null,
          versionNumber: Number(page?.versionNumber || 0) || null,
          storageValue: typeof page?.storageValue === 'string' ? page.storageValue : '',
          fetchedAt: nowIso(),
        });
      } catch (error) {
        const message = normalizeErrorMessage(error);
        logger?.warn?.('[event-backup] page fetch failed', pageId, message);
        warnings.push(`Failed to fetch Confluence page ${pageId}: ${message}`);
        scope.pageBodies.push({
          pageId,
          reachable: false,
          error: message,
          fetchedAt: nowIso(),
        });
      }
    }
  }

  return scope;
}

function serializeSnapshotPayload(payload) {
  const json = stableStringify(payload);
  const checksum = toSha256Hex(json);
  const gzipBuffer = gzipSync(Buffer.from(json, 'utf8'));
  return {
    json,
    checksum,
    gzipBuffer,
    sizeBytes: gzipBuffer.byteLength,
  };
}

function parseSnapshotPayload(buffer) {
  const inflated = gunzipSync(buffer);
  const json = inflated.toString('utf8');
  const payload = JSON.parse(json);
  return { payload, json };
}

function normalizeSnapshotSource(source) {
  const allowed = new Set(['manual', 'publish', 'predeploy', 'daily', 'pre_restore']);
  const normalized = typeof source === 'string' ? source.trim().toLowerCase() : '';
  if (!allowed.has(normalized)) {
    throw new Error(`Invalid backup source: ${source}`);
  }
  return normalized;
}

async function fetchSingleRowByFilters({
  supabase,
  table,
  select = '*',
  filters = [],
  orderBy = null,
}) {
  let query = supabase.from(table).select(select);
  for (const filter of filters) {
    if (!filter?.field) continue;
    query = query.eq(filter.field, filter.value);
  }
  if (orderBy?.column) {
    query = query.order(orderBy.column, { ascending: Boolean(orderBy.ascending) });
  }
  const { data, error } = await query.limit(1);
  if (error) {
    throw new Error(`Failed to fetch ${table} row: ${error.message}`);
  }
  return data?.[0] || null;
}

function buildSnapshotStoragePath(eventId, source) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
  return `${eventId}/${source}/${stamp}-${randomUUID()}.json.gz`;
}

function telemetry(logger, metric, payload) {
  logger?.info?.('[hdc-backup-telemetry]', JSON.stringify({ metric, ...payload, loggedAt: nowIso() }));
}

export async function createEventBackupSnapshot({
  supabase,
  eventId,
  source,
  actorUserId = null,
  fetchPageStorageById,
  logger = console,
}) {
  const normalizedSource = normalizeSnapshotSource(source);
  const startedAt = Date.now();

  try {
    const scope = await buildEventBackupScope({
      supabase,
      eventId,
      includePages: true,
      fetchPageStorageById,
      logger,
    });

    const payload = {
      schemaVersion: EVENT_BACKUP_SCOPE_VERSION,
      eventId,
      source: normalizedSource,
      capturedAt: nowIso(),
      actorUserId: actorUserId || null,
      dbRowCounts: buildDbRowCounts(scope),
      pageCounts: buildPageCounts(scope.pageBodies, scope.pageIds.length),
      warnings: scope.warnings,
      scope: {
        tables: scope.tables,
        pageBodies: scope.pageBodies,
      },
    };

    const serialized = serializeSnapshotPayload(payload);
    const storagePath = buildSnapshotStoragePath(eventId, normalizedSource);

    const upload = await supabase.storage
      .from(EVENT_BACKUP_BUCKET)
      .upload(storagePath, serialized.gzipBuffer, {
        contentType: 'application/gzip',
        upsert: false,
      });
    if (upload.error) {
      throw new Error(`Failed to upload backup snapshot: ${upload.error.message}`);
    }

    const { data: insertData, error: insertError } = await supabase
      .from(SNAPSHOT_TABLE)
      .insert({
        event_id: eventId,
        source: normalizedSource,
        scope_version: EVENT_BACKUP_SCOPE_VERSION,
        storage_path: storagePath,
        checksum_sha256: serialized.checksum,
        db_row_counts: payload.dbRowCounts,
        page_counts: payload.pageCounts,
        status: 'ready',
        warnings: payload.warnings,
        created_by_user_id: actorUserId || null,
        created_at: nowIso(),
      })
      .select('*')
      .limit(1);

    if (insertError) {
      throw new Error(`Failed to persist backup snapshot metadata: ${insertError.message}`);
    }

    const snapshotRow =
      insertData?.[0] ||
      (await fetchSingleRowByFilters({
        supabase,
        table: SNAPSHOT_TABLE,
        filters: [
          { field: 'event_id', value: eventId },
          { field: 'storage_path', value: storagePath },
          { field: 'checksum_sha256', value: serialized.checksum },
        ],
      }));
    if (!snapshotRow) {
      throw new Error('Backup snapshot metadata insert returned no rows.');
    }

    await pruneEventSnapshots({
      supabase,
      eventId,
      logger,
    });

    telemetry(logger, 'event_backup_snapshot_created', {
      eventId,
      snapshotId: snapshotRow.id,
      source: normalizedSource,
      durationMs: Math.max(0, Date.now() - startedAt),
      dbRows: Object.values(payload.dbRowCounts).reduce((sum, value) => sum + Number(value || 0), 0),
      pageRequested: payload.pageCounts.requested,
      pageCaptured: payload.pageCounts.captured,
    });

    return {
      snapshotId: snapshotRow.id,
      eventId,
      source: normalizedSource,
      createdAt: snapshotRow.created_at,
      storagePath,
      checksumSha256: serialized.checksum,
      dbRowCounts: payload.dbRowCounts,
      pageCounts: payload.pageCounts,
      warnings: payload.warnings,
    };
  } catch (error) {
    telemetry(logger, 'event_backup_snapshot_failed', {
      eventId,
      source: normalizedSource,
      durationMs: Math.max(0, Date.now() - startedAt),
      error: normalizeErrorMessage(error),
    });
    throw error;
  }
}

async function pruneEventSnapshots({ supabase, eventId, logger = console }) {
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select('id,event_id,source,storage_path,created_at,status')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    logger?.warn?.('[event-backup] prune list failed', normalizeErrorMessage(error));
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  const now = Date.now();
  const toDelete = [];

  rows.forEach((row, index) => {
    const createdMs = Date.parse(row.created_at || '');
    const ageDays = Number.isFinite(createdMs)
      ? Math.floor((now - createdMs) / (1000 * 60 * 60 * 24))
      : Number.POSITIVE_INFINITY;

    const keepByCount = index < EVENT_BACKUP_MAX_PER_EVENT;
    const keepByAge = ageDays <= EVENT_BACKUP_RETENTION_DAYS;
    const keepManualWithinWindow = row.source === 'manual' && ageDays <= EVENT_BACKUP_RETENTION_DAYS;

    if (keepByCount || keepByAge || keepManualWithinWindow) {
      return;
    }
    toDelete.push(row);
  });

  for (const row of toDelete) {
    if (row.storage_path) {
      const removeResult = await supabase.storage.from(EVENT_BACKUP_BUCKET).remove([row.storage_path]);
      if (removeResult.error) {
        logger?.warn?.(
          '[event-backup] failed to remove snapshot object',
          row.storage_path,
          removeResult.error.message
        );
      }
    }

    const { error: deleteError } = await supabase.from(SNAPSHOT_TABLE).delete().eq('id', row.id);
    if (deleteError) {
      logger?.warn?.('[event-backup] failed to delete snapshot metadata', row.id, deleteError.message);
    }
  }
}

export async function listEventBackupSnapshots({ supabase, eventId, limit = 50 }) {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit || 50)));
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select('id,event_id,source,scope_version,checksum_sha256,db_row_counts,page_counts,status,warnings,created_by_user_id,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to list backup snapshots: ${error.message}`);
  }

  return (data || []).map((row) => ({
    snapshotId: row.id,
    eventId: row.event_id,
    source: row.source,
    scopeVersion: row.scope_version,
    checksumSha256: row.checksum_sha256,
    dbRowCounts: row.db_row_counts || {},
    pageCounts: row.page_counts || {},
    status: row.status,
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    createdByUserId: row.created_by_user_id || null,
    createdAt: row.created_at,
  }));
}

export async function getEventBackupCoverageStatus({ supabase, eventId }) {
  const snapshots = await listEventBackupSnapshots({ supabase, eventId, limit: 20 });
  const latestReady = snapshots.find((snapshot) => snapshot.status === 'ready') || null;
  const latestCreatedAtMs = latestReady?.createdAt ? Date.parse(latestReady.createdAt) : Number.NaN;
  const ageHours = Number.isFinite(latestCreatedAtMs)
    ? Math.max(0, Math.round(((Date.now() - latestCreatedAtMs) / (1000 * 60 * 60)) * 10) / 10)
    : null;

  return {
    eventId,
    backupsActive: Boolean(latestReady),
    latestSnapshot: latestReady,
    latestSnapshotAgeHours: ageHours,
    coverageHealthy: ageHours !== null ? ageHours <= 36 : false,
    recentSnapshotCount: snapshots.length,
  };
}

async function fetchSnapshotMetadataById({ supabase, eventId, snapshotId }) {
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select('*')
    .eq('id', snapshotId)
    .eq('event_id', eventId)
    .limit(1);

  if (error) {
    throw new Error(`Failed to load backup snapshot metadata: ${error.message}`);
  }

  const row = data?.[0] || null;
  if (!row) {
    throw new Error(`Snapshot ${snapshotId} was not found for event ${eventId}.`);
  }
  if (row.status !== 'ready') {
    throw new Error(`Snapshot ${snapshotId} is not ready for restore.`);
  }

  return row;
}

async function downloadSnapshotPayload({ supabase, snapshotRow }) {
  const { data, error } = await supabase.storage.from(EVENT_BACKUP_BUCKET).download(snapshotRow.storage_path);
  if (error) {
    throw new Error(`Failed to download snapshot payload: ${error.message}`);
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const { payload, json } = parseSnapshotPayload(buffer);
  const checksum = toSha256Hex(json);
  if (checksum !== snapshotRow.checksum_sha256) {
    throw new Error(`Snapshot checksum mismatch for ${snapshotRow.id}.`);
  }
  return payload;
}

function buildTableDiff(tableName, liveRows, snapshotRows) {
  const spec = TABLE_SPECS[tableName] || { keyCandidates: ['id'] };
  if (spec.excludeFromDiff) {
    return {
      table: tableName,
      keyField: null,
      liveCount: liveRows.length,
      snapshotCount: snapshotRows.length,
      toCreate: 0,
      toUpdate: 0,
      toDelete: 0,
      unchanged: Math.min(liveRows.length, snapshotRows.length),
      excludedFromDiff: true,
    };
  }
  const liveMap = rowMapByKey(liveRows, spec.keyCandidates);
  const snapshotMap = rowMapByKey(snapshotRows, spec.keyCandidates);

  let toCreate = 0;
  let toDelete = 0;
  let toUpdate = 0;
  let unchanged = 0;

  for (const [key, snapshotRow] of snapshotMap.map.entries()) {
    if (!liveMap.map.has(key)) {
      toCreate += 1;
      continue;
    }
    const liveRow = liveMap.map.get(key);
    if (
      stableStringify(normalizeRowForDiff(tableName, liveRow)) ===
      stableStringify(normalizeRowForDiff(tableName, snapshotRow))
    ) {
      unchanged += 1;
    } else {
      toUpdate += 1;
    }
  }

  for (const key of liveMap.map.keys()) {
    if (!snapshotMap.map.has(key)) {
      toDelete += 1;
    }
  }

  return {
    table: tableName,
    keyField: snapshotMap.keyField || liveMap.keyField || null,
    liveCount: liveRows.length,
    snapshotCount: snapshotRows.length,
    toCreate,
    toUpdate,
    toDelete,
    unchanged,
  };
}

export function computeEventBackupDiff({ liveScope, snapshotScope }) {
  const tableNames = Object.keys(TABLE_SPECS);
  const tableDiffs = tableNames.map((tableName) =>
    buildTableDiff(
      tableName,
      Array.isArray(liveScope?.tables?.[tableName]) ? liveScope.tables[tableName] : [],
      Array.isArray(snapshotScope?.tables?.[tableName]) ? snapshotScope.tables[tableName] : []
    )
  );

  const livePageMap = buildPageSnapshotMap(liveScope?.pageBodies || []);
  const snapshotPageMap = buildPageSnapshotMap(snapshotScope?.pageBodies || []);

  let pageCreate = 0;
  let pageDelete = 0;
  let pageUpdate = 0;
  let pageUnchanged = 0;

  for (const [pageId, snapshotPage] of snapshotPageMap.entries()) {
    const livePage = livePageMap.get(pageId);
    if (!livePage) {
      pageCreate += 1;
      continue;
    }
    if ((livePage.storageValue || '') === (snapshotPage.storageValue || '')) {
      pageUnchanged += 1;
    } else {
      pageUpdate += 1;
    }
  }

  for (const pageId of livePageMap.keys()) {
    if (!snapshotPageMap.has(pageId)) {
      pageDelete += 1;
    }
  }

  const totals = tableDiffs.reduce(
    (acc, tableDiff) => {
      acc.toCreate += tableDiff.toCreate;
      acc.toUpdate += tableDiff.toUpdate;
      acc.toDelete += tableDiff.toDelete;
      return acc;
    },
    { toCreate: 0, toUpdate: 0, toDelete: 0 }
  );

  return {
    scopeVersion: EVENT_BACKUP_SCOPE_VERSION,
    eventId: liveScope?.eventId || snapshotScope?.eventId || null,
    tables: tableDiffs,
    pages: {
      liveCount: livePageMap.size,
      snapshotCount: snapshotPageMap.size,
      toCreate: pageCreate,
      toUpdate: pageUpdate,
      toDelete: pageDelete,
      unchanged: pageUnchanged,
      impactedPageIds: [
        ...new Set(
          [
            ...Array.from(snapshotPageMap.keys()).filter((pageId) => {
              const livePage = livePageMap.get(pageId);
              return !livePage || (livePage.storageValue || '') !== (snapshotPageMap.get(pageId)?.storageValue || '');
            }),
            ...Array.from(livePageMap.keys()).filter((pageId) => !snapshotPageMap.has(pageId)),
          ].filter(Boolean)
        ),
      ],
    },
    totals,
  };
}

export async function createRestoreDryRun({
  supabase,
  eventId,
  snapshotId,
  requestedByUserId = null,
  fetchPageStorageById,
  logger = console,
}) {
  const startedAt = Date.now();
  try {
    const snapshotRow = await fetchSnapshotMetadataById({ supabase, eventId, snapshotId });
    const snapshotPayload = await downloadSnapshotPayload({ supabase, snapshotRow });

    const liveScope = await buildEventBackupScope({
      supabase,
      eventId,
      includePages: true,
      fetchPageStorageById,
      logger,
    });

    const snapshotScope = {
      eventId,
      tables: snapshotPayload?.scope?.tables || {},
      pageBodies: Array.isArray(snapshotPayload?.scope?.pageBodies) ? snapshotPayload.scope.pageBodies : [],
    };

    const diffSummary = computeEventBackupDiff({ liveScope, snapshotScope });
    const confirmationToken = randomUUID();
    const createdAt = nowIso();

    const { data, error } = await supabase
      .from(RESTORE_RUN_TABLE)
      .insert({
        event_id: eventId,
        snapshot_id: snapshotId,
        mode: 'dry_run',
        status: 'succeeded',
        confirmation_token: confirmationToken,
        diff_summary: diffSummary,
        changes_applied: null,
        warnings: liveScope.warnings || [],
        requested_by_user_id: requestedByUserId,
        confirmed_by_user_id: null,
        created_at: createdAt,
        completed_at: createdAt,
      })
      .select('*')
      .limit(1);

    if (error) {
      throw new Error(`Failed to persist restore dry-run result: ${error.message}`);
    }

  const run =
    data?.[0] ||
    (await fetchSingleRowByFilters({
      supabase,
      table: RESTORE_RUN_TABLE,
      filters: [
        { field: 'event_id', value: eventId },
        { field: 'snapshot_id', value: snapshotId },
        { field: 'mode', value: 'dry_run' },
        { field: 'confirmation_token', value: confirmationToken },
      ],
      orderBy: { column: 'created_at', ascending: false },
    }));
  if (!run) {
    throw new Error('Restore dry-run insert returned no row.');
  }

    telemetry(logger, 'event_backup_restore_dry_run', {
      eventId,
      snapshotId,
      restoreRunId: run.id,
      toCreate: diffSummary.totals.toCreate,
      toUpdate: diffSummary.totals.toUpdate,
      toDelete: diffSummary.totals.toDelete,
      impactedPages: diffSummary.pages.impactedPageIds.length,
      durationMs: Math.max(0, Date.now() - startedAt),
    });

    return {
      restoreRunId: run.id,
      eventId,
      snapshotId,
      confirmationToken,
      diffSummary,
      warnings: Array.isArray(run.warnings) ? run.warnings : [],
      createdAt: run.created_at,
    };
  } catch (error) {
    telemetry(logger, 'event_backup_restore_failed', {
      eventId,
      snapshotId,
      mode: 'dry_run',
      durationMs: Math.max(0, Date.now() - startedAt),
      error: normalizeErrorMessage(error),
    });
    throw error;
  }
}

async function deleteRowsByKeyCandidates(supabase, table, rows, keyCandidates, warnings) {
  if (!rows.length) return 0;

  const keyField = resolveKeyField(rows, keyCandidates);
  if (!keyField) {
    warnings.push(`Table ${table}: unable to determine key field for delete scope.`);
    return 0;
  }

  const values = dedupeValues(rows.map((row) => row?.[keyField]));
  if (values.length === 0) return 0;

  let deleted = 0;
  for (const batch of chunk(values, 200)) {
    const { error } = await supabase.from(table).delete().in(keyField, batch);
    if (error) {
      if (hasMissingTable(error, table)) {
        warnings.push(`Table ${table} missing during restore delete; skipped.`);
        return deleted;
      }
      if (hasMissingColumn(error, table, keyField)) {
        warnings.push(`Table ${table} key column ${keyField} missing during delete; skipped.`);
        return deleted;
      }
      throw new Error(`Failed deleting ${table} rows by ${keyField}: ${error.message}`);
    }
    deleted += batch.length;
  }

  return deleted;
}

async function insertRows(supabase, table, rows, warnings) {
  if (!rows.length) return 0;

  let inserted = 0;
  for (const batch of chunk(rows, 100)) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      if (hasMissingTable(error, table)) {
        warnings.push(`Table ${table} missing during restore insert; skipped.`);
        return inserted;
      }
      throw new Error(`Failed inserting ${table} restore rows: ${error.message}`);
    }
    inserted += batch.length;
  }
  return inserted;
}

async function upsertEventCore(supabase, eventRow) {
  if (!eventRow || typeof eventRow !== 'object') {
    throw new Error('Snapshot payload missing Event row for restore.');
  }
  if (!eventRow.id) {
    throw new Error('Snapshot Event row is missing id.');
  }

  const { error } = await supabase.from('Event').upsert(eventRow, { onConflict: 'id' });
  if (error) {
    throw new Error(`Failed restoring Event core row: ${error.message}`);
  }
}

async function applyConfluencePageRestore({ snapshotPages, updatePageStorageById, warnings, logger = console }) {
  if (typeof updatePageStorageById !== 'function') {
    warnings.push('Confluence page restore callback unavailable; page body restore skipped.');
    return { restoredCount: 0, failedCount: 0 };
  }

  let restoredCount = 0;
  let failedCount = 0;

  for (const page of snapshotPages || []) {
    const pageId = trimString(page?.pageId);
    if (!pageId) continue;
    if (page.reachable === false) {
      warnings.push(`Skipped page ${pageId}: snapshot capture flagged it unreachable.`);
      continue;
    }

    const storageValue = typeof page.storageValue === 'string' ? page.storageValue : '';
    try {
      await updatePageStorageById({ pageId, storageValue, title: page.title || null });
      restoredCount += 1;
    } catch (error) {
      failedCount += 1;
      const message = normalizeErrorMessage(error);
      logger?.warn?.('[event-backup] page restore failed', pageId, message);
      warnings.push(`Page restore failed for ${pageId}: ${message}`);
    }
  }

  return { restoredCount, failedCount };
}

async function loadRestoreRun({ supabase, eventId, restoreRunId }) {
  const { data, error } = await supabase
    .from(RESTORE_RUN_TABLE)
    .select('*')
    .eq('id', restoreRunId)
    .eq('event_id', eventId)
    .limit(1);

  if (error) {
    throw new Error(`Failed to load restore run: ${error.message}`);
  }

  const run = data?.[0] || null;
  if (!run) {
    throw new Error(`Restore run ${restoreRunId} not found for event ${eventId}.`);
  }

  return run;
}

function assertDryRunConfirmation({ run, snapshotId, confirmationToken }) {
  if (run.mode !== 'dry_run' || run.status !== 'succeeded') {
    throw new Error('Restore apply requires a successful dry-run run.');
  }
  if (run.snapshot_id !== snapshotId) {
    throw new Error('Dry-run snapshot mismatch for restore apply request.');
  }
  if (!confirmationToken || confirmationToken !== run.confirmation_token) {
    throw new Error('Invalid restore confirmation token.');
  }
}

export async function applyEventBackupRestore({
  supabase,
  eventId,
  snapshotId,
  restoreRunId,
  confirmationToken,
  requestedByUserId = null,
  confirmedByUserId = null,
  fetchPageStorageById,
  updatePageStorageById,
  createPreRestoreSnapshot,
  logger = console,
}) {
  const startedAt = Date.now();
  try {
    const dryRun = await loadRestoreRun({ supabase, eventId, restoreRunId });
    assertDryRunConfirmation({ run: dryRun, snapshotId, confirmationToken });

    const snapshotRow = await fetchSnapshotMetadataById({ supabase, eventId, snapshotId });
    const snapshotPayload = await downloadSnapshotPayload({ supabase, snapshotRow });

    const warnings = [];
    let preRestoreSnapshotId = null;
    if (typeof createPreRestoreSnapshot === 'function') {
      const pre = await createPreRestoreSnapshot();
      preRestoreSnapshotId = pre?.snapshotId || null;
    }

    const liveScopeForDeletes = await buildEventBackupScope({
      supabase,
      eventId,
      includePages: false,
      fetchPageStorageById,
      logger,
    });

    const snapshotTables = snapshotPayload?.scope?.tables || {};
    const changesApplied = {
      tableDeletes: {},
      tableInserts: {},
      pageRestore: {
        restoredCount: 0,
        failedCount: 0,
      },
      preRestoreSnapshotId,
    };

    await upsertEventCore(supabase, (snapshotTables.Event || [])[0]);

    for (const tableName of RESTORE_TABLE_ORDER.filter((table) => table !== 'Event')) {
      const spec = TABLE_SPECS[tableName] || { keyCandidates: ['id'] };
      if (spec.excludeFromRestore) {
        changesApplied.tableDeletes[tableName] = 0;
        changesApplied.tableInserts[tableName] = 0;
        continue;
      }
      const liveRows = Array.isArray(liveScopeForDeletes.tables?.[tableName]) ? liveScopeForDeletes.tables[tableName] : [];
      const snapshotRows = Array.isArray(snapshotTables?.[tableName]) ? snapshotTables[tableName] : [];

      const deleted = await deleteRowsByKeyCandidates(supabase, tableName, liveRows, spec.keyCandidates, warnings);
      changesApplied.tableDeletes[tableName] = deleted;

      const inserted = await insertRows(supabase, tableName, snapshotRows, warnings);
      changesApplied.tableInserts[tableName] = inserted;
    }

    const pageRestore = await applyConfluencePageRestore({
      snapshotPages: Array.isArray(snapshotPayload?.scope?.pageBodies) ? snapshotPayload.scope.pageBodies : [],
      updatePageStorageById,
      warnings,
      logger,
    });
    changesApplied.pageRestore = pageRestore;

    const finishedAt = nowIso();
    const { data, error } = await supabase
      .from(RESTORE_RUN_TABLE)
      .insert({
        event_id: eventId,
        snapshot_id: snapshotId,
        mode: 'apply',
        status: 'succeeded',
        confirmation_token: null,
        diff_summary: dryRun.diff_summary || null,
        changes_applied: changesApplied,
        warnings,
        requested_by_user_id: requestedByUserId,
        confirmed_by_user_id: confirmedByUserId,
        created_at: nowIso(),
        completed_at: finishedAt,
      })
      .select('*')
      .limit(1);

    if (error) {
      throw new Error(`Failed to persist restore apply run: ${error.message}`);
    }

    const run =
      data?.[0] ||
      (await fetchSingleRowByFilters({
        supabase,
        table: RESTORE_RUN_TABLE,
        filters: [
          { field: 'event_id', value: eventId },
          { field: 'snapshot_id', value: snapshotId },
          { field: 'mode', value: 'apply' },
          { field: 'completed_at', value: finishedAt },
        ],
        orderBy: { column: 'created_at', ascending: false },
      }));
    if (!run) {
      throw new Error('Restore apply run insert returned no row.');
    }

    telemetry(logger, 'event_backup_restore_applied', {
      eventId,
      snapshotId,
      restoreRunId: run.id,
      requestedByUserId,
      confirmedByUserId,
      tableDeleteCount: Object.values(changesApplied.tableDeletes).reduce((sum, value) => sum + Number(value || 0), 0),
      tableInsertCount: Object.values(changesApplied.tableInserts).reduce((sum, value) => sum + Number(value || 0), 0),
      pageRestoreCount: pageRestore.restoredCount,
      pageRestoreFailures: pageRestore.failedCount,
      durationMs: Math.max(0, Date.now() - startedAt),
    });

    return {
      restoreRunId: run.id,
      eventId,
      snapshotId,
      status: 'succeeded',
      warnings,
      changesApplied,
      completedAt: finishedAt,
    };
  } catch (error) {
    telemetry(logger, 'event_backup_restore_failed', {
      eventId,
      snapshotId,
      restoreRunId,
      mode: 'apply',
      durationMs: Math.max(0, Date.now() - startedAt),
      error: normalizeErrorMessage(error),
    });
    throw error;
  }
}

export async function getSnapshotPayloadForTesting({ supabase, eventId, snapshotId }) {
  const snapshotRow = await fetchSnapshotMetadataById({ supabase, eventId, snapshotId });
  return downloadSnapshotPayload({ supabase, snapshotRow });
}
