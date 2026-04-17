import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  HDC_PERF_RUNTIME_BOOTSTRAP_V2,
  APP_MODE_RUNTIME_SOURCES,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  normalizeConfluencePageId,
  resolveInstanceContext,
  getCurrentEventContext,
  buildAppModeLaunchUrlFromContext,
  isAppModeRequest,
  setStoredActiveAppModeContext,
  clearStoredActiveAppModeContext,
  logDebug,
} from "../lib/helpers.js";

export function registerHealthResolvers(resolver) {
resolver.define("healthCheck", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

resolver.define("getRuntimeBootstrap", async (req) => {
  const startedAt = Date.now();
  const stageMs = {};
  const markStage = (stage, stageStartedAt) => {
    stageMs[stage] = Math.max(0, Date.now() - stageStartedAt);
  };
  let bootstrapContext = null;

  try {
    const supabase = getSupabaseClient();
    if (HDC_PERF_RUNTIME_BOOTSTRAP_V2) {
      const contextBootstrapStartedAt = Date.now();
      bootstrapContext = await getCurrentEventContext(supabase, req, {
        allowBootstrapWrites: true,
      });
      markStage("context_bootstrap", contextBootstrapStartedAt);
      // Share resolved context with child resolvers to avoid 5x redundant lookups.
      req._bootstrapContext = bootstrapContext;
    }

    const runStage = async (functionKey, stageName) => {
      const stageStartedAt = Date.now();
      const value = await resolver.getFunction(functionKey)(req);
      markStage(stageName, stageStartedAt);
      return value;
    };

    // Non-fatal wrapper — supplementary data (activity feed, schedule) must not
    // crash the bootstrap if they fail.
    const runStageOptional = async (functionKey, stageName) => {
      try {
        return await runStage(functionKey, stageName);
      } catch (err) {
        console.warn(`[getRuntimeBootstrap] Optional stage ${stageName} failed (non-fatal):`, err?.message);
        return null;
      }
    };

    const [user, eventPhasePayload, teams, freeAgents, registrations, activityFeed, schedule] = await Promise.all([
      runStage("getCurrentUser", "get_current_user"),
      runStage("getEventPhase", "get_event_phase"),
      runStage("getTeams", "get_teams"),
      runStage("getFreeAgents", "get_free_agents"),
      runStage("getRegistrations", "get_registrations"),
      runStageOptional("getActivityFeed", "get_activity_feed"),
      runStageOptional("getSchedule", "get_schedule"),
    ]);

    console.info(
      "[hdc-performance-telemetry]",
      JSON.stringify({
        metric: "runtime_bootstrap",
        mode: HDC_PERF_RUNTIME_BOOTSTRAP_V2 ? "v2" : "legacy",
        durationMs: Math.max(0, Date.now() - startedAt),
        stageMs,
        pageId: eventPhasePayload?.instanceContext?.pageId ?? bootstrapContext?.pageId ?? null,
        eventId: eventPhasePayload?.eventId ?? bootstrapContext?.eventId ?? null,
        runtimeSource:
          eventPhasePayload?.instanceContext?.runtimeSource ??
          bootstrapContext?.runtimeSource ??
          null,
        outcome: "success",
      })
    );

    return {
      user,
      eventPhasePayload,
      teams,
      freeAgents,
      registrations,
      activityFeed,
      schedule,
    };
  } catch (error) {
    console.info(
      "[hdc-performance-telemetry]",
      JSON.stringify({
        metric: "runtime_bootstrap",
        mode: HDC_PERF_RUNTIME_BOOTSTRAP_V2 ? "v2" : "legacy",
        durationMs: Math.max(0, Date.now() - startedAt),
        stageMs,
        outcome: "error",
        warning: error instanceof Error ? error.message : String(error),
      })
    );
    throw error;
  }
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


}
