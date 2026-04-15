import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  resolveConfigModeAccess,
  getStoredEventConfigDraft,
  setStoredEventConfigDraft,
  clearStoredEventConfigDraft,
  getStoredEventContentOverrides,
  normalizeConfigModeDraftPatch,
  mergeConfigModeDraftPatches,
  updateEventWithSchemaFallback,
  normalizeSeedPayload,
  sanitizeManagedBrandingValue,
  getStoredEventMotd,
  normalizeMotdMessage,
  setStoredEventMotd,
  normalizeConfigModeContentOverridesEnvelope,
  setStoredEventContentOverrides,
  normalizeRuntimeEventSchedule,
  hasPublishedEventSchedule,
  validateEventSchedule,
  buildScheduleMilestonesFromEventSchedule,
  replaceEventMilestonesForSchedule,
  getScheduleRangeStart,
  getScheduleRangeEnd,
  getConfluencePageStorageForBackup,
  appendEventBackupAuditLog,
  buildConfigModeStateResponse,
} from "../lib/helpers.js";
import {
  runSaveConfigModeDraftCore,
  runPublishConfigModeDraftCore,
} from "../lib/configModeResolverCore.mjs";
import {
  createEventBackupSnapshot,
} from "../lib/eventBackup.mjs";

export function registerConfigResolvers(resolver) {
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
        try {
          await updateEventWithSchemaFallback(supabase, access.event.id, {
            event_config_draft: nextDraft,
            updatedAt: nowIso,
            updated_at: nowIso,
          });
        } catch (error) {
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
    await updateEventWithSchemaFallback(supabase, access.event.id, {
      event_config_draft: null,
      updatedAt: nowIso,
      updated_at: nowIso,
    });
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

  // Guardrail: always create a publish-bound snapshot before applying live content updates.
  const publishSnapshot = await createEventBackupSnapshot({
    supabase,
    eventId: access.event.id,
    source: "publish",
    actorUserId: access.userRow?.id || null,
    fetchPageStorageById: getConfluencePageStorageForBackup,
    logger: console,
  });
  await appendEventBackupAuditLog(supabase, {
    eventId: access.event.id,
    actorUserId: access.userRow?.id || null,
    action: "event_backup_snapshot_created",
    newValue: {
      source: "publish",
      snapshotId: publishSnapshot.snapshotId,
      dbRowCounts: publishSnapshot.dbRowCounts,
      pageCounts: publishSnapshot.pageCounts,
      warningCount: Array.isArray(publishSnapshot.warnings) ? publishSnapshot.warnings.length : 0,
    },
  });

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
          const existingBranding = sanitizeManagedBrandingValue(existingSeedPayload.branding);
          mergedBranding = sanitizeManagedBrandingValue({ ...existingBranding, ...patchBranding });

          const nextSeedPayload = { ...existingSeedPayload, branding: mergedBranding };
          const { error: seedError } = await supabase
            .from("HackdayTemplateSeed")
            .update({ seed_payload: nextSeedPayload, updated_at: nowIso })
            .eq("confluence_page_id", access.pageId);
          if (seedError) {
            throw new Error(`Failed to update seed branding: ${seedError.message}`);
          }
        } else {
          const existingEventBranding = sanitizeManagedBrandingValue(access.event.event_branding);
          mergedBranding = sanitizeManagedBrandingValue({ ...existingEventBranding, ...patchBranding });
        }

        try {
          await updateEventWithSchemaFallback(supabase, access.event.id, {
            event_branding: mergedBranding,
            updatedAt: nowIso,
            updated_at: nowIso,
          });
        } catch (eventBrandingError) {
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
      applySchedule: async ({ patchSchedule, access, nowIso }) => {
        const previousSchedule = normalizeRuntimeEventSchedule(access.event.event_schedule, {
          timezone: access.event.timezone,
          hackingStartsAt: access.event.hacking_starts_at || access.event.startDate || access.event.start_date,
          submissionDeadlineAt: access.event.submission_deadline_at || access.event.endDate || access.event.end_date,
        });
        const nextPublishedSchedule = normalizeRuntimeEventSchedule(patchSchedule, {
          timezone: patchSchedule?.timezone || previousSchedule.timezone || access.event.timezone,
          hackingStartsAt: access.event.hacking_starts_at || access.event.startDate || access.event.start_date,
          submissionDeadlineAt: access.event.submission_deadline_at || access.event.endDate || access.event.end_date,
        });
        validateEventSchedule(nextPublishedSchedule);

        const eventUpdatePayload = {
          event_schedule: nextPublishedSchedule,
          timezone: nextPublishedSchedule.timezone || access.event.timezone || "Europe/London",
          startDate: getScheduleRangeStart(nextPublishedSchedule, access.event.startDate || access.event.start_date || nowIso),
          start_date: getScheduleRangeStart(nextPublishedSchedule, access.event.startDate || access.event.start_date || nowIso),
          endDate: getScheduleRangeEnd(nextPublishedSchedule, access.event.endDate || access.event.end_date || nowIso),
          end_date: getScheduleRangeEnd(nextPublishedSchedule, access.event.endDate || access.event.end_date || nowIso),
          hacking_starts_at: nextPublishedSchedule.hackingStartsAt || null,
          submission_deadline_at: nextPublishedSchedule.submissionDeadlineAt || null,
          updatedAt: nowIso,
          updated_at: nowIso,
        };

        try {
          await updateEventWithSchemaFallback(supabase, access.event.id, eventUpdatePayload);
        } catch (eventScheduleError) {
          throw new Error(`Failed to update event schedule: ${eventScheduleError.message}`);
        }

        if (access.seed) {
          const existingSeedPayload = normalizeSeedPayload(access.seed);
          const nextSeedPayload = { ...existingSeedPayload, schedule: nextPublishedSchedule };
          const { error: seedScheduleError } = await supabase
            .from("HackdayTemplateSeed")
            .update({ seed_payload: nextSeedPayload, updated_at: nowIso })
            .eq("confluence_page_id", access.pageId);
          if (seedScheduleError) {
            throw new Error(`Failed to update seed schedule: ${seedScheduleError.message}`);
          }
        }

        const milestones = hasPublishedEventSchedule(nextPublishedSchedule)
          ? buildScheduleMilestonesFromEventSchedule(access.event.id, nextPublishedSchedule)
          : [];
        await replaceEventMilestonesForSchedule(supabase, access.event.id, milestones);
        access.event = {
          ...access.event,
          event_schedule: nextPublishedSchedule,
          timezone: nextPublishedSchedule.timezone || access.event.timezone,
          startDate: eventUpdatePayload.startDate,
          start_date: eventUpdatePayload.start_date,
          endDate: eventUpdatePayload.endDate,
          end_date: eventUpdatePayload.end_date,
          hacking_starts_at: eventUpdatePayload.hacking_starts_at,
          submission_deadline_at: eventUpdatePayload.submission_deadline_at,
        };
        return nextPublishedSchedule;
      },
      clearDraft: async ({ access }) => {
        await clearStoredEventConfigDraft(access.event.id);
      },
      syncEventColumns: async ({ access, nowIso, nextPublishedContentOverrides, nextPublishedSchedule }) => {
        const updatePayload = {
          event_config_draft: null,
          updatedAt: nowIso,
          updated_at: nowIso,
        };
        if (nextPublishedContentOverrides) {
          updatePayload.event_content_overrides = nextPublishedContentOverrides;
        }
        if (nextPublishedSchedule) {
          updatePayload.event_schedule = nextPublishedSchedule;
          updatePayload.timezone = nextPublishedSchedule.timezone || access.event.timezone || "Europe/London";
          updatePayload.startDate = getScheduleRangeStart(nextPublishedSchedule, access.event.startDate || access.event.start_date || nowIso);
          updatePayload.start_date = updatePayload.startDate;
          updatePayload.endDate = getScheduleRangeEnd(nextPublishedSchedule, access.event.endDate || access.event.end_date || nowIso);
          updatePayload.end_date = updatePayload.endDate;
          updatePayload.hacking_starts_at = nextPublishedSchedule.hackingStartsAt || null;
          updatePayload.submission_deadline_at = nextPublishedSchedule.submissionDeadlineAt || null;
        }
        try {
          await updateEventWithSchemaFallback(supabase, access.event.id, updatePayload);
        } catch (eventUpdateError) {
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


}
