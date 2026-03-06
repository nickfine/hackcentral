import api, { route } from "@forge/api";
import { getSupabaseClient } from "./lib/supabase";
import { createEventBackupSnapshot } from "./lib/eventBackup.mjs";

const ACTIVE_EVENT_EXCLUDED_LIFECYCLE = new Set(["archived", "completed"]);
const DEFAULT_SCAN_PAGE_SIZE = 200;
const DEFAULT_DAILY_MAX_EVENTS = 200;

function nowIso() {
  return new Date().toISOString();
}

function normalizeErrorMessage(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeEventIds(value) {
  if (!value) return [];
  const rawValues = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((token) => token.trim());
  const seen = new Set();
  const out = [];
  for (const raw of rawValues) {
    const normalized = typeof raw === "string" ? raw.trim() : String(raw || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes"].includes(normalized)) return true;
    if (["0", "false", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function isMissingColumnError(error, columnName) {
  const message = normalizeErrorMessage(error).toLowerCase();
  return message.includes(`column`) && message.includes(String(columnName || "").toLowerCase());
}

async function parseConfluenceJson(response, operation) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${operation} failed (${response.status}): ${body}`);
  }
  return body ? JSON.parse(body) : {};
}

async function requestConfluencePageById(pageId, requester = "app") {
  const actor = requester === "user" ? api.asUser() : api.asApp();
  const response = await actor.requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return parseConfluenceJson(response, `Fetch page ${pageId}`);
}

async function fetchConfluencePageWithFallback(pageId) {
  for (const requester of ["app", "user"]) {
    try {
      const page = await requestConfluencePageById(pageId, requester);
      return { page, requester };
    } catch {
      // Continue to alternate requester.
    }
  }
  return null;
}

function extractConfluencePageUrl(pagePayload) {
  const base = pagePayload?._links?.base || "";
  const webui = pagePayload?._links?.webui || "";
  return base && webui ? `${base}${webui}` : "";
}

async function getConfluencePageStorageForBackup(pageId) {
  const fetched = await fetchConfluencePageWithFallback(pageId);
  if (!fetched?.page?.id) {
    throw new Error(`Unable to fetch page ${pageId}`);
  }
  return {
    pageId: String(fetched.page.id),
    pageUrl: extractConfluencePageUrl(fetched.page) || null,
    title: fetched.page.title || null,
    versionNumber: Number(fetched.page?.version?.number || 0) || null,
    storageValue: fetched.page?.body?.storage?.value || "",
  };
}

function normalizeLifecycleStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeRuntimeType(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function listActiveBackupCandidates({ supabase, eventIds = [] }) {
  const explicitIdSet = new Set(normalizeEventIds(eventIds));
  const candidates = [];
  let from = 0;
  const pageSize = DEFAULT_SCAN_PAGE_SIZE;

  while (true) {
    let data = null;
    let error = null;
    ({ data, error } = await supabase
      .from("Event")
      .select("id,name,lifecycle_status,runtime_type")
      .range(from, from + pageSize - 1));
    if (error && isMissingColumnError(error, "runtime_type")) {
      ({ data, error } = await supabase
        .from("Event")
        .select("id,name,lifecycle_status")
        .range(from, from + pageSize - 1));
    }
    if (error) {
      throw new Error(`Failed to list events for backup sweep: ${error.message}`);
    }
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const eventId = typeof row?.id === "string" ? row.id.trim() : "";
      if (!eventId) continue;
      if (explicitIdSet.size > 0 && !explicitIdSet.has(eventId)) continue;

      const runtimeType = normalizeRuntimeType(row?.runtime_type);
      if (runtimeType && runtimeType !== "hackday_template") continue;

      const lifecycleStatus = normalizeLifecycleStatus(row?.lifecycle_status);
      if (ACTIVE_EVENT_EXCLUDED_LIFECYCLE.has(lifecycleStatus)) continue;

      candidates.push({
        eventId,
        eventName: typeof row?.name === "string" && row.name.trim() ? row.name.trim() : eventId,
        lifecycleStatus: lifecycleStatus || "unknown",
        runtimeType: runtimeType || "hdc_native",
      });
    }

    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 250_000) break;
  }

  candidates.sort((a, b) => a.eventName.localeCompare(b.eventName));
  return candidates;
}

async function runBackupSweep({
  source,
  eventIds = [],
  dryRun = false,
  maxEvents,
  logger = console,
}) {
  const supabase = getSupabaseClient();
  const startedAtMs = Date.now();
  const normalizedIds = normalizeEventIds(eventIds);
  const candidateEvents = await listActiveBackupCandidates({ supabase, eventIds: normalizedIds });
  const missingRequestedEventIds =
    normalizedIds.length > 0
      ? normalizedIds.filter((eventId) => !candidateEvents.some((candidate) => candidate.eventId === eventId))
      : [];
  const safeMaxEvents = Number.isFinite(Number(maxEvents))
    ? Math.max(1, Math.floor(Number(maxEvents)))
    : candidateEvents.length;
  const targetEvents = candidateEvents.slice(0, safeMaxEvents);
  const results = [];

  for (const candidate of targetEvents) {
    if (dryRun) {
      results.push({
        eventId: candidate.eventId,
        eventName: candidate.eventName,
        lifecycleStatus: candidate.lifecycleStatus,
        runtimeType: candidate.runtimeType,
        status: "planned",
      });
      continue;
    }

    try {
      const snapshot = await createEventBackupSnapshot({
        supabase,
        eventId: candidate.eventId,
        source,
        actorUserId: null,
        fetchPageStorageById: getConfluencePageStorageForBackup,
        logger,
      });
      results.push({
        eventId: candidate.eventId,
        eventName: candidate.eventName,
        lifecycleStatus: candidate.lifecycleStatus,
        runtimeType: candidate.runtimeType,
        status: "created",
        snapshotId: snapshot.snapshotId,
        createdAt: snapshot.createdAt,
        warningCount: Array.isArray(snapshot.warnings) ? snapshot.warnings.length : 0,
      });
    } catch (error) {
      results.push({
        eventId: candidate.eventId,
        eventName: candidate.eventName,
        lifecycleStatus: candidate.lifecycleStatus,
        runtimeType: candidate.runtimeType,
        status: "failed",
        error: normalizeErrorMessage(error),
      });
    }
  }

  for (const missingId of missingRequestedEventIds) {
    results.push({
      eventId: missingId,
      eventName: missingId,
      status: "skipped_not_found_or_inactive",
    });
  }

  const createdCount = results.filter((row) => row.status === "created").length;
  const failedCount = results.filter((row) => row.status === "failed").length;
  const plannedCount = results.filter((row) => row.status === "planned").length;
  const skippedCount = results.filter((row) => row.status === "skipped_not_found_or_inactive").length;

  return {
    generatedAtUtc: nowIso(),
    source,
    dryRun,
    requestedEventIds: normalizedIds,
    requestedCount: normalizedIds.length,
    candidateCount: candidateEvents.length,
    processedCount: targetEvents.length,
    createdCount,
    plannedCount,
    failedCount,
    skippedCount,
    durationMs: Math.max(0, Date.now() - startedAtMs),
    results,
  };
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": ["application/json"] },
    body: JSON.stringify(payload),
  };
}

function parseWebtriggerBody(body) {
  if (!body || !String(body).trim()) return {};
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export const scheduledHandler = async () => {
  const maxEvents = parsePositiveInt(process.env.HDC_EVENT_BACKUP_DAILY_MAX_EVENTS, DEFAULT_DAILY_MAX_EVENTS);
  const summary = await runBackupSweep({
    source: "daily",
    maxEvents,
    dryRun: false,
    logger: console,
  });
  console.info("[event-backup-daily]", JSON.stringify(summary));
  return summary;
};

export const predeployHandler = async (request) => {
  if (request?.method && request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed. Use POST." });
  }

  try {
    const payload = parseWebtriggerBody(request?.body);
    const action = String(payload?.action || "predeploy_snapshot")
      .trim()
      .toLowerCase();
    if (action !== "predeploy_snapshot") {
      return jsonResponse(400, { error: "Unsupported action. Use predeploy_snapshot." });
    }

    const parsedMaxEvents = payload?.maxEvents == null ? undefined : parsePositiveInt(payload?.maxEvents, NaN);
    const summary = await runBackupSweep({
      source: "predeploy",
      eventIds: normalizeEventIds(payload?.eventIds || payload?.eventId || []),
      dryRun: parseBoolean(payload?.dryRun, false),
      maxEvents: Number.isFinite(parsedMaxEvents) ? parsedMaxEvents : undefined,
      logger: console,
    });
    return jsonResponse(200, summary);
  } catch (error) {
    return jsonResponse(500, { error: normalizeErrorMessage(error) });
  }
};
