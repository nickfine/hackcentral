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

test('runtime supabase client requires service-role key and does not fallback to anon key', async () => {
  const source = await readSource('../../src/runtime/lib/supabase.js');

  assert.doesNotMatch(source, /SUPABASE_ANON_KEY/);
  assert.match(source, /const\s+supabaseKey\s*=\s*supabaseServiceRoleKey\s*;/);
  assert.match(source, /if\s*\(\s*!supabaseUrl\s*\|\|\s*!supabaseServiceRoleKey\s*\)/);
  assert.match(source, /forge variables set --encrypt SUPABASE_SERVICE_ROLE_KEY <key>/);
  assert.match(source, /headers\['apikey'\]\s*=\s*supabaseKey/);
  assert.match(source, /headers\['Authorization'\]\s*=\s*`Bearer \$\{supabaseKey\}`/);
});

test('runtime supabase client exposes binary helpers for storage download responses', async () => {
  const source = await readSource('../../src/runtime/lib/supabase.js');

  assert.match(source, /arrayBuffer:\s*async\s*\(\)\s*=>/);
  assert.match(source, /blob:\s*async\s*\(\)\s*=>/);
  assert.match(source, /new Blob\(\[bytes\]/);
});

test('runtime supabase client preserves binary request bodies for storage uploads', async () => {
  const source = await readSource('../../src/runtime/lib/supabase.js');

  assert.match(source, /function normalizeHeaders\(headersInit\)/);
  assert.match(source, /headersInit\.forEach/);
  assert.match(source, /function hasHeader\(headers, name\)/);
  assert.match(source, /function getHeader\(headers, name\)/);
  assert.match(source, /function isBinaryLikeBody\(body\)/);
  assert.match(source, /Buffer\.isBuffer\(body\)/);
  assert.match(source, /body instanceof ArrayBuffer/);
  assert.match(source, /ArrayBuffer\.isView\(body\)/);
  assert.match(source, /body instanceof Blob/);
  assert.match(source, /body instanceof FormData/);
  assert.match(source, /const isBinaryBody = isBinaryLikeBody\(body\)/);
  assert.match(source, /!hasHeader\(headers, 'Content-Type'\) && !isBinaryBody && typeof body !== 'string'/);
  assert.match(source, /if \(!isBinaryBody && body != null && typeof body === 'object'\) \{/);
  assert.match(source, /const headers = normalizeHeaders\(options\.headers\)/);
});

test('phase9 search-path hardening migration uses IF EXISTS for optional functions', async () => {
  const migration = await readSource(
    '../../supabase/migrations/20260304023500_phase9_security_policy_search_path_hardening.sql'
  );

  assert.match(migration, /ALTER FUNCTION IF EXISTS public\.artifact_set_updated_at_fn\(\) SET search_path = pg_catalog, public;/);
  assert.match(migration, /ALTER FUNCTION IF EXISTS public\.problem_set_updated_at_fn\(\) SET search_path = pg_catalog, public;/);
  assert.match(
    migration,
    /ALTER FUNCTION IF EXISTS public\.pipeline_stage_criteria_set_updated_at_fn\(\) SET search_path = pg_catalog, public;/
  );

  assert.doesNotMatch(migration, /ALTER FUNCTION public\.artifact_set_updated_at_fn\(\) SET search_path = pg_catalog, public;/);
  assert.doesNotMatch(migration, /ALTER FUNCTION public\.problem_set_updated_at_fn\(\) SET search_path = pg_catalog, public;/);
  assert.doesNotMatch(
    migration,
    /ALTER FUNCTION public\.pipeline_stage_criteria_set_updated_at_fn\(\) SET search_path = pg_catalog, public;/
  );
});

test('event-admin access checks guard against non-uuid user ids', async () => {
  const source = await readSource('../../src/backend/supabase/repositories.ts');

  assert.match(source, /private async isEventAdminForEvent\(eventId: string, userId: string\): Promise<boolean>[\s\S]*if \(!isUuid\(userId\)\) \{\s*return false;\s*\}/);
  assert.match(source, /private async hasAnyEventAdminAccess\(userId: string\): Promise<boolean>[\s\S]*if \(!isUuid\(userId\)\) \{\s*return false;\s*\}/);
  assert.match(source, /private async listEventAdminsByUserId\(userId: string\): Promise<DbEventAdmin\[]>[\s\S]*if \(!isUuid\(userId\)\) \{\s*return \[\];\s*\}/);
});
