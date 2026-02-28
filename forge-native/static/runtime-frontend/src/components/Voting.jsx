/**
 * Voting Page
 * People's Choice voting for submitted projects
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Star,
  Grid3x3,
  Rows,
  Video,
  Github,
  Globe,
  Users,
  Trophy,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, Button, SearchInput, Alert } from './ui';
import { BackButton } from './shared';
import { HStack, VStack } from './layout';
import { EmptyState } from './ui/ErrorState';

// ============================================================================
// CONSTANTS
// ============================================================================

// ============================================================================
// PROJECT CARD COMPONENT
// ============================================================================

function ProjectCard({ team, isVoted, canVote, onVote, isLoading }) {
  const submission = team.submission;

  return (
    <Card
      padding="none"
      className={cn(
        'overflow-hidden transition-all duration-300',
        isVoted && 'ring-2 ring-amber-400'
      )}
      hoverable
    >
      {/* Header with team info */}
      <div className="px-4 py-3 border-b border-arena-border bg-arena-elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-text-secondary" />
            <span className="text-xs font-bold uppercase tracking-wide text-text-primary">
              {team.name}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <Users className="w-3 h-3" />
            {team.members?.length || 0}
          </div>
        </div>
      </div>

      {/* Project content */}
      <div className="p-4">
        <h3 className="text-lg font-black text-text-primary mb-2 line-clamp-1">
          {submission?.projectName || 'Untitled Project'}
        </h3>
        <p className="text-sm text-text-secondary mb-4 line-clamp-3">
          {submission?.description || 'No description provided.'}
        </p>

        {/* Links */}
        <div className="flex flex-wrap gap-2 mb-4">
          {submission?.demoVideoUrl && (
            <a
              href={submission.demoVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-text-secondary bg-arena-elevated hover:bg-arena-card rounded transition-colors"
            >
              <Video className="w-3 h-3" />
              Demo
            </a>
          )}
          {submission?.repoUrl && (
            <a
              href={submission.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-text-secondary bg-arena-elevated hover:bg-arena-card rounded transition-colors"
            >
              <Github className="w-3 h-3" />
              Code
            </a>
          )}
          {submission?.liveDemoUrl && (
            <a
              href={submission.liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-text-secondary bg-arena-elevated hover:bg-arena-card rounded transition-colors"
            >
              <Globe className="w-3 h-3" />
              Live
            </a>
          )}
        </div>
      </div>

      {/* Vote button */}
      <div className="px-4 pb-4">
        <Button
          fullWidth
          variant={isVoted ? 'primary' : 'secondary'}
          onClick={() => onVote(team.id)}
          disabled={isLoading || (!isVoted && !canVote)}
          loading={isLoading}
          leftIcon={!isLoading ? <Star className={cn('w-5 h-5', isVoted && 'fill-white')} /> : undefined}
          className={cn(isVoted && !isLoading && 'bg-amber-500 hover:bg-amber-600 border-amber-500')}
        >
          {isLoading ? 'Saving...' : isVoted ? 'Voted!' : 'Vote for this project'}
        </Button>
      </div>

      {/* Voted indicator */}
      {isVoted && (
        <div className="absolute top-3 right-3">
          <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-pulse">
            <Star className="w-4 h-4 fill-amber-900 text-amber-900" />
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

function Voting({ user, teams = [], onNavigate, eventPhase, maxVotesPerUser = 3 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [votes, setVotes] = useState([]);
  const [votingTeamId, setVotingTeamId] = useState(null);
  const [voteError, setVoteError] = useState('');

  const MAX_VOTES = Math.max(1, Math.floor(Number(maxVotesPerUser) || 3));

  // Get projects with submissions
  const submittedProjects = useMemo(() => {
    return teams.filter(
      (team) => team.submission && team.submission.status === 'submitted'
    );
  }, [teams]);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return submittedProjects.filter(
      (team) =>
        team.name.toLowerCase().includes(searchLower) ||
        team.submission?.projectName?.toLowerCase().includes(searchLower) ||
        team.submission?.description?.toLowerCase().includes(searchLower)
    );
  }, [submittedProjects, searchTerm]);

  // Find user's team (can't vote for own team)
  const userTeam = useMemo(() => {
    return teams.find(
      (team) => team.captainId === user?.id || team.members?.some((m) => m.id === user?.id)
    );
  }, [teams, user?.id]);

  // Handle vote
  const handleVote = useCallback(async (teamId) => {
    if (votingTeamId) return;
    setVotingTeamId(teamId);
    setVoteError('');

    const isRemoving = votes.includes(teamId);
    try {
      const { invoke } = await import('@forge/bridge');
      if (isRemoving) {
        await invoke('removeVote', { teamId });
        setVotes((prev) => prev.filter((id) => id !== teamId));
      } else if (votes.length < MAX_VOTES) {
        await invoke('castVote', { teamId });
        setVotes((prev) => [...prev, teamId]);
      }
    } catch (err) {
      console.error('Vote failed:', err);
      setVoteError('Vote failed — please try again.');
      setTimeout(() => setVoteError(''), 4000);
    } finally {
      setVotingTeamId(null);
    }
  }, [votes, votingTeamId, MAX_VOTES]);

  const canVoteMore = votes.length < MAX_VOTES;

  // Check if voting is open
  const isVotingPhase = eventPhase === 'voting';

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            People&apos;s Choice
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
            Vote for Your Favorites
          </h1>
          <p className="text-text-secondary max-w-2xl">
            You can vote for up to {MAX_VOTES} projects
          </p>
        </div>
      </div>

      {voteError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300" role="alert">
          {voteError}
        </div>
      )}

      {/* Vote Status */}
      <Card padding="md" className="mb-6">
        <HStack justify="between" align="center">
          <div>
            <p className="text-sm font-bold text-text-secondary">Your Votes</p>
            <p className="text-2xl font-black text-text-primary">
              {votes.length} / {MAX_VOTES}
            </p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: MAX_VOTES }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-8 h-8 transition-all',
                  i < votes.length
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-arena-border'
                )}
              />
            ))}
          </div>
        </HStack>
        
        {!isVotingPhase && (
          <Alert variant="warning" className="mt-4">
            Voting is not currently open. Check the schedule for voting times.
          </Alert>
        )}
      </Card>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search projects..."
          />
        </div>

        <HStack gap="2">
          <div className="flex border border-arena-border rounded-lg overflow-hidden">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-arena-elevated text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Row view"
              aria-pressed={viewMode === 'row'}
              onClick={() => setViewMode('row')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'row'
                  ? 'bg-arena-elevated text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Rows className="w-5 h-5" />
            </button>
          </div>
        </HStack>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          )}
        >
          {filteredProjects.map((team) => {
            const isVoted = votes.includes(team.id);
            const isOwnTeam = team.id === userTeam?.id;
            const canVote = !isOwnTeam && (isVoted || canVoteMore);

            return (
              <ProjectCard
                key={team.id}
                team={team}
                isVoted={isVoted}
                canVote={canVote && isVotingPhase}
                onVote={handleVote}
                isLoading={votingTeamId === team.id}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="No Projects Found"
          message={
            submittedProjects.length === 0
              ? 'No projects have been submitted yet. Check back later!'
              : 'Try a different search term'
          }
        />
      )}
    </div>
  );
}

export default Voting;
