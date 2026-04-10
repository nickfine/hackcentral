/**
 * PainPoints page — full browse, submit, and admin controls for pain points.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Pencil, Trash2, EyeOff, Eye, GitMerge } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { PainPointSubmitForm } from '@/components/homepage/PainPointSubmitForm';
import { SectionHeader } from '@/components/shared';
import toast from 'react-hot-toast';

const ESTIMATE_LABEL: Record<string, string> = { low: 'Low', medium: 'Med', high: 'High' };

// ─── Reaction Button ─────────────────────────────────────────────────────────

function ReactionButton({ painPointId, count }: { painPointId: Id<'painPoints'>; count: number }) {
  const react = useMutation(api.painPoints.react);
  return (
    <button
      type="button"
      onClick={() => react({ painPointId })}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      aria-label="React to this pain point"
    >
      <span>🔥</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

// ─── Inline Edit Form ─────────────────────────────────────────────────────────

interface EditFormProps {
  painPointId: Id<'painPoints'>;
  initialTitle: string;
  initialDescription?: string;
  initialEffort?: 'low' | 'medium' | 'high';
  initialImpact?: 'low' | 'medium' | 'high';
  onClose: () => void;
}

function EditForm({ painPointId, initialTitle, initialDescription, initialEffort, initialImpact, onClose }: EditFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [effortEstimate, setEffortEstimate] = useState<'low' | 'medium' | 'high' | ''>(initialEffort ?? '');
  const [impactEstimate, setImpactEstimate] = useState<'low' | 'medium' | 'high' | ''>(initialImpact ?? '');
  const [saving, setSaving] = useState(false);
  const adminEdit = useMutation(api.painPoints.adminEdit);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await adminEdit({
        painPointId,
        title: title.trim(),
        description: description.trim() || undefined,
        effortEstimate: effortEstimate || undefined,
        impactEstimate: impactEstimate || undefined,
      });
      toast.success('Updated');
      onClose();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input"
        placeholder="Title *"
        style={{ borderRadius: '0.5rem' }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="input resize-none"
        placeholder="Description (optional)"
        rows={2}
        style={{ borderRadius: '0.5rem' }}
      />
      <div className="flex gap-2">
        <select
          value={effortEstimate}
          onChange={(e) => setEffortEstimate(e.target.value as typeof effortEstimate)}
          className="input flex-1"
          style={{ borderRadius: '0.5rem' }}
        >
          <option value="">Effort –</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={impactEstimate}
          onChange={(e) => setImpactEstimate(e.target.value as typeof impactEstimate)}
          className="input flex-1"
          style={{ borderRadius: '0.5rem' }}
        >
          <option value="">Impact –</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving || !title.trim()} className="btn btn-primary btn-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
      </div>
    </div>
  );
}

// ─── Merge Dialog ─────────────────────────────────────────────────────────────

interface MergeDialogProps {
  sourceId: Id<'painPoints'>;
  sourceTitle: string;
  allPainPoints: Array<{ _id: Id<'painPoints'>; title: string }>;
  onClose: () => void;
}

function MergeDialog({ sourceId, sourceTitle, allPainPoints, onClose }: MergeDialogProps) {
  const [targetId, setTargetId] = useState<string>('');
  const [merging, setMerging] = useState(false);
  const adminMerge = useMutation(api.painPoints.adminMerge);

  const candidates = allPainPoints.filter((p) => p._id !== sourceId);

  const handleMerge = async () => {
    if (!targetId) return;
    setMerging(true);
    try {
      await adminMerge({ sourceId, targetId: targetId as Id<'painPoints'> });
      toast.success('Merged');
      onClose();
    } catch {
      toast.error('Failed to merge');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
      <p className="text-[12px] text-muted-foreground">
        Merge <strong>&ldquo;{sourceTitle}&rdquo;</strong> into:
      </p>
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="input"
        style={{ borderRadius: '0.5rem' }}
      >
        <option value="">Select target pain point…</option>
        {candidates.map((p) => (
          <option key={p._id} value={p._id}>{p.title}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button type="button" onClick={handleMerge} disabled={!targetId || merging} className="btn btn-primary btn-sm disabled:opacity-50">
          {merging ? 'Merging…' : 'Merge'}
        </button>
        <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
      </div>
    </div>
  );
}

// ─── Pain Point Card ──────────────────────────────────────────────────────────

interface PainPointCardProps {
  pp: {
    _id: Id<'painPoints'>;
    title: string;
    description?: string;
    submitterName: string;
    effortEstimate?: 'low' | 'medium' | 'high';
    impactEstimate?: 'low' | 'medium' | 'high';
    reactionCount: number;
    isHidden: boolean;
  };
  isAdmin: boolean;
  allPainPoints: Array<{ _id: Id<'painPoints'>; title: string }>;
}

function PainPointCard({ pp, isAdmin, allPainPoints }: PainPointCardProps) {
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const adminHide = useMutation(api.painPoints.adminHide);
  const adminUnhide = useMutation(api.painPoints.adminUnhide);
  const adminDelete = useMutation(api.painPoints.adminDelete);

  const handleHideToggle = async () => {
    try {
      if (pp.isHidden) {
        await adminUnhide({ painPointId: pp._id });
        toast.success('Unhidden');
      } else {
        await adminHide({ painPointId: pp._id });
        toast.success('Hidden');
      }
    } catch {
      toast.error('Failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${pp.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await adminDelete({ painPointId: pp._id });
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <div className={`card p-4 flex flex-col gap-2 ${pp.isHidden ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground leading-snug">{pp.title}</p>
          {pp.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{pp.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">by {pp.submitterName}</span>
            {pp.effortEstimate && (
              <span className="badge badge-outline text-[10px]">
                Effort: {ESTIMATE_LABEL[pp.effortEstimate]}
              </span>
            )}
            {pp.impactEstimate && (
              <span className="badge badge-outline text-[10px]">
                Impact: {ESTIMATE_LABEL[pp.impactEstimate]}
              </span>
            )}
            {pp.isHidden && (
              <span className="badge badge-secondary text-[10px]">Hidden</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ReactionButton painPointId={pp._id} count={pp.reactionCount} />
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setEditing((v) => !v); setMerging(false); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={handleHideToggle}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={pp.isHidden ? 'Unhide' : 'Hide'}
              >
                {pp.isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button
                type="button"
                onClick={() => { setMerging((v) => !v); setEditing(false); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Merge into another"
              >
                <GitMerge size={13} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditForm
          painPointId={pp._id}
          initialTitle={pp.title}
          initialDescription={pp.description}
          initialEffort={pp.effortEstimate}
          initialImpact={pp.impactEstimate}
          onClose={() => setEditing(false)}
        />
      )}

      {merging && (
        <MergeDialog
          sourceId={pp._id}
          sourceTitle={pp.title}
          allPainPoints={allPainPoints}
          onClose={() => setMerging(false)}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PainPoints() {
  const [sortBy, setSortBy] = useState<'reactions' | 'newest'>('reactions');
  const [search, setSearch] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);

  const isAdmin = useQuery(api.painPoints.viewerIsAdmin) ?? false;
  const allRows = useQuery(api.painPoints.listAll, { sortBy });

  const displayed = useMemo(() => {
    if (!allRows) return undefined;
    if (!search.trim()) return allRows;
    const lower = search.toLowerCase();
    return allRows.filter(
      (pp) =>
        pp.title.toLowerCase().includes(lower) ||
        pp.submitterName.toLowerCase().includes(lower) ||
        pp.description?.toLowerCase().includes(lower)
    );
  }, [allRows, search]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionHeader
        title="Pain points"
        description="Browse and react to pain points — or submit your own. HackDay teams can pick these up during team formation."
      />

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* Sort toggle */}
        <div className="flex rounded-full border border-border bg-background p-0.5 text-[12px]">
          <button
            type="button"
            onClick={() => setSortBy('reactions')}
            className={`rounded-full px-3 py-1 transition-colors ${
              sortBy === 'reactions'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🔥 Top
          </button>
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`rounded-full px-3 py-1 transition-colors ${
              sortBy === 'newest'
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ✨ New
          </button>
        </div>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="input flex-1 min-w-[180px]"
          style={{ borderRadius: '9999px' }}
        />

        {/* Submit toggle */}
        <button
          type="button"
          onClick={() => setShowSubmit((v) => !v)}
          className="btn btn-accent btn-sm shrink-0"
        >
          {showSubmit ? 'Cancel' : '+ Submit pain point'}
        </button>
      </div>

      {/* Submit form */}
      {showSubmit && (
        <div className="card mt-4 p-5">
          <p className="mb-4 font-display text-[16px] font-semibold">Submit a pain point</p>
          <PainPointSubmitForm onSuccess={() => setShowSubmit(false)} />
        </div>
      )}

      {/* List */}
      <div className="mt-6 flex flex-col gap-3">
        {displayed === undefined ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ))
        ) : displayed.length === 0 ? (
          <div className="card p-8 text-center text-muted-foreground text-[14px]">
            {search ? 'No pain points match your search.' : 'No pain points yet — be the first to submit one!'}
          </div>
        ) : (
          displayed.map((pp) => (
            <PainPointCard
              key={pp._id}
              pp={pp}
              isAdmin={isAdmin}
              allPainPoints={(allRows ?? []).map((p) => ({ _id: p._id, title: p.title }))}
            />
          ))
        )}
      </div>
    </div>
  );
}
