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
    expect(adminSource).toContain('Theme &amp; Accent');
    expect(adminSource).toContain('Event Artwork');
    expect(adminSource).toContain('Live Preview');
    expect(adminSource).toContain('Live dashboard hero sample for the selected preset, accent, banner, icon, and theme mode.');
    expect(adminSource).toContain('Theme mode');
    expect(adminSource).toContain('Choosing a preset resets the accent to that preset');
    expect(adminSource).toContain("return getThemePresetAccent(normalizeThemePreset(nextPreset), 'light');");
    expect(adminSource).toContain('savedBrandingBaseline = {}');
    expect(adminSource).toContain("const updateBrandingFormField = useCallback((field, value) => {");
    expect(adminSource).toContain("const handleThemePresetChange = useCallback((presetId) => {");
    expect(adminSource).toContain("onClick={() => handleThemePresetChange(presetId)}");
    expect(adminSource).toContain("onChange={(event) => handleAccentColorChange(event.target.value)}");
    expect(adminSource).toContain("onChange={(e) => handleBrandingImageUrlChange('bannerImageUrl', e.target.value)}");
    expect(adminSource).toContain("onChange={(e) => handleBrandingImageUrlChange('heroIconImageUrl', e.target.value)}");
    expect(adminSource).toContain("onChange={(value) => handleThemePreferenceChange(value)}");
    expect(adminSource).toContain("const brandingHasUnsavedChanges = useMemo(");
    expect(adminSource).toContain("const brandingSaveStateLabel = brandingHasUnsavedChanges ? 'UNSAVED' : 'SAVED';");
    expect(adminSource).toContain('<div className="branding-save-row">');
    expect(adminSource).toContain('<div className="branding-save-status">');
    expect(adminSource).toContain("Badge variant={brandingHasUnsavedChanges ? 'warning' : 'success'}");
    expect(adminSource).toContain('UNSAVED');
    expect(adminSource).toContain('SAVED');
    expect(adminSource).toContain("configMode.setFieldValue('branding.heroIconImageUrl', heroIconImageUrl);");
    expect(adminSource).toContain("handleBrandingImagePicked('banner', event)");
    expect(adminSource).toContain("handleBrandingImagePicked('icon', event)");
    expect(adminSource).toContain('Hero banner updated in preview. Save branding when ready.');
    expect(adminSource).toContain('branding-live-preview-icon');
    expect(adminSource).toContain("const [brandingPreviewSystemColorMode, setBrandingPreviewSystemColorMode] = useState(() => {");
    expect(adminSource).toContain("const brandingPreviewColorMode =");
    expect(adminSource).toContain("data-color-mode={brandingPreviewColorMode}");
    expect(adminSource).toContain("disabled={isSavingBranding || isUploadingBrandingImage || !isEventAdmin || !brandingHasUnsavedChanges}");
    expect(adminSource).not.toContain('icon={<Palette className="w-4 h-4" />}');
    expect(adminSource).not.toContain('label="Banner message"');
    expect(adminSource.indexOf('Theme &amp; Accent')).toBeLessThan(adminSource.indexOf('Event Artwork'));
    expect(adminSource.indexOf('Event Artwork')).toBeLessThan(adminSource.indexOf('Live Preview'));

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
    expect(cssSource).toContain('.branding-theme-layout');
    expect(cssSource).toContain('.branding-section-break');
    expect(cssSource).toContain('.branding-artwork-icon-shell');
    expect(cssSource).toContain('.branding-preview-strip-header');
    expect(cssSource).toContain('.branding-live-preview-toolbar');
    expect(cssSource).toContain('.branding-save-row');
    expect(cssSource).toContain('.dashboard-hero-logo--uploaded');
    expect(cssSource).toContain('.admin-panel-theme-scope [class~="text-gray-900"]');
    expect(cssSource).toContain('min-height: 12.5rem;');
    expect(cssSource).toContain('max-width: 50%;');
    expect(cssSource).toContain('object-fit: contain;');
    expect(cssSource).toContain('max-width: 400px;');
    expect(cssSource).toContain('inset: 0.85rem 1rem;');
  });
});
