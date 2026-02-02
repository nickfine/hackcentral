/**
 * Unified Hacks Page
 * Combines Completed Hacks (Library) and Hacks In Progress (Projects) under one roof.
 * Layout: Our Hacks + CTAs → search/filters → Completed | In progress tabs → content.
 */

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { TabButton, SectionHeader } from '@/components/shared';
import Library from './Library';
import Projects from './Projects';
import { HACK_TYPES } from '@/constants/project';

type HacksTab = 'completed' | 'in_progress';

function isValidTab(value: string | null): value is HacksTab {
  return value === 'completed' || value === 'in_progress';
}

export default function Hacks() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const activeTab: HacksTab = isValidTab(tabParam) ? tabParam : 'completed';

  // Library filter state (for Completed tab)
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [librarySelectedType, setLibrarySelectedType] = useState('');
  const [librarySelectedStatus, setLibrarySelectedStatus] = useState('');
  const [libraryShowDeprecated, setLibraryShowDeprecated] = useState(false);
  const [librarySubmitModalOpen, setLibrarySubmitModalOpen] = useState(false);

  // Projects filter state (for In progress tab)
  const [projectsSearchQuery, setProjectsSearchQuery] = useState('');
  const [projectsStatusFilter, setProjectsStatusFilter] = useState('');
  const [projectsHackTypeFilter, setProjectsHackTypeFilter] = useState('');
  const [projectsCreateOpen, setProjectsCreateOpen] = useState(false);

  const handleTabChange = (tab: HacksTab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    navigate(`/hacks?${newParams.toString()}`, { replace: true });
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-4">
        <SectionHeader
          title="Our Hacks"
          action={{
            label: activeTab === 'completed' ? 'Submit Hack' : 'New Project',
            icon: <Plus className="h-4 w-4" />,
            onClick: activeTab === 'completed'
              ? () => setLibrarySubmitModalOpen(true)
              : () => setProjectsCreateOpen(true),
          }}
        />

        {/* Search and filters (tab-specific) */}
        <div className="flex gap-4 flex-wrap">
        {activeTab === 'completed' ? (
          <>
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Completed Hacks..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              className="input w-40"
              value={librarySelectedType}
              onChange={(e) => setLibrarySelectedType(e.target.value)}
            >
              <option value="">All Types</option>
              {HACK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className="input w-36"
              value={librarySelectedStatus}
              onChange={(e) => setLibrarySelectedStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="in_progress">In progress</option>
              <option value="verified">Verified</option>
              <option value="deprecated">Deprecated</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={libraryShowDeprecated}
                onChange={(e) => setLibraryShowDeprecated(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-muted-foreground">Show Deprecated</span>
            </label>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search hacks in progress..."
                value={projectsSearchQuery}
                onChange={(e) => setProjectsSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              className="input w-36"
              value={projectsStatusFilter}
              onChange={(e) => setProjectsStatusFilter(e.target.value)}
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
              value={projectsHackTypeFilter}
              onChange={(e) => setProjectsHackTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {HACK_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}
        </div>

        {/* Completed | In progress tabs */}
        <div className="flex border-b">
          <TabButton
            active={activeTab === 'completed'}
            onClick={() => handleTabChange('completed')}
          >
            Completed
          </TabButton>
          <TabButton
            active={activeTab === 'in_progress'}
            onClick={() => handleTabChange('in_progress')}
          >
            In progress
          </TabButton>
        </div>
      </div>

      {/* Tab content (embedded: no header, no search bar) */}
      {activeTab === 'in_progress' ? (
        <Projects
          embedded
          searchQuery={projectsSearchQuery}
          setSearchQuery={setProjectsSearchQuery}
          statusFilter={projectsStatusFilter}
          setStatusFilter={setProjectsStatusFilter}
          hackTypeFilter={projectsHackTypeFilter}
          setHackTypeFilter={setProjectsHackTypeFilter}
          createOpen={projectsCreateOpen}
          setCreateOpen={setProjectsCreateOpen}
        />
      ) : (
        <Library
          embedded
          searchQuery={librarySearchQuery}
          setSearchQuery={setLibrarySearchQuery}
          selectedType={librarySelectedType}
          setSelectedType={setLibrarySelectedType}
          selectedStatus={librarySelectedStatus}
          setSelectedStatus={setLibrarySelectedStatus}
          showDeprecated={libraryShowDeprecated}
          submitModalOpen={librarySubmitModalOpen}
          setSubmitModalOpen={setLibrarySubmitModalOpen}
        />
      )}
    </div>
  );
}
