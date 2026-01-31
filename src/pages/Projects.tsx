/**
 * Projects Page - Project Listings
 * Shows projects with AI artefacts and collaboration features
 */

import { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const projects = useQuery(api.projects.list);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Explore projects using AI to transform workflows
          </p>
        </div>
        <button className="btn btn-primary btn-md">
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
          <button className="btn btn-primary">
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
                const query = searchQuery.toLowerCase();
                return (
                  p.title.toLowerCase().includes(query) ||
                  p.description?.toLowerCase().includes(query)
                );
              }
              return true;
            })
            .map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
        </div>
      )}
    </div>
  )
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

interface ProjectCardProps {
  project: {
    _id: Id<"projects">;
    title: string;
    description?: string;
    status: string;
    isAnonymous: boolean;
  };
}

function ProjectCard({ project }: ProjectCardProps) {
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
    <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg leading-tight">{project.title}</h3>
        <span className={`badge text-xs ${statusColors[project.status]}`}>
          {statusLabels[project.status]}
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
