/**
 * Marketplace Page
 * Browse and manage Ideas (teams) and Free Agents
 */

import { useState, useMemo, useCallback } from 'react';
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

  const itemsPerPage = 12;

  // Show skeleton while loading
  if (isLoading) {
    return <MarketplaceSkeleton />;
  }

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

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;

    setIsCreatingTeam(true);
    setCreateTeamStatus(null);
    try {
      const createResult = await onCreateTeam?.(newTeam);
      const createdTeamId = createResult?.teamId || null;
      const createdTeamName = newTeam.name.trim();
      setShowCreateTeamModal(false);
      setNewTeam({
        name: '',
        description: '',
        lookingFor: [],
        maxMembers: maxTeamSize,
      });
      if (createdTeamId) {
        onNavigate('team-detail', { teamId: createdTeamId });
      } else {
        setCreateTeamStatus({
          type: 'success',
          message: `Idea "${createdTeamName}" created successfully.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to create idea. Please try again.';
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
            Hack Ideas &amp; Teams
          </h1>
          <p className="text-sm font-normal text-gray-700 dark:text-gray-300 max-w-2xl">
            Browse innovative ideas or discover talented free agents to build your dream team.
          </p>
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

        <HStack gap="2">
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

          {/* Always-visible idea actions */}
          <HStack gap="2" className="flex-wrap">
            <button
              type="button"
              disabled={!!userTeam}
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '0.5rem' }}
              onClick={() => {
                setCreateTeamStatus(null);
                setNewTeam({
                  name: '',
                  description: '',
                  lookingFor: [],
                  maxMembers: maxTeamSize,
                });
                setShowCreateTeamModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Create Idea
            </button>
            {userTeam?.id && (
              <Button
                variant="secondary"
                className="border border-gray-300 dark:border-gray-600 rounded-lg"
                onClick={() => onNavigate('team-detail', { teamId: userTeam.id })}
              >
                View My Idea
              </Button>
            )}
          </HStack>
        </HStack>
      </div>

      {userTeam && (
        <Alert variant="info" className="mb-6">
          You already have an active idea/team for this event. Open it with
          {' '}
          <strong>View My Idea</strong>
          .
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} variant="teal" className="mb-6">
        <Tabs.List>
          <Tabs.Tab value="teams" count={filteredTeams.length}>
            Ideas
          </Tabs.Tab>
          <Tabs.Tab value="agents" count={filteredAgents.length}>
            Free Agents
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
              actionText={userTeam ? 'View My Idea' : 'Create Idea'}
            />
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
        title="Create New Idea"
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
            Create Idea
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Marketplace;
