import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSource(relPath) {
  return fs.readFile(path.resolve(__dirname, relPath), 'utf8');
}

test('manifest includes daily backup scheduled trigger and predeploy backup webtrigger', async () => {
  const manifest = await readSource('../../manifest.yml');

  assert.match(manifest, /key:\s*event-backup-daily-job/);
  assert.match(manifest, /handler:\s*runtime\/backupOps\.scheduledHandler/);
  assert.match(manifest, /scheduledTrigger:\s*[\s\S]*key:\s*event-backup-daily-trigger[\s\S]*interval:\s*day/);

  assert.match(manifest, /key:\s*event-backup-ops/);
  assert.match(manifest, /handler:\s*runtime\/backupOps\.predeployHandler/);
  assert.match(manifest, /webtrigger:\s*[\s\S]*key:\s*event-backup-ops-wt/);
});

test('backup ops handler supports predeploy snapshot action and daily source', async () => {
  const source = await readSource('../../src/runtime/backupOps.js');

  assert.match(source, /source:\s*"daily"/);
  assert.match(source, /source:\s*"predeploy"/);
  assert.match(source, /predeploy_snapshot/);
  assert.match(source, /createEventBackupSnapshot/);
});
