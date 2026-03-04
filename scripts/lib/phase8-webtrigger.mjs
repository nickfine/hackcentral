import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveRepoRoot } from './repo-root.mjs';

const ROOT = resolveRepoRoot(import.meta.url);
const FORGE_DIR = path.join(ROOT, 'forge-native');
const FUNCTION_KEY = 'phase5-migration-wt';

export function parseCommonArgs(argv, defaults = {}) {
  const args = {
    environment: defaults.environment || 'production',
    site: defaults.site || 'hackdaytemp.atlassian.net',
    product: defaults.product || 'Confluence',
    eventQuery: defaults.eventQuery || '',
    eventId: defaults.eventId || '',
    sourceEventId: defaults.sourceEventId || '',
    cursor: defaults.cursor || '',
    batchSize: defaults.batchSize || 20,
    dryRun: defaults.dryRun ?? true,
    outPrefix: defaults.outPrefix || 'HDC-P8',
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
    if (token === '--event-query') {
      args.eventQuery = argv[i + 1] || args.eventQuery;
      i += 1;
      continue;
    }
    if (token === '--event-id') {
      args.eventId = argv[i + 1] || args.eventId;
      i += 1;
      continue;
    }
    if (token === '--source-event-id') {
      args.sourceEventId = argv[i + 1] || args.sourceEventId;
      i += 1;
      continue;
    }
    if (token === '--cursor') {
      args.cursor = argv[i + 1] || args.cursor;
      i += 1;
      continue;
    }
    if (token === '--batch-size') {
      args.batchSize = Math.max(1, Number.parseInt(String(argv[i + 1] || args.batchSize), 10) || args.batchSize);
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

  return args;
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

export async function invokePhase8Action(args, payload) {
  const url = getOrCreateWebtriggerUrl(args.environment, args.site, args.product);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Webtrigger request failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function toStamp(iso) {
  return String(iso || new Date().toISOString())
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-');
}

function toSlug(value) {
  return String(value || 'all')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'all';
}

export async function writePhase8Artifacts({ args, report, reportName, markdown }) {
  const stamp = toStamp(report.generatedAtUtc || new Date().toISOString());
  const scopeSlug = toSlug(args.eventId || args.sourceEventId || args.eventQuery || 'all');
  const baseName = `${reportName}-${scopeSlug}-${stamp}`;
  const artifactDir = path.join(ROOT, 'docs', 'artifacts');
  await fs.mkdir(artifactDir, { recursive: true });

  const jsonPath = args.out
    ? path.resolve(args.out)
    : path.join(artifactDir, `${baseName}.json`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const mdPath = jsonPath.endsWith('.json')
    ? jsonPath.replace(/\.json$/i, '.md')
    : path.join(artifactDir, `${baseName}.md`);
  await fs.writeFile(mdPath, markdown, 'utf8');

  return { jsonPath, mdPath };
}
