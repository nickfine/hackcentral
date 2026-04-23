/**
 * StatusBanner Component
 * Displays user's current HackDay registration status (Free Agent / On Team / Observer)
 */

import { useMemo } from 'react';
import { User, Users, Eye, ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { HStack, VStack } from '../layout';
import { DESIGN_SYSTEM_CARD } from '../../lib/design-system';

const OBSERVERS_TEAM_ID = 'team-observers';

function StatusBanner({ user, teams = [], userInvites = [], onNavigate, eventPhase }) {
  // Find user's team
  const userTeam = useMemo(() => {
    if (!user?.id) return null;
    return teams.find((team) => 
      team.captainId === user.id || 
      team.members?.some(m => m.id === user.id)
    );
  }, [user?.id, teams]);

  // Check if user is captain
  const isCaptain = useMemo(() => {
    return userTeam?.captainId === user?.id;
  }, [userTeam, user?.id]);

  // Check if user is observer
  const isObserver = useMemo(() => {
    return userTeam?.id === OBSERVERS_TEAM_ID;
  }, [userTeam]);

  // Count pending invites
  const pendingInviteCount = useMemo(() => {
    return userInvites.filter(invite => invite.status === 'PENDING' || !invite.status).length;
  }, [userInvites]);

  // Only show team role during teams/team_formation phase (before hack starts)
  const showTeamRole = eventPhase === 'teams' || eventPhase === 'team_formation';

  // Don't render if user has no team and no invites (edge case - not registered)
  if (!userTeam && pendingInviteCount === 0 && !user?.isFreeAgent) {
    return null;
  }

  // Free Agent Status
  if (!userTeam) {
    return (
      <div className={`${DESIGN_SYSTEM_CARD} border-l-2 border-[var(--accent)] p-5 animate-fade-in`}>
        <HStack gap="4" align="start" justify="between" className="sm:items-center">
          <HStack gap="3" align="start" className="flex-1 sm:items-center">
            <div className="w-12 h-12 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <VStack gap="1" align="start" className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-0">Free Agent Status</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white mb-0">
                {pendingInviteCount > 0
                  ? `${pendingInviteCount} pending invite${pendingInviteCount !== 1 ? 's' : ''} waiting`
                  : 'Make your profile discoverable to team captains'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {pendingInviteCount > 0
                  ? 'Review and respond to team invitations'
                  : 'Update your skills to help teams find you'}
              </p>
            </VStack>
          </HStack>
          <Button
            variant="primary"
            size="sm"
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-on)] rounded-lg flex-shrink-0"
            onClick={() => onNavigate(pendingInviteCount > 0 ? 'marketplace' : 'profile')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {pendingInviteCount > 0 ? 'View Invites' : 'Edit Profile'}
          </Button>
        </HStack>
      </div>
    );
  }

  // Observer Status
  if (isObserver) {
    return (
      <div className={`${DESIGN_SYSTEM_CARD} border-l-2 border-[var(--accent)] p-5 animate-fade-in`}>
        <HStack gap="3" align="center">
          <div className="w-12 h-12 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] flex items-center justify-center flex-shrink-0">
            <Eye className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <VStack gap="1" align="start" className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-0">You're on Team Observers</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-0">
              as Member
            </p>
          </VStack>
          <Button
            variant="ghost"
            size="sm"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => onNavigate('team-detail', { teamId: userTeam.id })}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            View Team
          </Button>
        </HStack>
      </div>
    );
  }

  // On Team Status (only show role during teams/team_formation phase)
  if (userTeam && showTeamRole) {
    return (
      <div className={`${DESIGN_SYSTEM_CARD} border-l-2 border-[var(--accent)] p-5 animate-fade-in`}>
        <HStack gap="3" align="center" justify="between">
          <HStack gap="3" align="center" className="flex-1">
            <div className="w-12 h-12 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <VStack gap="1" align="start" className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-0">You're on {userTeam.name}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-0">
                as {isCaptain ? 'Captain' : 'Member'}
              </p>
            </VStack>
          </HStack>
          <Button
            variant="ghost"
            size="sm"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => onNavigate('team-detail', { teamId: userTeam.id })}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            View Team
          </Button>
        </HStack>
      </div>
    );
  }

  return null;
}

export default StatusBanner;
