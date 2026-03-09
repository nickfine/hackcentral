export const DEFAULT_THEME_PRESET = 'default';

export const THEME_PRESET_META = Object.freeze({
  default: {
    id: 'default',
    label: 'Default',
    description: 'Clean and professional - teal accents on neutral surfaces',
    accent: '#14b8a6',
    accentDark: '#2dd4bf',
  },
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    description: 'Warm and considered - olive tones on paper-like surfaces',
    accent: '#5c6b5e',
    accentDark: '#8fa893',
  },
  summit: {
    id: 'summit',
    label: 'Summit',
    description: 'Elevated and confident - gold accents with deep navy hero',
    accent: '#b8860b',
    accentDark: '#d4a843',
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    description: 'Bold and creative - electric violet with cinematic surfaces',
    accent: '#7c3aed',
    accentDark: '#a78bfa',
  },
});

export const THEME_PRESET_VALUES = Object.freeze(Object.keys(THEME_PRESET_META));

export function normalizeThemePreset(value) {
  return THEME_PRESET_VALUES.includes(value) ? value : DEFAULT_THEME_PRESET;
}

export function getThemePresetMeta(value) {
  return THEME_PRESET_META[normalizeThemePreset(value)];
}

export function getThemePresetAccent(value, mode = 'light') {
  const preset = getThemePresetMeta(value);
  return mode === 'dark' ? preset.accentDark : preset.accent;
}
