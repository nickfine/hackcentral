import Resolver from "@forge/resolver";
import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "./lib/supabase";
import {
  CONFIG_MODE_ALLOWED_CONTENT_OVERRIDE_KEYS,
  normalizeConfigModeContentOverridesEnvelope as normalizeConfigModeContentOverridesEnvelopeHelper,
  normalizeConfigModeDraftPatch as normalizeConfigModeDraftPatchHelper,
  normalizeConfigModeDraftEnvelope as normalizeConfigModeDraftEnvelopeHelper,
  mergeConfigModeDraftPatches as mergeConfigModeDraftPatchesHelper,
} from "./lib/configModeHelpers.mjs";
import {
  assertConfigModeAccessAllowed,
  runSaveConfigModeDraftCore,
  runPublishConfigModeDraftCore,
} from "./lib/configModeResolverCore.mjs";

const resolver = new Resolver();
const DEBUG_LOGS = process.env.DEBUG_PERF === "true";
const TELEMETRY_SUMMARY_KEY = "uiTelemetrySummary:v1";
const EVENT_MOTD_STORAGE_KEY_PREFIX = "eventMotd:v1:";
const EVENT_CONFIG_DRAFT_STORAGE_KEY_PREFIX = "eventConfigDraft:v1:";
const EVENT_CONTENT_OVERRIDES_STORAGE_KEY_PREFIX = "eventContentOverrides:v1:";
const NOT_VIABLE_IDEAS_STORAGE_KEY_PREFIX = "notViableIdeas:v1:";
const TEAM_DETAIL_FIELDS_STORAGE_KEY_PREFIX = "teamDetailFields:v1:";
const ADMIN_RESET_LOCK_KEY_PREFIX = "adminResetLock:v1:";
const ADMIN_RESET_SEED_META_KEY_PREFIX = "adminResetSeedMeta:v1:";
const ACTIVE_APP_MODE_CONTEXT_STORAGE_KEY_PREFIX = "activeAppModeContext:v1:";
const MOTD_PRIORITIES = new Set(["info", "warning", "urgent"]);
const HACKDAY_OWNER_EMAILS = new Set(["jmort@adaptavist.com"]);
const HACKDAY_OWNER_ACCOUNT_IDS = new Set([]);
const HACKDAY_OWNER_NAMES = new Set(["jon mort"]);
const HACKDAY_OWNER_TITLE = "CTO & HackDay Owner";
const OBSERVERS_TEAM_ID = "team-observers";
const OBSERVERS_MAX_SIZE = 999;
const SUPABASE_BATCH_SIZE = 200;
const NOTIFICATION_BATCH_SIZE = 100;
const TELEMETRY_MAX_ENTRIES = 5000;
const JOIN_REASON_MAX_LENGTH = 300;
const INVITE_EXPIRY_DAYS = 7;
const APP_MODE_CONTEXT_SCHEMA_VERSION = 1;
const APP_MODE_CONTEXT_TTL_MS = 12 * 60 * 60 * 1000;
const APP_MODE_RUNTIME_SOURCES = Object.freeze({
  ACTIVE: "app_mode_active_context",
  REQUIRED: "app_mode_context_required",
});
const RESET_SEED_PROFILE_BALANCED_V1 = "balanced_v1";
const SEED_USER_EMAIL_PREFIX = "seed26.";
const SUPPORTED_RESET_SEED_PROFILES = new Set([RESET_SEED_PROFILE_BALANCED_V1]);

/**
 * API Contract: Team Size Field Naming
 *
 * Database Layer (Supabase):
 *   - Column name: `maxSize`
 *   - All database queries use: `maxSize`
 *
 * API Layer (Backend ↔ Frontend):
 *   - Frontend sends/receives: `maxMembers`
 *   - Backend transforms: `maxMembers` ↔ `maxSize`
 *
 * Why two names?
 *   - `maxSize` = Database column (historical, cannot change without migration)
 *   - `maxMembers` = API contract (more descriptive for team member context)
 *
 * Transformation points in this file:
 *   - Line ~1933: DB → API (maxSize → maxMembers) for getTeams
 *   - Line ~2665: DB → API (maxSize → maxMembers) for getTeam
 *   - Line ~2952: API → DB (maxMembers → maxSize) for updateTeam
 *   - Line ~3058: API → DB (maxMembers → maxSize) for createTeam
 *   - Line ~6143: DB → API (maxSize → maxMembers) for devCreateTestSubmission
 */

const BALANCED_SEED_USERS = [
  { index: 1, name: "Alex Chen", callsign: "TriagePilot", email: "seed26.alex.chen@hackday.local", trackSide: "AI", skills: ["Jira Automation", "LLM Ops", "Incident Response"] },
  { index: 2, name: "Priya Nair", callsign: "BriefForge", email: "seed26.priya.nair@hackday.local", trackSide: "HUMAN", skills: ["Confluence", "Knowledge Design", "Prompt Engineering"] },
  { index: 3, name: "Mateo Silva", callsign: "BridgeLine", email: "seed26.mateo.silva@hackday.local", trackSide: "AI", skills: ["JSM", "Slack Integrations", "Webhook Automation"] },
  { index: 4, name: "Hannah Lee", callsign: "StoryMesh", email: "seed26.hannah.lee@hackday.local", trackSide: "HUMAN", skills: ["Product Discovery", "Jira Planning", "NLP"] },
  { index: 5, name: "Jordan Patel", callsign: "ActionMiner", email: "seed26.jordan.patel@hackday.local", trackSide: "AI", skills: ["Speech-to-Text", "Meeting Ops", "Jira APIs"] },
  { index: 6, name: "Chloe Kim", callsign: "RunbookRay", email: "seed26.chloe.kim@hackday.local", trackSide: "HUMAN", skills: ["Ops Enablement", "AI Assistants", "Service Design"] },
  { index: 7, name: "Samir Khan", callsign: "FlowEngine", email: "seed26.samir.khan@hackday.local", trackSide: "AI", skills: ["Forge", "Workflow Design", "System Integrations"] },
  { index: 8, name: "Elena Rossi", callsign: "ReleaseScribe", email: "seed26.elena.rossi@hackday.local", trackSide: "HUMAN", skills: ["Release Ops", "Confluence Writing", "Summarization"] },
  { index: 9, name: "Noah Bennett", callsign: "SignalStack", email: "seed26.noah.bennett@hackday.local", trackSide: "AI", skills: ["Analytics", "Customer Feedback", "Atlassian APIs"] },
  { index: 10, name: "Maya Singh", callsign: "AuditTrail", email: "seed26.maya.singh@hackday.local", trackSide: "HUMAN", skills: ["Compliance", "Evidence Tracking", "Automation"] },
  { index: 11, name: "Theo Nguyen", callsign: "SprintFox", email: "seed26.theo.nguyen@hackday.local", trackSide: "AI", skills: ["React", "Jira Dashboards", "TypeScript"] },
  { index: 12, name: "Grace Park", callsign: "PagePulse", email: "seed26.grace.park@hackday.local", trackSide: "HUMAN", skills: ["Confluence Templates", "UX Writing", "Workshop Facilitation"] },
  { index: 13, name: "Liam Foster", callsign: "OpsRelay", email: "seed26.liam.foster@hackday.local", trackSide: "AI", skills: ["Incident Management", "Slack Bots", "Runbook Design"] },
  { index: 14, name: "Zoe Alvarez", callsign: "ScopePilot", email: "seed26.zoe.alvarez@hackday.local", trackSide: "HUMAN", skills: ["Backlog Grooming", "AI Prompting", "Roadmapping"] },
  { index: 15, name: "Ethan Moore", callsign: "MinuteMason", email: "seed26.ethan.moore@hackday.local", trackSide: "AI", skills: ["Note Taking", "Task Mining", "Atlassian Automation"] },
  { index: 16, name: "Aisha Rahman", callsign: "ProtoForge", email: "seed26.aisha.rahman@hackday.local", trackSide: "HUMAN", skills: ["Prototyping", "Forge UI", "API Design"] },
  { index: 17, name: "Ben Turner", callsign: "DocDraft", email: "seed26.ben.turner@hackday.local", trackSide: "AI", skills: ["Technical Writing", "Release Notes", "Developer Docs"] },
  { index: 18, name: "Sofia Garcia", callsign: "PulseLens", email: "seed26.sofia.garcia@hackday.local", trackSide: "HUMAN", skills: ["Voice of Customer", "Data Storytelling", "Automation QA"] },
  { index: 19, name: "Riley Cooper", callsign: "FreeFlow", email: "seed26.riley.cooper@hackday.local", trackSide: "AI", skills: ["Prompt Design", "JSM", "Playbooks"] },
  { index: 20, name: "Nia Roberts", callsign: "SyncWave", email: "seed26.nia.roberts@hackday.local", trackSide: "HUMAN", skills: ["Cross-team Comms", "Confluence", "Facilitation"] },
  { index: 21, name: "Omar Haddad", callsign: "PatchPoint", email: "seed26.omar.haddad@hackday.local", trackSide: "AI", skills: ["SRE", "Automation", "Alerting"] },
  { index: 22, name: "Clara Wu", callsign: "FlowAtlas", email: "seed26.clara.wu@hackday.local", trackSide: "HUMAN", skills: ["Process Mapping", "Jira Workflows", "UX Research"] },
  { index: 23, name: "Isaac Bell", callsign: "DeltaOps", email: "seed26.isaac.bell@hackday.local", trackSide: "AI", skills: ["Integration Testing", "API Monitoring", "SQL"] },
  { index: 24, name: "Fatima Noor", callsign: "PolicyGrid", email: "seed26.fatima.noor@hackday.local", trackSide: "HUMAN", skills: ["Governance", "Risk Controls", "Audit Automation"] },
];

const BALANCED_SEED_TEAMS = [
  {
    index: 1,
    ownerUserIndex: 1,
    memberUserIndexes: [11],
    name: "Jira Triage Copilot",
    description: "Classifies inbound support and incident signals, then drafts prioritized Jira issues with suggested labels and owners.",
    lookingFor: ["Prompt Engineering", "Jira Workflows"],
  },
  {
    index: 2,
    ownerUserIndex: 2,
    memberUserIndexes: [12],
    name: "Confluence Auto-Briefer",
    description: "Builds concise weekly brief pages from meeting notes, decisions, and action updates across project spaces.",
    lookingFor: ["Confluence Macros", "UX Writing"],
  },
  {
    index: 3,
    ownerUserIndex: 3,
    memberUserIndexes: [13],
    name: "Slack-to-JSM Incident Bridge",
    description: "Turns incident chatter in Slack into structured JSM incidents with timeline summaries and accountable owners.",
    lookingFor: ["JSM Automation", "Slack Apps"],
  },
  {
    index: 4,
    ownerUserIndex: 4,
    memberUserIndexes: [14],
    name: "PRD to Story Mapper",
    description: "Transforms PRD sections into Jira epics and stories with acceptance criteria and dependency hints.",
    lookingFor: ["Product Ops", "NLP"],
  },
  {
    index: 5,
    ownerUserIndex: 5,
    memberUserIndexes: [15],
    name: "Meeting-to-Jira Action Miner",
    description: "Extracts tasks, owners, and deadlines from meeting transcripts and drafts Jira tickets with context links.",
    lookingFor: ["Speech AI", "Jira APIs"],
  },
  {
    index: 6,
    ownerUserIndex: 6,
    memberUserIndexes: [16],
    name: "AI Runbook Auto-Responder",
    description: "Suggests runbook steps and remediation playbooks for alerts using historical JSM incidents and KB pages.",
    lookingFor: ["Runbook Authoring", "SRE"],
  },
  {
    index: 7,
    ownerUserIndex: 7,
    memberUserIndexes: [17],
    name: "Forge Workflow Orchestrator",
    description: "Creates composable Forge automations to coordinate Jira, Confluence, and external API workflows.",
    lookingFor: ["Forge", "Integration Design"],
  },
  {
    index: 8,
    ownerUserIndex: 8,
    memberUserIndexes: [18],
    name: "Release Notes Composer",
    description: "Generates release notes from merged Jira issues and Confluence changelog context with audience-specific variants.",
    lookingFor: ["Release Ops", "Technical Writing"],
  },
  {
    index: 9,
    ownerUserIndex: 9,
    memberUserIndexes: [],
    name: "Customer Signal Synthesizer",
    description: "Combines support tickets, NPS themes, and product telemetry into ranked opportunities for product teams.",
    lookingFor: ["Analytics", "Customer Research"],
  },
  {
    index: 10,
    ownerUserIndex: 10,
    memberUserIndexes: [],
    name: "Compliance Evidence Bot",
    description: "Collects evidence artifacts from Jira and Confluence activity and packages audit-ready control narratives.",
    lookingFor: ["Compliance", "Automation"],
  },
];

const BALANCED_SEED_PENDING_INVITES = [
  { index: 1, teamIndex: 1, userIndex: 19, message: "Join us to shape triage prompts and evaluation metrics." },
  { index: 2, teamIndex: 2, userIndex: 20, message: "We need facilitation and docs expertise for summary workflows." },
  { index: 3, teamIndex: 3, userIndex: 21, message: "Your ops experience would help productionize incident routing." },
  { index: 4, teamIndex: 4, userIndex: 22, message: "Help us validate story mapping quality with product teams." },
  { index: 5, teamIndex: 5, userIndex: 23, message: "Could you help harden transcript extraction and API reliability?" },
  { index: 6, teamIndex: 6, userIndex: 24, message: "Looking for compliance-minded automation support on runbooks." },
];

// ============================================================================
// CONSTANTS - Phase and Role Mappings
// ============================================================================

// Demo event ID - shared with HD26AI for unified demo data
// This event is seeded via supabase/migrations/seed_demo_data.sql
const DEMO_EVENT_ID = 'demo-event-2026';

// Phase mapping: DB enum (uppercase) -> app format (lowercase)
// Note: REGISTRATION maps to signup for backwards compatibility
const PHASE_MAP = {
  SETUP: "setup",
  REGISTRATION: "signup", // Legacy: treat as signup
  SIGNUP: "signup",
  TEAM_FORMATION: "team_formation",
  HACKING: "hacking",
  SUBMISSION: "submission",
  VOTING: "voting",
  JUDGING: "judging",
  RESULTS: "results",
};

// Role mapping: DB enum (uppercase) -> app format (lowercase)
const ROLE_MAP = {
  USER: "participant",
  AMBASSADOR: "ambassador",
  JUDGE: "judge",
  ADMIN: "admin",
};

// Reverse role mapping: app format (lowercase) -> DB enum (uppercase)
const REVERSE_ROLE_MAP = {
  participant: "USER",
  ambassador: "AMBASSADOR",
  judge: "JUDGE",
  admin: "ADMIN",
};

// Reverse phase mapping: app format (lowercase) -> DB enum (uppercase)
const REVERSE_PHASE_MAP = {
  setup: "SETUP",
  signup: "REGISTRATION",
  team_formation: "TEAM_FORMATION",
  hacking: "HACKING",
  submission: "SUBMISSION",
  voting: "VOTING",
  judging: "JUDGING",
  results: "RESULTS",
};

/**
 * Fetch user profile from Confluence API
 * Returns email if available (depends on user's privacy settings)
 */
async function fetchUserProfile(accountId) {
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive the caller's Atlassian accountId from Forge context.
 * If a payload accountId is supplied, assert it matches to prevent spoofing.
 */
function getCallerAccountId(req) {
  const contextAccountId = req?.context?.accountId;
  const payloadAccountId = req?.payload?.accountId;

  if (contextAccountId && payloadAccountId && payloadAccountId !== contextAccountId) {
    throw new Error("accountId mismatch");
  }

  if (contextAccountId) return contextAccountId;
  if (payloadAccountId) return payloadAccountId;

  throw new Error("Missing accountId (no Forge context available)");
}

function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function normalizeDisplayName(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isHackdayOwnerIdentity({ email, accountId, displayName, name } = {}) {
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

function logDebug(...args) {
  if (DEBUG_LOGS) {
    console.log(...args);
  }
}

function createTelemetrySummary() {
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

function normalizeTelemetrySummary(summary) {
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

function incrementCounter(counters, key, amount = 1) {
  if (!counters || !key) return;
  counters[key] = (counters[key] || 0) + amount;
}

function toIsoDay(value) {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function ensureDayTelemetryBucket(summary, day) {
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

function pruneTelemetryDays(summary, maxDays = 60) {
  const dayKeys = Object.keys(summary.byDay || {}).sort();
  if (dayKeys.length <= maxDays) return;

  const toDelete = dayKeys.slice(0, dayKeys.length - maxDays);
  for (const day of toDelete) {
    delete summary.byDay[day];
  }
}

function toPercentage(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function average(values) {
  if (!values || values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number((((sorted[middle - 1] + sorted[middle]) / 2)).toFixed(2));
  }
  return Number(sorted[middle].toFixed(2));
}

function makeId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function chunkArray(items, size = SUPABASE_BATCH_SIZE) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function parseTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function pruneSignupCompletionMap(summary, maxEntries = TELEMETRY_MAX_ENTRIES) {
  const entries = Object.entries(summary.signupCompletionByAccount || {});
  if (entries.length <= maxEntries) return;

  entries.sort((a, b) => {
    const aTs = parseTimestamp(a[1]) || 0;
    const bTs = parseTimestamp(b[1]) || 0;
    return bTs - aTs;
  });

  summary.signupCompletionByAccount = Object.fromEntries(entries.slice(0, maxEntries));
}

function normalizeSignupStep(value) {
  const numericStep = Number(value);
  if (!Number.isFinite(numericStep)) return null;
  if (numericStep < 1 || numericStep > 3) return null;
  return String(Math.trunc(numericStep));
}

async function getUserByAccountId(supabase, accountId, columns = "id, atlassian_account_id, role, name, isFreeAgent") {
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
async function getOrCreateObserversTeam(supabase, eventId) {
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
async function autoAssignFreeAgentsToObservers(supabase, eventId) {
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
async function checkAndSendFreeAgentReminders(supabase, eventId, startDate) {
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
function normalizeConfluencePageId(value) {
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
function getConfluencePageId(req, { allowPayloadFallback = true, preferPayload = false } = {}) {
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

  if (allowPayloadFallback) {
    const fromPayload = normalizeConfluencePageId(req?.payload?.pageId);
    if (fromPayload) {
      return fromPayload;
    }
  }

  return null;
}

function isUuidLike(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeSiteBaseUrl(value) {
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

function extractRuntimeRouteIdsFromLocalId(localIdValue) {
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

function buildAppModeLaunchUrlFromContext(req, pageId) {
  const normalizedPageId = normalizeConfluencePageId(pageId);
  if (!normalizedPageId) {
    throw new Error("Missing pageId for app-mode launch URL");
  }

  const localIdValue =
    req?.context?.localId ||
    req?.context?.extension?.localId ||
    req?.context?.extensionContext?.localId ||
    null;
  const routeIds = extractRuntimeRouteIdsFromLocalId(localIdValue);
  if (!routeIds?.appId || !routeIds?.environmentId) {
    throw new Error("Unable to resolve app route context from localId");
  }

  const path = `/wiki/apps/${routeIds.appId}/${routeIds.environmentId}/hackday-app?pageId=${encodeURIComponent(normalizedPageId)}`;
  const siteBaseUrl = normalizeSiteBaseUrl(req?.context?.siteUrl);

  return {
    pageId: normalizedPageId,
    appId: routeIds.appId,
    environmentId: routeIds.environmentId,
    path,
    url: siteBaseUrl ? `${siteBaseUrl}${path}` : path,
  };
}

function isAppModeRequest(req) {
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

function buildAppModeContextRequiredResult(message = "Open a HackDay page and launch App View again.") {
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

function normalizeSupabaseErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function hasMissingTable(error, tableName) {
  const message = normalizeSupabaseErrorMessage(error).toLowerCase();
  const table = String(tableName || "").toLowerCase();
  return (
    message.includes(`relation "${table}" does not exist`) ||
    message.includes(`could not find the table '${table}'`) ||
    message.includes(`failed to find table '${table}'`)
  );
}

function extractMissingEventColumn(error) {
  const message = normalizeSupabaseErrorMessage(error);
  const quoted = message.match(/column\s+"Event"\."([a-zA-Z0-9_]+)"\s+does not exist/i);
  if (quoted) return quoted[1];
  const plain = message.match(/column\s+Event\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (plain) return plain[1];
  const pgrst = message.match(/Could not find the '([a-zA-Z0-9_]+)' column of 'Event' in the schema cache/i);
  if (pgrst) return pgrst[1];
  return null;
}

function extractEventNotNullColumn(error) {
  const message = normalizeSupabaseErrorMessage(error);
  const match = message.match(/null value in column "([a-zA-Z0-9_]+)" of relation "Event" violates not-null constraint/i);
  return match ? match[1] : null;
}

function normalizeSeedPayload(seed) {
  const payload = seed?.seed_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload;
}

async function getEventById(supabase, eventId) {
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

async function getEventByConfluencePageId(supabase, pageId) {
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

async function getTemplateSeedByPageId(supabase, pageId) {
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

function defaultEventFieldValue(column, seed, eventId, pageId, nowIso) {
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

async function createEventFromTemplateSeed(supabase, seed, pageId) {
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
    maxVotesPerUser: 3,
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

async function markTemplateSeedInitialized(supabase, seed, eventId) {
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

async function createMilestonesFromSchedule(supabase, event, seed) {
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

async function resolveInstanceContext(
  supabase,
  req,
  { allowPayloadPageId = true, preferPayloadPageId = false } = {}
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
        setupRequired: false,
        runtimeSource: "event_page_mapping",
      };
    }
    logDebug("[resolveInstanceContext] No seed or page mapping for pageId:", pageId);
    return {
      pageId,
      eventId: null,
      event: null,
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

  if (!event) {
    event = await createEventFromTemplateSeed(supabase, seed, pageId);
    runtimeSource = "seed_bootstrap";
  }

  if (event) {
    // Create milestones from schedule (idempotent - skips if already exist)
    await createMilestonesFromSchedule(supabase, event, seed);
    await markTemplateSeedInitialized(supabase, seed, event.id);
  }

  return {
    pageId,
    eventId: event?.id || null,
    event: event || null,
    setupRequired: !event,
    runtimeSource,
  };
}

async function resolveActiveAppModeContext(supabase, req) {
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
async function getCurrentEventContext(supabase, req) {
  try {
    if (isAppModeRequest(req)) {
      const activeContext = await resolveActiveAppModeContext(supabase, req);
      if (activeContext?.event) {
        return activeContext;
      }

      const directContext = await resolveInstanceContext(supabase, req, {
        allowPayloadPageId: true,
        preferPayloadPageId: true,
      });
      if (directContext?.event) {
        return directContext;
      }

      return buildAppModeContextRequiredResult();
    }

    const context = await resolveInstanceContext(supabase, req);
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

async function getCurrentEvent(supabase, req) {
  const context = await getCurrentEventContext(supabase, req);
  return context?.event || null;
}

async function resolveConfigModeAccess(supabase, req) {
  const accountId = getCallerAccountId(req);
  const instanceContext = await resolveInstanceContext(supabase, req, { allowPayloadPageId: false });
  const event = instanceContext?.event;

  if (!instanceContext?.pageId) {
    throw new Error("Config Mode requires a page-scoped HackDay context");
  }

  if (!event) {
    throw new Error("No event context for this page");
  }

  const { data: userRows, error: userError } = await supabase
    .from("User")
    .select("id, role, name, callsign, email, atlassian_account_id")
    .eq("atlassian_account_id", accountId)
    .limit(1);
  if (userError) {
    throw new Error(`Failed to resolve user permissions: ${userError.message}`);
  }
  const userRow = userRows?.[0] || null;
  const isPlatformAdmin = userRow?.role === "ADMIN";

  const pageId = instanceContext?.pageId || null;
  const seed = pageId ? await getTemplateSeedByPageId(supabase, pageId) : null;

  let email = normalizeEmail(userRow?.email || "");
  let displayName = userRow?.name || userRow?.callsign || null;
  if (!email) {
    try {
      const profile = await fetchUserProfile(accountId);
      email = normalizeEmail(profile?.email || "");
      displayName = displayName || profile?.displayName || null;
    } catch (err) {
      logDebug("[resolveConfigModeAccess] fetchUserProfile failed:", err.message);
    }
  }

  let isEventAdmin = false;
  if (seed) {
    const primary = normalizeEmail(String(seed.primary_admin_email || "").trim());
    const coAdmins = Array.isArray(seed.co_admin_emails)
      ? seed.co_admin_emails.map((raw) => normalizeEmail(String(raw || "").trim())).filter(Boolean)
      : [];
    isEventAdmin = Boolean(email && (email === primary || coAdmins.includes(email)));
  }

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
    canUseConfigMode,
  };
}

async function getLatestEventForGlobalContext(supabase) {
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

function getEventMotdStorageKey(eventId) {
  return `${EVENT_MOTD_STORAGE_KEY_PREFIX}${eventId}`;
}

function getEventConfigDraftStorageKey(eventId) {
  return `${EVENT_CONFIG_DRAFT_STORAGE_KEY_PREFIX}${eventId}`;
}

function getEventContentOverridesStorageKey(eventId) {
  return `${EVENT_CONTENT_OVERRIDES_STORAGE_KEY_PREFIX}${eventId}`;
}

function getNotViableIdeasStorageKey(eventId) {
  return `${NOT_VIABLE_IDEAS_STORAGE_KEY_PREFIX}${eventId}`;
}

function getTeamDetailFieldsStorageKey(teamId) {
  return `${TEAM_DETAIL_FIELDS_STORAGE_KEY_PREFIX}${teamId}`;
}

function getAdminResetLockStorageKey(eventId) {
  return `${ADMIN_RESET_LOCK_KEY_PREFIX}${eventId}`;
}

function getAdminResetSeedMetaStorageKey(eventId) {
  return `${ADMIN_RESET_SEED_META_KEY_PREFIX}${eventId}`;
}

function getActiveAppModeContextStorageKey(accountId) {
  return `${ACTIVE_APP_MODE_CONTEXT_STORAGE_KEY_PREFIX}${accountId}`;
}

function normalizeActiveAppModeContextEnvelope(value) {
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

async function getStoredActiveAppModeContext(accountId) {
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

async function setStoredActiveAppModeContext(accountId, context) {
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

async function clearStoredActiveAppModeContext(accountId) {
  if (!accountId) return;
  try {
    await storage.delete(getActiveAppModeContextStorageKey(accountId));
  } catch (err) {
    console.warn("Failed to clear active app-mode context:", err.message);
  }
}

function normalizeMotdMessage(value) {
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

async function getStoredEventMotd(eventId) {
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

async function setStoredEventMotd(eventId, motdMessage) {
  if (!eventId) return;

  try {
    const normalized = normalizeMotdMessage(motdMessage);
    await storage.set(getEventMotdStorageKey(eventId), normalized);
  } catch (err) {
    throw new Error(`Failed to persist MOTD: ${err.message}`);
  }
}

async function restoreStoredEventMotd(eventId, previousValue) {
  if (!eventId) return;

  const storageKey = getEventMotdStorageKey(eventId);
  if (previousValue === undefined) {
    await storage.delete(storageKey);
    return;
  }

  await storage.set(storageKey, previousValue);
}

function normalizeConfigModeContentOverridesEnvelope(value) {
  return normalizeConfigModeContentOverridesEnvelopeHelper(value);
}

function normalizeConfigModeBrandingPatch(value) {
  return normalizeConfigModeDraftPatchHelper({ branding: value }).branding;
}

function normalizeConfigModeMotdPatch(value) {
  return normalizeConfigModeDraftPatchHelper({ motdMessage: value }).motdMessage;
}

function normalizeConfigModeContentOverridesPatch(value) {
  return normalizeConfigModeDraftPatchHelper({ contentOverrides: value }).contentOverrides;
}

function normalizeConfigModeDraftPatch(value, { strict = false } = {}) {
  return normalizeConfigModeDraftPatchHelper(value, { strict });
}

function mergeConfigModeDraftPatches(basePatch, patchUpdates) {
  return mergeConfigModeDraftPatchesHelper(basePatch, patchUpdates);
}

function normalizeConfigModeDraftEnvelope(value) {
  return normalizeConfigModeDraftEnvelopeHelper(value);
}

async function getStoredEventConfigDraft(eventId) {
  if (!eventId) return null;
  try {
    const stored = await storage.get(getEventConfigDraftStorageKey(eventId));
    return normalizeConfigModeDraftEnvelope(stored);
  } catch (err) {
    console.warn("Failed to read Config Mode draft from storage:", err.message);
    return null;
  }
}

async function setStoredEventConfigDraft(eventId, draftEnvelope) {
  if (!eventId) return;
  const normalized = normalizeConfigModeDraftEnvelope(draftEnvelope);
  await storage.set(getEventConfigDraftStorageKey(eventId), normalized);
}

async function clearStoredEventConfigDraft(eventId) {
  if (!eventId) return;
  await storage.delete(getEventConfigDraftStorageKey(eventId));
}

async function getStoredEventContentOverrides(eventId) {
  if (!eventId) return normalizeConfigModeContentOverridesEnvelope(null);
  try {
    const stored = await storage.get(getEventContentOverridesStorageKey(eventId));
    return normalizeConfigModeContentOverridesEnvelope(stored);
  } catch (err) {
    console.warn("Failed to read content overrides from storage:", err.message);
    return normalizeConfigModeContentOverridesEnvelope(null);
  }
}

async function setStoredEventContentOverrides(eventId, envelope) {
  if (!eventId) return;
  const normalized = normalizeConfigModeContentOverridesEnvelope(envelope);
  await storage.set(getEventContentOverridesStorageKey(eventId), normalized);
}

function normalizeNotViableIdeasMap(value) {
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

async function getStoredNotViableIdeas(eventId) {
  if (!eventId) return {};
  try {
    const storedValue = await storage.get(getNotViableIdeasStorageKey(eventId));
    return normalizeNotViableIdeasMap(storedValue);
  } catch (err) {
    console.warn("Failed to read not-viable ideas from storage:", err.message);
    return {};
  }
}

async function setStoredNotViableIdeas(eventId, value) {
  if (!eventId) return;
  await storage.set(getNotViableIdeasStorageKey(eventId), normalizeNotViableIdeasMap(value));
}

function normalizeTeamDetailFields(value) {
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

async function getStoredTeamDetailFields(teamId) {
  if (!teamId) return {};
  try {
    const storedValue = await storage.get(getTeamDetailFieldsStorageKey(teamId));
    return normalizeTeamDetailFields(storedValue);
  } catch (err) {
    console.warn("Failed to read team detail fields from storage:", err.message);
    return {};
  }
}

async function setStoredTeamDetailFields(teamId, updates) {
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

async function removeStoredTeamDetailFields(teamId) {
  if (!teamId) return;
  try {
    await storage.delete(getTeamDetailFieldsStorageKey(teamId));
  } catch (err) {
    console.warn("Failed to delete team detail fields from storage:", err.message);
  }
}

function applyStoredTeamDetailFields(team, storedFields) {
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

async function hydrateTeamDetailFields(team) {
  if (!team?.id) return team;
  const storedFields = await getStoredTeamDetailFields(team.id);
  return applyStoredTeamDetailFields(team, storedFields);
}

function formatSeedIndex(index) {
  return String(index).padStart(2, "0");
}

function deterministicSeedUuid(...parts) {
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

function getSeedUserId(eventId, index) {
  return deterministicSeedUuid("user", eventId, formatSeedIndex(index));
}

function getSeedTeamId(eventId, index) {
  return deterministicSeedUuid("team", eventId, formatSeedIndex(index));
}

function getSeedRegistrationId(eventId, index) {
  return deterministicSeedUuid("registration", eventId, formatSeedIndex(index));
}

function getSeedMemberId(eventId, index) {
  return deterministicSeedUuid("member", eventId, formatSeedIndex(index));
}

function normalizeAdminResetSeedMeta(value) {
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

async function getStoredAdminResetSeedMeta(eventId) {
  if (!eventId) return { userIds: [], teamIds: [] };

  try {
    const storedValue = await storage.get(getAdminResetSeedMetaStorageKey(eventId));
    return normalizeAdminResetSeedMeta(storedValue);
  } catch (err) {
    console.warn("Failed to read reset seed metadata:", err.message);
    return { userIds: [], teamIds: [] };
  }
}

async function setStoredAdminResetSeedMeta(eventId, value) {
  if (!eventId) return;
  await storage.set(getAdminResetSeedMetaStorageKey(eventId), normalizeAdminResetSeedMeta(value));
}

async function clearStoredAdminResetSeedMeta(eventId) {
  if (!eventId) return;
  try {
    await storage.delete(getAdminResetSeedMetaStorageKey(eventId));
  } catch (err) {
    console.warn("Failed to delete reset seed metadata:", err.message);
  }
}

async function cleanupResetSeedData(supabase, eventId) {
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

async function resetCurrentEventParticipationGraph(supabase, eventId) {
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

async function seedBalancedEventData(supabase, eventId) {
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

/**
 * Transform Supabase User to Forge registration format
 */
function transformUser(user) {
  const name = user.name || "Unknown";
  const isHackdayOwner = isHackdayOwnerIdentity({
    email: user.email,
    accountId: user.atlassian_account_id,
    name: user.name,
  });
  return {
    // Canonical identity used across Custom UI + DB relations
    id: user.id,
    name,

    // Backwards-compat fields (legacy UI Kit / older Custom UI)
    accountId: user.atlassian_account_id || user.id,
    displayName: name,

    callsign: user.callsign || "",
    bio: user.bio || null,
    skills: user.skills ? user.skills.split(",").map((s) => s.trim()) : [],
    role: ROLE_MAP[user.role] || "participant",
    isJudge: user.role === "JUDGE" || user.role === "ADMIN",
    isAdmin: user.role === "ADMIN",
    isHackdayOwner,
    ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
    isFreeAgent: !!user.isFreeAgent,
    autoAssignOptIn: !!user.autoAssignOptIn,
    trackSide: user.trackSide || null,
    registeredAt: user.createdAt || new Date().toISOString(),
  };
}

/**
 * Transform Supabase Team to Forge team format
 */
function transformTeam(team, members, project) {
  const captain = members.find((m) => m.role === "OWNER" && m.status === "ACCEPTED");
  const acceptedMembers = members.filter((m) => m.status === "ACCEPTED");
  const pendingRequests = members.filter((m) => m.status === "PENDING");
  const teamProblem =
    team.problem ??
    team.problem_statement ??
    team.problemStatement ??
    "";
  const teamMoreInfo =
    team.moreInfo ??
    team.more_info ??
    team.additionalInfo ??
    team.additional_info ??
    "";

  return {
    id: team.id,
    name: team.name,
    description: team.description || "",
    problem: typeof teamProblem === "string" ? teamProblem : "",
    moreInfo: typeof teamMoreInfo === "string" ? teamMoreInfo : "",
    captainId: captain?.userId || null,
    captainName: captain?.user?.name || null,
    members: acceptedMembers.map((m) => ({
      id: m.userId,
      name: m.user?.name || "Unknown",
      callsign: m.user?.callsign || "",
      skills: m.user?.skills ? m.user.skills.split(",").map((s) => s.trim()) : [],
    })),
    lookingFor: team.lookingFor ? team.lookingFor.split(",").map((s) => s.trim()) : [],
    maxMembers: team.maxSize || 5, // API: Transform DB `maxSize` → API `maxMembers`
    joinRequests: pendingRequests.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user?.name || "Unknown",
      userSkills: m.user?.skills ? m.user.skills.split(",").map((s) => s.trim()) : [],
      message: m.message || "",
      timestamp: m.createdAt,
    })),
    submission: project
      ? {
          status: project.submittedAt ? "submitted" : "draft",
          projectName: project.name || "",
          description: project.description || "",
          demoVideoUrl: project.videoUrl || "",
          repoUrl: project.repoUrl || "",
          liveDemoUrl: project.demoUrl || "",
          submittedAt: project.submittedAt || null,
        }
      : undefined,
    createdAt: team.createdAt,
  };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

resolver.define("healthCheck", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

resolver.define("getAppModeLaunchUrl", async (req) => {
  const supabase = getSupabaseClient();
  const context = await resolveInstanceContext(supabase, req, { allowPayloadPageId: false });

  if (!context?.pageId || !context?.event?.id) {
    throw new Error("Open App View is only available from a page-scoped HackDay context.");
  }

  const launch = buildAppModeLaunchUrlFromContext(req, context.pageId);
  return {
    pageId: context.pageId,
    eventId: context.event.id,
    runtimeSource: context.runtimeSource,
    ...launch,
  };
});

resolver.define("activateAppModeContext", async (req) => {
  const supabase = getSupabaseClient();
  const accountId = getCallerAccountId(req);
  const pageId = normalizeConfluencePageId(req?.payload?.pageId);
  if (!pageId) {
    throw new Error("A valid pageId is required to activate app mode.");
  }

  const activationReq = {
    ...req,
    payload: {
      ...(req?.payload || {}),
      pageId,
    },
  };
  const context = await resolveInstanceContext(supabase, activationReq, {
    allowPayloadPageId: true,
    preferPayloadPageId: true,
  });
  if (!context?.event?.id) {
    await clearStoredActiveAppModeContext(accountId);
    return {
      success: false,
      reason: "context_not_found",
      pageId,
      eventId: null,
      runtimeSource: APP_MODE_RUNTIME_SOURCES.REQUIRED,
    };
  }

  const storedContext = await setStoredActiveAppModeContext(accountId, {
    pageId: context.pageId,
    eventId: context.event.id,
  });

  return {
    success: true,
    pageId: context.pageId,
    eventId: context.event.id,
    runtimeSource: context.runtimeSource,
    activeContext: storedContext,
  };
});

// ============================================================================
// USER IDENTITY & REGISTRATION
// ============================================================================

/**
 * Get user profile from Confluence API
 * Returns email if user's privacy settings allow
 */
resolver.define("getUserProfile", async (req) => {
  const accountId = getCallerAccountId(req);
  return fetchUserProfile(accountId);
});

/**
 * Get current user from Forge context
 * Links/creates Supabase user automatically and returns user data with isNewUser flag
 */
resolver.define("getCurrentUser", async (req) => {
  // Get accountId from Forge context
  const accountId = req.context?.accountId;
  if (!accountId) {
    throw new Error("No accountId in Forge context");
  }

  // Fetch profile from Confluence API
  const profile = await fetchUserProfile(accountId);
  const email = profile?.email || `${accountId}@atlassian.local`;
  const displayName = profile?.displayName || email.split("@")[0];

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);

  try {
    // Try to find user by Atlassian ID or email
    const { data: existingUserByAtlassianIdData } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const { data: existingUserByEmailData } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .limit(1);

    const existingUserByAtlassianId = existingUserByAtlassianIdData?.[0];
    const existingUserByEmail = existingUserByEmailData?.[0];

    const existingUser = existingUserByAtlassianId || existingUserByEmail;

    if (existingUser) {
      // User exists - link Atlassian ID if not already linked
      if (!existingUser.atlassian_account_id) {
        await supabase
          .from("User")
          .update({ 
            atlassian_account_id: accountId,
            updatedAt: new Date().toISOString()
          })
          .eq("id", existingUser.id);
      }

      // Ensure user is registered for current event
      if (event) {
        const { data: registrationData } = await supabase
          .from("EventRegistration")
          .select("*")
          .eq("eventId", event.id)
          .eq("userId", existingUser.id)
          .limit(1);

        const registration = registrationData?.[0];

        if (!registration) {
          await supabase.from("EventRegistration").insert({
            id: makeId("reg"),
            eventId: event.id,
            userId: existingUser.id,
          });
        }
      }

      const user = transformUser(existingUser);
      // User is "new" if they haven't set their name (or name is just email prefix)
      const isNewUser = !existingUser.name || 
                        existingUser.name === email.split("@")[0] ||
                        !existingUser.skills;
      
      const isHackdayOwner = isHackdayOwnerIdentity({ email, accountId, displayName });
      return {
        ...user,
        isHackdayOwner,
        ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
        isNewUser,
      };
    } else {
      // Create new user
      const newUser = {
        id: makeId("user"),
        email,
        name: displayName,
        atlassian_account_id: accountId,
        role: "USER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: createdUserData, error: createError } = await supabase
        .from("User")
        .insert(newUser)
        .select();

      if (createError) throw createError;

      const user = createdUserData?.[0] || newUser;

      // Register for event if exists
      if (event && user.id) {
        await supabase.from("EventRegistration").insert({
          id: makeId("reg"),
          eventId: event.id,
          userId: user.id,
        });
      }

      const transformedUser = transformUser(user);
      const isHackdayOwner = isHackdayOwnerIdentity({ email, accountId, displayName });
      return {
        ...transformedUser,
        isHackdayOwner,
        ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
        isNewUser: true,
      };
    }
  } catch (error) {
    console.error("getCurrentUser error:", error);
    throw new Error(`Failed to get current user: ${error.message}`);
  }
});

/**
 * Link Atlassian account to Supabase user or create new user
 * Will attempt to fetch actual email from Confluence API if not provided
 */
resolver.define("linkOrCreateUser", async (req) => {
  const accountId = getCallerAccountId(req);
  let { email, displayName } = req.payload || {};
  
  // If email looks like a fallback, try to get real email from Confluence
  if (!email || email.endsWith('@atlassian.local')) {
    const profile = await fetchUserProfile(accountId);
    if (profile?.email) {
      email = profile.email;
      displayName = displayName || profile.displayName;
    } else if (!email) {
      // Use accountId-based email as last resort
      email = `${accountId}@atlassian.local`;
    }
  }

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  // Note: We continue even if no event is found - user can be created/linked without event

  try {
    // Try to find user by email or Atlassian ID
    const { data: existingUserByEmailData, error: emailError } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .limit(1);
    const existingUserByEmail = existingUserByEmailData?.[0];
    
    if (emailError) {
      console.error("[linkOrCreateUser] Error querying by email:", emailError);
      throw new Error(`Failed to query user by email: ${emailError.message}`);
    }
    
    const { data: existingUserByAtlassianIdData, error: atlassianError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);
    const existingUserByAtlassianId = existingUserByAtlassianIdData?.[0];
    
    if (atlassianError) {
      console.error("[linkOrCreateUser] Error querying by Atlassian ID:", atlassianError);
      throw new Error(`Failed to query user by Atlassian ID: ${atlassianError.message}`);
    }

    const existingUser = existingUserByEmail || existingUserByAtlassianId;

    if (existingUser) {
      // User exists - link/update Atlassian ID if needed
      const updates = {};
      if (!existingUser.atlassian_account_id) {
        updates.atlassian_account_id = accountId;
      }
      if (displayName && !existingUser.name) {
        updates.name = displayName;
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("User")
          .update(updates)
          .eq("id", existingUser.id);

        if (updateError) throw updateError;
      }

      // Register for event if event exists and user not already registered
      if (event) {
        const { data: registrationData } = await supabase
          .from("EventRegistration")
          .select("*")
          .eq("eventId", event.id)
          .eq("userId", existingUser.id)
          .limit(1);
        const registration = registrationData?.[0];

        if (!registration) {
          const { error: regError } = await supabase.from("EventRegistration").insert({
            id: makeId("reg"),
            eventId: event.id,
            userId: existingUser.id,
          });
          if (regError) {
            console.error("Failed to create event registration for existing user:", regError.message);
            return { user: transformUser({ ...existingUser, ...updates }), warning: "Profile saved but event registration failed." };
          }
        }
      }

      return { user: transformUser({ ...existingUser, ...updates }) };
    } else {
      // Create new user
      const newUser = {
        id: makeId("user"),
        email,
        name: displayName || email.split("@")[0],
        atlassian_account_id: accountId,
        role: "USER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: createdUserData, error: createError } = await supabase
        .from("User")
        .insert(newUser)
        .select();

      if (createError) throw createError;

      // Use createdUser if returned (as array), otherwise fall back to newUser
      const user = createdUserData?.[0] || newUser;

      if (event && user && user.id) {
        const { error: regError } = await supabase.from("EventRegistration").insert({
          id: makeId("reg"),
          eventId: event.id,
          userId: user.id,
        });
        if (regError) {
          console.error("Failed to create event registration for new user:", regError.message);
          return { user: transformUser(user), warning: "Profile created but event registration failed." };
        }
      }

      return { user: transformUser(user) };
    }
  } catch (error) {
    console.error("linkOrCreateUser error:", error);
    throw new Error(`Failed to link/create user: ${error.message}`);
  }
});

/**
 * Get all registrations for current event
 */
resolver.define("getRegistrations", async (req) => {
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { registrations: [] };
  }

  try {
    const { data: registrations, error } = await supabase
      .from("EventRegistration")
      .select(`
        *,
        user:User(*)
      `)
      .eq("eventId", event.id);

    if (error) throw error;

    return {
      registrations: (registrations || []).map((reg) => transformUser(reg.user)),
    };
  } catch (error) {
    console.error("getRegistrations error:", error);
    throw new Error(`Failed to get registrations: ${error.message}`);
  }
});

/**
 * Update user registration (skills, callsign, etc.)
 */
resolver.define("updateRegistration", async (req) => {
  const accountId = getCallerAccountId(req);
  const { updates } = req.payload || {};
  if (!updates) {
    throw new Error("updates is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: findError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (findError || !user) {
      throw new Error("User not found");
    }

    // Prepare update object
    const dbUpdates = {
      updatedAt: new Date().toISOString(),
    };

    const nextName = updates.name ?? updates.displayName;
    if (nextName !== undefined) dbUpdates.name = nextName;
    if (updates.callsign !== undefined) dbUpdates.callsign = updates.callsign;
    if (updates.skills !== undefined) {
      if (Array.isArray(updates.skills)) {
        dbUpdates.skills = updates.skills.join(", ");
      } else if (typeof updates.skills === "string") {
        dbUpdates.skills = updates.skills;
      }
    }
    if (updates.role) {
      dbUpdates.role = REVERSE_ROLE_MAP[updates.role] || "USER";
    }
    if (updates.bio !== undefined) {
      dbUpdates.bio = updates.bio;
    }
    if (updates.isFreeAgent !== undefined) {
      dbUpdates.isFreeAgent = !!updates.isFreeAgent;
    }

    const { data: updatedUserData, error: updateError } = await supabase
      .from("User")
      .update(dbUpdates)
      .eq("id", user.id)
      .select();

    if (updateError) throw updateError;

    const updatedUser = updatedUserData?.[0] || user;
    return { user: transformUser(updatedUser) };
  } catch (error) {
    console.error("updateRegistration error:", error);
    throw new Error(`Failed to update registration: ${error.message}`);
  }
});

/**
 * Admin-only: update another user's role.
 * Payload: { targetUserId: string, role: "participant"|"ambassador"|"judge"|"admin" }
 */
resolver.define("adminUpdateUserRole", async (req) => {
  const accountId = getCallerAccountId(req);
  const { targetUserId, role } = req.payload || {};

  if (!targetUserId || !role) {
    throw new Error("targetUserId and role are required");
  }
  if (!REVERSE_ROLE_MAP[role]) {
    throw new Error(`Invalid role: ${role}`);
  }

  const supabase = getSupabaseClient();

  try {
    const caller = await getUserByAccountId(supabase, accountId, "id, role");
    if (caller.role !== "ADMIN") {
      throw new Error("Only admins can update user roles");
    }

    const { error: updateError } = await supabase
      .from("User")
      .update({ role: REVERSE_ROLE_MAP[role], updatedAt: new Date().toISOString() })
      .eq("id", targetUserId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("adminUpdateUserRole error:", error);
    throw new Error(`Failed to update user role: ${error.message}`);
  }
});

/**
 * Admin-only: delete a user registration
 * Payload: { userId: string }
 */
resolver.define("adminDeleteRegistration", async (req) => {
  const accountId = getCallerAccountId(req);
  const { userId } = req.payload || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify caller is admin
    const caller = await getUserByAccountId(supabase, accountId, "id, role");
    if (caller.role !== "ADMIN") {
      throw new Error("Only admins can delete user registrations");
    }

    // Get user to delete
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id, name, atlassian_account_id")
      .eq("id", userId)
      .limit(1);

    const userToDelete = userData?.[0];
    if (userError || !userToDelete) {
      throw new Error("User not found");
    }

    // Get all teams where user is captain
    const { data: captainTeams } = await supabase
      .from("TeamMember")
      .select("teamId, team:Team(id, name)")
      .eq("userId", userId)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED");

    // Delete all TeamMember records for this user
    const { error: teamMemberError } = await supabase
      .from("TeamMember")
      .delete()
      .eq("userId", userId);

    if (teamMemberError) {
      console.warn("Failed to delete TeamMember records:", teamMemberError);
    }

    // Delete all notifications for this user
    const { error: notificationError } = await supabase
      .from("Notification")
      .delete()
      .eq("userId", userId);

    if (notificationError) {
      console.warn("Failed to delete Notification records:", notificationError);
    }

    // If user was captain of any teams, those teams are now orphaned
    // The admin should reassign captains or delete those teams separately
    const orphanedTeamCount = captainTeams?.length || 0;

    // Delete the user
    const { error: deleteError } = await supabase
      .from("User")
      .delete()
      .eq("id", userId);

    if (deleteError) throw deleteError;

    return {
      success: true,
      deletedUserId: userId,
      orphanedTeams: orphanedTeamCount,
      message: orphanedTeamCount > 0
        ? `User deleted. Warning: ${orphanedTeamCount} team(s) are now without a captain.`
        : "User deleted successfully.",
    };
  } catch (error) {
    console.error("adminDeleteRegistration error:", error);
    throw new Error(`Failed to delete user registration: ${error.message}`);
  }
});

/**
 * Update user's auto-assign opt-in preference
 */
resolver.define("updateAutoAssignOptIn", async (req) => {
  const accountId = getCallerAccountId(req);
  const { optIn } = req.payload || {};
  if (optIn === undefined) {
    throw new Error("optIn is required");
  }

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { error: updateError } = await supabase
      .from("User")
      .update({
        autoAssignOptIn: optIn,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return { success: true, autoAssignOptIn: optIn };
  } catch (error) {
    console.error("updateAutoAssignOptIn error:", error);
    throw new Error(`Failed to update auto-assign preference: ${error.message}`);
  }
});

// ============================================================================
// TEAMS
// ============================================================================

/**
 * Get all teams for current event
 */
resolver.define("getTeams", async (req) => {
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { teams: [] };
  }

  try {
    const startedAt = Date.now();
    const { data: teams, error: teamsError } = await supabase
      .from("Team")
      .select("id, eventId, name, description, lookingFor, maxSize, createdAt")
      .eq("eventId", event.id)
      // Include legacy rows where isPublic was never set (null)
      .or("isPublic.eq.true,isPublic.is.null")
      .order("createdAt", { ascending: false });

    if (teamsError) throw teamsError;
    const teamRows = teams || [];
    const notViableIdeas = await getStoredNotViableIdeas(event.id);
    const filteredTeamRows = teamRows.filter((team) => !notViableIdeas[team.id]);
    if (filteredTeamRows.length === 0) {
      return { teams: [] };
    }

    const teamIds = filteredTeamRows.map((t) => t.id);
    const [membersResult, projectsResult] = await Promise.all([
      supabase
        .from("TeamMember")
        .select(`
          id,
          teamId,
          userId,
          role,
          status,
          createdAt,
          user:User(id, name, callsign, skills)
        `)
        .in("teamId", teamIds),
      supabase
        .from("Project")
        .select("id, teamId, name, description, videoUrl, repoUrl, demoUrl, submittedAt")
        .in("teamId", teamIds),
    ]);

    if (membersResult.error) throw membersResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const membersByTeam = new Map();
    for (const member of membersResult.data || []) {
      if (!membersByTeam.has(member.teamId)) membersByTeam.set(member.teamId, []);
      membersByTeam.get(member.teamId).push(member);
    }

    const projectByTeam = new Map();
    for (const project of projectsResult.data || []) {
      if (!projectByTeam.has(project.teamId)) {
        projectByTeam.set(project.teamId, project);
      }
    }

    const baseTeams = filteredTeamRows.map((team) =>
      transformTeam(
        team,
        membersByTeam.get(team.id) || [],
        projectByTeam.get(team.id)
      )
    );
    const teamsWithDetails = await Promise.all(
      baseTeams.map((team) => hydrateTeamDetailFields(team))
    );

    logDebug(`[getTeams] event=${event.id} rows=${teamRows.length} ms=${Date.now() - startedAt}`);

    return { teams: teamsWithDetails };
  } catch (error) {
    console.error("getTeams error:", error);
    throw new Error(`Failed to get teams: ${error.message}`);
  }
});

resolver.define("getIdeaSummary", async (req) => {
  const accountId = getCallerAccountId(req);
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { ideas: [] };
  }

  try {
    const caller = await getUserByAccountId(supabase, accountId, "id, role, name");
    if (caller.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    const { data: teamRows, error: teamsError } = await supabase
      .from("Team")
      .select("id, eventId, name, description, lookingFor, maxSize, isPublic, isAutoCreated, createdAt, updatedAt")
      .eq("eventId", event.id)
      .order("createdAt", { ascending: false });

    if (teamsError) throw teamsError;

    const visibleTeams = (teamRows || []).filter((team) => !(team.isAutoCreated && team.id === OBSERVERS_TEAM_ID));
    if (visibleTeams.length === 0) {
      return { ideas: [] };
    }

    const teamIds = visibleTeams.map((team) => team.id);
    const [membersResult, projectsResult, notViableMap] = await Promise.all([
      supabase
        .from("TeamMember")
        .select(`
          id,
          teamId,
          userId,
          role,
          status,
          createdAt,
          user:User(id, name)
        `)
        .in("teamId", teamIds),
      supabase
        .from("Project")
        .select("id, teamId, submittedAt")
        .in("teamId", teamIds),
      getStoredNotViableIdeas(event.id),
    ]);

    if (membersResult.error) throw membersResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const membersByTeam = new Map();
    for (const member of membersResult.data || []) {
      if (!membersByTeam.has(member.teamId)) membersByTeam.set(member.teamId, []);
      membersByTeam.get(member.teamId).push(member);
    }

    const projectByTeam = new Map();
    for (const project of projectsResult.data || []) {
      if (!projectByTeam.has(project.teamId)) {
        projectByTeam.set(project.teamId, project);
      }
    }

    const ideas = visibleTeams.map((team) => {
      const teamMembers = membersByTeam.get(team.id) || [];
      const acceptedMembers = teamMembers.filter((member) => member.status === "ACCEPTED");
      const pendingMembers = teamMembers.filter((member) => member.status === "PENDING");
      const ownerMember = acceptedMembers.find((member) => member.role === "OWNER");
      const project = projectByTeam.get(team.id);
      const notViableMeta = notViableMap[team.id] || null;

      return {
        id: team.id,
        name: team.name || "",
        description: team.description || "",
        captainName: ownerMember?.user?.name || "Unassigned",
        memberCount: acceptedMembers.length,
        pendingCount: pendingMembers.length,
        maxMembers: Number(team.maxSize) || 5, // API: Transform DB `maxSize` → API `maxMembers`
        lookingFor: team.lookingFor ? team.lookingFor.split(",").map((value) => value.trim()).filter(Boolean) : [],
        createdAt: team.createdAt || null,
        updatedAt: team.updatedAt || null,
        submissionStatus: project?.submittedAt ? "submitted" : "not_submitted",
        isPublic: team.isPublic !== false,
        viabilityStatus: notViableMeta ? "not_viable" : "viable",
        notViableMeta,
      };
    });

    return { ideas };
  } catch (error) {
    console.error("getIdeaSummary error:", error);
    throw new Error(`Failed to get idea summary: ${error.message}`);
  }
});

resolver.define("markIdeaNotViable", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, reason } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const normalizedReason = typeof reason === "string" ? reason.trim().slice(0, JOIN_REASON_MAX_LENGTH) : "";
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    throw new Error("No current event found");
  }

  try {
    const caller = await getUserByAccountId(supabase, accountId, "id, role, name");
    if (caller.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    const { data: teamData, error: teamError } = await supabase
      .from("Team")
      .select("id, eventId, name, isAutoCreated")
      .eq("id", teamId)
      .eq("eventId", event.id)
      .limit(1);

    if (teamError) throw teamError;
    const team = teamData?.[0];
    if (!team) {
      throw new Error("Idea not found");
    }
    if (team.isAutoCreated && team.id === OBSERVERS_TEAM_ID) {
      throw new Error("Observers team cannot be marked not viable");
    }

    const notViableMap = await getStoredNotViableIdeas(event.id);
    if (notViableMap[teamId]) {
      return { success: true, alreadyNotViable: true, teamId };
    }

    const { data: teamMembers, error: membersError } = await supabase
      .from("TeamMember")
      .select("id, userId")
      .eq("teamId", teamId);
    if (membersError) throw membersError;

    const memberRows = teamMembers || [];
    const memberIds = memberRows.map((row) => row.id);
    const userIds = Array.from(new Set(memberRows.map((row) => row.userId).filter(Boolean)));

    if (userIds.length > 0) {
      const { error: freeAgentUpdateError } = await supabase
        .from("User")
        .update({
          isFreeAgent: true,
          updatedAt: new Date().toISOString(),
        })
        .in("id", userIds);

      if (freeAgentUpdateError) throw freeAgentUpdateError;
    }

    if (memberIds.length > 0) {
      const { error: deleteMemberError } = await supabase
        .from("TeamMember")
        .delete()
        .in("id", memberIds);
      if (deleteMemberError) throw deleteMemberError;
    }

    const { error: updateTeamError } = await supabase
      .from("Team")
      .update({
        isPublic: false,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", teamId);
    if (updateTeamError) throw updateTeamError;

    const nowIso = new Date().toISOString();
    if (userIds.length > 0) {
      const notifications = userIds.map((userId) => ({
        id: makeId("notif"),
        userId,
        type: "IDEA_NOT_VIABLE",
        title: "Idea marked not viable",
        message: normalizedReason
          ? `Your idea "${team.name}" was marked not viable. ${normalizedReason}. You are now a free agent.`
          : `Your idea "${team.name}" was marked not viable because it is already being worked on. You are now a free agent.`,
        actionUrl: "marketplace",
        createdAt: nowIso,
      }));

      for (const batch of chunkArray(notifications, NOTIFICATION_BATCH_SIZE)) {
        const { error: notificationError } = await supabase
          .from("Notification")
          .insert(batch);
        if (notificationError) {
          console.warn("Failed to notify one or more users about not-viable idea:", notificationError.message);
        }
      }
    }

    notViableMap[teamId] = {
      teamId,
      teamName: team.name || "",
      markedAt: nowIso,
      markedByAccountId: accountId,
      reason: normalizedReason,
    };
    await setStoredNotViableIdeas(event.id, notViableMap);

    return {
      success: true,
      teamId,
      markedAt: nowIso,
      releasedMemberCount: userIds.length,
    };
  } catch (error) {
    console.error("markIdeaNotViable error:", error);
    throw new Error(`Failed to mark idea not viable: ${error.message}`);
  }
});

/**
 * Get a single team by ID with full details
 */
resolver.define("getTeam", async (req) => {
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Fetch team
    const { data: teamData, error: teamError } = await supabase
      .from("Team")
      .select("*")
      .eq("id", teamId)
      .limit(1);

    const team = teamData?.[0];
    if (teamError || !team) {
      throw new Error("Team not found");
    }

    // Fetch all team members (including pending requests)
    const { data: members } = await supabase
      .from("TeamMember")
      .select(`
        *,
        user:User(*)
      `)
      .eq("teamId", teamId);

    // Fetch project
    const { data: project } = await supabase
      .from("Project")
      .select("*")
      .eq("teamId", teamId)
      .limit(1);

    const projectRow = project?.[0];

    // Transform team with full member set (accepted + pending).
    const transformedTeam = await hydrateTeamDetailFields(
      transformTeam(team, members || [], projectRow)
    );

    return { team: transformedTeam };
  } catch (error) {
    console.error("getTeam error:", error);
    throw new Error(`Failed to get team: ${error.message}`);
  }
});

/**
 * Update team details (captain only)
 */
resolver.define("updateTeam", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, updates } = req.payload || {};
  if (!teamId || !updates) {
    throw new Error("teamId and updates are required");
  }

  const supabase = getSupabaseClient();
  let didTransferCaptain = false;

  try {
    // Find user by Atlassian ID
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Verify user is team captain
    const { data: captainData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const captain = captainData?.[0];
    if (!captain) {
      throw new Error("Only team captain can update team details");
    }

    // Handle captain transfer separately
    if (updates.captainId && updates.captainId !== user.id) {
      // Verify new captain is a team member
      const { data: newCaptainMember } = await supabase
        .from("TeamMember")
        .select("*")
        .eq("teamId", teamId)
        .eq("userId", updates.captainId)
        .eq("status", "ACCEPTED")
        .limit(1);

      if (!newCaptainMember?.[0]) {
        throw new Error("New captain must be an existing team member");
      }

      // Demote current captain to MEMBER
      await supabase
        .from("TeamMember")
        .update({ role: "MEMBER" })
        .eq("id", captain.id);

      // Promote new captain to OWNER
      await supabase
        .from("TeamMember")
        .update({ role: "OWNER" })
        .eq("id", newCaptainMember[0].id);
      didTransferCaptain = true;

      // Remove captainId from updates to avoid setting it on Team table
      delete updates.captainId;
    }

    const teamDetailFieldUpdates = {};
    if (Object.prototype.hasOwnProperty.call(updates, "problem")) {
      teamDetailFieldUpdates.problem = typeof updates.problem === "string" ? updates.problem : "";
    }
    if (Object.prototype.hasOwnProperty.call(updates, "moreInfo")) {
      teamDetailFieldUpdates.moreInfo = typeof updates.moreInfo === "string" ? updates.moreInfo : "";
    }

    // Build update object for Team table (DB-native fields only)
    const teamUpdates = {};
    if (updates.name !== undefined) teamUpdates.name = updates.name;
    if (updates.description !== undefined) teamUpdates.description = updates.description;
    if (updates.lookingFor !== undefined) {
      teamUpdates.lookingFor = Array.isArray(updates.lookingFor)
        ? updates.lookingFor.join(", ")
        : updates.lookingFor;
    }
    if (updates.maxMembers !== undefined) {
      const newMax = Number(updates.maxMembers);
      // Validate max size is between 2 and 5
      if (newMax >= 2 && newMax <= 5) {
        teamUpdates.maxSize = newMax; // API: Transform API `maxMembers` → DB `maxSize`
      }
    }
    teamUpdates.updatedAt = new Date().toISOString();

    // Update team if there are changes
    if (Object.keys(teamUpdates).length > 1) {
      const { error: updateError } = await supabase
        .from("Team")
        .update(teamUpdates)
        .eq("id", teamId);

      if (updateError) throw updateError;
    }

    // Persist problem/moreInfo in Forge storage for schema compatibility.
    if (Object.keys(teamDetailFieldUpdates).length > 0) {
      await setStoredTeamDetailFields(teamId, teamDetailFieldUpdates);
    }

    const hasOnlyTeamDetailFieldUpdates =
      Object.keys(teamUpdates).length === 1 &&
      Object.keys(teamDetailFieldUpdates).length > 0 &&
      !didTransferCaptain;
    if (hasOnlyTeamDetailFieldUpdates) {
      return {
        success: true,
        teamId,
      };
    }

    // Fetch and return updated team
    const { data: updatedTeamData } = await supabase
      .from("Team")
      .select("*")
      .eq("id", teamId)
      .limit(1);

    const { data: members } = await supabase
      .from("TeamMember")
      .select(`*, user:User(*)`)
      .eq("teamId", teamId);

    const { data: projectData } = await supabase
      .from("Project")
      .select("*")
      .eq("teamId", teamId)
      .limit(1);
    const project = projectData?.[0];

    return {
      team: await hydrateTeamDetailFields(
        transformTeam(updatedTeamData?.[0], members || [], project)
      ),
    };
  } catch (error) {
    console.error("updateTeam error:", error);
    throw new Error(`Failed to update team: ${error.message}`);
  }
});

/**
 * Create a new team
 */
resolver.define("createTeam", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamData } = req.payload || {};
  if (!teamData) {
    throw new Error("teamData is required");
  }

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    throw new Error("No current event found");
  }

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    const teamId = makeId("team");

    // Get trackSide from user or default to HUMAN
    const trackSide = user.trackSide || "HUMAN";

    // Create team
    const { error: teamError } = await supabase.from("Team").insert({
      id: teamId,
      eventId: event.id,
      name: teamData.name,
      description: teamData.description || "",
      lookingFor: teamData.lookingFor?.join(", ") || "",
      maxSize: teamData.maxMembers || 5, // API: Transform API `maxMembers` → DB `maxSize`
      trackSide: trackSide,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (teamError) throw teamError;

    // Add creator as owner
    const { error: memberError } = await supabase.from("TeamMember").insert({
      id: makeId("member"),
      teamId,
      userId: user.id,
      role: "OWNER",
      status: "ACCEPTED",
      createdAt: new Date().toISOString(),
    });

    if (memberError) throw memberError;

    // Update user to not be free agent
    await supabase.from("User").update({ isFreeAgent: false }).eq("id", user.id);

    return { teamId };
  } catch (error) {
    console.error("createTeam error:", error);
    throw new Error(`Failed to create team: ${error.message}`);
  }
});

/**
 * Request to join a team
 */
resolver.define("requestToJoin", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, message } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Prevent duplicate requests / membership rows
    const { data: existingMemberData, error: existingMemberError } = await supabase
      .from("TeamMember")
      .select("id, status")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .limit(1);

    if (existingMemberError) throw existingMemberError;

    const existingMember = existingMemberData?.[0];
    if (existingMember) {
      if (existingMember.status === "ACCEPTED") {
        throw new Error("Already a member of this team");
      }
      if (existingMember.status === "PENDING") {
        throw new Error("Join request already pending");
      }
    }

    // Check team capacity before creating request
    const { data: teamData, error: teamError } = await supabase
      .from("Team")
      .select("id, maxSize")
      .eq("id", teamId)
      .limit(1);

    if (teamError) throw teamError;

    const team = teamData?.[0];
    if (!team) {
      throw new Error("Team not found");
    }

    // Count current accepted members
    const { data: currentMembers, error: membersError } = await supabase
      .from("TeamMember")
      .select("id")
      .eq("teamId", teamId)
      .eq("status", "ACCEPTED");

    if (membersError) throw membersError;

    const currentMemberCount = currentMembers?.length || 0;
    const maxSize = team.maxSize || 5;

    if (currentMemberCount >= maxSize) {
      throw new Error("Team is already at maximum capacity");
    }

    // Create join request
    const { error: joinError } = await supabase.from("TeamMember").insert({
      id: makeId("member"),
      teamId,
      userId: user.id,
      role: "MEMBER",
      status: "PENDING",
      message: message?.trim() || null,
      createdAt: new Date().toISOString(),
    });

    if (joinError) throw joinError;

    // Create notification for team captain
    const { data: teamInfo } = await supabase
      .from("Team")
      .select("members:TeamMember(userId, role)")
      .eq("id", teamId)
      .limit(1);

    const captain = teamInfo?.[0]?.members?.find(m => m.role === "OWNER");
    if (captain) {
      await supabase.from("Notification").insert({
        id: makeId("notif"),
        userId: captain.userId,
        type: "JOIN_REQUEST",
        title: "Join Request Received",
        message: `${user.name || "Someone"} wants to join your team`,
        actionUrl: `teams?teamId=${teamId}`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("requestToJoin error:", error);
    throw new Error(`Failed to request join: ${error.message}`);
  }
});

/**
 * Handle join request (accept/decline)
 */
resolver.define("handleJoinRequest", async (req) => {
  const accountId = getCallerAccountId(req);
  const { requestId, accepted } = req.payload || {};
  if (!requestId || accepted === undefined) {
    throw new Error("requestId and accepted are required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get the request
    const { data: requestData, error: requestError } = await supabase
      .from("TeamMember")
      .select("*, team:Team(*)")
      .eq("id", requestId)
      .limit(1);

    const request = requestData?.[0];
    if (requestError || !request) {
      throw new Error("Join request not found");
    }

    // Verify user is team captain
    const { data: captainData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", request.teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const captain = captainData?.[0];

    if (!captain) {
      throw new Error("Only team captain can handle join requests");
    }

    if (accepted) {
      // Check if team is already at maximum capacity
      const { data: currentMembers } = await supabase
        .from("TeamMember")
        .select("id")
        .eq("teamId", request.teamId)
        .eq("status", "ACCEPTED");

      const currentMemberCount = currentMembers?.length || 0;
      const maxSize = request.team?.maxSize || 5;

      if (currentMemberCount >= maxSize) {
        throw new Error("Team is already at maximum capacity");
      }

      // Accept request
      const { error: updateError } = await supabase
        .from("TeamMember")
        .update({ status: "ACCEPTED" })
        .eq("id", requestId);

      if (updateError) throw updateError;

        // Update user to not be free agent
        await supabase.from("User").update({ isFreeAgent: false }).eq("id", request.userId);

        // Create notification for the user who was accepted
        await supabase.from("Notification").insert({
          id: makeId("notif"),
          userId: request.userId,
          type: "JOIN_REQUEST",
          title: "Join Request Accepted",
          message: "Your request to join the team has been accepted",
          actionUrl: "teams",
        });
      } else {
      // Reject request - delete it
      const { error: deleteError } = await supabase.from("TeamMember").delete().eq("id", requestId);
      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error("handleJoinRequest error:", error);
    throw new Error(`Failed to handle join request: ${error.message}`);
  }
});

/**
 * Leave a team
 */
resolver.define("leaveTeam", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Remove from team
    const { error: leaveError } = await supabase
      .from("TeamMember")
      .delete()
      .eq("teamId", teamId)
      .eq("userId", user.id);

    if (leaveError) throw leaveError;

    // Update user to be free agent
    await supabase.from("User").update({ isFreeAgent: true }).eq("id", user.id);

    return { success: true };
  } catch (error) {
    console.error("leaveTeam error:", error);
    throw new Error(`Failed to leave team: ${error.message}`);
  }
});

/**
 * Delete a team (captain only)
 */
resolver.define("deleteTeam", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Verify user is team captain
    const { data: captainData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const captain = captainData?.[0];

    if (!captain) {
      throw new Error("Only team captain can delete team");
    }

    // Allow delete (disband) only until the hack starts; once hacking or later, block.
    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }
    const appPhase = PHASE_MAP[event.phase] || "signup";
    const canDeleteByPhase = appPhase === "signup" || appPhase === "team_formation";
    if (!canDeleteByPhase) {
      throw new Error("Teams cannot be deleted once the hack has started. Contact an admin if you need to disband.");
    }

    // Resolve team members up-front so we can safely free them after deletion.
    const { data: memberRows, error: memberLookupError } = await supabase
      .from("TeamMember")
      .select("userId")
      .eq("teamId", teamId);
    if (memberLookupError) throw memberLookupError;

    // Remove dependent rows first; do not rely on DB-level cascade behavior.
    const { error: inviteDeleteError } = await supabase
      .from("TeamInvite")
      .delete()
      .eq("teamId", teamId);
    if (inviteDeleteError) throw inviteDeleteError;

    const { error: projectDeleteError } = await supabase
      .from("Project")
      .delete()
      .eq("teamId", teamId);
    if (projectDeleteError) throw projectDeleteError;

    const { error: memberDeleteError } = await supabase
      .from("TeamMember")
      .delete()
      .eq("teamId", teamId);
    if (memberDeleteError) throw memberDeleteError;

    const { error: deleteError } = await supabase
      .from("Team")
      .delete()
      .eq("id", teamId);
    if (deleteError) throw deleteError;
    await removeStoredTeamDetailFields(teamId);

    const memberIds = Array.from(
      new Set((memberRows || []).map((row) => row.userId).filter(Boolean))
    );
    if (memberIds.length > 0) {
      const { error: freeAgentError } = await supabase
        .from("User")
        .update({ isFreeAgent: true, updatedAt: new Date().toISOString() })
        .in("id", memberIds);
      if (freeAgentError) throw freeAgentError;
    }

    return { success: true };
  } catch (error) {
    console.error("deleteTeam error:", error);
    throw new Error(`Failed to delete team: ${error.message}`);
  }
});

// ============================================================================
// TEAM INVITES
// ============================================================================

/**
 * Get free agents (users who are not on a team)
 */
resolver.define("getFreeAgents", async (req) => {
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { freeAgents: [] };
  }

  try {
    // Get all free agents
    const { data: freeAgents, error } = await supabase
      .from("User")
      .select("*")
      .eq("isFreeAgent", true)
      .eq("role", "USER")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // Get pending invites for these users
    const userIds = (freeAgents || []).map(u => u.id);
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        team:Team(id, name)
      `)
      .in("userId", userIds)
      .eq("status", "PENDING");

    if (invitesError) throw invitesError;

    // Group invites by userId
    const invitesByUser = {};
    (invites || []).forEach(invite => {
      if (!invitesByUser[invite.userId]) {
        invitesByUser[invite.userId] = [];
      }
      invitesByUser[invite.userId].push({
        id: invite.id,
        teamId: invite.teamId,
        teamName: invite.team?.name || "Unknown Team",
        message: invite.message || "",
        createdAt: invite.createdAt,
      });
    });

    // Transform to Forge format
    const transformedAgents = (freeAgents || []).map(user => ({
      id: user.id,
      accountId: user.atlassian_account_id,
      name: user.name || "Unknown",
      email: user.email,
      skills: user.skills ? user.skills.split(",").map(s => s.trim()) : [],
      invites: invitesByUser[user.id] || [],
    }));

    return { freeAgents: transformedAgents };
  } catch (error) {
    console.error("getFreeAgents error:", error);
    throw new Error(`Failed to get free agents: ${error.message}`);
  }
});

/**
 * Get invites for a specific user
 */
resolver.define("getUserInvites", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get invites for this user (including expired)
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        team:Team(id, name, description)
      `)
      .eq("userId", user.id)
      .in("status", ["PENDING", "EXPIRED"])
      .order("createdAt", { ascending: false });

    if (invitesError) throw invitesError;

    const now = new Date();
    
    // Check expiration and update expired invites
    const invitesToUpdate = [];
    const transformedInvites = (invites || []).map(invite => {
      const expiresAt = invite.expiresAt ? new Date(invite.expiresAt) : null;
      const isExpired = invite.status === "PENDING" && expiresAt && expiresAt < now;
      
      if (isExpired) {
        invitesToUpdate.push(invite.id);
      }

      return {
        id: invite.id,
        teamId: invite.teamId,
        teamName: invite.team?.name || "Unknown Team",
        teamDescription: invite.team?.description || "",
        message: invite.message || "",
        status: isExpired ? "EXPIRED" : invite.status,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        isExpired,
      };
    });

    // Update expired invites in database
    if (invitesToUpdate.length > 0) {
      await supabase
        .from("TeamInvite")
        .update({ status: "EXPIRED" })
        .in("id", invitesToUpdate);
    }

    return { invites: transformedInvites };
  } catch (error) {
    console.error("getUserInvites error:", error);
    throw new Error(`Failed to get user invites: ${error.message}`);
  }
});

/**
 * Send an invite to a free agent
 */
resolver.define("sendInvite", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, userId, message } = req.payload || {};
  if (!teamId || !userId) {
    throw new Error("teamId and userId are required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find captain by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: captainData, error: captainError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const captain = captainData?.[0];
    if (captainError || !captain) {
      throw new Error("User not found");
    }

    // Verify user is team captain
    const { data: teamMemberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", captain.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const teamMember = teamMemberData?.[0];

    if (!teamMember) {
      throw new Error("Only team captain can send invites");
    }

    // Check if invite already exists
    const { data: existingInviteData } = await supabase
      .from("TeamInvite")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", userId)
      .eq("status", "PENDING")
      .limit(1);
    const existingInvite = existingInviteData?.[0];

    if (existingInvite) {
      throw new Error("Invite already sent to this user");
    }

    // Create invite with expiration (default 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const { error: inviteError } = await supabase.from("TeamInvite").insert({
      id: makeId("invite"),
      teamId,
      userId,
      message: message || null,
      status: "PENDING",
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });

    if (inviteError) throw inviteError;

    // Get team name for notification
    const { data: teamData } = await supabase
      .from("Team")
      .select("name")
      .eq("id", teamId)
      .limit(1);

    // Create notification for the invited user
    await supabase.from("Notification").insert({
      id: makeId("notif"),
      userId,
      type: "TEAM_INVITE",
      title: "Team Invite Received",
      message: `You've been invited to join ${teamData?.[0]?.name || "a team"}`,
      actionUrl: "marketplace",
    });

    return { success: true };
  } catch (error) {
    console.error("sendInvite error:", error);
    throw new Error(`Failed to send invite: ${error.message}`);
  }
});

/**
 * Respond to an invite (accept or decline)
 */
resolver.define("respondToInvite", async (req) => {
  const accountId = getCallerAccountId(req);
  const { inviteId, accepted } = req.payload || {};
  if (!inviteId || accepted === undefined) {
    throw new Error("inviteId and accepted are required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get the invite
    const { data: inviteData, error: inviteError } = await supabase
      .from("TeamInvite")
      .select("*, team:Team(*)")
      .eq("id", inviteId)
      .eq("userId", user.id)
      .limit(1);

    const invite = inviteData?.[0];
    if (inviteError || !invite) {
      throw new Error("Invite not found");
    }

    if (accepted) {
      // Accept invite
      const { error: updateError } = await supabase
        .from("TeamInvite")
        .update({ status: "ACCEPTED" })
        .eq("id", inviteId);

      if (updateError) throw updateError;

      // Add user to team
      const { error: memberError } = await supabase.from("TeamMember").insert({
        id: makeId("member"),
        teamId: invite.teamId,
        userId: user.id,
        role: "MEMBER",
        status: "ACCEPTED",
        createdAt: new Date().toISOString(),
      });

      if (memberError) throw memberError;

      // Update user to not be free agent
      await supabase.from("User").update({ isFreeAgent: false }).eq("id", user.id);

      // Expire other pending invites for this user
      await supabase
        .from("TeamInvite")
        .update({ status: "EXPIRED" })
        .eq("userId", user.id)
        .eq("status", "PENDING")
        .neq("id", inviteId);

      // Create notification for team captain
      const { data: team } = await supabase
        .from("Team")
        .select("members:TeamMember(userId, role)")
        .eq("id", invite.teamId)
        .limit(1);

      const captain = team?.[0]?.members?.find(m => m.role === "OWNER");
      if (captain) {
        await supabase.from("Notification").insert({
          id: makeId("notif"),
          userId: captain.userId,
          type: "TEAM_INVITE",
          title: "Invite Accepted",
          message: `${user.name || "Someone"} accepted your team invite`,
          actionUrl: `teams?teamId=${invite.teamId}`,
        });
      }
    } else {
      // Decline invite
      const { error: updateError } = await supabase
        .from("TeamInvite")
        .update({ status: "DECLINED" })
        .eq("id", inviteId);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error("respondToInvite error:", error);
    throw new Error(`Failed to respond to invite: ${error.message}`);
  }
});

// ============================================================================
// SUBMISSIONS
// ============================================================================

/**
 * Helper: Validate URL format and protocol
 */
function validateUrl(url, fieldName, required = false) {
  if (!url && !required) return null;
  if (!url) throw new Error(`${fieldName} is required`);

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`${fieldName} must use http:// or https://`);
    }
    return url.trim();
  } catch (err) {
    throw new Error(`${fieldName} is not a valid URL`);
  }
}

/**
 * Submit or update project submission
 */
resolver.define("submitProject", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, submissionData } = req.payload || {};
  if (!teamId || !submissionData) {
    throw new Error("teamId and submissionData are required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify user is team member (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    const { data: memberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("status", "ACCEPTED")
      .limit(1);

    const member = memberData?.[0];
    if (!member) {
      throw new Error("User is not a member of this team");
    }

    // Check if project exists
    const { data: existingData } = await supabase.from("Project").select("id").eq("teamId", teamId).limit(1);
    const existing = existingData?.[0];

    const projectData = {
      name: String(submissionData.projectName || "").trim(),
      description: String(submissionData.description || "").trim(),
      videoUrl: validateUrl(submissionData.demoVideoUrl, "Demo video URL"),
      repoUrl: validateUrl(submissionData.repoUrl, "Repository URL"),
      demoUrl: validateUrl(submissionData.liveDemoUrl, "Live demo URL"),
      submittedAt: submissionData.status === "submitted" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Update existing project
      const { error: updateError } = await supabase.from("Project").update(projectData).eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      // Create new project
      const { error: insertError } = await supabase.from("Project").insert({
        id: makeId("proj"),
        teamId,
        ...projectData,
        createdAt: new Date().toISOString(),
      });
      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error("submitProject error:", error);
    throw new Error(`Failed to submit project: ${error.message}`);
  }
});

// ============================================================================
// VOTING
// ============================================================================

/**
 * Get votes for current user
 */
resolver.define("getVotes", async (req) => {
  let accountId;
  try {
    accountId = getCallerAccountId(req);
  } catch {
    return { votes: [], voteCounts: {} };
  }

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { votes: [], voteCounts: {} };
  }

  try {
    await getUserByAccountId(supabase, accountId, "id");

    // Restrict vote calculations to projects belonging to current event teams.
    const { data: teamRows, error: teamError } = await supabase
      .from("Team")
      .select("id")
      .eq("eventId", event.id);
    if (teamError) throw teamError;

    const teamIds = (teamRows || []).map((t) => t.id);
    if (teamIds.length === 0) {
      return { votes: [], voteCounts: {} };
    }

    const { data: projectRows, error: projectError } = await supabase
      .from("Project")
      .select("id, teamId")
      .in("teamId", teamIds);
    if (projectError) throw projectError;

    const projectIds = (projectRows || []).map((p) => p.id);
    if (projectIds.length === 0) {
      return { votes: [], voteCounts: {} };
    }

    const projectToTeam = Object.fromEntries((projectRows || []).map((p) => [p.id, p.teamId]));

    const allVotesResult = await supabase
      .from("Vote")
      .select("userId, projectId, createdAt")
      .in("projectId", projectIds);

    if (allVotesResult.error) throw allVotesResult.error;

    const voteCounts = {};
    for (const vote of allVotesResult.data || []) {
      const teamId = projectToTeam[vote.projectId];
      if (!teamId) continue;
      voteCounts[teamId] = (voteCounts[teamId] || 0) + 1;
    }

    // Format votes for frontend (with voterId and teamId)
    const formattedVotes = (allVotesResult.data || [])
      .map((vote) => {
        const teamId = projectToTeam[vote.projectId];
        if (!teamId) return null;
        return {
          voterId: vote.userId,
          teamId,
          votedAt: vote.createdAt,
        };
      })
      .filter(Boolean);

    return {
      votes: formattedVotes,
      voteCounts,
    };
  } catch (error) {
    console.error("getVotes error:", error);
    throw new Error(`Failed to get votes: ${error.message}`);
  }
});

/**
 * Cast a vote for a team
 */
resolver.define("castVote", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get team's project
    const { data: projectData, error: projectError } = await supabase
      .from("Project")
      .select("*")
      .eq("teamId", teamId)
      .limit(1);

    const project = projectData?.[0];
    if (projectError || !project) {
      throw new Error("Team has no submitted project");
    }

    // Check if already voted
    const { data: existingData } = await supabase
      .from("Vote")
      .select("*")
      .eq("userId", user.id)
      .eq("projectId", project.id)
      .limit(1);

    const existing = existingData?.[0];

    if (existing) {
      throw new Error("Already voted for this team");
    }

    // Check vote limit (event setting; default 3)
    const event = await getCurrentEvent(supabase, req);
    const maxVotesPerUser = event?.maxVotesPerUser || 3;

    // Get event teams to filter votes by current event
    const { data: eventTeams } = await supabase
      .from("Team")
      .select("id")
      .eq("eventId", event.id);

    const eventTeamIds = new Set((eventTeams || []).map(t => t.id));

    // Get projects for event teams
    const { data: eventProjects } = await supabase
      .from("Project")
      .select("id")
      .in("teamId", Array.from(eventTeamIds));

    const eventProjectIds = (eventProjects || []).map(p => p.id);

    // Count user's votes for current event only
    const { data: userVotes } = await supabase
      .from("Vote")
      .select("*")
      .eq("userId", user.id)
      .in("projectId", eventProjectIds);

    // NOTE: There is still a race condition between this check and insert
    // Proper fix requires database constraint or transaction
    if ((userVotes || []).length >= maxVotesPerUser) {
      throw new Error(`Maximum ${maxVotesPerUser} votes allowed`);
    }

    // Create vote
    const { error: voteError } = await supabase.from("Vote").insert({
      id: makeId("vote"),
      userId: user.id,
      projectId: project.id,
      createdAt: new Date().toISOString(),
    });

    if (voteError) throw voteError;

    return { success: true };
  } catch (error) {
    console.error("castVote error:", error);
    throw new Error(`Failed to cast vote: ${error.message}`);
  }
});

/**
 * Remove a vote
 */
resolver.define("removeVote", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get team's project
    const { data: projectData } = await supabase.from("Project").select("*").eq("teamId", teamId).limit(1);
    const project = projectData?.[0];

    if (!project) {
      throw new Error("Team has no submitted project");
    }

    // Delete vote
    const { error: deleteError } = await supabase
      .from("Vote")
      .delete()
      .eq("userId", user.id)
      .eq("projectId", project.id);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error("removeVote error:", error);
    throw new Error(`Failed to remove vote: ${error.message}`);
  }
});

// ============================================================================
// JUDGING
// ============================================================================

/**
 * Get judge scores
 */
resolver.define("getScores", async (req) => {
  const shouldFilterToCaller = !!req.payload?.accountId;
  const callerAccountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { scores: [] };
  }

  try {
    let query = supabase.from("JudgeScore").select(`
      *,
      judge:User!judgeId(id, name, image)
    `);

    // If accountId provided (legacy), filter by the *caller*.
    // Note: payload spoofing is rejected by getCallerAccountId.
    if (shouldFilterToCaller) {
      const { data: userData } = await supabase
        .from("User")
        .select("*")
        .eq("atlassian_account_id", callerAccountId)
        .limit(1);

      const user = userData?.[0];
      if (user) {
        query = query.eq("judgeId", user.id);
      }
    }

    const { data: scores, error } = await query;

    if (error) throw error;

    // Map project IDs to team IDs
    const { data: projects } = await supabase.from("Project").select("id, teamId");
    const projectToTeam = {};
    (projects || []).forEach((p) => {
      projectToTeam[p.id] = p.teamId;
    });

    return {
      scores: (scores || []).map((score) => ({
        id: score.id,
        judgeId: score.judgeId,
        teamId: projectToTeam[score.projectId] || score.projectId, // Map projectId to teamId
        innovation: score.scores?.innovation || 0,
        technical: score.scores?.technical || 0,
        presentation: score.scores?.presentation || 0,
        impact: score.scores?.impact || 0,
        theme: score.scores?.theme || 0,
        comments: score.comments || "",
        scoredAt: score.createdAt,
      })),
    };
  } catch (error) {
    console.error("getScores error:", error);
    throw new Error(`Failed to get scores: ${error.message}`);
  }
});

/**
 * Helper: Validate judge score field (0-100 range)
 */
function validateScore(score, fieldName) {
  const num = Number(score);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < 0 || num > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }
  return Math.round(num);
}

/**
 * Submit judge score
 */
resolver.define("submitScore", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, scoreData } = req.payload || {};
  if (!teamId || !scoreData) {
    throw new Error("teamId and scoreData are required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Verify user is judge
    if (user.role !== "JUDGE" && user.role !== "ADMIN") {
      throw new Error("Only judges can submit scores");
    }

    // Get team's project
    const { data: projectData, error: projectError } = await supabase
      .from("Project")
      .select("*")
      .eq("teamId", teamId)
      .limit(1);

    const project = projectData?.[0];
    if (projectError || !project) {
      throw new Error("Team has no submitted project");
    }

    // Check if score already exists
    const { data: existingData } = await supabase
      .from("JudgeScore")
      .select("id")
      .eq("judgeId", user.id)
      .eq("projectId", project.id)
      .limit(1);

    const existing = existingData?.[0];

    const scoreRecord = {
      scores: {
        innovation: validateScore(scoreData.innovation || 0, "Innovation"),
        technical: validateScore(scoreData.technical || 0, "Technical"),
        presentation: validateScore(scoreData.presentation || 0, "Presentation"),
        impact: validateScore(scoreData.impact || 0, "Impact"),
        theme: validateScore(scoreData.theme || 0, "Theme"),
      },
      comments: (scoreData.comments || "").toString().trim().slice(0, 1000),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Update existing score
      const { error: updateError } = await supabase
        .from("JudgeScore")
        .update(scoreRecord)
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      // Create new score
      const { error: insertError } = await supabase.from("JudgeScore").insert({
        id: makeId("score"),
        judgeId: user.id,
        projectId: project.id,
        ...scoreRecord,
        createdAt: new Date().toISOString(),
      });

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error("submitScore error:", error);
    throw new Error(`Failed to submit score: ${error.message}`);
  }
});

// ============================================================================
// EVENT PHASE
// ============================================================================

/**
 * Get current event phase and MOTD
 */
resolver.define("getEventPhase", async (req) => {
  const supabase = getSupabaseClient();
  const instanceContext = await getCurrentEventContext(supabase, req);
  const event = instanceContext?.event;
  const defaultEventMeta = {
    name: "HackDay",
    timezone: "Europe/London",
    startAt: null,
    endAt: null,
    schedule: null,
  };

  if (!event) {
    return {
      phase: "signup",
      motd: null,
      motdMessage: null,
      maxVotesPerUser: 3,
      eventMeta: defaultEventMeta,
      branding: {},
      contentOverridesMeta: { version: 0, updatedAt: null, hasOverrides: false },
      configModeCapabilities: {
        enabled: true,
        canUseConfigMode: false,
        isPlatformAdmin: false,
        isEventAdmin: false,
      },
      hasConfigDraft: false,
      instanceContext,
    };
  }

  const storedMotd = await getStoredEventMotd(event.id);
  const fallbackMotd = normalizeMotdMessage(event.motd || "");
  const hasStoredMotd = storedMotd !== undefined;
  const effectiveMotd = hasStoredMotd
    ? storedMotd
    : (fallbackMotd.message ? fallbackMotd : null);
  const eventName =
    (typeof event.name === "string" && event.name.trim()) ||
    (typeof event.title === "string" && event.title.trim()) ||
    defaultEventMeta.name;
  const eventTimezone =
    (typeof event.timezone === "string" && event.timezone.trim()) ||
    defaultEventMeta.timezone;
  const eventStartAt =
    (typeof event.startDate === "string" && event.startDate) ||
    (typeof event.start_date === "string" && event.start_date) ||
    null;
  const eventEndAt =
    (typeof event.endDate === "string" && event.endDate) ||
    (typeof event.end_date === "string" && event.end_date) ||
    null;
  const eventSchedule =
    event.event_schedule && typeof event.event_schedule === "object"
      ? event.event_schedule
      : null;

  const eventBranding =
    event.event_branding && typeof event.event_branding === "object"
      ? event.event_branding
      : {};
  const pageId = instanceContext?.pageId || getConfluencePageId(req);
  let seed = pageId ? await getTemplateSeedByPageId(supabase, pageId) : null;
  const seedPayload = normalizeSeedPayload(seed);
  const seedBranding = seedPayload.branding && typeof seedPayload.branding === "object" ? seedPayload.branding : {};
  const branding = { ...eventBranding, ...seedBranding };
  const basicInfo = seedPayload.basicInfo && typeof seedPayload.basicInfo === "object" ? seedPayload.basicInfo : {};
  const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const eventTagline =
    str(basicInfo.eventTagline) || str(basicInfo.event_tagline) || undefined;
  const seedEventName =
    str(basicInfo.eventName) || str(basicInfo.event_name) || undefined;
  const resolvedEventName = seedEventName || eventName;
  if (seed) {
    logDebug("[getEventPhase] seed present for pageId:", pageId, "eventMeta.name:", resolvedEventName, "eventMeta.tagline:", eventTagline || "(none)");
  }

  let isEventAdmin = false;
  if (seed && pageId) {
    try {
      const accountId = req.context?.accountId;
      const profile = accountId ? await fetchUserProfile(accountId) : null;
      let email = profile?.email || (accountId ? `${accountId}@atlassian.local` : "");
      if (!email || email.endsWith("@atlassian.local")) {
        const { data: userRow } = await supabase
          .from("User")
          .select("email")
          .eq("atlassian_account_id", accountId)
          .limit(1);
        const storedEmail = userRow?.[0]?.email;
        if (storedEmail && typeof storedEmail === "string" && !storedEmail.endsWith("@atlassian.local")) {
          email = storedEmail;
        }
      }
      const cur = normalizeEmail(email);
      if (cur) {
        const primary = normalizeEmail(String(seed.primary_admin_email || "").trim());
        const co = Array.isArray(seed.co_admin_emails)
          ? seed.co_admin_emails.map((e) => normalizeEmail(String(e).trim())).filter(Boolean)
          : [];
        isEventAdmin = cur === primary || co.includes(cur);
      }
    } catch (err) {
      logDebug("[getEventPhase] isEventAdmin check failed:", err.message);
    }
  }

  let isPlatformAdmin = false;
  try {
    const accountId = req.context?.accountId;
    if (accountId) {
      const { data: userRows } = await supabase
        .from("User")
        .select("role")
        .eq("atlassian_account_id", accountId)
        .limit(1);
      isPlatformAdmin = userRows?.[0]?.role === "ADMIN";
    }
  } catch (err) {
    logDebug("[getEventPhase] platform admin lookup failed:", err.message);
  }

  const contentOverrides = await getStoredEventContentOverrides(event.id);
  const configDraft = await getStoredEventConfigDraft(event.id);

  return {
    phase: PHASE_MAP[event.phase] || "signup",
    eventId: event.id,
    motd: effectiveMotd?.message || null,
    motdMessage: effectiveMotd,
    maxVotesPerUser: event.maxVotesPerUser || 3,
    maxTeamSize: event.maxTeamSize || 5,
    eventMeta: {
      name: resolvedEventName,
      tagline: eventTagline,
      timezone: eventTimezone,
      startAt: eventStartAt,
      endAt: eventEndAt,
      schedule: eventSchedule,
    },
    branding,
    isEventAdmin,
    contentOverridesMeta: {
      version: contentOverrides?.version || 0,
      updatedAt: contentOverrides?.updatedAt || null,
      hasOverrides: Boolean(contentOverrides && Object.keys(contentOverrides.values || {}).length > 0),
    },
    configModeCapabilities: {
      enabled: true,
      canUseConfigMode: Boolean(isPlatformAdmin || isEventAdmin),
      isPlatformAdmin,
      isEventAdmin,
    },
    hasConfigDraft: Boolean(configDraft),
    instanceContext,
  };
});

async function buildConfigModeStateResponse(supabase, req, access) {
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

  return {
    success: true,
    eventId: event.id,
    branding,
    motd: effectiveMotd?.message || "",
    motdMessage: effectiveMotd,
    publishedContentOverrides,
    draft,
    configModeCapabilities: {
      enabled: true,
      canUseConfigMode: true,
      isPlatformAdmin: Boolean(ctx.isPlatformAdmin),
      isEventAdmin: Boolean(ctx.isEventAdmin),
      actorRole: ctx.isPlatformAdmin ? "admin" : (ctx.isEventAdmin ? "event_admin" : "unknown"),
    },
    hasConfigDraft: Boolean(draft),
  };
}

resolver.define("getEventConfigModeState", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  return buildConfigModeStateResponse(supabase, req, access);
});

resolver.define("saveEventConfigDraft", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  const payload = req.payload || {};
  const currentDraft = await getStoredEventConfigDraft(access.event.id);
  const publishedContentOverrides = await getStoredEventContentOverrides(access.event.id);
  const nowIso = new Date().toISOString();

  return runSaveConfigModeDraftCore({
    access,
    payload,
    currentDraft,
    publishedContentOverrides,
    nowIso,
    deps: {
      normalizePatch: normalizeConfigModeDraftPatch,
      mergePatches: mergeConfigModeDraftPatches,
      persistDraft: async ({ access, nextDraft }) => {
        await setStoredEventConfigDraft(access.event.id, nextDraft);
      },
      syncEventDraftColumn: async ({ access, nextDraft, nowIso }) => {
        const { error } = await supabase
          .from("Event")
          .update({ event_config_draft: nextDraft, updatedAt: nowIso, updated_at: nowIso })
          .eq("id", access.event.id);
        if (error) {
          throw new Error(error.message);
        }
      },
      buildResponse: async () => buildConfigModeStateResponse(supabase, req, access),
      logger: {
        warn: (msg, detail) => console.warn(msg, detail),
      },
    },
  });
});

resolver.define("discardEventConfigDraft", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);

  await clearStoredEventConfigDraft(access.event.id);
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("Event")
      .update({ event_config_draft: null, updatedAt: nowIso, updated_at: nowIso })
      .eq("id", access.event.id);
    if (error) {
      console.warn("discardEventConfigDraft: Event.event_config_draft clear failed:", error.message);
    }
  } catch (err) {
    console.warn("discardEventConfigDraft: Event.event_config_draft clear exception:", err.message);
  }

  return buildConfigModeStateResponse(supabase, req, access);
});

resolver.define("publishEventConfigDraft", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  const payload = req.payload || {};
  const currentDraft = await getStoredEventConfigDraft(access.event.id);
  const nowIso = new Date().toISOString();

  return runPublishConfigModeDraftCore({
    access,
    payload,
    currentDraft,
    nowIso,
    deps: {
      normalizePatch: normalizeConfigModeDraftPatch,
      applyBranding: async ({ patchBranding, access, nowIso }) => {
        let mergedBranding = {};

        if (access.seed) {
          const existingSeedPayload = normalizeSeedPayload(access.seed);
          const existingBranding =
            existingSeedPayload.branding && typeof existingSeedPayload.branding === "object"
              ? existingSeedPayload.branding
              : {};
          mergedBranding = { ...existingBranding, ...patchBranding };

          const nextSeedPayload = { ...existingSeedPayload, branding: mergedBranding };
          const { error: seedError } = await supabase
            .from("HackdayTemplateSeed")
            .update({ seed_payload: nextSeedPayload, updated_at: nowIso })
            .eq("confluence_page_id", access.pageId);
          if (seedError) {
            throw new Error(`Failed to update seed branding: ${seedError.message}`);
          }
        } else {
          const existingEventBranding =
            access.event.event_branding && typeof access.event.event_branding === "object"
              ? access.event.event_branding
              : {};
          mergedBranding = { ...existingEventBranding, ...patchBranding };
        }

        const { error: eventBrandingError } = await supabase
          .from("Event")
          .update({ event_branding: mergedBranding, updatedAt: nowIso, updated_at: nowIso })
          .eq("id", access.event.id);
        if (eventBrandingError) {
          throw new Error(`Failed to update event branding: ${eventBrandingError.message}`);
        }
      },
      applyMotdMessage: async ({ patchMotdMessage, access, nowIso }) => {
        const existingStoredMotd = await getStoredEventMotd(access.event.id);
        const fallbackMotd = normalizeMotdMessage(access.event.motd || "");
        const baseMotd = existingStoredMotd !== undefined ? existingStoredMotd : fallbackMotd;
        const nextMotd = normalizeMotdMessage({
          ...baseMotd,
          ...patchMotdMessage,
          updatedAt: nowIso,
          updatedBy: access.actor.displayName,
        });
        await setStoredEventMotd(access.event.id, nextMotd);
      },
      applyContentOverrides: async ({ patchContentOverrides, access, nowIso }) => {
        const previousOverrides = await getStoredEventContentOverrides(access.event.id);
        const nextPublishedContentOverrides = normalizeConfigModeContentOverridesEnvelope({
          schemaVersion: 1,
          version: (previousOverrides.version || 0) + 1,
          updatedAt: nowIso,
          updatedBy: {
            accountId: access.actor.accountId,
            displayName: access.actor.displayName,
          },
          values: {
            ...(previousOverrides.values || {}),
            ...(patchContentOverrides || {}),
          },
        });
        await setStoredEventContentOverrides(access.event.id, nextPublishedContentOverrides);
        return nextPublishedContentOverrides;
      },
      clearDraft: async ({ access }) => {
        await clearStoredEventConfigDraft(access.event.id);
      },
      syncEventColumns: async ({ access, nowIso, nextPublishedContentOverrides }) => {
        const updatePayload = {
          event_config_draft: null,
          updatedAt: nowIso,
          updated_at: nowIso,
        };
        if (nextPublishedContentOverrides) {
          updatePayload.event_content_overrides = nextPublishedContentOverrides;
        }
        const { error: eventUpdateError } = await supabase
          .from("Event")
          .update(updatePayload)
          .eq("id", access.event.id);
        if (eventUpdateError) {
          throw new Error(eventUpdateError.message);
        }
      },
      buildResponse: async () => buildConfigModeStateResponse(supabase, req, access),
      logger: {
        warn: (msg, detail) => console.warn(msg, detail),
        error: (...args) => console.error(...args),
      },
    },
  });
});

/**
 * Update event branding (event admin only — creator or co-admin from HackdayTemplateSeed).
 * Writes to HackdayTemplateSeed.seed_payload.branding and Event.event_branding.
 */
resolver.define("updateEventBranding", async (req) => {
  const accountId = getCallerAccountId(req);
  const payload = req.payload || {};
  const supabase = getSupabaseClient();
  const context = await getCurrentEventContext(supabase, req);
  const event = context?.event;
  const pageId = context?.pageId || getConfluencePageId(req);

  if (!event || !pageId) {
    throw new Error("No event context for this page");
  }

  const seed = await getTemplateSeedByPageId(supabase, pageId);
  if (!seed) {
    throw new Error("This event does not support branding updates");
  }

  const profile = await fetchUserProfile(accountId);
  let email = profile?.email || `${accountId}@atlassian.local`;
  if (!email || email.endsWith("@atlassian.local")) {
    const { data: userRow } = await supabase
      .from("User")
      .select("email")
      .eq("atlassian_account_id", accountId)
      .limit(1);
    const storedEmail = userRow?.[0]?.email;
    if (storedEmail && typeof storedEmail === "string" && !storedEmail.endsWith("@atlassian.local")) {
      email = storedEmail;
    }
  }
  const cur = normalizeEmail(email);
  const primary = normalizeEmail(String(seed.primary_admin_email || "").trim());
  const co = Array.isArray(seed.co_admin_emails)
    ? seed.co_admin_emails.map((e) => normalizeEmail(String(e).trim())).filter(Boolean)
    : [];
  const isEventAdmin = cur && (cur === primary || co.includes(cur));
  if (!isEventAdmin) {
    throw new Error("Only the event creator or co-admins can update branding");
  }

  const existingPayload = normalizeSeedPayload(seed);
  const existingBranding = existingPayload.branding && typeof existingPayload.branding === "object" ? existingPayload.branding : {};
  const allowed = ["accentColor", "bannerImageUrl", "themePreference", "bannerMessage"];
  const updates = {};
  if (payload.accentColor !== undefined) updates.accentColor = String(payload.accentColor).trim() || existingBranding.accentColor;
  if (payload.bannerImageUrl !== undefined) updates.bannerImageUrl = String(payload.bannerImageUrl).trim();
  if (payload.themePreference !== undefined) updates.themePreference = ["light", "dark", "system"].includes(payload.themePreference) ? payload.themePreference : existingBranding.themePreference;
  if (payload.bannerMessage !== undefined) updates.bannerMessage = String(payload.bannerMessage).trim();
  const mergedBranding = { ...existingBranding, ...updates };

  const newSeedPayload = { ...existingPayload, branding: mergedBranding };
  const nowIso = new Date().toISOString();

  const { error: seedError } = await supabase
    .from("HackdayTemplateSeed")
    .update({ seed_payload: newSeedPayload, updated_at: nowIso })
    .eq("confluence_page_id", pageId);

  if (seedError) throw new Error(`Failed to update seed branding: ${seedError.message}`);

  const { error: eventError } = await supabase
    .from("Event")
    .update({ event_branding: mergedBranding, updatedAt: nowIso, updated_at: nowIso })
    .eq("id", event.id);

  if (eventError) {
    console.warn("Event.event_branding update failed (seed was updated):", eventError.message);
  }

  return { success: true, branding: mergedBranding };
});

/**
 * Set event phase (admin only)
 */
resolver.define("setEventPhase", async (req) => {
  const accountId = getCallerAccountId(req);
  const { phase } = req.payload || {};
  if (!phase) {
    throw new Error("phase is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Verify user is admin
    if (user.role !== "ADMIN") {
      throw new Error("Only admins can change event phase");
    }
    
    // DEV MODE: Allow phase changes if dev mode enabled (no additional restrictions)
    const isDevMode = process.env.ENABLE_DEV_MODE === 'true';
    // If not in dev mode, existing restrictions apply (can be added here if needed)

    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }

    // Map app phase (lowercase) to Supabase phase (uppercase enum)
    const { error: updateError } = await supabase
      .from("Event")
      .update({
        phase: REVERSE_PHASE_MAP[phase] || "REGISTRATION",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (updateError) throw updateError;

    // REMINDER SYSTEM: If phase is changing to 'team_formation', check for reminders
    if (phase === 'team_formation') {
      await checkAndSendFreeAgentReminders(supabase, event.id, event.startDate);
    }

    // AUTO-ASSIGNMENT: If phase is changing to 'hacking', assign free agents
    if (phase === 'hacking') {
      await autoAssignFreeAgentsToObservers(supabase, event.id);
    }

    // Create phase change notification for all users
    const { data: allUsers } = await supabase
      .from("User")
      .select("id");

    if (allUsers && allUsers.length > 0) {
      const phaseLabels = {
        registration: "Registration",
        signup: "Registration",
        team_formation: "Team Formation",
        hacking: "Hacking",
        submission: "Submission",
        voting: "Voting",
        judging: "Judging",
        results: "Results",
      };

      const notifications = allUsers.map(user => ({
        id: `notif-${randomUUID()}-${user.id}`,
        userId: user.id,
        type: "PHASE_CHANGE",
        title: "Phase Changed",
        message: `Event phase changed to ${phaseLabels[phase] || phase}`,
        actionUrl: "dashboard",
      }));

      await supabase.from("Notification").insert(notifications);
    }

    return { success: true };
  } catch (error) {
    console.error("setEventPhase error:", error);
    throw new Error(`Failed to set event phase: ${error.message}`);
  }
});

/**
 * Check and send free agent reminders (called from dashboard load)
 * Creates REMINDER notifications for free agents if hack start is within 24-48 hours
 */
resolver.define("checkFreeAgentReminders", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();
  
  try {
    // Verify user exists
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get current event
    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      return { notified: 0, error: "No current event" };
    }

    // Only check for free agents
    if (!user.isFreeAgent) {
      return { notified: 0, error: null };
    }

    // Check and send reminders
    const result = await checkAndSendFreeAgentReminders(supabase, event.id, event.startDate);
    return result;
  } catch (error) {
    console.error("checkFreeAgentReminders error:", error);
    return { notified: 0, error: error.message };
  }
});

/**
 * Get sent invites for a team (captains only)
 */
resolver.define("getSentInvites", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify user is team captain
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    const { data: teamMemberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    if (!teamMemberData?.[0]) {
      throw new Error("Only team captain can view sent invites");
    }

    // Get all invites for this team
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        user:User(id, name, email)
      `)
      .eq("teamId", teamId)
      .order("createdAt", { ascending: false });

    if (invitesError) throw invitesError;

    const now = new Date();
    
    // Check expiration and update expired invites
    const invitesToUpdate = [];
    const transformedInvites = (invites || []).map(invite => {
      const expiresAt = invite.expiresAt ? new Date(invite.expiresAt) : null;
      const isExpired = invite.status === "PENDING" && expiresAt && expiresAt < now;
      
      if (isExpired) {
        invitesToUpdate.push(invite.id);
      }

      return {
        id: invite.id,
        userId: invite.userId,
        userName: invite.user?.name || "Unknown",
        userEmail: invite.user?.email || "",
        message: invite.message || "",
        status: isExpired ? "EXPIRED" : invite.status,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        isExpired,
      };
    });

    // Update expired invites in database
    if (invitesToUpdate.length > 0) {
      await supabase
        .from("TeamInvite")
        .update({ status: "EXPIRED" })
        .in("id", invitesToUpdate);
    }

    return { invites: transformedInvites };
  } catch (error) {
    console.error("getSentInvites error:", error);
    throw new Error(`Failed to get sent invites: ${error.message}`);
  }
});

/**
 * Resend an invite (for captains)
 */
resolver.define("resendInvite", async (req) => {
  const accountId = getCallerAccountId(req);
  const { inviteId } = req.payload || {};
  if (!inviteId) {
    throw new Error("inviteId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify user is team captain
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get invite
    const { data: inviteData, error: inviteError } = await supabase
      .from("TeamInvite")
      .select("*, team:Team(*)")
      .eq("id", inviteId)
      .limit(1);

    const invite = inviteData?.[0];
    if (inviteError || !invite) {
      throw new Error("Invite not found");
    }

    // Verify user is captain of the team
    const { data: teamMemberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", invite.teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    if (!teamMemberData?.[0]) {
      throw new Error("Only team captain can resend invites");
    }

    // Update expiration to 7 days from now and reset status to PENDING
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from("TeamInvite")
      .update({ 
        status: "PENDING",
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      })
      .eq("id", inviteId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("resendInvite error:", error);
    throw new Error(`Failed to resend invite: ${error.message}`);
  }
});

/**
 * Helper: Escape CSV field values
 * Handles quotes, commas, and newlines per RFC 4180
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // If contains special chars (quote, comma, newline), wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return '"' + str + '"';
}

/**
 * Export results to CSV (admin only)
 */
resolver.define("exportResults", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (user.role !== "ADMIN") {
      throw new Error("Only admins can export results");
    }

    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }

    // Get all teams with submissions
    const { data: teams, error: teamsError } = await supabase
      .from("Team")
      .select(`
        *,
        members:TeamMember(userId, user:User(id, name)),
        project:Project(*)
      `)
      .eq("eventId", event.id)
      .eq("isPublic", true);

    if (teamsError) throw teamsError;

    // Get project IDs for event teams to filter votes/scores
    const eventProjectIds = (teams || [])
      .filter(t => t.project?.id)
      .map(t => t.project.id);

    const eventTeamIds = (teams || []).map(t => t.id);

    // Get votes filtered by event projects
    const { data: votes, error: votesError } = await supabase
      .from("Vote")
      .select("*")
      .in("projectId", eventProjectIds.length > 0 ? eventProjectIds : []);

    if (votesError) throw votesError;

    // Get judge scores filtered by event teams
    const { data: scores, error: scoresError } = await supabase
      .from("JudgeScore")
      .select("*")
      .in("teamId", eventTeamIds.length > 0 ? eventTeamIds : []);

    if (scoresError) throw scoresError;

    // Calculate scores and rankings
    const teamsWithData = (teams || [])
      .filter(t => t.project && t.id !== OBSERVERS_TEAM_ID)
      .map(team => {
        const teamVotes = (votes || []).filter(v => v.projectId === team.project.id);
        const teamScores = (scores || []).filter(s => s.teamId === team.id);
        
        const judgeTotal = teamScores.reduce((sum, s) => {
          return sum + (s.innovation + s.technical + s.presentation + s.impact + s.theme);
        }, 0);
        
        const judgeAvg = teamScores.length > 0 
          ? (judgeTotal / (teamScores.length * 5)) * 100 
          : 0;

        return {
          name: team.name,
          projectName: team.project.name || "",
          judgeScore: judgeTotal,
          judgeAverage: judgeAvg.toFixed(2),
          voteCount: teamVotes.length,
          members: (team.members || []).map(m => m.user?.name || "Unknown").join("; "),
        };
      })
      .sort((a, b) => {
        // Sort by judge score (descending)
        return parseFloat(b.judgeAverage) - parseFloat(a.judgeAverage);
      });

    // Generate CSV
    const csvRows = [];
    csvRows.push([
      "Rank",
      "Team Name",
      "Project Name",
      "Judge Score",
      "Judge Average %",
      "Participant Votes",
      "Members",
    ].join(","));

    teamsWithData.forEach((team, idx) => {
      csvRows.push([
        idx + 1,
        escapeCSVField(team.name),
        escapeCSVField(team.projectName),
        team.judgeScore,
        team.judgeAverage,
        team.voteCount,
        escapeCSVField(team.members),
      ].join(","));
    });

    const csvContent = csvRows.join("\n");

    return { csv: csvContent, error: null };
  } catch (error) {
    console.error("exportResults error:", error);
    return { csv: null, error: error.message };
  }
});

/**
 * Get user notifications
 */
resolver.define("getUserNotifications", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { data: notifications, error: notificationsError } = await supabase
      .from("Notification")
      .select("id, userId, type, title, message, actionUrl, read, createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (notificationsError) throw notificationsError;

    const unreadCount = (notifications || []).filter(n => !n.read).length;

    return { notifications: notifications || [], unreadCount, error: null };
  } catch (error) {
    console.error("getUserNotifications error:", error);
    return { notifications: [], unreadCount: 0, error: error.message };
  }
});

/**
 * Mark notification as read
 */
resolver.define("markNotificationAsRead", async (req) => {
  const accountId = getCallerAccountId(req);
  const { notificationId } = req.payload || {};
  if (!notificationId) {
    throw new Error("notificationId is required");
  }

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { error: updateError } = await supabase
      .from("Notification")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("userId", user.id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("markNotificationAsRead error:", error);
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
});

/**
 * Mark all notifications as read
 */
resolver.define("markAllNotificationsAsRead", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { error: updateError } = await supabase
      .from("Notification")
      .update({ read: true })
      .eq("userId", user.id)
      .eq("read", false);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error);
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
});

/**
 * Get activity feed (recent team joins, team creations, project submissions)
 */
resolver.define("getActivityFeed", async (req) => {
  try {
    const supabase = getSupabaseClient();
    const limit = req.payload?.limit || 20;
    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      return { activities: [], error: null };
    }

    const [teamsResult, joinsResult, projectsResult] = await Promise.all([
      supabase
        .from("Team")
        .select(`
          id,
          name,
          createdAt,
          members:TeamMember!inner(userId, user:User(id, name))
        `)
        .eq("eventId", event.id)
        .or("isPublic.eq.true,isPublic.is.null")
        .order("createdAt", { ascending: false })
        .limit(limit),
      supabase
        .from("TeamMember")
        .select(`
          id,
          userId,
          teamId,
          createdAt,
          user:User(id, name),
          team:Team!inner(id, name, eventId)
        `)
        .eq("status", "ACCEPTED")
        .eq("team.eventId", event.id)
        .order("createdAt", { ascending: false })
        .limit(limit),
      supabase
        .from("Project")
        .select(`
          id,
          name,
          submittedAt,
          teamId,
          team:Team!inner(id, name, eventId)
        `)
        .not("submittedAt", "is", null)
        .eq("team.eventId", event.id)
        .order("submittedAt", { ascending: false })
        .limit(limit),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (joinsResult.error) throw joinsResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const recentTeams = teamsResult.data || [];
    const recentJoins = joinsResult.data || [];
    const recentProjects = projectsResult.data || [];

    // Format activities
    const teamActivities = (recentTeams || []).map(team => {
      const creator = team.members?.find(m => m.user)?.user;
      return {
        id: `team-${team.id}`,
        type: "create",
        teamId: team.id,
        user: creator?.name || "Unknown",
        team: team.name,
        time: team.createdAt,
      };
    });

    const joinActivities = (recentJoins || []).map(member => ({
      id: `join-${member.id}`,
      type: "join",
      teamId: member.team?.id || member.teamId || null,
      user: member.user?.name || "Unknown",
      team: member.team?.name || "Unknown Team",
      time: member.createdAt,
    }));

    const projectActivities = (recentProjects || []).map(project => ({
      id: `project-${project.id}`,
      type: "submit",
      teamId: project.team?.id || project.teamId || null,
      projectId: project.id,
      user: project.team?.name || "Unknown Team",
      team: project.team?.name || "Unknown Team",
      project: project.name,
      time: project.submittedAt,
    }));

    // Combine and sort by time
    const allActivities = [...teamActivities, ...joinActivities, ...projectActivities]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, limit);

    return { activities: allActivities, error: null };
  } catch (error) {
    console.error("getActivityFeed error:", error);
    return { activities: [], error: error.message };
  }
});

/**
 * Check if dev mode is enabled (admin only)
 * DEV MODE - Remove before production
 */
resolver.define("checkDevMode", async (req) => {
  const isDevMode = process.env.ENABLE_DEV_MODE === 'true';
  return { enabled: isDevMode };
});

/**
 * Get event settings (admin only)
 */
resolver.define("getEventSettings", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (user.role !== "ADMIN") {
      throw new Error("Only admins can view event settings");
    }

    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }

    const storedMotd = await getStoredEventMotd(event.id);
    const fallbackMotd = normalizeMotdMessage(event.motd || "");
    const hasStoredMotd = storedMotd !== undefined;
    const effectiveMotd = hasStoredMotd ? storedMotd : fallbackMotd;

    return {
      maxTeamSize: event.maxTeamSize || 6,
      maxVotesPerUser: event.maxVotesPerUser || 3,
      submissionDeadline: event.submissionDeadline || null,
      votingDeadline: event.votingDeadline || null,
      motd: effectiveMotd.message || "",
      motdMessage: effectiveMotd.message ? effectiveMotd : null,
    };
  } catch (error) {
    console.error("getEventSettings error:", error);
    throw new Error(`Failed to get event settings: ${error.message}`);
  }
});

/**
 * Update event settings (admin only)
 */
resolver.define("updateEventSettings", async (req) => {
  const accountId = getCallerAccountId(req);
  const { settings } = req.payload || {};
  if (!settings) {
    throw new Error("settings is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (user.role !== "ADMIN") {
      throw new Error("Only admins can update event settings");
    }

    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }

    const updateData = {};

    if (settings.maxTeamSize !== undefined) {
      const parsedMaxTeamSize = parseInt(settings.maxTeamSize, 10);
      if (!Number.isFinite(parsedMaxTeamSize) || parsedMaxTeamSize < 2 || parsedMaxTeamSize > 8) {
        throw new Error("maxTeamSize must be between 2 and 8");
      }
      updateData.maxTeamSize = parsedMaxTeamSize;
    }
    if (settings.maxVotesPerUser !== undefined) {
      const parsedMaxVotesPerUser = parseInt(settings.maxVotesPerUser, 10);
      if (!Number.isFinite(parsedMaxVotesPerUser) || parsedMaxVotesPerUser < 1) {
        throw new Error("maxVotesPerUser must be a number greater than 0");
      }
      updateData.maxVotesPerUser = parsedMaxVotesPerUser;
    }
    if (settings.submissionDeadline !== undefined) {
      updateData.submissionDeadline = settings.submissionDeadline || null;
    }
    if (settings.votingDeadline !== undefined) {
      updateData.votingDeadline = settings.votingDeadline || null;
    }

    const hasDbSettingsUpdate = Object.keys(updateData).length > 0;
    if (hasDbSettingsUpdate) {
      updateData.updatedAt = new Date().toISOString();
    }

    const shouldUpdateMotd = settings.motdMessage !== undefined || settings.motd !== undefined;
    let previousStoredMotdValue;
    if (shouldUpdateMotd) {
      previousStoredMotdValue = await storage.get(getEventMotdStorageKey(event.id));
      const motdPayload = settings.motdMessage !== undefined ? settings.motdMessage : settings.motd;
      const normalizedMessage = normalizeMotdMessage(motdPayload);
      if (!normalizedMessage.updatedAt) {
        normalizedMessage.updatedAt = new Date().toISOString();
      }
      if (!normalizedMessage.updatedBy) {
        normalizedMessage.updatedBy = user.name || user.callsign || "Admin";
      }
      await setStoredEventMotd(event.id, normalizedMessage);
    }

    if (hasDbSettingsUpdate) {
      const { error: updateError } = await supabase
        .from("Event")
        .update(updateData)
        .eq("id", event.id);

      if (updateError) {
        if (shouldUpdateMotd) {
          try {
            await restoreStoredEventMotd(event.id, previousStoredMotdValue);
          } catch (rollbackError) {
            console.error("Failed to roll back MOTD after Event update failure:", rollbackError);
          }
        }
        throw updateError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("updateEventSettings error:", error);
    throw new Error(`Failed to update event settings: ${error.message}`);
  }
});

/**
 * Reset current event participation graph and seed realistic sample data (admin only)
 */
resolver.define("adminResetEventData", async (req) => {
  const accountId = getCallerAccountId(req);
  const { confirmText, seedProfile = RESET_SEED_PROFILE_BALANCED_V1 } = req.payload || {};

  if (confirmText !== "RESET") {
    throw new Error("confirmText must be exactly RESET");
  }
  if (!SUPPORTED_RESET_SEED_PROFILES.has(seedProfile)) {
    throw new Error(`Unsupported seedProfile: ${seedProfile}`);
  }

  const supabase = getSupabaseClient();
  let lockKey = null;

  try {
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const caller = userData?.[0];
    if (userError || !caller) {
      throw new Error("User not found");
    }
    if (caller.role !== "ADMIN") {
      throw new Error("Only admins can reset event data");
    }

    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }

    lockKey = getAdminResetLockStorageKey(event.id);
    const existingLock = await storage.get(lockKey);
    if (existingLock) {
      const lockStartedAt = typeof existingLock.startedAt === "string" ? Date.parse(existingLock.startedAt) : NaN;
      const lockAgeMs = Number.isFinite(lockStartedAt) ? Date.now() - lockStartedAt : 0;
      const lockExpired = lockAgeMs > 15 * 60 * 1000;
      if (lockExpired) {
        await storage.delete(lockKey);
      } else {
        throw new Error("A reset is already running for this event. Please retry shortly.");
      }
    }

    await storage.set(lockKey, {
      startedAt: new Date().toISOString(),
      accountId,
      seedProfile,
    });

    const resetSummary = await resetCurrentEventParticipationGraph(supabase, event.id);
    const seedSummary = seedProfile === RESET_SEED_PROFILE_BALANCED_V1
      ? await seedBalancedEventData(supabase, event.id)
      : null;

    if (!seedSummary) {
      throw new Error(`No seed routine configured for profile: ${seedProfile}`);
    }

    console.log(
      "[adminResetEventData] completed",
      JSON.stringify({
        actorAccountId: accountId,
        eventId: event.id,
        seedProfile,
        resetSummary,
        seedSummary,
      })
    );

    return {
      success: true,
      eventId: event.id,
      resetSummary,
      seedSummary,
    };
  } catch (error) {
    console.error("adminResetEventData error:", error);
    throw new Error(`Failed to reset event data: ${error.message}`);
  } finally {
    if (lockKey) {
      try {
        await storage.delete(lockKey);
      } catch (lockDeleteError) {
        console.warn("Failed to clear admin reset lock:", lockDeleteError.message);
      }
    }
  }
});

/**
 * Get analytics data (admin only)
 */
resolver.define("getAnalytics", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (user.role !== "ADMIN") {
      throw new Error("Only admins can view analytics");
    }

    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }

    // Get signups by date
    const { data: users, error: usersError } = await supabase
      .from("User")
      .select("createdAt")
      .order("createdAt", { ascending: true });

    if (usersError) throw usersError;

    const signupsByDate = {};
    (users || []).forEach(user => {
      const date = new Date(user.createdAt).toISOString().split('T')[0];
      signupsByDate[date] = (signupsByDate[date] || 0) + 1;
    });

    // Get teams created by date
    const { data: teams, error: teamsError } = await supabase
      .from("Team")
      .select("createdAt")
      .eq("eventId", event.id)
      .eq("isPublic", true)
      .order("createdAt", { ascending: true });

    if (teamsError) throw teamsError;

    const teamsByDate = {};
    (teams || []).forEach(team => {
      const date = new Date(team.createdAt).toISOString().split('T')[0];
      teamsByDate[date] = (teamsByDate[date] || 0) + 1;
    });

    // Get participation by role
    const { data: allUsers, error: allUsersError } = await supabase
      .from("User")
      .select("role");

    if (allUsersError) throw allUsersError;

    const participationByRole = {};
    (allUsers || []).forEach(user => {
      const appRole = ROLE_MAP[user.role] || 'participant';
      participationByRole[appRole] = (participationByRole[appRole] || 0) + 1;
    });

    // Get user engagement metrics
    const { data: teamMembers } = await supabase
      .from("TeamMember")
      .select("userId")
      .eq("status", "ACCEPTED");

    const { data: votes } = await supabase
      .from("Vote")
      .select("userId");

    const { data: projects } = await supabase
      .from("Project")
      .select("teamId")
      .not("submittedAt", "is", null);

    const { data: teamsWithProjects } = await supabase
      .from("TeamMember")
      .select("userId")
      .in("teamId", (projects || []).map(p => p.teamId))
      .eq("status", "ACCEPTED");

    const uniqueVoters = new Set((votes || []).map(v => v.userId));
    const uniqueTeamMembers = new Set((teamMembers || []).map(m => m.userId));
    const uniqueSubmitters = new Set((teamsWithProjects || []).map(m => m.userId));

    return {
      signupsByDate,
      teamsByDate,
      participationByRole,
      engagement: {
        totalUsers: uniqueTeamMembers.size + uniqueVoters.size,
        usersOnTeams: uniqueTeamMembers.size,
        usersWhoVoted: uniqueVoters.size,
        usersWhoSubmitted: uniqueSubmitters.size,
      },
    };
  } catch (error) {
    console.error("getAnalytics error:", error);
    throw new Error(`Failed to get analytics: ${error.message}`);
  }
});

// ============================================================================
// SCHEDULE / MILESTONES
// ============================================================================

/**
 * Get schedule milestones for the current event
 * Public endpoint - no authentication required
 */
resolver.define("getSchedule", async (req) => {
  const supabase = getSupabaseClient();

  try {
    const context = await getCurrentEventContext(supabase, req);
    const event = context?.event;
    const runtimeSource = context?.runtimeSource;

    if (!event) {
      return { milestones: [], error: "No current event found", isCreatedHackDay: false };
    }

    // Determine if this is a created HackDay (from template seed) or original HackDay
    const isCreatedHackDay = runtimeSource && (
      runtimeSource === 'seed_bootstrap' ||
      runtimeSource === 'seed_mapping' ||
      runtimeSource === 'seed_hdc_event'
    );

    // Only fetch milestones for created HackDays
    if (!isCreatedHackDay) {
      return { milestones: [], isCreatedHackDay: false };
    }

    const { data, error } = await supabase
      .from("Milestone")
      .select("*")
      .eq("eventId", event.id)
      .order("startTime", { ascending: true });

    if (error) {
      console.error("getSchedule error:", error);
      return { milestones: [], error: error.message, isCreatedHackDay };
    }

    // Transform to app format
    const milestones = (data || []).map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      phase: PHASE_MAP[m.phase] || m.phase?.toLowerCase(),
      signal: typeof m.signal === "string" ? m.signal : null,
      startTime: m.startTime,
      endTime: m.endTime,
      location: m.location,
    }));

    return { milestones, isCreatedHackDay };
  } catch (error) {
    console.error("getSchedule error:", error);
    return { milestones: [], error: error.message };
  }
});

/**
 * Track client-side UI telemetry events.
 * Best effort endpoint: writes structured logs for downstream aggregation.
 */
resolver.define("trackUiEvent", async (req) => {
  const { eventName, payload, view, timestamp } = req.payload || {};
  if (!eventName || typeof eventName !== "string") {
    throw new Error("eventName is required");
  }

  let accountId = "unknown";
  try {
    accountId = getCallerAccountId(req);
  } catch {
    // accountId can be unavailable in some local/dev contexts
  }

  const safePayload = payload && typeof payload === "object" ? payload : {};
  const safeView = typeof view === "string" ? view : null;
  const safeTimestamp =
    typeof timestamp === "string" ? timestamp : new Date().toISOString();

  logDebug(
    "[ui-telemetry]",
    JSON.stringify({
      eventName,
      view: safeView,
      accountId,
      timestamp: safeTimestamp,
      payload: safePayload,
    })
  );

  try {
    const storedSummary = await storage.get(TELEMETRY_SUMMARY_KEY);
    const summary = normalizeTelemetrySummary(storedSummary);
    const day = toIsoDay(safeTimestamp);
    const dayBucket = ensureDayTelemetryBucket(summary, day);
    const ctaAction = safePayload?.ctaAction || safePayload?.primaryCtaAction || null;

    summary.totalEvents += 1;
    summary.firstEventAt = summary.firstEventAt || safeTimestamp;
    summary.lastEventAt = safeTimestamp;

    incrementCounter(summary.events, eventName);
    incrementCounter(dayBucket.events, eventName);

    if (safeView) {
      incrementCounter(summary.views, safeView);
    }

    if (eventName === "mission_brief_impression") {
      summary.funnel.heroImpressions += 1;
      dayBucket.heroImpressions += 1;
      if (safePayload?.heroVariant === "welcome") {
        summary.funnel.welcomeImpressions += 1;
        dayBucket.welcomeImpressions += 1;
      }
    }

    if (eventName === "mission_brief_cta_click") {
      summary.funnel.heroCtaClicks += 1;
      dayBucket.heroCtaClicks += 1;
      if (ctaAction) {
        incrementCounter(summary.ctaActions, ctaAction);
        incrementCounter(dayBucket.ctaActions, ctaAction);
      }
      if (ctaAction === "signup") {
        summary.funnel.registerClicks += 1;
        dayBucket.registerClicks += 1;
      }
    }

    if (eventName === "signup_completed") {
      summary.funnel.signupCompleted += 1;
      dayBucket.signupCompleted += 1;
      summary.signupFlow.flowsCompleted += 1;

      // Keep first completion timestamp per account for signup-to-team pipeline metrics.
      if (accountId && accountId !== "unknown") {
        if (!summary.signupCompletionByAccount[accountId]) {
          summary.signupCompletionByAccount[accountId] = safeTimestamp;
        }
      }
    }

    if (eventName === "signup_failed") {
      summary.funnel.signupFailed += 1;
      dayBucket.signupFailed += 1;
    }

    if (eventName === "signup_flow_started") {
      summary.signupFlow.flowsStarted += 1;
    }

    if (eventName === "signup_step_view") {
      const step = normalizeSignupStep(safePayload?.step);
      if (step) {
        incrementCounter(summary.signupFlow.stepViews, step);
      }
    }

    if (eventName === "signup_step_next") {
      const fromStep = normalizeSignupStep(safePayload?.fromStep);
      if (fromStep) {
        incrementCounter(summary.signupFlow.stepNext, fromStep);
      }
    }

    if (eventName === "signup_step_back") {
      const fromStep = normalizeSignupStep(safePayload?.fromStep);
      if (fromStep) {
        incrementCounter(summary.signupFlow.stepBack, fromStep);
      }
    }

    if (eventName === "signup_abandoned") {
      const lastStep = normalizeSignupStep(safePayload?.lastStep);
      summary.signupFlow.flowsAbandoned += 1;
      if (lastStep) {
        incrementCounter(summary.signupFlow.stepDropoffs, lastStep);
      }
    }

    pruneTelemetryDays(summary);
    pruneSignupCompletionMap(summary);
    await storage.set(TELEMETRY_SUMMARY_KEY, summary);
  } catch (storageError) {
    // Keep tracking endpoint best effort; logging remains the primary telemetry sink.
    console.warn("[ui-telemetry] failed to update aggregate summary:", storageError?.message || storageError);
  }

  return { success: true };
});

/**
 * Get aggregated UI telemetry metrics.
 * Admin-only endpoint for dashboard/admin surfaces.
 */
resolver.define("getTelemetryAnalytics", async (req) => {
  const accountId = getCallerAccountId(req);
  const supabase = getSupabaseClient();

  const { data: userData, error: userError } = await supabase
    .from("User")
    .select("id, role")
    .eq("atlassian_account_id", accountId)
    .limit(1);

  const user = userData?.[0];
  if (userError || !user) {
    throw new Error("User not found");
  }

  if (user.role !== "ADMIN") {
    throw new Error("Only admins can view telemetry analytics");
  }

  try {
    const storedSummary = await storage.get(TELEMETRY_SUMMARY_KEY);
    const summary = normalizeTelemetrySummary(storedSummary);

    const heroImpressions = summary.funnel.heroImpressions || 0;
    const heroCtaClicks = summary.funnel.heroCtaClicks || 0;
    const welcomeImpressions = summary.funnel.welcomeImpressions || 0;
    const registerClicks = summary.funnel.registerClicks || 0;
    const signupCompleted = summary.funnel.signupCompleted || 0;
    const signupFailed = summary.funnel.signupFailed || 0;
    const signupFlow = summary.signupFlow || {};
    const stepViews = signupFlow.stepViews || {};
    const stepNext = signupFlow.stepNext || {};
    const stepDropoffs = signupFlow.stepDropoffs || {};

    const sortedDayKeys = Object.keys(summary.byDay || {}).sort();
    const last7Days = sortedDayKeys.slice(-7).map((day) => {
      const bucket = summary.byDay[day] || {};
      return {
        day,
        heroImpressions: bucket.heroImpressions || 0,
        heroCtaClicks: bucket.heroCtaClicks || 0,
        signupCompleted: bucket.signupCompleted || 0,
      };
    });

    const topCtaActions = Object.entries(summary.ctaActions || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    const signupStepMetrics = ["1", "2", "3"].map((step) => {
      const views = stepViews[step] || 0;
      const next = stepNext[step] || 0;
      const dropoffs = stepDropoffs[step] || 0;
      return {
        step: Number(step),
        views,
        next,
        dropoffs,
        progressionRate: toPercentage(next, views),
        dropoutRate: toPercentage(dropoffs, views),
      };
    });

    const worstSignupStep = [...signupStepMetrics].sort((a, b) => b.dropoutRate - a.dropoutRate)[0] || null;

    const teamFormationPipeline = {
      usersWithTrackedSignup: 0,
      usersWithTeamJoin: 0,
      avgHoursSignupToTeamJoin: 0,
      medianHoursSignupToTeamJoin: 0,
      joinedWithin24hRate: 0,
      eligibleFor24hCheck: 0,
      stillFreeAgentsAfter24h: 0,
      freeAgentAfter24hRate: 0,
      invitesToNewSignups: 0,
      acceptedInvitesToNewSignups: 0,
      inviteAcceptanceRateNewSignups: 0,
    };

    const signupCompletionEntries = Object.entries(summary.signupCompletionByAccount || {}).filter(
      ([accountId, signupAt]) => accountId && accountId !== "unknown" && parseTimestamp(signupAt)
    );

    if (signupCompletionEntries.length > 0) {
      const nowMs = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const users = [];

      for (const accountIdChunk of chunkArray(signupCompletionEntries.map(([accountId]) => accountId), 200)) {
        const { data, error } = await supabase
          .from("User")
          .select("id, atlassian_account_id, isFreeAgent")
          .in("atlassian_account_id", accountIdChunk);

        if (error) throw error;
        users.push(...(data || []));
      }

      const signupByUserId = new Map();
      for (const user of users) {
        const signupAt = summary.signupCompletionByAccount[user.atlassian_account_id];
        const signupMs = parseTimestamp(signupAt);
        if (!signupMs) continue;
        signupByUserId.set(user.id, signupMs);
      }

      const userIds = Array.from(signupByUserId.keys());
      teamFormationPipeline.usersWithTrackedSignup = userIds.length;

      const acceptedTeamMembers = [];
      const invites = [];

      for (const userIdChunk of chunkArray(userIds, 200)) {
        const [teamMemberResult, inviteResult] = await Promise.all([
          supabase
            .from("TeamMember")
            .select("userId, createdAt")
            .in("userId", userIdChunk)
            .eq("status", "ACCEPTED"),
          supabase
            .from("TeamInvite")
            .select("userId, status, createdAt")
            .in("userId", userIdChunk),
        ]);

        if (teamMemberResult.error) throw teamMemberResult.error;
        if (inviteResult.error) throw inviteResult.error;

        acceptedTeamMembers.push(...(teamMemberResult.data || []));
        invites.push(...(inviteResult.data || []));
      }

      const earliestJoinByUserId = new Map();
      for (const membership of acceptedTeamMembers) {
        const joinMs = parseTimestamp(membership.createdAt);
        if (!joinMs) continue;
        const existing = earliestJoinByUserId.get(membership.userId);
        if (!existing || joinMs < existing) {
          earliestJoinByUserId.set(membership.userId, joinMs);
        }
      }

      const signupToJoinHours = [];
      let joinedWithin24h = 0;
      let eligibleFor24hCheck = 0;
      let stillFreeAgentsAfter24h = 0;

      for (const user of users) {
        const signupMs = signupByUserId.get(user.id);
        if (!signupMs) continue;

        const joinMs = earliestJoinByUserId.get(user.id);
        if (joinMs && joinMs >= signupMs) {
          const hoursToJoin = (joinMs - signupMs) / (60 * 60 * 1000);
          signupToJoinHours.push(hoursToJoin);
          if (joinMs <= signupMs + dayMs) {
            joinedWithin24h += 1;
          }
        }

        if (nowMs - signupMs >= dayMs) {
          eligibleFor24hCheck += 1;
          if (user.isFreeAgent) {
            stillFreeAgentsAfter24h += 1;
          }
        }
      }

      let invitesToNewSignups = 0;
      let acceptedInvitesToNewSignups = 0;
      for (const invite of invites) {
        const signupMs = signupByUserId.get(invite.userId);
        const inviteMs = parseTimestamp(invite.createdAt);
        if (!signupMs || !inviteMs) continue;

        // "Newly signed-up users" window: first 24 hours after signup completion.
        if (inviteMs >= signupMs && inviteMs <= signupMs + dayMs) {
          invitesToNewSignups += 1;
          if (invite.status === "ACCEPTED") {
            acceptedInvitesToNewSignups += 1;
          }
        }
      }

      teamFormationPipeline.usersWithTeamJoin = signupToJoinHours.length;
      teamFormationPipeline.avgHoursSignupToTeamJoin = average(signupToJoinHours);
      teamFormationPipeline.medianHoursSignupToTeamJoin = median(signupToJoinHours);
      teamFormationPipeline.joinedWithin24hRate = toPercentage(joinedWithin24h, userIds.length);
      teamFormationPipeline.eligibleFor24hCheck = eligibleFor24hCheck;
      teamFormationPipeline.stillFreeAgentsAfter24h = stillFreeAgentsAfter24h;
      teamFormationPipeline.freeAgentAfter24hRate = toPercentage(stillFreeAgentsAfter24h, eligibleFor24hCheck);
      teamFormationPipeline.invitesToNewSignups = invitesToNewSignups;
      teamFormationPipeline.acceptedInvitesToNewSignups = acceptedInvitesToNewSignups;
      teamFormationPipeline.inviteAcceptanceRateNewSignups = toPercentage(
        acceptedInvitesToNewSignups,
        invitesToNewSignups
      );
    }

    return {
      summary: {
        totalEvents: summary.totalEvents || 0,
        firstEventAt: summary.firstEventAt,
        lastEventAt: summary.lastEventAt,
        heroImpressions,
        heroCtaClicks,
        heroCtr: toPercentage(heroCtaClicks, heroImpressions),
        welcomeImpressions,
        registerClicks,
        registerClickRate: toPercentage(registerClicks, welcomeImpressions),
        signupCompleted,
        signupFailed,
        clickToSignupRate: toPercentage(signupCompleted, registerClicks),
        signupFlowsStarted: signupFlow.flowsStarted || 0,
        signupFlowsCompleted: signupFlow.flowsCompleted || 0,
        signupFlowsAbandoned: signupFlow.flowsAbandoned || 0,
        signupAbandonRate: toPercentage(
          signupFlow.flowsAbandoned || 0,
          signupFlow.flowsStarted || 0
        ),
      },
      topCtaActions,
      last7Days,
      signupStepMetrics,
      worstSignupStep,
      teamFormationPipeline,
    };
  } catch (error) {
    console.error("getTelemetryAnalytics error:", error);
    return {
      summary: {
        totalEvents: 0,
        firstEventAt: null,
        lastEventAt: null,
        heroImpressions: 0,
        heroCtaClicks: 0,
        heroCtr: 0,
        welcomeImpressions: 0,
        registerClicks: 0,
        registerClickRate: 0,
        signupCompleted: 0,
        signupFailed: 0,
        clickToSignupRate: 0,
        signupFlowsStarted: 0,
        signupFlowsCompleted: 0,
        signupFlowsAbandoned: 0,
        signupAbandonRate: 0,
      },
      topCtaActions: [],
      last7Days: [],
      signupStepMetrics: [],
      worstSignupStep: null,
      teamFormationPipeline: {
        usersWithTrackedSignup: 0,
        usersWithTeamJoin: 0,
        avgHoursSignupToTeamJoin: 0,
        medianHoursSignupToTeamJoin: 0,
        joinedWithin24hRate: 0,
        eligibleFor24hCheck: 0,
        stillFreeAgentsAfter24h: 0,
        freeAgentAfter24hRate: 0,
        invitesToNewSignups: 0,
        acceptedInvitesToNewSignups: 0,
        inviteAcceptanceRateNewSignups: 0,
      },
      error: error.message,
    };
  }
});

// ============================================================================
// GET DEMO DATA - Unified demo data from Supabase
// ============================================================================

/**
 * Fetch demo data from Supabase for demo mode
 * This replaces hardcoded mock data with database-driven demo data
 * Shared with HD26AI for consistent cross-platform demos
 */
resolver.define("getDemoData", async ({ context }) => {
  try {
    // Demo DB fetch is intentionally gated so production doesn't depend on
    // seed scripts being in sync. Enable explicitly when needed.
    const useDbDemoData = process.env.ENABLE_DB_DEMO_DATA === "true";
    if (!useDbDemoData) {
      logDebug("[getDemoData] Demo DB fetch disabled (set ENABLE_DB_DEMO_DATA=true to enable)");
      return { error: "Demo DB fetch disabled" };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error("[getDemoData] Supabase client not available");
      return { error: "Database not configured" };
    }

    // Fetch demo event
    const { data: event, error: eventError } = await supabase
      .from("Event")
      .select("*")
      .eq("id", DEMO_EVENT_ID)
      .limit(1);

    if (eventError) {
      console.error("[getDemoData] Error fetching event:", eventError);
      return { error: "Demo event not found. Run seed_demo_data.sql first." };
    }

    const demoEvent = event?.[0];
    if (!demoEvent) {
      return { error: "Demo event not found. Run seed_demo_data.sql first." };
    }

    // Fetch demo users (registrations)
    const { data: users, error: usersError } = await supabase
      .from("User")
      .select("*")
      .like("id", "demo-%");

    if (usersError) {
      console.error("[getDemoData] Error fetching users:", usersError);
    }

    // Fetch demo teams with members
    const { data: teams, error: teamsError } = await supabase
      .from("Team")
      .select(`
        *,
        members:TeamMember(
          id,
          role,
          status,
          userId,
          user:User(id, name, callsign, skills, role, isFreeAgent)
        )
      `)
      .eq("eventId", DEMO_EVENT_ID)
      .order("createdAt", { ascending: true });

    if (teamsError) {
      console.error("[getDemoData] Error fetching teams:", teamsError);
    }

    // Fetch demo projects
    const { data: projects, error: projectsError } = await supabase
      .from("Project")
      .select("*")
      .like("id", "demo-%");

    if (projectsError) {
      console.error("[getDemoData] Error fetching projects:", projectsError);
    }

    // Fetch demo votes
    const { data: votes, error: votesError } = await supabase
      .from("Vote")
      .select("*")
      .like("id", "demo-%");

    if (votesError) {
      console.error("[getDemoData] Error fetching votes:", votesError);
    }

    // Fetch demo judge scores
    const { data: scores, error: scoresError } = await supabase
      .from("JudgeScore")
      .select(`
        *,
        judge:User(id, name, callsign)
      `)
      .like("id", "demo-%");

    if (scoresError) {
      console.error("[getDemoData] Error fetching scores:", scoresError);
    }

    // Fetch demo team invites
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        team:Team(id, name),
        user:User(id, name, callsign, skills)
      `)
      .like("id", "demo-%");

    if (invitesError) {
      console.error("[getDemoData] Error fetching invites:", invitesError);
    }

    // Transform data to frontend format
    const transformedRegistrations = (users || []).map(user => ({
      accountId: user.id,
      displayName: user.name,
      callsign: user.callsign,
      skills: user.skills ? user.skills.split(",") : [],
      role: ROLE_MAP[user.role] || "participant",
      isFreeAgent: user.isFreeAgent,
      isJudge: user.role === "JUDGE",
      isAdmin: user.role === "ADMIN",
      bio: user.bio,
      registeredAt: user.createdAt,
    }));

    // Create project lookup by teamId
    const projectsByTeam = {};
    (projects || []).forEach(p => {
      projectsByTeam[p.teamId] = p;
    });

    // Create vote counts by projectId
    const votesByProject = {};
    (votes || []).forEach(v => {
      votesByProject[v.projectId] = (votesByProject[v.projectId] || 0) + 1;
    });

    // Create scores by projectId
    const scoresByProject = {};
    (scores || []).forEach(s => {
      if (!scoresByProject[s.projectId]) {
        scoresByProject[s.projectId] = [];
      }
      scoresByProject[s.projectId].push({
        judgeId: s.judgeId,
        judgeName: s.judge?.name,
        scores: s.scores,
        comments: s.comments,
        scoredAt: s.createdAt,
      });
    });

    const transformedTeams = (teams || []).map(team => {
      const project = projectsByTeam[team.id];
      const captain = team.members?.find(m => m.role === "OWNER");
      const memberIds = team.members?.filter(m => m.status === "ACCEPTED").map(m => m.userId) || [];
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        captainId: captain?.userId,
        captainName: captain?.user?.name,
        members: memberIds,
        lookingFor: team.lookingFor ? team.lookingFor.split(",") : [],
        maxMembers: team.maxSize, // API: Transform DB `maxSize` → API `maxMembers`
        joinRequests: [],  // Join requests are handled separately
        isObserverTeam: team.isAutoCreated && team.name === "Observers",
        submission: project ? {
          projectName: project.name,
          description: project.description,
          demoVideoUrl: project.videoUrl,
          repoUrl: project.repoUrl,
          liveDemoUrl: project.demoUrl,
          submittedAt: project.submittedAt,
          participantVotes: votesByProject[project.id] || 0,
          judgeScores: scoresByProject[project.id] || [],
        } : null,
        createdAt: team.createdAt,
      };
    });

    const transformedVotes = (votes || []).map(v => ({
      id: v.id,
      voterId: v.userId,
      teamId: projectsByTeam[v.projectId]?.teamId || v.projectId,
      projectId: v.projectId,
      votedAt: v.createdAt,
    }));

    const transformedScores = (scores || []).map(s => ({
      id: s.id,
      judgeId: s.judgeId,
      teamId: projectsByTeam[s.projectId]?.teamId || s.projectId,
      projectId: s.projectId,
      ...(s.scores || {}),
      comments: s.comments,
      scoredAt: s.createdAt,
    }));

    const transformedInvites = (invites || []).map(i => ({
      id: i.id,
      teamId: i.teamId,
      teamName: i.team?.name,
      userId: i.userId,
      userName: i.user?.name,
      userSkills: i.user?.skills ? i.user.skills.split(",") : [],
      message: i.message,
      status: i.status,
      createdAt: i.createdAt,
    }));

    // Get free agents (users with isFreeAgent = true who are not on a team)
    const teamMemberIds = new Set();
    (teams || []).forEach(t => {
      (t.members || []).forEach(m => {
        if (m.status === "ACCEPTED") teamMemberIds.add(m.userId);
      });
    });
    
    const freeAgents = transformedRegistrations.filter(r => 
      r.isFreeAgent && !teamMemberIds.has(r.accountId)
    );

    logDebug(`[getDemoData] Loaded: ${transformedRegistrations.length} users, ${transformedTeams.length} teams, ${transformedVotes.length} votes, ${transformedScores.length} scores`);

    return {
      success: true,
      event: {
        id: demoEvent.id,
        name: demoEvent.name,
        phase: PHASE_MAP[demoEvent.phase] || "signup",
        year: demoEvent.year,
      },
      registrations: transformedRegistrations,
      teams: transformedTeams,
      votes: transformedVotes,
      scores: transformedScores,
      invites: transformedInvites,
      freeAgents: freeAgents,
    };
  } catch (error) {
    console.error("[getDemoData] Error:", error);
    return { error: error.message };
  }
});

// ============================================================================
// DEV HELPER: Create Test Submission
// ============================================================================

/**
 * DEV ONLY: Create a test submission for the first team
 * Requires admin role for security
 */
resolver.define("devCreateTestSubmission", async (req) => {
  const accountId = getCallerAccountId(req);
  const supabase = getSupabaseClient();

  try {
    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id, role")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (user.role !== "ADMIN") {
      throw new Error("Only admins can create test submissions");
    }

    // Get first team
    const { data: teams, error: teamError } = await supabase
      .from("Team")
      .select("id, name")
      .neq("id", OBSERVERS_TEAM_ID)
      .limit(1);

    if (teamError || !teams || teams.length === 0) {
      throw new Error("No teams found to create test submission");
    }

    const team = teams[0];

    // Check if project already exists
    const { data: existing } = await supabase
      .from("Project")
      .select("id")
      .eq("teamId", team.id)
      .limit(1);

    const projectData = {
      name: `Test Project for ${team.name}`,
      description: "This is a test submission to verify the Export Results feature works correctly.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      repoUrl: "https://github.com/test/test-repo",
      demoUrl: "https://test-demo.example.com",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      // Update existing
      const { error: updateError } = await supabase
        .from("Project")
        .update(projectData)
        .eq("id", existing[0].id);

      if (updateError) throw updateError;
      return { success: true, message: `Updated test submission for team: ${team.name}`, teamId: team.id };
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from("Project")
        .insert({
          id: makeId("proj"),
          teamId: team.id,
          ...projectData,
          createdAt: new Date().toISOString(),
        });

      if (insertError) throw insertError;
      return { success: true, message: `Created test submission for team: ${team.name}`, teamId: team.id };
    }
  } catch (error) {
    console.error("devCreateTestSubmission error:", error);
    throw new Error(`Failed to create test submission: ${error.message}`);
  }
});

export const handler = resolver.getDefinitions();
