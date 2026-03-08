import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function readSource(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('runtime branding surface contract', () => {
  it('keeps branding upload-first in Admin and removes branding-level banner messaging', async () => {
    const adminSource = await readSource('forge-native/static/runtime-frontend/src/components/AdminPanel.jsx');
    const dashboardSource = await readSource('forge-native/static/runtime-frontend/src/components/Dashboard.jsx');
    const contentRegistrySource = await readSource('forge-native/static/runtime-frontend/src/configMode/contentRegistry.js');

    expect(adminSource).toContain('type="color"');
    expect(adminSource).toContain('Upload banner');
    expect(adminSource).toContain('Manual banner image URL');
    expect(adminSource).toContain('Dashboard preview');
    expect(adminSource).not.toContain('label="Banner message"');

    expect(dashboardSource).toContain('dashboard-hero-banner-image');
    expect(dashboardSource).not.toContain('Upload hero logo');

    expect(contentRegistrySource).not.toContain("key: 'branding.bannerMessage'");
  });
});
