const PROCESS_TRIGGERED_PHASE_ROLES = new Set(['participant', 'ambassador']);

export function hasCompletedRegistration(user) {
  const userName = typeof user?.name === 'string' && user.name.trim()
    ? user.name.trim()
    : (typeof user?.displayName === 'string' ? user.displayName.trim() : '');

  return Boolean(
    user &&
    userName &&
    Array.isArray(user.skills) &&
    user.skills.length > 0
  );
}

export function isProcessTriggeredTeamFormationEligible(user) {
  return PROCESS_TRIGGERED_PHASE_ROLES.has(user?.role || 'participant');
}

export function deriveEffectiveEventPhase(eventPhase, user) {
  if (eventPhase !== 'signup') return eventPhase;
  if (!hasCompletedRegistration(user)) return eventPhase;
  if (!isProcessTriggeredTeamFormationEligible(user)) return eventPhase;
  return 'team_formation';
}
