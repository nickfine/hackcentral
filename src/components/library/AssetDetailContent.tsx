/**
 * Asset (hack) detail content — reuse summary, metadata, content, actions.
 * Redesigned layout: hero header, sticky quick actions, 60/40 two-column main,
 * horizontal More like this carousel. Matches dashboard design language.
 */

import { useState } from 'react';
import { Sparkles, X, Link2, Copy, FileText, Code, Bot, Check, Quote } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuth } from '../../hooks/useAuth';
import { stripSeedDescriptionSuffix } from '@/lib/utils';
import { HACK_TYPE_BADGE_COLORS } from '@/constants/project';

type AttachmentType = 'referenced' | 'copied' | 'linked' | 'attached';

const ASSET_TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  app: 'App',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  prompt: <FileText className="h-4 w-4" />,
  skill: <Code className="h-4 w-4" />,
  app: <Bot className="h-4 w-4" />,
};

const SAMPLE_TESTIMONIAL = {
  text: 'Saved my team 5 hours with this hack!',
  author: 'Alex M.',
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
  const [exampleTab, setExampleTab] = useState<'input' | 'output'>(() =>
    asset.metadata?.exampleInput ? 'input' : 'output'
  );
  const [copied, setCopied] = useState(false);

  const profile = useQuery(api.profiles.getCurrentProfile);
  const reuseCount = useQuery(api.libraryReuse.getReuseCountForAsset, { assetId });
  const similarAssets = useQuery(api.libraryAssets.getSimilar, { assetId, limit: 6 });
  const projects = useQuery(api.projects.list);
  const attachToProject = useMutation(api.libraryReuse.attachToProject);
  const recordReuse = useMutation(api.libraryReuse.recordReuse);
  const updateAsset = useMutation(api.libraryAssets.update);
  const [quickReuseType, setQuickReuseType] = useState<AttachmentType>('copied');
  const [isRecordingReuse, setIsRecordingReuse] = useState(false);
  const isAuthor = Boolean(profile?._id && asset.authorId === profile._id);

  const displayablePrompt = getDisplayablePrompt(asset.content);
  const usageText = getUsageFromContent(asset.content);
  const hasExampleInput = Boolean(asset.metadata?.exampleInput);
  const hasExampleOutput = Boolean(asset.metadata?.exampleOutput);
  const hasExamples = hasExampleInput || hasExampleOutput;

  const handleCopyPrompt = async () => {
    const text = getCopyableContent(asset.content);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Prompt copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleRecordReuse = async () => {
    if (isRecordingReuse) return;
    setIsRecordingReuse(true);
    try {
      await recordReuse({ assetId, reuseType: quickReuseType });
      toast.success('Use recorded. Thanks for contributing!');
    } catch (err) {
      console.error('Record reuse failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to record use. Please try again.');
    } finally {
      setIsRecordingReuse(false);
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
      toast.success('Hack attached to project!');
      setAttachOpen(false);
      setSelectedProjectId('');
      setAttachmentType('attached');
    } catch (err) {
      console.error('Attach failed:', err);
      toast.error('Failed to attach to project. Please try again.');
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
  const typeLabel = ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType.replace('_', ' ');

  return (
    <div className="space-y-6">
      {/* 1. Hero / Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 id="asset-detail-title" className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            {asset.title}
          </h1>
          {asset.description && (
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
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
        <button
          type="button"
          className="btn btn-ghost btn-icon shrink-0"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 2. Quick Actions Bar (sticky) */}
      {isAuthenticated && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 border-b border-border -mb-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">I used this:</span>
            <select
              value={quickReuseType}
              onChange={(e) => setQuickReuseType(e.target.value as AttachmentType)}
              className="input w-32 text-sm"
              aria-label="How you used this hack"
            >
              <option value="copied">Copied</option>
              <option value="referenced">Referenced</option>
              <option value="linked">Linked</option>
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRecordReuse}
              disabled={isRecordingReuse}
            >
              {isRecordingReuse ? 'Recording…' : 'Record use'}
            </button>
            {!attachOpen ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setAttachOpen(true)}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Attach to project
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
                    {isSubmittingAttach ? 'Attaching…' : 'Attach'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. Main Content — Two-Column Layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left column ~60% */}
        <div className="flex-1 min-w-0 lg:flex-[6] space-y-6">
          {/* Core Prompt Card */}
          {displayablePrompt && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-xl">Core prompt</h2>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm gap-1.5"
                  onClick={handleCopyPrompt}
                  aria-label="Copy prompt"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
              <pre className="bg-muted/50 p-5 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96 overflow-y-auto">
                {displayablePrompt}
              </pre>
            </div>
          )}

          {/* How to Use / Example Card */}
          {(usageText || hasExamples) && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-6">
              <h2 className="font-semibold text-xl mb-4">How to use</h2>
              {usageText && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {usageText}
                </p>
              )}
              {hasExamples && (
                <>
                  <div className="flex gap-2 border-b border-border mb-4">
                    {hasExampleInput && (
                      <button
                        type="button"
                        className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                          exampleTab === 'input'
                            ? 'bg-muted text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setExampleTab('input')}
                      >
                        Example Input
                      </button>
                    )}
                    {hasExampleOutput && (
                      <button
                        type="button"
                        className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                          exampleTab === 'output'
                            ? 'bg-muted text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setExampleTab('output')}
                      >
                        Example Output
                      </button>
                    )}
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                      {(exampleTab === 'input' ? asset.metadata?.exampleInput : asset.metadata?.exampleOutput) ?? ''}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right column ~40% */}
        <div className="lg:min-w-0 lg:flex-[4] lg:max-w-[380px] space-y-6">
          {/* Stats & Metadata Card — only show when there's content */}
          {(asset.status === 'verified' && (asset.verifiedByFullName || asset.verifiedAt || asset.isAnonymous)) ||
          asset.metadata?.intendedUser ||
          asset.metadata?.context ||
          asset.metadata?.limitations ||
          asset.metadata?.riskNotes ||
          isAuthor ? (
          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h2 className="font-semibold text-xl mb-4">Details</h2>
            <dl className="space-y-0">
              {asset.status === 'verified' && (asset.verifiedByFullName || asset.verifiedAt || asset.isAnonymous) && (
                <div className="border-b border-border py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Verified
                  </dt>
                  <dd className="text-sm">
                    {asset.isAnonymous ? 'Anonymous' : asset.verifiedByFullName ?? '—'}
                    {asset.verifiedAt && (
                      <span className="text-muted-foreground"> · {new Date(asset.verifiedAt).toLocaleDateString()}</span>
                    )}
                  </dd>
                </div>
              )}
              {asset.metadata?.intendedUser && (
                <div className="border-b border-border py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Intended user
                  </dt>
                  <dd className="text-sm">{asset.metadata.intendedUser}</dd>
                </div>
              )}
              {asset.metadata?.context && (
                <div className="border-b border-border py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Context
                  </dt>
                  <dd className="text-sm">{asset.metadata.context}</dd>
                </div>
              )}
              {asset.metadata?.limitations && (
                <div className="border-b border-border py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Limitations
                  </dt>
                  <dd className="text-sm">{asset.metadata.limitations}</dd>
                </div>
              )}
              {asset.metadata?.riskNotes && (
                <div className="border-b border-border last:border-0 py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Risk notes
                  </dt>
                  <dd className="text-sm">{asset.metadata.riskNotes}</dd>
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
          ) : null}

          {/* Recognition / Testimonial Card */}
          <div
            className="flex flex-col rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-6 dark:border-amber-800/40 dark:from-amber-950/20 dark:to-orange-950/20"
            role="region"
            aria-label="Testimonial"
          >
            <Quote
              className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400 mb-2"
              aria-hidden
              strokeWidth={2.5}
            />
            <p className="text-lg font-semibold leading-snug text-foreground mb-2">
              &quot;{SAMPLE_TESTIMONIAL.text}&quot;
            </p>
            <p className="text-sm font-medium text-muted-foreground">— {SAMPLE_TESTIMONIAL.author}</p>
          </div>
        </div>
      </div>

      {/* 4. More like this — horizontal carousel */}
      {similarAssets !== undefined && (
        <div>
          <h2 className="text-lg font-semibold mb-4">More like this</h2>
          {similarAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other {asset.assetType.replace('_', ' ')}s in Completed Hacks yet.
            </p>
          ) : (
            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-1 px-1">
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

      {/* 5. Bottom — Back link */}
      <div className="pt-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
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
  const typeLabel = ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType.replace('_', ' ');
  const typeIcon = TYPE_ICONS[asset.assetType] ?? <FileText className="h-4 w-4" />;

  return (
    <button
      type="button"
      aria-label={`View ${asset.title}`}
      className={`flex flex-col min-w-[260px] max-w-[280px] shrink-0 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
        asset.status === 'verified' ? 'pr-8' : ''
      } ${asset.status === 'deprecated' ? 'opacity-75' : ''}`}
      onClick={onSelect}
    >
      {asset.status === 'verified' && (
        <div
          className="absolute top-0 right-0 w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded-bl-md"
          aria-label="Verified"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
      )}
      <div className="flex items-start gap-2 mb-2">
        <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
          {typeIcon}
        </div>
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 break-words min-w-0">
          {asset.title}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
        {stripSeedDescriptionSuffix(asset.description) || 'No description'}
      </p>
      <span
        className={`badge text-xs border w-fit ${HACK_TYPE_BADGE_COLORS[asset.assetType] ?? 'bg-muted text-muted-foreground border-border'}`}
      >
        {typeLabel}
      </span>
    </button>
  );
}
