/**
 * Library Page - Completed Hacks & Featured Hacks
 * Shows reusable AI hacks: prompts, skills, and apps
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Sparkles, FileText, Bot, Code, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useDebounce } from '../hooks/useDebounce';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { EmptyState } from '../components/shared';
import { HACK_TYPE_BADGE_COLORS } from '@/constants/project';
import { stripSeedDescriptionSuffix } from '@/lib/utils';

const ASSET_TYPES = [
  { value: 'prompt', label: 'Prompt' },
  { value: 'skill', label: 'Skill' },
  { value: 'app', label: 'App' },
] as const;

const VISIBILITY_OPTIONS = [
  { value: 'org', label: 'Organization (colleagues)' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private (sandbox — only you until published)' },
] as const;

interface SubmitAssetModalProps {
  onClose: () => void;
  onSubmitSuccess: (newAssetId: Id<'libraryAssets'>) => void;
  createAsset: (args: {
    title: string;
    description?: string;
    assetType: 'prompt' | 'skill' | 'app';
    content: string | Record<string, unknown>;
    visibility?: 'private' | 'org' | 'public';
    isAnonymous?: boolean;
    metadata?: {
      intendedUser?: string;
      context?: string;
      limitations?: string;
      riskNotes?: string;
      exampleInput?: string;
      exampleOutput?: string;
    };
  }) => Promise<Id<'libraryAssets'>>;
}

function SubmitAssetModal({ onClose, onSubmitSuccess, createAsset }: SubmitAssetModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetType, setAssetType] = useState<typeof ASSET_TYPES[number]['value']>('prompt');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'org' | 'public'>('org');
  const [intendedUser, setIntendedUser] = useState('');
  const [context, setContext] = useState('');
  const [limitations, setLimitations] = useState('');
  const [riskNotes, setRiskNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const metadata =
        intendedUser || context || limitations || riskNotes
          ? { intendedUser: intendedUser || undefined, context: context || undefined, limitations: limitations || undefined, riskNotes: riskNotes || undefined }
          : undefined;
      const newAssetId = await createAsset({
        title: title.trim(),
        description: description.trim() || undefined,
        assetType,
        content: content.trim(),
        visibility,
        isAnonymous,
        metadata,
      });
      onSubmitSuccess(newAssetId);
    } catch (err) {
      console.error('Failed to submit asset:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit hack');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-asset-title"
    >
      <div
        className="max-w-xl w-full max-h-[90vh] overflow-y-auto card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="submit-asset-title" className="text-xl font-semibold">
            Submit Hack
          </h2>
          <button
            type="button"
            className="p-2 rounded hover:bg-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="submit-title" className="block text-sm font-medium mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="submit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              placeholder="e.g. Code review prompt"
              required
            />
          </div>
          <div>
            <label htmlFor="submit-description" className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              id="submit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full min-h-[80px]"
              placeholder="Brief description of the hack"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="submit-type" className="block text-sm font-medium mb-1">
              Type <span className="text-destructive">*</span>
            </label>
            <select
              id="submit-type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as typeof assetType)}
              className="input w-full"
              required
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="submit-content" className="block text-sm font-medium mb-1">
              Content <span className="text-destructive">*</span>
            </label>
            <textarea
              id="submit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input w-full min-h-[120px] font-mono text-sm"
              placeholder="Prompt text, template body, or JSON for structured types"
              required
              rows={5}
            />
          </div>
          <div>
            <label htmlFor="submit-visibility" className="block text-sm font-medium mb-1">
              Visibility
            </label>
            <select
              id="submit-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'org' | 'public')}
              className="input w-full"
            >
              {VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Sandbox: choose Private to draft until you’re ready to share with your org or publicly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="submit-anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="submit-anonymous" className="text-sm">
              Submit anonymously (author hidden in UI)
            </label>
          </div>
          <div>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowMetadata((s) => !s)}
            >
              {showMetadata ? 'Hide' : '+ Add'} optional metadata (intended user, context, limitations)
            </button>
            {showMetadata && (
              <div className="mt-3 space-y-3 pl-2 border-l-2 border-muted">
                <div>
                  <label htmlFor="submit-intended-user" className="block text-sm mb-1">
                    Intended user
                  </label>
                  <input
                    id="submit-intended-user"
                    type="text"
                    value={intendedUser}
                    onChange={(e) => setIntendedUser(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. Developers"
                  />
                </div>
                <div>
                  <label htmlFor="submit-context" className="block text-sm mb-1">
                    Context
                  </label>
                  <input
                    id="submit-context"
                    type="text"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="input w-full"
                    placeholder="When to use this hack"
                  />
                </div>
                <div>
                  <label htmlFor="submit-limitations" className="block text-sm mb-1">
                    Limitations
                  </label>
                  <input
                    id="submit-limitations"
                    type="text"
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    className="input w-full"
                    placeholder="Known limitations"
                  />
                </div>
                <div>
                  <label htmlFor="submit-risk-notes" className="block text-sm mb-1">
                    Risk notes
                  </label>
                  <input
                    id="submit-risk-notes"
                    type="text"
                    value={riskNotes}
                    onChange={(e) => setRiskNotes(e.target.value)}
                    className="input w-full"
                    placeholder="Safety or risk considerations"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface LibraryEmbeddedProps {
  embedded?: boolean;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  selectedType?: string;
  setSelectedType?: (t: string) => void;
  selectedStatus?: string;
  setSelectedStatus?: (s: string) => void;
  /** When true, include deprecated assets in the list. When false (default), exclude them unless status filter is "deprecated". */
  showDeprecated?: boolean;
  submitModalOpen?: boolean;
  setSubmitModalOpen?: (open: boolean) => void;
}

export default function Library(props: LibraryEmbeddedProps = {}) {
  const {
    embedded = false,
    searchQuery: searchQueryProp,
    setSearchQuery: setSearchQueryProp,
    selectedType: selectedTypeProp,
    setSelectedType: setSelectedTypeProp,
    selectedStatus: selectedStatusProp,
    setSelectedStatus: setSelectedStatusProp,
    showDeprecated = false,
    submitModalOpen: submitModalOpenProp,
    setSubmitModalOpen: setSubmitModalOpenProp,
  } = props;

  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get('q') ?? '';
  const [internalSearchQuery, setInternalSearchQuery] = useState(qFromUrl);
  const searchQuery = embedded && searchQueryProp !== undefined ? searchQueryProp : internalSearchQuery;
  const setSearchQuery = embedded && setSearchQueryProp ? setSearchQueryProp : setInternalSearchQuery;
  const debouncedSearch = useDebounce(searchQuery);

  useEffect(() => {
    if (!embedded) setInternalSearchQuery(qFromUrl);
  }, [qFromUrl, embedded]);
  const navigate = useNavigate();
  const [internalType, setInternalType] = useState<string>('');
  const [internalStatus, setInternalStatus] = useState<string>('');
  const selectedType = embedded && selectedTypeProp !== undefined ? selectedTypeProp : internalType;
  const setSelectedType = embedded && setSelectedTypeProp ? setSelectedTypeProp : setInternalType;
  const selectedStatus = embedded && selectedStatusProp !== undefined ? selectedStatusProp : internalStatus;
  const setSelectedStatus = embedded && setSelectedStatusProp ? setSelectedStatusProp : setInternalStatus;
  const [internalSubmitModalOpen, setInternalSubmitModalOpen] = useState(false);
  const submitModalOpen = embedded && submitModalOpenProp !== undefined ? submitModalOpenProp : internalSubmitModalOpen;
  const setSubmitModalOpen = embedded && setSubmitModalOpenProp ? setSubmitModalOpenProp : setInternalSubmitModalOpen;
  const [assetLimit, setAssetLimit] = useState(30);

  // Redirect old ?asset=xxx URLs to dedicated page
  const assetFromUrl = searchParams.get('asset');
  useEffect(() => {
    if (assetFromUrl) {
      navigate(`/library/${assetFromUrl}`, { replace: true });
    }
  }, [assetFromUrl, navigate]);

  // Open Submit Hack modal when ?action=new is present (deep link from Quick Actions / Featured Hacks)
  const actionFromUrl = searchParams.get('action');
  useEffect(() => {
    if (actionFromUrl === 'new') {
      setSubmitModalOpen(true);
    }
  }, [actionFromUrl]);

  const createAsset = useMutation(api.libraryAssets.create);
  const arsenalAssets = useQuery(api.libraryAssets.getArsenalWithReuseCounts);
  // Build query args - only include if value is set
  const queryArgs: {
    assetType?: "prompt" | "skill" | "app";
    status?: "in_progress" | "verified" | "deprecated";
    arsenalOnly?: boolean;
    limit?: number;
    excludeDeprecated?: boolean;
  } = { limit: assetLimit, excludeDeprecated: !showDeprecated };
  
  if (selectedType) {
    queryArgs.assetType = selectedType as typeof queryArgs.assetType;
  }
  if (selectedStatus) {
    queryArgs.status = selectedStatus as typeof queryArgs.status;
  }
  
  const allAssets = useQuery(api.libraryAssets.listWithReuseCounts, queryArgs);
  const graduatedAssets = useQuery(api.metrics.getGraduatedAssets, { minReuses: 10 });

  const loadMoreAssets = () => setAssetLimit((prev) => prev + 30);
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMoreAssets,
    hasMore: allAssets != null && allAssets.length === assetLimit,
  });

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Completed Hacks</h1>
              <p className="text-muted-foreground mt-2">
                Reusable AI hacks: prompts, skills, and apps. The <strong>Featured Hacks</strong> is curated; <strong>All Hacks</strong> shows everything in Completed Hacks.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => setSubmitModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Submit Hack
            </button>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Completed Hacks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              className="input w-40"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="prompt">Prompts</option>
              <option value="skill">Skills</option>
              <option value="app">Apps</option>
            </select>
            <select
              className="input w-36"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="in_progress">In progress</option>
              <option value="verified">Verified</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </>
      )}

      {/* Submit Asset Modal */}
      {submitModalOpen && (
        <SubmitAssetModal
          onClose={() => {
            setSubmitModalOpen(false);
            if (searchParams.get('action') === 'new') {
              navigate('/hacks?tab=completed', { replace: true });
            }
          }}
          onSubmitSuccess={(newAssetId) => {
            setSubmitModalOpen(false);
            navigate(`/library/${newAssetId}`);
            toast.success('Hack submitted! It will appear as In progress.');
          }}
          createAsset={createAsset}
        />
      )}

      {/* Featured Hacks Section — one row, no Curated badge, no category row */}
      <div className="card p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Featured Hacks</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          High-trust, curated collection of proven AI hacks
        </p>
        {arsenalAssets === undefined ? (
          <div className="text-center py-8">Loading featured hacks...</div>
        ) : arsenalAssets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No featured hacks yet. Run seedAIArsenal to populate.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {arsenalAssets.slice(0, 4).map((asset) => (
              <AssetCard key={asset._id} asset={asset} onSelect={(id) => navigate(`/library/${id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Graduated hacks (reuse threshold >= 10) */}
      {graduatedAssets !== undefined && graduatedAssets.length > 0 && (
        <div className="card p-6 border-primary/20">
          <h2 className="text-xl font-semibold mb-2">Graduated hacks</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Hacks with 10+ reuses — ready for template packs and playbooks.
          </p>
          <ul className="space-y-2">
            {graduatedAssets.slice(0, 8).map(({ assetId, title, reuseCount }) => (
              <li key={assetId}>
                <button
                  type="button"
                  onClick={() => navigate(`/library/${assetId}`)}
                  className="w-full text-left card p-3 hover:bg-accent/50 transition-colors rounded-lg flex items-center justify-between"
                >
                  <span className="font-medium">{title}</span>
                  <span className="text-muted-foreground text-sm">{reuseCount} reuses</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All Hacks list (no section heading) */}
      <div>
        {allAssets === undefined ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AssetPlaceholder />
            <AssetPlaceholder />
            <AssetPlaceholder />
          </div>
        ) : (() => {
          const filteredAssets = allAssets.filter((asset) => {
            if (!debouncedSearch) return true;
            const searchLower = debouncedSearch.toLowerCase();
            const titleMatch = asset.title.toLowerCase().includes(searchLower);
            const descMatch = asset.description?.toLowerCase().includes(searchLower);
            const typeMatch = asset.assetType.replace('_', ' ').toLowerCase().includes(searchLower);
            const meta = asset.metadata as { intendedUser?: string; context?: string; limitations?: string; riskNotes?: string } | undefined;
            const metaParts = meta
              ? [meta.intendedUser, meta.context, meta.limitations, meta.riskNotes].filter((x): x is string => typeof x === 'string')
              : [];
            const metaText = metaParts.join(' ').toLowerCase();
            const metaMatch = metaText.length > 0 && metaText.includes(searchLower);
            return titleMatch || descMatch || typeMatch || metaMatch;
          });
          // Down-rank deprecated: verified first, then in_progress, then deprecated
          const statusOrder: Record<string, number> = { verified: 0, in_progress: 1, draft: 1, deprecated: 2 };
          const sortedAssets = [...filteredAssets].sort(
            (a, b) => (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
          );
          return sortedAssets.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="No hacks found"
              description={
                debouncedSearch || selectedType || selectedStatus
                  ? 'No hacks match your filters. Try adjusting your search or filters.'
                  : "Be the first to contribute an AI hack!"
              }
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedAssets.map((asset) => (
                  <AssetCard key={asset._id} asset={asset} onSelect={(id) => navigate(`/library/${id}`)} />
                ))}
              </div>
              {allAssets != null && allAssets.length === assetLimit && (
                <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
              )}
            </>
          );
        })()}
      </div>
    </div>
  )
}

function AssetPlaceholder() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-muted rounded w-32" />
        <span className="badge badge-in-progress text-xs">Loading</span>
      </div>
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">-- reuses</span>
        <span className="text-muted-foreground">by --</span>
      </div>
    </div>
  )
}

interface AssetCardProps {
  asset: {
    _id: Id<"libraryAssets">;
    title: string;
    description?: string;
    assetType: string;
    status: string;
    isArsenal: boolean;
    totalReuseEvents?: number;
  };
  onSelect?: (id: Id<"libraryAssets">) => void;
}

function AssetCard({ asset, onSelect }: AssetCardProps) {
  const typeIcons: Record<string, React.ReactNode> = {
    prompt: <FileText className="h-4 w-4" />,
    skill: <Code className="h-4 w-4" />,
    app: <Bot className="h-4 w-4" />,
  };

  const reuseCount = asset.totalReuseEvents ?? 0;
  const typeLabel = ASSET_TYPES.find((t) => t.value === asset.assetType)?.label ?? asset.assetType;

  return (
    <div
      className={`card p-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden ${asset.status === 'verified' ? 'pr-8' : ''} ${asset.status === 'deprecated' ? 'opacity-75' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(asset._id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(asset._id)}
    >
      {/* Verified: corner flash (green + tick) */}
      {asset.status === 'verified' && (
        <div
          className="absolute top-0 right-0 w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded-bl-md"
          aria-label="Verified"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
            {typeIcons[asset.assetType] || <FileText className="h-4 w-4" />}
          </div>
          <h3 className="font-semibold text-sm leading-tight truncate">{asset.title}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {stripSeedDescriptionSuffix(asset.description) || 'No description'}
      </p>

      {/* Bottom row: type lozenge left, reuse count right — grid keeps same line on all cards */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-1 min-w-0">
        <span className={`badge text-xs border w-fit whitespace-nowrap truncate min-w-0 max-w-full ${HACK_TYPE_BADGE_COLORS[asset.assetType] ?? 'bg-muted text-muted-foreground border-border'}`}>
          {typeLabel}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap text-right">
          {reuseCount} reuse{reuseCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
