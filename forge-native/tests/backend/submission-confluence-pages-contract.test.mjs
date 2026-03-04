import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSource(filePath) {
  return fs.readFile(path.resolve(__dirname, filePath), 'utf8');
}

test('submission page link migration creates linkage table and indexes', async () => {
  const migration = await readSource(
    '../../supabase/migrations/20260303133000_phase8_hackday_submission_page_links.sql'
  );

  assert.match(migration, /create table if not exists\s+"HackdaySubmissionPageLink"/i);
  assert.match(migration, /project_id\s+text\s+primary key/i);
  assert.match(migration, /submission_page_id\s+text\s+unique/i);
  assert.match(migration, /output_page_ids\s+text\[\]\s+not null/i);
  assert.match(migration, /hackday_submission_page_link_event_idx/i);
  assert.match(migration, /hackday_submission_page_link_team_idx/i);
});

test('runtime submitProject returns submission page linkage payload', async () => {
  const runtime = await readSource('../../src/runtime/index.js');

  assert.match(runtime, /HACKDAY_SUBMISSION_PAGE_LINK_TABLE\s*=\s*"HackdaySubmissionPageLink"/);
  assert.match(runtime, /syncSubmissionConfluencePages\(/);
  assert.match(runtime, /return \{ success: true, submissionPageId, submissionPageUrl, outputPageIds \}/);
  assert.match(runtime, /submissionPageId:\s*submissionLink\?\.submission_page_id\s*\|\|\s*null/);
});

test('runtime submission UI exposes open submission page CTA', async () => {
  const appSource = await readSource('../../static/runtime-frontend/src/App.jsx');
  const submissionSource = await readSource('../../static/runtime-frontend/src/components/Submission.jsx');

  assert.match(appSource, /submissionPageId:\s*submitResult\?\.submissionPageId\s*\|\|\s*null/);
  assert.match(submissionSource, /Open submission page/);
  assert.match(submissionSource, /submissionPageHref/);
});
