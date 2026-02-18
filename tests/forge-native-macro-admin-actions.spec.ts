import { describe, expect, it } from 'vitest';
import { getInstanceAdminActionState } from '../forge-native/static/macro-frontend/src/instanceAdminActions';

describe('macro instance admin action state', () => {
  it('disables lifecycle and sync actions for completed instances with explicit read-only guidance', () => {
    const state = getInstanceAdminActionState({
      lifecycleStatus: 'completed',
      syncStatus: 'complete',
      canAdminInstance: true,
      isPrimaryAdmin: true,
      saving: false,
    });

    expect(state.globalHint).toContain('read-only');
    expect(state.advanceLifecycle.disabled).toBe(true);
    expect(state.completeSync.disabled).toBe(true);
    expect(state.retrySync.disabled).toBe(true);
  });

  it('keeps retry sync disabled unless sync is failed or partial', () => {
    const idleState = getInstanceAdminActionState({
      lifecycleStatus: 'results',
      syncStatus: 'complete',
      canAdminInstance: true,
      isPrimaryAdmin: true,
      saving: false,
    });
    expect(idleState.retrySync.disabled).toBe(true);
    expect(idleState.retrySync.reason).toContain('failed or partial');

    const failedState = getInstanceAdminActionState({
      lifecycleStatus: 'results',
      syncStatus: 'failed',
      canAdminInstance: true,
      isPrimaryAdmin: true,
      saving: false,
    });
    expect(failedState.retrySync.disabled).toBe(false);
    expect(failedState.retrySync.reason).toBeNull();
  });

  it('enforces primary-admin draft-only delete rules', () => {
    const notPrimary = getInstanceAdminActionState({
      lifecycleStatus: 'draft',
      syncStatus: 'not_started',
      canAdminInstance: true,
      isPrimaryAdmin: false,
      saving: false,
    });
    expect(notPrimary.deleteDraft.disabled).toBe(true);
    expect(notPrimary.deleteDraft.reason).toContain('primary admin');

    const nonDraft = getInstanceAdminActionState({
      lifecycleStatus: 'registration',
      syncStatus: 'not_started',
      canAdminInstance: true,
      isPrimaryAdmin: true,
      saving: false,
    });
    expect(nonDraft.deleteDraft.disabled).toBe(true);
    expect(nonDraft.deleteDraft.reason).toContain('Only draft');
  });

  it('locks all actions when instance context is unavailable', () => {
    const state = getInstanceAdminActionState({
      lifecycleStatus: null,
      syncStatus: 'failed',
      canAdminInstance: true,
      isPrimaryAdmin: true,
      saving: false,
    });

    expect(state.advanceLifecycle.disabled).toBe(true);
    expect(state.completeSync.disabled).toBe(true);
    expect(state.retrySync.disabled).toBe(true);
    expect(state.deleteDraft.disabled).toBe(true);
    expect(state.advanceLifecycle.reason).toContain('context is unavailable');
    expect(state.globalHint).toContain('context is unavailable');
  });

  it('prioritizes saving lock messaging while an admin action is in progress', () => {
    const state = getInstanceAdminActionState({
      lifecycleStatus: 'team_formation',
      syncStatus: 'partial',
      canAdminInstance: true,
      isPrimaryAdmin: false,
      saving: true,
    });

    expect(state.advanceLifecycle.disabled).toBe(true);
    expect(state.completeSync.disabled).toBe(true);
    expect(state.retrySync.disabled).toBe(true);
    expect(state.deleteDraft.disabled).toBe(true);
    expect(state.advanceLifecycle.reason).toContain('currently in progress');
    expect(state.deleteDraft.reason).toContain('currently in progress');
    expect(state.globalHint).toContain('currently in progress');
  });
});
