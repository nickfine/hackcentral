import { describe, expect, it } from 'vitest';
import {
  shouldAutoOpenAppView,
  shouldShowOpenAppViewCta,
} from '../forge-native/static/runtime-frontend/src/lib/appViewGating';

describe('runtime app-view gating', () => {
  it('shows Open App View CTA when macro host has a page context', () => {
    expect(shouldShowOpenAppViewCta({ isMacroHost: true, eventPageId: '12345' })).toBe(true);
    expect(shouldShowOpenAppViewCta({ isMacroHost: false, eventPageId: '12345' })).toBe(false);
    expect(shouldShowOpenAppViewCta({ isMacroHost: true, eventPageId: null })).toBe(false);
  });

  it('auto-opens only when page-context requirements are met', () => {
    expect(
      shouldAutoOpenAppView({
        devMode: false,
        isMacroHost: true,
        eventPageId: '12345',
        appModeContextError: null,
        openingAppView: false,
        alreadyAttempted: false,
      })
    ).toBe(true);

    expect(
      shouldAutoOpenAppView({
        devMode: false,
        isMacroHost: true,
        eventPageId: '12345',
        appModeContextError: { code: 'APP_MODE_CONTEXT_REQUIRED' },
        openingAppView: false,
        alreadyAttempted: false,
      })
    ).toBe(false);

    expect(
      shouldAutoOpenAppView({
        devMode: false,
        isMacroHost: true,
        eventPageId: '12345',
        appModeContextError: null,
        openingAppView: false,
        alreadyAttempted: true,
      })
    ).toBe(false);
  });
});
