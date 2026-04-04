#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveRepoRoot } from './lib/repo-root.mjs';

const ROOT = resolveRepoRoot(import.meta.url);
const FORGE_DIR = path.join(ROOT, 'forge-native');
const FUNCTION_KEY = 'event-backup-ops-wt';
const TAG_HACKDAY_APP_ID = '22696465-0692-48af-9741-323e1cfc2631';
const TAG_HACKDAY_SITE = 'tag-hackday.atlassian.net';
const LEGACY_DEFAULT_SITE = 'hackdaytemp.atlassian.net';

function parseArgs(argv) {
  const args = {
    environment: 'production',
    site: null,
    product: 'Confluence',
    dryRun: false,
    maxEvents: null,
    eventIds: [],
    out: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--environment') {
      args.environment = argv[i + 1] || args.environment;
      i += 1;
      continue;
    }
    if (token === '--site') {
      args.site = argv[i + 1] || args.site;
      i += 1;
      continue;
    }
    if (token === '--product') {
      args.product = argv[i + 1] || args.product;
      i += 1;
      continue;
    }
    if (token === '--max-events') {
      const parsed = Number.parseInt(String(argv[i + 1] || ''), 10);
      args.maxEvents = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      i += 1;
      continue;
    }
    if (token === '--event-id') {
      const value = String(argv[i + 1] || '').trim();
      if (value) args.eventIds.push(value);
      i += 1;
      continue;
    }
    if (token === '--event-ids') {
      const values = String(argv[i + 1] || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      args.eventIds.push(...values);
      i += 1;
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token === '--apply') {
      args.dryRun = false;
      continue;
    }
    if (token === '--out') {
      args.out = argv[i + 1] || null;
      i += 1;
      continue;
    }
  }

  args.eventIds = Array.from(new Set(args.eventIds));
  return args;
}

async function inferDefaultSite() {
  const tenantReadmePath = path.join(ROOT, 'TENANT-README.md');
  try {
    const tenantReadme = await fs.readFile(tenantReadmePath, 'utf8');
    if (tenantReadme.includes(TAG_HACKDAY_SITE)) {
      return TAG_HACKDAY_SITE;
    }
  } catch {}

  const manifestPath = path.join(FORGE_DIR, 'manifest.yml');
  try {
    const manifest = await fs.readFile(manifestPath, 'utf8');
    if (manifest.includes(TAG_HACKDAY_APP_ID)) {
      return TAG_HACKDAY_SITE;
    }
  } catch {}

  return LEGACY_DEFAULT_SITE;
}

function runForgeCommand(args) {
  return execFileSync('forge', args, {
    cwd: FORGE_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseUrl(text) {
  const match = text.match(/https:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function getOrCreateWebtriggerUrl(environment, site, product) {
  const listOutput = runForgeCommand([
    'webtrigger',
    'list',
    '-e',
    environment,
    '-s',
    site,
    '-p',
    product,
    '-f',
    FUNCTION_KEY,
  ]);
  const listedUrl = parseUrl(listOutput);
  if (listedUrl) return listedUrl;

  const createOutput = runForgeCommand([
    'webtrigger',
    'create',
    '-e',
    environment,
    '-s',
    site,
    '-p',
    product,
    '-f',
    FUNCTION_KEY,
  ]);
  const createdUrl = parseUrl(createOutput);
  if (!createdUrl) {
    throw new Error(`Unable to resolve webtrigger URL for ${FUNCTION_KEY} (${environment}).`);
  }
  return createdUrl;
}

function toStamp(iso) {
  return String(iso || new Date().toISOString())
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-');
}

function toSlug(value) {
  return String(value || 'all')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'all';
}

function renderMarkdown(report, args) {
  const lines = [];
  lines.push('# HDC Predeploy Event Backup Snapshot Sweep');
  lines.push('');
  lines.push(`Generated at (UTC): ${report.generatedAtUtc}`);
  lines.push(`Environment: ${args.environment}`);
  lines.push(`Dry run: ${report.dryRun}`);
  lines.push(`Requested event ids: ${(report.requestedEventIds || []).join(', ') || 'all active events'}`);
  lines.push(`Candidate count: ${report.candidateCount}`);
  lines.push(`Processed count: ${report.processedCount}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Created: ${report.createdCount}`);
  lines.push(`- Planned: ${report.plannedCount}`);
  lines.push(`- Failed: ${report.failedCount}`);
  lines.push(`- Skipped: ${report.skippedCount}`);
  lines.push(`- Duration (ms): ${report.durationMs}`);
  lines.push('');
  lines.push('## Results');
  for (const row of report.results || []) {
    lines.push(`- eventId=${row.eventId} status=${row.status} name=${row.eventName || row.eventId}`);
    if (row.lifecycleStatus) lines.push(`  - lifecycle: ${row.lifecycleStatus}`);
    if (row.runtimeType) lines.push(`  - runtimeType: ${row.runtimeType}`);
    if (row.snapshotId) lines.push(`  - snapshotId: ${row.snapshotId}`);
    if (row.createdAt) lines.push(`  - createdAt: ${row.createdAt}`);
    if (typeof row.warningCount === 'number') lines.push(`  - warningCount: ${row.warningCount}`);
    if (row.error) lines.push(`  - error: ${row.error}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function writeArtifacts({ args, report }) {
  const stamp = toStamp(report.generatedAtUtc || new Date().toISOString());
  const scopeSlug = toSlug(args.eventIds.length > 0 ? args.eventIds.join('-') : 'active-events');
  const baseName = `HDC-P10-PREDEPLOY-BACKUP-${scopeSlug}-${stamp}`;
  const artifactDir = path.join(ROOT, 'docs', 'artifacts');
  await fs.mkdir(artifactDir, { recursive: true });

  const jsonPath = args.out
    ? path.resolve(args.out)
    : path.join(artifactDir, `${baseName}.json`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const mdPath = jsonPath.endsWith('.json')
    ? jsonPath.replace(/\.json$/i, '.md')
    : path.join(artifactDir, `${baseName}.md`);
  await fs.writeFile(mdPath, renderMarkdown(report, args), 'utf8');

  return { jsonPath, mdPath };
}

async function invokeBackupOps(args, payload) {
  const url = getOrCreateWebtriggerUrl(args.environment, args.site, args.product);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Webtrigger request failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  args.site = args.site || (await inferDefaultSite());
  const report = await invokeBackupOps(args, {
    action: 'predeploy_snapshot',
    dryRun: args.dryRun,
    ...(args.maxEvents ? { maxEvents: args.maxEvents } : {}),
    eventIds: args.eventIds,
  });

  const files = await writeArtifacts({ args, report });
  console.log(files.jsonPath);
  console.log(files.mdPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
