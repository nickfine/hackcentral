import { getRegistryField, CONFIG_SOURCE_KINDS } from './contentRegistry';

export function resolveContentOverrideValue({ key, fallback = '', publishedValues = {}, draftValues = {}, useDraft = false }) {
  const published = typeof publishedValues?.[key] === 'string' ? publishedValues[key] : undefined;
  const draft = typeof draftValues?.[key] === 'string' ? draftValues[key] : undefined;

  if (useDraft && draft !== undefined) return draft;
  if (published !== undefined) return published;
  return fallback;
}

export function mergeBrandingPreview(baseBranding = {}, draftBranding = null, useDraft = false) {
  if (!useDraft || !draftBranding || typeof draftBranding !== 'object') {
    return baseBranding || {};
  }
  return {
    ...(baseBranding || {}),
    ...draftBranding,
  };
}

export function mergeMotdPreview(baseMotd = null, draftMotd = null, useDraft = false) {
  const base = baseMotd && typeof baseMotd === 'object'
    ? {
        title: typeof baseMotd.title === 'string' ? baseMotd.title : '',
        message: typeof baseMotd.message === 'string' ? baseMotd.message : '',
        priority: typeof baseMotd.priority === 'string' ? baseMotd.priority : 'info',
        updatedAt: baseMotd.updatedAt || null,
        updatedBy: baseMotd.updatedBy || null,
      }
    : null;

  if (!useDraft || !draftMotd || typeof draftMotd !== 'object') {
    return base;
  }

  const merged = {
    title: typeof draftMotd.title === 'string' ? draftMotd.title : (base?.title || ''),
    message: typeof draftMotd.message === 'string' ? draftMotd.message : (base?.message || ''),
    priority: typeof draftMotd.priority === 'string' ? draftMotd.priority : (base?.priority || 'info'),
    updatedAt: draftMotd.updatedAt || base?.updatedAt || null,
    updatedBy: draftMotd.updatedBy || base?.updatedBy || null,
  };

  if (!merged.message.trim()) {
    return merged; // caller decides whether to hide empty state
  }

  return merged;
}

export function getDraftPatchValue(patch = {}, key) {
  const field = getRegistryField(key);
  if (!field) return undefined;

  if (field.sourceKind === CONFIG_SOURCE_KINDS.CONTENT_OVERRIDE) {
    return patch?.contentOverrides?.[key];
  }

  if (field.sourceKind === CONFIG_SOURCE_KINDS.BRANDING) {
    const prop = key.split('.').slice(1).join('.');
    return prop ? patch?.branding?.[prop] : undefined;
  }

  if (field.sourceKind === CONFIG_SOURCE_KINDS.MOTD) {
    const motdProp = key.split('.').slice(2).join('.');
    return motdProp ? patch?.motdMessage?.[motdProp] : undefined;
  }

  return undefined;
}
