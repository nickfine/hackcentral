#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    tenant: '',
    batchSize: 50,
    cursor: '',
    rollbackManifestPath: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--tenant') {
      args.tenant = String(argv[++i] || '').trim();
      continue;
    }
    if (arg === '--batch-size') {
      args.batchSize = Math.max(1, Number.parseInt(String(argv[++i] || '50'), 10) || 50);
      continue;
    }
    if (arg === '--cursor') {
      args.cursor = String(argv[++i] || '').trim();
      continue;
    }
    if (arg === '--rollback-manifest-path') {
      args.rollbackManifestPath = String(argv[++i] || '').trim();
      continue;
    }
  }

  return args;
}

function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

function extractAppUuid(appIdOrAri) {
  const raw = String(appIdOrAri || '').trim();
  if (!raw) return '';
  const ariMatch = raw.match(/app\/([0-9a-fA-F-]{36})$/);
  if (ariMatch?.[1]) return ariMatch[1];
  const uuidMatch = raw.match(/[0-9a-fA-F-]{36}/);
  return uuidMatch?.[0] || raw;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function encodeFilterValue(value) {
  return encodeURIComponent(String(value || '').replace(/,/g, '%2C'));
}

function buildOldAndNewMacroConfig() {
  const oldMacroKey = String(process.env.HACKDAY_TEMPLATE_MACRO_KEY || 'hackday-2026-customui').trim();
  const oldAppId = extractAppUuid(process.env.HACKDAY_TEMPLATE_APP_ID || '');
  const oldEnvironmentId = String(process.env.HACKDAY_TEMPLATE_ENVIRONMENT_ID || '').trim();

  const newMacroKey = String(process.env.HDC_RUNTIME_MACRO_KEY || 'hackday-runtime-macro').trim();
  const newAppId = extractAppUuid(process.env.HDC_RUNTIME_APP_ID || process.env.FORGE_APP_ID || '');
  const newEnvironmentId = String(process.env.HDC_RUNTIME_ENVIRONMENT_ID || process.env.FORGE_ENVIRONMENT_ID || '').trim();

  if (!oldMacroKey) throw new Error('Missing HACKDAY_TEMPLATE_MACRO_KEY (or fallback) for legacy macro detection.');
  if (!newMacroKey || !newAppId || !newEnvironmentId) {
    throw new Error(
      'Missing runtime macro target config. Set HDC_RUNTIME_MACRO_KEY, HDC_RUNTIME_APP_ID/FORGE_APP_ID, and HDC_RUNTIME_ENVIRONMENT_ID/FORGE_ENVIRONMENT_ID.'
    );
  }

  return {
    old: {
      appId: oldAppId,
      environmentId: oldEnvironmentId,
      macroKey: oldMacroKey,
    },
    next: {
      appId: newAppId,
      environmentId: newEnvironmentId,
      macroKey: newMacroKey,
    },
  };
}

function rewriteMacroStorage(storage, config) {
  if (!storage || typeof storage !== 'string') {
    return { updated: storage || '', changed: false, reason: 'empty_storage' };
  }

  const { old, next } = config;
  const oldMacroPattern = new RegExp(`/static/${old.macroKey}(?=[<\"])`, 'g');
  if (!oldMacroPattern.test(storage)) {
    return { updated: storage, changed: false, reason: 'legacy_macro_not_found' };
  }

  const nextExtensionKey = `${next.appId}/${next.environmentId}/static/${next.macroKey}`;
  const nextExtensionAri = `ari:cloud:ecosystem::extension/${nextExtensionKey}`;

  let rewritten = storage;
  rewritten = rewritten.replace(
    /(<ac:adf-attribute key="extension-key">)[\s\S]*?(<\/ac:adf-attribute>)/ig,
    `$1${nextExtensionKey}$2`
  );
  rewritten = rewritten.replace(
    /(<ac:adf-attribute key="extension-id">)[\s\S]*?(<\/ac:adf-attribute>)/ig,
    `$1${nextExtensionAri}$2`
  );
  rewritten = rewritten.replace(
    /(<ac:adf-parameter key="extension-id">)[\s\S]*?(<\/ac:adf-parameter>)/ig,
    `$1${nextExtensionAri}$2`
  );
  rewritten = rewritten.replace(
    /(<ac:adf-parameter key="app-id">)[\s\S]*?(<\/ac:adf-parameter>)/ig,
    `$1${next.appId}$2`
  );
  rewritten = rewritten.replace(
    /(<ac:adf-parameter key="environment-id">)[\s\S]*?(<\/ac:adf-parameter>)/ig,
    `$1${next.environmentId}$2`
  );
  rewritten = rewritten.replace(
    /(<ac:adf-parameter key="key">)[\s\S]*?(<\/ac:adf-parameter>)/ig,
    `$1${next.macroKey}$2`
  );

  const changed = rewritten !== storage;
  return {
    updated: rewritten,
    changed,
    reason: changed ? 'updated' : 'no_change_after_rewrite',
  };
}

async function fetchSupabaseCandidates({ supabaseUrl, serviceKey, batchSize, cursor }) {
  const base = normalizeBaseUrl(supabaseUrl);
  if (!base) throw new Error('Missing SUPABASE_URL.');
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');

  const queryParts = [
    'select=id,name,runtime_type,confluence_page_id,confluence_page_url',
    'runtime_type=eq.hackday_template',
    'confluence_page_id=not.is.null',
    'order=confluence_page_id.asc',
    `limit=${batchSize}`,
  ];

  if (cursor) {
    queryParts.push(`confluence_page_id=gt.${encodeFilterValue(cursor)}`);
  }

  const url = `${base}/rest/v1/Event?${queryParts.join('&')}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed querying Supabase events (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function confluenceAuthHeaders({ email, token }) {
  const basic = Buffer.from(`${email}:${token}`).toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function fetchConfluencePage({ tenant, pageId, email, token }) {
  const response = await fetch(`${tenant}/wiki/api/v2/pages/${encodeURIComponent(pageId)}?body-format=storage`, {
    method: 'GET',
    headers: confluenceAuthHeaders({ email, token }),
  });
  if (!response.ok) {
    throw new Error(`Fetch page ${pageId} failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

async function updateConfluencePage({ tenant, page, nextStorage, email, token }) {
  const versionNumber = Number(page?.version?.number || 0) + 1;
  const payload = {
    id: page.id,
    status: page.status || 'current',
    title: page.title || `HackDay ${page.id}`,
    ...(page.spaceId ? { spaceId: String(page.spaceId) } : {}),
    ...(page.parentId ? { parentId: String(page.parentId) } : {}),
    version: {
      number: versionNumber,
      message: 'Migrate HackDay inline macro target to HackCentral runtime macro',
    },
    body: {
      representation: 'storage',
      value: nextStorage,
    },
  };

  const response = await fetch(`${tenant}/wiki/api/v2/pages/${encodeURIComponent(page.id)}`, {
    method: 'PUT',
    headers: confluenceAuthHeaders({ email, token }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Update page ${page.id} failed (${response.status}): ${await response.text()}`);
  }

  const updated = await response.json();
  return {
    updatedVersion: Number(updated?.version?.number || versionNumber),
  };
}

async function writeManifest(manifestPath, payload) {
  if (!manifestPath) return;
  const absolute = path.resolve(process.cwd(), manifestPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[migration] Wrote manifest: ${absolute}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const tenant = normalizeBaseUrl(args.tenant || process.env.CONFLUENCE_TENANT || '');
  const confluenceEmail = process.env.CONFLUENCE_API_EMAIL || '';
  const confluenceToken = process.env.CONFLUENCE_API_TOKEN || '';

  if (!tenant) {
    throw new Error('Missing tenant. Pass --tenant https://<site>.atlassian.net or set CONFLUENCE_TENANT.');
  }

  const config = buildOldAndNewMacroConfig();
  const candidates = await fetchSupabaseCandidates({
    supabaseUrl,
    serviceKey,
    batchSize: args.batchSize,
    cursor: args.cursor,
  });

  const resultEntries = [];
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of candidates) {
    const pageId = String(row.confluence_page_id || '').trim();
    if (!pageId) {
      skippedCount += 1;
      resultEntries.push({
        eventId: row.id,
        eventName: row.name,
        pageId: null,
        action: 'skipped',
        reason: 'missing_page_id',
      });
      continue;
    }

    if (args.dryRun) {
      resultEntries.push({
        eventId: row.id,
        eventName: row.name,
        pageId,
        action: 'dry_run_pending',
        reason: 'candidate_queued_for_update',
      });
      continue;
    }

    try {
      const page = await fetchConfluencePage({
        tenant,
        pageId,
        email: confluenceEmail,
        token: confluenceToken,
      });
      const originalStorage = page?.body?.storage?.value || '';
      const rewrite = rewriteMacroStorage(originalStorage, config);
      if (!rewrite.changed) {
        skippedCount += 1;
        resultEntries.push({
          eventId: row.id,
          eventName: row.name,
          pageId,
          action: 'skipped',
          reason: rewrite.reason,
          previousVersion: Number(page?.version?.number || 0),
          previousBodyHash: sha256(originalStorage),
        });
        continue;
      }

      const updateResult = await updateConfluencePage({
        tenant,
        page,
        nextStorage: rewrite.updated,
        email: confluenceEmail,
        token: confluenceToken,
      });

      updatedCount += 1;
      resultEntries.push({
        eventId: row.id,
        eventName: row.name,
        pageId,
        action: 'updated',
        previousVersion: Number(page?.version?.number || 0),
        updatedVersion: updateResult.updatedVersion,
        previousBodyHash: sha256(originalStorage),
        updatedBodyHash: sha256(rewrite.updated),
        previousBody: originalStorage,
      });
      console.log(`[migration] Updated page ${pageId} (${row.name || row.id})`);
    } catch (error) {
      errorCount += 1;
      resultEntries.push({
        eventId: row.id,
        eventName: row.name,
        pageId,
        action: 'error',
        reason: error instanceof Error ? error.message : String(error),
      });
      console.error(`[migration] Failed page ${pageId}:`, error instanceof Error ? error.message : String(error));
    }
  }

  const summary = {
    totalCandidates: candidates.length,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errorCount,
    dryRun: args.dryRun,
  };

  const manifest = {
    metadata: {
      generatedAt: new Date().toISOString(),
      tenant,
      dryRun: args.dryRun,
      batchSize: args.batchSize,
      cursor: args.cursor || null,
      rollbackManifestPath: args.rollbackManifestPath || null,
      oldMacro: config.old,
      newMacro: config.next,
    },
    summary,
    entries: resultEntries,
  };

  await writeManifest(args.rollbackManifestPath, manifest);
  console.log('[migration] Summary:', JSON.stringify(summary));
}

main().catch((error) => {
  console.error('[migration] Fatal:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
