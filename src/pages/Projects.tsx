/**
 * Projects Page - Project Listings
 * Shows projects with AI assets and collaboration features
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Heart, MessageCircle, HandHelping } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../hooks/useAuth';
import { TabButton, EmptyState } from '../components/shared';
import { useDebounce } from '../hooks/useDebounce';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_BADGE_COLORS } from '../constants/project';

type Visibility = 'private' | 'org' | 'public';

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectLimit, setProjectLimit] = useState(30);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const projects = useQuery(api.projects.listWithCounts, { limit: projectLimit });
  const createProject = useMutation(api.projects.create);
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
      toast.success('Project created successfully!');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setVisibility('private');
      setIsAnonymous(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
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
                  <option value="private">Private (sandbox — only you until published)</option>
                  <option value="org">Organization</option>
                  <option value="public">Public</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Sandbox: choose Private to draft until you’re ready to share with your org or publicly.
                </p>
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
        <TabButton active={statusFilter === ''} onClick={() => setStatusFilter('')}>
          All
        </TabButton>
        <TabButton active={statusFilter === 'idea'} onClick={() => setStatusFilter('idea')}>
          Ideas
        </TabButton>
        <TabButton active={statusFilter === 'building'} onClick={() => setStatusFilter('building')}>
          Building
        </TabButton>
        <TabButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>
          Completed
        </TabButton>
      </div>

      {/* Projects Grid */}
      {projects === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ProjectPlaceholder status="idea" />
          <ProjectPlaceholder status="building" />
          <ProjectPlaceholder status="completed" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Plus />}
          title="No projects yet"
          description="Create your first project with AI assets"
          action={{
            label: 'New Project',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setCreateOpen(true),
          }}
        />
      ) : (() => {
        const filteredProjects = projects.filter(p => {
          if (statusFilter && p.status !== statusFilter) return false;
          if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            return (
              p.title.toLowerCase().includes(searchLower) ||
              p.description?.toLowerCase().includes(searchLower)
            );
          }
          return true;
        });
        return filteredProjects.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="No projects match your filters"
            description="Try adjusting your search or status filter."
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  isAuthenticated={isAuthenticated}
                  onCardClick={() => navigate(`/projects/${project._id}`)}
                  onCommentsClick={() => navigate(`/projects/${project._id}#comments`)}
                  onLikeClick={() => toggleLike({ projectId: project._id }).catch((err) => {
                    console.error('Like failed:', err);
                    toast.error('Something went wrong. Please try again.');
                  })}
                  onOfferHelpClick={() => toggleOfferHelp({ projectId: project._id }).catch((err) => {
                    console.error('Offer help failed:', err);
                    toast.error('Something went wrong. Please try again.');
                  })}
                />
              ))}
            </div>
            {projects != null && projects.length === projectLimit && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setProjectLimit((prev) => prev + 30)}
                >
                  Load more
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
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
  attachedAssetsCount: number;
}

interface ProjectCardProps {
  project: ProjectWithCounts;
  isAuthenticated: boolean;
  onCardClick: () => void;
  onCommentsClick: () => void;
  onLikeClick: () => void;
  onOfferHelpClick: () => void;
}

function ProjectCard({ project, isAuthenticated, onCardClick, onCommentsClick, onLikeClick, onOfferHelpClick }: ProjectCardProps) {
  return (
    <div
      className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onCardClick()}
      aria-label={`View ${project.title}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg leading-tight">{project.title}</h3>
        <span className={`badge text-xs ${PROJECT_STATUS_BADGE_COLORS[project.status] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
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
          <span className="text-muted-foreground">
            {project.attachedAssetsCount} asset{project.attachedAssetsCount !== 1 ? 's' : ''}
          </span>
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
  return (
    <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-muted rounded w-40" />
        <span className={`badge text-xs ${PROJECT_STATUS_BADGE_COLORS[status] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
          {PROJECT_STATUS_LABELS[status]}
        </span>
      </div>
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-2/3 mb-4" />

      {/* AI assets indicator */}
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
