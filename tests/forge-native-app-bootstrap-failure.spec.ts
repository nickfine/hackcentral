import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/App.tsx');

describe('App bootstrap failure handling contracts', () => {
  it('keeps explicit localhost preview mode on local hosts only', () => {
    const source = fs.readFileSync(appPath, 'utf8');

    expect(source).toContain("const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1']);");
    expect(source).toContain("if (isLocalPreview) {");
    expect(source).toContain('setBootstrap(LOCAL_PREVIEW_DATA);');
    expect(source).toContain('setPreviewMode(true);');
  });

  it('renders a live-data error instead of preview data on bootstrap permission failures', () => {
    const source = fs.readFileSync(appPath, 'utf8');

    expect(source).toContain("return 'Live data is temporarily unavailable due to a permissions issue. Please try again later.';");
    expect(source).toContain('setPreviewMode(false);');
    expect(source).toContain('setErrorMessage(getBootstrapLoadErrorMessage(error));');
    expect(source).not.toContain('Showing fallback preview data.');
  });
});
