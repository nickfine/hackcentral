#!/usr/bin/env node
/**
 * Set Convex environment variables required for the HackDays page (Phase 1).
 * Reads from process.env and runs `npx convex env set` for each.
 *
 * Usage (fill in the values; do not commit them):
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   CONFLUENCE_HDC_PARENT_PAGE_URL='https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=5668895' \
 *   node scripts/set-convex-hackdays-env.mjs
 *
 * Or export the vars first, then:
 *   node scripts/set-convex-hackdays-env.mjs
 *
 * Optional: SUPABASE_SCHEMA (default is public)
 */

import { execSync } from 'node:child_process';

const vars = [
  { env: 'SUPABASE_URL', required: true },
  { env: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
  { env: 'CONFLUENCE_HDC_PARENT_PAGE_URL', required: false },
  { env: 'SUPABASE_SCHEMA', required: false },
];

function setConvexEnv(name, value) {
  if (!value || value.trim() === '') return false;
  const safe = value.trim().replace(/'/g, "'\\''");
  execSync(`npx convex env set ${name} '${safe}'`, { stdio: 'inherit' });
  return true;
}

console.log('Setting Convex environment variables for HackDays...\n');

let missing = [];
for (const { env, required } of vars) {
  const value = process.env[env];
  if (value !== undefined && value !== '') {
    setConvexEnv(env, value);
    console.log(`  Set ${env}`);
  } else if (required) {
    missing.push(env);
  }
}

if (missing.length > 0) {
  console.error('\nMissing required env vars:', missing.join(', '));
  console.error('Example: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-convex-hackdays-env.mjs');
  process.exit(1);
}

console.log('\nDone. Run `npx convex env list` to verify.');
