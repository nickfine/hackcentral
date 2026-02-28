#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    manifestPath: '',
    dryRun: false,
    tenant: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') {
      args.manifestPath = String(argv[++i] || '').trim();
      continue;
    }
    if (arg === '--tenant') {
      args.tenant = String(argv[++i] || '').trim();
      continue;
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
  }

  return args;
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function confluenceAuthHeaders({ email, token }) {
  const basic = Buffer.from(`${email}:${token}`).toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function fetchPage({ tenant, pageId, email, token }) {
  const response = await fetch(`${tenant}/wiki/api/v2/pages/${encodeURIComponent(pageId)}?body-format=storage`, {
    method: 'GET',
    headers: confluenceAuthHeaders({ email, token }),
  });
  if (!response.ok) {
    throw new Error(`Fetch page ${pageId} failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

async function restorePageStorage({ tenant, page, restoreStorage, email, token }) {
  const nextVersion = Number(page?.version?.number || 0) + 1;
  const payload = {
    id: page.id,
    status: page.status || 'current',
    title: page.title || `HackDay ${page.id}`,
    ...(page.spaceId ? { spaceId: String(page.spaceId) } : {}),
    ...(page.parentId ? { parentId: String(page.parentId) } : {}),
    version: {
      number: nextVersion,
      message: 'Rollback HackDay runtime macro migration',
    },
    body: {
      representation: 'storage',
      value: restoreStorage,
    },
  };

  const response = await fetch(`${tenant}/wiki/api/v2/pages/${encodeURIComponent(page.id)}`, {
    method: 'PUT',
    headers: confluenceAuthHeaders({ email, token }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Rollback update failed for page ${page.id} (${response.status}): ${await response.text()}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = args.manifestPath;
  if (!manifestPath) {
    throw new Error('Missing --manifest path.');
  }

  const absoluteManifest = path.resolve(process.cwd(), manifestPath);
  const manifestRaw = await fs.readFile(absoluteManifest, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  const tenant = normalizeBaseUrl(args.tenant || manifest?.metadata?.tenant || process.env.CONFLUENCE_TENANT || '');
  const email = process.env.CONFLUENCE_API_EMAIL || '';
  const token = process.env.CONFLUENCE_API_TOKEN || '';

  if (!tenant) {
    throw new Error('Missing tenant. Pass --tenant or ensure manifest metadata.');
  }
  if (!args.dryRun && (!email || !token)) {
    throw new Error('Missing CONFLUENCE_API_EMAIL/CONFLUENCE_API_TOKEN for rollback updates.');
  }

  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  const rollbackEntries = entries.filter((entry) => entry?.action === 'updated' && typeof entry?.previousBody === 'string');

  let restored = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of rollbackEntries) {
    const pageId = String(entry.pageId || '').trim();
    if (!pageId) {
      skipped += 1;
      continue;
    }

    if (args.dryRun) {
      console.log(`[rollback] DRY RUN would restore page ${pageId}`);
      continue;
    }

    try {
      const page = await fetchPage({ tenant, pageId, email, token });
      await restorePageStorage({ tenant, page, restoreStorage: entry.previousBody, email, token });
      restored += 1;
      console.log(`[rollback] Restored page ${pageId}`);
    } catch (error) {
      errors += 1;
      console.error(`[rollback] Failed page ${pageId}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(
    '[rollback] Summary:',
    JSON.stringify({
      totalCandidates: rollbackEntries.length,
      restored,
      skipped,
      errors,
      dryRun: args.dryRun,
      manifestPath: absoluteManifest,
    })
  );
}

main().catch((error) => {
  console.error('[rollback] Fatal:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
