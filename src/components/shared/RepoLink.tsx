/**
 * RepoLink — Source repository link for hacks (GitHub, GitLab, Bitbucket).
 * Simple: ghost button with icon + "Source on {platform}".
 * Richer: pill with platform icon + version + relative time, native title tooltip.
 */

import { GitBranch } from 'lucide-react';

export type RepoPlatform = 'github' | 'gitlab' | 'bitbucket';

export interface SourceRepo {
  url: string;
  platform: RepoPlatform;
  version?: string;
  updatedAt?: number;
  repoName?: string;
  description?: string;
  commitMessage?: string;
}

const PLATFORM_LABELS: Record<RepoPlatform, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
  if (days < 365) return `${Math.floor(days / 30)} month(s) ago`;
  return `${Math.floor(days / 365)} year(s) ago`;
}

function buildTooltip(repo: SourceRepo): string {
  const parts: string[] = [];
  if (repo.repoName) parts.push(repo.repoName);
  if (repo.description) parts.push(repo.description);
  if (repo.commitMessage) parts.push(`Last: ${repo.commitMessage}`);
  if (repo.version) parts.push(`Version: ${repo.version}`);
  return parts.join(' · ') || repo.url;
}

export interface RepoLinkProps {
  sourceRepo: SourceRepo;
  variant?: 'simple' | 'rich';
  /** Override label, e.g. "View Source Code". Default: "Source on {platform}" */
  label?: string;
  className?: string;
}

export function RepoLink({
  sourceRepo,
  variant = 'simple',
  label: labelOverride,
  className = '',
}: RepoLinkProps) {
  const label = labelOverride ?? `Source on ${PLATFORM_LABELS[sourceRepo.platform]}`;
  const tooltip = buildTooltip(sourceRepo);
  const updatedLabel = sourceRepo.updatedAt ? formatRelativeTime(sourceRepo.updatedAt) : null;

  if (variant === 'rich') {
    return (
      <a
        href={sourceRepo.url}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
      >
        <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {sourceRepo.version && <span>{sourceRepo.version}</span>}
        {updatedLabel && (
          <>
            {sourceRepo.version && <span className="opacity-60">·</span>}
            <span>{updatedLabel}</span>
          </>
        )}
        {!sourceRepo.version && !updatedLabel && <span>{label}</span>}
      </a>
    );
  }

  return (
    <a
      href={sourceRepo.url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      className={`btn btn-ghost btn-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </a>
  );
}

export interface RepoLinkOrSuggestProps {
  sourceRepo?: SourceRepo | null;
  onSuggestAdd?: () => void;
  variant?: 'simple' | 'rich';
  /** Override label for RepoLink, e.g. "View Source Code" */
  label?: string;
  className?: string;
}

/**
 * Renders RepoLink when sourceRepo exists; otherwise optional "Suggest adding repo" ghost button.
 */
export function RepoLinkOrSuggest({
  sourceRepo,
  onSuggestAdd,
  variant = 'simple',
  label,
  className = '',
}: RepoLinkOrSuggestProps) {
  if (sourceRepo) {
    return (
      <RepoLink
        sourceRepo={sourceRepo}
        variant={variant}
        label={label}
        className={className}
      />
    );
  }
  if (onSuggestAdd) {
    return (
      <button
        type="button"
        onClick={onSuggestAdd}
        className={`btn btn-ghost btn-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 ${className}`}
      >
        <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
        Suggest adding repo
      </button>
    );
  }
  return null;
}
