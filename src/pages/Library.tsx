/**
 * Library Page - Library & AI Arsenal
 * Shows reusable AI assets, prompts, templates, and agent blueprints
 */

import { useState } from 'react';
import { Search, Plus, Sparkles, FileText, Bot, Shield, Award, X, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';

const ASSET_TYPES = [
  { value: 'prompt', label: 'Prompt' },
  { value: 'template', label: 'Template' },
  { value: 'agent_blueprint', label: 'Agent Blueprint' },
  { value: 'guardrail', label: 'Guardrail' },
  { value: 'evaluation_rubric', label: 'Evaluation Rubric' },
  { value: 'structured_output', label: 'Structured Output' },
] as const;

const VISIBILITY_OPTIONS = [
  { value: 'org', label: 'Organization (colleagues)' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private (only me)' },
] as const;

interface SubmitAssetModalProps {
  onClose: () => void;
  onSubmitSuccess: (newAssetId: Id<'libraryAssets'>) => void;
  createAsset: (args: {
    title: string;
    description?: string;
    assetType: 'prompt' | 'template' | 'agent_blueprint' | 'guardrail' | 'evaluation_rubric' | 'structured_output';
    content: string | Record<string, unknown>;
    visibility?: 'private' | 'org' | 'public';
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
        metadata,
      });
      onSubmitSuccess(newAssetId);
    } catch (err) {
      console.error('Failed to submit asset:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to submit asset');
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
            Submit Asset
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
              placeholder="Brief description of the asset"
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
                    placeholder="When to use this asset"
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

export default function Library() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedAssetId, setSelectedAssetId] = useState<Id<'libraryAssets'> | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const createAsset = useMutation(api.libraryAssets.create);
  const arsenalAssets = useQuery(api.libraryAssets.getArsenalWithReuseCounts);
  const selectedAsset = useQuery(
    api.libraryAssets.getById,
    selectedAssetId ? { assetId: selectedAssetId } : 'skip'
  );
  // Build query args - only include if value is set
  const queryArgs: {
    assetType?: "prompt" | "template" | "agent_blueprint" | "guardrail" | "evaluation_rubric" | "structured_output";
    status?: "draft" | "verified" | "deprecated";
    arsenalOnly?: boolean;
  } = {};
  
  if (selectedType) {
    queryArgs.assetType = selectedType as typeof queryArgs.assetType;
  }
  if (selectedStatus) {
    queryArgs.status = selectedStatus as typeof queryArgs.status;
  }
  
  const allAssets = useQuery(api.libraryAssets.listWithReuseCounts, queryArgs);

  return (
    <div className="space-y-6">
      {/* Asset Detail Modal */}
      {selectedAssetId !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAssetId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-detail-title"
        >
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedAsset === undefined ? (
              <div className="py-8 text-center">
                <h2 id="asset-detail-title" className="text-xl font-semibold mb-2">Loading...</h2>
                <p className="text-muted-foreground">Loading asset details</p>
              </div>
            ) : selectedAsset === null ? (
              <div className="space-y-4">
                <h2 id="asset-detail-title" className="text-xl font-semibold">
                  Asset not found
                </h2>
                <p className="text-muted-foreground">
                  This asset may be private or no longer available.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectedAssetId(null)}
                >
                  Close
                </button>
              </div>
            ) : (
              <AssetDetailContent
                asset={selectedAsset}
                assetId={selectedAssetId}
                onClose={() => setSelectedAssetId(null)}
              />
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Library</h1>
          <p className="text-muted-foreground mt-2">
            Reusable AI assets, prompts, and templates
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => setSubmitModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Submit Asset
        </button>
      </div>

      {/* Submit Asset Modal */}
      {submitModalOpen && (
        <SubmitAssetModal
          onClose={() => setSubmitModalOpen(false)}
          onSubmitSuccess={(newAssetId) => {
            setSubmitModalOpen(false);
            setSelectedAssetId(newAssetId);
            toast.success('Asset submitted! It will appear as Draft.');
          }}
          createAsset={createAsset}
        />
      )}

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search library..."
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
          <option value="template">Templates</option>
          <option value="agent_blueprint">Agent Blueprints</option>
          <option value="guardrail">Guardrails</option>
          <option value="evaluation_rubric">Evaluation Rubrics</option>
          <option value="structured_output">Structured Outputs</option>
        </select>
        <select 
          className="input w-36"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="verified">Verified</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>

      {/* AI Arsenal Section */}
      <div className="card p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">AI Arsenal</h2>
          <span className="badge badge-secondary text-xs">Curated</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          High-trust, curated collection of proven AI assets
        </p>
        {arsenalAssets === undefined ? (
          <div className="text-center py-8">Loading arsenal...</div>
        ) : arsenalAssets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No arsenal assets yet. Run seedAIArsenal to populate.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ArsenalCategory
                icon={<FileText className="h-5 w-5" />}
                title="Prompts"
                count={arsenalAssets.filter(a => a.assetType === 'prompt').length}
              />
              <ArsenalCategory
                icon={<FileText className="h-5 w-5" />}
                title="Templates"
                count={arsenalAssets.filter(a => a.assetType === 'template').length}
              />
              <ArsenalCategory
                icon={<Bot className="h-5 w-5" />}
                title="Agent Blueprints"
                count={arsenalAssets.filter(a => a.assetType === 'agent_blueprint').length}
              />
              <ArsenalCategory
                icon={<Shield className="h-5 w-5" />}
                title="Guardrails"
                count={arsenalAssets.filter(a => a.assetType === 'guardrail').length}
              />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {arsenalAssets.slice(0, 6).map((asset) => (
                <AssetCard key={asset._id} asset={asset} onSelect={setSelectedAssetId} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* All Assets */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          All Assets {allAssets && `(${allAssets.length})`}
        </h2>
        
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
            return (
              asset.title.toLowerCase().includes(searchLower) ||
              asset.description?.toLowerCase().includes(searchLower)
            );
          });
          return filteredAssets.length === 0 ? (
            <div className="card p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assets found</h3>
              <p className="text-muted-foreground">
                {debouncedSearch || selectedType || selectedStatus 
                  ? "No assets match your filters. Try adjusting your search or filters." 
                  : "Be the first to contribute an AI asset!"
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((asset) => (
                <AssetCard key={asset._id} asset={asset} onSelect={setSelectedAssetId} />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  )
}

interface ArsenalCategoryProps {
  icon: React.ReactNode
  title: string
  count: number
}

function ArsenalCategory({ icon, title, count }: ArsenalCategoryProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors cursor-pointer">
      <div className="p-2 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{count} assets</div>
      </div>
    </div>
  )
}

function AssetPlaceholder() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-muted rounded w-32" />
        <span className="badge badge-draft text-xs">Loading</span>
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

type AttachmentType = 'referenced' | 'copied' | 'linked' | 'attached';

interface AssetDetailContentProps {
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
  };
  assetId: Id<'libraryAssets'>;
  onClose: () => void;
}

function AssetDetailContent({ asset, assetId, onClose }: AssetDetailContentProps) {
  const { isAuthenticated } = useAuth();
  const [attachOpen, setAttachOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | ''>('');
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('attached');
  const [isSubmittingAttach, setIsSubmittingAttach] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const profile = useQuery(api.profiles.getCurrentProfile);
  const reuseCount = useQuery(api.libraryReuse.getReuseCountForAsset, { assetId });
  const projects = useQuery(api.projects.list);
  const attachToProject = useMutation(api.libraryReuse.attachToProject);
  const updateAsset = useMutation(api.libraryAssets.update);
  const isAuthor = Boolean(profile?._id && asset.authorId === profile._id);

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
      toast.success('Asset attached to project!');
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

  const handleStatusChange = async (newStatus: 'draft' | 'verified' | 'deprecated') => {
    if (!isAuthor || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateAsset({ assetId, status: newStatus });
      toast.success(newStatus === 'verified' ? 'Asset marked as verified.' : newStatus === 'deprecated' ? 'Asset marked as deprecated.' : 'Asset reverted to draft.');
    } catch (err) {
      console.error('Failed to update asset status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'badge-draft',
    verified: 'badge-verified',
    deprecated: 'badge-deprecated',
  };

  const contentDisplay =
    typeof asset.content === 'string'
      ? asset.content
      : typeof asset.content === 'object' && asset.content !== null
        ? JSON.stringify(asset.content, null, 2)
        : String(asset.content ?? '');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 id="asset-detail-title" className="text-xl font-semibold mb-2">
            {asset.title}
          </h2>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`badge ${statusColors[asset.status] ?? 'badge-outline'} text-xs`}>
              {asset.status}
            </span>
            <span className="badge badge-outline text-xs capitalize">
              {asset.assetType.replace('_', ' ')}
            </span>
            {asset.isArsenal && (
              <span className="badge badge-secondary text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Arsenal
              </span>
            )}
          </div>
          {asset.description && (
            <p className="text-muted-foreground mb-4">{asset.description}</p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Reuse summary */}
      <div className="text-sm text-muted-foreground">
        {reuseCount === undefined ? (
          <span>Loading reuse…</span>
        ) : (
          <span>
            {reuseCount.totalReuseEvents === 0
              ? 'No reuses yet'
              : `${reuseCount.totalReuseEvents} reuse${reuseCount.totalReuseEvents !== 1 ? 's' : ''} (${reuseCount.distinctProjectReuses} project${reuseCount.distinctProjectReuses !== 1 ? 's' : ''})`}
          </span>
        )}
      </div>

      {/* Verified by (when status is verified) */}
      {asset.status === 'verified' && (asset.verifiedByFullName || asset.verifiedAt) && (
        <div className="text-sm text-muted-foreground">
          Verified{asset.verifiedByFullName ? ` by ${asset.verifiedByFullName}` : ''}
          {asset.verifiedAt ? ` on ${new Date(asset.verifiedAt).toLocaleDateString()}` : ''}
        </div>
      )}

      {/* Status actions (author only) */}
      {isAuthor && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-sm mb-2">Status</h3>
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
            {asset.status !== 'draft' && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleStatusChange('draft')}
                disabled={isUpdatingStatus}
              >
                Revert to Draft
              </button>
            )}
          </div>
        </div>
      )}

      {/* Attach to project (authenticated only) */}
      {isAuthenticated && (
        <div className="border-t pt-4">
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
            <form onSubmit={handleAttachSubmit} className="space-y-3">
              <h3 className="font-semibold text-sm">Attach to project</h3>
              <div>
                <label htmlFor="attach-project" className="block text-sm font-medium mb-1">
                  Project
                </label>
                <select
                  id="attach-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId((e.target.value || '') as Id<'projects'> | '')}
                  className="input w-full"
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
                <label htmlFor="attach-type" className="block text-sm font-medium mb-1">
                  Attachment type
                </label>
                <select
                  id="attach-type"
                  value={attachmentType}
                  onChange={(e) => setAttachmentType(e.target.value as AttachmentType)}
                  className="input w-full"
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
                  className="btn btn-outline"
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
                  className="btn btn-primary"
                  disabled={!selectedProjectId || isSubmittingAttach}
                >
                  {isSubmittingAttach ? 'Attaching…' : 'Attach'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {asset.metadata && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm">Details</h3>
          <dl className="grid gap-2 text-sm">
            {asset.metadata.intendedUser && (
              <>
                <dt className="text-muted-foreground">Intended user</dt>
                <dd>{asset.metadata.intendedUser}</dd>
              </>
            )}
            {asset.metadata.context && (
              <>
                <dt className="text-muted-foreground">Context</dt>
                <dd>{asset.metadata.context}</dd>
              </>
            )}
            {asset.metadata.limitations && (
              <>
                <dt className="text-muted-foreground">Limitations</dt>
                <dd>{asset.metadata.limitations}</dd>
              </>
            )}
            {asset.metadata.riskNotes && (
              <>
                <dt className="text-muted-foreground">Risk notes</dt>
                <dd>{asset.metadata.riskNotes}</dd>
              </>
            )}
            {asset.metadata.exampleInput && (
              <>
                <dt className="text-muted-foreground">Example input</dt>
                <dd className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">
                  {asset.metadata.exampleInput}
                </dd>
              </>
            )}
            {asset.metadata.exampleOutput && (
              <>
                <dt className="text-muted-foreground">Example output</dt>
                <dd className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">
                  {asset.metadata.exampleOutput}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

      {contentDisplay && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-sm mb-2">Content</h3>
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
            {contentDisplay}
          </pre>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
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
    template: <FileText className="h-4 w-4" />,
    agent_blueprint: <Bot className="h-4 w-4" />,
    guardrail: <Shield className="h-4 w-4" />,
    evaluation_rubric: <Award className="h-4 w-4" />,
    structured_output: <FileText className="h-4 w-4" />,
  };

  const statusColors: Record<string, string> = {
    draft: 'badge-draft',
    verified: 'badge-verified',
    deprecated: 'badge-deprecated',
  };

  const reuseCount = asset.totalReuseEvents ?? 0;

  return (
    <div
      className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(asset._id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(asset._id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 text-primary">
            {typeIcons[asset.assetType] || <FileText className="h-4 w-4" />}
          </div>
          <h3 className="font-semibold text-sm leading-tight">{asset.title}</h3>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className={`badge ${statusColors[asset.status]} text-xs`}>
            {asset.status}
          </span>
          {asset.isArsenal && (
            <span className="badge badge-secondary text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Arsenal
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {asset.description || 'No description'}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{asset.assetType.replace('_', ' ')}</span>
        <span>{reuseCount} reuse{reuseCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
