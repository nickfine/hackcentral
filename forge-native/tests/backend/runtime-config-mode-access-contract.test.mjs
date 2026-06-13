import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntimeSource } from './_runtime-source.mjs';

test('runtime event-admin access prefers EventAdmin membership before seed-email fallback', async () => {
  const source = await readRuntimeSource();

  assert.match(source, /async function resolveRuntimeEventAdminAccess\(supabase,\s*\{/);
  assert.match(source, /if \(eventId && isUuidLike\(userRow\?\.id\)\)/);
  assert.match(
    source,
    /\.from\("EventAdmin"\)\s*\.select\("id, role"\)\s*\.eq\("event_id", eventId\)\s*\.eq\("user_id", userRow\.id\)\s*\.limit\(1\)/s
  );
  assert.match(source, /const isSeedAdmin = hasSeedEmailAdminAccess\(seed, email\)/);
});

test('config mode, runtime capabilities, and branding checks share the same event-admin resolver', async () => {
  const source = await readRuntimeSource();

  assert.match(
    source,
    /resolveConfigModeAccess[\s\S]*resolveRuntimeEventAdminAccess\(supabase,\s*\{[\s\S]*logScope: "resolveConfigModeAccess"[\s\S]*\}\);/
  );
  assert.match(
    source,
    /resolver\.define\("getEventPhase"[\s\S]*resolveRuntimeEventAdminAccess\(supabase,\s*\{[\s\S]*logScope: "getEventPhase"[\s\S]*\}\);/
  );
  assert.match(
    source,
    /async function resolveEventBrandingAdminContext\(req\)[\s\S]*resolveRuntimeEventAdminAccess\(supabase,\s*\{[\s\S]*logScope: "resolveEventBrandingAdminContext"[\s\S]*\}\);/
  );
});
