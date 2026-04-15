import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  resolveConfigModeAccess,
  getConfluencePageStorageForBackup,
  restoreConfluencePageStorageFromBackup,
  appendEventBackupAuditLog,
} from "../lib/helpers.js";
import {
  createEventBackupSnapshot,
  listEventBackupSnapshots,
  getEventBackupCoverageStatus,
  createRestoreDryRun,
  applyEventBackupRestore,
} from "../lib/eventBackup.mjs";

export function registerBackupResolvers(resolver) {
resolver.define("createEventBackupSnapshot", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  const payload = req.payload || {};
  const requestedSource =
    typeof payload.source === "string" && payload.source.trim()
      ? payload.source.trim().toLowerCase()
      : "manual";
  if (requestedSource !== "manual") {
    throw new Error('Only "manual" source is supported from this endpoint.');
  }

  const snapshot = await createEventBackupSnapshot({
    supabase,
    eventId: access.event.id,
    source: requestedSource,
    actorUserId: access.userRow?.id || null,
    fetchPageStorageById: getConfluencePageStorageForBackup,
    logger: console,
  });

  await appendEventBackupAuditLog(supabase, {
    eventId: access.event.id,
    actorUserId: access.userRow?.id || null,
    action: "event_backup_snapshot_created",
    newValue: {
      source: requestedSource,
      snapshotId: snapshot.snapshotId,
      dbRowCounts: snapshot.dbRowCounts,
      pageCounts: snapshot.pageCounts,
      warningCount: Array.isArray(snapshot.warnings) ? snapshot.warnings.length : 0,
    },
  });

  const coverage = await getEventBackupCoverageStatus({
    supabase,
    eventId: access.event.id,
  });

  return {
    success: true,
    snapshot,
    backupCoverageStatus: coverage,
  };
});

resolver.define("listEventBackupSnapshots", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  const payload = req.payload || {};
  const snapshots = await listEventBackupSnapshots({
    supabase,
    eventId: access.event.id,
    limit: payload.limit,
  });
  return {
    success: true,
    eventId: access.event.id,
    snapshots,
  };
});

resolver.define("getEventBackupCoverageStatus", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  const coverage = await getEventBackupCoverageStatus({
    supabase,
    eventId: access.event.id,
  });
  return {
    success: true,
    coverage,
  };
});

resolver.define("previewEventBackupRestore", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  if (!access.isPlatformAdmin) {
    throw new Error("Only platform admins can preview backup restore.");
  }
  const payload = req.payload || {};
  const snapshotId = typeof payload.snapshotId === "string" ? payload.snapshotId.trim() : "";
  if (!snapshotId) {
    throw new Error("snapshotId is required for restore preview.");
  }

  const dryRun = await createRestoreDryRun({
    supabase,
    eventId: access.event.id,
    snapshotId,
    requestedByUserId: access.userRow?.id || null,
    fetchPageStorageById: getConfluencePageStorageForBackup,
    logger: console,
  });

  await appendEventBackupAuditLog(supabase, {
    eventId: access.event.id,
    actorUserId: access.userRow?.id || null,
    action: "event_backup_restore_dry_run",
    newValue: {
      snapshotId,
      restoreRunId: dryRun.restoreRunId,
      totals: dryRun.diffSummary?.totals || null,
      impactedPageCount: dryRun.diffSummary?.pages?.impactedPageIds?.length || 0,
    },
  });

  return {
    success: true,
    dryRun,
  };
});

resolver.define("applyEventBackupRestore", async (req) => {
  const supabase = getSupabaseClient();
  const access = await resolveConfigModeAccess(supabase, req);
  if (!access.isPlatformAdmin) {
    throw new Error("Only platform admins can apply backup restore.");
  }
  const payload = req.payload || {};
  const snapshotId = typeof payload.snapshotId === "string" ? payload.snapshotId.trim() : "";
  const restoreRunId = typeof payload.restoreRunId === "string" ? payload.restoreRunId.trim() : "";
  const confirmationToken = typeof payload.confirmationToken === "string" ? payload.confirmationToken.trim() : "";
  if (!snapshotId || !restoreRunId || !confirmationToken) {
    throw new Error("snapshotId, restoreRunId, and confirmationToken are required.");
  }

  const applied = await applyEventBackupRestore({
    supabase,
    eventId: access.event.id,
    snapshotId,
    restoreRunId,
    confirmationToken,
    requestedByUserId: access.userRow?.id || null,
    confirmedByUserId: access.userRow?.id || null,
    fetchPageStorageById: getConfluencePageStorageForBackup,
    updatePageStorageById: restoreConfluencePageStorageFromBackup,
    createPreRestoreSnapshot: async () =>
      createEventBackupSnapshot({
        supabase,
        eventId: access.event.id,
        source: "pre_restore",
        actorUserId: access.userRow?.id || null,
        fetchPageStorageById: getConfluencePageStorageForBackup,
        logger: console,
      }),
    logger: console,
  });

  await appendEventBackupAuditLog(supabase, {
    eventId: access.event.id,
    actorUserId: access.userRow?.id || null,
    action: "event_backup_restore_applied",
    newValue: {
      snapshotId,
      restoreRunId,
      appliedRestoreRunId: applied.restoreRunId,
      warnings: applied.warnings || [],
      changesApplied: applied.changesApplied || null,
    },
  });

  const coverage = await getEventBackupCoverageStatus({
    supabase,
    eventId: access.event.id,
  });

  return {
    success: true,
    applied,
    backupCoverageStatus: coverage,
  };
});


}
