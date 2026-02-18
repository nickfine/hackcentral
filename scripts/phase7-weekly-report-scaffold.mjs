#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/nickster/Downloads/HackCentral';
const ARTIFACTS_DIR = path.join(ROOT, 'docs', 'artifacts');
const DRY_RUN_PREFIX = 'HDC-V2-PHASE5-MIGRATION-DRY-RUN-hdc-auto-';
const OUTPUT_PREFIX = 'HDC-V2-PHASE6-WEEKLY-VERIFICATION-';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/phase7-weekly-report-scaffold.mjs',
    '  node scripts/phase7-weekly-report-scaffold.mjs --week-of "2026-02-23"',
    '  node scripts/phase7-weekly-report-scaffold.mjs --out "/absolute/path/to/output.md"',
  ].join('\n');
}

function toStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
}

function guessWeekOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

function findLatestDryRunArtifact() {
  const files = fs.readdirSync(ARTIFACTS_DIR);
  const matches = files
    .filter((name) => name.startsWith(DRY_RUN_PREFIX) && name.endsWith('.md'))
    .sort();
  if (matches.length === 0) return null;
  return path.join(ARTIFACTS_DIR, matches[matches.length - 1]);
}

function parseSummaryValue(markdown, label) {
  const pattern = new RegExp(`^- ${label}:\\s*(.+)$`, 'm');
  const match = markdown.match(pattern);
  return match ? match[1].trim() : 'UNKNOWN';
}

function buildArtifact(input) {
  const {
    generatedAtUtc,
    weekOf,
    dryRunPath,
    summary: { missingPageIds, missingParentPageIds, noPrimaryAdmin, noSyncState, totalSubmittedHacks },
  } = input;

  return `# HDC v2 Phase 6 Weekly Verification

## Metadata

- Week of: ${weekOf}
- Generated at (UTC): ${generatedAtUtc}
- Operator:
- Environment: production
- Canonical query: \`HDC Auto\`

## Run Log

1. Migration dry-run
- Command:
\`\`\`bash
npm -C /Users/nickster/Downloads/HackCentral run qa:phase5:migration-dry-run -- --environment production
\`\`\`
- Artifact path:
  - \`${dryRunPath}\`
- Pass/Fail: \`TBD\`

2. Performance harness
- Command:
\`\`\`bash
npm -C /Users/nickster/Downloads/HackCentral run test:perf:phase5
\`\`\`
- Result summary:
  - \`registry_lookup\` p95:
  - \`complete_and_sync\` p95:
- Pass/Fail: \`TBD\`

3. Production telemetry capture
- Command:
\`\`\`bash
npm -C /Users/nickster/Downloads/HackCentral run qa:phase6:telemetry-check
\`\`\`
- \`registry_lookup\` seen: yes/no
- \`sync_execution\` seen: yes/no
- Pass/Fail: \`TBD\`

## Integrity Checklist

- Missing page IDs: \`${missingPageIds}\`
- Missing parent page IDs: \`${missingParentPageIds}\`
- No primary admin: \`${noPrimaryAdmin}\`
- No sync state: \`${noSyncState}\`
- Total submitted hacks: \`${totalSubmittedHacks}\`

## Budget Checklist

- \`registry_lookup\` p95 \`< 120ms\`
- \`complete_and_sync\` p95 \`< 220ms\`

## Overall Decision

- Status: \`PASS\` / \`FAIL\` / \`CONDITIONAL\`
- Release posture impact:
- Required follow-up actions:

## Incident Notes (if any)

- Severity:
- Symptoms:
- Mitigation taken:
- Next checkpoint owner:
`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help === 'true') {
    console.log(usage());
    process.exit(0);
  }

  const now = new Date();
  const generatedAtUtc = now.toISOString();
  const weekOf = args['week-of'] || guessWeekOf(now);

  const latestDryRunPath = findLatestDryRunArtifact();
  if (!latestDryRunPath) {
    throw new Error(`No dry-run artifacts found in ${ARTIFACTS_DIR}.`);
  }

  const dryRunContent = fs.readFileSync(latestDryRunPath, 'utf8');
  const summary = {
    missingPageIds: parseSummaryValue(dryRunContent, 'Missing page IDs'),
    missingParentPageIds: parseSummaryValue(dryRunContent, 'Missing parent page IDs'),
    noPrimaryAdmin: parseSummaryValue(dryRunContent, 'No primary admin'),
    noSyncState: parseSummaryValue(dryRunContent, 'No sync state'),
    totalSubmittedHacks: parseSummaryValue(dryRunContent, 'Total submitted hacks'),
  };

  const defaultOut = path.join(ARTIFACTS_DIR, `${OUTPUT_PREFIX}${toStamp(now)}-AUTO.md`);
  const outputPath = args.out ? path.resolve(args.out) : defaultOut;
  const body = buildArtifact({
    generatedAtUtc,
    weekOf,
    dryRunPath: latestDryRunPath,
    summary,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, body, 'utf8');

  console.log(`Generated: ${outputPath}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}
