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

test('showcase confluence migration adds page linkage columns and unique index', async () => {
  const migration = await readSource(
    '../../supabase/migrations/20260303110000_phase4_showcase_confluence_pages.sql'
  );

  assert.match(migration, /add column if not exists confluence_page_id text/i);
  assert.match(migration, /add column if not exists confluence_page_url text/i);
  assert.match(migration, /add column if not exists output_page_ids text\[\]/i);
  assert.match(migration, /create unique index if not exists showcase_hack_confluence_page_id_uq/i);
});

test('shared and frontend types include page-backed showcase contracts', async () => {
  const shared = await readSource('../../src/shared/types.ts');
  const frontendTypes = await readSource('../../static/frontend/src/types.ts');

  for (const content of [shared, frontendTypes]) {
    assert.match(content, /interface\s+CreateHackResult\s*\{[\s\S]*confluencePageId:\s*string;/);
    assert.match(content, /interface\s+CreateHackResult\s*\{[\s\S]*confluencePageUrl:\s*string\s*\|\s*null;/);
    assert.match(content, /interface\s+CreateHackResult\s*\{[\s\S]*outputPageIds:\s*string\[\];/);
    assert.match(content, /interface\s+ShowcaseHackListItem\s*\{[\s\S]*confluencePageId\?:\s*string;/);
    assert.match(content, /interface\s+ShowcaseHackListItem\s*\{[\s\S]*isPageBacked:\s*boolean;/);
  }
});

test('frontend showcase supports page-only rollout flag while keeping fallback path', async () => {
  const appSource = await readSource('../../static/frontend/src/App.tsx');

  assert.match(appSource, /VITE_HDC_SHOWCASE_PAGE_ONLY_V1/);
  assert.match(appSource, /buildConfluencePagePath\(pageId\)/);
  assert.match(appSource, /showcaseItem\.isPageBacked && showcaseItem\.confluencePageId/);
  assert.match(appSource, /Open page/);
  assert.match(appSource, /Legacy/);
});

test('create hack validates linked artifact IDs before artifact lookup', async () => {
  const repositorySource = await readSource('../../src/backend/supabase/repositories.ts');
  const appSource = await readSource('../../static/frontend/src/App.tsx');

  assert.match(repositorySource, /function normalizeShowcaseLinkedArtifactIds[\s\S]*filter\(\(artifactId\) => isUuid\(artifactId\)\)/);
  assert.match(repositorySource, /async getArtifact\([\s\S]*artifactId must be a valid UUID\./);
  assert.match(repositorySource, /notNullColumn === 'description'[\s\S]*description: ''/);
  assert.match(repositorySource, /notNullColumn === 'description'[\s\S]*continue;/);
  assert.match(repositorySource, /createHack[\s\S]*description:\s*input\.description\?\.trim\(\)\s*\|\|\s*''/);
  assert.match(appSource, /invalidLinkedArtifactIds = linkedArtifactIds\.filter\(\(artifactId\) => !isUuid\(artifactId\)\)/);
  assert.match(appSource, /Linked artifact IDs must be valid UUIDs\./);
});
