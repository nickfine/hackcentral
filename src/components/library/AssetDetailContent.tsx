/**
 * Asset (hack) detail content — reuse summary, metadata, content, actions.
 * Redesigned layout: hero header, sticky quick actions, 60/40 two-column main,
 * horizontal More like this carousel. Matches dashboard design language.
 */

import { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Link2,
  Copy,
  FileText,
  Code,
  Bot,
  Check,
  Quote,
  User,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Star,
  GitBranch,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuth } from '@/hooks/useAuth';
import { stripSeedDescriptionSuffix } from '@/lib/utils';
import { HACK_TYPE_BADGE_COLORS, HACK_TYPE_LABELS_SINGULAR } from '@/constants/project';
import type { SourceRepo } from '@/components/shared/RepoLink';
import { CopyFeedbackToast } from '@/components/shared/CopyFeedbackToast';
import { BeforeAfterSlider } from '@/components/shared/BeforeAfterSlider';
import { PromptWithVariables } from './PromptWithVariables';

type AttachmentType = 'referenced' | 'copied' | 'linked' | 'attached';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  prompt: <FileText className="h-4 w-4" />,
  skill: <Code className="h-4 w-4" />,
  app: <Bot className="h-4 w-4" />,
};

const SAMPLE_TESTIMONIAL = {
  text: 'Saved my team 5 hours with this hack!',
  author: 'Alex M.',
  rating: 5,
};

function getDisplayablePrompt(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>;
    if (typeof c.prompt === 'string') return c.prompt;
    if (typeof c.systemPrompt === 'string') return c.systemPrompt;
    return JSON.stringify(content, null, 2);
  }
  return String(content ?? '');
}

function getUsageFromContent(content: unknown): string | undefined {
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>;
    if (typeof c.usage === 'string') return c.usage;
  }
  return undefined;
}

function getCopyableContent(content: unknown): string {
  const prompt = getDisplayablePrompt(content);
  if (prompt) return prompt;
  if (content && typeof content === 'object') {
    return JSON.stringify(content, null, 2);
  }
  return String(content ?? '');
}

function getAppContent(content: unknown): {
  screenshots: string[];
  description?: string;
  overview?: { paragraphs?: string[]; bullets?: string[] };
} | null {
  if (!content || typeof content !== 'object') return null;
  const c = content as Record<string, unknown>;
  const screenshots = Array.isArray(c.screenshots)
    ? (c.screenshots as string[]).filter((s): s is string => typeof s === 'string')
    : [];
  if (Array.isArray(c.screenshots) || typeof c.description === 'string') {
    let overview: { paragraphs?: string[]; bullets?: string[] } | undefined;
    if (c.overview && typeof c.overview === 'object') {
      const o = c.overview as Record<string, unknown>;
      overview = {};
      if (Array.isArray(o.paragraphs)) {
        overview.paragraphs = (o.paragraphs as unknown[]).filter((p): p is string => typeof p === 'string');
      }
      if (Array.isArray(o.bullets)) {
        overview.bullets = (o.bullets as unknown[]).filter((b): b is string => typeof b === 'string');
      }
    }
    return {
      screenshots,
      description: typeof c.description === 'string' ? c.description : undefined,
      overview: overview?.paragraphs?.length || overview?.bullets?.length ? overview : undefined,
    };
  }
  return null;
}

export interface AssetDetailContentProps {
  asset: {
    title: string;
    description?: string;
    assetType: string;
    status: string;
    content: unknown;
    authorId: Id<'profiles'>;
    verifiedByFullName?: string;
    verifiedAt?: number;
    metadata?: {
      intendedUser?: string;
      context?: string;
      limitations?: string;
      riskNotes?: string;
      exampleInput?: string;
      exampleOutput?: string;
    };
    isArsenal: boolean;
    isAnonymous?: boolean;
    sourceRepo?: SourceRepo | null;
    demoUrl?: string | null;
  };
  assetId: Id<'libraryAssets'>;
  onClose: () => void;
  onSelectAsset?: (id: Id<'libraryAssets'>) => void;
  closeLabel?: string;
}

export function AssetDetailContent({
  asset,
  assetId,
  onClose,
  onSelectAsset,
  closeLabel = 'Close',
}: AssetDetailContentProps) {
  const { isAuthenticated } = useAuth();
  const [attachOpen, setAttachOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | ''>('');
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('attached');
  const [isSubmittingAttach, setIsSubmittingAttach] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const profile = useQuery(api.profiles.getCurrentProfile);
  const reuseCount = useQuery(api.libraryReuse.getReuseCountForAsset, { assetId });
  const similarAssets = useQuery(api.libraryAssets.getSimilar, { assetId, limit: 6 });
  const projects = useQuery(api.projects.list);
  const attachToProject = useMutation(api.libraryReuse.attachToProject);
  const recordCopyFeedback = useMutation(api.assetCopyFeedback.record);
  const updateAsset = useMutation(api.libraryAssets.update);
  const isAuthor = Boolean(profile?._id && asset.authorId === profile._id);

  const displayablePrompt = getDisplayablePrompt(asset.content);
  const usageText = getUsageFromContent(asset.content);
  const hasExampleInput = Boolean(asset.metadata?.exampleInput);
  const hasExampleOutput = Boolean(asset.metadata?.exampleOutput);
  const hasExamples = hasExampleInput || hasExampleOutput;
  const appContent = getAppContent(asset.content);
  const isAppWithScreenshots = asset.assetType === 'app' && appContent;

  const handleCopyPrompt = async () => {
    const text = getCopyableContent(asset.content);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Prompt copied!');
      setTimeout(() => setCopied(false), 2000);

      // Show feedback toast
      toast.custom(
        (t) => (
          <CopyFeedbackToast
            onThumbsUp={() => handleFeedbackSubmit(true, t.id)}
            onThumbsDown={() => handleFeedbackSubmit(false, t.id)}
            isSubmitting={isSubmittingFeedback}
          />
        ),
        { duration: 10000 }
      );
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleFeedbackSubmit = async (helpful: boolean, toastId: string) => {
    if (isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      await recordCopyFeedback({ assetId, helpful });
      toast.dismiss(toastId);
      toast.success('Thanks for your feedback!');
    } catch (err) {
      console.error('Feedback failed:', err);
      toast.error('Failed to record feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || isSubmittingAttach) return;
    setIsSubmittingAttach(true);
    try {
      await attachToProject({
        projectId: selectedProjectId as Id<'projects'>,
        assetId,
        attachmentType,
      });
      toast.success('Hack linked to project!');
      setAttachOpen(false);
      setSelectedProjectId('');
      setAttachmentType('attached');
    } catch (err) {
      console.error('Attach failed:', err);
      toast.error('Failed to link to project. Please try again.');
    } finally {
      setIsSubmittingAttach(false);
    }
  };

  const handleStatusChange = async (newStatus: 'in_progress' | 'verified' | 'deprecated') => {
    if (!isAuthor || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateAsset({ assetId, status: newStatus });
      toast.success(newStatus === 'verified' ? 'Hack marked as verified.' : newStatus === 'deprecated' ? 'Hack marked as deprecated.' : 'Hack reverted to In progress.');
    } catch (err) {
      console.error('Failed to update asset status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'badge-draft',
    in_progress: 'badge-in-progress',
    verified: 'badge-verified',
    deprecated: 'badge-deprecated',
  };
  const typeLabel = HACK_TYPE_LABELS_SINGULAR[asset.assetType] ?? asset.assetType.replace('_', ' ');

  return (
    <div className="space-y-6">
      {/* 0. Back link — very top */}
      <div>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-11"
          aria-label={closeLabel}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {closeLabel}
        </button>
      </div>

      {/* 1. Hero / Header */}
      <div className="min-w-0">
        <h1 id="asset-detail-title" className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          {asset.title}
        </h1>
        {asset.description && (
          <p className="text-muted-foreground text-base leading-relaxed mb-4" id="asset-detail-description">
            {stripSeedDescriptionSuffix(asset.description)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`badge ${statusColors[asset.status] ?? 'badge-outline'} text-xs`}>
            {asset.status === 'verified' ? 'Verified' : asset.status === 'deprecated' ? 'Deprecated' : 'In progress'}
          </span>
          <span className={`badge text-xs border ${HACK_TYPE_BADGE_COLORS[asset.assetType] ?? 'bg-muted text-muted-foreground border-border'}`}>
            {typeLabel}
          </span>
          {asset.isArsenal && (
            <span className="badge badge-secondary text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Featured Hacks
            </span>
          )}
          {reuseCount !== undefined && (
            <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              {reuseCount.totalReuseEvents === 0
                ? 'No reuses yet'
                : `${reuseCount.totalReuseEvents} reuse${reuseCount.totalReuseEvents !== 1 ? 's' : ''} (${reuseCount.distinctProjectReuses} project${reuseCount.distinctProjectReuses !== 1 ? 's' : ''})`}
            </span>
          )}
        </div>
      </div>

      {/* 2. Main Content — Two-Column Layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left column ~60% */}
        <div className="flex-1 min-w-0 lg:flex-[6] space-y-6">
          {/* App layout: screenshots + description + Try live demo */}
          {isAppWithScreenshots && (
            <div className="space-y-6">
              <div className="rounded-xl border-2 border-primary/20 bg-card shadow-sm p-6 transition-all duration-200 ease-out hover:shadow-md">
                <h2 className="text-xl font-semibold mb-4">About</h2>
                {(appContent!.overview?.paragraphs?.length || appContent!.overview?.bullets?.length) ? (
                  <div className="mb-6 space-y-4">
                    {appContent!.overview.paragraphs?.map((p, i) => (
                      <p key={i} className="text-muted-foreground leading-relaxed">
                        {p}
                      </p>
                    ))}
                    {appContent!.overview.bullets?.length ? (
                      <ul className="list-disc list-inside text-muted-foreground space-y-1.5">
                        {appContent!.overview.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {appContent!.screenshots.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto pb-2 mb-4 scrollbar-hide snap-x snap-mandatory">
                    {appContent!.screenshots.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Screenshot ${idx + 1}`}
                        className="rounded-lg border border-border shrink-0 w-64 h-40 object-cover snap-start"
                      />
                    ))}
                  </div>
                )}
                <p className="text-muted-foreground leading-relaxed">
                  {appContent!.description ?? stripSeedDescriptionSuffix(asset.description) ?? 'No description.'}
                </p>
              </div>
            </div>
          )}

          {/* Core Prompt / Configuration Card (prompts and skills) */}
          {!isAppWithScreenshots && displayablePrompt && (
            <div className="rounded-xl border-2 border-primary/20 bg-card shadow-sm p-6 transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-primary/30">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <h2 id="core-prompt-heading" className="text-xl font-semibold">
                  {asset.assetType === 'skill'
                    ? 'Configuration'
                    : asset.assetType === 'app'
                      ? 'Agent Blueprint'
                      : 'Core prompt'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {asset.sourceRepo && (
                    <a
                      href={asset.sourceRepo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {asset.sourceRepo.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {asset.assetType === 'prompt' && (
                    <a
                      href="https://chat.openai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Open in ChatGPT
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-1.5 min-h-11 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={handleCopyPrompt}
                    aria-label={
                      asset.assetType === 'skill' || asset.assetType === 'app'
                        ? 'Copy configuration'
                        : 'Copy prompt to clipboard'
                    }
                    aria-describedby="core-prompt-heading"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[var(--color-success)]" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                    {copied
                      ? 'Copied'
                      : asset.assetType === 'skill' || asset.assetType === 'app'
                        ? 'Copy config'
                        : 'Copy prompt'}
                  </button>
                </div>
              </div>
              <div className="bg-muted/50 p-5 rounded-xl overflow-x-auto max-h-96 overflow-y-auto">
                {(asset.assetType === 'skill' || asset.assetType === 'app') &&
                typeof displayablePrompt === 'string' ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                    {displayablePrompt}
                  </pre>
                ) : (
                  <PromptWithVariables text={displayablePrompt} />
                )}
              </div>
            </div>
          )}

          {/* Link to Another Hack — underneath About/Core prompt */}
          {isAuthenticated && (isAppWithScreenshots || displayablePrompt) && (
            <div>
              {!attachOpen ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => setAttachOpen(true)}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Link to Another Hack
                </button>
              ) : (
                <form onSubmit={handleAttachSubmit} className="flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="attach-project" className="sr-only">
                      Project
                    </label>
                    <select
                      id="attach-project"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId((e.target.value || '') as Id<'projects'> | '')}
                      className="input w-40 text-sm"
                      required
                    >
                      <option value="">Select a project</option>
                      {projects?.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="attach-type" className="sr-only">
                      Attachment type
                    </label>
                    <select
                      id="attach-type"
                      value={attachmentType}
                      onChange={(e) => setAttachmentType(e.target.value as AttachmentType)}
                      className="input w-32 text-sm"
                    >
                      <option value="attached">Attached</option>
                      <option value="referenced">Referenced</option>
                      <option value="copied">Copied</option>
                      <option value="linked">Linked</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setAttachOpen(false);
                        setSelectedProjectId('');
                        setAttachmentType('attached');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={!selectedProjectId || isSubmittingAttach}
                    >
                      {isSubmittingAttach ? 'Linking…' : 'Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* How to Use / Example Card */}
          {(usageText || hasExamples) && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-6 transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5">
              <h2 className="text-xl font-semibold mb-4">How to use</h2>
              {usageText && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {usageText}
                </p>
              )}
              {hasExamples &&
                (hasExampleInput && hasExampleOutput ? (
                  <BeforeAfterSlider
                    beforeLabel="Raw Input"
                    afterLabel="Output"
                    beforeContent={asset.metadata?.exampleInput ?? ''}
                    afterContent={asset.metadata?.exampleOutput ?? ''}
                  />
                ) : (
                  <div className="bg-muted/30 p-5 rounded-xl">
                    <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                      {asset.metadata?.exampleInput ?? asset.metadata?.exampleOutput ?? ''}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right column ~40% */}
        <div className="lg:min-w-0 lg:flex-[4] lg:max-w-[380px] space-y-6">
          {/* Stats & Metadata Card — always show (Repository at top); includes other details when present */}
          {(
          <div className="rounded-xl border border-border bg-card shadow-sm p-6 transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5">
            <h2 className="text-xl font-semibold mb-4">Details</h2>
            <dl className="space-y-0">
              {/* Repository — always shown; repo URL as link when present */}
              <div className="flex items-start gap-3 py-3 border-b border-border">
                <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Repository
                  </dt>
                  <dd className="text-sm">
                    {asset.sourceRepo ? (
                      <a
                        href={asset.sourceRepo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {asset.sourceRepo.url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
              </div>
              {/* Live demo — for apps; Try live demo button */}
              {asset.assetType === 'app' && (
                <div className="flex items-start gap-3 py-3 border-b border-border">
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Live demo
                    </dt>
                    <dd className="text-sm">
                      {asset.demoUrl ? (
                        <a
                          href={asset.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {asset.demoUrl.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                </div>
              )}
              {asset.status === 'verified' && (asset.verifiedByFullName || asset.verifiedAt || asset.isAnonymous) && (
                <div className="flex items-start gap-3 py-3 border-b border-border">
                  <Check className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Verified
                    </dt>
                    <dd className="text-sm text-foreground">
                      {asset.isAnonymous ? 'Anonymous' : asset.verifiedByFullName ?? '—'}
                      {asset.verifiedAt && (
                        <span className="text-muted-foreground"> · {new Date(asset.verifiedAt).toLocaleDateString()}</span>
                      )}
                    </dd>
                  </div>
                </div>
              )}
              {asset.metadata?.intendedUser && (
                <div className="flex items-start gap-3 py-3 border-b border-border">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Intended user
                    </dt>
                    <dd className="text-sm text-foreground">{asset.metadata.intendedUser}</dd>
                  </div>
                </div>
              )}
              {asset.metadata?.context && (
                <div className="flex items-start gap-3 py-3 border-b border-border">
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Context
                    </dt>
                    <dd className="text-sm text-foreground">{asset.metadata.context}</dd>
                  </div>
                </div>
              )}
              {asset.metadata?.limitations && (
                <div className="flex items-start gap-3 py-3 border-b border-border">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Limitations
                    </dt>
                    <dd className="text-sm text-foreground">{asset.metadata.limitations}</dd>
                  </div>
                </div>
              )}
              {asset.metadata?.riskNotes && (
                <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Risk notes
                    </dt>
                    <dd className="text-sm text-foreground">{asset.metadata.riskNotes}</dd>
                  </div>
                </div>
              )}
            </dl>

            {/* Author-only status actions */}
            {isAuthor && (
              <div className="mt-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-2">Manage</h3>
                <div className="flex flex-wrap gap-2">
                  {asset.status !== 'verified' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleStatusChange('verified')}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? 'Updating…' : 'Mark as Verified'}
                    </button>
                  )}
                  {asset.status !== 'deprecated' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleStatusChange('deprecated')}
                      disabled={isUpdatingStatus}
                    >
                      Mark as Deprecated
                    </button>
                  )}
                  {(asset.status !== 'draft' && asset.status !== 'in_progress') && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleStatusChange('in_progress')}
                      disabled={isUpdatingStatus}
                    >
                      Revert to In progress
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Recognition / Testimonial Card */}
          <div
            className="flex flex-col rounded-xl border border-border bg-card shadow-md p-6 transition-all duration-200 ease-out hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5"
            role="region"
            aria-label="Testimonial"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="avatar shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium"
                aria-hidden
              >
                {SAMPLE_TESTIMONIAL.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-0.5 mb-1" aria-label={`${SAMPLE_TESTIMONIAL.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i <= SAMPLE_TESTIMONIAL.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                      aria-hidden
                    />
                  ))}
                </div>
                <Quote
                  className="h-4 w-4 text-muted-foreground mb-1"
                  aria-hidden
                  strokeWidth={2.5}
                />
              </div>
            </div>
            <p className="text-base leading-relaxed text-foreground mb-2">
              &quot;{SAMPLE_TESTIMONIAL.text}&quot;
            </p>
            <p className="text-sm italic text-muted-foreground">— {SAMPLE_TESTIMONIAL.author}</p>
          </div>
        </div>
      </div>

      {/* 4. More like this — horizontal carousel with snap */}
      {similarAssets !== undefined && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">More like this</h2>
          {similarAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other {asset.assetType.replace('_', ' ')}s in Completed Hacks yet.
            </p>
          ) : (
            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory scroll-smooth">
              {similarAssets.map((a) => (
                <SimilarHackCard
                  key={a._id}
                  asset={a}
                  onSelect={() => onSelectAsset?.(a._id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimilarHackCard({
  asset,
  onSelect,
}: {
  asset: {
    _id: Id<'libraryAssets'>;
    title: string;
    description?: string;
    assetType: string;
    status: string;
  };
  onSelect: () => void;
}) {
  const typeLabel = HACK_TYPE_LABELS_SINGULAR[asset.assetType] ?? asset.assetType.replace('_', ' ');
  const typeIcon = TYPE_ICONS[asset.assetType] ?? <FileText className="h-4 w-4" />;

  return (
    <button
      type="button"
      aria-label={`View ${asset.title}`}
      className={`flex flex-col min-w-[280px] max-w-[280px] shrink-0 snap-start rounded-xl border border-border bg-card p-5 md:p-6 text-left shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${asset.status === 'deprecated' ? 'opacity-75' : ''}`}
      onClick={onSelect}
    >
      {asset.status === 'verified' && (
        <div
          className="absolute top-3 right-3 size-5 flex items-center justify-center bg-[var(--color-success)] text-white rounded-full p-0.5"
          aria-label="Verified"
        >
          <Check className="h-3 w-3" strokeWidth={2.5} />
        </div>
      )}
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
            {typeIcon}
          </div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 break-words min-w-0">
            {asset.title}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
          {stripSeedDescriptionSuffix(asset.description) || 'No description'}
        </p>
        <span
          className={`badge text-xs border w-fit ${HACK_TYPE_BADGE_COLORS[asset.assetType] ?? 'bg-muted text-muted-foreground border-border'}`}
        >
          {typeLabel}
        </span>
      </div>
    </button>
  );
}
