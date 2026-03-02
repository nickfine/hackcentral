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

test('extraction migration defines prompt/import state tables and idempotency constraints', async () => {
  const migration = await readSource('../../supabase/migrations/20260302013000_phase3_extraction.sql');

  assert.match(migration, /create table if not exists "HackdayExtractionPrompt"/i);
  assert.match(migration, /create table if not exists "HackdayExtractionImport"/i);
  assert.match(migration, /unique\s*\(\s*event_id,\s*participant_user_id,\s*lifecycle_status,\s*policy_version\s*\)/i);
  assert.match(migration, /unique\s*\(\s*event_id,\s*source_project_id,\s*policy_version\s*\)/i);
});

test('global resolver exposes extraction endpoints', async () => {
  const source = await readSource('../../src/index.ts');

  assert.match(source, /resolver\.define\(\s*'hdcGetHackdayExtractionCandidates'/);
  assert.match(source, /resolver\.define\(\s*'hdcTriggerPostHackdayExtractionPrompt'/);
  assert.match(source, /resolver\.define\(\s*'hdcBulkImportHackdaySubmissions'/);
  assert.match(source, /return getHackdayExtractionCandidates\(viewer,\s*request\.payload/);
  assert.match(source, /return triggerPostHackdayExtractionPrompt\(viewer,\s*request\.payload/);
  assert.match(source, /return bulkImportHackdaySubmissions\(viewer,\s*request\.payload/);
});

test('backend facade routes extraction resolvers through Supabase and unsupported backend guard', async () => {
  const source = await readSource('../../src/backend/hackcentral.ts');

  assert.match(source, /function unsupportedExtractionBackendError\(\): never/);
  assert.match(source, /export async function getHackdayExtractionCandidates/);
  assert.match(source, /export async function triggerPostHackdayExtractionPrompt/);
  assert.match(source, /export async function bulkImportHackdaySubmissions/);
  assert.match(source, /repository\.getHackdayExtractionCandidates\(viewer,\s*input\)/);
  assert.match(source, /repository\.triggerPostHackdayExtractionPrompt\(viewer,\s*input\)/);
  assert.match(source, /repository\.bulkImportHackdaySubmissions\(viewer,\s*input\)/);
});

test('shared and frontend type contracts include extraction payloads, results, and resolver defs', async () => {
  const shared = await readSource('../../src/shared/types.ts');
  const frontendTypes = await readSource('../../static/frontend/src/types.ts');

  for (const content of [shared, frontendTypes]) {
    assert.match(content, /export type HackdayExtractionPolicyVersion = 'r11-extraction-v1';/);
    assert.match(content, /export interface GetHackdayExtractionCandidatesInput\s*\{[\s\S]*eventId:\s*string;/);
    assert.match(content, /export interface TriggerPostHackdayExtractionPromptInput\s*\{[\s\S]*dryRun\?:\s*boolean;/);
    assert.match(content, /export interface BulkImportHackdaySubmissionsInput\s*\{[\s\S]*overwriteExistingDrafts\?:\s*boolean;/);
    assert.match(content, /export interface HackdayExtractionCandidatesResult\s*\{[\s\S]*candidates:\s*HackdayExtractionCandidate\[\];/);
    assert.match(content, /export interface TriggerPostHackdayExtractionPromptResult\s*\{[\s\S]*status:\s*'prompted' \| 'skipped_not_results' \| 'dry_run';/);
    assert.match(content, /export interface BulkImportHackdaySubmissionsResult\s*\{[\s\S]*importedProjectIds:\s*string\[\];/);
    assert.match(content, /hdcGetHackdayExtractionCandidates:\s*\(\s*payload:\s*GetHackdayExtractionCandidatesInput/);
    assert.match(content, /hdcTriggerPostHackdayExtractionPrompt:\s*\(\s*payload:\s*TriggerPostHackdayExtractionPromptInput/);
    assert.match(content, /hdcBulkImportHackdaySubmissions:\s*\(\s*payload:\s*BulkImportHackdaySubmissionsInput/);
  }
});

test('supabase repository enforces extraction permission and migration gates', async () => {
  const source = await readSource('../../src/backend/supabase/repositories.ts');

  assert.match(source, /const HACKDAY_EXTRACTION_PROMPT_TABLE = 'HackdayExtractionPrompt';/);
  assert.match(source, /const HACKDAY_EXTRACTION_IMPORT_TABLE = 'HackdayExtractionImport';/);
  assert.match(source, /throw new Error\('\[EXTRACT_FORBIDDEN\]/);
  assert.match(source, /throw new Error\('\[EXTRACT_IMPORT_FORBIDDEN\]/);
  assert.match(source, /createExtractionMigrationError\(HACKDAY_EXTRACTION_PROMPT_TABLE\)/);
  assert.match(source, /createExtractionMigrationError\(HACKDAY_EXTRACTION_IMPORT_TABLE\)/);
  assert.match(source, /action:\s*'hackday_extraction_prompted'/);
  assert.match(source, /action:\s*'hackday_bulk_imported'/);
});

test('extraction resolvers return explicit skipped_not_results response shape', async () => {
  const source = await readSource('../../src/backend/supabase/repositories.ts');

  assert.match(
    source,
    /status:\s*'skipped_not_results'[\s\S]*lifecycleStatus:\s*event\.lifecycle_status[\s\S]*eligibleParticipantCount:\s*eligibleParticipantIds\.length[\s\S]*promptedParticipantCount:\s*0[\s\S]*skippedAlreadyPromptedCount:\s*0[\s\S]*promptedAt:\s*null/
  );
  assert.match(
    source,
    /status:\s*'skipped_not_results'[\s\S]*scannedSubmissionCount[\s\S]*importedDraftCount:\s*0[\s\S]*skippedAlreadyImportedCount:\s*0[\s\S]*skippedInvalidSubmissionCount:\s*0[\s\S]*notifiedParticipantCount:\s*0[\s\S]*importedProjectIds:\s*\[\][\s\S]*importedAt:\s*null/
  );
});

test('frontend app wires extraction controls and invokes extraction resolvers', async () => {
  const source = await readSource('../../static/frontend/src/App.tsx');

  assert.match(source, /Post-HackDay Extraction \(R11\)/);
  assert.match(source, /invokeTyped\('hdcGetHackdayExtractionCandidates',\s*\{\s*eventId,\s*limit\s*\}\)/);
  assert.match(source, /invokeTyped\('hdcTriggerPostHackdayExtractionPrompt'/);
  assert.match(source, /invokeTyped\('hdcBulkImportHackdaySubmissions'/);
  assert.match(source, /setExtractionPromptForbidden\(true\)/);
  assert.match(source, /setExtractionImportForbidden\(true\)/);
});
