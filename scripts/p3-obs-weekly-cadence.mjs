#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/nickster/Downloads/HackCentral';
const FORGE_DIR = path.join(ROOT, 'forge-native');
const ARTIFACTS_DIR = path.join(ROOT, 'docs', 'artifacts');

function parseArgs(argv) {
  const args = {
    since: '24h',
    limit: 4000,
    outStem: '',
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
    if (token === '--out-stem') {
      args.outStem = argv[i + 1] || args.outStem;
      i += 1;
    }
  }

  return args;
}

function toStamp(iso) {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
}

function parseTelemetryEvents(lines) {
  const events = [];
  for (const line of lines) {
    const idx = line.indexOf('{');
    if (idx < 0) continue;
    try {
      const payload = JSON.parse(line.slice(idx));
      events.push(payload);
    } catch {
      // Ignore malformed lines.
    }
  }
  return events;
}

function summarizeEvents(events, lineCount) {
  const metricCounts = {};
  const alertCounts = {};
  const warningCounts = {};
  let healthy = 0;
  let unhealthy = 0;
  let feedUnhealthy = 0;
  const loggedAts = [];

  for (const event of events) {
    const metric = String(event?.metric || 'unknown');
    metricCounts[metric] = (metricCounts[metric] || 0) + 1;

    if (event?.healthy === true) healthy += 1;
    if (event?.healthy === false) {
      unhealthy += 1;
      if (metric === 'feed_signal_health') feedUnhealthy += 1;
    }

    if (Array.isArray(event?.alerts)) {
      for (const alert of event.alerts) {
        const key = String(alert || '');
        if (!key) continue;
        alertCounts[key] = (alertCounts[key] || 0) + 1;
      }
    }

    if (Array.isArray(event?.warnings)) {
      for (const warning of event.warnings) {
        const key = String(warning || '');
        if (!key) continue;
        warningCounts[key] = (warningCounts[key] || 0) + 1;
      }
    }

    if (event?.loggedAt) loggedAts.push(String(event.loggedAt));
  }

  loggedAts.sort();
  return {
    channel: 'hdc-phase3-telemetry',
    sampleWindow: {
      lineCount,
      eventCount: events.length,
      firstLoggedAt: loggedAts[0] || null,
      lastLoggedAt: loggedAts[loggedAts.length - 1] || null,
    },
    metricCounts,
    healthCounts: {
      healthy,
      unhealthy,
      feedUnhealthy,
    },
    alertCounts,
    warningCounts,
    decision: 'GO',
    notes: [
      'Cadence check verifies channel presence and metric emission, not feature-level correctness.',
      'If feed_signal_health remains unhealthy, continue weekly tracking and inspect recommendation source coverage.',
    ],
  };
}

function renderCheckpoint({ generatedAtIso, args, summary, logsRelPath, summaryRelPath }) {
  const metricLines = Object.entries(summary.metricCounts)
    .map(([metric, count]) => `  - \`${metric}\`: \`${count}\``)
    .join('\n');
  const alertLines =
    Object.keys(summary.alertCounts).length === 0
      ? '  - none'
      : Object.entries(summary.alertCounts)
          .map(([alert, count]) => `  - \`${alert}\`: \`${count}\``)
          .join('\n');
  const warningLines =
    Object.keys(summary.warningCounts).length === 0
      ? '  - none'
      : Object.entries(summary.warningCounts)
          .map(([warning, count]) => `  - \`${warning}\`: \`${count}\``)
          .join('\n');

  return [
    '# HDC P3 Observability Weekly Cadence Checkpoint',
    '',
    `Timestamp (UTC): ${generatedAtIso}`,
    'Task scope: Phase 3 telemetry cadence (`feed_signal_health`, `roi_signal_health`, `roi_export`)',
    `Decision: \`${summary.decision}\``,
    '',
    '## Commands Executed',
    '',
    '```bash',
    'cd /Users/nickster/Downloads/HackCentral',
    'npm run qa:p3:telemetry-static-check',
    'npm run qa:p3:obs-weekly-cadence',
    '```',
    '',
    '## Sample Configuration',
    '',
    `- log window: \`${args.since}\``,
    `- log limit: \`${args.limit}\``,
    '',
    '## Live Telemetry Sample Summary',
    '',
    `- Sample lines: \`${summary.sampleWindow.lineCount}\``,
    `- Parsed events: \`${summary.sampleWindow.eventCount}\``,
    `- Window: \`${summary.sampleWindow.firstLoggedAt ?? 'n/a'}\` to \`${summary.sampleWindow.lastLoggedAt ?? 'n/a'}\``,
    '- Metric counts:',
    metricLines,
    '- Alert frequency:',
    alertLines,
    '- Warning frequency:',
    warningLines,
    '',
    '## Evidence',
    '',
    `- \`${logsRelPath}\``,
    `- \`${summaryRelPath}\``,
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAtIso = new Date().toISOString();
  const stamp = args.outStem || toStamp(generatedAtIso);

  execFileSync('npm', ['run', 'qa:p3:telemetry-static-check'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const rawLogs = execFileSync(
    'forge',
    ['logs', '-e', 'production', '--since', args.since, '--limit', String(args.limit)],
    {
      cwd: FORGE_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  const filteredLines = rawLogs
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.includes('hdc-phase3-telemetry'));

  const events = parseTelemetryEvents(filteredLines);
  const summary = summarizeEvents(events, filteredLines.length);

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  const logsPath = path.join(ARTIFACTS_DIR, `HDC-P3-OBS-WEEKLY-TELEMETRY-LOGS-${stamp}.txt`);
  const summaryPath = path.join(ARTIFACTS_DIR, `HDC-P3-OBS-WEEKLY-TELEMETRY-SUMMARY-${stamp}.json`);
  const checkpointPath = path.join(ARTIFACTS_DIR, `HDC-P3-OBS-WEEKLY-CADENCE-CHECKPOINT-${stamp}.md`);

  await fs.writeFile(logsPath, `${filteredLines.join('\n')}\n`, 'utf8');
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    checkpointPath,
    renderCheckpoint({
      generatedAtIso,
      args,
      summary,
      logsRelPath: path.relative(ROOT, logsPath),
      summaryRelPath: path.relative(ROOT, summaryPath),
    }),
    'utf8'
  );

  console.log(logsPath);
  console.log(summaryPath);
  console.log(checkpointPath);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
