import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSource(relPath) {
  return fs.readFile(path.resolve(__dirname, relPath), 'utf8');
}

test('runtime resolver defines hero image signed-upload endpoint with validation and storage upload URL', async () => {
  const source = await readSource('../../src/runtime/index.js');

  assert.match(source, /resolver\.define\("createEventBrandingImageUploadUrl"/);
  assert.match(source, /resolveEventBrandingAdminContext\(req\)/);
  assert.match(source, /EVENT_BRANDING_UPLOAD_ALLOWED_TYPES\s*=\s*new Set\(\["image\/jpeg", "image\/png", "image\/webp"\]\)/);
  assert.match(source, /fileSizeBytes > EVENT_BRANDING_UPLOAD_MAX_BYTES/);
  assert.match(source, /imageWidth < EVENT_BRANDING_UPLOAD_MIN_WIDTH \|\| imageHeight < EVENT_BRANDING_UPLOAD_MIN_HEIGHT/);
  assert.match(source, /createSignedUploadUrl\(objectPath\)/);
  assert.match(source, /getPublicUrl\(objectPath\)/);
});

test('shared and frontend defs include hero image upload request/response contracts', async () => {
  const sharedTypes = await readSource('../../src/shared/types.ts');
  const frontendTypes = await readSource('../../static/frontend/src/types.ts');

  for (const content of [sharedTypes, frontendTypes]) {
    assert.match(content, /interface\s+CreateEventBrandingImageUploadUrlInput\s*\{/);
    assert.match(content, /interface\s+CreateEventBrandingImageUploadUrlResult\s*\{/);
    assert.match(content, /createEventBrandingImageUploadUrl:\s*\(\s*payload:\s*CreateEventBrandingImageUploadUrlInput\s*\)\s*=>\s*CreateEventBrandingImageUploadUrlResult/);
  }
});

test('migration provisions public storage bucket with file constraints for hero images', async () => {
  const migration = await readSource('../../supabase/migrations/20260305090000_create_event_branding_images_bucket.sql');

  assert.match(migration, /insert into storage\.buckets/i);
  assert.match(migration, /'event-branding-images'/);
  assert.match(migration, /file_size_limit/i);
  assert.match(migration, /2000000/);
  assert.match(migration, /image\/jpeg/i);
  assert.match(migration, /image\/png/i);
  assert.match(migration, /image\/webp/i);
});
