export const REPO_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(github\.com|gitlab\.com|bitbucket\.org)\/[^\s/]+\/[^\s/]+/i;

export type RepoPlatform = 'github' | 'gitlab' | 'bitbucket';

export interface ParsedRepo {
  url: string;
  platform: RepoPlatform;
}

export function parseRepoUrl(url: string): ParsedRepo | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!REPO_URL_REGEX.test(trimmed)) return null;

  const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  let platform: RepoPlatform = 'github';
  if (normalized.includes('gitlab.com')) platform = 'gitlab';
  else if (normalized.includes('bitbucket.org')) platform = 'bitbucket';
  return { url: normalized, platform };
}
