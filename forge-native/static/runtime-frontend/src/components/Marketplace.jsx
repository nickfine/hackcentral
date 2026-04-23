/**
 * Marketplace Page
 * Browse and manage Ideas (teams) and Free Agents
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  User,
  Grid3x3,
  Rows,
} from 'lucide-react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import { cn, getSkillClasses, DESIGN_SYSTEM_CARD } from '../lib/design-system';
import { SKILLS } from '../data/constants';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Input,
  SearchInput,
  TextArea,
  Select,
  Modal,
  Tabs,
  MarketplaceSkeleton,
  EmptyState,
  Alert,
} from './ui';
import { HStack, VStack } from './layout';
import { BackButton, StatusBanner, TeamCard } from './shared';


function Marketplace({
  user,
  teams = [],
  freeAgents = [],
  onNavigate,
  onCreateTeam,
  initialTab = 'teams',
  eventPhase,
  maxTeamSize = 5,
  userInvites = [],
  isLoading = false,
  appModeResolverPayload,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [createTeamStatus, setCreateTeamStatus] = useState(null);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    lookingFor: [],
    maxMembers: maxTeamSize,
  });
  const [selectedPainPointIds, setSelectedPainPointIds] = useState([]);
  const [modalPainSearch, setModalPainSearch] = useState('');
  const [modalPainPoints, setModalPainPoints] = useState([]);
  const [modalPainsLoading, setModalPainsLoading] = useState(false);

  // Load pain points for Create Team modal
  useEffect(() => {
    if (!showCreateTeamModal) return;
    let cancelled = false;
    setModalPainsLoading(true);
    (async () => {
      try {
        const { invoke } = await import('@forge/bridge');
        const result = await invokeEventScopedResolver(invoke, 'getPainPoints', appModeResolverPayload, {
          sortBy: 'reactions',
          limit: 100,
        });
        if (!cancelled) setModalPainPoints(result?.painPoints ?? []);
      } catch {
        if (!cancelled) setModalPainPoints([]);
      } finally {
        if (!cancelled) setModalPainsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showCreateTeamModal, appModeResolverPayload]);

  const itemsPerPage = 12;

  // Find user's team
  const userTeam = useMemo(() => {
    if (!user?.id) return null;
    return teams.find((team) =>
      team.captainId === user.id ||
      team.members?.some((m) => m.id === user.id)
    );
  }, [user?.id, teams]);

  // Filter teams by search
  const filteredTeams = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return teams
      .filter((team) => team.id !== 'team-observers')
      .filter(
        (team) =>
          team.name?.toLowerCase().includes(searchLower) ||
          team.description?.toLowerCase().includes(searchLower) ||
          team.lookingFor?.some((skill) =>
            skill.toLowerCase().includes(searchLower)
          )
      );
  }, [teams, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTeams.slice(start, start + itemsPerPage);
  }, [filteredTeams, currentPage, itemsPerPage]);

  // Filter free agents
  const filteredAgents = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return freeAgents.filter(
      (agent) =>
        agent.id !== user?.id &&
        (agent.name?.toLowerCase().includes(searchLower) ||
          agent.skills?.some((skill) =>
            skill.toLowerCase().includes(searchLower)
          ))
    );
  }, [freeAgents, searchTerm, user?.id]);

  // Show skeleton while loading (after all hooks)
  if (isLoading) {
    return <MarketplaceSkeleton />;
  }

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;

    setIsCreatingTeam(true);
    setCreateTeamStatus(null);
    try {
      const createResult = await onCreateTeam?.(newTeam);
      const createdTeamId = createResult?.teamId || null;
      const createdTeamName = newTeam.name.trim();
      const createdEventId = createResult?.eventId || null;

      // Assign selected pain points to the newly created team
      if (createdTeamId && selectedPainPointIds.length > 0) {
        try {
          const { invoke } = await import('@forge/bridge');
          await invokeEventScopedResolver(invoke, 'assignPainPointsToTeam', appModeResolverPayload, {
            teamId: createdTeamId,
            eventId: createdEventId || '',
            painPointIds: selectedPainPointIds,
          });
        } catch {
          // non-fatal - team was created, pain point linking failed silently
        }
      }

      setShowCreateTeamModal(false);
      setNewTeam({ name: '', description: '', lookingFor: [], maxMembers: maxTeamSize });
      setSelectedPainPointIds([]);
      setModalPainSearch('');
      if (createdTeamId) {
        onNavigate('team-detail', { teamId: createdTeamId });
      } else {
        setCreateTeamStatus({
          type: 'success',
          message: `Team "${createdTeamName}" created successfully.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to create team. Please try again.';
      setCreateTeamStatus({
        type: 'error',
        message,
      });
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleTeamClick = useCallback(
    (teamId) => {
      onNavigate('team-detail', { teamId });
    },
    [onNavigate]
  );

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="marketplace-page-header mt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            Teams Marketplace
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-1">
                Teams
              </h1>
              <p className="text-sm text-text-secondary max-w-2xl">
                Browse teams or create one to start recruiting teammates.
              </p>
            </div>
            <button
              type="button"
              disabled={!!userTeam}
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors border-0 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              onClick={() => {
                setCreateTeamStatus(null);
                setNewTeam({ name: '', description: '', lookingFor: [], maxMembers: maxTeamSize });
                setSelectedPainPointIds([]);
                setModalPainSearch('');
                setShowCreateTeamModal(true);
              }}
              title={userTeam ? 'You are already on a team' : 'Create a new team'}
            >
              <Plus className="w-4 h-4" />
              Create Team
            </button>
          </div>
        </div>
      </div>

      {/* Status Banner — more integrated */}
      {(userTeam || !userTeam) && (
        <div className="mb-5">
          <StatusBanner
            user={user}
            teams={teams}
            userInvites={userInvites}
            onNavigate={onNavigate}
            eventPhase={eventPhase}
          />
        </div>
      )}

      {/* Create Idea feedback */}
      {createTeamStatus && !showCreateTeamModal && (
        <Alert
          variant={createTeamStatus.type}
          dismissible
          onDismiss={() => setCreateTeamStatus(null)}
          className="mb-4"
        >
          {createTeamStatus.message}
        </Alert>
      )}

      {/* Search and Tabs as integrated region */}
      <div className="mb-6">
        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center">
          <div className="marketplace-search-wrap flex-1">
            <SearchInput
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              onClear={() => setSearchTerm('')}
              placeholder="Search teams by name or skills…"
              inputClassName="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              leftIconClassName="text-gray-400"
            />
          </div>

          {/* View Mode Toggle — integrated with search region */}
          <div className="flex gap-1.5 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-1.5 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              title="Grid view"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('row')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'row'
                  ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'row'}
              title="List view"
            >
              <Rows className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs — content control region */}
        <Tabs value={activeTab} onChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }} variant="teal" className="mb-0">
          <Tabs.List className="border-b border-gray-200 dark:border-gray-700">
            <Tabs.Tab value="teams" count={filteredTeams.length} className="font-semibold">
              Teams
            </Tabs.Tab>
            <Tabs.Tab value="agents" count={filteredAgents.length} className="font-semibold">
              Free Agents
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="teams">
            {paginatedTeams.length > 0 ? (
            <>
              {/* Team Grid */}
              <div
                className={cn(
                  'grid gap-6 mt-6',
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                )}
              >
                {paginatedTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    variant={viewMode === 'row' ? 'compact' : 'default'}
                    onClick={() => handleTeamClick(team.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-8 text-center py-10 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/40 dark:bg-gray-800/30">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No teams match your search' : 'No teams yet'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-6">
                {searchTerm
                  ? 'Try a different search term.'
                  : 'Be the first to create a team and recruit teammates.'}
              </p>
              <Button
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg inline-flex items-center gap-2"
                onClick={() => {
                  setCreateTeamStatus(null);
                  setShowCreateTeamModal(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Create First Team
              </Button>
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="agents">
          {filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    DESIGN_SYSTEM_CARD,
                    'marketplace-idea-card p-5 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 cursor-default'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar user={agent} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {agent.name}
                      </h4>
                      {agent.callsign && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          "{agent.callsign}"
                        </p>
                      )}
                      {agent.skills && agent.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.skills.slice(0, 3).map((skill, idx) => (
                            <Badge key={idx} variant="default" size="xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 text-center py-12 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/30 dark:bg-gray-800/20">
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No free agents match your search' : 'No free agents available'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {searchTerm
                  ? 'Try a different search term.'
                  : 'All participants have already joined teams!'}
              </p>
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        title="Create New Team"
        description="Share your idea and find teammates"
        size="lg"
        panelClassName={DESIGN_SYSTEM_CARD}
      >
        {createTeamStatus?.type === 'error' && (
          <Alert variant="error" className="mb-4">
            {createTeamStatus.message}
          </Alert>
        )}

        <VStack gap="4">
          <Input
            label="Idea Name"
            placeholder="Give your idea a memorable name"
            value={newTeam.name}
            onChange={(e) =>
              setNewTeam({ ...newTeam, name: e.target.value })
            }
            required
          />

          <TextArea
            label="Description"
            placeholder="Describe your idea and what you want to build..."
            value={newTeam.description}
            onChange={(e) =>
              setNewTeam({ ...newTeam, description: e.target.value })
            }
            rows={4}
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Looking For Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => {
                const isSelected = newTeam.lookingFor.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setNewTeam({
                          ...newTeam,
                          lookingFor: newTeam.lookingFor.filter((s) => s !== skill),
                        });
                      } else {
                        setNewTeam({
                          ...newTeam,
                          lookingFor: [...newTeam.lookingFor, skill],
                        });
                      }
                    }}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg border transition-all',
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    )}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <Select
            label="Max Team Size"
            value={String(newTeam.maxMembers)}
            onChange={(val) =>
              setNewTeam({ ...newTeam, maxMembers: Number(val) })
            }
            options={Array.from({ length: maxTeamSize - 1 }, (_, i) => {
              const size = i + 2;
              return { value: String(size), label: `${size} members` };
            })}
          />

          {/* Pain point selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Pain Points <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Link one pain point that your team plans to tackle.
            </p>
            {selectedPainPointIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedPainPointIds.map((id) => {
                  const pp = modalPainPoints.find((p) => p._id === id);
                  return pp ? (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 text-xs text-teal-700 dark:text-teal-300">
                      {pp.title}
                      <button
                        type="button"
                        onClick={() => setSelectedPainPointIds([])}
                        className="ml-0.5 text-teal-500 hover:text-teal-700 dark:hover:text-teal-200"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {selectedPainPointIds.length === 0 && (
            <input
              type="text"
              value={modalPainSearch}
              onChange={(e) => setModalPainSearch(e.target.value)}
              placeholder="Search pain points…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mb-1.5"
            />
            )}
            {selectedPainPointIds.length === 0 && (modalPainsLoading ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />)}
              </div>
            ) : (
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {modalPainPoints
                  .filter((pp) => {
                    const q = modalPainSearch.toLowerCase();
                    return !q || pp.title?.toLowerCase().includes(q) || pp.submitterName?.toLowerCase().includes(q);
                  })
                  .slice(0, 50)
                  .map((pp) => {
                    const isSelected = selectedPainPointIds.includes(pp._id);
                    return (
                      <li key={pp._id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPainPointIds(isSelected ? [] : [pp._id])}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                          )}
                        >
                          <span className={cn('flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                            isSelected ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300 dark:border-gray-600'
                          )}>
                            {isSelected && '✓'}
                          </span>
                          <span className="flex-1 truncate">{pp.title}</span>
                          <span className="flex-shrink-0 text-[10px] text-gray-400">🔥 {pp.reactionCount}</span>
                        </button>
                      </li>
                    );
                  })}
                {modalPainPoints.length === 0 && (
                  <li className="px-3 py-3 text-sm text-gray-400 text-center">No pain points yet</li>
                )}
              </ul>
            ))}
          </div>
        </VStack>

        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => setShowCreateTeamModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            onClick={handleCreateTeam}
            loading={isCreatingTeam}
            disabled={!newTeam.name.trim()}
          >
            Create Team
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Marketplace;
