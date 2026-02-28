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

test('manifest exposes hackday runtime page, macro, and resolver modules', async () => {
  const manifest = await readSource('../../manifest.yml');

  assert.match(manifest, /key:\s*hackday-runtime-global-page/);
  assert.match(manifest, /route:\s*hackday-app/);
  assert.match(manifest, /key:\s*hackday-runtime-macro/);
  assert.match(manifest, /key:\s*runtime-resolver/);
  assert.match(manifest, /handler:\s*runtime\/index\.handler/);
  assert.match(manifest, /HDC_RUNTIME_OWNER/);
  assert.match(manifest, /HDC_RUNTIME_APP_ID/);
  assert.match(manifest, /HDC_RUNTIME_ENVIRONMENT_ID/);
  assert.match(manifest, /HDC_RUNTIME_MACRO_KEY/);
});

test('hdcService includes runtime owner selection and route metadata contract', async () => {
  const source = await readSource('../../src/backend/hdcService.ts');

  assert.match(source, /function\s+resolveHackdayTemplateRuntimeOwner\(/);
  assert.match(source, /process\.env\.HDC_RUNTIME_OWNER/);
  assert.match(source, /function\s+buildRuntimeAppViewUrl\(/);
  assert.match(source, /runtimeOwner:\s*HDC_RUNTIME_OWNER_HACKCENTRAL/);
  assert.match(source, /runtimeOwner:\s*HDC_RUNTIME_OWNER_HD26FORGE/);
  assert.match(source, /routeVersion:\s*'v2'/);
  assert.match(source, /routeVersion:\s*'v1'/);
});

test('hdcGetAppViewUrl returns runtimeOwner and routeVersion metadata', async () => {
  const source = await readSource('../../src/backend/hdcService.ts');

  assert.match(source, /async\s+getAppViewUrl\(viewer:\s*ViewerContext,\s*pageId:\s*string\):\s*Promise<AppViewUrlResult>/);
  assert.match(source, /const\s+routeResult\s*=\s*buildRuntimeAppViewUrl\(viewer\.siteUrl,\s*normalizedPageId\)/);
  assert.match(source, /runtimeOwner,\s*routeVersion:/);
});

test('shared and frontend type contracts include runtime metadata fields', async () => {
  const shared = await readSource('../../src/shared/types.ts');
  const frontendTypes = await readSource('../../static/frontend/src/types.ts');
  const macroTypes = await readSource('../../static/macro-frontend/src/types.ts');

  for (const content of [shared, frontendTypes, macroTypes]) {
    assert.match(content, /export\s+type\s+AppRuntimeOwner\s*=\s*['\"]hd26forge['\"]\s*\|\s*['\"]hackcentral['\"]/);
    assert.match(content, /export\s+type\s+AppRouteVersion\s*=\s*['\"]v1['\"]\s*\|\s*['\"]v2['\"]/);
    assert.match(content, /interface\s+AppViewUrlResult\s*\{[\s\S]*runtimeOwner:\s*AppRuntimeOwner;[\s\S]*routeVersion:\s*AppRouteVersion;/);
  }
});
