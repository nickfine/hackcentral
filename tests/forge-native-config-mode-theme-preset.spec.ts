import { describe, expect, it } from 'vitest';
import { normalizeConfigModeBrandingPatch } from '../forge-native/src/runtime/lib/configModeHelpers.mjs';

describe('config-mode branding preset normalization', () => {
  it('round-trips valid curated preset ids', () => {
    expect(normalizeConfigModeBrandingPatch({ themePreset: 'studio' })).toEqual({
      themePreset: 'studio',
    });
  });

  it('normalizes explicit empty preset values to default', () => {
    expect(normalizeConfigModeBrandingPatch({ themePreset: '   ' })).toEqual({
      themePreset: 'default',
    });
  });

  it('rejects invalid explicit preset values', () => {
    expect(() => normalizeConfigModeBrandingPatch({ themePreset: 'sunset' })).toThrow(
      'Invalid theme preset: sunset'
    );
  });
});
