/**
 * Asset (hack) detail content — reuse summary, metadata, content, actions.
 * Used on the dedicated hack page (LibraryAssetDetail); supports onClose and onSelectAsset for navigation.
 */

import { useState } from 'react';
import { Sparkles, X, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuth } from '../../hooks/useAuth';
import { stripSeedDescriptionSuffix } from '@/lib/utils';

type AttachmentType = 'referenced' | 'copied' | 'linked' | 'attached';

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
  /** Button label for close/back (e.g. "Close" or "Back to Completed Hacks") */
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
                Featured Hacks
              </span>
            )}
          </div>
          {asset.description && (
            <p className="text-muted-foreground mb-4">{stripSeedDescriptionSuffix(asset.description)}</p>
          )}
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
      {asset.status === 'verified' && (asset.verifiedByFullName || asset.verifiedAt || asset.isAnonymous) && (
        <div className="text-sm text-muted-foreground">
          Verified{asset.isAnonymous ? ' (anonymous)' : asset.verifiedByFullName ? ` by ${asset.verifiedByFullName}` : ''}
          {asset.verifiedAt ? ` on ${new Date(asset.verifiedAt).toLocaleDateString()}` : ''}
        </div>
      )}

      {/* More like this (same type) */}
      {similarAssets !== undefined && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-sm mb-2">More like this</h3>
          {similarAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other {asset.assetType.replace('_', ' ')}s in Completed Hacks yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {similarAssets.map((a) => (
                <button
                  key={a._id}
                  type="button"
                  className="text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectAsset?.(a._id)}
                >
                  <span className="font-medium text-sm block truncate">{a.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
                </button>
              ))}
            </div>
          )}
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

      {/* Record use & Attach to project (authenticated only) */}
      {isAuthenticated && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">I used this:</span>
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
              className="btn btn-outline btn-sm"
              onClick={handleRecordReuse}
              disabled={isRecordingReuse}
            >
              {isRecordingReuse ? 'Recording…' : 'Record use'}
            </button>
          </div>
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
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
