import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  TELEMETRY_SUMMARY_KEY,
  SUPABASE_BATCH_SIZE,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  getUserByAccountId,
  isAdminOrOwner,
  logDebug,
  normalizeTelemetrySummary,
  incrementCounter,
  toIsoDay,
  ensureDayTelemetryBucket,
  pruneTelemetryDays,
  pruneSignupCompletionMap,
  normalizeSignupStep,
  toPercentage,
  average,
  median,
  parseTimestamp,
  chunkArray,
} from "../lib/helpers.js";

export function registerTelemetryResolvers(resolver) {
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
    .select("id, role, email")
    .eq("atlassian_account_id", accountId)
    .limit(1);

  const user = userData?.[0];
  if (userError || !user) {
    throw new Error("User not found");
  }

  if (!isAdminOrOwner(user, accountId)) {
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


}
