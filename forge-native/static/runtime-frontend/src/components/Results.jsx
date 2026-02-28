/**
 * Results Page
 * Display HackDay results and winners
 */

import { useMemo } from 'react';
import {
  Star,
  Award,
  Users,
  Medal,
  Crown,
} from 'lucide-react';
import { cn } from '../lib/design-system';
import { Card, AvatarGroup } from './ui';
import { BackButton } from './shared';
import { HStack, VStack } from './layout';
import { EmptyState } from './ui/ErrorState';

// ============================================================================
// AWARD CONFIGURATION
// ============================================================================

const AWARD_CONFIG = {
  winner: {
    label: 'Grand Prize Winner',
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-500/20 to-amber-600/5',
  },
  runnerUp: {
    label: 'Runner Up',
    icon: Medal,
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    gradient: 'from-slate-500/20 to-slate-600/5',
  },
  thirdPlace: {
    label: 'Third Place',
    icon: Award,
    color: 'text-amber-700',
    bgColor: 'bg-amber-700/10',
    borderColor: 'border-amber-700/30',
    gradient: 'from-amber-700/20 to-amber-800/5',
  },
  peoplesChoice: {
    label: "People's Choice",
    icon: Star,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    gradient: 'from-purple-500/20 to-purple-600/5',
  },
};

// ============================================================================
// WINNER CARD COMPONENT
// ============================================================================

function WinnerCard({ team, award, rank }) {
  const config = AWARD_CONFIG[award] || AWARD_CONFIG.winner;
  const Icon = config.icon;

  return (
    <Card
      padding="none"
      className={cn(
        'overflow-hidden border-2 transition-all hover:-translate-y-1',
        config.borderColor
      )}
    >
      {/* Award Banner */}
      <div className={cn(
        'p-4 bg-gradient-to-r',
        config.gradient
      )}>
        <HStack justify="between" align="center">
          <HStack gap="2" align="center">
            <Icon className={cn('w-6 h-6', config.color)} />
            <span className={cn('font-black', config.color)}>
              {config.label}
            </span>
          </HStack>
          {rank && (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center font-black text-xl',
              config.bgColor,
              config.color
            )}>
              {rank}
            </div>
          )}
        </HStack>
      </div>

      {/* Team Info */}
      <div className="p-5">
        <h3 className="text-xl font-black text-text-primary mb-2">
          {team.submission?.projectName || team.name}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Users className="w-4 h-4" />
          {team.name}
        </div>

        {team.submission?.description && (
          <p className="text-sm text-text-secondary line-clamp-2 mb-4">
            {team.submission.description}
          </p>
        )}

        {/* Team Members */}
        {team.members && team.members.length > 0 && (
          <div className="flex items-center gap-3">
            <AvatarGroup users={team.members} max={5} size="sm" />
            <span className="text-xs text-text-muted">
              {team.members.length} member{team.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

function Results({
  user,
  teams = [],
  onNavigate,
  eventPhase,
  awards = {},
}) {
  // Check if results should be visible
  const isResultsPhase = eventPhase === 'results';
  const isAdmin = user?.role === 'admin';
  const canViewResults = isResultsPhase || isAdmin;

  // Get winner teams
  const winners = useMemo(() => {
    // In a real app, this would come from the awards prop
    // For now, we'll use mock data
    const submittedTeams = teams.filter((t) => t.submission?.status === 'submitted');
    
    if (submittedTeams.length === 0) return null;

    return {
      winner: awards.winner ? teams.find((t) => t.id === awards.winner) : submittedTeams[0],
      runnerUp: awards.runnerUp ? teams.find((t) => t.id === awards.runnerUp) : submittedTeams[1],
      thirdPlace: awards.thirdPlace ? teams.find((t) => t.id === awards.thirdPlace) : submittedTeams[2],
      peoplesChoice: awards.peoplesChoice ? teams.find((t) => t.id === awards.peoplesChoice) : submittedTeams[0],
    };
  }, [teams, awards]);

  // Results not yet available
  if (!canViewResults) {
    return (
      <div className="p-4 sm:p-6">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <EmptyState
          emoji="🏆"
          title="Results Coming Soon"
          message="The results will be announced at the end of the HackDay. Check back during the results phase!"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Results
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">
            And the Winners Are...
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Congratulations to all participants. Here are the projects that stood out.
          </p>
        </div>
      </div>

      {winners ? (
        <VStack gap="8">
          {/* Grand Prize */}
          {winners.winner && (
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wide mb-4 text-center">
                Grand Prize Winner
              </p>
              <div className="max-w-2xl mx-auto">
                <WinnerCard team={winners.winner} award="winner" rank={1} />
              </div>
            </div>
          )}

          {/* Runner Ups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {winners.runnerUp && (
              <div>
                <p className="text-sm font-bold text-text-muted uppercase tracking-wide mb-4">
                  Runner Up
                </p>
                <WinnerCard team={winners.runnerUp} award="runnerUp" rank={2} />
              </div>
            )}
            {winners.thirdPlace && (
              <div>
                <p className="text-sm font-bold text-text-muted uppercase tracking-wide mb-4">
                  Third Place
                </p>
                <WinnerCard team={winners.thirdPlace} award="thirdPlace" rank={3} />
              </div>
            )}
          </div>

          {/* People's Choice */}
          {winners.peoplesChoice && (
            <div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-wide mb-4 text-center">
                People's Choice Award
              </p>
              <div className="max-w-2xl mx-auto">
                <WinnerCard team={winners.peoplesChoice} award="peoplesChoice" />
              </div>
            </div>
          )}
        </VStack>
      ) : (
        <Card padding="lg" className="max-w-3xl mx-auto">
          <EmptyState
            emoji="🏆"
            title="No Winners Yet"
            message="Results haven't been finalized. Check back soon!"
          />
        </Card>
      )}

      {/* All Submissions */}
      <div className="mt-12">
        <h2 className="text-2xl font-black text-text-primary mb-6 text-center">
          All Submissions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams
            .filter((t) => t.submission?.status === 'submitted')
            .map((team) => (
              <Card key={team.id} padding="md" hoverable>
                <h4 className="font-bold text-text-primary mb-1">
                  {team.submission?.projectName || team.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                  <Users className="w-3 h-3" />
                  {team.name}
                </div>
                {team.submission?.description && (
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {team.submission.description}
                  </p>
                )}
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}

export default Results;
