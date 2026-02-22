#!/usr/bin/env node
/**
 * One-time setup for Phase 3 (Create HackDay from web app).
 * 1. Generates a shared secret.
 * 2. Deploys HDC Forge app (so web trigger exists), then gets web trigger URL.
 * 3. Sets Forge env vars: CONFLUENCE_HDC_PARENT_PAGE_ID, HACKDAY_CREATE_WEB_SECRET.
 * 4. Sets Convex env vars: FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL, HACKDAY_CREATE_WEB_SECRET.
 *
 * Prerequisites:
 * - Forge CLI logged in; Convex CLI linked to your project.
 * - CONFLUENCE_HDC_PARENT_PAGE_ID or CONFLUENCE_HDC_PARENT_PAGE_URL (to derive page ID).
 *
 * Usage (from repo root):
 *   CONFLUENCE_HDC_PARENT_PAGE_ID=5668895 node scripts/setup-phase3-create-from-web.mjs
 *   # or
 *   CONFLUENCE_HDC_PARENT_PAGE_URL='https://hackdaytemp.atlassian.net/wiki/...?pageId=5668895' node scripts/setup-phase3-create-from-web.mjs
 *
 * Options (env):
 *   SKIP_FORGE_DEPLOY=1     Skip deploying Forge (trigger already deployed).
 *   FORGE_SITE=hackdaytemp.atlassian.net
 *   FORGE_ENV=production
 *   FORGE_PRODUCT=confluence
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const forgeNative = join(root, 'forge-native');

const FORGE_SITE = process.env.FORGE_SITE || 'hackdaytemp.atlassian.net';
const FORGE_ENV = process.env.FORGE_ENV || 'production';
const FORGE_PRODUCT = process.env.FORGE_PRODUCT || 'confluence';
const SKIP_FORGE_DEPLOY = process.env.SKIP_FORGE_DEPLOY === '1' || process.env.SKIP_FORGE_DEPLOY === 'true';

function getParentPageId() {
  const fromId = process.env.CONFLUENCE_HDC_PARENT_PAGE_ID?.trim();
  if (fromId) return fromId;
  const fromUrl = process.env.CONFLUENCE_HDC_PARENT_PAGE_URL || '';
  const m = fromUrl.match(/[?&]pageId=(\d+)/);
  if (m) return m[1];
  return null;
}

function generateSecret() {
  try {
    return execSync('openssl rand -hex 32', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function main() {
  console.log('Phase 3 setup: Create HackDay from web app\n');

  const parentPageId = getParentPageId();
  if (!parentPageId) {
    console.error('Set CONFLUENCE_HDC_PARENT_PAGE_ID or CONFLUENCE_HDC_PARENT_PAGE_URL (with pageId= in query).');
    process.exit(1);
  }
  console.log('Parent page ID:', parentPageId);

  const secret = generateSecret();
  if (!secret) {
    console.error('Could not generate secret (openssl rand -hex 32).');
    process.exit(1);
  }
  console.log('Generated HACKDAY_CREATE_WEB_SECRET (first 8 chars):', secret.slice(0, 8) + '...');

  if (!SKIP_FORGE_DEPLOY) {
    console.log('\nDeploying Forge app (so web trigger exists)...');
    const deploy = spawnSync('forge', ['deploy', '-e', FORGE_ENV, '--non-interactive'], {
      cwd: forgeNative,
      stdio: 'inherit',
      shell: true,
    });
    if (deploy.status !== 0) {
      console.error('Forge deploy failed. Run manually: cd forge-native && forge deploy -e', FORGE_ENV);
      process.exit(1);
    }
  } else {
    console.log('\nSkipping Forge deploy (SKIP_FORGE_DEPLOY=1).');
  }

  console.log('\nGetting web trigger URL...');
  const wtOut = spawnSync(
    'forge',
    ['webtrigger', 'create', '-f', 'hackday-create-from-web', '-e', FORGE_ENV, '-s', FORGE_SITE, '-p', FORGE_PRODUCT],
    { cwd: forgeNative, encoding: 'utf8', shell: true }
  );
  const triggerUrl = (wtOut.stdout || '').trim().split('\n').pop()?.trim();
  if (!triggerUrl || !triggerUrl.startsWith('http')) {
    console.error('Could not get web trigger URL. Stdout:', wtOut.stdout);
    console.error('Stderr:', wtOut.stderr);
    console.error('Run manually: cd forge-native && forge webtrigger create -f hackday-create-from-web -e', FORGE_ENV, '-s', FORGE_SITE, '-p', FORGE_PRODUCT);
    process.exit(1);
  }
  console.log('Web trigger URL:', triggerUrl);

  console.log('\nSetting Forge environment variables...');
  for (const [key, value] of [
    ['CONFLUENCE_HDC_PARENT_PAGE_ID', parentPageId],
    ['HACKDAY_CREATE_WEB_SECRET', secret],
  ]) {
    const set = spawnSync('forge', ['variables', 'set', key, value, '-e', FORGE_ENV], {
      cwd: forgeNative,
      encoding: 'utf8',
      shell: true,
    });
    if (set.status !== 0) {
      console.warn('Forge variables set', key, 'failed:', set.stderr || set.stdout);
    } else {
      console.log('  Set', key);
    }
  }

  console.log('\nSetting Convex environment variables...');
  const safe = (s) => s.replace(/'/g, "'\\''");
  try {
    execSync(`npx convex env set FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL '${safe(triggerUrl)}'`, { cwd: root, stdio: 'inherit' });
    execSync(`npx convex env set HACKDAY_CREATE_WEB_SECRET '${safe(secret)}'`, { cwd: root, stdio: 'inherit' });
    execSync(`npx convex env set CONFLUENCE_HDC_PARENT_PAGE_ID '${safe(parentPageId)}'`, { cwd: root, stdio: 'inherit' });
    console.log('  Set FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL, HACKDAY_CREATE_WEB_SECRET, CONFLUENCE_HDC_PARENT_PAGE_ID');
  } catch (e) {
    console.error('Convex env set failed. Run manually:');
    console.error('  npx convex env set FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL "' + triggerUrl + '"');
    console.error('  npx convex env set HACKDAY_CREATE_WEB_SECRET "' + secret + '"');
    console.error('  npx convex env set CONFLUENCE_HDC_PARENT_PAGE_ID "' + parentPageId + '"');
    process.exit(1);
  }

  console.log('\nDone. Verify: npx convex env list');
}

main();
