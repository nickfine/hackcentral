import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function readSource(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('runtime theme preset application contract', () => {
  it('applies color mode and theme preset independently at the root', async () => {
    const source = await readSource('forge-native/static/runtime-frontend/src/hooks/useTheme.js');

    expect(source).toContain("const { eventDefaultTheme, eventDefaultThemePreset, pageId } = useContext(ThemeContext);");
    expect(source).toContain("const themePreset = normalizeThemePreset(eventDefaultThemePreset);");
    expect(source).toContain("root.setAttribute('data-color-mode', resolvedTheme);");
    expect(source).toContain("root.setAttribute('data-theme-preset', themePreset);");
    expect(source).toContain('}, [resolvedTheme, themePreset]);');
  });

  it('preserves stored page mode preference when preset changes', async () => {
    const source = await readSource('forge-native/static/runtime-frontend/src/hooks/useTheme.js');

    expect(source).toContain("const stored = getStoredTheme(themeKey);");
    expect(source).toContain('if (stored) {');
    expect(source).toContain('setThemeState(stored);');
    expect(source).toContain('return;');
    expect(source).toContain(
      "if (pageId && eventDefaultTheme && !getStoredTheme(themeKey) && theme !== eventDefaultTheme) {"
    );
  });

  it('keeps system mode behavior while the preset remains applied', async () => {
    const source = await readSource('forge-native/static/runtime-frontend/src/hooks/useTheme.js');

    expect(source).toContain("theme === 'system'");
    expect(source).toContain("window.matchMedia('(prefers-color-scheme: dark)').matches");
    expect(source).toContain("const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');");
    expect(source).toContain("const handleChange = () => setThemeState('system');");
    expect(source).toContain('themePreset,');
  });
});
