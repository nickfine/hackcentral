#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/nickster/Downloads/HackCentral';
const ARTIFACTS_DIR = path.join(ROOT, 'docs', 'artifacts');
const DEFAULT_PROJECT_REF = 'ssafugtobsqxmqtphwch';

function parseArgs(argv) {
  const args = {
    since: '24h',
    limit: 4000,
    projectRef: DEFAULT_PROJECT_REF,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--since') {
      args.since = argv[i + 1] || args.since;
      i += 1;
      continue;
    }
    if (token === '--limit') {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        args.limit = Math.floor(value);
      }
      i += 1;
      continue;
    }
    if (token === '--project-ref') {
      args.projectRef = argv[i + 1] || args.projectRef;
      i += 1;
    }
  }

  return args;
}

function toStamp(iso) {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
}

function renderCheckpoint({ generatedAtIso, args, obsSummary, extractStatus, obsLogs, obsSummaryPath, obsCheckpoint, extractPath }) {
  const metricLines = Object.entries(obsSummary.metricCounts || {})
    .map(([metric, count]) => `  - \`${metric}\`: \`${count}\``)
    .join('\n');
  const alertLines =
    Object.keys(obsSummary.alertCounts || {}).length === 0
      ? '  - none'
      : Object.entries(obsSummary.alertCounts)
          .map(([key, count]) => `  - \`${key}\`: \`${count}\``)
          .join('\n');
  const warningLines =
    Object.keys(obsSummary.warningCounts || {}).length === 0
      ? '  - none'
      : Object.entries(obsSummary.warningCounts)
          .map(([key, count]) => `  - \`${key}\`: \`${count}\``)
          .join('\n');
  const lifecycleLines = (extractStatus.lifecycleCounts || [])
    .map((row) => `  - \`${row.lifecycle_status}\`: \`${row.count}\``)
    .join('\n');

  return [
    '# HDC P3 Weekly Cadence Checkpoint',
    '',
    `Timestamp (UTC): ${generatedAtIso}`,
    `Decision: \`${obsSummary.decision || 'GO'}\``,
    '',
    '## Commands Executed',
    '',
    '```bash',
    'cd /Users/nickster/Downloads/HackCentral',
    `npm run qa:p3:weekly-cadence -- --since ${args.since} --limit ${args.limit} --project-ref ${args.projectRef}`,
    '```',
    '',
    '## Observability Summary',
    '',
    `- Parsed events: \`${obsSummary.sampleWindow?.eventCount ?? 0}\``,
    `- Window: \`${obsSummary.sampleWindow?.firstLoggedAt ?? 'n/a'}\` to \`${obsSummary.sampleWindow?.lastLoggedAt ?? 'n/a'}\``,
    '- Metric counts:',
    metricLines || '  - none',
    '- Alert frequency:',
    alertLines,
    '- Warning frequency:',
    warningLines,
    '',
    '## Extraction Readiness Summary',
    '',
    `- extractionCadenceStatus: \`${extractStatus.extractionCadenceStatus}\``,
    `- resultsEventCount: \`${extractStatus.resultsEventCount}\``,
    '- Lifecycle counts:',
    lifecycleLines || '  - none',
    '',
    '## Evidence',
    '',
    `- \`${path.relative(ROOT, obsLogs)}\``,
    `- \`${path.relative(ROOT, obsSummaryPath)}\``,
    `- \`${path.relative(ROOT, obsCheckpoint)}\``,
    `- \`${path.relative(ROOT, extractPath)}\``,
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAtIso = new Date().toISOString();
  const stamp = toStamp(generatedAtIso);

  const obsLogsPath = path.join(ARTIFACTS_DIR, `HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-${stamp}.txt`);
  const obsSummaryPath = path.join(ARTIFACTS_DIR, `HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-${stamp}.json`);
  const obsCheckpointPath = path.join(ARTIFACTS_DIR, `HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-${stamp}.md`);
  const extractStatusPath = path.join(ARTIFACTS_DIR, `HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-${stamp}.json`);
  const weeklyCheckpointPath = path.join(ARTIFACTS_DIR, `HDC-P3-WEEKLY-CADENCE-CHECKPOINT-${stamp}.md`);

  execFileSync(
    'node',
    ['scripts/p3-obs-weekly-cadence.mjs', '--since', args.since, '--limit', String(args.limit), '--out-stem', stamp],
    { cwd: ROOT, stdio: 'inherit' }
  );

  execFileSync(
    'node',
    ['scripts/p3-extract-cadence-check.mjs', '--project-ref', args.projectRef, '--out', extractStatusPath],
    { cwd: ROOT, stdio: 'inherit' }
  );

  const obsSummary = JSON.parse(await fs.readFile(obsSummaryPath, 'utf8'));
  const extractStatus = JSON.parse(await fs.readFile(extractStatusPath, 'utf8'));

  const weeklyCheckpoint = renderCheckpoint({
    generatedAtIso,
    args,
    obsSummary,
    extractStatus,
    obsLogs: obsLogsPath,
    obsSummaryPath,
    obsCheckpoint: obsCheckpointPath,
    extractPath: extractStatusPath,
  });
  await fs.writeFile(weeklyCheckpointPath, `${weeklyCheckpoint}\n`, 'utf8');

  console.log(obsLogsPath);
  console.log(obsSummaryPath);
  console.log(obsCheckpointPath);
  console.log(extractStatusPath);
  console.log(weeklyCheckpointPath);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
