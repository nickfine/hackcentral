import type { ArtifactListItem, ArtifactType, ArtifactVisibility, FeaturedHack } from '../types';

export type RegistrySortBy = 'newest' | 'reuse_count';

export const REGISTRY_ARTIFACT_TYPES: ArtifactType[] = [
  'prompt',
  'skill',
  'template',
  'learning',
  'code_snippet',
  'other',
];

export function parseRegistryTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function isValidHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function mapFeaturedHackToArtifact(hack: FeaturedHack): ArtifactListItem {
  const artifactType: ArtifactType =
    hack.assetType === 'app' ? 'template' : hack.assetType;
  const tags = [hack.assetType, 'preview', ...(hack.context ? ['context'] : [])];

  return {
    id: `preview-${hack.id}`,
    title: hack.title,
    description: hack.description,
    artifactType,
    tags,
    sourceUrl: hack.sourceRepoUrl || hack.demoUrl || 'https://example.com/preview-artifact',
    sourceLabel: hack.sourceRepoUrl ? 'Source Repo' : hack.demoUrl ? 'Demo' : 'Preview Seed Data',
    sourceHackProjectId: undefined,
    sourceHackdayEventId: undefined,
    visibility: hack.visibility as ArtifactVisibility,
    reuseCount: hack.reuseCount,
    forkCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorName: hack.authorName,
  };
}
