import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readRuntimeSource() {
  return fs.readFile(path.resolve(__dirname, '../../src/runtime/index.js'), 'utf8');
}

test('runtime resolver file exists and exports handler', async () => {
  const source = await readRuntimeSource();
  assert.match(source, /export\s+const\s+handler\s*=\s*resolver\.getDefinitions\(\)/);
});

test('runtime resolver exposes core app-mode and team lifecycle endpoints', async () => {
  const source = await readRuntimeSource();
  const expectedResolvers = [
    'activateAppModeContext',
    'getAppModeLaunchUrl',
    'getEventPhase',
    'getTeams',
    'getTeam',
    'createTeam',
    'updateTeam',
    'deleteTeam',
    'submitProject',
    'castVote',
    'submitScore',
    'getSchedule',
    'getRegistrations',
    'updateRegistration',
    'getEventConfigModeState',
    'saveEventConfigDraft',
    'publishEventConfigDraft',
  ];

  for (const resolverName of expectedResolvers) {
    assert.match(
      source,
      new RegExp(`resolver\\.define\\("${resolverName}"`),
      `Expected runtime resolver: ${resolverName}`
    );
  }
});
