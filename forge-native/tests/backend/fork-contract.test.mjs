import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSource(filePath) {
  return fs.readFile(path.resolve(__dirname, filePath), 'utf8');
}

test('fork relation migration creates relation table with core constraints', async () => {
  const migration = await readSource('../../supabase/migrations/20260301233000_phase3_fork_relations.sql');

  assert.match(migration, /create table if not exists "ForkRelation"/i);
  assert.match(migration, /\bentity_type\s+text\s+not null/i);
  assert.match(migration, /check\s*\(\s*entity_type\s+in\s+\('project',\s*'artifact'\)\s*\)/i);
  assert.match(migration, /unique\s*\(\s*entity_type,\s*source_id,\s*fork_id\s*\)/i);
});

test('global resolver exposes fork endpoints', async () => {
  const source = await readSource('../../src/index.ts');

  assert.match(source, /resolver\.define\(\s*'hdcForkArtifact'/);
  assert.match(source, /resolver\.define\(\s*'hdcForkShowcaseHack'/);
  assert.match(source, /return forkArtifact\(viewer,\s*request\.payload\);/);
  assert.match(source, /return forkShowcaseHack\(viewer,\s*request\.payload\);/);
});

test('shared and frontend type contracts include fork payloads, counts, and resolver defs', async () => {
  const shared = await readSource('../../src/shared/types.ts');
  const frontendTypes = await readSource('../../static/frontend/src/types.ts');

  for (const content of [shared, frontendTypes]) {
    assert.match(content, /interface\s+ArtifactListItem\s*\{[\s\S]*forkCount:\s*number;/);
    assert.match(content, /interface\s+ShowcaseHackListItem\s*\{[\s\S]*forkCount:\s*number;/);
    assert.match(content, /export\s+interface\s+ForkArtifactInput\s*\{[\s\S]*sourceArtifactId:\s*string;/);
    assert.match(content, /export\s+interface\s+ForkShowcaseHackInput\s*\{[\s\S]*sourceProjectId:\s*string;/);
    assert.match(content, /hdcForkArtifact:\s*\(payload:\s*ForkArtifactInput\)\s*=>\s*ForkArtifactResult;/);
    assert.match(content, /hdcForkShowcaseHack:\s*\(payload:\s*ForkShowcaseHackInput\)\s*=>\s*ForkShowcaseHackResult;/);
  }
});

test('frontend app wires fork actions for showcase and registry', async () => {
  const appSource = await readSource('../../static/frontend/src/App.tsx');

  assert.match(appSource, /invokeTyped\('hdcForkShowcaseHack'/);
  assert.match(appSource, /invokeTyped\('hdcForkArtifact'/);
  assert.match(appSource, /Fork Hack/);
  assert.match(appSource, /Fork Artifact/);
  assert.match(appSource, /forkCount:\s*0/);
});
