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

function summarizeScheduleOutlook(rows, checkedAt) {
  const withResultsAnnounceAt = rows
    .filter((row) => row?.event_schedule?.resultsAnnounceAt)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      lifecycle_status: row.lifecycle_status,
      resultsAnnounceAt: row.event_schedule.resultsAnnounceAt,
      updatedAt: row.updatedAt,
    }));

  const upcoming = withResultsAnnounceAt
    .filter((row) => row.resultsAnnounceAt >= checkedAt)
    .sort((a, b) => a.resultsAnnounceAt.localeCompare(b.resultsAnnounceAt));

  const pastDue = withResultsAnnounceAt
    .filter((row) => row.resultsAnnounceAt < checkedAt)
    .sort((a, b) => b.resultsAnnounceAt.localeCompare(a.resultsAnnounceAt));

  return {
    resultsAnnounceAtPresentCount: withResultsAnnounceAt.length,
    resultsAnnounceAtMissingCount: rows.length - withResultsAnnounceAt.length,
    pastDueResultsAnnounceCount: pastDue.length,
    nextUpcomingResultsAnnounceAt: upcoming[0]?.resultsAnnounceAt ?? null,
    nextUpcomingEvent: upcoming[0] ?? null,
    samplePastDue: pastDue.slice(0, 5),
  };
}

function renderCadenceSample(payload, jsonRelPath) {
  const lifecycleLines = (payload.lifecycleCounts || [])
    .map((row) => `  - \`${row.lifecycle_status}\`: \`${row.count}\``)
    .join('\n');
  const scheduleOutlook = payload.scheduleOutlook || {};
  const nextEvent = scheduleOutlook.nextUpcomingEvent || {};
  const sample = payload.firstResultsEventSample;

  const lines = [
    '# HDC P3 Extraction Weekly Cadence Sample',
    '',
    `Timestamp (UTC): ${payload.checkedAt}`,
    `Project ref: \`${payload.projectRef}\``,
    `Decision: \`${payload.extractionCadenceStatus === 'ready' ? 'READY' : 'PENDING_RESULTS_EVENT'}\``,
    '',
    '## Lifecycle Snapshot',
    '',
    `- resultsEventCount: \`${payload.resultsEventCount}\``,
    '- Lifecycle counts:',
    lifecycleLines || '  - none',
    '',
    '## Schedule Outlook',
    '',
    `- nextUpcomingResultsAnnounceAt: \`${scheduleOutlook.nextUpcomingResultsAnnounceAt ?? 'n/a'}\``,
    `- nextUpcomingEvent: \`${nextEvent.name ?? 'n/a'}\``,
    `- nextUpcomingEventLifecycle: \`${nextEvent.lifecycle_status ?? 'n/a'}\``,
    `- pastDueResultsAnnounceCount: \`${scheduleOutlook.pastDueResultsAnnounceCount ?? 0}\``,
    '',
  ];

  if (sample) {
    lines.push('## First Results Event Sample');
    lines.push('');
    lines.push(`- eventId: \`${sample.eventId}\``);
    lines.push(`- eventName: \`${sample.eventName}\``);
    lines.push(`- submissionCount: \`${sample.submissionCount}\``);
    lines.push(`- showcaseDraftCount: \`${sample.showcaseDraftCount}\``);
    lines.push(`- promptedParticipantCount: \`${sample.promptedParticipantCount}\``);
    lines.push(`- importedDraftCount: \`${sample.importedDraftCount}\``);
    if (sample.error) {
      lines.push(`- sampleError: \`${sample.error}\``);
    }
    lines.push('');
  } else {
    lines.push('## First Results Event Sample');
    lines.push('');
    lines.push('- No live `results` event is currently available, so extraction sample execution remains pending.');
    lines.push('');
  }

  lines.push('## Evidence');
  lines.push('');
  lines.push(`- \`${jsonRelPath}\``);
  lines.push('');
  return lines.join('\n');
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
  const events = await fetchRestJson(
    `${restBase}/Event?select=id,name,slug,lifecycle_status,event_schedule,updatedAt&limit=1000`,
    serviceRoleKey
  );
  const lifecycleCounts = summarizeLifecycleCounts(events);
  const latestResultsEvents = events
    .filter((row) => row?.lifecycle_status === 'results')
    .sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      lifecycle_status: row.lifecycle_status,
      updatedAt: row.updatedAt,
    }));
  const resultsEventCount = Array.isArray(latestResultsEvents) ? latestResultsEvents.length : 0;
  const scheduleOutlook = summarizeScheduleOutlook(events, checkedAt);

  let firstResultsEventSample = null;
  if (resultsEventCount > 0) {
    const sampleEvent = latestResultsEvents[0];
    try {
      const [submissions, showcaseRows, promptRows, importRows] = await Promise.all([
        fetchRestJson(
          `${restBase}/Project?select=id&event_id=eq.${sampleEvent.id}&source_type=eq.hack_submission&limit=1000`,
          serviceRoleKey
        ),
        fetchRestJson(`${restBase}/ShowcaseHack?select=project_id&source_event_id=eq.${sampleEvent.id}&limit=1000`, serviceRoleKey),
        fetchRestJson(`${restBase}/HackdayExtractionPrompt?select=id&event_id=eq.${sampleEvent.id}&limit=1000`, serviceRoleKey),
        fetchRestJson(`${restBase}/HackdayExtractionImport?select=id&event_id=eq.${sampleEvent.id}&limit=1000`, serviceRoleKey),
      ]);
      firstResultsEventSample = {
        eventId: sampleEvent.id,
        eventName: sampleEvent.name,
        submissionCount: Array.isArray(submissions) ? submissions.length : 0,
        showcaseDraftCount: Array.isArray(showcaseRows) ? showcaseRows.length : 0,
        promptedParticipantCount: Array.isArray(promptRows) ? promptRows.length : 0,
        importedDraftCount: Array.isArray(importRows) ? importRows.length : 0,
      };
    } catch (error) {
      firstResultsEventSample = {
        eventId: sampleEvent.id,
        eventName: sampleEvent.name,
        submissionCount: null,
        showcaseDraftCount: null,
        promptedParticipantCount: null,
        importedDraftCount: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const payload = {
    checkedAt,
    projectRef: args.projectRef,
    supabaseUrl,
    lifecycleCounts,
    resultsEventCount,
    latestResultsEvents,
    extractionCadenceStatus: resultsEventCount > 0 ? 'ready' : 'pending_results_event',
    scheduleOutlook,
    firstResultsEventSample,
  };

  const stamp = toStamp(checkedAt);
  const outputPath =
    args.out ||
    path.join(
      ROOT,
      'docs',
      'artifacts',
      `HDC-P3-EXTRACT-WEEKLY-RESULTS-STATUS-${stamp}.json`
    );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const samplePath = path.join(ROOT, 'docs', 'artifacts', `HDC-P3-EXTRACT-WEEKLY-CADENCE-SAMPLE-${stamp}.md`);
  await fs.writeFile(
    samplePath,
    `${renderCadenceSample(payload, path.relative(ROOT, outputPath))}\n`,
    'utf8'
  );
  console.log(outputPath);
  console.log(samplePath);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
