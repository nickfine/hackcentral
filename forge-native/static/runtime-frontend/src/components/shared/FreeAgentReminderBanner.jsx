/**
 * FreeAgentReminderBanner Component
 * Displays a reminder banner for free agents when hack start is within 24-48 hours
 * Ported from HD26AI for parity.
 * 
 * @example
 * <FreeAgentReminderBanner 
 *   user={user} 
 *   eventPhase={eventPhase}
 *   onOptIn={handleAutoAssignOptIn}
 *   isOptingIn={isOptingIn}
 * />
 */

import { useMemo } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, Button } from '../ui';
import { cn } from '../../lib/design-system';

export default function FreeAgentReminderBanner({ 
  user, 
  teams = [],
  eventPhase,
  onOptIn, 
  isOptingIn = false,
  className,
}) {
  // Check if user is on a team
  const userTeam = useMemo(() => {
    if (!user) return null;
    return teams.find(team => 
      team.captainId === user.id || 
      team.members?.some(m => m.id === user.id || m.name === user.name)
    );
  }, [user, teams]);

  // Determine if we should show the banner
  const shouldShow = useMemo(() => {
    // Only show during team_formation phase
    if (eventPhase !== 'team_formation') return false;
    // Only show for users without a team
    if (userTeam) return false;
    // Only show for participants (not judges/admins)
    if (user?.role === 'judge' || user?.role === 'admin') return false;
    return true;
  }, [eventPhase, userTeam, user?.role]);

  if (!shouldShow) return null;

  // User has already opted in
  if (user?.autoAssignOptIn) {
    return (
      <Card 
        className={cn(
          'border-2 border-green-500/50 bg-green-500/10',
          className
        )}
        padding="md"
      >
        <div className="flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold mb-1" style={{ color: 'var(--status-success-text)' }}>
              Auto-Assignment Enabled
            </h3>
            <p className="text-sm text-text-secondary">
              You've opted in to be automatically assigned to a team when the hacking phase begins. 
              We'll find you a great team to work with!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'border-2 border-amber-400/50 bg-amber-500/10',
        className
      )}
      padding="md"
    >
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold mb-1" style={{ color: 'var(--status-warning-text)' }}>
            You're Currently a Free Agent
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            Team formation is underway! Browse ideas to join a team, or opt-in to be 
            automatically assigned when hacking begins.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOptIn?.(true)}
              disabled={isOptingIn}
              className="min-h-[44px]"
            >
              {isOptingIn ? 'Opting In...' : 'Auto-Assign Me'}
            </Button>
            <span className="text-xs text-text-muted self-center">
              or browse the Ideas Marketplace
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
