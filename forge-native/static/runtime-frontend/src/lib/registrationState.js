const PROCESS_TRIGGERED_PHASE_ROLES = new Set(['participant', 'ambassador']);

export function hasCompletedRegistration(user) {
  const userName = typeof user?.name === 'string' && user.name.trim()
    ? user.name.trim()
    : (typeof user?.displayName === 'string' ? user.displayName.trim() : '');

  // signupCompleted is set server-side (skills !== null) and survives the
  // skills=="" case that arises when skills are disabled for the event.
  if (user?.signupCompleted !== undefined) {
    return Boolean(user && userName && user.signupCompleted);
  }

  // Fallback for user objects not yet hydrated with signupCompleted.
  return Boolean(user && userName && Array.isArray(user.skills) && user.skills.length > 0);
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
