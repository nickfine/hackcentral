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
    const cssSource = await readSource('forge-native/static/runtime-frontend/src/index.css');

    expect(adminSource).toContain('type="color"');
    expect(adminSource).toContain('Upload banner');
    expect(adminSource).toContain('Upload icon');
    expect(adminSource).toContain('Hero banner image');
    expect(adminSource).toContain('Hero icon image');
    expect(adminSource).toContain('Manual banner image URL');
    expect(adminSource).toContain('Manual hero icon URL');
    expect(adminSource).toContain('Dashboard preview');
    expect(adminSource).toContain('Selecting a preset resets the accent to that preset.');
    expect(adminSource).toContain("accentColor: syncAccentToPreset(presetId),");
    expect(adminSource).toContain("return getThemePresetAccent(normalizeThemePreset(nextPreset), 'light');");
    expect(adminSource).toContain("configMode.setFieldValue('branding.heroIconImageUrl', heroIconImageUrl);");
    expect(adminSource).toContain("handleBrandingImagePicked('banner', event)");
    expect(adminSource).toContain("handleBrandingImagePicked('icon', event)");
    expect(adminSource).toContain("configMode.setFieldValue(`branding.${assetField}`, uploaded.publicUrl);");
    expect(adminSource).toContain('branding-live-preview-icon');
    expect(adminSource).toContain('configMode.hasDraft || configMode.hasUnsavedChanges');
    expect(adminSource).not.toContain('label="Banner message"');

    expect(dashboardSource).toContain('dashboard-hero-banner-image');
    expect(dashboardSource).toContain("configMode?.getFieldValue?.('branding.bannerImageUrl', fallback)");
    expect(dashboardSource).toContain("configMode?.getFieldValue?.('branding.heroIconImageUrl', fallback)");
    expect(dashboardSource).toContain('dashboard-hero-logo--uploaded');
    expect(dashboardSource).not.toContain('Upload hero logo');

    expect(contentRegistrySource).not.toContain("key: 'branding.bannerMessage'");
    expect(contentRegistrySource).toContain("key: 'branding.heroIconImageUrl'");
    expect(cssSource).toContain('.branding-banner-preview-image');
    expect(cssSource).toContain('.branding-icon-preview-image');
    expect(cssSource).toContain('.branding-live-preview-icon');
    expect(cssSource).toContain('.dashboard-hero-logo--uploaded');
    expect(cssSource).toContain('max-height: 400px;');
    expect(cssSource).toContain('object-fit: contain;');
    expect(cssSource).toContain('max-width: 11rem;');
    expect(cssSource).toContain('inset: 1rem 1.25rem;');
  });
});
