/**
 * Projects Page - Project Listings
 * Shows projects with AI hacks and collaboration features
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Heart, MessageCircle, HandHelping, FileText, Code, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../hooks/useAuth';
import { TabButton, EmptyState } from '../components/shared';
import { useDebounce } from '../hooks/useDebounce';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_BADGE_COLORS, HACK_TYPE_LABELS, HACK_TYPES, HACK_TYPE_BADGE_COLORS } from '../constants/project';

type Visibility = 'private' | 'org' | 'public';
type HackTypeValue = (typeof HACK_TYPES)[number]['value'];

export interface ProjectsEmbeddedProps {
  embedded?: boolean;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
  hackTypeFilter?: string;
  setHackTypeFilter?: (s: string) => void;
  createOpen?: boolean;
  setCreateOpen?: (open: boolean) => void;
}

export default function Projects(props: ProjectsEmbeddedProps = {}) {
  const {
    embedded = false,
    searchQuery: searchQueryProp,
    setSearchQuery: setSearchQueryProp,
    statusFilter: statusFilterProp,
    setStatusFilter: setStatusFilterProp,
    hackTypeFilter: hackTypeFilterProp,
    setHackTypeFilter: setHackTypeFilterProp,
    createOpen: createOpenProp,
    setCreateOpen: setCreateOpenProp,
  } = props;

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState('');
  const [internalHackTypeFilter, setInternalHackTypeFilter] = useState('');
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const searchQuery = embedded && searchQueryProp !== undefined ? searchQueryProp : internalSearchQuery;
  const setSearchQuery = embedded && setSearchQueryProp ? setSearchQueryProp : setInternalSearchQuery;
  const statusFilter = embedded && statusFilterProp !== undefined ? statusFilterProp : internalStatusFilter;
  const setStatusFilter = embedded && setStatusFilterProp ? setStatusFilterProp : setInternalStatusFilter;
  const hackTypeFilter = embedded && hackTypeFilterProp !== undefined ? hackTypeFilterProp : internalHackTypeFilter;
  const setHackTypeFilter = embedded && setHackTypeFilterProp ? setHackTypeFilterProp : setInternalHackTypeFilter;
  const createOpen = embedded && createOpenProp !== undefined ? createOpenProp : internalCreateOpen;
  const setCreateOpen = embedded && setCreateOpenProp ? setCreateOpenProp : setInternalCreateOpen;

  const debouncedSearch = useDebounce(searchQuery);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [hackType, setHackType] = useState<HackTypeValue | ''>('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectLimit, setProjectLimit] = useState(30);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const projectsList = useQuery(api.projects.listWithCounts, { limit: projectLimit });

  const loadMoreProjects = () => setProjectLimit((prev) => prev + 30);
  const sentinelRef = useInfiniteScroll({
    onLoadMore: loadMoreProjects,
    hasMore: projectsList != null && projectsList.length === projectLimit,
  });
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
        hackType: hackType || undefined,
      });
      toast.success('Project created successfully!');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setVisibility('private');
      setHackType('');
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
    setHackType('');
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
                <label htmlFor="project-hack-type" className="block text-sm font-medium mb-1">
                  Hack type (optional)
                </label>
                <select
                  id="project-hack-type"
                  value={hackType}
                  onChange={(e) => setHackType((e.target.value || '') as HackTypeValue | '')}
                  className="input w-full"
                >
                  <option value="">None</option>
                  {HACK_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
      {!embedded && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Hacks In Progress</h1>
              <p className="text-muted-foreground mt-2">
                Explore hacks in progress using AI to transform workflows
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
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search hacks in progress..."
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
            <select
              className="input w-40"
              value={hackTypeFilter}
              onChange={(e) => setHackTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {HACK_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-outline btn-md">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </>
      )}

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
      {projectsList === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ProjectPlaceholder status="idea" />
          <ProjectPlaceholder status="building" />
          <ProjectPlaceholder status="completed" />
        </div>
      ) : projectsList.length === 0 ? (
        <EmptyState
          icon={<Plus />}
          title="No hacks in progress yet"
          description="Create your first project with AI hacks"
          action={{
            label: 'New Project',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setCreateOpen(true),
          }}
        />
      ) : (() => {
        const filteredProjects = projectsList.filter(p => {
          if (statusFilter && p.status !== statusFilter) return false;
          if (hackTypeFilter && p.hackType !== hackTypeFilter) return false;
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
            title="No hacks in progress match your filters"
            description="Try adjusting your search, status, or type filter."
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
            {projectsList != null && projectsList.length === projectLimit && (
              <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
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
  hackType?: string;
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

const PROJECT_TYPE_ICONS: Record<string, React.ReactNode> = {
  prompt: <FileText className="h-4 w-4" />,
  skill: <Code className="h-4 w-4" />,
  app: <Bot className="h-4 w-4" />,
};

/** Singular type label for card lozenge (align with Completed AssetCard). */
const PROJECT_TYPE_SINGULAR: Record<string, string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  app: 'App',
};

function ProjectCard({ project, isAuthenticated, onCardClick, onCommentsClick, onLikeClick, onOfferHelpClick }: ProjectCardProps) {
  const typeLabel = project.hackType ? (PROJECT_TYPE_SINGULAR[project.hackType] ?? project.hackType) : null;
  const statusLabel = PROJECT_STATUS_LABELS[project.status] ?? project.status;

  return (
    <div
      className="card p-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden"
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onCardClick()}
      aria-label={`View ${project.title}`}
    >
      {/* Top row: type icon + title (aligned with AssetCard) */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
            {project.hackType ? PROJECT_TYPE_ICONS[project.hackType] ?? <FileText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </div>
          <h3 className="font-semibold text-sm leading-tight truncate">{project.title}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {project.description || 'No description'}
      </p>

      {/* Bottom row: lozenges left, metrics right (aligned with AssetCard) */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {typeLabel && (
            <span className={`badge text-xs border ${HACK_TYPE_BADGE_COLORS[project.hackType!] ?? 'bg-muted text-muted-foreground border-border'}`}>
              {typeLabel}
            </span>
          )}
          <span className={`badge text-xs ${PROJECT_STATUS_BADGE_COLORS[project.status] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span title={`${project.attachedAssetsCount} hack(s) attached`}>
            {project.attachedAssetsCount} hack{project.attachedAssetsCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onLikeClick(); }}
                className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                aria-label={project.userLiked ? 'Unlike' : 'Like'}
                title="Like"
              >
                <Heart className={`h-3.5 w-3.5 ${project.userLiked ? 'fill-current text-primary' : ''}`} />
                {project.likeCount}
              </button>
            ) : (
              <span className="flex items-center gap-0.5" title="Likes">
                <Heart className="h-3.5 w-3.5" />
                {project.likeCount}
              </span>
            )}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOfferHelpClick(); }}
                className={`flex items-center gap-0.5 hover:text-foreground transition-colors ${project.userOfferedHelp ? 'text-primary font-medium' : ''}`}
                aria-label={project.userOfferedHelp ? 'Withdraw help offer' : 'Offer help'}
                title="Offer help"
              >
                <HandHelping className="h-3.5 w-3.5" />
                {project.helpOfferCount}
              </button>
            ) : (
              <span className="flex items-center gap-0.5">
                <HandHelping className="h-3.5 w-3.5" />
                {project.helpOfferCount}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCommentsClick(); }}
              className="flex items-center gap-0.5 hover:text-foreground transition-colors"
              aria-label="View comments"
              title="Comments"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {project.commentCount}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectPlaceholder({ status }: ProjectPlaceholderProps) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded bg-muted w-8 h-8 shrink-0" />
          <div className="h-4 bg-muted rounded w-32 flex-1" />
        </div>
      </div>
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-2/3 mb-3" />

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="h-5 bg-muted rounded w-14" />
          <span className={`badge text-xs ${PROJECT_STATUS_BADGE_COLORS[status] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {PROJECT_STATUS_LABELS[status]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span>--</span>
          <span className="flex items-center gap-1.5">--</span>
        </div>
      </div>
    </div>
  );
}
