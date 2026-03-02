#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/nickster/Downloads/HackCentral';
const ARTIFACTS_DIR = path.join(ROOT, 'docs', 'artifacts');
const DEFAULT_PROJECT_REF = 'ssafugtobsqxmqtphwch';
const DEFAULT_SITE_URL = 'https://hackdaytemp.atlassian.net';
const DEFAULT_TIMEZONE = 'Europe/London';

function parseArgs(argv) {
  const args = {
    projectRef: DEFAULT_PROJECT_REF,
    supabaseUrl: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    limit: 50,
    live: false,
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
    if (token === '--limit') {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        args.limit = Math.floor(value);
      }
      i += 1;
      continue;
    }
    if (token === '--live') {
      args.live = true;
    }
  }

  return args;
}

function toStamp(iso) {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
}

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
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

  if (!args.projectRef || !process.env.SUPABASE_ACCESS_TOKEN) return '';
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

function chooseOperatorAccountId(users) {
  const rows = Array.isArray(users) ? users : [];
  const scored = rows
    .filter((row) => row?.atlassian_account_id || row?.account_id)
    .map((row) => {
      const role = String(row?.role || '').toUpperCase();
      const tags = Array.isArray(row?.capability_tags) ? row.capability_tags.map((tag) => String(tag || '').toLowerCase()) : [];
      let score = 0;
      if (role === 'ADMIN') score += 100;
      if (tags.includes('platform_admin')) score += 80;
      if (tags.includes('hackday_admin')) score += 40;
      if (tags.includes('problem_exchange_moderator')) score += 10;
      const accountId = String(row?.atlassian_account_id || row?.account_id || '').trim();
      return { accountId, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.accountId || null;
}

function runExtractionSampleViaTsx({ eventId, operatorAccountId, limit, live, supabaseUrl, serviceRoleKey }) {
  const snippet = `
import { getHackdayExtractionCandidates, triggerPostHackdayExtractionPrompt, bulkImportHackdaySubmissions } from './forge-native/src/backend/hackcentral.ts';

const main = async () => {
  const viewer = {
    accountId: ${JSON.stringify(operatorAccountId)},
    siteUrl: ${JSON.stringify(DEFAULT_SITE_URL)},
    timezone: ${JSON.stringify(DEFAULT_TIMEZONE)},
  };

  const eventId = ${JSON.stringify(eventId)};
  const limit = ${JSON.stringify(limit)};

  const result = {
    eventId,
    operatorAccountId: viewer.accountId,
    mode: ${JSON.stringify(live ? 'live' : 'dry_run_only')},
  };

  result.candidates = await getHackdayExtractionCandidates(viewer, { eventId, limit });
  result.promptDryRun = await triggerPostHackdayExtractionPrompt(viewer, {
    eventId,
    dryRun: true,
    notifyParticipants: true,
  });
  result.importDryRun = await bulkImportHackdaySubmissions(viewer, {
    eventId,
    dryRun: true,
    notifyParticipants: true,
    limit,
    overwriteExistingDrafts: false,
  });

  if (${live ? 'true' : 'false'}) {
    result.promptLive1 = await triggerPostHackdayExtractionPrompt(viewer, {
      eventId,
      dryRun: false,
      notifyParticipants: true,
    });
    result.promptLive2 = await triggerPostHackdayExtractionPrompt(viewer, {
      eventId,
      dryRun: false,
      notifyParticipants: true,
    });

    result.importLive1 = await bulkImportHackdaySubmissions(viewer, {
      eventId,
      dryRun: false,
      notifyParticipants: true,
      limit,
      overwriteExistingDrafts: false,
    });
    result.importLive2 = await bulkImportHackdaySubmissions(viewer, {
      eventId,
      dryRun: false,
      notifyParticipants: true,
      limit,
      overwriteExistingDrafts: false,
    });
  }

  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
`.trim();

  const output = execFileSync('npx', ['-y', 'tsx', '-e', snippet], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      SUPABASE_SCHEMA: process.env.SUPABASE_SCHEMA || 'public',
      FORGE_DATA_BACKEND: 'supabase',
    },
  });

  return JSON.parse(output);
}

function renderMarkdown(payload, jsonRelPath) {
  const lines = [];
  lines.push('# HDC P3 Extraction First Results Sample');
  lines.push('');
  lines.push(`Timestamp (UTC): ${payload.checkedAt}`);
  lines.push(`Decision: \`${payload.status.toUpperCase()}\``);
  lines.push(`Execution mode: \`${payload.mode}\``);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(`- projectRef: \`${payload.projectRef}\``);
  lines.push(`- resultsEventCount: \`${payload.resultsEventCount}\``);
  lines.push(`- selectedEventId: \`${payload.eventId || 'n/a'}\``);
  lines.push(`- selectedEventName: \`${payload.eventName || 'n/a'}\``);
  lines.push(`- operatorAccountId: \`${payload.operatorAccountId || 'n/a'}\``);
  lines.push(`- nextUpcomingResultsAnnounceAt: \`${payload.nextUpcomingResultsAnnounceAt || 'n/a'}\``);
  lines.push('');
  lines.push('## Outcome');
  lines.push('');
  lines.push(`- message: ${payload.message}`);
  if (payload.sampleSummary) {
    lines.push(`- candidateCount: \`${payload.sampleSummary.candidateCount}\``);
    lines.push(`- promptDryRunStatus: \`${payload.sampleSummary.promptDryRunStatus}\``);
    lines.push(`- importDryRunStatus: \`${payload.sampleSummary.importDryRunStatus}\``);
    if (payload.sampleSummary.promptLive1Status) {
      lines.push(`- promptLive1Status: \`${payload.sampleSummary.promptLive1Status}\``);
      lines.push(`- promptLive2Status: \`${payload.sampleSummary.promptLive2Status}\``);
      lines.push(`- importLive1Status: \`${payload.sampleSummary.importLive1Status}\``);
      lines.push(`- importLive2Status: \`${payload.sampleSummary.importLive2Status}\``);
    }
  }
  lines.push('');
  lines.push('## Evidence');
  lines.push('');
  lines.push(`- \`${jsonRelPath}\``);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const checkedAt = new Date().toISOString();
  const stamp = toStamp(checkedAt);
  const supabaseUrl = resolveSupabaseUrl(args);
  if (!supabaseUrl) throw new Error('Missing Supabase URL.');
  const serviceRoleKey = resolveServiceRoleKey(args);
  if (!serviceRoleKey) throw new Error('Missing service role key.');

  const restBase = `${supabaseUrl}/rest/v1`;
  const events = await fetchRestJson(
    `${restBase}/Event?select=id,name,slug,lifecycle_status,event_schedule,updatedAt&limit=1000`,
    serviceRoleKey
  );
  const resultsEvents = events
    .filter((row) => row?.lifecycle_status === 'results')
    .sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')));
  const resultsEventCount = resultsEvents.length;

  const scheduleRows = events
    .filter((row) => row?.event_schedule?.resultsAnnounceAt)
    .map((row) => ({
      id: row.id,
      name: row.name,
      lifecycle_status: row.lifecycle_status,
      resultsAnnounceAt: row.event_schedule.resultsAnnounceAt,
      updatedAt: row.updatedAt,
    }))
    .sort((a, b) => String(a.resultsAnnounceAt).localeCompare(String(b.resultsAnnounceAt)));
  const nextUpcoming = scheduleRows.find((row) => row.resultsAnnounceAt >= checkedAt) || null;

  const basePayload = {
    checkedAt,
    projectRef: args.projectRef,
    mode: args.live ? 'live' : 'dry_run_only',
    resultsEventCount,
    nextUpcomingResultsAnnounceAt: nextUpcoming?.resultsAnnounceAt || null,
  };

  let payload;
  if (resultsEventCount === 0) {
    payload = {
      ...basePayload,
      status: 'pending_results_event',
      eventId: null,
      eventName: null,
      operatorAccountId: null,
      message: 'No live results event currently available. Extraction sample execution skipped.',
      sampleSummary: null,
      sampleData: null,
    };
  } else {
    const event = resultsEvents[0];
    const users = await fetchRestJson(
      `${restBase}/User?select=atlassian_account_id,role,capability_tags&atlassian_account_id=not.is.null&limit=500`,
      serviceRoleKey
    );
    const operatorAccountId = chooseOperatorAccountId(users);
    if (!operatorAccountId) {
      throw new Error('No eligible operator account_id found for extraction sample execution.');
    }
    const sampleData = runExtractionSampleViaTsx({
      eventId: event.id,
      operatorAccountId,
      limit: args.limit,
      live: args.live,
      supabaseUrl,
      serviceRoleKey,
    });
    payload = {
      ...basePayload,
      status: 'ready',
      eventId: event.id,
      eventName: event.name,
      operatorAccountId,
      message: args.live
        ? 'Results event available. Dry-run and live extraction sample executed.'
        : 'Results event available. Dry-run extraction sample executed.',
      sampleSummary: {
        candidateCount: sampleData?.candidates?.candidates?.length ?? 0,
        promptDryRunStatus: sampleData?.promptDryRun?.status ?? null,
        importDryRunStatus: sampleData?.importDryRun?.status ?? null,
        promptLive1Status: sampleData?.promptLive1?.status ?? null,
        promptLive2Status: sampleData?.promptLive2?.status ?? null,
        importLive1Status: sampleData?.importLive1?.status ?? null,
        importLive2Status: sampleData?.importLive2?.status ?? null,
      },
      sampleData,
    };
  }

  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  const jsonPath = path.join(ARTIFACTS_DIR, `HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-${stamp}.json`);
  const mdPath = path.join(ARTIFACTS_DIR, `HDC-P3-EXTRACT-FIRST-RESULTS-SAMPLE-${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdPath, renderMarkdown(payload, path.relative(ROOT, jsonPath)), 'utf8');

  console.log(jsonPath);
  console.log(mdPath);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
