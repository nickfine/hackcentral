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
  Flame,
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
import { BackButton, StatusBanner, TeamCard, PainPointRow } from './shared';

const PAIN_ITEMS_PER_PAGE = 10;

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

  // Pain points state
  const [painPoints, setPainPoints] = useState([]);
  const [painPointsLoading, setPainPointsLoading] = useState(false);
  const [painSearch, setPainSearch] = useState('');
  const [painPage, setPainPage] = useState(1);
  const [painSort, setPainSort] = useState('reactions');

  // Load pain points for Pains tab
  useEffect(() => {
    if (activeTab !== 'pains') return;
    let cancelled = false;
    setPainPointsLoading(true);
    (async () => {
      try {
        const { invoke } = await import('@forge/bridge');
        const result = await invokeEventScopedResolver(invoke, 'getPainPoints', appModeResolverPayload, {
          sortBy: painSort,
          limit: 1000,
          includeTeams: true,
        });
        if (!cancelled) setPainPoints(result?.painPoints ?? []);
      } catch {
        if (!cancelled) setPainPoints([]);
      } finally {
        if (!cancelled) setPainPointsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, painSort, appModeResolverPayload]);

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
          limit: 1000,
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

  const handlePainReact = useCallback(async (painPointId) => {
    const { invoke } = await import('@forge/bridge');
    await invokeEventScopedResolver(invoke, 'reactToPainPoint', appModeResolverPayload, { painPointId });
  }, [appModeResolverPayload]);

  const filteredPainPoints = useMemo(() => {
    const q = painSearch.toLowerCase();
    return painPoints.filter(
      (pp) =>
        pp.title?.toLowerCase().includes(q) ||
        pp.submitterName?.toLowerCase().includes(q) ||
        pp.description?.toLowerCase().includes(q)
    );
  }, [painPoints, painSearch]);

  const painTotalPages = Math.ceil(filteredPainPoints.length / PAIN_ITEMS_PER_PAGE);
  const paginatedPainPoints = useMemo(() => {
    const start = (painPage - 1) * PAIN_ITEMS_PER_PAGE;
    return filteredPainPoints.slice(start, start + PAIN_ITEMS_PER_PAGE);
  }, [filteredPainPoints, painPage]);

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
          // non-fatal — team was created, pain point linking failed silently
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
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="marketplace-page-header mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Ideas Marketplace
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Teams
          </h1>
          <p className="text-sm font-normal text-gray-700 dark:text-gray-300 max-w-2xl mb-4">
            Browse innovative ideas or discover talented free agents to build your dream team.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!!userTeam}
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                setCreateTeamStatus(null);
                setNewTeam({ name: '', description: '', lookingFor: [], maxMembers: maxTeamSize });
                setSelectedPainPointIds([]);
                setModalPainSearch('');
                setShowCreateTeamModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Create Team
            </button>
            {userTeam?.id && (
              <Button
                variant="secondary"
                className="border border-gray-300 dark:border-gray-600 rounded-lg"
                onClick={() => onNavigate('team-detail', { teamId: userTeam.id })}
              >
                View My Team
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="mb-6">
        <StatusBanner
          user={user}
          teams={teams}
          userInvites={userInvites}
          onNavigate={onNavigate}
          eventPhase={eventPhase}
        />
      </div>

      {/* Create Idea feedback */}
      {createTeamStatus && !showCreateTeamModal && (
        <Alert
          variant={createTeamStatus.type}
          dismissible
          onDismiss={() => setCreateTeamStatus(null)}
          className="mb-6"
        >
          {createTeamStatus.message}
        </Alert>
      )}

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="marketplace-search-wrap flex-1">
          <SearchInput
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            onClear={() => setSearchTerm('')}
            placeholder="Search by name, description, or skills..."
            inputClassName="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            leftIconClassName="text-gray-400"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid'
                ? 'bg-teal-500/10 text-teal-500'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            )}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('row')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'row'
                ? 'bg-teal-500/10 text-teal-500'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            )}
            aria-label="List view"
            aria-pressed={viewMode === 'row'}
          >
            <Rows className="w-5 h-5" />
          </button>
        </div>
      </div>

      {userTeam && (
        <Alert variant="info" className="mb-6">
          You already have an active team for this event. Open it with
          {' '}
          <strong>View My Team</strong>
          .
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(tab) => { setActiveTab(tab); setCurrentPage(1); setPainPage(1); }} variant="teal" className="mb-6">
        <Tabs.List>
          <Tabs.Tab value="teams" count={filteredTeams.length}>
            Teams
          </Tabs.Tab>
          <Tabs.Tab value="agents" count={filteredAgents.length}>
            Free Agents
          </Tabs.Tab>
          <Tabs.Tab value="pains" count={painPoints.length || undefined}>
            Pains
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="teams">
          {paginatedTeams.length > 0 ? (
            <>
              {/* Team Grid */}
              <div
                className={cn(
                  'grid gap-6',
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
                <div className="flex justify-center items-center gap-2 mt-6">
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
            <EmptyState
              icon={Users}
              title="No Ideas Found"
              message={
                searchTerm
                  ? 'Try a different search term'
                  : 'Be the first to create an idea!'
              }
              action={() => {
                setCreateTeamStatus(null);
                if (userTeam?.id) {
                  onNavigate('team-detail', { teamId: userTeam.id });
                  return;
                }
                setShowCreateTeamModal(true);
              }}
              actionText={userTeam ? 'View My Team' : 'Create Team'}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="pains">
          {/* Search + sort bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <SearchInput
                value={painSearch}
                onChange={(e) => { setPainSearch(e.target.value); setPainPage(1); }}
                onClear={() => { setPainSearch(''); setPainPage(1); }}
                placeholder="Search pain points..."
                inputClassName="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                leftIconClassName="text-gray-400"
              />
            </div>
            <div className="flex rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 text-[11px] self-start">
              <button
                type="button"
                onClick={() => { setPainSort('reactions'); setPainPage(1); }}
                className={`rounded-full px-3 py-1 transition-colors ${painSort === 'reactions' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                🔥 Top
              </button>
              <button
                type="button"
                onClick={() => { setPainSort('newest'); setPainPage(1); }}
                className={`rounded-full px-3 py-1 transition-colors ${painSort === 'newest' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                ✨ New
              </button>
            </div>
          </div>

          {painPointsLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
              ))}
            </div>
          ) : filteredPainPoints.length === 0 ? (
            <EmptyState
              icon={Flame}
              title="No Pain Points Found"
              message={painSearch ? 'Try a different search term' : 'No pain points have been submitted yet.'}
            />
          ) : (
            <>
              <ul className="space-y-2">
                {paginatedPainPoints.map((pp) => (
                  <PainPointRow key={pp._id} pp={pp} onReact={handlePainReact} />
                ))}
              </ul>
              {painTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg"
                    onClick={() => setPainPage((p) => Math.max(1, p - 1))}
                    disabled={painPage === 1}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {painPage} of {painTotalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg"
                    onClick={() => setPainPage((p) => Math.min(painTotalPages, p + 1))}
                    disabled={painPage === painTotalPages}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="agents">
          {filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <EmptyState
              icon={User}
              title="No Free Agents"
              message={
                searchTerm
                  ? 'Try a different search term'
                  : 'All participants have joined teams!'
              }
            />
          )}
        </Tabs.Panel>
      </Tabs>

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
              Link existing pain points that your team plans to tackle.
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
                        onClick={() => setSelectedPainPointIds((prev) => prev.filter((x) => x !== id))}
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
            <input
              type="text"
              value={modalPainSearch}
              onChange={(e) => setModalPainSearch(e.target.value)}
              placeholder="Search pain points…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mb-1.5"
            />
            {modalPainsLoading ? (
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
                          onClick={() => setSelectedPainPointIds((prev) =>
                            isSelected ? prev.filter((x) => x !== pp._id) : [...prev, pp._id]
                          )}
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
            )}
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
