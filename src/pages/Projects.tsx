/**
 * Projects Page - Project Listings
 * Shows projects with AI artefacts and collaboration features
 */

import { useState } from 'react';
import { Search, Plus, Filter, Heart, MessageCircle, HandHelping, X } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../hooks/useAuth';

type Visibility = 'private' | 'org' | 'public';

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

  const { isAuthenticated } = useAuth();
  const projects = useQuery(api.projects.listWithCounts);
  const createProject = useMutation(api.projects.create);
  const addComment = useMutation(api.projectComments.add);
  const toggleLike = useMutation(api.projectSupportEvents.toggleLike);
  const toggleOfferHelp = useMutation(api.projectSupportEvents.toggleOfferHelp);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() === '' || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createProject({
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        isAnonymous,
      });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setVisibility('private');
      setIsAnonymous(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCancel = () => {
    setCreateOpen(false);
    setTitle('');
    setDescription('');
    setVisibility('private');
    setIsAnonymous(false);
  };

  return (
    <div className="space-y-6">
      {/* Comments modal */}
      {selectedProjectId !== null && (
        <CommentsModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          isAuthenticated={isAuthenticated}
          addComment={addComment}
        />
      )}
      {createOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={handleCreateCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
        >
          <div
            className="max-w-md w-full card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="create-project-title" className="text-xl font-semibold mb-4">
              New Project
            </h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor="project-title" className="block text-sm font-medium mb-1">
                  Title
                </label>
                <input
                  id="project-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full"
                  placeholder="Project name"
                />
              </div>
              <div>
                <label htmlFor="project-description" className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full min-h-[80px]"
                  placeholder="What is this project about?"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="project-visibility" className="block text-sm font-medium mb-1">
                  Visibility
                </label>
                <select
                  id="project-visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                  className="input w-full"
                >
                  <option value="private">Private</option>
                  <option value="org">Organization</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="project-anonymous"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-input"
                />
                <label htmlFor="project-anonymous" className="text-sm">
                  Submit anonymously
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCreateCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || title.trim() === ''}
                >
                  {isSubmitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Explore projects using AI to transform workflows
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select 
          className="input w-36"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="idea">Idea</option>
          <option value="building">Building</option>
          <option value="incubation">Incubation</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <button className="btn btn-outline btn-md">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b">
        <TabButton active>All</TabButton>
        <TabButton>Ideas</TabButton>
        <TabButton>Building</TabButton>
        <TabButton>Completed</TabButton>
      </div>

      {/* Projects Grid */}
      {projects === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ProjectPlaceholder status="idea" />
          <ProjectPlaceholder status="building" />
          <ProjectPlaceholder status="completed" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project with AI artefacts
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects
            .filter(p => {
              if (statusFilter && p.status !== statusFilter) return false;
              if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                return (
                  p.title.toLowerCase().includes(searchLower) ||
                  p.description?.toLowerCase().includes(searchLower)
                );
              }
              return true;
            })
            .map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                isAuthenticated={isAuthenticated}
                onCommentsClick={() => setSelectedProjectId(project._id)}
                onLikeClick={() => toggleLike({ projectId: project._id }).catch((err) => {
                  console.error('Like failed:', err);
                  alert('Something went wrong. Please try again.');
                })}
                onOfferHelpClick={() => toggleOfferHelp({ projectId: project._id }).catch((err) => {
                  console.error('Offer help failed:', err);
                  alert('Something went wrong. Please try again.');
                })}
              />
            ))}
        </div>
      )}
    </div>
  )
}

/** Comments modal: list comments and add form (authenticated only). */
function CommentsModal({
  projectId,
  onClose,
  isAuthenticated,
  addComment,
}: {
  projectId: Id<'projects'>;
  onClose: () => void;
  isAuthenticated: boolean;
  addComment: (args: { projectId: Id<'projects'>; content: string; isAiRelated?: boolean }) => Promise<unknown>;
}) {
  const [commentContent, setCommentContent] = useState('');
  const [commentIsAiRelated, setCommentIsAiRelated] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const comments = useQuery(api.projectComments.listForProject, { projectId });

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await addComment({
        projectId,
        content: commentContent.trim(),
        isAiRelated: commentIsAiRelated,
      });
      setCommentContent('');
      setCommentIsAiRelated(false);
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comments-modal-title"
    >
      <div
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="comments-modal-title" className="text-xl font-semibold">
            Comments
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {comments === undefined ? (
          <p className="text-muted-foreground py-4">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground py-4">No comments yet.</p>
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
  );
}

interface TabButtonProps {
  children: React.ReactNode
  active?: boolean
}

function TabButton({ children, active }: TabButtonProps) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

interface ProjectPlaceholderProps {
  status: 'idea' | 'building' | 'incubation' | 'completed'
}

interface ProjectWithCounts {
  _id: Id<"projects">;
  title: string;
  description?: string;
  status: string;
  isAnonymous: boolean;
  commentCount: number;
  likeCount: number;
  helpOfferCount: number;
  userLiked: boolean;
  userOfferedHelp: boolean;
}

interface ProjectCardProps {
  project: ProjectWithCounts;
  isAuthenticated: boolean;
  onCommentsClick: () => void;
  onLikeClick: () => void;
  onOfferHelpClick: () => void;
}

function ProjectCard({ project, isAuthenticated, onCommentsClick, onLikeClick, onOfferHelpClick }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    idea: 'bg-amber-100 text-amber-800 border-amber-200',
    building: 'bg-blue-100 text-blue-800 border-blue-200',
    incubation: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const statusLabels: Record<string, string> = {
    idea: 'Idea',
    building: 'Building',
    incubation: 'Incubation',
    completed: 'Completed',
    archived: 'Archived',
  };

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg leading-tight">{project.title}</h3>
        <span className={`badge text-xs ${statusColors[project.status] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
          {statusLabels[project.status] ?? project.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {project.description || 'No description'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm pt-3 border-t">
        <div className="flex items-center gap-2">
          {project.isAnonymous ? (
            <span className="text-xs text-muted-foreground">Anonymous</span>
          ) : (
            <>
              <div className="avatar w-6 h-6">
                <div className="avatar-fallback text-xs">?</div>
              </div>
              <span className="text-muted-foreground">Owner</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          {isAuthenticated && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onLikeClick(); }}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              aria-label={project.userLiked ? 'Unlike' : 'Like'}
            >
              <Heart className={`h-4 w-4 ${project.userLiked ? 'fill-current text-primary' : ''}`} />
              <span>{project.likeCount}</span>
            </button>
          )}
          {!isAuthenticated && (
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {project.likeCount}
            </span>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOfferHelpClick(); }}
              className={`flex items-center gap-1 hover:text-foreground transition-colors ${project.userOfferedHelp ? 'text-primary font-medium' : ''}`}
              aria-label={project.userOfferedHelp ? 'Withdraw help offer' : 'Offer help'}
            >
              <HandHelping className="h-4 w-4" />
              <span>{project.helpOfferCount}</span>
            </button>
          )}
          {!isAuthenticated && (
            <span className="flex items-center gap-1">
              <HandHelping className="h-4 w-4" />
              {project.helpOfferCount}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCommentsClick(); }}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label="View comments"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{project.commentCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectPlaceholder({ status }: ProjectPlaceholderProps) {
  const statusColors = {
    idea: 'bg-amber-100 text-amber-800 border-amber-200',
    building: 'bg-blue-100 text-blue-800 border-blue-200',
    incubation: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
  }

  const statusLabels = {
    idea: 'Idea',
    building: 'Building',
    incubation: 'Incubation',
    completed: 'Completed',
  }

  return (
    <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-muted rounded w-40" />
        <span className={`badge text-xs ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-2/3 mb-4" />

      {/* AI Artefacts indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex -space-x-1">
          <div className="w-6 h-6 rounded bg-primary/20 border-2 border-background" />
          <div className="w-6 h-6 rounded bg-secondary/20 border-2 border-background" />
        </div>
        <span className="text-xs text-muted-foreground">
          -- AI assets attached
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm pt-3 border-t">
        <div className="flex items-center gap-2">
          <div className="avatar w-6 h-6">
            <div className="avatar-fallback text-xs">?</div>
          </div>
          <span className="text-muted-foreground">--</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>-- likes</span>
          <span>-- comments</span>
        </div>
      </div>
    </div>
  )
}
