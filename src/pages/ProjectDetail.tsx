/**
 * Project Detail Page
 * Dedicated page for a single project: title, status, owner, description,
 * learning summary, close/archive (owner), and full comments section.
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Archive, CheckCircle, ArrowLeft, Shield, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../hooks/useAuth';
import { PROJECT_STATUS_LABELS, HACK_TYPE_LABELS, HACK_TYPE_BADGE_COLORS, HACK_TYPES } from '../constants/project';
import { stripSeedDescriptionSuffix } from '@/lib/utils';

export default function ProjectDetail() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = projectIdParam as Id<'projects'> | undefined;

  const { isAuthenticated } = useAuth();
  const project = useQuery(
    api.projects.getById,
    projectId ? { projectId } : 'skip'
  );
  const profile = useQuery(api.profiles.getCurrentProfile);
  const comments = useQuery(
    api.projectComments.listForProject,
    projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
  );
  const publicConfig = useQuery(api.settings.getPublicConfig);
  const addComment = useMutation(api.projectComments.add);
  const updateProject = useMutation(api.projects.update);

  const [commentContent, setCommentContent] = useState('');
  const [commentIsAiRelated, setCommentIsAiRelated] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [closeFormOpen, setCloseFormOpen] = useState(false);
  const [closeTargetStatus, setCloseTargetStatus] = useState<'completed' | 'archived'>('completed');
  const [failuresAndLessons, setFailuresAndLessons] = useState('');
  const [timeSavedEstimate, setTimeSavedEstimate] = useState<string>('');
  const [workflowTransformed, setWorkflowTransformed] = useState(false);
  const [aiToolsUsedText, setAiToolsUsedText] = useState('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [readinessFormOpen, setReadinessFormOpen] = useState(false);
  const [impactHypothesis, setImpactHypothesis] = useState('');
  const [riskCheckNotes, setRiskCheckNotes] = useState('');
  const [isSubmittingReadiness, setIsSubmittingReadiness] = useState(false);
  const [sponsorFormOpen, setSponsorFormOpen] = useState(false);
  const [isSubmittingSponsor, setIsSubmittingSponsor] = useState(false);
  const [learningSummaryFormOpen, setLearningSummaryFormOpen] = useState(false);
  const [isSubmittingLearningSummary, setIsSubmittingLearningSummary] = useState(false);

  const isOwner = Boolean(project && profile && project.ownerId === profile._id);
  const isClosed = project?.status === 'completed' || project?.status === 'archived';
  const hasLearningSummary = Boolean(
    project &&
      (project.failuresAndLessons?.trim() ||
        project.timeSavedEstimate != null ||
        (project.aiToolsUsed?.length ?? 0) > 0 ||
        project.workflowTransformed)
  );
  const showLearningSummaryNudge =
    isClosed && isOwner && !hasLearningSummary;

  useEffect(() => {
    if (project && window.location.hash === '#comments') {
      document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [project]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !commentContent.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await addComment({
        projectId: projectId as Id<'projects'>,
        content: commentContent.trim(),
        isAiRelated: commentIsAiRelated,
      });
      toast.success('Comment added!');
      setCommentContent('');
      setCommentIsAiRelated(false);
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || isSubmittingClose) return;
    if (!failuresAndLessons.trim()) {
      toast.error('Please add lessons learned.');
      return;
    }
    setIsSubmittingClose(true);
    try {
      await updateProject({
        projectId: projectId as Id<'projects'>,
        status: closeTargetStatus,
        failuresAndLessons: failuresAndLessons.trim(),
        timeSavedEstimate: timeSavedEstimate === '' ? undefined : Number(timeSavedEstimate),
        workflowTransformed,
        aiToolsUsed: aiToolsUsedText.trim() ? aiToolsUsedText.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      });
      toast.success(closeTargetStatus === 'archived' ? 'Project archived.' : 'Project marked as completed.');
      setCloseFormOpen(false);
      setFailuresAndLessons('');
      setTimeSavedEstimate('');
      setWorkflowTransformed(false);
      setAiToolsUsedText('');
    } catch (err) {
      console.error('Failed to close project:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handleReadinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !impactHypothesis.trim() || isSubmittingReadiness) return;
    setIsSubmittingReadiness(true);
    try {
      await updateProject({
        projectId: projectId as Id<'projects'>,
        status: 'building',
        readinessCompletedAt: Date.now(),
        riskCheckNotes: riskCheckNotes.trim() || undefined,
        aiImpactHypothesis: impactHypothesis.trim(),
      });
      toast.success('Readiness complete. Project moved to Building.');
      setReadinessFormOpen(false);
      setImpactHypothesis('');
      setRiskCheckNotes('');
    } catch (err) {
      console.error('Failed to submit readiness:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setIsSubmittingReadiness(false);
    }
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || isSubmittingSponsor) return;
    setIsSubmittingSponsor(true);
    try {
      await updateProject({
        projectId: projectId as Id<'projects'>,
        status: 'incubation',
        sponsorCommittedAt: Date.now(),
      });
      toast.success('Sponsor committed. Project moved to Incubation.');
      setSponsorFormOpen(false);
    } catch (err) {
      console.error('Failed to submit sponsor commitment:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setIsSubmittingSponsor(false);
    }
  };

  const handleLearningSummarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || isSubmittingLearningSummary) return;
    if (!failuresAndLessons.trim()) {
      toast.error('Please add lessons learned.');
      return;
    }
    setIsSubmittingLearningSummary(true);
    try {
      await updateProject({
        projectId: projectId as Id<'projects'>,
        failuresAndLessons: failuresAndLessons.trim(),
        timeSavedEstimate: timeSavedEstimate === '' ? undefined : Number(timeSavedEstimate),
        workflowTransformed,
        aiToolsUsed: aiToolsUsedText.trim()
          ? aiToolsUsedText.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      toast.success('Learning summary saved.');
      setLearningSummaryFormOpen(false);
      setFailuresAndLessons('');
      setTimeSavedEstimate('');
      setWorkflowTransformed(false);
      setAiToolsUsedText('');
    } catch (err) {
      console.error('Failed to save learning summary:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSubmittingLearningSummary(false);
    }
  };

  if (!projectId) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invalid project.</p>
        <Link to="/hacks?tab=in_progress" className="btn btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hacks In Progress
        </Link>
      </div>
    );
  }

  if (project === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Loading project…</p>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Link to="/hacks?tab=in_progress" className="btn btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hacks In Progress
        </Link>
      </div>
    );
  }

  const projectWithOwner = project as typeof project & { ownerFullName?: string };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/hacks?tab=in_progress"
          className="btn btn-ghost btn-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          aria-label="Back to Hacks In Progress"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hacks In Progress
        </Link>
      </div>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight mb-2">{project.title}</h1>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {project.hackType ? (
            <span className={`badge text-xs border ${HACK_TYPE_BADGE_COLORS[project.hackType] ?? 'bg-muted text-muted-foreground border-border'}`}>
              {HACK_TYPE_LABELS[project.hackType] ?? project.hackType}
            </span>
          ) : null}
          {isOwner && (
            <select
              className="input text-xs py-1 h-8 w-auto max-w-[180px]"
              value={project.hackType ?? ''}
              onChange={async (e) => {
                const value = e.target.value || undefined;
                if (!value) {
                  toast('Select a type to update. Hack type cannot be cleared.', { icon: 'ℹ️' });
                  return;
                }
                try {
                  await updateProject({
                    projectId: projectId as Id<'projects'>,
                    hackType: value as (typeof HACK_TYPES)[number]['value'],
                  });
                  toast.success('Hack type updated.');
                } catch (err) {
                  console.error('Failed to update hack type:', err);
                  toast.error('Failed to update. Please try again.');
                }
              }}
              aria-label="Hack type"
            >
              <option value="">Set hack type</option>
              {HACK_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <span className="badge badge-outline text-xs">
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </span>
          {'readinessCompletedAt' in project && project.readinessCompletedAt != null && (
            <span className="badge text-xs bg-green-100 text-green-800 border-green-200 inline-flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Readiness complete
            </span>
          )}
          {'sponsorCommittedAt' in project && project.sponsorCommittedAt != null && (
            <span className="badge text-xs bg-blue-100 text-blue-800 border-blue-200 inline-flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Sponsor committed
            </span>
          )}
          {projectWithOwner.ownerFullName && (
            <span className="text-sm text-muted-foreground">
              Owner: {projectWithOwner.ownerFullName}
            </span>
          )}
        </div>
        {project.description && (
          <p className="text-muted-foreground mb-6 whitespace-pre-wrap">{stripSeedDescriptionSuffix(project.description)}</p>
        )}

        {/* Learning summary (when completed/archived) */}
        {isClosed &&
          (project.failuresAndLessons ||
            project.timeSavedEstimate != null ||
            (project.aiToolsUsed?.length ?? 0) > 0 ||
            project.workflowTransformed) && (
            <div className="border-t pt-4 mb-6">
              <h2 className="font-semibold text-sm mb-2">Learning summary</h2>
              <dl className="space-y-2 text-sm">
                {project.failuresAndLessons && (
                  <>
                    <dt className="text-muted-foreground">Lessons learned</dt>
                    <dd className="whitespace-pre-wrap">{project.failuresAndLessons}</dd>
                  </>
                )}
                {project.timeSavedEstimate != null && (
                  <>
                    <dt className="text-muted-foreground">Time saved (est. hours)</dt>
                    <dd>{project.timeSavedEstimate}</dd>
                  </>
                )}
                {project.aiToolsUsed && project.aiToolsUsed.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">AI tools used</dt>
                    <dd>{project.aiToolsUsed.join(', ')}</dd>
                  </>
                )}
                {project.workflowTransformed && (
                  <dd className="text-muted-foreground">Workflow transformed with AI</dd>
                )}
              </dl>
            </div>
          )}

        {/* Learning summary nudge (owner, completed/archived, no summary yet) */}
        {showLearningSummaryNudge && (
          <div className="border-t pt-4 mb-6">
            <div className="rounded-lg border bg-muted/30 p-4">
              {!learningSummaryFormOpen ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    {publicConfig?.nudgeCopyVariant === 'b'
                      ? "This project hasn't posted an AI lesson — want help summarizing?"
                      : "This project doesn't have a learning summary yet. Add what you learned to help others."}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setLearningSummaryFormOpen(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Add learning summary
                  </button>
                </>
              ) : (
                <form onSubmit={handleLearningSummarySubmit} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Capture lessons learned, time saved, and AI tools used.
                  </p>
                  <div>
                    <label htmlFor="nudge-lessons" className="block text-sm font-medium mb-1">
                      Lessons learned <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="nudge-lessons"
                      value={failuresAndLessons}
                      onChange={(e) => setFailuresAndLessons(e.target.value)}
                      className="input w-full min-h-[80px]"
                      placeholder="What worked, what didn't, what you'd do differently"
                      required
                      rows={3}
                    />
                  </div>
                  <div>
                    <label htmlFor="nudge-time-saved" className="block text-sm font-medium mb-1">
                      Time saved (hours, optional)
                    </label>
                    <input
                      id="nudge-time-saved"
                      type="number"
                      min={0}
                      step={0.5}
                      value={timeSavedEstimate}
                      onChange={(e) => setTimeSavedEstimate(e.target.value)}
                      className="input w-24"
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div>
                    <label htmlFor="nudge-tools" className="block text-sm font-medium mb-1">
                      AI tools used (optional, comma-separated)
                    </label>
                    <input
                      id="nudge-tools"
                      type="text"
                      value={aiToolsUsedText}
                      onChange={(e) => setAiToolsUsedText(e.target.value)}
                      className="input w-full"
                      placeholder="e.g. ChatGPT, Cursor, Copilot"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="nudge-workflow"
                      type="checkbox"
                      checked={workflowTransformed}
                      onChange={(e) => setWorkflowTransformed(e.target.checked)}
                      className="rounded border-input"
                    />
                    <label htmlFor="nudge-workflow" className="text-sm">
                      Workflow transformed with AI
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setLearningSummaryFormOpen(false);
                        setFailuresAndLessons('');
                        setTimeSavedEstimate('');
                        setWorkflowTransformed(false);
                        setAiToolsUsedText('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isSubmittingLearningSummary || !failuresAndLessons.trim()}
                    >
                      {isSubmittingLearningSummary ? 'Saving…' : 'Save learning summary'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Move to Building (owner only, when idea) */}
        {isOwner && project.status === 'idea' && (
          <div className="border-t pt-4 mb-6">
            <h2 className="font-semibold text-sm mb-2">Move to Building</h2>
            {!readinessFormOpen ? (
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setReadinessFormOpen(true)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Complete readiness and move to Building
                </button>
              </div>
            ) : (
              <form onSubmit={handleReadinessSubmit} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  AI readiness: impact hypothesis and lightweight risk check (bias, privacy, misuse).
                </p>
                <div>
                  <label htmlFor="readiness-impact" className="block text-sm font-medium mb-1">
                    AI impact hypothesis <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="readiness-impact"
                    value={impactHypothesis}
                    onChange={(e) => setImpactHypothesis(e.target.value)}
                    className="input w-full min-h-[80px]"
                    placeholder="Time saved, error reduction, throughput gain..."
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <label htmlFor="readiness-risk" className="block text-sm font-medium mb-1">
                    Risk check notes (bias, privacy, misuse)
                  </label>
                  <textarea
                    id="readiness-risk"
                    value={riskCheckNotes}
                    onChange={(e) => setRiskCheckNotes(e.target.value)}
                    className="input w-full min-h-[60px]"
                    placeholder="Optional: note any checks done."
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setReadinessFormOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={isSubmittingReadiness || !impactHypothesis.trim()}
                  >
                    {isSubmittingReadiness ? 'Saving…' : 'Complete readiness & move to Building'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Move to Incubation (owner only, when building) */}
        {isOwner && project.status === 'building' && (
          <div className="border-t pt-4 mb-6">
            <h2 className="font-semibold text-sm mb-2">Move to Incubation</h2>
            {!sponsorFormOpen ? (
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSponsorFormOpen(true)}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Confirm sponsor commitment and move to Incubation
                </button>
              </div>
            ) : (
              <form onSubmit={handleSponsorSubmit} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sponsor commitment to agent ops review when agentic components exist.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setSponsorFormOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={isSubmittingSponsor}
                  >
                    {isSubmittingSponsor ? 'Saving…' : 'Confirm & move to Incubation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Close / Archive (owner only, when not closed) */}
        {isOwner && !isClosed && (
          <div className="border-t pt-4 mb-6">
            <h2 className="font-semibold text-sm mb-2">Close or archive</h2>
            {!closeFormOpen ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setCloseTargetStatus('completed');
                    setCloseFormOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark completed
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setCloseTargetStatus('archived');
                    setCloseFormOpen(true);
                  }}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </button>
              </div>
            ) : (
              <form onSubmit={handleCloseSubmit} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {closeTargetStatus === 'archived'
                    ? 'Archive this project and capture what you learned.'
                    : 'Mark as completed and capture what you learned.'}
                </p>
                <div>
                  <label htmlFor="close-lessons" className="block text-sm font-medium mb-1">
                    Lessons learned <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="close-lessons"
                    value={failuresAndLessons}
                    onChange={(e) => setFailuresAndLessons(e.target.value)}
                    className="input w-full min-h-[80px]"
                    placeholder="What worked, what didn't, what you'd do differently"
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <label htmlFor="close-time-saved" className="block text-sm font-medium mb-1">
                    Time saved (hours, optional)
                  </label>
                  <input
                    id="close-time-saved"
                    type="number"
                    min={0}
                    step={0.5}
                    value={timeSavedEstimate}
                    onChange={(e) => setTimeSavedEstimate(e.target.value)}
                    className="input w-24"
                    placeholder="e.g. 12"
                  />
                </div>
                <div>
                  <label htmlFor="close-tools" className="block text-sm font-medium mb-1">
                    AI tools used (optional, comma-separated)
                  </label>
                  <input
                    id="close-tools"
                    type="text"
                    value={aiToolsUsedText}
                    onChange={(e) => setAiToolsUsedText(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. ChatGPT, Cursor, Copilot"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="close-workflow"
                    type="checkbox"
                    checked={workflowTransformed}
                    onChange={(e) => setWorkflowTransformed(e.target.checked)}
                    className="rounded border-input"
                  />
                  <label htmlFor="close-workflow" className="text-sm">
                    Workflow transformed with AI
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setCloseFormOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={isSubmittingClose}
                  >
                    {isSubmittingClose
                      ? 'Saving…'
                      : closeTargetStatus === 'archived'
                        ? 'Archive'
                        : 'Mark completed'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Comments (full section, no "View in full") */}
        <div id="comments" className="border-t pt-6 scroll-mt-4">
          <h2 className="font-semibold text-lg mb-4">Comments</h2>
          {comments === undefined ? (
            <p className="text-muted-foreground">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-muted-foreground mb-6">No comments yet.</p>
          ) : (
            <ul className="space-y-3 mb-6">
              {comments.map(({ comment, author }) => (
                <li key={comment._id} className="border-b pb-3 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {author?.fullName ?? 'Unknown'}
                    </span>
                    {comment.isAiRelated && (
                      <span className="badge text-xs bg-primary/20 text-primary">
                        AI-related
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {isAuthenticated && (
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <div>
                <label htmlFor="comment-content" className="block text-sm font-medium mb-1">
                  Add a comment
                </label>
                <textarea
                  id="comment-content"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="input w-full min-h-[80px]"
                  placeholder="Write a comment…"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="comment-ai-related"
                  type="checkbox"
                  checked={commentIsAiRelated}
                  onChange={(e) => setCommentIsAiRelated(e.target.checked)}
                  className="rounded border-input"
                />
                <label htmlFor="comment-ai-related" className="text-sm">
                  Mark as AI-related
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingComment || !commentContent.trim()}
                >
                  {isSubmittingComment ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
