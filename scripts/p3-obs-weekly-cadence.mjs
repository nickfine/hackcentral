#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRootCommand, resolveRepoRoot } from './lib/repo-root.mjs';

const ROOT = resolveRepoRoot(import.meta.url);
const FORGE_DIR = path.join(ROOT, 'forge-native');
const ARTIFACTS_DIR = path.join(ROOT, 'docs', 'artifacts');
export const REQUIRED_METRICS = ['feed_signal_health', 'roi_signal_health', 'roi_export'];

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

export function parseTelemetryEvents(lines) {
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

export function summarizeEvents(events, lineCount) {
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
  const missingRequiredMetrics = REQUIRED_METRICS.filter((metric) => !metricCounts[metric]);
  const hasUnhealthyEvents = unhealthy > 0;
  const hasAlerts = Object.keys(alertCounts).length > 0;
  const hasWarnings = Object.keys(warningCounts).length > 0;

  let decision = 'GO';
  const decisionReasons = [];
  if (events.length === 0) {
    decision = 'FAIL';
    decisionReasons.push('No telemetry events were parsed in the sample window.');
  }
  if (missingRequiredMetrics.length > 0) {
    decision = 'FAIL';
    decisionReasons.push(`Missing required metrics: ${missingRequiredMetrics.join(', ')}`);
  }
  if (decision !== 'FAIL' && (hasUnhealthyEvents || hasAlerts || hasWarnings)) {
    decision = 'WARN';
  }
  if (hasUnhealthyEvents) {
    decisionReasons.push(`Unhealthy events detected: ${unhealthy}`);
  }
  if (hasAlerts) {
    decisionReasons.push(`Alert keys detected: ${Object.keys(alertCounts).join(', ')}`);
  }
  if (hasWarnings) {
    decisionReasons.push(`Warning keys detected: ${Object.keys(warningCounts).join(', ')}`);
  }
  if (decisionReasons.length === 0) {
    decisionReasons.push('Required metrics present with no unhealthy events, alerts, or warnings.');
  }

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
    requiredMetrics: REQUIRED_METRICS,
    missingRequiredMetrics,
    decision,
    decisionReasons,
    notes: [
      'Decision policy: FAIL if parsed event count is zero or any required metric is missing.',
      'Decision policy: WARN if required metrics exist but unhealthy events/alerts/warnings are present.',
      'Decision policy: GO only when required metrics exist and no health/alert/warning issues are present.',
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
  const requiredMetricLines = (summary.requiredMetrics || [])
    .map((metric) => `  - \`${metric}\``)
    .join('\n');
  const missingRequiredMetricLines =
    (summary.missingRequiredMetrics || []).length === 0
      ? '  - none'
      : (summary.missingRequiredMetrics || []).map((metric) => `  - \`${metric}\``).join('\n');
  const decisionReasonLines = (summary.decisionReasons || [])
    .map((reason) => `  - ${reason}`)
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
    repoRootCommand(),
    'cd "$REPO_ROOT"',
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
    '## Decision Inputs',
    '',
    '- Required metrics:',
    requiredMetricLines || '  - none',
    '- Missing required metrics:',
    missingRequiredMetricLines,
    '- Decision reasons:',
    decisionReasonLines || '  - none',
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

function isDirectExecution() {
  const scriptPath = fileURLToPath(import.meta.url);
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return invokedPath === scriptPath;
}

if (isDirectExecution()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
