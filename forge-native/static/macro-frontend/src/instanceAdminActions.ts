import type { LifecycleStatus, SyncStatus } from './types';

interface ActionState {
  disabled: boolean;
  reason: string | null;
}

export interface InstanceAdminActionState {
  globalHint: string | null;
  advanceLifecycle: ActionState;
  completeSync: ActionState;
  retrySync: ActionState;
  deleteDraft: ActionState;
}

export function isReadOnlyLifecycle(status: LifecycleStatus | null | undefined): boolean {
  return status === 'completed' || status === 'archived';
}

export function getInstanceAdminActionState(input: {
  lifecycleStatus: LifecycleStatus | null | undefined;
  syncStatus: SyncStatus | null | undefined;
  canAdminInstance: boolean;
  isPrimaryAdmin: boolean;
  saving: boolean;
}): InstanceAdminActionState {
  const { lifecycleStatus, syncStatus, canAdminInstance, isPrimaryAdmin, saving } = input;
  const readOnly = isReadOnlyLifecycle(lifecycleStatus);
  const lifecycleKnown = Boolean(lifecycleStatus);

  const lifecycleSyncBaseReason = !lifecycleKnown
    ? 'Instance context is unavailable.'
    : saving
      ? 'Another action is currently in progress.'
      : !canAdminInstance
        ? 'Only instance admins can run lifecycle or sync actions.'
        : readOnly
          ? 'Instance is read-only after completion; lifecycle and sync actions are disabled.'
          : null;

  const advanceLifecycle: ActionState = {
    disabled: Boolean(lifecycleSyncBaseReason),
    reason: lifecycleSyncBaseReason,
  };

  const completeSync: ActionState = {
    disabled: Boolean(lifecycleSyncBaseReason),
    reason: lifecycleSyncBaseReason,
  };

  const retrySync: ActionState = (() => {
    if (lifecycleSyncBaseReason) {
      return { disabled: true, reason: lifecycleSyncBaseReason };
    }
    if (syncStatus !== 'failed' && syncStatus !== 'partial') {
      return { disabled: true, reason: 'Retry Sync is available after a failed or partial sync.' };
    }
    return { disabled: false, reason: null };
  })();

  const deleteDraft: ActionState = (() => {
    if (!lifecycleKnown) return { disabled: true, reason: 'Instance context is unavailable.' };
    if (saving) return { disabled: true, reason: 'Another action is currently in progress.' };
    if (!isPrimaryAdmin) return { disabled: true, reason: 'Only the primary admin can delete drafts.' };
    if (lifecycleStatus !== 'draft') return { disabled: true, reason: 'Only draft instances can be deleted.' };
    return { disabled: false, reason: null };
  })();

  let globalHint: string | null = null;
  if (readOnly) {
    globalHint = 'This instance is read-only. Lifecycle and sync actions are disabled.';
  } else if (!canAdminInstance) {
    globalHint = 'Only instance admins can run lifecycle or sync actions.';
  } else if (retrySync.disabled && retrySync.reason) {
    globalHint = retrySync.reason;
  }

  return {
    globalHint,
    advanceLifecycle,
    completeSync,
    retrySync,
    deleteDraft,
  };
}
