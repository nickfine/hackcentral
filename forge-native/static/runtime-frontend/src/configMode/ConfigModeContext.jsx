import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeAdminMessage } from '../lib/normalizeAdminMessage';
import {
  CONFIG_MODE_PHASE1_FLAG,
  CONFIG_SOURCE_KINDS,
  CONTENT_REGISTRY_BY_KEY,
  getRegistryField,
  validateRegistryFieldValue,
} from './contentRegistry';
import {
  getDraftPatchValue,
  mergeBrandingPreview,
  mergeMotdPreview,
  resolveContentOverrideValue,
} from './resolveContent';

const ConfigModeContext = createContext(null);

const EMPTY_DRAFT_PATCH = Object.freeze({
  branding: {},
  motdMessage: {},
  contentOverrides: {},
});

const EMPTY_PUBLISHED_OVERRIDES = Object.freeze({
  schemaVersion: 1,
  version: 0,
  updatedAt: null,
  updatedBy: null,
  values: {},
});

function getLocalConfigStorageKey(eventId) {
  return eventId ? `hd26forge:config-mode:v1:${eventId}` : null;
}

function clonePatch(patch) {
  return {
    branding: { ...(patch?.branding || {}) },
    motdMessage: { ...(patch?.motdMessage || {}) },
    contentOverrides: { ...(patch?.contentOverrides || {}) },
  };
}

function normalizePublishedOverridesEnvelope(value) {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_PUBLISHED_OVERRIDES, values: {} };
  }

  const values = {};
  if (value.values && typeof value.values === 'object') {
    for (const [key, raw] of Object.entries(value.values)) {
      if (!(key in CONTENT_REGISTRY_BY_KEY)) continue;
      if (typeof raw !== 'string') continue;
      values[key] = raw;
    }
  }

  return {
    schemaVersion: 1,
    version: Number.isFinite(Number(value.version)) ? Number(value.version) : 0,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: value.updatedBy && typeof value.updatedBy === 'object' ? value.updatedBy : null,
    values,
  };
}

function normalizeDraftPatch(value) {
  const patch = clonePatch(EMPTY_DRAFT_PATCH);
  if (!value || typeof value !== 'object') return patch;

  if (value.branding && typeof value.branding === 'object') {
    for (const [key, raw] of Object.entries(value.branding)) {
      if (typeof raw !== 'string') continue;
      patch.branding[key] = raw;
    }
  }

  if (value.motdMessage && typeof value.motdMessage === 'object') {
    for (const [key, raw] of Object.entries(value.motdMessage)) {
      if (typeof raw !== 'string') continue;
      patch.motdMessage[key] = raw;
    }
  }

  if (value.contentOverrides && typeof value.contentOverrides === 'object') {
    for (const [key, raw] of Object.entries(value.contentOverrides)) {
      if (!(key in CONTENT_REGISTRY_BY_KEY)) continue;
      if (typeof raw !== 'string') continue;
      patch.contentOverrides[key] = raw;
    }
  }

  return patch;
}

function normalizeDraftEnvelope(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return {
    schemaVersion: 1,
    draftVersion: Number.isFinite(Number(value.draftVersion)) ? Number(value.draftVersion) : 0,
    basePublishedVersion: Number.isFinite(Number(value.basePublishedVersion)) ? Number(value.basePublishedVersion) : 0,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: value.updatedBy && typeof value.updatedBy === 'object' ? value.updatedBy : null,
    patch: normalizeDraftPatch(value.patch),
  };
}

function normalizeConfigModeStateResponse(payload, fallbackBranding, fallbackMotd) {
  const capabilities = payload?.configModeCapabilities && typeof payload.configModeCapabilities === 'object'
    ? payload.configModeCapabilities
    : payload?.capabilities && typeof payload.capabilities === 'object'
      ? payload.capabilities
      : {};

  const publishedOverrides = normalizePublishedOverridesEnvelope(
    payload?.publishedOverrides || payload?.publishedContentOverrides || payload?.contentOverrides || payload?.event_content_overrides
  );

  const draftEnvelope = normalizeDraftEnvelope(payload?.draftEnvelope || payload?.draft || payload?.event_config_draft);
  const publishedBranding = payload?.publishedBranding && typeof payload.publishedBranding === 'object'
    ? payload.publishedBranding
    : payload?.branding && typeof payload.branding === 'object'
    ? payload.branding
    : (fallbackBranding || {});
  const publishedMotdMessage = normalizeAdminMessage(
    payload?.publishedMotdMessage ?? payload?.motdMessage,
    payload?.motd || ''
  ) || normalizeAdminMessage(fallbackMotd, fallbackMotd?.message || '');

  return {
    capabilities,
    publishedOverrides,
    draftEnvelope,
    publishedBranding,
    publishedMotdMessage: publishedMotdMessage?.message ? publishedMotdMessage : (publishedMotdMessage || null),
  };
}

function readLocalConfigState({ eventId, fallbackBranding, fallbackMotd }) {
  const key = getLocalConfigStorageKey(eventId);
  if (!key || typeof window === 'undefined') {
    return normalizeConfigModeStateResponse({}, fallbackBranding, fallbackMotd);
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return normalizeConfigModeStateResponse({}, fallbackBranding, fallbackMotd);
    }
    const parsed = JSON.parse(raw);
    return normalizeConfigModeStateResponse(parsed, fallbackBranding, fallbackMotd);
  } catch (err) {
    console.warn('[ConfigMode] Failed to read local config state:', err);
    return normalizeConfigModeStateResponse({}, fallbackBranding, fallbackMotd);
  }
}

function writeLocalConfigState(eventId, state) {
  const key = getLocalConfigStorageKey(eventId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.warn('[ConfigMode] Failed to persist local config state:', err);
  }
}

async function invokeForgeResolver(name, payload) {
  const { invoke } = await import('@forge/bridge');
  return invoke(name, payload);
}

function isConflictError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('conflict') || message.includes('draftversion');
}

function buildUpdatedBy(user) {
  return {
    accountId: user?.atlassianAccountId || user?.id || null,
    displayName: user?.name || user?.displayName || 'Admin',
  };
}

function hasAnyPatchValue(patch) {
  if (!patch || typeof patch !== 'object') return false;
  return (
    Object.keys(patch.branding || {}).length > 0 ||
    Object.keys(patch.motdMessage || {}).length > 0 ||
    Object.keys(patch.contentOverrides || {}).length > 0
  );
}

function sanitizePatch(patch) {
  const next = clonePatch(EMPTY_DRAFT_PATCH);
  if (!patch || typeof patch !== 'object') return next;

  for (const fieldKey of Object.keys(CONTENT_REGISTRY_BY_KEY)) {
    const field = CONTENT_REGISTRY_BY_KEY[fieldKey];
    const value = getDraftPatchValue(patch, fieldKey);
    if (value === undefined) continue;
    const normalized = value == null ? '' : String(value);
    const validation = validateRegistryFieldValue(field, normalized);
    if (!validation.valid) continue;

    if (field.sourceKind === CONFIG_SOURCE_KINDS.BRANDING) {
      const prop = fieldKey.split('.').slice(1).join('.');
      next.branding[prop] = normalized;
    } else if (field.sourceKind === CONFIG_SOURCE_KINDS.MOTD) {
      const prop = fieldKey.split('.').slice(2).join('.');
      next.motdMessage[prop] = normalized;
    } else if (field.sourceKind === CONFIG_SOURCE_KINDS.CONTENT_OVERRIDE) {
      next.contentOverrides[fieldKey] = normalized;
    }
  }

  return next;
}

function applyFieldToPatch(prevPatch, key, rawValue) {
  const field = getRegistryField(key);
  if (!field) return prevPatch;

  const nextValue = rawValue == null ? '' : String(rawValue);
  const validation = validateRegistryFieldValue(field, nextValue);
  if (!validation.valid) {
    throw new Error(validation.error || `Invalid value for ${key}`);
  }

  const next = clonePatch(prevPatch);

  if (field.sourceKind === CONFIG_SOURCE_KINDS.BRANDING) {
    const prop = key.split('.').slice(1).join('.');
    next.branding[prop] = nextValue;
    return next;
  }

  if (field.sourceKind === CONFIG_SOURCE_KINDS.MOTD) {
    const prop = key.split('.').slice(2).join('.');
    next.motdMessage[prop] = nextValue;
    return next;
  }

  next.contentOverrides[key] = nextValue;
  return next;
}

export function ConfigModeProvider({
  children,
  user,
  isEventAdmin = false,
  eventId = null,
  eventBranding = {},
  eventAdminMessage = null,
  isForgeHost = false,
  onRefreshEventPhase,
  onStateChange,
  onNavigate,
}) {
  const baseCanEdit = Boolean(
    CONFIG_MODE_PHASE1_FLAG &&
    eventId &&
    (user?.role === 'admin' || isEventAdmin)
  );

  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingConfirmType, setPendingConfirmType] = useState(null);

  const [capabilities, setCapabilities] = useState({ enabled: CONFIG_MODE_PHASE1_FLAG, canUseConfigMode: baseCanEdit });
  const [draftEnvelope, setDraftEnvelope] = useState(null);
  const [workingPatch, setWorkingPatch] = useState(clonePatch(EMPTY_DRAFT_PATCH));
  const [publishedOverrides, setPublishedOverrides] = useState({ ...EMPTY_PUBLISHED_OVERRIDES, values: {} });
  const [publishedBranding, setPublishedBranding] = useState(eventBranding || {});
  const [publishedMotdMessage, setPublishedMotdMessage] = useState(
    normalizeAdminMessage(eventAdminMessage, eventAdminMessage?.message || eventAdminMessage || '') || null
  );

  const loadedEventIdRef = useRef(null);

  const canEdit = Boolean(
    baseCanEdit &&
    (capabilities?.canUseConfigMode ?? true) &&
    (capabilities?.enabled ?? true)
  );

  const loadState = useCallback(async () => {
    if (!baseCanEdit || !eventId) return;
    setIsLoading(true);
    setSaveError(null);
    setConflict(false);
    setPublishSuccess(null);

    try {
      let response;
      if (isForgeHost) {
        response = await invokeForgeResolver('getEventConfigModeState', {});
      } else {
        response = readLocalConfigState({ eventId, fallbackBranding: eventBranding, fallbackMotd: eventAdminMessage });
      }

      const normalized = normalizeConfigModeStateResponse(response, eventBranding, eventAdminMessage);
      setCapabilities((prev) => ({ ...prev, ...normalized.capabilities, enabled: CONFIG_MODE_PHASE1_FLAG }));
      setPublishedOverrides(normalized.publishedOverrides);
      setDraftEnvelope(normalized.draftEnvelope);
      setWorkingPatch(normalized.draftEnvelope?.patch ? clonePatch(normalized.draftEnvelope.patch) : clonePatch(EMPTY_DRAFT_PATCH));
      setPublishedBranding(normalized.publishedBranding || (eventBranding || {}));
      setPublishedMotdMessage(normalized.publishedMotdMessage || normalizeAdminMessage(eventAdminMessage, eventAdminMessage?.message || eventAdminMessage || ''));
      setHasUnsavedChanges(false);
      loadedEventIdRef.current = eventId;
    } catch (err) {
      console.error('[ConfigMode] Failed to load state:', err);
      setSaveError(err?.message || 'Failed to load config mode state');
    } finally {
      setIsLoading(false);
    }
  }, [baseCanEdit, eventId, isForgeHost, eventBranding, eventAdminMessage]);

  useEffect(() => {
    setPublishedBranding(eventBranding || {});
  }, [eventBranding]);

  useEffect(() => {
    setPublishedMotdMessage(normalizeAdminMessage(eventAdminMessage, eventAdminMessage?.message || eventAdminMessage || '') || null);
  }, [eventAdminMessage]);

  useEffect(() => {
    if (!baseCanEdit || !eventId) {
      setIsEnabled(false);
      setIsDrawerOpen(false);
      setEditingKey(null);
      setDraftEnvelope(null);
      setWorkingPatch(clonePatch(EMPTY_DRAFT_PATCH));
      setPublishedOverrides({ ...EMPTY_PUBLISHED_OVERRIDES, values: {} });
      setHasUnsavedChanges(false);
      setPendingConfirmType(null);
      setPublishSuccess(null);
      loadedEventIdRef.current = null;
      return;
    }

    if (loadedEventIdRef.current !== eventId) {
      loadState();
    }
  }, [baseCanEdit, eventId, loadState]);

  const effectiveBranding = useMemo(
    () => mergeBrandingPreview(publishedBranding || eventBranding || {}, workingPatch.branding, isEnabled && canEdit),
    [publishedBranding, eventBranding, workingPatch.branding, isEnabled, canEdit]
  );

  const effectiveMotdMessage = useMemo(
    () => mergeMotdPreview(publishedMotdMessage || eventAdminMessage || null, workingPatch.motdMessage, isEnabled && canEdit),
    [publishedMotdMessage, eventAdminMessage, workingPatch.motdMessage, isEnabled, canEdit]
  );

  const contentDraftValues = workingPatch.contentOverrides || {};
  const contentPublishedValues = publishedOverrides.values || {};

  const getFieldValue = useCallback((key, fallback = '') => {
    const field = getRegistryField(key);
    if (!field) return fallback;

    if (field.sourceKind === CONFIG_SOURCE_KINDS.CONTENT_OVERRIDE) {
      return resolveContentOverrideValue({
        key,
        fallback,
        publishedValues: contentPublishedValues,
        draftValues: contentDraftValues,
        useDraft: isEnabled && canEdit,
      });
    }

    if (field.sourceKind === CONFIG_SOURCE_KINDS.BRANDING) {
      const prop = key.split('.').slice(1).join('.');
      const value = effectiveBranding?.[prop];
      return value == null ? fallback : String(value);
    }

    if (field.sourceKind === CONFIG_SOURCE_KINDS.MOTD) {
      const prop = key.split('.').slice(2).join('.');
      const value = effectiveMotdMessage?.[prop];
      return value == null ? fallback : String(value);
    }

    return fallback;
  }, [contentPublishedValues, contentDraftValues, effectiveBranding, effectiveMotdMessage, isEnabled, canEdit]);

  const resolveEditableValue = useCallback((key, fallback = '') => getFieldValue(key, fallback), [getFieldValue]);

  const setFieldValue = useCallback((key, value) => {
    if (!canEdit) return;
    setSaveError(null);
    setConflict(false);
    setPublishSuccess(null);
    setWorkingPatch((prev) => {
      const next = applyFieldToPatch(prev, key, value);
      return next;
    });
    setHasUnsavedChanges(true);
  }, [canEdit]);

  const persistLocalState = useCallback((nextState) => {
    writeLocalConfigState(eventId, nextState);
  }, [eventId]);

  const saveDraft = useCallback(async ({ silent = false } = {}) => {
    if (!canEdit || !eventId) return { success: false, skipped: true };
    setIsSavingDraft(true);
    if (!silent) {
      setSaveError(null);
      setConflict(false);
      setPublishSuccess(null);
    }

    try {
      const sanitizedPatch = sanitizePatch(workingPatch);
      const expectedDraftVersion = draftEnvelope?.draftVersion ?? null;

      if (isForgeHost) {
        const result = await invokeForgeResolver('saveEventConfigDraft', {
          expectedDraftVersion,
          patch: sanitizedPatch,
        });
        const nextDraft = normalizeDraftEnvelope(result?.draft || result);
        if (!nextDraft) {
          throw new Error('Draft save returned no draft payload');
        }
        setDraftEnvelope(nextDraft);
        setWorkingPatch(clonePatch(nextDraft.patch));
        setHasUnsavedChanges(false);
        return { success: true, draft: nextDraft };
      }

      const localState = readLocalConfigState({ eventId, fallbackBranding: publishedBranding, fallbackMotd: publishedMotdMessage });
      const nextDraftVersion = (expectedDraftVersion ?? localState.draftEnvelope?.draftVersion ?? 0) + 1;
      const nextDraft = {
        schemaVersion: 1,
        draftVersion: nextDraftVersion,
        basePublishedVersion: localState.publishedOverrides?.version || 0,
        updatedAt: new Date().toISOString(),
        updatedBy: buildUpdatedBy(user),
        patch: sanitizedPatch,
      };

      persistLocalState({
        capabilities: { enabled: true, canUseConfigMode: true },
        draft: nextDraft,
        publishedContentOverrides: localState.publishedOverrides,
        branding: localState.publishedBranding || publishedBranding || {},
        motdMessage: localState.publishedMotdMessage || publishedMotdMessage || null,
      });

      setDraftEnvelope(nextDraft);
      setWorkingPatch(clonePatch(nextDraft.patch));
      setHasUnsavedChanges(false);
      return { success: true, draft: nextDraft };
    } catch (err) {
      console.error('[ConfigMode] saveDraft failed:', err);
      if (isConflictError(err)) {
        setConflict(true);
      }
      setSaveError(err?.message || 'Failed to save draft');
      return { success: false, error: err };
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    canEdit,
    eventId,
    workingPatch,
    draftEnvelope,
    isForgeHost,
    persistLocalState,
    user,
    publishedBranding,
    publishedMotdMessage,
  ]);

  const publishDraft = useCallback(async () => {
    if (!canEdit || !eventId) return { success: false, skipped: true };
    setIsPublishing(true);
    setSaveError(null);
    setConflict(false);
    setPublishSuccess(null);

    try {
      let currentDraft = draftEnvelope;
      if (hasUnsavedChanges || !currentDraft) {
        const saveResult = await saveDraft({ silent: true });
        if (!saveResult.success) {
          throw saveResult.error || new Error('Failed to save draft before publish');
        }
        currentDraft = saveResult.draft;
      }

      if (!currentDraft || !hasAnyPatchValue(currentDraft.patch)) {
        throw new Error('No draft changes to publish');
      }

      if (isForgeHost) {
        const result = await invokeForgeResolver('publishEventConfigDraft', {
          expectedDraftVersion: currentDraft.draftVersion,
        });
        const normalized = normalizeConfigModeStateResponse(result, eventBranding, eventAdminMessage);
        setPublishedOverrides(normalized.publishedOverrides);
        setPublishedBranding(normalized.publishedBranding || eventBranding || {});
        setPublishedMotdMessage(normalized.publishedMotdMessage || null);
        setDraftEnvelope(null);
        setWorkingPatch(clonePatch(EMPTY_DRAFT_PATCH));
        setHasUnsavedChanges(false);
        setEditingKey(null);
        setPublishSuccess({
          at: result?.publishedAt || new Date().toISOString(),
          message: 'Published successfully. Participant view is now updated.',
        });
        try {
          await onRefreshEventPhase?.();
        } catch (refreshErr) {
          console.warn('[ConfigMode] refresh after publish failed:', refreshErr);
        }
        return { success: true, result };
      }

      const localState = readLocalConfigState({ eventId, fallbackBranding: publishedBranding, fallbackMotd: publishedMotdMessage });
      const nextPublishedVersion = (localState.publishedOverrides?.version || 0) + 1;
      const nextPublishedOverrides = normalizePublishedOverridesEnvelope({
        ...(localState.publishedOverrides || {}),
        schemaVersion: 1,
        version: nextPublishedVersion,
        updatedAt: new Date().toISOString(),
        updatedBy: buildUpdatedBy(user),
        values: {
          ...(localState.publishedOverrides?.values || {}),
          ...(currentDraft.patch?.contentOverrides || {}),
        },
      });
      const nextPublishedBranding = {
        ...(localState.publishedBranding || publishedBranding || {}),
        ...(currentDraft.patch?.branding || {}),
      };
      const nextPublishedMotd = normalizeAdminMessage({
        ...(localState.publishedMotdMessage || publishedMotdMessage || {}),
        ...(currentDraft.patch?.motdMessage || {}),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || user?.displayName || 'Admin',
      }, currentDraft.patch?.motdMessage?.message || (localState.publishedMotdMessage?.message || ''));

      persistLocalState({
        capabilities: { enabled: true, canUseConfigMode: true },
        draft: null,
        publishedContentOverrides: nextPublishedOverrides,
        branding: nextPublishedBranding,
        motdMessage: nextPublishedMotd,
      });

      setPublishedOverrides(nextPublishedOverrides);
      setPublishedBranding(nextPublishedBranding);
      setPublishedMotdMessage(nextPublishedMotd?.message ? nextPublishedMotd : nextPublishedMotd);
      setDraftEnvelope(null);
      setWorkingPatch(clonePatch(EMPTY_DRAFT_PATCH));
      setHasUnsavedChanges(false);
      setEditingKey(null);
      setPublishSuccess({
        at: new Date().toISOString(),
        message: 'Published successfully. Participant view is now updated.',
      });
      return { success: true };
    } catch (err) {
      console.error('[ConfigMode] publishDraft failed:', err);
      if (isConflictError(err)) {
        setConflict(true);
      }
      setSaveError(err?.message || 'Failed to publish draft');
      return { success: false, error: err };
    } finally {
      setIsPublishing(false);
    }
  }, [
    canEdit,
    eventId,
    draftEnvelope,
    hasUnsavedChanges,
    saveDraft,
    isForgeHost,
    eventBranding,
    eventAdminMessage,
    onRefreshEventPhase,
    publishedBranding,
    publishedMotdMessage,
    persistLocalState,
    user,
  ]);

  const discardDraft = useCallback(async () => {
    if (!canEdit || !eventId) return;
    setSaveError(null);
    setConflict(false);
    setPublishSuccess(null);

    try {
      if (isForgeHost) {
        const result = await invokeForgeResolver('discardEventConfigDraft', {});
        const nextDraft = normalizeDraftEnvelope(result?.draft || null);
        setDraftEnvelope(nextDraft);
      } else {
        const localState = readLocalConfigState({ eventId, fallbackBranding: publishedBranding, fallbackMotd: publishedMotdMessage });
        persistLocalState({
          capabilities: { enabled: true, canUseConfigMode: true },
          draft: null,
          publishedContentOverrides: localState.publishedOverrides,
          branding: localState.publishedBranding || publishedBranding || {},
          motdMessage: localState.publishedMotdMessage || publishedMotdMessage || null,
        });
        setDraftEnvelope(null);
      }

      setWorkingPatch(clonePatch(EMPTY_DRAFT_PATCH));
      setHasUnsavedChanges(false);
      setEditingKey(null);
    } catch (err) {
      console.error('[ConfigMode] discardDraft failed:', err);
      setSaveError(err?.message || 'Failed to discard draft');
    }
  }, [canEdit, eventId, isForgeHost, persistLocalState, publishedBranding, publishedMotdMessage]);

  const closeConfirmDialog = useCallback(() => {
    setPendingConfirmType(null);
  }, []);

  const enterConfigMode = useCallback(async () => {
    if (!canEdit) return;
    await loadState();
    setIsEnabled(true);
    setIsDrawerOpen(false);
    setPendingConfirmType(null);
  }, [canEdit, loadState]);

  const forceExitConfigMode = useCallback(() => {
    setIsEnabled(false);
    setIsDrawerOpen(false);
    setEditingKey(null);
    setPendingConfirmType(null);
    setPublishSuccess(null);
  }, []);

  const beginEdit = useCallback((key) => {
    if (!canEdit || !isEnabled) return;
    setEditingKey(key);
  }, [canEdit, isEnabled]);

  const endEdit = useCallback((key) => {
    setEditingKey((prev) => (key && prev === key ? null : prev));
  }, []);

  const openDrawer = useCallback(() => {
    if (!canEdit || !isEnabled) return;
    setIsDrawerOpen(true);
  }, [canEdit, isEnabled]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    if (!canEdit || !isEnabled) return;
    setIsDrawerOpen((prev) => !prev);
  }, [canEdit, isEnabled]);

  const hasDraft = Boolean(draftEnvelope || hasAnyPatchValue(workingPatch));

  const status = useMemo(() => {
    if (!isEnabled) return 'off';
    if (isPublishing) return 'publishing';
    if (isSavingDraft) return 'saving';
    if (conflict) return 'conflict';
    if (hasUnsavedChanges) return 'on_unsaved';
    if (hasDraft) return 'on_draft';
    return 'on_clean';
  }, [isEnabled, isPublishing, isSavingDraft, conflict, hasUnsavedChanges, hasDraft]);

  const changeSummary = useMemo(() => {
    const sections = [];
    const brandingCount = Object.keys(workingPatch.branding || {}).length;
    const motdCount = Object.keys(workingPatch.motdMessage || {}).length;
    const contentCount = Object.keys(workingPatch.contentOverrides || {}).length;

    if (brandingCount > 0) {
      sections.push({ id: 'branding', label: 'Branding', count: brandingCount });
    }
    if (motdCount > 0) {
      sections.push({ id: 'dashboard-message', label: 'Dashboard message', count: motdCount });
    }
    if (contentCount > 0) {
      sections.push({ id: 'content-copy', label: 'Participant copy', count: contentCount });
    }

    return {
      sections,
      totalFields: brandingCount + motdCount + contentCount,
    };
  }, [workingPatch]);

  const requestPublishDraft = useCallback(() => {
    if (!canEdit || !isEnabled) return;
    if (!hasDraft && !hasUnsavedChanges) {
      setSaveError('No draft changes to publish');
      return;
    }
    setPendingConfirmType('publish');
  }, [canEdit, isEnabled, hasDraft, hasUnsavedChanges]);

  const requestDiscardDraft = useCallback(() => {
    if (!canEdit || !isEnabled) return;
    if (!hasDraft && !hasUnsavedChanges) return;
    setPendingConfirmType('discard');
  }, [canEdit, isEnabled, hasDraft, hasUnsavedChanges]);

  const requestExitConfigMode = useCallback(() => {
    if (!canEdit || !isEnabled) return;
    if (hasUnsavedChanges) {
      setPendingConfirmType('exit');
      return;
    }
    forceExitConfigMode();
  }, [canEdit, isEnabled, hasUnsavedChanges, forceExitConfigMode]);

  const confirmDialogAction = useCallback(async () => {
    if (pendingConfirmType === 'publish') {
      const result = await publishDraft();
      if (result?.success) {
        closeConfirmDialog();
      }
      return result;
    }

    if (pendingConfirmType === 'discard') {
      await discardDraft();
      closeConfirmDialog();
      return { success: true };
    }

    if (pendingConfirmType === 'exit') {
      forceExitConfigMode();
      return { success: true };
    }

    return { success: false, skipped: true };
  }, [pendingConfirmType, publishDraft, discardDraft, closeConfirmDialog, forceExitConfigMode]);

  const confirmDialog = useMemo(() => {
    if (!pendingConfirmType) {
      return {
        isOpen: false,
        type: null,
        title: '',
        description: '',
        confirmLabel: '',
        confirmVariant: 'primary',
        sections: [],
        totalFields: 0,
      };
    }

    if (pendingConfirmType === 'publish') {
      return {
        isOpen: true,
        type: 'publish',
        title: 'Publish config changes?',
        description: 'This will make the latest config draft visible to participants.',
        confirmLabel: 'Publish changes',
        confirmVariant: 'primary',
        sections: changeSummary.sections,
        totalFields: changeSummary.totalFields,
      };
    }

    if (pendingConfirmType === 'discard') {
      return {
        isOpen: true,
        type: 'discard',
        title: 'Discard draft changes?',
        description: 'Any unpublished config edits will be removed and cannot be recovered.',
        confirmLabel: 'Discard draft',
        confirmVariant: 'danger',
        sections: [],
        totalFields: 0,
      };
    }

    return {
      isOpen: true,
      type: 'exit',
      title: 'Exit Config Mode?',
      description: 'You have unsaved changes. Exit now will keep current published content unchanged.',
      confirmLabel: 'Exit Config Mode',
      confirmVariant: 'danger',
      sections: [],
      totalFields: 0,
    };
  }, [pendingConfirmType, changeSummary]);

  const toggleConfigMode = useCallback(() => {
    if (!canEdit) return;
    if (!isEnabled) {
      enterConfigMode();
      return;
    }
    requestExitConfigMode();
  }, [canEdit, isEnabled, enterConfigMode, requestExitConfigMode]);

  const toggleSidePanel = useCallback(() => {
    toggleDrawer();
  }, [toggleDrawer]);
 
  const setSidePanelOpen = useCallback((next) => {
    const nextValue = typeof next === 'function' ? next(isDrawerOpen) : next;
    setIsDrawerOpen(Boolean(nextValue));
  }, [isDrawerOpen]);

  const navigateToAdminPanel = useCallback(() => {
    if (typeof onNavigate !== 'function') return;
    onNavigate('admin');
  }, [onNavigate]);

  useEffect(() => {
    if (typeof onStateChange !== 'function') return;
    onStateChange({
      enabled: isEnabled,
      canEdit,
      status,
      hasDraft,
      hasUnsavedChanges,
      draftVersion: draftEnvelope?.draftVersion ?? null,
      effectiveBranding,
      effectiveMotdMessage,
      publishedContentOverrides: publishedOverrides,
      configModeCapabilities: capabilities,
      isDrawerOpen,
      isLoading,
      isSavingDraft,
      isPublishing,
      saveError,
      conflict,
      publishSuccess,
    });
  }, [
    onStateChange,
    isEnabled,
    canEdit,
    status,
    hasDraft,
    hasUnsavedChanges,
    draftEnvelope,
    effectiveBranding,
    effectiveMotdMessage,
    publishedOverrides,
    capabilities,
    isDrawerOpen,
    isLoading,
    isSavingDraft,
    isPublishing,
    saveError,
    conflict,
    publishSuccess,
  ]);

  const contextValue = useMemo(() => ({
    isEnabled,
    canEdit,
    status,
    isLoading,
    isSavingDraft,
    isPublishing,
    isDrawerOpen,
    isSidePanelOpen: isDrawerOpen,
    editingKey,
    draftEnvelope,
    hasDraft,
    hasUnsavedChanges,
    saveError,
    conflict,
    publishSuccess,
    capabilities,
    publishedOverrides,
    effectiveBranding,
    effectiveMotdMessage,
    getFieldValue,
    resolveEditableValue,
    setFieldValue,
    isFieldEditable: (key) => Boolean(canEdit && getRegistryField(key)),
    beginEdit,
    endEdit,
    enterConfigMode,
    exitConfigMode: requestExitConfigMode,
    forceExitConfigMode,
    toggleConfigMode,
    saveDraft,
    publishDraft,
    discardDraft: requestDiscardDraft,
    requestPublishDraft,
    requestDiscardDraft,
    requestExitConfigMode,
    confirmDialog,
    confirmDialogAction,
    closeConfirmDialog,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    toggleSidePanel,
    setSidePanelOpen,
    navigateToAdminPanel,
    reloadConfigState: loadState,
  }), [
    isEnabled,
    canEdit,
    status,
    isLoading,
    isSavingDraft,
    isPublishing,
    isDrawerOpen,
    editingKey,
    draftEnvelope,
    hasDraft,
    hasUnsavedChanges,
    saveError,
    conflict,
    publishSuccess,
    capabilities,
    publishedOverrides,
    effectiveBranding,
    effectiveMotdMessage,
    getFieldValue,
    resolveEditableValue,
    setFieldValue,
    beginEdit,
    endEdit,
    enterConfigMode,
    requestExitConfigMode,
    forceExitConfigMode,
    toggleConfigMode,
    saveDraft,
    publishDraft,
    requestDiscardDraft,
    requestPublishDraft,
    confirmDialog,
    confirmDialogAction,
    closeConfirmDialog,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    toggleSidePanel,
    setSidePanelOpen,
    navigateToAdminPanel,
    loadState,
  ]);

  return (
    <ConfigModeContext.Provider value={contextValue}>
      {children}
    </ConfigModeContext.Provider>
  );
}

export function useConfigMode() {
  const context = useContext(ConfigModeContext);
  if (!context) {
    return {
      isEnabled: false,
      canEdit: false,
      status: 'off',
      isLoading: false,
      isSavingDraft: false,
      isPublishing: false,
      isDrawerOpen: false,
      isSidePanelOpen: false,
      editingKey: null,
      draftEnvelope: null,
      hasDraft: false,
      hasUnsavedChanges: false,
      saveError: null,
      conflict: false,
      publishSuccess: null,
      capabilities: { enabled: false, canUseConfigMode: false },
      publishedOverrides: EMPTY_PUBLISHED_OVERRIDES,
      effectiveBranding: {},
      effectiveMotdMessage: null,
      getFieldValue: (_key, fallback = '') => fallback,
      resolveEditableValue: (_key, fallback = '') => fallback,
      setFieldValue: () => {},
      isFieldEditable: () => false,
      beginEdit: () => {},
      endEdit: () => {},
      enterConfigMode: () => {},
      exitConfigMode: () => {},
      forceExitConfigMode: () => {},
      toggleConfigMode: () => {},
      saveDraft: async () => ({ success: false, skipped: true }),
      publishDraft: async () => ({ success: false, skipped: true }),
      discardDraft: async () => {},
      requestPublishDraft: () => {},
      requestDiscardDraft: () => {},
      requestExitConfigMode: () => {},
      confirmDialog: {
        isOpen: false,
        type: null,
        title: '',
        description: '',
        confirmLabel: '',
        confirmVariant: 'primary',
        sections: [],
        totalFields: 0,
      },
      confirmDialogAction: async () => ({ success: false, skipped: true }),
      closeConfirmDialog: () => {},
      openDrawer: () => {},
      closeDrawer: () => {},
      toggleDrawer: () => {},
      toggleSidePanel: () => {},
      setSidePanelOpen: () => {},
      navigateToAdminPanel: () => {},
      reloadConfigState: async () => {},
    };
  }
  return context;
}

export default ConfigModeContext;
