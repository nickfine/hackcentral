import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('create wizard branding ownership contract', () => {
  it('removes create-time branding fields and keeps branding in the child runtime', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/frontend/src/App.tsx'),
      'utf8'
    );

    expect(source).toContain("['Basic Info', 'Schedule', 'Rules', 'Review']");
    expect(source).toContain("Child page → Admin Panel → Branding");
    expect(source).not.toContain('setWBannerMessage');
    expect(source).not.toContain('setWAccentColor');
    expect(source).not.toContain('setWBannerImageUrl');
    expect(source).not.toContain('setWThemePreference');
    expect(source).not.toContain('bannerMessage: wBannerMessage');
    expect(source).not.toContain('accentColor: wAccentColor');
    expect(source).not.toContain('bannerImageUrl: wBannerImageUrl');
    expect(source).not.toContain('themePreference: wThemePreference');
    expect(source).not.toContain('review-color-chip');
  });
});
