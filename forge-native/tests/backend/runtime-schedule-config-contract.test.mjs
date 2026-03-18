import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readFile(relativePath) {
  return fs.readFile(path.resolve(__dirname, relativePath), 'utf8');
}

test('config mode helpers and runtime publish flow support schedule draft state', async () => {
  const [helpersSource, runtimeSource] = await Promise.all([
    readFile('../../src/runtime/lib/configModeHelpers.mjs'),
    readFile('../../src/runtime/index.js'),
  ]);

  assert.match(helpersSource, /schedule:\s*undefined/);
  assert.match(helpersSource, /schedule:\s*normalizeConfigModeSchedulePatch\(value\.schedule\)/);
  assert.match(runtimeSource, /publishedSchedule:\s*hasPublishedEventSchedule\(publishedSchedule\)\s*\?\s*publishedSchedule\s*:\s*null/);
  assert.match(runtimeSource, /applySchedule:\s*async\s*\(\{/);
  assert.match(runtimeSource, /hasPublishedSchedule/);
});

test('config mode helpers allow the rules header title override key', async () => {
  const helpersSource = await readFile('../../src/runtime/lib/configModeHelpers.mjs');

  assert.match(helpersSource, /\['rules\.header\.title',\s*80\]/);
  assert.match(helpersSource, /\['rules\.header\.subtitle',\s*CONFIG_MODE_DEFAULT_MAX_COPY_LENGTH\]/);
});

test('runtime schedule page owns config-mode editing and participant empty state', async () => {
  const source = await readFile('../../static/runtime-frontend/src/components/Schedule.jsx');

  assert.match(source, /useConfigMode/);
  assert.match(source, /ScheduleBuilderV2/);
  assert.match(source, /Schedule not published yet/);
  assert.match(source, /configMode\.setScheduleDraft/);
});

test('HackCentral create wizard defers schedule setup to the child page', async () => {
  const [wizardSource, runtimeScheduleSource] = await Promise.all([
    readFile('../../static/frontend/src/App.tsx'),
    readFile('../../static/runtime-frontend/src/components/Schedule.jsx'),
  ]);

  assert.doesNotMatch(wizardSource, /import\s+\{[^}]*ScheduleBuilderV2/);
  assert.match(wizardSource, /finish schedule setup in the HackDay page/);
  assert.match(runtimeScheduleSource, /Turn on Config Mode/);
  assert.match(runtimeScheduleSource, /Open Schedule Builder|Editing in Config Mode/);
});
