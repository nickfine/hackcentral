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

// Clean type labels. The "Reusable artifacts" tab context (and, in Phase 2, a
// form chip) carries the link-vs-content distinction rather than the label.
export const REGISTRY_ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  template: 'Template',
  learning: 'Learning',
  code_snippet: 'Code snippet',
  other: 'Other',
};

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
