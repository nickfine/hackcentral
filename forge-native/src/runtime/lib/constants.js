export const DEBUG_LOGS = process.env.DEBUG_PERF === "true";
export const TELEMETRY_SUMMARY_KEY = "uiTelemetrySummary:v1";
export const EVENT_MOTD_STORAGE_KEY_PREFIX = "eventMotd:v1:";
export const EVENT_CONFIG_DRAFT_STORAGE_KEY_PREFIX = "eventConfigDraft:v1:";
export const EVENT_CONTENT_OVERRIDES_STORAGE_KEY_PREFIX = "eventContentOverrides:v1:";
export const NOT_VIABLE_IDEAS_STORAGE_KEY_PREFIX = "notViableIdeas:v1:";
export const TEAM_DETAIL_FIELDS_STORAGE_KEY_PREFIX = "teamDetailFields:v1:";
export const ADMIN_RESET_LOCK_KEY_PREFIX = "adminResetLock:v1:";
export const ADMIN_RESET_SEED_META_KEY_PREFIX = "adminResetSeedMeta:v1:";
export const ACTIVE_APP_MODE_CONTEXT_STORAGE_KEY_PREFIX = "activeAppModeContext:v1:";
export const MOTD_PRIORITIES = new Set(["info", "warning", "urgent"]);
export const HACKDAY_OWNER_EMAILS = new Set(["jmort@adaptavist.com", "nfine@adaptavist.com"]);
export const HACKDAY_OWNER_ACCOUNT_IDS = new Set([]);
export const HACKDAY_OWNER_NAMES = new Set(["jon mort"]);
export const HACKDAY_OWNER_TITLE = "CTO & HackDay Owner";
export const OBSERVERS_TEAM_ID = "team-observers";
export const OBSERVERS_MAX_SIZE = 999;
export const SUPABASE_BATCH_SIZE = 200;
export const NOTIFICATION_BATCH_SIZE = 100;
export const TELEMETRY_MAX_ENTRIES = 5000;
export const JOIN_REASON_MAX_LENGTH = 300;
export const INVITE_EXPIRY_DAYS = 7;
export const APP_MODE_CONTEXT_SCHEMA_VERSION = 1;
export const APP_MODE_CONTEXT_TTL_MS = 12 * 60 * 60 * 1000;
export const EVENT_BRANDING_IMAGES_BUCKET = "event-branding-images";
export const EVENT_BRANDING_UPLOAD_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const EVENT_BRANDING_UPLOAD_MAX_BYTES = 2_000_000;
export const EVENT_BRANDING_BANNER_MAX_WIDTH = 1200;
export const EVENT_BRANDING_BANNER_REQUIRED_HEIGHT = 400;
export const EVENT_BRANDING_ICON_REQUIRED_WIDTH = 400;
export const EVENT_BRANDING_ICON_REQUIRED_HEIGHT = 400;
export const EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_WIDTH = 800;
export const EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_HEIGHT = 800;
export const EVENT_BRANDING_UPLOAD_URL_TTL_MS = 2 * 60 * 60 * 1000;
export const EVENT_THEME_PRESETS = new Set(["default", "editorial", "summit", "studio"]);
export const APP_MODE_RUNTIME_SOURCES = Object.freeze({
  ACTIVE: "app_mode_active_context",
  REQUIRED: "app_mode_context_required",
});
export const RESET_SEED_PROFILE_BALANCED_V1 = "balanced_v1";
export const SEED_USER_EMAIL_PREFIX = "seed26.";
export const SUPPORTED_RESET_SEED_PROFILES = new Set(["balanced_v1"]);
export const HDC_RUNTIME_CONFIG_ERROR_CODE = "HDC_RUNTIME_CONFIG_INVALID";
export const HDC_RUNTIME_OWNER = "hackcentral";
export const HACKDAY_SUBMISSION_PAGE_LINK_TABLE = "HackdaySubmissionPageLink";
export const SUBMISSIONS_PARENT_PAGE_PROPERTY_KEY = "hackcentral.submissions-parent-page-id";
export const SUBMISSIONS_PARENT_TITLE = "Submissions";
export const FULL_WIDTH_PAGE_PROPERTY_KEYS = ["content-appearance-draft", "content-appearance-published"];
export const FULL_WIDTH_PAGE_APPEARANCE = "full-width";
export const HDC_PERF_RUNTIME_BOOTSTRAP_V2 = (() => {
  const raw = String(process.env.HDC_PERF_RUNTIME_BOOTSTRAP_V2 || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
})();

// Demo event ID - shared with HD26AI for unified demo data
export const DEMO_EVENT_ID = 'demo-event-2026';

// Phase mapping: DB enum (uppercase) -> app format (lowercase)
export const PHASE_MAP = {
  SETUP: "setup",
  REGISTRATION: "signup",
  SIGNUP: "signup",
  TEAM_FORMATION: "team_formation",
  HACKING: "hacking",
  SUBMISSION: "submission",
  VOTING: "voting",
  JUDGING: "judging",
  RESULTS: "results",
};

// Role mapping: DB enum (uppercase) -> app format (lowercase)
export const ROLE_MAP = {
  USER: "participant",
  AMBASSADOR: "ambassador",
  JUDGE: "judge",
  ADMIN: "admin",
};

// Reverse role mapping: app format (lowercase) -> DB enum (uppercase)
export const REVERSE_ROLE_MAP = {
  participant: "USER",
  ambassador: "AMBASSADOR",
  judge: "JUDGE",
  admin: "ADMIN",
};

// Reverse phase mapping: app format (lowercase) -> DB enum (uppercase)
export const REVERSE_PHASE_MAP = {
  setup: "SETUP",
  signup: "REGISTRATION",
  team_formation: "TEAM_FORMATION",
  hacking: "HACKING",
  submission: "SUBMISSION",
  voting: "VOTING",
  judging: "JUDGING",
  results: "RESULTS",
};

export const BALANCED_SEED_USERS = [
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

export const BALANCED_SEED_TEAMS = [
  { index: 1, ownerUserIndex: 1, memberUserIndexes: [11], name: "Jira Triage Copilot", description: "Classifies inbound support and incident signals, then drafts prioritized Jira issues with suggested labels and owners.", lookingFor: ["Prompt Engineering", "Jira Workflows"] },
  { index: 2, ownerUserIndex: 2, memberUserIndexes: [12], name: "Confluence Auto-Briefer", description: "Builds concise weekly brief pages from meeting notes, decisions, and action updates across project spaces.", lookingFor: ["Confluence Macros", "UX Writing"] },
  { index: 3, ownerUserIndex: 3, memberUserIndexes: [13], name: "Slack-to-JSM Incident Bridge", description: "Turns incident chatter in Slack into structured JSM incidents with timeline summaries and accountable owners.", lookingFor: ["JSM Automation", "Slack Apps"] },
  { index: 4, ownerUserIndex: 4, memberUserIndexes: [14], name: "PRD to Story Mapper", description: "Transforms PRD sections into Jira epics and stories with acceptance criteria and dependency hints.", lookingFor: ["Product Ops", "NLP"] },
  { index: 5, ownerUserIndex: 5, memberUserIndexes: [15], name: "Meeting-to-Jira Action Miner", description: "Extracts tasks, owners, and deadlines from meeting transcripts and drafts Jira tickets with context links.", lookingFor: ["Speech AI", "Jira APIs"] },
  { index: 6, ownerUserIndex: 6, memberUserIndexes: [16], name: "AI Runbook Auto-Responder", description: "Suggests runbook steps and remediation playbooks for alerts using historical JSM incidents and KB pages.", lookingFor: ["Runbook Authoring", "SRE"] },
  { index: 7, ownerUserIndex: 7, memberUserIndexes: [17], name: "Forge Workflow Orchestrator", description: "Creates composable Forge automations to coordinate Jira, Confluence, and external API workflows.", lookingFor: ["Forge", "Integration Design"] },
  { index: 8, ownerUserIndex: 8, memberUserIndexes: [18], name: "Release Notes Composer", description: "Generates release notes from merged Jira issues and Confluence changelog context with audience-specific variants.", lookingFor: ["Release Ops", "Technical Writing"] },
  { index: 9, ownerUserIndex: 9, memberUserIndexes: [], name: "Customer Signal Synthesizer", description: "Combines support tickets, NPS themes, and product telemetry into ranked opportunities for product teams.", lookingFor: ["Analytics", "Customer Research"] },
  { index: 10, ownerUserIndex: 10, memberUserIndexes: [], name: "Compliance Evidence Bot", description: "Collects evidence artifacts from Jira and Confluence activity and packages audit-ready control narratives.", lookingFor: ["Compliance", "Automation"] },
];

export const BALANCED_SEED_PENDING_INVITES = [
  { index: 1, teamIndex: 1, userIndex: 19, message: "Join us to shape triage prompts and evaluation metrics." },
  { index: 2, teamIndex: 2, userIndex: 20, message: "We need facilitation and docs expertise for summary workflows." },
  { index: 3, teamIndex: 3, userIndex: 21, message: "Your ops experience would help productionize incident routing." },
  { index: 4, teamIndex: 4, userIndex: 22, message: "Help us validate story mapping quality with product teams." },
  { index: 5, teamIndex: 5, userIndex: 23, message: "Could you help harden transcript extraction and API reliability?" },
  { index: 6, teamIndex: 6, userIndex: 24, message: "Looking for compliance-minded automation support on runbooks." },
];
