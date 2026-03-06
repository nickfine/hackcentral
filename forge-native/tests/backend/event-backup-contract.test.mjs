import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyEventBackupRestore,
  EVENT_BACKUP_SCOPE_VERSION,
  computeEventBackupDiff,
  stableStringify,
} from '../../src/runtime/lib/eventBackup.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createRestoreRunSupabase(run) {
  const restoreRunRows = [run];
  return {
    from(table) {
      if (table !== 'EventBackupRestoreRun') {
        throw new Error(`Unexpected table access in test stub: ${table}`);
      }
      return {
        select() {
          return this;
        },
        eq(field, value) {
          if (field === 'id') {
            const filtered = restoreRunRows.filter((row) => row.id === value);
            restoreRunRows.splice(0, restoreRunRows.length, ...filtered);
          }
          if (field === 'event_id') {
            const filtered = restoreRunRows.filter((row) => row.event_id === value);
            restoreRunRows.splice(0, restoreRunRows.length, ...filtered);
          }
          return this;
        },
        async limit() {
          return {
            data: restoreRunRows,
            error: null,
          };
        },
      };
    },
  };
}

test('stableStringify sorts object keys deterministically', () => {
  const a = { z: 1, a: { y: 2, x: 3 } };
  const b = { a: { x: 3, y: 2 }, z: 1 };

  assert.equal(stableStringify(a), stableStringify(b));
});

test('computeEventBackupDiff reports table and page mutations', () => {
  const liveScope = {
    eventId: 'evt-1',
    tables: {
      Event: [{ id: 'evt-1', name: 'Live Event' }],
      EventAdmin: [{ id: 'admin-1', event_id: 'evt-1', role: 'primary' }],
      EventSyncState: [{ event_id: 'evt-1', sync_status: 'complete' }],
      Milestone: [],
      Project: [{ id: 'p1', event_id: 'evt-1', title: 'Old title' }],
      Team: [],
      TeamMember: [],
      EventRegistration: [],
      Vote: [],
      JudgeScore: [],
      TeamInvite: [],
      HackdaySubmissionPageLink: [],
      ShowcaseHack: [],
      HackdayTemplateSeed: [],
      HackdayExtractionPrompt: [],
      HackdayExtractionImport: [],
      EventAuditLog: [],
    },
    pageBodies: [{ pageId: '111', storageValue: '<p>Old</p>' }],
  };

  const snapshotScope = {
    eventId: 'evt-1',
    tables: {
      Event: [{ id: 'evt-1', name: 'Live Event' }],
      EventAdmin: [{ id: 'admin-2', event_id: 'evt-1', role: 'co_admin' }],
      EventSyncState: [{ event_id: 'evt-1', sync_status: 'complete' }],
      Milestone: [],
      Project: [{ id: 'p1', event_id: 'evt-1', title: 'New title' }],
      Team: [],
      TeamMember: [],
      EventRegistration: [],
      Vote: [],
      JudgeScore: [],
      TeamInvite: [],
      HackdaySubmissionPageLink: [],
      ShowcaseHack: [],
      HackdayTemplateSeed: [],
      HackdayExtractionPrompt: [],
      HackdayExtractionImport: [],
      EventAuditLog: [],
    },
    pageBodies: [{ pageId: '111', storageValue: '<p>New</p>' }],
  };

  const diff = computeEventBackupDiff({ liveScope, snapshotScope });

  assert.equal(diff.scopeVersion, EVENT_BACKUP_SCOPE_VERSION);
  assert.equal(diff.eventId, 'evt-1');

  const eventAdminDiff = diff.tables.find((table) => table.table === 'EventAdmin');
  assert.ok(eventAdminDiff);
  assert.equal(eventAdminDiff.toCreate, 1);
  assert.equal(eventAdminDiff.toDelete, 1);

  const projectDiff = diff.tables.find((table) => table.table === 'Project');
  assert.ok(projectDiff);
  assert.equal(projectDiff.toUpdate, 1);

  assert.equal(diff.pages.toUpdate, 1);
  assert.equal(diff.pages.impactedPageIds.includes('111'), true);
});

test('computeEventBackupDiff ignores EventAuditLog drift and HackdayTemplateSeed updated_at noise', () => {
  const liveScope = {
    eventId: 'evt-1',
    tables: {
      Event: [{ id: 'evt-1', name: 'Live Event' }],
      EventAdmin: [],
      EventSyncState: [],
      Milestone: [],
      Project: [],
      Team: [],
      TeamMember: [],
      EventRegistration: [],
      Vote: [],
      JudgeScore: [],
      TeamInvite: [],
      HackdaySubmissionPageLink: [],
      ShowcaseHack: [],
      HackdayTemplateSeed: [
        {
          id: 'seed-1',
          hdc_event_id: 'evt-1',
          template_name: 'Example',
          seed_payload: { a: 1 },
          updated_at: '2026-03-06T00:00:05Z',
        },
      ],
      HackdayExtractionPrompt: [],
      HackdayExtractionImport: [],
      EventAuditLog: [{ id: 'audit-2', event_id: 'evt-1', action: 'snapshot_created' }],
    },
    pageBodies: [],
  };

  const snapshotScope = {
    eventId: 'evt-1',
    tables: {
      Event: [{ id: 'evt-1', name: 'Live Event' }],
      EventAdmin: [],
      EventSyncState: [],
      Milestone: [],
      Project: [],
      Team: [],
      TeamMember: [],
      EventRegistration: [],
      Vote: [],
      JudgeScore: [],
      TeamInvite: [],
      HackdaySubmissionPageLink: [],
      ShowcaseHack: [],
      HackdayTemplateSeed: [
        {
          id: 'seed-1',
          hdc_event_id: 'evt-1',
          template_name: 'Example',
          seed_payload: { a: 1 },
          updated_at: '2026-03-06T00:00:00Z',
        },
      ],
      HackdayExtractionPrompt: [],
      HackdayExtractionImport: [],
      EventAuditLog: [{ id: 'audit-1', event_id: 'evt-1', action: 'snapshot_created' }],
    },
    pageBodies: [],
  };

  const diff = computeEventBackupDiff({ liveScope, snapshotScope });
  const seedDiff = diff.tables.find((table) => table.table === 'HackdayTemplateSeed');
  const auditDiff = diff.tables.find((table) => table.table === 'EventAuditLog');

  assert.ok(seedDiff);
  assert.equal(seedDiff.toUpdate, 0);

  assert.ok(auditDiff);
  assert.equal(auditDiff.excludedFromDiff, true);
  assert.equal(auditDiff.toCreate, 0);
  assert.equal(auditDiff.toDelete, 0);

  assert.equal(diff.totals.toUpdate, 0);
  assert.equal(diff.totals.toDelete, 0);
});

test('applyEventBackupRestore requires a successful dry-run before apply', async () => {
  const supabase = createRestoreRunSupabase({
    id: 'restore-run-1',
    event_id: 'event-1',
    snapshot_id: 'snapshot-1',
    mode: 'apply',
    status: 'succeeded',
    confirmation_token: 'token-1',
  });

  await assert.rejects(
    applyEventBackupRestore({
      supabase,
      eventId: 'event-1',
      snapshotId: 'snapshot-1',
      restoreRunId: 'restore-run-1',
      confirmationToken: 'token-1',
    }),
    /requires a successful dry-run run/i
  );
});

test('applyEventBackupRestore enforces confirmation token from dry-run', async () => {
  const supabase = createRestoreRunSupabase({
    id: 'restore-run-2',
    event_id: 'event-1',
    snapshot_id: 'snapshot-1',
    mode: 'dry_run',
    status: 'succeeded',
    confirmation_token: 'expected-token',
  });

  await assert.rejects(
    applyEventBackupRestore({
      supabase,
      eventId: 'event-1',
      snapshotId: 'snapshot-1',
      restoreRunId: 'restore-run-2',
      confirmationToken: 'wrong-token',
    }),
    /invalid restore confirmation token/i
  );
});

test('event backup telemetry includes required restore failure event', async () => {
  const source = await fs.readFile(path.resolve(__dirname, '../../src/runtime/lib/eventBackup.mjs'), 'utf8');
  assert.match(source, /event_backup_snapshot_created/);
  assert.match(source, /event_backup_snapshot_failed/);
  assert.match(source, /event_backup_restore_dry_run/);
  assert.match(source, /event_backup_restore_applied/);
  assert.match(source, /event_backup_restore_failed/);
});

test('runtime apply restore wiring creates a pre_restore snapshot before apply', async () => {
  const source = await fs.readFile(path.resolve(__dirname, '../../src/runtime/index.js'), 'utf8');
  assert.match(source, /createPreRestoreSnapshot:\s*async\s*\(\)\s*=>[\s\S]*source:\s*"pre_restore"/);
});

test('restore apply excludes EventAuditLog from reconcile operations', async () => {
  const source = await fs.readFile(path.resolve(__dirname, '../../src/runtime/lib/eventBackup.mjs'), 'utf8');
  assert.match(source, /EventAuditLog:\s*\{ keyCandidates: \['id'\], excludeFromDiff: true, excludeFromRestore: true \}/);
  assert.match(source, /if \(spec\.excludeFromRestore\) \{\s*changesApplied\.tableDeletes\[tableName\] = 0;\s*changesApplied\.tableInserts\[tableName\] = 0;\s*continue;\s*\}/);
});
