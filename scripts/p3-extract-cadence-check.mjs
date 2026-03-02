#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/nickster/Downloads/HackCentral';
const DEFAULT_PROJECT_REF = 'ssafugtobsqxmqtphwch';

function parseArgs(argv) {
  const args = {
    projectRef: DEFAULT_PROJECT_REF,
    supabaseUrl: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    out: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--project-ref') {
      args.projectRef = argv[i + 1] || args.projectRef;
      i += 1;
      continue;
    }
    if (token === '--supabase-url') {
      args.supabaseUrl = argv[i + 1] || args.supabaseUrl;
      i += 1;
      continue;
    }
    if (token === '--service-role-key') {
      args.serviceRoleKey = argv[i + 1] || args.serviceRoleKey;
      i += 1;
      continue;
    }
    if (token === '--out') {
      args.out = argv[i + 1] || args.out;
      i += 1;
    }
  }

  return args;
}

function toStamp(iso) {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
}

function normalizeBaseUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  return trimmed;
}

function resolveSupabaseUrl(args) {
  const fromArgs = normalizeBaseUrl(args.supabaseUrl);
  if (fromArgs) return fromArgs;
  if (args.projectRef) return `https://${args.projectRef}.supabase.co`;
  return '';
}

function resolveServiceRoleKey(args) {
  const fromArgs = String(args.serviceRoleKey || '').trim();
  if (fromArgs) return fromArgs;

  if (!args.projectRef) return '';
  if (!process.env.SUPABASE_ACCESS_TOKEN) return '';

  const output = execFileSync(
    'supabase',
    ['projects', 'api-keys', '--project-ref', args.projectRef, '--output', 'json'],
    { encoding: 'utf8' }
  );
  const rows = JSON.parse(output);
  const serviceRole = Array.isArray(rows)
    ? rows.find((row) => String(row?.name || '').trim() === 'service_role')
    : null;
  return String(serviceRole?.api_key || '').trim();
}

async function fetchRestJson(url, serviceRoleKey) {
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase REST query failed (${response.status}) for ${url}: ${body}`);
  }
  return JSON.parse(body);
}

function summarizeLifecycleCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const lifecycle = String(row?.lifecycle_status || 'unknown');
    counts.set(lifecycle, (counts.get(lifecycle) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([lifecycle_status, count]) => ({ lifecycle_status, count }))
    .sort((a, b) => a.lifecycle_status.localeCompare(b.lifecycle_status));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const checkedAt = new Date().toISOString();
  const supabaseUrl = resolveSupabaseUrl(args);
  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL. Set SUPABASE_URL or pass --supabase-url/--project-ref.');
  }

  const serviceRoleKey = resolveServiceRoleKey(args);
  if (!serviceRoleKey) {
    throw new Error(
      'Missing service role key. Set SUPABASE_SERVICE_ROLE_KEY or provide SUPABASE_ACCESS_TOKEN + --project-ref.'
    );
  }

  const restBase = `${supabaseUrl}/rest/v1`;
  const [lifecycleRows, latestResultsEvents] = await Promise.all([
    fetchRestJson(`${restBase}/Event?select=lifecycle_status&limit=1000`, serviceRoleKey),
    fetchRestJson(
      `${restBase}/Event?select=id,slug,name,lifecycle_status,updatedAt&lifecycle_status=eq.results&order=updatedAt.desc&limit=5`,
      serviceRoleKey
    ),
  ]);

  const lifecycleCounts = summarizeLifecycleCounts(lifecycleRows);
  const resultsEventCount = Array.isArray(latestResultsEvents) ? latestResultsEvents.length : 0;
  const payload = {
    checkedAt,
    projectRef: args.projectRef,
    supabaseUrl,
    lifecycleCounts,
    resultsEventCount,
    latestResultsEvents,
    extractionCadenceStatus: resultsEventCount > 0 ? 'ready' : 'pending_results_event',
  };

  const outputPath =
    args.out ||
    path.join(
      ROOT,
      'docs',
      'artifacts',
      `HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-${toStamp(checkedAt)}.json`
    );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(outputPath);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
