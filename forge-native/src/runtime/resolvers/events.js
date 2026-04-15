import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  PHASE_MAP,
  REVERSE_PHASE_MAP,
  ROLE_MAP,
  OBSERVERS_TEAM_ID,
  RESET_SEED_PROFILE_BALANCED_V1,
  SUPPORTED_RESET_SEED_PROFILES,
  HDC_PERF_RUNTIME_BOOTSTRAP_V2,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  getConfluencePageId,
  getCurrentEvent,
  getCurrentEventContext,
  resolveInstanceContext,
  getTemplateSeedByPageId,
  getUserByAccountId,
  isAdminOrOwner,
  isAppModeRequest,
  normalizeMotdMessage,
  getStoredEventMotd,
  setStoredEventMotd,
  restoreStoredEventMotd,
  normalizeRuntimeEventSchedule,
  hasPublishedEventSchedule,
  normalizeSeedPayload,
  normalizeConfigModeContentOverridesEnvelope,
  normalizeConfigModeDraftEnvelope,
  getStoredEventContentOverrides,
  getStoredEventConfigDraft,
  getRuntimeActorPermissionContext,
  resolveRuntimeEventAdminAccess,
  buildConfigModeStateResponse,
  checkAndSendFreeAgentReminders,
  autoAssignFreeAgentsToObservers,
  resetCurrentEventParticipationGraph,
  seedBalancedEventData,
  getAdminResetLockStorageKey,
  getEventMotdStorageKey,
  logDebug,
} from "../lib/helpers.js";
import {
  getEventBackupCoverageStatus,
} from "../lib/eventBackup.mjs";

export function registerEventResolvers(resolver) {
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
      maxVotesPerUser: 1,
      eventMeta: defaultEventMeta,
      branding: {},
      isCreatedHackDay: false,
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
    normalizeRuntimeEventSchedule(event.event_schedule, {
      timezone: eventTimezone,
      hackingStartsAt: event.hacking_starts_at || event.startDate || event.start_date,
      submissionDeadlineAt: event.submission_deadline_at || event.endDate || event.end_date,
    });

  const eventBranding =
    event.event_branding && typeof event.event_branding === "object"
      ? event.event_branding
      : {};
  const pageId = instanceContext?.pageId || getConfluencePageId(req);
  let seed = pageId ? await getTemplateSeedByPageId(supabase, pageId) : null;
  const isCreatedHackDay = Boolean(
    seed ||
    (typeof event.runtime_type === "string" && event.runtime_type.trim().toLowerCase() === "hackday_template")
  );
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
  let isPlatformAdmin = false;
  try {
    const accountId = req.context?.accountId;
    if (accountId) {
      const accessContext = await getRuntimeActorPermissionContext(supabase, accountId, {
        logScope: "getEventPhase",
      });
      isPlatformAdmin = accessContext.isPlatformAdmin;
      // Platform admins automatically have event admin access
      if (isPlatformAdmin) {
        isEventAdmin = true;
      } else {
        const eventAdminAccess = await resolveRuntimeEventAdminAccess(supabase, {
          eventId: event.id,
          userRow: accessContext.userRow,
          seed,
          email: accessContext.email,
          logScope: "getEventPhase",
        });
        isEventAdmin = eventAdminAccess.isEventAdmin;
      }
    }
  } catch (err) {
    logDebug("[getEventPhase] access lookup failed:", err.message);
  }

  const contentOverrides = await getStoredEventContentOverrides(event.id);
  const configDraft = await getStoredEventConfigDraft(event.id);

  return {
    phase: PHASE_MAP[event.phase] || "signup",
    eventId: event.id,
    motd: effectiveMotd?.message || null,
    motdMessage: effectiveMotd,
    maxVotesPerUser: event.maxVotesPerUser || 1,
    maxTeamSize: event.maxTeamSize || 5,
    eventMeta: {
      name: resolvedEventName,
      tagline: eventTagline,
      timezone: eventTimezone,
      startAt: eventStartAt,
      endAt: eventEndAt,
      schedule: hasPublishedEventSchedule(eventSchedule) ? eventSchedule : null,
    },
    branding,
    isCreatedHackDay,
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


resolver.define("getEventConfigModeState", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  return buildConfigModeStateResponse(supabase, req, access);
});


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
    if (!isAdminOrOwner(user, accountId)) {
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

    if (!isAdminOrOwner(user, accountId)) {
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
      maxVotesPerUser: event.maxVotesPerUser || 1,
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

    if (!isAdminOrOwner(user, accountId)) {
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
    if (!isAdminOrOwner(caller, accountId)) {
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

    if (!isAdminOrOwner(user, accountId)) {
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
      return { milestones: [], error: "No current event found", isCreatedHackDay: false, hasPublishedSchedule: false };
    }

    // Determine if this is a created HackDay (from template seed) or original HackDay
    const isCreatedHackDay = runtimeSource && (
      runtimeSource === 'seed_bootstrap' ||
      runtimeSource === 'seed_mapping' ||
      runtimeSource === 'seed_hdc_event'
    );

    // Only fetch milestones for created HackDays
    if (!isCreatedHackDay) {
      return { milestones: [], isCreatedHackDay: false, hasPublishedSchedule: false };
    }

    const normalizedSchedule = normalizeRuntimeEventSchedule(event.event_schedule, {
      timezone: event.timezone,
      hackingStartsAt: event.hacking_starts_at || event.startDate || event.start_date,
      submissionDeadlineAt: event.submission_deadline_at || event.endDate || event.end_date,
    });
    const hasPublishedSchedule = hasPublishedEventSchedule(normalizedSchedule);

    const { data, error } = await supabase
      .from("Milestone")
      .select("*")
      .eq("eventId", event.id)
      .order("startTime", { ascending: true });

    if (error) {
      console.error("getSchedule error:", error);
      return { milestones: [], error: error.message, isCreatedHackDay, hasPublishedSchedule };
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

    return { milestones, isCreatedHackDay, hasPublishedSchedule };
  } catch (error) {
    console.error("getSchedule error:", error);
    return { milestones: [], error: error.message, hasPublishedSchedule: false };
  }
});


}
