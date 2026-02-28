import { describe, expect, it } from 'vitest';
import { resolveCreateHackDayLaunchUrl } from '../src/pages/createHackDayLaunch';

describe('resolveCreateHackDayLaunchUrl', () => {
  it('prefers appViewUrl when present', () => {
    const url = resolveCreateHackDayLaunchUrl({
      appViewUrl: 'https://example.atlassian.net/wiki/apps/app/env/hackday-app?pageId=123',
      childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/123',
    });

    expect(url).toBe('https://example.atlassian.net/wiki/apps/app/env/hackday-app?pageId=123');
  });

  it('falls back to childPageUrl when appViewUrl is missing', () => {
    const url = resolveCreateHackDayLaunchUrl({
      appViewUrl: null,
      childPageUrl: 'https://example.atlassian.net/wiki/spaces/HDC/pages/123',
    });

    expect(url).toBe('https://example.atlassian.net/wiki/spaces/HDC/pages/123');
  });
});
