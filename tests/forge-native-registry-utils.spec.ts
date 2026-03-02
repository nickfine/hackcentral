import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FeaturedHack } from '../forge-native/static/frontend/src/types';
import { isValidHttpsUrl, mapFeaturedHackToArtifact, parseRegistryTags } from '../forge-native/static/frontend/src/utils/registry';

const featuredHackBase: FeaturedHack = {
  id: 'hack-1',
  title: 'Ops Copilot',
  description: 'Automates repetitive operational updates.',
  assetType: 'app',
  status: 'completed',
  reuseCount: 7,
  authorName: 'Alice',
  visibility: 'org',
  intendedUser: 'Ops',
  context: null,
  limitations: null,
  riskNotes: null,
  sourceRepoUrl: null,
  demoUrl: null,
};

afterEach(() => {
  vi.useRealTimers();
});

describe('registry utility helpers', () => {
  it('parses comma-delimited tags into lowercase tokens', () => {
    expect(parseRegistryTags(' AI, Prompt Engineering ,ops, ,Ops ')).toEqual([
      'ai',
      'prompt engineering',
      'ops',
      'ops',
    ]);
  });

  it('accepts only valid https URLs', () => {
    expect(isValidHttpsUrl('https://example.com/resource')).toBe(true);
    expect(isValidHttpsUrl('http://example.com/resource')).toBe(false);
    expect(isValidHttpsUrl('not-a-url')).toBe(false);
  });

  it('maps featured hacks into preview registry artifacts with stable metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:30:00.000Z'));

    const artifact = mapFeaturedHackToArtifact({
      ...featuredHackBase,
      sourceRepoUrl: 'https://github.com/adaptavist/ops-copilot',
      context: 'Used for weekly incident summaries',
    });

    expect(artifact).toMatchObject({
      id: 'preview-hack-1',
      title: 'Ops Copilot',
      artifactType: 'template',
      tags: ['app', 'preview', 'context'],
      sourceUrl: 'https://github.com/adaptavist/ops-copilot',
      sourceLabel: 'Source Repo',
      visibility: 'org',
      reuseCount: 7,
      forkCount: 0,
      authorName: 'Alice',
      createdAt: '2026-03-02T12:30:00.000Z',
      updatedAt: '2026-03-02T12:30:00.000Z',
    });
  });
});
