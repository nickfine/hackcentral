#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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
    '  node scripts/phase3-macro-qa-scaffold.mjs \\\n    --parent-url "https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=<parentPageId>" \\\n    --instance-url "https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=<instancePageId>" \\\n    [--out docs/artifacts/HDC-V2-PHASE3-MACRO-QA-<timestamp>.md]'
  ].join('\n');
}

function parseConfluencePageUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (!url.hostname.endsWith('atlassian.net')) {
    throw new Error(`${label} must point to an atlassian.net host.`);
  }

  if (!url.pathname.includes('/wiki/pages/viewpage.action')) {
    throw new Error(`${label} must use /wiki/pages/viewpage.action.`);
  }

  const pageId = url.searchParams.get('pageId')?.trim() || '';
  if (!pageId) {
    throw new Error(`${label} must include a non-empty pageId query parameter.`);
  }

  return { url: url.toString(), pageId };
}

function utcStamp(date) {
  const iso = date.toISOString();
  const fileSafe = iso.replace(/[:.]/g, '-');
  return { iso, fileSafe };
}

function buildArtifact({ parent, instance, generatedAtUtc }) {
  return `# HDC v2 Phase 3 Macro QA Evidence Scaffold\n\nGenerated at (UTC): ${generatedAtUtc}\n\n## Inputs\n- Parent URL: ${parent.url}\n- Parent pageId: ${parent.pageId}\n- Instance URL: ${instance.url}\n- Instance pageId: ${instance.pageId}\n\n## Playwright MCP Run Matrix\n- Desktop: 1366x900\n- Tablet: 980x900\n- Mobile: 390x844\n\n## Preflight\n- [ ] Confirm app load on parent URL\n- [ ] Confirm app load on instance URL\n- [ ] Confirm switcher trigger visible in macro header\n\n## Parent Context Results\n### Desktop (1366x900)\n- [ ] Switcher opens/closes correctly\n- [ ] Home/Live/Upcoming/Recent sections visible\n- [ ] Current row highlighted and disabled\n- [ ] Navigable non-current row changes page\n- [ ] Keyboard flow (Enter, ArrowDown/ArrowUp, Escape)\n- [ ] If unavailable row exists: disabled + \"Page not provisioned yet\"\n- [ ] Refresh switcher registry button works\n- Notes:\n\n### Tablet (980x900)\n- [ ] Compact dropdown behavior\n- [ ] Meta/status hidden\n- [ ] Navigation + close behavior\n- Notes:\n\n### Mobile (390x844)\n- [ ] Bottom sheet + overlay behavior\n- [ ] Tap target height >=44px\n- [ ] Navigation + close behavior\n- Notes:\n\n## Instance Context Results\n### Desktop (1366x900)\n- [ ] Switcher opens/closes correctly\n- [ ] Home/Live/Upcoming/Recent sections visible\n- [ ] Current row highlighted and disabled\n- [ ] Navigable non-current row changes page\n- [ ] Keyboard flow (Enter, ArrowDown/ArrowUp, Escape)\n- [ ] If unavailable row exists: disabled + \"Page not provisioned yet\"\n- [ ] Refresh switcher registry button works\n- Notes:\n\n### Tablet (980x900)\n- [ ] Compact dropdown behavior\n- [ ] Meta/status hidden\n- [ ] Navigation + close behavior\n- Notes:\n\n### Mobile (390x844)\n- [ ] Bottom sheet + overlay behavior\n- [ ] Tap target height >=44px\n- [ ] Navigation + close behavior\n- Notes:\n\n## Evidence\n- Console errors:\n- Network anomalies:\n- Screenshots/videos:\n- Blockers (exact message + URL):\n\n## Exit Decision\n- [ ] PASS\n- [ ] BLOCKED\n- [ ] FAIL\n\n`;}

function main() {
  const args = parseArgs(process.argv);
  if (args.help === 'true') {
    console.log(usage());
    process.exit(0);
  }

  const parentUrl = args['parent-url'];
  const instanceUrl = args['instance-url'];
  if (!parentUrl || !instanceUrl) {
    console.error('Missing required flags --parent-url and --instance-url.');
    console.error(usage());
    process.exit(1);
  }

  const parent = parseConfluencePageUrl(parentUrl, 'parent-url');
  const instance = parseConfluencePageUrl(instanceUrl, 'instance-url');
  const stamp = utcStamp(new Date());

  const defaultOut = path.join('docs', 'artifacts', `HDC-V2-PHASE3-MACRO-QA-${stamp.fileSafe}.md`);
  const outPath = args.out || defaultOut;
  const fullOutPath = path.resolve(outPath);

  const body = buildArtifact({
    parent,
    instance,
    generatedAtUtc: stamp.iso,
  });

  fs.mkdirSync(path.dirname(fullOutPath), { recursive: true });
  fs.writeFileSync(fullOutPath, body, 'utf8');

  console.log(`Generated: ${fullOutPath}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}
