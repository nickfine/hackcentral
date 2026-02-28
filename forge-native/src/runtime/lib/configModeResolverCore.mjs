import { assertExpectedConfigModeDraftVersion } from './configModeHelpers.mjs';

export function assertConfigModeAccessAllowed({ isPlatformAdmin = false, isEventAdmin = false } = {}) {
  if (!isPlatformAdmin && !isEventAdmin) {
    throw new Error('Only platform admins or event admins can use Config Mode');
  }
  return true;
}

export function parseExpectedDraftVersion(rawValue, { required = false } = {}) {
  if (rawValue == null) {
    if (required) {
      throw new Error('expectedDraftVersion is required');
    }
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error('expectedDraftVersion must be a number or null');
  }

  return parsed;
}

export async function runSaveConfigModeDraftCore({
  access,
  payload = {},
  currentDraft,
  publishedContentOverrides,
  nowIso = new Date().toISOString(),
  deps,
}) {
  if (!deps || typeof deps !== 'object') {
    throw new Error('runSaveConfigModeDraftCore requires deps');
  }

  const {
    normalizePatch,
    mergePatches,
    persistDraft,
    syncEventDraftColumn,
    buildResponse,
    logger = console,
  } = deps;

  if (typeof normalizePatch !== 'function') throw new Error('normalizePatch dependency is required');
  if (typeof mergePatches !== 'function') throw new Error('mergePatches dependency is required');
  if (typeof persistDraft !== 'function') throw new Error('persistDraft dependency is required');
  if (typeof syncEventDraftColumn !== 'function') throw new Error('syncEventDraftColumn dependency is required');
  if (typeof buildResponse !== 'function') throw new Error('buildResponse dependency is required');

  const expectedDraftVersion = parseExpectedDraftVersion(payload.expectedDraftVersion, { required: false });
  const patch = normalizePatch(payload.patch || {}, { strict: true });

  assertExpectedConfigModeDraftVersion({
    currentDraft,
    expectedDraftVersion,
  });

  const currentDraftVersion = currentDraft?.draftVersion ?? null;
  const mergedPatch = mergePatches(currentDraft?.patch, patch);
  const nextDraft = {
    schemaVersion: 1,
    draftVersion: (currentDraftVersion ?? 0) + 1,
    basePublishedVersion: publishedContentOverrides?.version || 0,
    updatedAt: nowIso,
    updatedBy: {
      accountId: access.actor.accountId,
      displayName: access.actor.displayName,
    },
    patch: mergedPatch,
  };

  await persistDraft({ access, nextDraft, nowIso });

  try {
    await syncEventDraftColumn({ access, nextDraft, nowIso });
  } catch (err) {
    logger.warn?.(
      'saveEventConfigDraft: Event.event_config_draft update exception (storage persisted):',
      err?.message || String(err)
    );
  }

  return buildResponse({ access, nextDraft, nowIso });
}

export async function runPublishConfigModeDraftCore({
  access,
  payload = {},
  currentDraft,
  nowIso = new Date().toISOString(),
  deps,
}) {
  if (!deps || typeof deps !== 'object') {
    throw new Error('runPublishConfigModeDraftCore requires deps');
  }

  const {
    normalizePatch,
    applyBranding,
    applyMotdMessage,
    applyContentOverrides,
    clearDraft,
    syncEventColumns,
    buildResponse,
    logger = console,
  } = deps;

  if (typeof normalizePatch !== 'function') throw new Error('normalizePatch dependency is required');
  if (typeof applyBranding !== 'function') throw new Error('applyBranding dependency is required');
  if (typeof applyMotdMessage !== 'function') throw new Error('applyMotdMessage dependency is required');
  if (typeof applyContentOverrides !== 'function') throw new Error('applyContentOverrides dependency is required');
  if (typeof clearDraft !== 'function') throw new Error('clearDraft dependency is required');
  if (typeof syncEventColumns !== 'function') throw new Error('syncEventColumns dependency is required');
  if (typeof buildResponse !== 'function') throw new Error('buildResponse dependency is required');

  const expectedDraftVersion = parseExpectedDraftVersion(payload.expectedDraftVersion, { required: true });

  if (!currentDraft) {
    throw new Error('No draft found for this event');
  }

  assertExpectedConfigModeDraftVersion({
    currentDraft,
    expectedDraftVersion,
  });

  const appliedSections = [];

  try {
    const patch = normalizePatch(currentDraft.patch, { strict: true });

    if (Object.keys(patch.branding || {}).length > 0) {
      await applyBranding({ patchBranding: patch.branding, access, nowIso });
      appliedSections.push('branding');
    }

    if (Object.keys(patch.motdMessage || {}).length > 0) {
      await applyMotdMessage({ patchMotdMessage: patch.motdMessage, access, nowIso });
      appliedSections.push('motdMessage');
    }

    let nextPublishedContentOverrides = null;
    if (Object.keys(patch.contentOverrides || {}).length > 0) {
      nextPublishedContentOverrides = await applyContentOverrides({
        patchContentOverrides: patch.contentOverrides,
        access,
        nowIso,
      });
      appliedSections.push('contentOverrides');
    }

    await clearDraft({ access, nowIso });

    try {
      await syncEventColumns({ access, nowIso, nextPublishedContentOverrides });
    } catch (err) {
      logger.warn?.(
        'publishEventConfigDraft: Event column sync exception (storage/source updates applied):',
        err?.message || String(err)
      );
    }

    const response = await buildResponse({ access, nowIso });
    return {
      ...response,
      appliedSections,
      publishedAt: nowIso,
    };
  } catch (error) {
    logger.error?.('publishEventConfigDraft error:', error);
    throw new Error(
      `Failed to publish config draft after [${appliedSections.join(', ') || 'none'}]: ${error.message}`
    );
  }
}
