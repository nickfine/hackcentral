#!/usr/bin/env node
/**
 * One-time idempotent migration: Supabase Problem Exchange → Convex painPoints.
 *
 * Prerequisites:
 *   SUPABASE_URL=https://easooezlgwbiiqqlpvpb.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key>
 *   CONVEX_DEPLOY_KEY=<deploy key with functions:runInternalMutations>
 *
 * Dry run (read + map only, no Convex writes):
 *   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-problems-to-convex.mjs
 *
 * Full run:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CONVEX_DEPLOY_KEY=... node scripts/migrate-problems-to-convex.mjs
 */

import { execSync } from 'node:child_process';

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY?.trim();
const DRY_RUN = process.env.DRY_RUN === '1';
const BATCH_SIZE = 50;
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA?.trim() || 'public';

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!DRY_RUN && !CONVEX_DEPLOY_KEY) {
  console.error('Missing CONVEX_DEPLOY_KEY (required for non-dry-run). Pass DRY_RUN=1 to skip Convex writes.');
  process.exit(1);
}

async function supabaseFetch(table, select, extraParams = '') {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${extraParams}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept-Profile': SUPABASE_SCHEMA,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${table} fetch failed (${res.status}): ${text}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

function composeDescription(row) {
  const parts = [];
  if (row.description?.trim()) parts.push(row.description.trim());

  const meta = [];
  if (row.frequency && row.frequency !== 'once') meta.push(`**Frequency:** ${row.frequency}`);
  if (row.estimated_time_wasted_hours > 0) meta.push(`**Time wasted:** ${row.estimated_time_wasted_hours}h`);
  if (row.team?.trim()) meta.push(`**Team:** ${row.team.trim()}`);
  if (row.domain?.trim()) meta.push(`**Domain:** ${row.domain.trim()}`);

  if (meta.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push(meta.join('  \n'));
  }
  return parts.join('\n').trim() || undefined;
}

function resolveIsHidden(moderation_state) {
  return moderation_state === 'hidden' || moderation_state === 'rejected';
}

async function runConvexBatch(rows) {
  const args = JSON.stringify({ rows });
  const escaped = args.replace(/'/g, "'\\''");
  const cmd = `CONVEX_DEPLOY_KEY='${CONVEX_DEPLOY_KEY}' npx convex run --prod painPoints:adminImportLegacyProblems '${escaped}'`;
  const result = execSync(cmd, {
    cwd: '/Users/nickster/Downloads/HackCentral-tag-hackday',
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  return JSON.parse(result.trim());
}

console.log(`\nMigrate Problem Exchange → Convex${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

console.log('Fetching Problem rows from Supabase...');
const problems = await supabaseFetch(
  'Problem',
  'id,title,description,frequency,estimated_time_wasted_hours,team,domain,moderation_state,vote_count,created_by_user_id,created_at'
);
console.log(`  Found ${problems.length} Problem rows`);

console.log('Fetching User rows from Supabase...');
const users = await supabaseFetch('User', 'id,full_name,email');
const userNameById = new Map(users.map((u) => [u.id, u.full_name?.trim() || u.email?.trim() || null]));
console.log(`  Found ${users.length} User rows`);

const mapped = problems.map((row) => ({
  legacyId: row.id,
  title: row.title?.trim() || '(untitled)',
  description: composeDescription(row),
  submitterName: userNameById.get(row.created_by_user_id) || 'Anonymous',
  voteCount: row.vote_count ?? 0,
  isHidden: resolveIsHidden(row.moderation_state),
  originalCreatedAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
}));

console.log(`\nMapped ${mapped.length} rows.`);

const hidden = mapped.filter((r) => r.isHidden).length;
const visible = mapped.length - hidden;
console.log(`  Visible: ${visible}  Hidden: ${hidden}`);

if (DRY_RUN) {
  console.log('\nDry run — no Convex writes. First 3 mapped rows:');
  console.log(JSON.stringify(mapped.slice(0, 3), null, 2));
  process.exit(0);
}

console.log('\nPosting to Convex in batches of', BATCH_SIZE, '...\n');
let totalInserted = 0;
let totalSkipped = 0;

for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
  const batch = mapped.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(mapped.length / BATCH_SIZE);
  process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} rows)... `);
  try {
    const result = await runConvexBatch(batch);
    totalInserted += result.insertedCount ?? 0;
    totalSkipped += result.skippedCount ?? 0;
    console.log(`inserted=${result.insertedCount} skipped=${result.skippedCount}`);
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
    console.error('  Batch data written to /tmp/failed-batch.json for inspection');
    const fs = await import('node:fs');
    fs.writeFileSync('/tmp/failed-batch.json', JSON.stringify(batch, null, 2));
    process.exit(1);
  }
}

console.log(`\nDone. Total inserted: ${totalInserted}  Total skipped: ${totalSkipped}`);
console.log('Re-run to verify idempotency — all rows should appear as skipped.');
