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
    '  node scripts/spinout-template-provision-smoke-scaffold.mjs \\',
    '    --parent-url "https://<site>.atlassian.net/wiki/pages/viewpage.action?pageId=<parentId>" \\',
    '    --child-url "https://<site>.atlassian.net/wiki/pages/viewpage.action?pageId=<childId>" \\',
    '    --event-name "<eventName>" \\',
    '    --primary-admin-email "<adminEmail>" \\',
    '    [--out docs/artifacts/HDC-HACKDAY-TEMPLATE-PROVISION-SMOKE-<timestamp>.md]',
  ].join('\n');
}

function parseConfluencePageUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${label} must use https.`);
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'atlassian.net' && !host.endsWith('.atlassian.net')) {
    throw new Error(`${label} must point to an atlassian.net host.`);
  }

  if (url.pathname !== '/wiki/pages/viewpage.action') {
    throw new Error(`${label} must use exact path /wiki/pages/viewpage.action.`);
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

function buildArtifact({ generatedAtUtc, parent, child, eventName, primaryAdminEmail }) {
  return `# HDC HackDay Template Provision Smoke

## Metadata

- Timestamp (UTC): ${generatedAtUtc}
- Operator:
- Environment: production
- Parent URL: ${parent.url}
- Parent pageId: ${parent.pageId}
- Child URL: ${child.url}
- Child pageId: ${child.pageId}
- Event name: ${eventName}
- Primary admin email: ${primaryAdminEmail}

## Step 1: HDC Provisioning

- [ ] Parent macro loaded.
- [ ] Create dialog submitted successfully.
- [ ] Child page opened automatically.
- [ ] Child page title/event name match expected input.

Notes:

## Step 2: Seed and Registry Contract

- [ ] Event row has runtime_type = hackday_template.
- [ ] Event row has template_target = hackday.
- [ ] HackdayTemplateSeed row exists for child pageId.
- [ ] Seed payload includes expected template/admin fields.
- [ ] provision_status is valid (provisioned or initialized).

Notes:

## Step 3: HD26 Bootstrap

- [ ] Child macro iframe renders.
- [ ] App resolves page-scoped context.
- [ ] No forbidden context warning signatures in sampled logs.

Notes:

## Step 4: Isolation

- [ ] Second template child page opened in parallel.
- [ ] No cross-instance data bleed between page contexts.

Notes:

## Evidence

- Commands run:
- Log snippets:
- Screenshots/links:
- Related artifacts:

## Decision

- [ ] PASS
- [ ] BLOCKED
- [ ] FAIL

## Follow-ups

- Owner:
- Actions:
- Due date:
`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help === 'true') {
    console.log(usage());
    process.exit(0);
  }

  const parentUrl = args['parent-url'];
  const childUrl = args['child-url'];
  const eventName = args['event-name'];
  const primaryAdminEmail = args['primary-admin-email'];

  if (!parentUrl || !childUrl || !eventName || !primaryAdminEmail) {
    console.error('Missing required flags --parent-url, --child-url, --event-name, --primary-admin-email.');
    console.error(usage());
    process.exit(1);
  }

  const parent = parseConfluencePageUrl(parentUrl, 'parent-url');
  const child = parseConfluencePageUrl(childUrl, 'child-url');
  const stamp = utcStamp(new Date());

  const defaultOut = path.join('docs', 'artifacts', `HDC-HACKDAY-TEMPLATE-PROVISION-SMOKE-${stamp.fileSafe}.md`);
  const outPath = args.out || defaultOut;
  const fullOutPath = path.resolve(outPath);

  const body = buildArtifact({
    generatedAtUtc: stamp.iso,
    parent,
    child,
    eventName,
    primaryAdminEmail,
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

