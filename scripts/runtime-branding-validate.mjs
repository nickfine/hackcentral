#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveRepoRoot } from './lib/repo-root.mjs';

const ROOT = resolveRepoRoot(import.meta.url);
const FORGE_DIR = path.join(ROOT, 'forge-native');
const require = createRequire(import.meta.url);

const DEFAULTS = {
  environment: 'staging',
  environmentId: '17778174-f2aa-4f73-a34a-985afd5fa4e2',
  site: 'hackdaytemp.atlassian.net',
  product: 'confluence',
  pageId: '24510466',
  storageStatePath: path.join(ROOT, '.auth', 'hackdaytemp-storage.json'),
  bannerUploadPath: path.join(ROOT, 'docs', 'artifacts', 'branding-dashboard-postdeploy-2026-03-08T15-17-31-952Z.png'),
  iconUploadPath: path.join(ROOT, 'forge-native', 'static', 'frontend', 'src', 'assets', 'adaptalogo.jpg'),
  deploy: false,
  waitMs: 5000,
  configReadyTimeoutMs: 30000,
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--deploy') {
      args.deploy = true;
      continue;
    }
    if (token === '--environment') {
      args.environment = argv[i + 1] || args.environment;
      i += 1;
      continue;
    }
    if (token === '--environment-id') {
      args.environmentId = argv[i + 1] || args.environmentId;
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
    if (token === '--page-id') {
      args.pageId = argv[i + 1] || args.pageId;
      i += 1;
      continue;
    }
    if (token === '--storage-state') {
      args.storageStatePath = argv[i + 1] || args.storageStatePath;
      i += 1;
      continue;
    }
    if (token === '--banner-upload') {
      args.bannerUploadPath = argv[i + 1] || args.bannerUploadPath;
      i += 1;
      continue;
    }
    if (token === '--icon-upload') {
      args.iconUploadPath = argv[i + 1] || args.iconUploadPath;
      i += 1;
      continue;
    }
    if (token === '--wait-ms') {
      const parsed = Number.parseInt(String(argv[i + 1] || ''), 10);
      args.waitMs = Number.isFinite(parsed) && parsed >= 0 ? parsed : args.waitMs;
      i += 1;
      continue;
    }
    if (token === '--config-ready-timeout-ms') {
      const parsed = Number.parseInt(String(argv[i + 1] || ''), 10);
      args.configReadyTimeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : args.configReadyTimeoutMs;
      i += 1;
      continue;
    }
    if (token === '--help') {
      args.help = true;
      continue;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/runtime-branding-validate.mjs [--deploy] [--page-id 24510466] [--environment-id <envId>]',
    '',
    'Examples:',
    '  node scripts/runtime-branding-validate.mjs',
    '  node scripts/runtime-branding-validate.mjs --deploy',
    '  node scripts/runtime-branding-validate.mjs --page-id 24510466 --environment-id 17778174-f2aa-4f73-a34a-985afd5fa4e2',
    '',
    'Defaults:',
    `  environment: ${DEFAULTS.environment}`,
    `  environment-id: ${DEFAULTS.environmentId}`,
    `  site: ${DEFAULTS.site}`,
    `  page-id: ${DEFAULTS.pageId}`,
    `  storage-state: ${DEFAULTS.storageStatePath}`,
  ].join('\n');
}

function utcStamp(date = new Date()) {
  const iso = date.toISOString();
  return {
    iso,
    fileSafe: iso.replace(/[:.]/g, '-'),
  };
}

function resolveValidationUrl(args) {
  return `https://${args.site}/wiki/apps/f828e0d4-e9d0-451d-b818-533bc3e95680/${args.environmentId}/hackday-app?pageId=${args.pageId}`;
}

function runNode22Command(command, args, cwd) {
  return execFileSync(path.join(ROOT, 'scripts', 'with-node22.sh'), [command, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    throw new Error(
      `Unable to load the "playwright" package. Install it before running this validator. Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function ensureInputsExist(args) {
  const required = [
    ['storage state', args.storageStatePath],
    ['banner upload', args.bannerUploadPath],
    ['icon upload', args.iconUploadPath],
  ];

  for (const [label, filePath] of required) {
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Missing required ${label} file: ${filePath}`);
    }
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForButtonEnabled(locator, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await locator.count()) > 0 && !(await locator.first().isDisabled())) {
      return;
    }
    await wait(1000);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for the button to enable.`);
}

async function writeArtifacts(result) {
  const stamp = utcStamp(new Date());
  const environmentLabel = String(result.environment || 'staging').trim().toLowerCase() || 'staging';
  const base = path.join(ROOT, 'docs', 'artifacts', `runtime-branding-validation-${environmentLabel}-${stamp.fileSafe}`);
  const jsonPath = `${base}.json`;
  const mdPath = `${base}.md`;
  const dashboardScreenshotPath = `${base}-dashboard.png`;
  const brandingScreenshotPath = `${base}-branding.png`;

  result.dashboardScreenshotPath = dashboardScreenshotPath;
  result.brandingScreenshotPath = brandingScreenshotPath;

  await fs.mkdir(path.dirname(base), { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  const lines = [
    '# Staging Hero Split Validation',
    '',
    `Storage state: ${result.storageStatePath}`,
    `URL: ${result.url}`,
    '',
    `- Runtime log: ${result.runtimeLog || 'not captured'}`,
    `- Banner preview src: ${result.bannerPreviewSrc || 'missing'}`,
    `- Dashboard hero src: ${result.dashboardHeroSrc || 'missing'}`,
    `- Icon preview src: ${result.iconPreviewSrc || 'missing'}`,
    `- Dashboard hero logo src: ${result.dashboardHeroLogoSrc || 'missing'}`,
    `- Banner matches dashboard: ${String(result.bannerMatchesDashboard)}`,
    `- Icon matches dashboard: ${String(result.iconMatchesDashboard)}`,
    `- Banner persists on return: ${String(result.bannerPersistsOnReturn)}`,
    `- Icon persists on return: ${String(result.iconPersistsOnReturn)}`,
    `- Dashboard screenshot: ${dashboardScreenshotPath}`,
    `- Branding screenshot: ${brandingScreenshotPath}`,
    `- JSON artifact: ${jsonPath}`,
    '',
  ];
  await fs.writeFile(mdPath, lines.join('\n'), 'utf8');

  return { jsonPath, mdPath, dashboardScreenshotPath, brandingScreenshotPath };
}

async function findRuntimeFrame(page, environmentId) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const frames = page.frames();
    const directMatch = frames.find((frame) => {
      const url = frame.url();
      return url.includes(`/${environmentId}/`) && url.includes('atlassian-dev.net');
    });
    if (directMatch) return directMatch;

    const fallback = frames.find((frame) => frame !== page.mainFrame());
    if (fallback) return fallback;
    await wait(500);
  }
  throw new Error('Unable to find the hosted HackDay runtime iframe.');
}

async function maybeEnterConfigMode(frame, timeoutMs) {
  const enterButton = frame.locator('button:has-text("Enter Config Mode")').first();
  if ((await enterButton.count()) === 0) return;

  await waitForButtonEnabled(enterButton, timeoutMs);
  await enterButton.click({ force: true, timeout: 10000 });
}

async function runValidation(args) {
  await ensureInputsExist(args);
  const { chromium } = loadPlaywright();
  const result = {
    storageStatePath: args.storageStatePath,
    bannerUploadPath: args.bannerUploadPath,
    iconUploadPath: args.iconUploadPath,
    environment: args.environment,
    environmentId: args.environmentId,
    pageId: args.pageId,
    url: resolveValidationUrl(args),
    deployRequested: args.deploy,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: args.storageStatePath,
    viewport: { width: 1600, height: 1400 },
  });
  const page = await context.newPage();

  page.on('console', (message) => {
    const text = message.text();
    if (text.includes('HackCentral Runtime')) {
      result.runtimeLog = text;
    }
  });

  try {
    await page.goto(result.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await wait(args.waitMs);

    const frame = await findRuntimeFrame(page, args.environmentId);

    await frame.locator('text=Admin Panel').first().click({ force: true, timeout: 10000 });
    await frame.locator('[role=tab]').filter({ hasText: 'Branding' }).click({ force: true, timeout: 10000 });
    await frame.locator('text=Hero banner image').waitFor({ timeout: 20000 });
    await maybeEnterConfigMode(frame, args.configReadyTimeoutMs);
    await wait(3000);
    await frame.locator('[role=tab]').filter({ hasText: 'Branding' }).click({ force: true, timeout: 10000 }).catch(() => {});

    const fileInputs = frame.locator('input[type=file]');
    result.fileInputCount = await fileInputs.count();
    if (result.fileInputCount < 2) {
      throw new Error(`Expected 2 file inputs, found ${result.fileInputCount}.`);
    }

    await fileInputs.nth(0).setInputFiles(args.bannerUploadPath);
    await frame.locator('img[alt="Current hero banner"]').waitFor({ timeout: 60000 });
    await wait(5000);
    result.bannerPreviewSrc = await frame.locator('img[alt="Current hero banner"]').getAttribute('src');

    await fileInputs.nth(1).setInputFiles(args.iconUploadPath);
    await frame.locator('img[alt="Current hero icon"]').waitFor({ timeout: 60000 });
    await wait(5000);
    result.iconPreviewSrc = await frame.locator('img[alt="Current hero icon"]').getAttribute('src');

    await frame.locator('text=Dashboard').first().click({ force: true, timeout: 10000 });
    await frame.locator('[data-testid="dashboard-hero-card"]').waitFor({ timeout: 20000 });
    await wait(2000);
    result.dashboardHeroSrc = await frame.locator('.dashboard-hero-banner-image').getAttribute('src');
    result.dashboardHeroLogoSrc = await frame.locator('[data-testid="dashboard-hero-logo"]').getAttribute('src');
    result.dashboardHeroLogoClass = await frame.locator('[data-testid="dashboard-hero-logo"]').getAttribute('class');

    const files = await writeArtifacts(result);
    await frame.locator('[data-testid="dashboard-hero-card"]').screenshot({ path: files.dashboardScreenshotPath });

    await frame.locator('text=Admin Panel').first().click({ force: true, timeout: 10000 });
    await frame.locator('[role=tab]').filter({ hasText: 'Branding' }).click({ force: true, timeout: 10000 });
    await frame.locator('text=Hero icon image').waitFor({ timeout: 15000 });
    await wait(1500);
    result.returnedBannerPreviewSrc = await frame.locator('img[alt="Current hero banner"]').getAttribute('src');
    result.returnedIconPreviewSrc = await frame.locator('img[alt="Current hero icon"]').getAttribute('src');
    await frame.locator('.branding-live-preview').screenshot({ path: files.brandingScreenshotPath });

    result.bannerMatchesDashboard = Boolean(result.bannerPreviewSrc && result.bannerPreviewSrc === result.dashboardHeroSrc);
    result.iconMatchesDashboard = Boolean(result.iconPreviewSrc && result.iconPreviewSrc === result.dashboardHeroLogoSrc);
    result.bannerPersistsOnReturn = Boolean(result.bannerPreviewSrc && result.bannerPreviewSrc === result.returnedBannerPreviewSrc);
    result.iconPersistsOnReturn = Boolean(result.iconPreviewSrc && result.iconPreviewSrc === result.returnedIconPreviewSrc);
    result.validatedAt = new Date().toISOString();

    await fs.writeFile(files.jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    return { result, files };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

function deployToStaging(args) {
  const steps = [
    ['npm', ['run', 'custom-ui:build']],
    ['forge', ['deploy', '--environment', args.environment, '--no-verify']],
    ['forge', ['install', '-e', args.environment, '--upgrade', '--non-interactive', '--site', args.site, '--product', args.product]],
  ];

  for (const [command, commandArgs] of steps) {
    runNode22Command(command, commandArgs, FORGE_DIR);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    process.exit(0);
  }

  if (args.deploy) {
    deployToStaging(args);
  }

  const { result, files } = await runValidation(args);
  console.log(JSON.stringify({ ...result, artifacts: files }, null, 2));
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}
