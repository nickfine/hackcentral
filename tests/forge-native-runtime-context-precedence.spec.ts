import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('runtime context precedence contract', () => {
  it('resolves direct page context before active stored app-mode context', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/src/runtime/index.js'),
      'utf8'
    );

    const branchStart = source.indexOf('if (isAppModeRequest(req)) {');
    const trustedContextIndex = source.indexOf(
      'const trustedContext = await resolveInstanceContext(supabase, req, {',
      branchStart
    );
    const payloadContextIndex = source.indexOf(
      'const payloadContext = await resolveInstanceContext(supabase, req, {',
      branchStart
    );
    const activeContextIndex = source.indexOf(
      'const activeContext = await resolveActiveAppModeContext(supabase, req);',
      branchStart
    );

    expect(branchStart).toBeGreaterThan(-1);
    expect(trustedContextIndex).toBeGreaterThan(branchStart);
    expect(payloadContextIndex).toBeGreaterThan(trustedContextIndex);
    expect(activeContextIndex).toBeGreaterThan(payloadContextIndex);
    expect(source).toContain('// 1) Always resolve trusted Confluence page context first.');
  });

  it('resolves config-mode access from app-mode context when running in app view', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/src/runtime/index.js'),
      'utf8'
    );

    const functionStart = source.indexOf('async function resolveConfigModeAccess(supabase, req) {');
    const appModeBranchIndex = source.indexOf('const instanceContext = isAppModeRequest(req)', functionStart);
    const currentContextIndex = source.indexOf('? await getCurrentEventContext(supabase, req)', functionStart);

    expect(functionStart).toBeGreaterThan(-1);
    expect(appModeBranchIndex).toBeGreaterThan(functionStart);
    expect(currentContextIndex).toBeGreaterThan(appModeBranchIndex);
  });

  it('falls back to environment runtime route ids when localId is unavailable', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/src/runtime/index.js'),
      'utf8'
    );

    const builderStart = source.indexOf('function buildAppModeLaunchUrlFromContext(req, pageId) {');
    const localIdRouteIndex = source.indexOf('const routeIdsFromLocalId = extractRuntimeRouteIdsFromLocalId(localIdValue);', builderStart);
    const envResolutionIndex = source.indexOf('const routeIdsFromEnvironment = resolveRuntimeRouteIdsFromEnvironment();', builderStart);
    const envFallbackIndex = source.indexOf('const routeIds = routeIdsFromLocalId || routeIdsFromEnvironment;', builderStart);

    expect(builderStart).toBeGreaterThan(-1);
    expect(localIdRouteIndex).toBeGreaterThan(builderStart);
    expect(envResolutionIndex).toBeGreaterThan(localIdRouteIndex);
    expect(envFallbackIndex).toBeGreaterThan(envResolutionIndex);
    expect(source).toContain('function resolveRuntimeRouteIdsFromEnvironment() {');
    expect(source).toContain('HDC_RUNTIME_CONFIG_ERROR_CODE = "HDC_RUNTIME_CONFIG_INVALID"');
    expect(source).toContain('throw createRuntimeConfigError(');
    expect(source).toContain('routeSource: routeContextSource');
  });

  it('resolves pageId from trusted extension.location before payload fallback', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/src/runtime/index.js'),
      'utf8'
    );

    const functionStart = source.indexOf('function getConfluencePageId(req, { allowPayloadFallback = true, preferPayload = false } = {}) {');
    const locationIndex = source.indexOf('const fromExtensionLocation = normalizeConfluencePageId(req?.context?.extension?.location);', functionStart);
    const payloadFallbackIndex = source.indexOf('if (allowPayloadFallback) {', functionStart);

    expect(functionStart).toBeGreaterThan(-1);
    expect(locationIndex).toBeGreaterThan(functionStart);
    expect(payloadFallbackIndex).toBeGreaterThan(locationIndex);
  });
});
