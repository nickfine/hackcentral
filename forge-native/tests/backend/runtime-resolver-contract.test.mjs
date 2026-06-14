import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntimeSource } from './_runtime-source.mjs';

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
    'createEventBackupSnapshot',
    'listEventBackupSnapshots',
    'previewEventBackupRestore',
    'applyEventBackupRestore',
    'getEventBackupCoverageStatus',
    'createEventBrandingImageUploadUrl',
  ];

  for (const resolverName of expectedResolvers) {
    assert.match(
      source,
      new RegExp(`resolver\\.define\\("${resolverName}"`),
      `Expected runtime resolver: ${resolverName}`
    );
  }
});

test('runtime restore resolvers enforce platform-admin-only access', async () => {
  const source = await readRuntimeSource();
  assert.match(source, /resolver\.define\("previewEventBackupRestore"[\s\S]*if \(!access\.isPlatformAdmin\)/);
  assert.match(source, /resolver\.define\("applyEventBackupRestore"[\s\S]*if \(!access\.isPlatformAdmin\)/);
});

test('runtime voting and judging resolvers block self-team actions server-side', async () => {
  const source = await readRuntimeSource();
  assert.match(source, /async function isAcceptedTeamMember\(supabase, teamId, userId\)/);
  assert.match(source, /resolver\.define\("castVote"[\s\S]*You cannot vote for your own team/);
  assert.match(source, /resolver\.define\("submitScore"[\s\S]*You cannot score your own team/);
});

test('assignPainPointsToTeam enforces one-per-team server-side before linking', async () => {
  const source = await readRuntimeSource();
  // Guard: must query existing links before calling linkToTeam
  assert.match(
    source,
    /resolver\.define\("assignPainPointsToTeam"[\s\S]*painPoints:listForTeam[\s\S]*already has a pain point/,
    'assignPainPointsToTeam must check existing pain points before linking'
  );
});

test('runtime resolver names are unique — no two modules define the same resolver name', async () => {
  const source = await readRuntimeSource();
  const pattern = /resolver\.define\("([^"]+)"/g;
  const names = [];
  let match;
  while ((match = pattern.exec(source)) !== null) {
    names.push(match[1]);
  }
  const seen = new Set();
  const duplicates = [];
  for (const name of names) {
    if (seen.has(name)) {
      duplicates.push(name);
    }
    seen.add(name);
  }
  assert.deepEqual(
    duplicates,
    [],
    `Duplicate resolver names found: ${duplicates.join(', ')}`
  );
});
