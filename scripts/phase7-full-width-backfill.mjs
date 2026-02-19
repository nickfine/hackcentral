#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/nickster/Downloads/HackCentral';
const FORGE_DIR = path.join(ROOT, 'forge-native');

function parseArgs(argv) {
  const args = {
    environment: 'production',
    eventQuery: 'HDC',
    site: 'hackdaytemp.atlassian.net',
    product: 'Confluence',
    out: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--environment') {
      args.environment = argv[i + 1] || args.environment;
      i += 1;
      continue;
    }
    if (token === '--event-query') {
      args.eventQuery = argv[i + 1] || args.eventQuery;
      i += 1;
      continue;
    }
    if (token === '--out') {
      args.out = argv[i + 1] || null;
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
  const functionKey = 'phase5-migration-wt';
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
    functionKey,
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
    functionKey,
  ]);
  const createdUrl = parseUrl(createOutput);
  if (!createdUrl) {
    throw new Error(`Unable to resolve webtrigger URL for ${functionKey} (${environment}).`);
  }
  return createdUrl;
}

function toStamp(iso) {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
}

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'query';
}

function renderMarkdown(report, environment) {
  const lines = [];
  lines.push('# HDC v2 Full-Width Backfill Report');
  lines.push('');
  lines.push(`Generated at (UTC): ${report.generatedAtUtc}`);
  lines.push(`Environment: ${environment}`);
  lines.push(`Event query: ${report.eventNameQuery}`);
  lines.push(`Matched events: ${report.eventCount}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Processed events: ${report.processedCount}`);
  lines.push(`- Updated: ${report.successCount}`);
  lines.push(`- Failed: ${report.failureCount}`);
  lines.push(`- Skipped (missing page id): ${report.skippedMissingPageIdCount}`);
  lines.push('');
  lines.push('## Event Results');
  if (!Array.isArray(report.events) || report.events.length === 0) {
    lines.push('- No events matched the query.');
  } else {
    for (const event of report.events) {
      lines.push(`- ${event.eventName} (${event.eventId})`);
      lines.push(`  - pageId: ${event.confluencePageId ?? 'null'}`);
      lines.push(`  - status: ${event.status}`);
      if (event.error) {
        lines.push(`  - error: ${event.error}`);
      }
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = getOrCreateWebtriggerUrl(args.environment, args.site, args.product);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'backfill_full_width',
      eventNameQuery: args.eventQuery,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Backfill request failed (${response.status}): ${body}`);
  }

  const report = JSON.parse(body);
  const stamp = toStamp(report.generatedAtUtc || new Date().toISOString());
  const querySlug = toSlug(args.eventQuery);
  const outputPath =
    args.out ||
    path.join(ROOT, 'docs', 'artifacts', `HDC-V2-FULL-WIDTH-BACKFILL-${querySlug}-${stamp}.md`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, renderMarkdown(report, args.environment), 'utf8');
  console.log(outputPath);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
