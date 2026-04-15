import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "./supabase";
import {
  CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS,
  CONFIG_MODE_SCHEDULE_EVENT_SIGNALS,
  normalizeConfigModeContentOverridesEnvelope as normalizeConfigModeContentOverridesEnvelopeHelper,
  normalizeConfigModeDraftPatch as normalizeConfigModeDraftPatchHelper,
  normalizeConfigModeDraftEnvelope as normalizeConfigModeDraftEnvelopeHelper,
  mergeConfigModeDraftPatches as mergeConfigModeDraftPatchesHelper,
} from "./configModeHelpers.mjs";
import {
  assertConfigModeAccessAllowed,
} from "./configModeResolverCore.mjs";
import {
  getEventBackupCoverageStatus,
} from "./eventBackup.mjs";
import {
  DEBUG_LOGS,
  TELEMETRY_SUMMARY_KEY,
  EVENT_MOTD_STORAGE_KEY_PREFIX,
  EVENT_CONFIG_DRAFT_STORAGE_KEY_PREFIX,
  EVENT_CONTENT_OVERRIDES_STORAGE_KEY_PREFIX,
  NOT_VIABLE_IDEAS_STORAGE_KEY_PREFIX,
  TEAM_DETAIL_FIELDS_STORAGE_KEY_PREFIX,
  ADMIN_RESET_LOCK_KEY_PREFIX,
  ADMIN_RESET_SEED_META_KEY_PREFIX,
  ACTIVE_APP_MODE_CONTEXT_STORAGE_KEY_PREFIX,
  MOTD_PRIORITIES,
  HACKDAY_OWNER_EMAILS,
  HACKDAY_OWNER_ACCOUNT_IDS,
  HACKDAY_OWNER_NAMES,
  HACKDAY_OWNER_TITLE,
  OBSERVERS_TEAM_ID,
  OBSERVERS_MAX_SIZE,
  SUPABASE_BATCH_SIZE,
  NOTIFICATION_BATCH_SIZE,
  TELEMETRY_MAX_ENTRIES,
  JOIN_REASON_MAX_LENGTH,
  INVITE_EXPIRY_DAYS,
  APP_MODE_CONTEXT_SCHEMA_VERSION,
  APP_MODE_CONTEXT_TTL_MS,
  EVENT_THEME_PRESETS,
  APP_MODE_RUNTIME_SOURCES,
  RESET_SEED_PROFILE_BALANCED_V1,
  SEED_USER_EMAIL_PREFIX,
  SUPPORTED_RESET_SEED_PROFILES,
  HDC_RUNTIME_CONFIG_ERROR_CODE,
  HDC_RUNTIME_OWNER,
  HACKDAY_SUBMISSION_PAGE_LINK_TABLE,
  SUBMISSIONS_PARENT_PAGE_PROPERTY_KEY,
  SUBMISSIONS_PARENT_TITLE,
  FULL_WIDTH_PAGE_PROPERTY_KEYS,
  FULL_WIDTH_PAGE_APPEARANCE,
  HDC_PERF_RUNTIME_BOOTSTRAP_V2,
  PHASE_MAP,
  ROLE_MAP,
  REVERSE_ROLE_MAP,
  REVERSE_PHASE_MAP,
  BALANCED_SEED_USERS,
  BALANCED_SEED_TEAMS,
  BALANCED_SEED_PENDING_INVITES,
} from "./constants.js";

/**
 * Fetch user profile from Confluence API
 * Returns email if available (depends on user's privacy settings)
 */
export async function fetchUserProfile(accountId) {
  try {
    const response = await api.asUser().requestConfluence(
      route`/wiki/rest/api/user?accountId=${accountId}`,
      { headers: { Accept: "application/json" } }
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        accountId: data.accountId,
        displayName: data.displayName || data.publicName,
        email: data.email || null, // May be empty due to privacy settings
        avatarUrl: data.profilePicture?.path || null,
      };
    }
    return null;
  } catch (err) {
    console.warn("Failed to fetch user profile:", err.message);
    return null;
  }
}

export function escapeStorageText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function parseConfluenceJson(response, operation) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${operation} failed (${response.status}): ${body}`);
  }
  return body ? JSON.parse(body) : {};
}

export async function requestConfluencePageById(pageId, requester = "app") {
  const actor = requester === "user" ? api.asUser() : api.asApp();
  const response = await actor.requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return parseConfluenceJson(response, `Fetch page ${pageId}`);
}

export async function fetchConfluencePageWithFallback(pageId) {
  for (const requester of ["app", "user"]) {
    try {
      const page = await requestConfluencePageById(pageId, requester);
      return { page, requester };
    } catch {
      // Continue to the next requester.
    }
  }
  return null;
}

export function extractConfluencePageUrl(pagePayload) {
  const base = pagePayload?._links?.base || "";
  const webui = pagePayload?._links?.webui || "";
  return base && webui ? `${base}${webui}` : "";
}

export async function updateConfluencePageStorage({ page, requester = "app", storageValue, versionMessage }) {
  const actor = requester === "user" ? api.asUser() : api.asApp();
  const payload = {
    id: page.id,
    status: page.status || "current",
    title: page.title || `HackDay ${page.id}`,
    ...(page.spaceId ? { spaceId: String(page.spaceId) } : {}),
    ...(page.parentId ? { parentId: String(page.parentId) } : {}),
    version: {
      number: Number(page?.version?.number || 0) + 1,
      message: versionMessage || "Update HackDay submission page content",
    },
    body: {
      representation: "storage",
      value: storageValue,
    },
  };

  const response = await actor.requestConfluence(route`/wiki/api/v2/pages/${page.id}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  await parseConfluenceJson(response, `Update page ${page.id}`);
}

export async function getConfluencePagePropertyByKey(pageId, propertyKey, requester = "app") {
  const actor = requester === "user" ? api.asUser() : api.asApp();
  const response = await actor.requestConfluence(
    route`/wiki/api/v2/pages/${pageId}/properties?key=${propertyKey}&limit=1`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );
  const payload = await parseConfluenceJson(response, `Read property ${propertyKey} for page ${pageId}`);
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results[0] || null;
}

export async function upsertConfluencePageProperty(pageId, propertyKey, value, requester = "app") {
  const actor = requester === "user" ? api.asUser() : api.asApp();
  const existing = await getConfluencePagePropertyByKey(pageId, propertyKey, requester);
  if (existing?.id) {
    const response = await actor.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties/${existing.id}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: propertyKey,
        value,
        version: {
          number: Number(existing?.version?.number || 1) + 1,
          message: "Update page property",
        },
      }),
    });
    await parseConfluenceJson(response, `Update property ${propertyKey} for page ${pageId}`);
    return;
  }

  const response = await actor.requestConfluence(route`/wiki/api/v2/pages/${pageId}/properties`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: propertyKey,
      value,
    }),
  });
  await parseConfluenceJson(response, `Create property ${propertyKey} for page ${pageId}`);
}

export async function ensureConfluencePageFullWidth(pageId) {
  for (const propertyKey of FULL_WIDTH_PAGE_PROPERTY_KEYS) {
    let updated = false;
    for (const requester of ["app", "user"]) {
      try {
        await upsertConfluencePageProperty(pageId, propertyKey, FULL_WIDTH_PAGE_APPEARANCE, requester);
        updated = true;
        break;
      } catch {
        // Try the next requester.
      }
    }
    if (!updated) {
      throw new Error(`Unable to set full-width page property ${propertyKey} for page ${pageId}`);
    }
  }
}

export async function createConfluenceChildPage({ parentPageId, title, storageValue }) {
  const parent = await fetchConfluencePageWithFallback(parentPageId);
  if (!parent?.page?.spaceId) {
    throw new Error(`Unable to resolve parent metadata for page ${parentPageId}`);
  }

  for (const requester of ["app", "user"]) {
    try {
      const actor = requester === "user" ? api.asUser() : api.asApp();
      const response = await actor.requestConfluence(route`/wiki/api/v2/pages`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "current",
          title,
          spaceId: String(parent.page.spaceId),
          parentId: parentPageId,
          body: {
            storage: {
              representation: "storage",
              value: storageValue,
            },
          },
        }),
      });
      const payload = await parseConfluenceJson(response, `Create child page under ${parentPageId}`);
      await ensureConfluencePageFullWidth(payload.id);
      return {
        pageId: String(payload.id),
        pageUrl: extractConfluencePageUrl(payload),
      };
    } catch {
      // Try the next requester.
    }
  }

  throw new Error(`Unable to create child page "${title}" under ${parentPageId}`);
}

export async function ensureSubmissionsParentPage(eventPageId) {
  const normalizedPageId = normalizeConfluencePageId(eventPageId);
  if (!normalizedPageId) {
    throw new Error("A numeric event page id is required to ensure submissions parent page.");
  }

  const linkedPageIds = [];
  for (const requester of ["app", "user"]) {
    try {
      const property = await getConfluencePagePropertyByKey(normalizedPageId, SUBMISSIONS_PARENT_PAGE_PROPERTY_KEY, requester);
      const linkedPageId = normalizeConfluencePageId(property?.value);
      if (linkedPageId) linkedPageIds.push(linkedPageId);
    } catch {
      // Continue.
    }
  }

  for (const linkedPageId of [...new Set(linkedPageIds)]) {
    const existingPage = await fetchConfluencePageWithFallback(linkedPageId);
    if (existingPage?.page?.id) {
      return {
        pageId: linkedPageId,
        pageUrl: extractConfluencePageUrl(existingPage.page),
      };
    }
  }

  const created = await createConfluenceChildPage({
    parentPageId: normalizedPageId,
    title: SUBMISSIONS_PARENT_TITLE,
    storageValue: `<h1>${escapeStorageText(SUBMISSIONS_PARENT_TITLE)}</h1><p>Container page for HackDay submissions.</p>`,
  });

  for (const requester of ["app", "user"]) {
    try {
      await upsertConfluencePageProperty(normalizedPageId, SUBMISSIONS_PARENT_PAGE_PROPERTY_KEY, created.pageId, requester);
      break;
    } catch {
      // Best effort only.
    }
  }

  return created;
}

export async function getConfluencePageStorageForBackup(pageId) {
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

export async function restoreConfluencePageStorageFromBackup({ pageId, storageValue }) {
  const fetched = await fetchConfluencePageWithFallback(pageId);
  if (!fetched?.page?.id) {
    throw new Error(`Unable to resolve page ${pageId} for restore.`);
  }
  await updateConfluencePageStorage({
    page: fetched.page,
    requester: fetched.requester,
    storageValue: typeof storageValue === "string" ? storageValue : "",
    versionMessage: "Restore page content from HackDay backup snapshot",
  });
}

export async function appendEventBackupAuditLog(supabase, { eventId, actorUserId, action, newValue, previousValue = null }) {
  if (!eventId || !action) return;
  if (!actorUserId) return;

  try {
    const { error } = await supabase.from("EventAuditLog").insert({
      id: randomUUID(),
      event_id: eventId,
      actor_user_id: actorUserId,
      action,
      previous_value: previousValue,
      new_value: newValue ?? null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("[event-backup] EventAuditLog insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[event-backup] EventAuditLog insert exception:", err?.message || String(err));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive the caller's Atlassian accountId from Forge context.
 * If a payload accountId is supplied, assert it matches to prevent spoofing.
 */
export function getCallerAccountId(req) {
  const contextAccountId = req?.context?.accountId;
  const payloadAccountId = req?.payload?.accountId;

  if (contextAccountId && payloadAccountId && payloadAccountId !== contextAccountId) {
    throw new Error("accountId mismatch");
  }

  if (contextAccountId) return contextAccountId;
  if (payloadAccountId) return payloadAccountId;

  throw new Error("Missing accountId (no Forge context available)");
}

export function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

export function normalizeDisplayName(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function isHackdayOwnerIdentity({ email, accountId, displayName, name } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail && HACKDAY_OWNER_EMAILS.has(normalizedEmail)) {
    return true;
  }
  const normalizedName = normalizeDisplayName(displayName || name);
  if (normalizedName && HACKDAY_OWNER_NAMES.has(normalizedName)) {
    return true;
  }
  return typeof accountId === "string" && HACKDAY_OWNER_ACCOUNT_IDS.has(accountId);
}

export function isAdminOrOwner(userOrCaller, accountId) {
  if (userOrCaller?.role === "ADMIN") return true;
  return isHackdayOwnerIdentity({ email: userOrCaller?.email, accountId });
}

export function logDebug(...args) {
  if (DEBUG_LOGS) {
    console.log(...args);
  }
}

export function createTelemetrySummary() {
  return {
    version: 1,
    totalEvents: 0,
    firstEventAt: null,
    lastEventAt: null,
    events: {},
    views: {},
    ctaActions: {},
    funnel: {
      heroImpressions: 0,
      heroCtaClicks: 0,
      welcomeImpressions: 0,
      registerClicks: 0,
      signupCompleted: 0,
      signupFailed: 0,
    },
    signupFlow: {
      flowsStarted: 0,
      flowsCompleted: 0,
      flowsAbandoned: 0,
      stepViews: {
        "1": 0,
        "2": 0,
        "3": 0,
      },
      stepNext: {
        "1": 0,
        "2": 0,
        "3": 0,
      },
      stepBack: {
        "1": 0,
        "2": 0,
        "3": 0,
      },
      stepDropoffs: {
        "1": 0,
        "2": 0,
        "3": 0,
      },
    },
    signupCompletionByAccount: {},
    byDay: {},
  };
}

export function normalizeTelemetrySummary(summary) {
  const base = createTelemetrySummary();
  if (!summary || typeof summary !== "object") return base;

  return {
    ...base,
    ...summary,
    events: { ...base.events, ...(summary.events || {}) },
    views: { ...base.views, ...(summary.views || {}) },
    ctaActions: { ...base.ctaActions, ...(summary.ctaActions || {}) },
    funnel: { ...base.funnel, ...(summary.funnel || {}) },
    signupFlow: {
      ...base.signupFlow,
      ...(summary.signupFlow || {}),
      stepViews: {
        ...base.signupFlow.stepViews,
        ...((summary.signupFlow && summary.signupFlow.stepViews) || {}),
      },
      stepNext: {
        ...base.signupFlow.stepNext,
        ...((summary.signupFlow && summary.signupFlow.stepNext) || {}),
      },
      stepBack: {
        ...base.signupFlow.stepBack,
        ...((summary.signupFlow && summary.signupFlow.stepBack) || {}),
      },
      stepDropoffs: {
        ...base.signupFlow.stepDropoffs,
        ...((summary.signupFlow && summary.signupFlow.stepDropoffs) || {}),
      },
    },
    signupCompletionByAccount: {
      ...(summary.signupCompletionByAccount || {}),
    },
    byDay: { ...(summary.byDay || {}) },
  };
}

export function incrementCounter(counters, key, amount = 1) {
  if (!counters || !key) return;
  counters[key] = (counters[key] || 0) + amount;
}

export function toIsoDay(value) {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

export function ensureDayTelemetryBucket(summary, day) {
  if (!summary.byDay[day]) {
    summary.byDay[day] = {
      events: {},
      ctaActions: {},
      heroImpressions: 0,
      heroCtaClicks: 0,
      welcomeImpressions: 0,
      registerClicks: 0,
      signupCompleted: 0,
      signupFailed: 0,
    };
  }
  return summary.byDay[day];
}

export function pruneTelemetryDays(summary, maxDays = 60) {
  const dayKeys = Object.keys(summary.byDay || {}).sort();
  if (dayKeys.length <= maxDays) return;

  const toDelete = dayKeys.slice(0, dayKeys.length - maxDays);
  for (const day of toDelete) {
    delete summary.byDay[day];
  }
}

export function toPercentage(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export function average(values) {
  if (!values || values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

export function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number((((sorted[middle - 1] + sorted[middle]) / 2)).toFixed(2));
  }
  return Number(sorted[middle].toFixed(2));
}

export function makeId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

export function chunkArray(items, size = SUPABASE_BATCH_SIZE) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function parseTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function pruneSignupCompletionMap(summary, maxEntries = TELEMETRY_MAX_ENTRIES) {
  const entries = Object.entries(summary.signupCompletionByAccount || {});
  if (entries.length <= maxEntries) return;

  entries.sort((a, b) => {
    const aTs = parseTimestamp(a[1]) || 0;
    const bTs = parseTimestamp(b[1]) || 0;
    return bTs - aTs;
  });

  summary.signupCompletionByAccount = Object.fromEntries(entries.slice(0, maxEntries));
}

export function normalizeSignupStep(value) {
  const numericStep = Number(value);
  if (!Number.isFinite(numericStep)) return null;
  if (numericStep < 1 || numericStep > 3) return null;
  return String(Math.trunc(numericStep));
}

export async function getUserByAccountId(supabase, accountId, columns = "id, atlassian_account_id, role, name, isFreeAgent") {
  const { data: userData, error: userError } = await supabase
    .from("User")
    .select(columns)
    .eq("atlassian_account_id", accountId)
    .limit(1);

  const user = userData?.[0];
  if (userError || !user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Get or create the Observers team for an event
 * @param {object} supabase - Supabase client
 * @param {string} eventId - Event ID
 * @returns {Promise<{id: string, error: string|null}>}
 */
export async function getOrCreateObserversTeam(supabase, eventId) {
  try {
    // Try to find existing Observers team
    const { data: existingTeam, error: findError } = await supabase
      .from("Team")
      .select("id")
      .eq("eventId", eventId)
      .eq("name", "Observers")
      .limit(1);

    if (findError && findError.code !== "PGRST116") throw findError;

    if (existingTeam && existingTeam.length > 0) {
      return { id: existingTeam[0].id, error: null };
    }

    // Create Observers team if it doesn't exist
    const observersTeamId = OBSERVERS_TEAM_ID;
    const { data: newTeam, error: createError } = await supabase
      .from("Team")
      .insert({
        id: observersTeamId,
        eventId: eventId,
        name: "Observers",
        description: "Watch and learn from the sidelines",
        maxSize: OBSERVERS_MAX_SIZE,
        trackSide: "HUMAN", // Default, can be changed
        isPublic: true,
        isAutoCreated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select("id")
      .limit(1);

    if (createError) throw createError;
    return { id: newTeam?.[0]?.id || observersTeamId, error: null };
  } catch (err) {
    console.error("Error getting/creating Observers team:", err);
    return { id: null, error: err.message };
  }
}

/**
 * Automatically assign free agents to Observers team
 * @param {object} supabase - Supabase client
 * @param {string} eventId - Event ID
 * @returns {Promise<{assigned: number, error: string|null}>}
 */
export async function autoAssignFreeAgentsToObservers(supabase, eventId) {
  try {
    // Get or create Observers team
    const { id: observersTeamId, error: teamError } = await getOrCreateObserversTeam(supabase, eventId);
    if (teamError || !observersTeamId) {
      throw new Error(`Failed to get Observers team: ${teamError}`);
    }

    // Find all free agents (users with isFreeAgent = true)
    const { data: freeAgents, error: agentsError } = await supabase
      .from("User")
      .select("id, name, email")
      .eq("isFreeAgent", true);

    if (agentsError) throw agentsError;

    if (!freeAgents || freeAgents.length === 0) {
      return { assigned: 0, error: null };
    }

    // Check which users are already on teams
    const userIds = freeAgents.map(u => u.id);
    const { data: existingMembers, error: membersError } = await supabase
      .from("TeamMember")
      .select("userId")
      .in("userId", userIds)
      .eq("status", "ACCEPTED");

    if (membersError) throw membersError;

    const usersOnTeams = new Set((existingMembers || []).map(m => m.userId));
    const usersToAssign = freeAgents.filter(u => !usersOnTeams.has(u.id));

    if (usersToAssign.length === 0) {
      return { assigned: 0, error: null };
    }

    // Add users to Observers team
    const teamMembers = usersToAssign.map(user => ({
      id: makeId("tm"),
      teamId: observersTeamId,
      userId: user.id,
      role: "MEMBER",
      status: "ACCEPTED",
      createdAt: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("TeamMember")
      .insert(teamMembers);

    if (insertError) throw insertError;

    // Update isFreeAgent flag for assigned users
    const assignedUserIds = usersToAssign.map(u => u.id);
    const { error: updateError } = await supabase
      .from("User")
      .update({ isFreeAgent: false, updatedAt: new Date().toISOString() })
      .in("id", assignedUserIds);

    if (updateError) throw updateError;

    logDebug(`Auto-assigned ${usersToAssign.length} free agents to Observers team`);
    return { assigned: usersToAssign.length, error: null };
  } catch (err) {
    console.error("Error auto-assigning free agents:", err);
    return { assigned: 0, error: err.message };
  }
}

/**
 * Check if hack start is within 24-48 hours and send reminders to free agents.
 * Creates REMINDER notifications for eligible free agents (with duplicate prevention).
 * @param {object} supabase - Supabase client
 * @param {string} eventId - Event ID
 * @param {string} startDate - Event start date (ISO string)
 * @returns {Promise<{notified: number, error: string|null}>}
 */
export async function checkAndSendFreeAgentReminders(supabase, eventId, startDate) {
  try {
    if (!startDate) {
      logDebug(`[reminders] No start date set for event ${eventId}, skipping reminders`);
      return { notified: 0, error: null };
    }

    const now = new Date();
    const hackStart = new Date(startDate);
    const hoursUntilHack = (hackStart - now) / (1000 * 60 * 60);

    // Check if within 24-48 hour window
    if (hoursUntilHack < 24 || hoursUntilHack > 48) {
      logDebug(`Hack start is ${hoursUntilHack.toFixed(1)} hours away, outside reminder window`);
      return { notified: 0, error: null };
    }

    // Find all free agents who haven't joined a team
    const { data: freeAgents, error: agentsError } = await supabase
      .from("User")
      .select("id, name, email, isFreeAgent")
      .eq("isFreeAgent", true);

    if (agentsError) throw agentsError;

    if (!freeAgents || freeAgents.length === 0) {
      return { notified: 0, error: null };
    }

    // Check which users are already on teams
    const userIds = freeAgents.map(u => u.id);
    const { data: existingMembers } = await supabase
      .from("TeamMember")
      .select("userId")
      .in("userId", userIds)
      .eq("status", "ACCEPTED");

    const usersOnTeams = new Set((existingMembers || []).map(m => m.userId));
    const usersToNotify = freeAgents.filter(u => !usersOnTeams.has(u.id));

    if (usersToNotify.length === 0) {
      return { notified: 0, error: null };
    }

    const hoursUntilHackRounded = Math.floor(hoursUntilHack);
    const usersToNotifyIds = usersToNotify.map((u) => u.id);

    // Batch duplicate check in a single query.
    const { data: existingReminders, error: reminderLookupError } = await supabase
      .from("Notification")
      .select("userId")
      .in("userId", usersToNotifyIds)
      .eq("type", "REMINDER")
      .eq("read", false);

    if (reminderLookupError) throw reminderLookupError;

    const usersWithUnreadReminder = new Set((existingReminders || []).map((r) => r.userId));
    const reminderRows = usersToNotify
      .filter((user) => !usersWithUnreadReminder.has(user.id))
      .map((user) => ({
        id: `notif-reminder-${randomUUID()}-${user.id}`,
        userId: user.id,
        type: "REMINDER",
        title: "Team Formation Reminder",
        message: `Hack starts in ${hoursUntilHackRounded} hours! Join a team or opt-in for auto-assignment.`,
        actionUrl: "marketplace",
      }));

    if (reminderRows.length === 0) {
      return { notified: 0, error: null };
    }

    const { error: insertError } = await supabase
      .from("Notification")
      .insert(reminderRows);

    if (insertError) throw insertError;

    logDebug(`Reminder check: ${reminderRows.length} of ${usersToNotify.length} free agents notified`);
    return { notified: reminderRows.length, error: null };
  } catch (err) {
    console.error("Error checking reminders:", err);
    return { notified: 0, error: err.message };
  }
}

/**
 * Normalize a page id value to a Confluence numeric page id string.
 * Accepts raw ids or URLs containing ?pageId=<id>.
 */
export function normalizeConfluencePageId(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const fromQuery = trimmed.match(/[?&]pageId=(\d+)/i);
  if (fromQuery) {
    return fromQuery[1];
  }

  return null;
}

/**
 * Extract Confluence pageId from Forge resolver request context.
 *
 * Important:
 * - Resolver payload is user-controlled. Do not prioritize it over trusted
 *   context-derived page ids by default, otherwise callers can spoof context.
 * - `preferPayload` should only be enabled for controlled app-mode flows where
 *   the backend stores and validates page/event bindings.
 */
export function getConfluencePageId(req, { allowPayloadFallback = true, preferPayload = false } = {}) {
  if (allowPayloadFallback && preferPayload) {
    const fromPayload = normalizeConfluencePageId(req?.payload?.pageId);
    if (fromPayload) {
      return fromPayload;
    }
  }

  const fromContent = normalizeConfluencePageId(req?.context?.extension?.content?.id);
  if (fromContent) {
    return fromContent;
  }

  const fromPage = normalizeConfluencePageId(req?.context?.extension?.page?.id);
  if (fromPage) {
    return fromPage;
  }

  // Global-page app-mode requests expose pageId via extension.location query.
  const fromExtensionLocation = normalizeConfluencePageId(req?.context?.extension?.location);
  if (fromExtensionLocation) {
    return fromExtensionLocation;
  }

  if (allowPayloadFallback) {
    const fromPayload = normalizeConfluencePageId(req?.payload?.pageId);
    if (fromPayload) {
      return fromPayload;
    }
  }

  return null;
}

export function isUuidLike(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeSiteBaseUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }
  if (/^[a-z0-9.-]+$/i.test(trimmed)) {
    return `https://${trimmed}`.replace(/\/+$/, "");
  }
  return null;
}

export function extractRuntimeRouteIdsFromLocalId(localIdValue) {
  if (typeof localIdValue !== "string" || !localIdValue.trim()) {
    return null;
  }
  const uuidSegments = localIdValue
    .split(/[/:]/)
    .map((segment) => segment.trim())
    .filter((segment) => isUuidLike(segment));
  if (uuidSegments.length < 2) {
    return null;
  }
  return {
    appId: uuidSegments[uuidSegments.length - 2],
    environmentId: uuidSegments[uuidSegments.length - 1],
  };
}

export function resolveForgeRouteId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isUuidLike(trimmed)) return trimmed;

  const ariMatch = trimmed.match(
    /(?:\/app\/|::app\/)([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i
  );
  return ariMatch?.[1] || null;
}

export function uniqueStrings(values) {
  return [...new Set(values)];
}

export function createRuntimeConfigDiagnostics({ routeSource, missingVars = [] }) {
  const normalizedMissingVars = uniqueStrings(
    Array.isArray(missingVars)
      ? missingVars.filter((item) => typeof item === "string" && item.trim())
      : []
  );
  return {
    owner: HDC_RUNTIME_OWNER,
    configValid: normalizedMissingVars.length === 0,
    missingVars: normalizedMissingVars,
    routeSource,
  };
}

export function logRuntimeConfigFailure(message, diagnostics) {
  console.error(
    "[runtime-config]",
    JSON.stringify({
      errorCode: HDC_RUNTIME_CONFIG_ERROR_CODE,
      message,
      owner: diagnostics.owner,
      configValid: diagnostics.configValid,
      missingVars: diagnostics.missingVars,
      routeSource: diagnostics.routeSource,
    })
  );
}

export function createRuntimeConfigError(message, diagnostics) {
  const error = new Error(`[${HDC_RUNTIME_CONFIG_ERROR_CODE}] ${message}`);
  error.code = HDC_RUNTIME_CONFIG_ERROR_CODE;
  error.diagnostics = diagnostics;
  logRuntimeConfigFailure(message, diagnostics);
  return error;
}

export function resolveRuntimeRouteIdsFromEnvironment() {
  const runtimeAppId = String(process.env.HDC_RUNTIME_APP_ID || "").trim();
  const forgeAppId = String(process.env.FORGE_APP_ID || "").trim();
  const runtimeEnvironmentId = String(process.env.HDC_RUNTIME_ENVIRONMENT_ID || "").trim();
  const forgeEnvironmentId = String(process.env.FORGE_ENVIRONMENT_ID || "").trim();
  const appId = resolveForgeRouteId(runtimeAppId || forgeAppId);
  const environmentIdCandidate = runtimeEnvironmentId || forgeEnvironmentId;
  const environmentId = isUuidLike(environmentIdCandidate) ? environmentIdCandidate : null;
  const missingVars = [];
  if (!runtimeAppId && !forgeAppId) {
    missingVars.push("HDC_RUNTIME_APP_ID", "FORGE_APP_ID");
  }
  if (!runtimeEnvironmentId && !forgeEnvironmentId) {
    missingVars.push("HDC_RUNTIME_ENVIRONMENT_ID", "FORGE_ENVIRONMENT_ID");
  }
  return {
    appId,
    environmentId,
    missingVars: uniqueStrings(missingVars),
  };
}

export function buildAppModeLaunchUrlFromContext(req, pageId) {
  const normalizedPageId = normalizeConfluencePageId(pageId);
  if (!normalizedPageId) {
    throw new Error("Missing pageId for app-mode launch URL");
  }

  const localIdValue =
    req?.context?.localId ||
    req?.context?.extension?.localId ||
    req?.context?.extensionContext?.localId ||
    null;
  const routeIdsFromLocalId = extractRuntimeRouteIdsFromLocalId(localIdValue);
  const routeIdsFromEnvironment = resolveRuntimeRouteIdsFromEnvironment();
  const routeIds = routeIdsFromLocalId || routeIdsFromEnvironment;
  if (!routeIds?.appId || !routeIds?.environmentId) {
    throw createRuntimeConfigError(
      "Unable to resolve app route context from localId or HDC_RUNTIME_APP_ID/HDC_RUNTIME_ENVIRONMENT_ID.",
      createRuntimeConfigDiagnostics({
        routeSource: "runtime_launch_route_env",
        missingVars: routeIdsFromEnvironment?.missingVars || [],
      })
    );
  }

  const path = `/wiki/apps/${routeIds.appId}/${routeIds.environmentId}/hackday-app?pageId=${encodeURIComponent(normalizedPageId)}`;
  const siteBaseUrl = normalizeSiteBaseUrl(req?.context?.siteUrl);
  const routeContextSource = routeIdsFromLocalId ? "local_id" : "environment";

  return {
    pageId: normalizedPageId,
    appId: routeIds.appId,
    environmentId: routeIds.environmentId,
    owner: HDC_RUNTIME_OWNER,
    configValid: true,
    missingVars: [],
    routeSource: routeContextSource,
    routeContextSource,
    path,
    url: siteBaseUrl ? `${siteBaseUrl}${path}` : path,
  };
}

export function isAppModeRequest(req) {
  if (req?.payload?.appMode === true) {
    return true;
  }

  const moduleKey = String(req?.context?.moduleKey || req?.context?.extension?.moduleKey || "").toLowerCase();
  if (moduleKey === "hackday-global-nav" || moduleKey.includes("global-nav")) {
    return true;
  }

  const extensionType = String(req?.context?.extension?.type || "").toLowerCase();
  return extensionType.includes("globalpage") || extensionType.includes("global-page");
}

export function buildAppModeContextRequiredResult(message = "Open a HackDay page and launch App View again.") {
  return {
    pageId: null,
    eventId: null,
    event: null,
    setupRequired: false,
    runtimeSource: APP_MODE_RUNTIME_SOURCES.REQUIRED,
    contextError: {
      code: "APP_MODE_CONTEXT_REQUIRED",
      message,
    },
  };
}

export function normalizeSupabaseErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function hasMissingTable(error, tableName) {
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  const table = String(tableName || "").toLowerCase();
  return (
    message.includes(`relation "${table}" does not exist`) ||
    message.includes(`could not find the table '${table}'`) ||
    message.includes(`failed to find table '${table}'`)
  );
}

export function extractMissingEventColumn(error) {
  const message = normalizeSupabaseErrorMessage(error);
  const quoted = message.match(/column\s+"Event"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = message.match(/column\s+Event\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = message.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Event' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

export function extractEventNotNullColumn(error) {
  const message = normalizeSupabaseErrorMessage(error);
  const match = message.match(/null value in column "([a-zA-Z0-9_]+)" of relation "Event" violates not-null constraint/i);
  return match ? match[1] : null;
}

export function extractMissingMilestoneColumn(error) {
  const message = normalizeSupabaseErrorMessage(error);
  const quoted = message.match(/column\s+"Milestone"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = message.match(/column\s+Milestone\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = message.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Milestone' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

export function normalizeEventUpdatePayload(updatePayload) {
  const next = {};
  for (const [key, value] of Object.entries(updatePayload || {})) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

export async function updateEventWithSchemaFallback(supabase, eventId, updatePayload) {
  const initialCandidate = normalizeEventUpdatePayload(updatePayload);
  if (!eventId || Object.keys(initialCandidate).length === 0) {
    return { appliedPayload: initialCandidate };
  }

  const queue = [initialCandidate];
  const seen = new Set();
  let lastError = null;

  while (queue.length > 0) {
    const candidate = queue.shift();
    const signature = JSON.stringify(
      Object.entries(candidate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, value ?? null])
    );
    if (seen.has(signature)) continue;
    seen.add(signature);

    const { error } = await supabase
      .from("Event")
      .update(candidate)
      .eq("id", eventId);

    if (!error) {
      return { appliedPayload: candidate };
    }

    lastError = error;
    const missingColumn = extractMissingEventColumn(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(candidate, missingColumn)) {
      const withoutMissing = { ...candidate };
      delete withoutMissing[missingColumn];
      if (Object.keys(withoutMissing).length > 0) {
        console.warn(`Retrying Event update without missing column "${missingColumn}"`);
        queue.push(withoutMissing);
        continue;
      }
    }

    break;
  }

  throw lastError;
}

export function normalizeSeedPayload(seed) {
  const payload = seed?.seed_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload;
}

export async function getEventById(supabase, eventId) {
  if (!eventId) return null;
  try {
    const { data, error } = await supabase
      .from("Event")
      .select("*")
      .eq("id", eventId)
      .limit(1);

    if (error) {
      console.warn("Error loading Event by id:", error.code, error.message);
      return null;
    }
    return data?.[0] || null;
  } catch (err) {
    console.warn("Exception loading Event by id:", err.message);
    return null;
  }
}

export async function getEventByConfluencePageId(supabase, pageId) {
  if (!pageId) return null;
  try {
    const { data, error } = await supabase
      .from("Event")
      .select("*")
      .eq("confluence_page_id", pageId)
      .limit(1);

    if (error) {
      const missingColumn = extractMissingEventColumn(error);
      if (missingColumn === "confluence_page_id") {
        return null;
      }
      console.warn("Error loading Event by confluence_page_id:", error.code, error.message);
      return null;
    }
    return data?.[0] || null;
  } catch (err) {
    const missingColumn = extractMissingEventColumn(err);
    if (missingColumn === "confluence_page_id") {
      return null;
    }
    console.warn("Exception loading Event by confluence_page_id:", err.message);
    return null;
  }
}

export async function getTemplateSeedByPageId(supabase, pageId) {
  if (!pageId) return null;
  try {
    const { data, error } = await supabase
      .from("HackdayTemplateSeed")
      .select("*")
      .eq("confluence_page_id", pageId)
      .limit(1);

    if (error) {
      if (hasMissingTable(error, "HackdayTemplateSeed")) {
        return null;
      }
      console.warn("Error reading HackdayTemplateSeed:", error.code, error.message);
      return null;
    }
    return data?.[0] || null;
  } catch (err) {
    if (hasMissingTable(err, "HackdayTemplateSeed")) {
      return null;
    }
    console.warn("Exception reading HackdayTemplateSeed:", err.message);
    return null;
  }
}

export function defaultEventFieldValue(column, seed, eventId, pageId, nowIso) {
  const col = String(column || "").toLowerCase();
  const payload = normalizeSeedPayload(seed);
  const basicInfo = payload.basicInfo && typeof payload.basicInfo === "object" ? payload.basicInfo : {};
  const schedule = payload.schedule && typeof payload.schedule === "object" ? payload.schedule : {};
  const templateName =
    (typeof seed?.template_name === "string" && seed.template_name.trim()) ||
    (typeof basicInfo.eventName === "string" && basicInfo.eventName.trim()) ||
    `HackDay Instance ${pageId || "template"}`;
  const eventSlugBase = templateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const eventSlug = `${eventSlugBase || "hackday-instance"}-${String(eventId).slice(0, 8)}`;
  const scheduleStart =
    (typeof schedule.hackingStartsAt === "string" && schedule.hackingStartsAt) ||
    (typeof schedule.registrationOpensAt === "string" && schedule.registrationOpensAt) ||
    nowIso;
  const scheduleEnd =
    (typeof schedule.submissionDeadlineAt === "string" && schedule.submissionDeadlineAt) ||
    (typeof schedule.resultsAnnounceAt === "string" && schedule.resultsAnnounceAt) ||
    scheduleStart;

  if (col === "id") return eventId;
  if (col === "name" || col === "title") return templateName;
  if (col === "slug") return eventSlug;
  if (col === "year") return new Date().getUTCFullYear();
  if (col === "phase") return "SETUP";
  if (col === "rubric_config") return {};
  if (col === "iscurrent") return false;
  if (col === "maxvotesperuser") return 3;
  if (col === "motd") return "";
  if (col === "startdate" || col === "start_date") return scheduleStart;
  if (col === "enddate" || col === "end_date") return scheduleEnd;
  if (col === "createdat" || col === "updatedat" || col === "created_at" || col === "updated_at") return nowIso;
  if (col === "timezone") return "Europe/London";
  if (col === "lifecycle_status") return "draft";
  if (col === "event_schedule") return schedule;
  if (col === "event_rules") return payload.rules && typeof payload.rules === "object" ? payload.rules : {};
  if (col === "event_branding") return payload.branding && typeof payload.branding === "object" ? payload.branding : {};
  if (col === "confluence_page_id") return pageId || null;
  if (col === "confluence_parent_page_id") return seed?.confluence_parent_page_id || null;
  if (col === "creation_request_id") return `hdc-template-${String(pageId || eventId).slice(0, 32)}`;
  if (col === "runtime_type") return "hackday_template";
  if (col === "template_target") return "hackday";

  return null;
}

export async function createEventFromTemplateSeed(supabase, seed, pageId) {
  const nowIso = new Date().toISOString();
  const preferredEventId =
    (typeof seed?.hackday_event_id === "string" && seed.hackday_event_id) ||
    (typeof seed?.hdc_event_id === "string" && seed.hdc_event_id) ||
    crypto.randomUUID();

  const existingPreferredEvent = await getEventById(supabase, preferredEventId);
  if (existingPreferredEvent) {
    return existingPreferredEvent;
  }

  const payload = {
    id: preferredEventId,
    name: defaultEventFieldValue("name", seed, preferredEventId, pageId, nowIso),
    phase: defaultEventFieldValue("phase", seed, preferredEventId, pageId, nowIso),
    isCurrent: false,
    maxVotesPerUser: 1,
    startDate: defaultEventFieldValue("startDate", seed, preferredEventId, pageId, nowIso),
    endDate: defaultEventFieldValue("endDate", seed, preferredEventId, pageId, nowIso),
    createdAt: nowIso,
    updatedAt: nowIso,
    slug: defaultEventFieldValue("slug", seed, preferredEventId, pageId, nowIso),
    year: defaultEventFieldValue("year", seed, preferredEventId, pageId, nowIso),
    rubric_config: {},
    lifecycle_status: "draft",
    runtime_type: "hackday_template",
    template_target: "hackday",
    confluence_page_id: pageId || null,
    confluence_parent_page_id: seed?.confluence_parent_page_id || null,
    creation_request_id: defaultEventFieldValue("creation_request_id", seed, preferredEventId, pageId, nowIso),
  };

  if (seed?.branding && typeof seed.branding === "object") {
    payload.event_branding = seed.branding;
  }

  const queue = [payload];
  const seen = new Set();
  let lastError = null;

  while (queue.length > 0) {
    const candidate = queue.shift();
    const signature = JSON.stringify(
      Object.entries(candidate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, value ?? null])
    );
    if (seen.has(signature)) continue;
    seen.add(signature);

    const { data, error } = await supabase
      .from("Event")
      .insert(candidate)
      .select("*")
      .limit(1);

    if (!error) {
      return data?.[0] || candidate;
    }

    lastError = error;
    const normalized = normalizeSupabaseErrorMessage(error).toLowerCase();

    if (normalized.includes("23505") || normalized.includes("duplicate key value violates unique constraint")) {
      const existing = await getEventById(supabase, preferredEventId);
      if (existing) {
        return existing;
      }
    }

    const missingColumn = extractMissingEventColumn(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(candidate, missingColumn)) {
      const withoutMissing = { ...candidate };
      delete withoutMissing[missingColumn];
      queue.push(withoutMissing);
    }

    const notNullColumn = extractEventNotNullColumn(error);
    if (notNullColumn && !Object.prototype.hasOwnProperty.call(candidate, notNullColumn)) {
      queue.push({
        ...candidate,
        [notNullColumn]: defaultEventFieldValue(notNullColumn, seed, preferredEventId, pageId, nowIso),
      });
    }
  }

  const message = normalizeSupabaseErrorMessage(lastError);
  throw new Error(`Failed to bootstrap Event from HackdayTemplateSeed: ${message}`);
}

export async function markTemplateSeedInitialized(supabase, seed, eventId) {
  if (!seed?.confluence_page_id || !eventId) return;
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("HackdayTemplateSeed")
      .update({
        hackday_event_id: eventId,
        provision_status: "initialized",
        initialized_at: seed.initialized_at || nowIso,
        updated_at: nowIso,
      })
      .eq("confluence_page_id", seed.confluence_page_id);

    if (error) {
      console.warn("Failed to mark template seed initialized:", error.code, error.message);
    }
  } catch (err) {
    console.warn("Exception marking template seed initialized:", err.message);
  }
}

export async function createMilestonesFromSchedule(supabase, event, seed) {
  if (!event?.id) {
    return { success: false, created: 0 };
  }

  try {
    // Check if milestones already exist for this event (idempotent)
    const { data: existingMilestones, error: checkError } = await supabase
      .from("Milestone")
      .select("id")
      .eq("eventId", event.id)
      .limit(1);

    if (checkError) {
      console.warn("Failed to check existing milestones:", checkError.code, checkError.message);
      return { success: false, created: 0 };
    }

    // If milestones already exist, skip creation (idempotent)
    if (existingMilestones && existingMilestones.length > 0) {
      return { success: true, created: 0 };
    }

    const payload = normalizeSeedPayload(seed);
    const schedule = payload.schedule;

    // Return early if no schedule data exists
    if (!schedule || typeof schedule !== "object") {
      return { success: true, created: 0 };
    }

    // Map schedule fields to milestone phases
    const milestoneDefinitions = [
      {
        field: "registrationOpensAt",
        phase: "REGISTRATION",
        title: "Registration Open",
        description: "Registration opens for HackDay",
      },
      {
        field: "registrationClosesAt",
        phase: "REGISTRATION",
        title: "Registration Closes",
        description: "Final deadline to register",
      },
      {
        field: "teamFormationStartsAt",
        phase: "TEAM_FORMATION",
        title: "Team Formation Opens",
        description: "Start forming teams in the Marketplace",
      },
      {
        field: "teamFormationEndsAt",
        phase: "TEAM_FORMATION",
        title: "Team Formation Closes",
        description: "Final deadline to join a team",
      },
      {
        field: "openingCeremonyAt",
        phase: "HACKING",
        title: "Opening Ceremony",
        description: "Kickoff event and announcements",
      },
      {
        field: "hackingStartsAt",
        phase: "HACKING",
        title: "Hacking Begins",
        description: "Start building your projects",
      },
      {
        field: "lunchBreakDay1At",
        phase: "HACKING",
        title: "Lunch Break (Day 1)",
        description: "Scheduled lunch break",
      },
      {
        field: "lunchBreakDay2At",
        phase: "HACKING",
        title: "Lunch Break (Day 2)",
        description: "Scheduled lunch break",
      },
      {
        field: "lunchBreakDay3At",
        phase: "HACKING",
        title: "Lunch Break (Day 3)",
        description: "Scheduled lunch break",
      },
      {
        field: "afternoonCheckinDay1At",
        phase: "HACKING",
        title: "Afternoon Check-in (Day 1)",
        description: "Mid-day standup or Q&A",
      },
      {
        field: "afternoonCheckinDay2At",
        phase: "HACKING",
        title: "Afternoon Check-in (Day 2)",
        description: "Mid-day standup or Q&A",
      },
      {
        field: "afternoonCheckinDay3At",
        phase: "HACKING",
        title: "Afternoon Check-in (Day 3)",
        description: "Mid-day standup or Q&A",
      },
      {
        field: "dinnerBreakDay1At",
        phase: "HACKING",
        title: "Dinner Break (Day 1)",
        description: "Scheduled dinner break",
      },
      {
        field: "dinnerBreakDay2At",
        phase: "HACKING",
        title: "Dinner Break (Day 2)",
        description: "Scheduled dinner break",
      },
      {
        field: "dinnerBreakDay3At",
        phase: "HACKING",
        title: "Dinner Break (Day 3)",
        description: "Scheduled dinner break",
      },
      {
        field: "eveningCheckinDay1At",
        phase: "HACKING",
        title: "Evening Check-in (Day 1)",
        description: "End of day updates",
      },
      {
        field: "eveningCheckinDay2At",
        phase: "HACKING",
        title: "Evening Check-in (Day 2)",
        description: "End of day updates",
      },
      {
        field: "submissionDeadlineAt",
        phase: "SUBMISSION",
        title: "Code Freeze & Submission Deadline",
        description: "Final deadline for project submissions",
      },
      {
        field: "presentationsAt",
        phase: "SUBMISSION",
        title: "Project Presentations",
        description: "Teams present their projects",
      },
      {
        field: "votingStartsAt",
        phase: "VOTING",
        title: "Voting Opens",
        description: "Community voting begins",
      },
      {
        field: "votingEndsAt",
        phase: "VOTING",
        title: "Voting Closes",
        description: "Voting period ends",
      },
      {
        field: "judgingStartsAt",
        phase: "JUDGING",
        title: "Judging Period",
        description: "Judges evaluate submissions",
      },
      {
        field: "resultsAnnounceAt",
        phase: "RESULTS",
        title: "Awards Ceremony",
        description: "Results announcement and celebration",
      },
    ];

    // Build milestones array from schedule data
    const milestones = [];
    for (const def of milestoneDefinitions) {
      const startTime = schedule[def.field];
      if (typeof startTime === "string") {
        milestones.push({
          id: randomUUID(),
          eventId: event.id,
          title: def.title,
          description: def.description,
          phase: def.phase,
          startTime,
          endTime: null,
          location: null,
        });
      }
    }

    // If no milestones to create, return early
    if (milestones.length === 0) {
      return { success: true, created: 0 };
    }

    // Batch insert all milestones
    const { error } = await supabase.from("Milestone").insert(milestones);

    if (error) {
      console.warn("Failed to create milestones from schedule:", error.code, error.message);
      return { success: false, created: 0 };
    }

    console.log(`Created ${milestones.length} milestones from schedule for event ${event.id}`);
    return { success: true, created: milestones.length };
  } catch (err) {
    console.warn("Exception creating milestones from schedule:", err.message);
    return { success: false, created: 0 };
  }
}

export async function resolveInstanceContext(
  supabase,
  req,
  { allowPayloadPageId = true, preferPayloadPageId = false, allowBootstrapWrites = true } = {}
) {
  const pageId = getConfluencePageId(req, {
    allowPayloadFallback: allowPayloadPageId,
    preferPayload: allowPayloadPageId && preferPayloadPageId,
  });

  if (!pageId) {
    logDebug("[resolveInstanceContext] No trusted pageId in context");
    return {
      pageId: null,
      eventId: null,
      event: null,
      seed: null,
      setupRequired: false,
      runtimeSource: "missing_page_context",
    };
  }

  const seed = await getTemplateSeedByPageId(supabase, pageId);
  if (!seed) {
    const pageMappedEvent = await getEventByConfluencePageId(supabase, pageId);
    if (pageMappedEvent) {
      return {
        pageId,
        eventId: pageMappedEvent.id || null,
        event: pageMappedEvent,
        seed: null,
        setupRequired: false,
        runtimeSource: "event_page_mapping",
      };
    }
    logDebug("[resolveInstanceContext] No seed or page mapping for pageId:", pageId);
    return {
      pageId,
      eventId: null,
      event: null,
      seed: null,
      setupRequired: false,
      runtimeSource: "unmapped_page",
    };
  }

  const mappedHackdayEventId =
    typeof seed.hackday_event_id === "string" && seed.hackday_event_id
      ? seed.hackday_event_id
      : null;
  const mappedHdcEventId =
    typeof seed.hdc_event_id === "string" && seed.hdc_event_id
      ? seed.hdc_event_id
      : null;

  let event = null;
  let runtimeSource = "seed_bootstrap";

  if (mappedHackdayEventId) {
    const hackdayEvent = await getEventById(supabase, mappedHackdayEventId);
    if (hackdayEvent) {
      const mappedPageId = normalizeConfluencePageId(hackdayEvent.confluence_page_id);
      if (mappedPageId === pageId) {
        event = hackdayEvent;
        runtimeSource = "seed_mapping";
      } else {
        logDebug(
          "[resolveInstanceContext] Ignoring seed.hackday_event_id due to page mismatch:",
          mappedHackdayEventId,
          "eventPageId=",
          mappedPageId,
          "currentPageId=",
          pageId
        );
      }
    }
  }

  // Back-compat: some seeds only carry hdc_event_id. Reuse only when it is explicitly page-bound.
  // Otherwise bootstrap a dedicated page-scoped event to prevent cross-page data bleed.
  if (!event && mappedHdcEventId) {
    const hdcEvent = await getEventById(supabase, mappedHdcEventId);
    if (hdcEvent) {
      const mappedPageId = normalizeConfluencePageId(hdcEvent.confluence_page_id);
      if (mappedPageId === pageId) {
        event = hdcEvent;
        runtimeSource = "seed_hdc_event";
      } else {
        logDebug(
          "[resolveInstanceContext] Ignoring seed.hdc_event_id due to page mismatch:",
          mappedHdcEventId,
          "eventPageId=",
          mappedPageId,
          "currentPageId=",
          pageId
        );
      }
    }
  }

  if (!event && allowBootstrapWrites) {
    event = await createEventFromTemplateSeed(supabase, seed, pageId);
    runtimeSource = "seed_bootstrap";
  }

  if (!event && !allowBootstrapWrites) {
    return {
      pageId,
      eventId: null,
      event: null,
      seed,
      setupRequired: true,
      runtimeSource: "seed_pending_bootstrap",
    };
  }

  if (event && allowBootstrapWrites) {
    // Create milestones from schedule (idempotent - skips if already exist)
    await createMilestonesFromSchedule(supabase, event, seed);
    await markTemplateSeedInitialized(supabase, seed, event.id);
  }

  return {
    pageId,
    eventId: event?.id || null,
    event: event || null,
    seed,
    setupRequired: !event,
    runtimeSource,
  };
}

export async function resolveActiveAppModeContext(supabase, req) {
  const accountId = getCallerAccountId(req);
  const storedContext = await getStoredActiveAppModeContext(accountId);
  if (!storedContext) {
    return null;
  }

  try {
    const appModeReq = {
      ...req,
      payload: {
        ...(req?.payload || {}),
        pageId: storedContext.pageId,
      },
    };
    const resolved = await resolveInstanceContext(supabase, appModeReq, {
      allowPayloadPageId: true,
      preferPayloadPageId: true,
      allowBootstrapWrites: !HDC_PERF_RUNTIME_BOOTSTRAP_V2,
    });
    if (!resolved?.event || !resolved?.pageId) {
      await clearStoredActiveAppModeContext(accountId);
      return null;
    }

    if (resolved.pageId !== storedContext.pageId) {
      await clearStoredActiveAppModeContext(accountId);
      return null;
    }

    if (storedContext.eventId && resolved.event.id !== storedContext.eventId) {
      await clearStoredActiveAppModeContext(accountId);
      return null;
    }

    return {
      ...resolved,
      runtimeSource: APP_MODE_RUNTIME_SOURCES.ACTIVE,
    };
  } catch (err) {
    console.warn("Failed to resolve active app-mode context:", err.message);
    await clearStoredActiveAppModeContext(accountId);
    return null;
  }
}

/**
 * Resolve current event with page-scoped context first.
 * Non-page invocations intentionally return no event context.
 */
export async function getCurrentEventContext(
  supabase,
  req,
  { allowBootstrapWrites = !HDC_PERF_RUNTIME_BOOTSTRAP_V2 } = {}
) {
  // Reuse pre-resolved context from bootstrap to avoid redundant lookups.
  if (req._bootstrapContext) {
    return req._bootstrapContext;
  }

  try {
    if (isAppModeRequest(req)) {
      // 1) Always resolve trusted Confluence page context first.
      const trustedContext = await resolveInstanceContext(supabase, req, {
        allowPayloadPageId: false,
        allowBootstrapWrites,
      });
      if (trustedContext?.event || trustedContext?.pageId) {
        return trustedContext;
      }

      // 2) If no trusted page context exists, honor explicit payload pageId.
      const payloadContext = await resolveInstanceContext(supabase, req, {
        allowPayloadPageId: true,
        preferPayloadPageId: true,
        allowBootstrapWrites,
      });
      if (payloadContext?.event || payloadContext?.pageId) {
        return payloadContext;
      }

      // 3) Fallback to active app-mode context only for true global app mode.
      const activeContext = await resolveActiveAppModeContext(supabase, req);
      if (activeContext?.event) {
        return activeContext;
      }

      return buildAppModeContextRequiredResult();
    }

    const context = await resolveInstanceContext(supabase, req, { allowBootstrapWrites });
    if (!context.event && context.runtimeSource === "missing_page_context") {
      const globalEvent = await getLatestEventForGlobalContext(supabase);
      if (globalEvent) {
        return {
          pageId: null,
          eventId: globalEvent.id || null,
          event: globalEvent,
          setupRequired: false,
          runtimeSource: "global_latest_event",
        };
      }
    }
    if (context.event) {
      logDebug("[getCurrentEvent] Resolved event", context.event.id, "source=", context.runtimeSource);
    }
    return context;
  } catch (err) {
    if (isAppModeRequest(req)) {
      return buildAppModeContextRequiredResult("Unable to restore app context. Open a HackDay page and launch App View again.");
    }
    const pageId = getConfluencePageId(req);
    if (pageId) {
      console.warn("Error resolving page-scoped instance context:", err.message);
      return {
        pageId,
        eventId: null,
        event: null,
        setupRequired: false,
        runtimeSource: "context_error",
      };
    }
    console.warn("Error resolving non-page instance context:", err.message);
    return {
      pageId: null,
      eventId: null,
      event: null,
      setupRequired: false,
      runtimeSource: "context_error",
    };
  }
}

export async function getCurrentEvent(supabase, req) {
  const context = await getCurrentEventContext(supabase, req);
  return context?.event || null;
}

export function getSeedAdminEmails(seed) {
  const primary = normalizeEmail(String(seed?.primary_admin_email || "").trim());
  const coAdmins = Array.isArray(seed?.co_admin_emails)
    ? seed.co_admin_emails.map((raw) => normalizeEmail(String(raw || "").trim())).filter(Boolean)
    : [];
  return { primary, coAdmins };
}

export function hasSeedEmailAdminAccess(seed, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!seed || !normalizedEmail) {
    return false;
  }
  const { primary, coAdmins } = getSeedAdminEmails(seed);
  return normalizedEmail === primary || coAdmins.includes(normalizedEmail);
}

export async function getRuntimeActorPermissionContext(supabase, accountId, { logScope = "runtime" } = {}) {
  const { data: userRows, error: userError } = await supabase
    .from("User")
    .select("id, role, name, callsign, email, atlassian_account_id")
    .eq("atlassian_account_id", accountId)
    .limit(1);
  if (userError) {
    throw new Error(`Failed to resolve user permissions: ${userError.message}`);
  }

  const userRow = userRows?.[0] || null;
  let email = normalizeEmail(userRow?.email || "");
  let displayName = userRow?.name || userRow?.callsign || null;

  if (!email || !displayName) {
    try {
      const profile = await fetchUserProfile(accountId);
      email = email || normalizeEmail(profile?.email || "");
      displayName = displayName || profile?.displayName || null;
    } catch (err) {
      logDebug(`[${logScope}] fetchUserProfile failed:`, err.message);
    }
  }

  return {
    userRow,
    email,
    displayName,
    isPlatformAdmin: userRow?.role === "ADMIN",
  };
}

export async function resolveRuntimeEventAdminAccess(supabase, {
  eventId,
  userRow,
  seed,
  email,
  logScope = "runtime",
} = {}) {
  if (eventId && isUuidLike(userRow?.id)) {
    try {
      const { data: eventAdminRows, error: eventAdminError } = await supabase
        .from("EventAdmin")
        .select("id, role")
        .eq("event_id", eventId)
        .eq("user_id", userRow.id)
        .limit(1);
      if (eventAdminError) {
        throw new Error(eventAdminError.message);
      }
      if (eventAdminRows?.length) {
        return { isEventAdmin: true, eventAdminSource: "event_admin" };
      }
    } catch (err) {
      logDebug(`[${logScope}] EventAdmin lookup failed:`, err.message);
    }
  }

  const isSeedAdmin = hasSeedEmailAdminAccess(seed, email);
  return {
    isEventAdmin: isSeedAdmin,
    eventAdminSource: isSeedAdmin ? "seed_email" : "none",
  };
}

export async function resolveConfigModeAccess(supabase, req) {
  const accountId = getCallerAccountId(req);
  const instanceContext = isAppModeRequest(req)
    ? await getCurrentEventContext(supabase, req)
    : await resolveInstanceContext(supabase, req, { allowPayloadPageId: false });
  const event = instanceContext?.event;

  if (!instanceContext?.pageId) {
    throw new Error("Config Mode requires a page-scoped HackDay context");
  }

  if (!event) {
    throw new Error("No event context for this page");
  }

  const pageId = instanceContext?.pageId || null;
  const seed = pageId ? await getTemplateSeedByPageId(supabase, pageId) : null;
  const { userRow, email, displayName, isPlatformAdmin } = await getRuntimeActorPermissionContext(supabase, accountId, {
    logScope: "resolveConfigModeAccess",
  });
  const { isEventAdmin, eventAdminSource } = await resolveRuntimeEventAdminAccess(supabase, {
    eventId: event.id,
    userRow,
    seed,
    email,
    logScope: "resolveConfigModeAccess",
  });

  const canUseConfigMode = Boolean(isPlatformAdmin || isEventAdmin);
  assertConfigModeAccessAllowed({ isPlatformAdmin, isEventAdmin });

  return {
    accountId,
    event,
    instanceContext,
    pageId,
    seed,
    userRow,
    actor: {
      accountId,
      displayName: displayName || userRow?.name || userRow?.callsign || "Admin",
      email: email || null,
    },
    isPlatformAdmin,
    isEventAdmin,
    eventAdminSource,
    canUseConfigMode,
  };
}

export async function getLatestEventForGlobalContext(supabase) {
  const orderPlans = [
    { primary: "updatedAt", fallback: "createdAt" },
    { primary: "updated_at", fallback: "created_at" },
    { primary: "createdAt", fallback: null },
    { primary: "created_at", fallback: null },
  ];

  for (const plan of orderPlans) {
    try {
      let query = supabase
        .from("Event")
        .select("*")
        .order(plan.primary, { ascending: false });

      if (plan.fallback) {
        query = query.order(plan.fallback, { ascending: false });
      }

      const { data, error } = await query.limit(1);
      if (error) {
        continue;
      }

      const event = data?.[0];
      if (event) {
        return event;
      }
    } catch {
      // Try the next ordering strategy.
    }
  }

  return null;
}

export function getEventMotdStorageKey(eventId) {
  return `${EVENT_MOTD_STORAGE_KEY_PREFIX}${eventId}`;
}

export function getEventConfigDraftStorageKey(eventId) {
  return `${EVENT_CONFIG_DRAFT_STORAGE_KEY_PREFIX}${eventId}`;
}

export function getEventContentOverridesStorageKey(eventId) {
  return `${EVENT_CONTENT_OVERRIDES_STORAGE_KEY_PREFIX}${eventId}`;
}

export function getNotViableIdeasStorageKey(eventId) {
  return `${NOT_VIABLE_IDEAS_STORAGE_KEY_PREFIX}${eventId}`;
}

export function getTeamDetailFieldsStorageKey(teamId) {
  return `${TEAM_DETAIL_FIELDS_STORAGE_KEY_PREFIX}${teamId}`;
}

export function getAdminResetLockStorageKey(eventId) {
  return `${ADMIN_RESET_LOCK_KEY_PREFIX}${eventId}`;
}

export function getAdminResetSeedMetaStorageKey(eventId) {
  return `${ADMIN_RESET_SEED_META_KEY_PREFIX}${eventId}`;
}

export function getActiveAppModeContextStorageKey(accountId) {
  return `${ACTIVE_APP_MODE_CONTEXT_STORAGE_KEY_PREFIX}${accountId}`;
}

export function normalizeActiveAppModeContextEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const schemaVersion = Number(value.schemaVersion);
  const pageId = normalizeConfluencePageId(value.pageId);
  const eventId = typeof value.eventId === "string" && value.eventId.trim() ? value.eventId.trim() : null;
  const activatedAt = typeof value.activatedAt === "string" ? value.activatedAt : null;
  const expiresAt = typeof value.expiresAt === "string" ? value.expiresAt : null;
  const activatedMs = activatedAt ? Date.parse(activatedAt) : Number.NaN;
  const expiresMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;

  if (
    schemaVersion !== APP_MODE_CONTEXT_SCHEMA_VERSION ||
    !pageId ||
    !eventId ||
    Number.isNaN(activatedMs) ||
    Number.isNaN(expiresMs) ||
    expiresMs <= Date.now()
  ) {
    return null;
  }

  return {
    schemaVersion: APP_MODE_CONTEXT_SCHEMA_VERSION,
    pageId,
    eventId,
    activatedAt: new Date(activatedMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

export async function getStoredActiveAppModeContext(accountId) {
  if (!accountId) return null;
  const storageKey = getActiveAppModeContextStorageKey(accountId);

  try {
    const raw = await storage.get(storageKey);
    const normalized = normalizeActiveAppModeContextEnvelope(raw);
    if (!normalized) {
      if (raw !== undefined && raw !== null) {
        await storage.delete(storageKey);
      }
      return null;
    }
    return normalized;
  } catch (err) {
    console.warn("Failed to read active app-mode context:", err.message);
    return null;
  }
}

export async function setStoredActiveAppModeContext(accountId, context) {
  if (!accountId) return null;

  const normalizedPageId = normalizeConfluencePageId(context?.pageId);
  const normalizedEventId =
    typeof context?.eventId === "string" && context.eventId.trim() ? context.eventId.trim() : null;
  if (!normalizedPageId || !normalizedEventId) {
    throw new Error("Cannot persist app-mode context without pageId and eventId");
  }

  const activatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + APP_MODE_CONTEXT_TTL_MS).toISOString();
  const envelope = {
    schemaVersion: APP_MODE_CONTEXT_SCHEMA_VERSION,
    pageId: normalizedPageId,
    eventId: normalizedEventId,
    activatedAt,
    expiresAt,
  };

  await storage.set(getActiveAppModeContextStorageKey(accountId), envelope);
  return envelope;
}

export async function clearStoredActiveAppModeContext(accountId) {
  if (!accountId) return;
  try {
    await storage.delete(getActiveAppModeContextStorageKey(accountId));
  } catch (err) {
    console.warn("Failed to clear active app-mode context:", err.message);
  }
}

export function normalizeMotdMessage(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return {
      title: "",
      message: trimmed,
      priority: "info",
      updatedAt: null,
      updatedBy: null,
    };
  }

  if (!value || typeof value !== "object") {
    return {
      title: "",
      message: "",
      priority: "info",
      updatedAt: null,
      updatedBy: null,
    };
  }

  const normalizedPriority = MOTD_PRIORITIES.has(value.priority) ? value.priority : "info";

  return {
    title: typeof value.title === "string" ? value.title.trim() : "",
    message: typeof value.message === "string" ? value.message.trim() : "",
    priority: normalizedPriority,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    updatedBy: typeof value.updatedBy === "string" ? value.updatedBy : null,
  };
}

export async function getStoredEventMotd(eventId) {
  if (!eventId) return undefined;

  try {
    const storedValue = await storage.get(getEventMotdStorageKey(eventId));
    if (storedValue === undefined || storedValue === null) {
      return undefined;
    }

    return normalizeMotdMessage(storedValue);
  } catch (err) {
    console.warn("Failed to read MOTD from storage:", err.message);
    return undefined;
  }
}

export async function setStoredEventMotd(eventId, motdMessage) {
  if (!eventId) return;

  try {
    const normalized = normalizeMotdMessage(motdMessage);
    await storage.set(getEventMotdStorageKey(eventId), normalized);
  } catch (err) {
    throw new Error(`Failed to persist MOTD: ${err.message}`);
  }
}

export async function restoreStoredEventMotd(eventId, previousValue) {
  if (!eventId) return;

  const storageKey = getEventMotdStorageKey(eventId);
  if (previousValue === undefined) {
    await storage.delete(storageKey);
    return;
  }

  await storage.set(storageKey, previousValue);
}

export function normalizeConfigModeContentOverridesEnvelope(value) {
  return normalizeConfigModeContentOverridesEnvelopeHelper(value);
}

export function normalizeConfigModeBrandingPatch(value) {
  return normalizeConfigModeDraftPatchHelper({ branding: value }).branding;
}

export function sanitizeManagedBrandingValue(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const next = {};
  if (value.accentColor !== undefined && value.accentColor !== null) {
    next.accentColor = String(value.accentColor).trim();
  }
  if (value.bannerImageUrl !== undefined && value.bannerImageUrl !== null) {
    next.bannerImageUrl = String(value.bannerImageUrl).trim();
  }
  if (value.heroIconImageUrl !== undefined && value.heroIconImageUrl !== null) {
    next.heroIconImageUrl = String(value.heroIconImageUrl).trim();
  }
  if (value.newToHackdayImageUrl !== undefined && value.newToHackdayImageUrl !== null) {
    next.newToHackdayImageUrl = String(value.newToHackdayImageUrl).trim();
  }
  if (value.themePreference !== undefined && value.themePreference !== null) {
    const pref = String(value.themePreference).trim();
    if (["light", "dark", "system"].includes(pref)) {
      next.themePreference = pref;
    }
  }
  if (value.themePreset !== undefined && value.themePreset !== null) {
    const preset = String(value.themePreset).trim();
    next.themePreset = EVENT_THEME_PRESETS.has(preset) ? preset : "default";
  }

  return next;
}

export function normalizeConfigModeMotdPatch(value) {
  return normalizeConfigModeDraftPatchHelper({ motdMessage: value }).motdMessage;
}

export function normalizeConfigModeContentOverridesPatch(value) {
  return normalizeConfigModeDraftPatchHelper({ contentOverrides: value }).contentOverrides;
}

export function normalizeConfigModeDraftPatch(value, { strict = false } = {}) {
  return normalizeConfigModeDraftPatchHelper(value, { strict });
}

export function mergeConfigModeDraftPatches(basePatch, patchUpdates) {
  return mergeConfigModeDraftPatchesHelper(basePatch, patchUpdates);
}

export function normalizeConfigModeDraftEnvelope(value) {
  return normalizeConfigModeDraftEnvelopeHelper(value);
}

export async function getStoredEventConfigDraft(eventId) {
  if (!eventId) return null;
  try {
    const stored = await storage.get(getEventConfigDraftStorageKey(eventId));
    return normalizeConfigModeDraftEnvelope(stored);
  } catch (err) {
    console.warn("Failed to read Config Mode draft from storage:", err.message);
    return null;
  }
}

export async function setStoredEventConfigDraft(eventId, draftEnvelope) {
  if (!eventId) return;
  const normalized = normalizeConfigModeDraftEnvelope(draftEnvelope);
  await storage.set(getEventConfigDraftStorageKey(eventId), normalized);
}

export async function clearStoredEventConfigDraft(eventId) {
  if (!eventId) return;
  await storage.delete(getEventConfigDraftStorageKey(eventId));
}

export async function getStoredEventContentOverrides(eventId) {
  if (!eventId) return normalizeConfigModeContentOverridesEnvelope(null);
  try {
    const stored = await storage.get(getEventContentOverridesStorageKey(eventId));
    return normalizeConfigModeContentOverridesEnvelope(stored);
  } catch (err) {
    console.warn("Failed to read content overrides from storage:", err.message);
    return normalizeConfigModeContentOverridesEnvelope(null);
  }
}

export async function setStoredEventContentOverrides(eventId, envelope) {
  if (!eventId) return;
  const normalized = normalizeConfigModeContentOverridesEnvelope(envelope);
  await storage.set(getEventContentOverridesStorageKey(eventId), normalized);
}

export function normalizeOptionalScheduleString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizeScheduleDuration(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.floor(parsed);
  if (rounded < 1 || rounded > 3) return undefined;
  return rounded;
}

export function normalizeScheduleTimestamp(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

export function normalizeScheduleStringList(value) {
  if (!Array.isArray(value)) return undefined;
  const normalized = Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeScheduleCustomEvents(value) {
  if (!Array.isArray(value)) return undefined;
  const normalized = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const name = normalizeOptionalScheduleString(item.name);
    const description = normalizeOptionalScheduleString(item.description);
    const timestamp = normalizeScheduleTimestamp(item.timestamp);
    const sourceEventId = normalizeOptionalScheduleString(item.sourceEventId);
    const sourcePhaseKey = normalizeOptionalScheduleString(item.sourcePhaseKey);
    const signal = typeof item.signal === "string" ? item.signal.trim() : "";
    if (!name || !timestamp || !CONFIG_MODE_SCHEDULE_EVENT_SIGNALS.has(signal)) continue;
    normalized.push({
      name,
      ...(description ? { description } : {}),
      timestamp,
      signal,
      ...(sourceEventId ? { sourceEventId } : {}),
      ...(sourcePhaseKey ? { sourcePhaseKey } : {}),
    });
  }

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeRuntimeEventSchedule(input, fallback = {}) {
  const schedule = input && typeof input === "object" ? input : {};
  const normalized = {
    timezone:
      normalizeOptionalScheduleString(schedule.timezone) ||
      normalizeOptionalScheduleString(fallback.timezone) ||
      "Europe/London",
  };

  const duration = normalizeScheduleDuration(schedule.duration);
  if (duration !== undefined) {
    normalized.duration = duration;
  }

  const selectedEvents = normalizeScheduleStringList(schedule.selectedEvents);
  if (selectedEvents) {
    normalized.selectedEvents = selectedEvents;
  }

  const customEvents = normalizeScheduleCustomEvents(schedule.customEvents);
  if (customEvents) {
    normalized.customEvents = customEvents;
  }

  const fieldMappings = [
    ["registrationOpensAt", schedule.registrationOpensAt],
    ["registrationClosesAt", schedule.registrationClosesAt],
    ["teamFormationStartsAt", schedule.teamFormationStartsAt],
    ["teamFormationEndsAt", schedule.teamFormationEndsAt],
    ["openingCeremonyAt", schedule.openingCeremonyAt],
    ["hackingStartsAt", schedule.hackingStartsAt || fallback.hackingStartsAt],
    ["lunchBreakDay1At", schedule.lunchBreakDay1At],
    ["afternoonCheckinDay1At", schedule.afternoonCheckinDay1At],
    ["dinnerBreakDay1At", schedule.dinnerBreakDay1At],
    ["eveningCheckinDay1At", schedule.eveningCheckinDay1At],
    ["lunchBreakDay2At", schedule.lunchBreakDay2At],
    ["afternoonCheckinDay2At", schedule.afternoonCheckinDay2At],
    ["dinnerBreakDay2At", schedule.dinnerBreakDay2At],
    ["eveningCheckinDay2At", schedule.eveningCheckinDay2At],
    ["lunchBreakDay3At", schedule.lunchBreakDay3At],
    ["afternoonCheckinDay3At", schedule.afternoonCheckinDay3At],
    ["dinnerBreakDay3At", schedule.dinnerBreakDay3At],
    ["submissionDeadlineAt", schedule.submissionDeadlineAt || fallback.submissionDeadlineAt],
    ["presentationsAt", schedule.presentationsAt],
    ["judgingStartsAt", schedule.judgingStartsAt],
    ["votingStartsAt", schedule.votingStartsAt],
    ["votingEndsAt", schedule.votingEndsAt],
    ["resultsAnnounceAt", schedule.resultsAnnounceAt],
  ];

  for (const [field, rawValue] of fieldMappings) {
    const normalizedTimestamp = normalizeScheduleTimestamp(rawValue);
    if (normalizedTimestamp) {
      normalized[field] = normalizedTimestamp;
    }
  }

  return normalized;
}

export function hasPublishedEventSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") return false;
  if (Array.isArray(schedule.customEvents) && schedule.customEvents.length > 0) return true;

  return [
    "registrationOpensAt",
    "registrationClosesAt",
    "teamFormationStartsAt",
    "teamFormationEndsAt",
    "openingCeremonyAt",
    "hackingStartsAt",
    "lunchBreakDay1At",
    "afternoonCheckinDay1At",
    "dinnerBreakDay1At",
    "eveningCheckinDay1At",
    "lunchBreakDay2At",
    "afternoonCheckinDay2At",
    "dinnerBreakDay2At",
    "eveningCheckinDay2At",
    "lunchBreakDay3At",
    "afternoonCheckinDay3At",
    "dinnerBreakDay3At",
    "submissionDeadlineAt",
    "presentationsAt",
    "judgingStartsAt",
    "votingStartsAt",
    "votingEndsAt",
    "resultsAnnounceAt",
  ].some((field) => typeof schedule[field] === "string" && schedule[field].trim());
}

export function ensureScheduleDateOrder(start, end, message) {
  if (start && end && start > end) {
    throw new Error(message);
  }
}

export function validateEventSchedule(schedule) {
  ensureScheduleDateOrder(
    schedule.registrationOpensAt,
    schedule.registrationClosesAt,
    "Registration close must be after registration open."
  );
  ensureScheduleDateOrder(
    schedule.teamFormationStartsAt,
    schedule.teamFormationEndsAt,
    "Team formation end must be after team formation start."
  );
  ensureScheduleDateOrder(
    schedule.hackingStartsAt,
    schedule.submissionDeadlineAt,
    "Submission deadline must be after the hacking start time."
  );
  ensureScheduleDateOrder(
    schedule.votingStartsAt,
    schedule.votingEndsAt,
    "Voting end must be after voting start."
  );
}

export function parseScheduleTimestampMs(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapScheduleSignalToPhase(signal) {
  switch (signal) {
    case "deadline":
      return "SUBMISSION";
    case "presentation":
      return "SUBMISSION";
    case "judging":
      return "JUDGING";
    case "start":
    case "neutral":
    case "ceremony":
    default:
      return "HACKING";
  }
}

export function buildScheduleMilestonesFromEventSchedule(eventId, schedule) {
  const milestones = [];

  const pushMilestone = (field, phase, title, description, signal) => {
    if (!schedule[field]) return;
    milestones.push({
      eventId,
      title,
      description,
      phase,
      signal: signal || null,
      startTime: schedule[field],
      endTime: null,
      location: null,
    });
  };

  pushMilestone("registrationOpensAt", "REGISTRATION", "Registration Opens", "Portal opens for sign-ups", "start");
  pushMilestone("registrationClosesAt", "REGISTRATION", "Registration Closes", "Final deadline to register", "deadline");
  pushMilestone("teamFormationStartsAt", "TEAM_FORMATION", "Team Formation Opens", "Marketplace opens for team building", "start");
  pushMilestone("teamFormationEndsAt", "TEAM_FORMATION", "Team Formation Closes", "Final deadline to join a team", "deadline");
  pushMilestone("openingCeremonyAt", "HACKING", "Opening Ceremony", "Kickoff and announcements", "ceremony");
  pushMilestone("hackingStartsAt", "HACKING", "Hacking Begins", "Teams start building", "start");

  const legacyHackDayEvents = [
    ["lunchBreakDay1At", "Lunch Break (Day 1)", "Scheduled lunch break", "neutral"],
    ["afternoonCheckinDay1At", "Afternoon Check-in (Day 1)", "Mid-day standup or Q&A", "neutral"],
    ["dinnerBreakDay1At", "Dinner Break (Day 1)", "Scheduled dinner break", "neutral"],
    ["eveningCheckinDay1At", "Evening Check-in (Day 1)", "End of day updates", "neutral"],
    ["lunchBreakDay2At", "Lunch Break (Day 2)", "Scheduled lunch break", "neutral"],
    ["afternoonCheckinDay2At", "Afternoon Check-in (Day 2)", "Mid-day standup or Q&A", "neutral"],
    ["dinnerBreakDay2At", "Dinner Break (Day 2)", "Scheduled dinner break", "neutral"],
    ["eveningCheckinDay2At", "Evening Check-in (Day 2)", "End of day updates", "neutral"],
    ["lunchBreakDay3At", "Lunch Break (Day 3)", "Scheduled lunch break", "neutral"],
    ["afternoonCheckinDay3At", "Afternoon Check-in (Day 3)", "Mid-day standup or Q&A", "neutral"],
    ["dinnerBreakDay3At", "Dinner Break (Day 3)", "Scheduled dinner break", "neutral"],
  ];
  for (const [field, title, description, signal] of legacyHackDayEvents) {
    pushMilestone(field, "HACKING", title, description, signal);
  }

  if (schedule.hackingStartsAt && (schedule.duration || 1) > 1) {
    const duration = schedule.duration || 1;
    const hackStartDate = new Date(schedule.hackingStartsAt);
    const hackStartTime = schedule.hackingStartsAt.includes("T")
      ? schedule.hackingStartsAt.split("T")[1]
      : "09:00:00.000Z";

    for (let dayIndex = 1; dayIndex < duration - 1; dayIndex += 1) {
      const intermediateDate = new Date(hackStartDate);
      intermediateDate.setDate(intermediateDate.getDate() + dayIndex);
      const dateStr = intermediateDate.toISOString().split("T")[0];
      milestones.push({
        eventId,
        title: `Day ${dayIndex + 1} - Hacking Continues`,
        description: "Teams continue building their projects",
        phase: "HACKING",
        signal: "neutral",
        startTime: `${dateStr}T${hackStartTime}`,
        endTime: null,
        location: null,
      });
    }
  }

  pushMilestone("submissionDeadlineAt", "SUBMISSION", "Code Freeze", "Final submissions due", "deadline");
  pushMilestone("presentationsAt", "SUBMISSION", "Presentations", "Teams present their projects", "presentation");
  pushMilestone("judgingStartsAt", "JUDGING", "Judging Period", "Judges evaluate submissions", "judging");
  pushMilestone("votingStartsAt", "VOTING", "Voting Opens", "Community voting begins", "start");
  pushMilestone("votingEndsAt", "VOTING", "Voting Closes", "Community voting ends", "deadline");
  pushMilestone("resultsAnnounceAt", "RESULTS", "Results Announced", "Winners announced and celebrated", "ceremony");

  const hackingStartMs = parseScheduleTimestampMs(schedule.hackingStartsAt);
  for (const customEvent of schedule.customEvents || []) {
    const eventTimestampMs = parseScheduleTimestampMs(customEvent.timestamp);
    if (eventTimestampMs === null) continue;
    const isPreEvent = hackingStartMs !== null && eventTimestampMs < hackingStartMs;
    milestones.push({
      eventId,
      title: customEvent.name,
      description: customEvent.description || null,
      phase: isPreEvent ? "REGISTRATION" : mapScheduleSignalToPhase(customEvent.signal),
      signal: customEvent.signal,
      startTime: customEvent.timestamp,
      endTime: null,
      location: null,
    });
  }

  milestones.sort((left, right) => {
    const leftMs = Date.parse(left.startTime);
    const rightMs = Date.parse(right.startTime);
    if (leftMs !== rightMs) {
      return leftMs - rightMs;
    }
    return String(left.title).localeCompare(String(right.title));
  });

  return milestones;
}

export function getScheduleRangeStart(schedule, fallbackValue = null) {
  return (
    schedule?.registrationOpensAt ||
    schedule?.teamFormationStartsAt ||
    schedule?.openingCeremonyAt ||
    schedule?.hackingStartsAt ||
    schedule?.submissionDeadlineAt ||
    fallbackValue ||
    null
  );
}

export function getScheduleRangeEnd(schedule, fallbackValue = null) {
  return (
    schedule?.resultsAnnounceAt ||
    schedule?.votingEndsAt ||
    schedule?.judgingStartsAt ||
    schedule?.presentationsAt ||
    schedule?.submissionDeadlineAt ||
    schedule?.hackingStartsAt ||
    fallbackValue ||
    null
  );
}

export async function replaceEventMilestonesForSchedule(supabase, eventId, milestones) {
  const { error: deleteError } = await supabase
    .from("Milestone")
    .delete()
    .eq("eventId", eventId);
  if (deleteError) {
    throw new Error(`Failed to clear existing milestones: ${deleteError.message}`);
  }

  if (milestones.length === 0) {
    return { deleted: true, createdCount: 0 };
  }

  const buildPayload = (omitSignalColumn = false) => milestones.map((milestone) => {
    const payload = {
      id: typeof milestone.id === "string" && milestone.id ? milestone.id : randomUUID(),
      eventId: milestone.eventId,
      title: milestone.title,
      description: milestone.description ?? null,
      phase: milestone.phase,
      signal: milestone.signal ?? null,
      startTime: milestone.startTime,
      endTime: milestone.endTime ?? null,
      location: milestone.location ?? null,
    };
    if (omitSignalColumn) {
      delete payload.signal;
    }
    return payload;
  });

  const attemptInsert = async (omitSignalColumn = false) => {
    const { error } = await supabase
      .from("Milestone")
      .insert(buildPayload(omitSignalColumn));
    return error || null;
  };

  let insertError = await attemptInsert(false);
  if (insertError) {
    const missingColumn = extractMissingMilestoneColumn(insertError);
    if (missingColumn?.toLowerCase() === "signal") {
      console.warn('Retrying Milestone insert without missing column "signal"');
      insertError = await attemptInsert(true);
    }
  }
  if (insertError) {
    throw new Error(`Failed to create schedule milestones: ${insertError.message}`);
  }

  return { deleted: true, createdCount: milestones.length };
}

export function normalizeNotViableIdeasMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result = {};
  for (const [teamId, metadata] of Object.entries(value)) {
    if (!teamId || typeof metadata !== "object" || metadata === null) continue;

    result[teamId] = {
      teamId,
      teamName: typeof metadata.teamName === "string" ? metadata.teamName : "",
      markedAt: typeof metadata.markedAt === "string" ? metadata.markedAt : null,
      markedByAccountId:
        typeof metadata.markedByAccountId === "string" ? metadata.markedByAccountId : null,
      reason: typeof metadata.reason === "string" ? metadata.reason : "",
    };
  }

  return result;
}

export async function getStoredNotViableIdeas(eventId) {
  if (!eventId) return {};
  try {
    const storedValue = await storage.get(getNotViableIdeasStorageKey(eventId));
    return normalizeNotViableIdeasMap(storedValue);
  } catch (err) {
    console.warn("Failed to read not-viable ideas from storage:", err.message);
    return {};
  }
}

export async function setStoredNotViableIdeas(eventId, value) {
  if (!eventId) return;
  await storage.set(getNotViableIdeasStorageKey(eventId), normalizeNotViableIdeasMap(value));
}

export function normalizeTeamDetailFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};
  if (Object.prototype.hasOwnProperty.call(value, "problem")) {
    normalized.problem = typeof value.problem === "string" ? value.problem : "";
  }
  if (Object.prototype.hasOwnProperty.call(value, "moreInfo")) {
    normalized.moreInfo = typeof value.moreInfo === "string" ? value.moreInfo : "";
  }
  return normalized;
}

export async function getStoredTeamDetailFields(teamId) {
  if (!teamId) return {};
  try {
    const storedValue = await storage.get(getTeamDetailFieldsStorageKey(teamId));
    return normalizeTeamDetailFields(storedValue);
  } catch (err) {
    console.warn("Failed to read team detail fields from storage:", err.message);
    return {};
  }
}

export async function setStoredTeamDetailFields(teamId, updates) {
  if (!teamId) return;
  const normalizedUpdates = normalizeTeamDetailFields(updates);
  if (Object.keys(normalizedUpdates).length === 0) return;

  try {
    const existing = await getStoredTeamDetailFields(teamId);
    await storage.set(getTeamDetailFieldsStorageKey(teamId), {
      ...existing,
      ...normalizedUpdates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new Error(`Failed to persist team detail fields: ${err.message}`);
  }
}

export async function removeStoredTeamDetailFields(teamId) {
  if (!teamId) return;
  try {
    await storage.delete(getTeamDetailFieldsStorageKey(teamId));
  } catch (err) {
    console.warn("Failed to delete team detail fields from storage:", err.message);
  }
}

export function applyStoredTeamDetailFields(team, storedFields) {
  if (!team || !storedFields || typeof storedFields !== "object") {
    return team;
  }

  const merged = { ...team };
  if (Object.prototype.hasOwnProperty.call(storedFields, "problem")) {
    merged.problem = storedFields.problem;
  }
  if (Object.prototype.hasOwnProperty.call(storedFields, "moreInfo")) {
    merged.moreInfo = storedFields.moreInfo;
  }
  return merged;
}

export async function hydrateTeamDetailFields(team) {
  if (!team?.id) return team;
  const storedFields = await getStoredTeamDetailFields(team.id);
  return applyStoredTeamDetailFields(team, storedFields);
}

export function formatSeedIndex(index) {
  return String(index).padStart(2, "0");
}

export function deterministicSeedUuid(...parts) {
  const payload = `hd26forge-seed:${parts.filter(Boolean).join(":")}`;
  const hash = createHash("sha256").update(payload).digest("hex");
  const timeHighAndVersion = `5${hash.slice(13, 16)}`;
  const clockSeqHigh = ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    timeHighAndVersion,
    `${clockSeqHigh}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

export function getSeedUserId(eventId, index) {
  return deterministicSeedUuid("user", eventId, formatSeedIndex(index));
}

export function getSeedTeamId(eventId, index) {
  return deterministicSeedUuid("team", eventId, formatSeedIndex(index));
}

export function getSeedRegistrationId(eventId, index) {
  return deterministicSeedUuid("registration", eventId, formatSeedIndex(index));
}

export function getSeedMemberId(eventId, index) {
  return deterministicSeedUuid("member", eventId, formatSeedIndex(index));
}

export function normalizeAdminResetSeedMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { userIds: [], teamIds: [] };
  }

  const normalizeIdArray = (input) =>
    Array.from(
      new Set(
        Array.isArray(input) ? input.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean) : []
      )
    );

  return {
    userIds: normalizeIdArray(value.userIds),
    teamIds: normalizeIdArray(value.teamIds),
  };
}

export async function getStoredAdminResetSeedMeta(eventId) {
  if (!eventId) return { userIds: [], teamIds: [] };

  try {
    const storedValue = await storage.get(getAdminResetSeedMetaStorageKey(eventId));
    return normalizeAdminResetSeedMeta(storedValue);
  } catch (err) {
    console.warn("Failed to read reset seed metadata:", err.message);
    return { userIds: [], teamIds: [] };
  }
}

export async function setStoredAdminResetSeedMeta(eventId, value) {
  if (!eventId) return;
  await storage.set(getAdminResetSeedMetaStorageKey(eventId), normalizeAdminResetSeedMeta(value));
}

export async function clearStoredAdminResetSeedMeta(eventId) {
  if (!eventId) return;
  try {
    await storage.delete(getAdminResetSeedMetaStorageKey(eventId));
  } catch (err) {
    console.warn("Failed to delete reset seed metadata:", err.message);
  }
}

export async function cleanupResetSeedData(supabase, eventId) {
  const storedMeta = await getStoredAdminResetSeedMeta(eventId);
  const seedTeamNames = BALANCED_SEED_TEAMS.map((team) => team.name);

  const [{ data: seededUsers, error: seededUsersError }, { data: eventSeedTeams, error: eventSeedTeamsError }] =
    await Promise.all([
      supabase
        .from("User")
        .select("id")
        .like("email", `${SEED_USER_EMAIL_PREFIX}%`),
      supabase
        .from("Team")
        .select("id")
        .eq("eventId", eventId)
        .in("name", seedTeamNames),
    ]);
  if (seededUsersError) throw seededUsersError;
  if (eventSeedTeamsError) throw eventSeedTeamsError;

  const seededUserIds = Array.from(
    new Set([
      ...(storedMeta.userIds || []),
      ...((seededUsers || []).map((row) => row.id).filter(Boolean)),
    ])
  );

  const seededTeamIds = Array.from(
    new Set([
      ...(storedMeta.teamIds || []),
      ...((eventSeedTeams || []).map((row) => row.id).filter(Boolean)),
    ])
  );

  if (seededTeamIds.length > 0) {
    for (const teamId of seededTeamIds) {
      await removeStoredTeamDetailFields(teamId);
    }
  }

  let seededProjectIds = [];
  if (seededTeamIds.length > 0) {
    const { data: seededProjects, error: seededProjectsError } = await supabase
      .from("Project")
      .select("id")
      .in("teamId", seededTeamIds);
    if (seededProjectsError) throw seededProjectsError;
    seededProjectIds = (seededProjects || []).map((row) => row.id).filter(Boolean);
  }

  if (seededProjectIds.length > 0) {
    const { error: voteByProjectError } = await supabase
      .from("Vote")
      .delete()
      .in("projectId", seededProjectIds);
    if (voteByProjectError) throw voteByProjectError;

    const { error: scoreByProjectError } = await supabase
      .from("JudgeScore")
      .delete()
      .in("projectId", seededProjectIds);
    if (scoreByProjectError) throw scoreByProjectError;
  }

  if (seededUserIds.length > 0) {
    const { error: voteByUserError } = await supabase
      .from("Vote")
      .delete()
      .in("userId", seededUserIds);
    if (voteByUserError) throw voteByUserError;

    const { error: scoreByJudgeError } = await supabase
      .from("JudgeScore")
      .delete()
      .in("judgeId", seededUserIds);
    if (scoreByJudgeError) throw scoreByJudgeError;
  }

  if (seededTeamIds.length > 0) {
    const { error: inviteByTeamError } = await supabase
      .from("TeamInvite")
      .delete()
      .in("teamId", seededTeamIds);
    if (inviteByTeamError) throw inviteByTeamError;
  }

  if (seededUserIds.length > 0) {
    const { error: inviteByUserError } = await supabase
      .from("TeamInvite")
      .delete()
      .in("userId", seededUserIds);
    if (inviteByUserError) throw inviteByUserError;
  }

  if (seededTeamIds.length > 0) {
    const { error: memberByTeamError } = await supabase
      .from("TeamMember")
      .delete()
      .in("teamId", seededTeamIds);
    if (memberByTeamError) throw memberByTeamError;
  }

  if (seededUserIds.length > 0) {
    const { error: memberByUserError } = await supabase
      .from("TeamMember")
      .delete()
      .in("userId", seededUserIds);
    if (memberByUserError) throw memberByUserError;
  }

  if (seededUserIds.length > 0) {
    const { error: registrationByUserError } = await supabase
      .from("EventRegistration")
      .delete()
      .in("userId", seededUserIds);
    if (registrationByUserError) throw registrationByUserError;
  }

  if (seededTeamIds.length > 0) {
    const { error: projectByTeamError } = await supabase
      .from("Project")
      .delete()
      .in("teamId", seededTeamIds);
    if (projectByTeamError) throw projectByTeamError;

    const { error: teamDeleteError } = await supabase
      .from("Team")
      .delete()
      .in("id", seededTeamIds);
    if (teamDeleteError) throw teamDeleteError;
  }

  if (seededUserIds.length > 0) {
    const { error: userDeleteError } = await supabase
      .from("User")
      .delete()
      .in("id", seededUserIds);
    if (userDeleteError) throw userDeleteError;
  }

  await clearStoredAdminResetSeedMeta(eventId);
}

export async function resetCurrentEventParticipationGraph(supabase, eventId) {
  const summary = {
    teamsDeleted: 0,
    teamMembersDeleted: 0,
    projectsDeleted: 0,
    votesDeleted: 0,
    judgeScoresDeleted: 0,
    invitesDeleted: 0,
    teamDetailStorageDeleted: 0,
  };

  const { data: eventTeams, error: teamLookupError } = await supabase
    .from("Team")
    .select("id")
    .eq("eventId", eventId);
  if (teamLookupError) throw teamLookupError;

  const eventTeamIds = (eventTeams || []).map((row) => row.id).filter(Boolean);

  let affectedUserIds = [];
  let eventProjectIds = [];
  if (eventTeamIds.length > 0) {
    const [{ data: teamMembers, error: memberLookupError }, { data: eventProjects, error: projectLookupError }] = await Promise.all([
      supabase.from("TeamMember").select("id,userId").in("teamId", eventTeamIds),
      supabase.from("Project").select("id").in("teamId", eventTeamIds),
    ]);
    if (memberLookupError) throw memberLookupError;
    if (projectLookupError) throw projectLookupError;

    affectedUserIds = Array.from(new Set((teamMembers || []).map((row) => row.userId).filter(Boolean)));
    eventProjectIds = (eventProjects || []).map((row) => row.id).filter(Boolean);
  }

  if (eventProjectIds.length > 0) {
    const { data: votesDeletedRows, error: votesDeleteError } = await supabase
      .from("Vote")
      .delete()
      .in("projectId", eventProjectIds)
      .select("id");
    if (votesDeleteError) throw votesDeleteError;
    summary.votesDeleted = (votesDeletedRows || []).length;
  }

  if (eventProjectIds.length > 0) {
    const { data: scoreDeletedRows, error: scoreDeleteError } = await supabase
      .from("JudgeScore")
      .delete()
      .in("projectId", eventProjectIds)
      .select("id");
    if (scoreDeleteError) throw scoreDeleteError;
    summary.judgeScoresDeleted = (scoreDeletedRows || []).length;
  }

  if (eventTeamIds.length > 0) {
    const { data: inviteDeletedRows, error: inviteDeleteError } = await supabase
      .from("TeamInvite")
      .delete()
      .in("teamId", eventTeamIds)
      .select("id");
    if (inviteDeleteError) throw inviteDeleteError;
    summary.invitesDeleted = (inviteDeletedRows || []).length;

    const { data: projectDeletedRows, error: projectDeleteError } = await supabase
      .from("Project")
      .delete()
      .in("teamId", eventTeamIds)
      .select("id");
    if (projectDeleteError) throw projectDeleteError;
    summary.projectsDeleted = (projectDeletedRows || []).length;

    const { data: memberDeletedRows, error: memberDeleteError } = await supabase
      .from("TeamMember")
      .delete()
      .in("teamId", eventTeamIds)
      .select("id");
    if (memberDeleteError) throw memberDeleteError;
    summary.teamMembersDeleted = (memberDeletedRows || []).length;

    const { data: teamDeletedRows, error: teamDeleteError } = await supabase
      .from("Team")
      .delete()
      .eq("eventId", eventId)
      .select("id");
    if (teamDeleteError) throw teamDeleteError;
    summary.teamsDeleted = (teamDeletedRows || []).length;

    for (const teamId of eventTeamIds) {
      await removeStoredTeamDetailFields(teamId);
      summary.teamDetailStorageDeleted += 1;
    }
  }

  if (affectedUserIds.length > 0) {
    const { error: freeAgentUpdateError } = await supabase
      .from("User")
      .update({ isFreeAgent: true, updatedAt: new Date().toISOString() })
      .in("id", affectedUserIds);
    if (freeAgentUpdateError) throw freeAgentUpdateError;
  }

  try {
    await storage.delete(getNotViableIdeasStorageKey(eventId));
  } catch (storageError) {
    console.warn("Failed to clear not-viable ideas map during reset:", storageError.message);
  }

  return summary;
}

export async function seedBalancedEventData(supabase, eventId) {
  await cleanupResetSeedData(supabase, eventId);

  const nowIso = new Date().toISOString();
  const summary = {
    usersCreated: 0,
    registrationsCreated: 0,
    teamsCreated: 0,
    teamMembersCreated: 0,
    freeAgentsCreated: 0,
    pendingInvitesCreated: 0,
  };

  const userRows = BALANCED_SEED_USERS.map((user) => ({
    id: getSeedUserId(eventId, user.index),
    email: user.email,
    name: user.name,
    callsign: user.callsign,
    skills: user.skills.join(", "),
    role: "USER",
    isFreeAgent: true,
    autoAssignOptIn: false,
    trackSide: user.trackSide || null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  const { data: insertedUsers, error: userInsertError } = await supabase
    .from("User")
    .insert(userRows)
    .select("id");
  if (userInsertError) throw userInsertError;
  summary.usersCreated = (insertedUsers || []).length;

  const registrationRows = BALANCED_SEED_USERS.map((user) => ({
    id: getSeedRegistrationId(eventId, user.index),
    eventId,
    userId: getSeedUserId(eventId, user.index),
  }));
  const { data: insertedRegistrations, error: registrationInsertError } = await supabase
    .from("EventRegistration")
    .insert(registrationRows)
    .select("id");
  if (registrationInsertError) throw registrationInsertError;
  summary.registrationsCreated = (insertedRegistrations || []).length;

  const teamRows = BALANCED_SEED_TEAMS.map((team) => ({
    id: getSeedTeamId(eventId, team.index),
    eventId,
    name: team.name,
    description: team.description,
    lookingFor: team.lookingFor.join(", "),
    maxSize: 5,
    trackSide: "HUMAN",
    isPublic: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
  const { data: insertedTeams, error: teamInsertError } = await supabase
    .from("Team")
    .insert(teamRows)
    .select("id");
  if (teamInsertError) throw teamInsertError;
  summary.teamsCreated = (insertedTeams || []).length;

  const participantUserIds = new Set();
  const memberRows = [];
  let memberCounter = 1;
  for (const team of BALANCED_SEED_TEAMS) {
    const ownerId = getSeedUserId(eventId, team.ownerUserIndex);
    participantUserIds.add(ownerId);
    memberRows.push({
      id: getSeedMemberId(eventId, memberCounter),
      teamId: getSeedTeamId(eventId, team.index),
      userId: ownerId,
      role: "OWNER",
      status: "ACCEPTED",
      createdAt: nowIso,
    });
    memberCounter += 1;

    for (const memberIndex of team.memberUserIndexes || []) {
      const memberUserId = getSeedUserId(eventId, memberIndex);
      participantUserIds.add(memberUserId);
      memberRows.push({
        id: getSeedMemberId(eventId, memberCounter),
        teamId: getSeedTeamId(eventId, team.index),
        userId: memberUserId,
        role: "MEMBER",
        status: "ACCEPTED",
        createdAt: nowIso,
      });
      memberCounter += 1;
    }
  }

  const { data: insertedMembers, error: memberInsertError } = await supabase
    .from("TeamMember")
    .insert(memberRows)
    .select("id");
  if (memberInsertError) throw memberInsertError;
  summary.teamMembersCreated = (insertedMembers || []).length;

  const participantIds = Array.from(participantUserIds);
  if (participantIds.length > 0) {
    const { error: participantUpdateError } = await supabase
      .from("User")
      .update({ isFreeAgent: false, updatedAt: nowIso })
      .in("id", participantIds);
    if (participantUpdateError) throw participantUpdateError;
  }

  const seededUserIds = BALANCED_SEED_USERS.map((user) => getSeedUserId(eventId, user.index));
  const freeAgentIds = seededUserIds.filter((userId) => !participantUserIds.has(userId));
  if (freeAgentIds.length > 0) {
    const { error: freeAgentUpdateError } = await supabase
      .from("User")
      .update({ isFreeAgent: true, updatedAt: nowIso })
      .in("id", freeAgentIds);
    if (freeAgentUpdateError) throw freeAgentUpdateError;
  }
  summary.freeAgentsCreated = freeAgentIds.length;

  const inviteExpiryIso = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const inviteRows = BALANCED_SEED_PENDING_INVITES.map((invite) => ({
    id: deterministicSeedUuid("invite", eventId, formatSeedIndex(invite.index)),
    teamId: getSeedTeamId(eventId, invite.teamIndex),
    userId: getSeedUserId(eventId, invite.userIndex),
    message: invite.message,
    status: "PENDING",
    expiresAt: inviteExpiryIso,
    createdAt: nowIso,
  }));
  const { data: insertedInvites, error: inviteInsertError } = await supabase
    .from("TeamInvite")
    .insert(inviteRows)
    .select("id");
  if (inviteInsertError) throw inviteInsertError;
  summary.pendingInvitesCreated = (insertedInvites || []).length;

  try {
    await setStoredAdminResetSeedMeta(eventId, {
      userIds: seededUserIds,
      teamIds: BALANCED_SEED_TEAMS.map((team) => getSeedTeamId(eventId, team.index)),
    });
  } catch (storageError) {
    console.warn("Failed to persist reset seed metadata:", storageError.message);
  }

  return summary;
}

export async function buildConfigModeStateResponse(supabase, req, access) {
  const ctx = access || await resolveConfigModeAccess(supabase, req);
  const event = ctx.event;
  const seedPayload = normalizeSeedPayload(ctx.seed);
  const seedBranding = seedPayload.branding && typeof seedPayload.branding === "object" ? seedPayload.branding : {};
  const eventBranding = event?.event_branding && typeof event.event_branding === "object" ? event.event_branding : {};
  const branding = { ...eventBranding, ...seedBranding };

  const storedMotd = await getStoredEventMotd(event.id);
  const fallbackMotd = normalizeMotdMessage(event.motd || "");
  const hasStoredMotd = storedMotd !== undefined;
  const effectiveMotd = hasStoredMotd ? storedMotd : (fallbackMotd.message ? fallbackMotd : null);

  const storedPublishedContentOverrides = await getStoredEventContentOverrides(event.id);
  const eventPublishedContentOverrides = normalizeConfigModeContentOverridesEnvelope(
    event?.event_content_overrides || event?.eventContentOverrides || null
  );
  const publishedContentOverrides =
    (storedPublishedContentOverrides?.version || 0) > 0
      ? storedPublishedContentOverrides
      : eventPublishedContentOverrides;

  const storedDraft = await getStoredEventConfigDraft(event.id);
  const eventDraft = normalizeConfigModeDraftEnvelope(
    event?.event_config_draft || event?.eventConfigDraft || null
  );
  const draft = storedDraft || eventDraft;
  const publishedSchedule = normalizeRuntimeEventSchedule(event?.event_schedule, {
    timezone: event?.timezone,
    hackingStartsAt: event?.hacking_starts_at || event?.startDate || event?.start_date,
    submissionDeadlineAt: event?.submission_deadline_at || event?.endDate || event?.end_date,
  });
  let backupCoverageStatus = null;
  try {
    backupCoverageStatus = await getEventBackupCoverageStatus({
      supabase,
      eventId: event.id,
    });
  } catch (err) {
    console.warn("[event-backup] Unable to load backup coverage status:", err?.message || String(err));
  }

  return {
    success: true,
    eventId: event.id,
    branding,
    motd: effectiveMotd?.message || "",
    motdMessage: effectiveMotd,
    publishedContentOverrides,
    publishedSchedule: hasPublishedEventSchedule(publishedSchedule) ? publishedSchedule : null,
    draft,
    configModeCapabilities: {
      enabled: true,
      canUseConfigMode: true,
      isPlatformAdmin: Boolean(ctx.isPlatformAdmin),
      isEventAdmin: Boolean(ctx.isEventAdmin),
      actorRole: ctx.isPlatformAdmin ? "admin" : (ctx.isEventAdmin ? "event_admin" : "unknown"),
    },
    backupCoverageStatus,
    hasConfigDraft: Boolean(draft),
  };
}
