import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function readSource(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('admin branding live preview contract', () => {
  it('streams branding edits into transient admin preview state without touching config-mode draft state', async () => {
    const adminSource = await readSource('forge-native/static/runtime-frontend/src/components/AdminPanel.jsx');

    expect(adminSource).toContain('savedBrandingBaseline = {}');
    expect(adminSource).toContain('onBrandingPreviewChange,');
    expect(adminSource).toContain('onBrandingPreviewClear,');
    expect(adminSource).toContain('onBrandingSaved,');
    expect(adminSource).toContain("const updateBrandingFormField = useCallback((field, value) => {");
    expect(adminSource).toContain("const handleThemePresetChange = useCallback((presetId) => {");
    expect(adminSource).toContain("const handleThemePreferenceChange = useCallback((value) => {");
    expect(adminSource).toContain("const handleAccentColorChange = useCallback((value) => {");
    expect(adminSource).toContain("const handleBrandingImageUrlChange = useCallback((field, value) => {");
    expect(adminSource).toContain("const normalizedSavedBrandingBaseline = useMemo(");
    expect(adminSource).toContain("const normalizedBrandingForm = useMemo(");
    expect(adminSource).toContain("onBrandingPreviewChange?.(normalizedBrandingForm);");
    expect(adminSource).toContain("onBrandingPreviewClear?.();");
    expect(adminSource).toContain("onClick={() => handleThemePresetChange(presetId)}");
    expect(adminSource).toContain("onChange={(event) => handleAccentColorChange(event.target.value)}");
    expect(adminSource).toContain("onChange={(e) => handleBrandingImageUrlChange('bannerImageUrl', e.target.value)}");
    expect(adminSource).toContain("onChange={(e) => handleBrandingImageUrlChange('heroIconImageUrl', e.target.value)}");
    expect(adminSource).toContain("onChange={(e) => handleBrandingImageUrlChange('newToHackdayImageUrl', e.target.value)}");
    expect(adminSource).toContain("onChange={(value) => handleThemePreferenceChange(value)}");
    expect(adminSource).not.toContain("configMode.setFieldValue(`branding.${field}`, value);");
    expect(adminSource).not.toContain("configMode.setFieldValue('branding.themePreset', nextThemePreset);");
    expect(adminSource).not.toContain("configMode.setFieldValue('branding.accentColor', nextAccentColor);");
    expect(adminSource).not.toContain("configMode.setFieldValue(`branding.${assetField}`, uploaded.publicUrl);");
    expect(adminSource).toContain('newToHackdayImageUrl');
  });

  it('lets app-level transient preview override runtime branding only while admin preview is active', async () => {
    const appSource = await readSource('forge-native/static/runtime-frontend/src/App.jsx');

    expect(appSource).toContain('const [adminBrandingPreview, setAdminBrandingPreview] = useState(null);');
    expect(appSource).toContain("if (currentView === 'admin') return;");
    expect(appSource).toContain('const persistedBrandingBaseline = configModeSnapshot?.effectiveBranding && typeof configModeSnapshot.effectiveBranding === \'object\'');
    expect(appSource).toContain("currentView === 'admin' && adminBrandingPreview && typeof adminBrandingPreview === 'object'");
    expect(appSource).toContain('savedBrandingBaseline={persistedBrandingBaseline}');
    expect(appSource).toContain('onBrandingPreviewChange={handleAdminBrandingPreviewChange}');
    expect(appSource).toContain('onBrandingPreviewClear={handleAdminBrandingPreviewClear}');
    expect(appSource).toContain('onBrandingSaved={handleAdminBrandingSaved}');
    expect(appSource).toContain('onStateChange={setConfigModeSnapshot}');
    expect(appSource).toContain("eventDefaultTheme: ['light', 'dark', 'system'].includes(effectiveEventBranding?.themePreference)");
    expect(appSource).toContain("eventDefaultThemePreset: normalizeThemePreset(effectiveEventBranding?.themePreset)");
  });
});
