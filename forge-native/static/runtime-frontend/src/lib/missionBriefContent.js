/**
 * Mission Brief Content Definitions
 * 
 * Phase × UserState → { headline, status, context, primaryCTA, secondaryCTA, footer }
 * 
 * This is the single source of truth for all MissionBrief copy.
 */

/**
 * User state types for the state machine
 */
export const USER_STATES = {
  FREE_AGENT_NO_IDEA: 'free_agent_no_idea',
  FREE_AGENT_HAS_IDEA: 'free_agent_has_idea',
  ON_TEAM_NOT_FULL: 'on_team_not_full',
  ON_TEAM_FULL: 'on_team_full',
  SUBMITTED: 'submitted',
  NOT_SUBMITTED: 'not_submitted',
  NOT_REGISTERED: 'not_registered',
};

/**
 * Compute user state from props
 * @param {Object} params
 * @param {Object|null} params.userTeam - User's team object or null
 * @param {boolean} params.hasPostedIdea - Whether user has posted an idea
 * @param {boolean} params.hasSubmitted - Whether team has submitted
 * @returns {string} One of USER_STATES
 */
export function computeUserState({ userTeam, hasPostedIdea, hasSubmitted, isRegistered = true }) {
  if (!isRegistered) {
    return USER_STATES.NOT_REGISTERED;
  }

  if (!userTeam) {
    return hasPostedIdea ? USER_STATES.FREE_AGENT_HAS_IDEA : USER_STATES.FREE_AGENT_NO_IDEA;
  }

  const memberCount = userTeam.memberCount || (userTeam.members?.length || 0) + 1;
  const isFull = memberCount >= 6;

  if (hasSubmitted) {
    return USER_STATES.SUBMITTED;
  }

  return isFull ? USER_STATES.ON_TEAM_FULL : USER_STATES.ON_TEAM_NOT_FULL;
}

/**
 * Content for each phase × user state combination
 * 
 * Structure:
 * MISSION_CONTENT[phase][userState] = {
 *   heroVariant?: 'welcome' | 'standard',
 *   headline: string,
 *   status: string | (context) => string,
 *   context: string | (stats) => string,
 *   primaryCTA: { label: string, action: string, params?: object },
 *   secondaryCTA?: { label: string, action: string, params?: object },
 *   footerPrefix: string, // e.g., "Team formation closes in"
 * }
 */
export const MISSION_CONTENT = {
  // ============================================================================
  // SIGN UP PHASE
  // ============================================================================
  signup: {
    [USER_STATES.NOT_REGISTERED]: {
      heroVariant: 'welcome',
      headline: 'Welcome to HackDay',
      status: 'You are in. Let us get you mission-ready.',
      context: () => 'Complete your quick profile to unlock ideas, team formation, and the full event experience.',
      primaryCTA: { label: 'Register in 2 minutes', action: 'signup' },
      secondaryCTA: { label: 'How HackDay works', action: 'new-to-hackday' },
      footerPrefix: 'Team formation opens in',
    },
    [USER_STATES.FREE_AGENT_NO_IDEA]: {
      headline: 'Ready for Team Formation',
      status: 'Profile complete. Waiting for formation window.',
      context: () => 'Use this prep window to shortlist ideas and remove friction before teams open.',
      primaryCTA: { label: 'Review Rules', action: 'rules' },
      secondaryCTA: { label: 'See Schedule', action: 'schedule' },
      footerPrefix: 'Team formation opens in',
    },
    [USER_STATES.FREE_AGENT_HAS_IDEA]: {
      headline: 'Pitch Ready',
      status: (ctx) => `Draft prepared: ${ctx.ideaTitle || 'Untitled idea'}`,
      context: () => 'Tighten your 30-second pitch so teammates can commit quickly once formation starts.',
      primaryCTA: { label: 'Review Rules', action: 'rules' },
      secondaryCTA: { label: 'See Schedule', action: 'schedule' },
      footerPrefix: 'Team formation opens in',
    },
    [USER_STATES.ON_TEAM_NOT_FULL]: {
      headline: 'Team Locked, Recruiting Next',
      status: (ctx) => `${ctx.teamName || 'Your team'} is active`,
      context: () => 'Tighten scope and fill key roles before hacking starts.',
      primaryCTA: { label: 'Open Team', action: 'team' },
      secondaryCTA: { label: 'Review Rules', action: 'rules' },
      footerPrefix: 'Team formation opens in',
    },
    [USER_STATES.ON_TEAM_FULL]: {
      headline: 'Full Team, Pre-Flight Check',
      status: (ctx) => `${ctx.teamName || 'Your team'} is fully staffed`,
      context: () => 'Align scope, assign owners, and prepare your first build milestones.',
      primaryCTA: { label: 'Open Team', action: 'team' },
      secondaryCTA: { label: 'See Schedule', action: 'schedule' },
      footerPrefix: 'Team formation opens in',
    },
    [USER_STATES.NOT_SUBMITTED]: {
      headline: 'Ready for Kickoff',
      status: 'You are registered for this event.',
      context: () => 'Track updates and schedule timing so you enter team formation with a clear plan.',
      primaryCTA: { label: 'See Schedule', action: 'schedule' },
      secondaryCTA: { label: 'Review Rules', action: 'rules' },
      footerPrefix: 'Team formation opens in',
    },
    [USER_STATES.SUBMITTED]: {
      headline: 'Welcome Back',
      status: (ctx) => `${ctx.projectTitle || 'Your project'} is already prepared`,
      context: () => 'Review current timing and requirements so your team executes cleanly in this round.',
      primaryCTA: { label: 'Open Submission', action: 'submission' },
      secondaryCTA: { label: 'See Schedule', action: 'schedule' },
      footerPrefix: 'Team formation opens in',
    },
  },

  // ============================================================================
  // TEAM FORMATION PHASE
  // ============================================================================
  team_formation: {
    [USER_STATES.NOT_REGISTERED]: {
      heroVariant: 'welcome',
      headline: 'Welcome to HackDay',
      status: 'Team formation is live and seats are moving fast.',
      context: () => 'Register now to join an idea, connect with teammates, and enter this round before formation closes.',
      primaryCTA: { label: 'Register in 2 minutes', action: 'signup' },
      secondaryCTA: { label: 'How HackDay works', action: 'new-to-hackday' },
      footerPrefix: 'Hacking begins in',
    },
    [USER_STATES.FREE_AGENT_NO_IDEA]: {
      headline: 'Commit to a Team',
      status: 'You are currently a free agent.',
      context: (stats) => `${stats.ideas || 0} open ideas are recruiting now. Choose one and commit.`,
      primaryCTA: { label: 'Browse Ideas', action: 'marketplace', params: { tab: 'ideas' } },
      secondaryCTA: { label: 'Post an Idea', action: 'marketplace', params: { tab: 'create' } },
      footerPrefix: 'Team formation closes in',
    },
    [USER_STATES.FREE_AGENT_HAS_IDEA]: {
      headline: 'Fill Your Team',
      status: (ctx) => `Your idea is live: ${ctx.ideaTitle || 'Untitled idea'}`,
      context: (stats) => `${stats.freeAgents || 0} free agents are available. Convert interest into commitments quickly.`,
      primaryCTA: { label: 'Edit Your Idea', action: 'marketplace', params: { tab: 'my-idea' } },
      secondaryCTA: { label: 'Browse Ideas', action: 'marketplace', params: { tab: 'ideas' } },
      footerPrefix: 'Team formation closes in',
    },
    [USER_STATES.ON_TEAM_NOT_FULL]: {
      headline: 'Complete Your Team',
      status: (ctx) => `${ctx.teamName || 'Your team'} • ${ctx.memberCount || 0}/6 members`,
      context: (stats) => `${stats.freeAgents || 0} free agents are available. Fill critical roles before hacking begins.`,
      primaryCTA: { label: 'Find Teammates', action: 'marketplace', params: { tab: 'free-agents' } },
      secondaryCTA: { label: 'Open Team', action: 'team' },
      footerPrefix: 'Team formation closes in',
    },
    [USER_STATES.ON_TEAM_FULL]: {
      headline: 'Team Ready for Build',
      status: (ctx) => `${ctx.teamName || 'Your team'} • 6/6 members`,
      context: () => 'Your roster is complete. Finalize execution order so you start building immediately at kickoff.',
      primaryCTA: { label: 'Open Team', action: 'team' },
      secondaryCTA: null,
      footerPrefix: 'Hacking begins in',
    },
  },

  // ============================================================================
  // HACKING PHASE
  // ============================================================================
  hacking: {
    [USER_STATES.NOT_REGISTERED]: {
      headline: 'Hacking Is Live',
      status: 'You are viewing as a spectator.',
      context: (stats) => `${stats.teams || 0} teams are building right now. Follow progress and key milestones.`,
      primaryCTA: { label: 'Browse Teams', action: 'marketplace', params: { tab: 'teams' } },
      secondaryCTA: { label: 'See Schedule', action: 'schedule' },
      footerPrefix: 'Submissions due in',
    },
    [USER_STATES.ON_TEAM_NOT_FULL]: {
      headline: 'Build the Core Demo',
      status: (ctx) => `${ctx.teamName || 'Your team'} • Building now`,
      context: (stats) => `${stats.hoursRemaining || 0} hours remain. Focus on demo-critical scope first.`,
      primaryCTA: { label: 'Open Submission', action: 'submission' },
      secondaryCTA: { label: 'Open Team', action: 'team' },
      footerPrefix: 'Submissions due in',
    },
    [USER_STATES.ON_TEAM_FULL]: {
      headline: 'Build and Ship',
      status: (ctx) => `${ctx.teamName || 'Your team'} • Building now`,
      context: (stats) => `${stats.hoursRemaining || 0} hours remain. Keep momentum on demo and story quality.`,
      primaryCTA: { label: 'Open Submission', action: 'submission' },
      secondaryCTA: { label: 'Open Team', action: 'team' },
      footerPrefix: 'Submissions due in',
    },
    [USER_STATES.FREE_AGENT_NO_IDEA]: {
      headline: 'Hacking Is Live',
      status: 'You are spectating this hack round.',
      context: (stats) => `${stats.teams || 0} teams are actively building. Track outcomes and prepare for voting.`,
      primaryCTA: { label: 'Browse Teams', action: 'marketplace', params: { tab: 'teams' } },
      secondaryCTA: null,
      footerPrefix: 'Submissions due in',
    },
    [USER_STATES.FREE_AGENT_HAS_IDEA]: {
      headline: 'Hacking Is Live',
      status: 'You are spectating this hack round.',
      context: (stats) => `${stats.teams || 0} teams are actively building. Watch project quality and submission timing.`,
      primaryCTA: { label: 'Browse Teams', action: 'marketplace', params: { tab: 'teams' } },
      secondaryCTA: null,
      footerPrefix: 'Submissions due in',
    },
  },

  // ============================================================================
  // SUBMISSION PHASE
  // ============================================================================
  submission: {
    [USER_STATES.NOT_REGISTERED]: {
      headline: 'Submission Window Is Open',
      status: 'Teams are submitting projects now.',
      context: (stats) => `${stats.submissions || 0} projects are already in. Monitor final handoffs before voting.`,
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Voting opens in',
    },
    [USER_STATES.NOT_SUBMITTED]: {
      headline: 'Submit Before Cutoff',
      status: (ctx) => `${ctx.teamName || 'Your team'} • Not submitted yet`,
      context: () => 'Finalize demo, repo, and summary now. Prioritize a clear judging narrative.',
      primaryCTA: { label: 'Submit Project', action: 'submission' },
      secondaryCTA: null,
      footerPrefix: 'Submissions due in',
    },
    [USER_STATES.SUBMITTED]: {
      headline: 'Submission Locked In',
      status: (ctx) => `Project submitted: ${ctx.projectTitle || 'Your project'}`,
      context: (stats) => `${stats.submissions || 0} submissions received. Prepare for voting visibility.`,
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Voting opens in',
    },
    // Fallbacks for free agents
    [USER_STATES.FREE_AGENT_NO_IDEA]: {
      headline: 'Submission Window Is Open',
      status: 'Submissions are in progress.',
      context: (stats) => `${stats.submissions || 0} submissions are live to review.`,
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Voting opens in',
    },
    [USER_STATES.FREE_AGENT_HAS_IDEA]: {
      headline: 'Submission Window Is Open',
      status: 'Submissions are in progress.',
      context: (stats) => `${stats.submissions || 0} submissions are live to review.`,
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Voting opens in',
    },
  },

  // ============================================================================
  // VOTING PHASE
  // ============================================================================
  voting: {
    [USER_STATES.NOT_REGISTERED]: {
      headline: 'Voting Is Live',
      status: 'Review projects and support the strongest executions.',
      context: (stats) => `${stats.submissions || 0} projects are in the voting pool now.`,
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Voting closes in',
    },
    [USER_STATES.SUBMITTED]: {
      headline: 'Drive Votes for Your Project',
      status: (ctx) => `Your project is live: ${ctx.projectTitle || 'Your project'}`,
      context: (stats) => `${stats.submissions || 0} projects are competing. Keep your demo story clear and visible.`,
      primaryCTA: { label: 'Start Voting', action: 'voting' },
      secondaryCTA: { label: 'Open Submission', action: 'submission' },
      footerPrefix: 'Voting closes in',
    },
    // Default for others
    [USER_STATES.FREE_AGENT_NO_IDEA]: {
      headline: 'Voting Is Live',
      status: 'Cast votes on the strongest projects.',
      context: (stats) => `${stats.submissions || 0} projects are ready for review.`,
      primaryCTA: { label: 'Start Voting', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Voting closes in',
    },
  },

  // ============================================================================
  // JUDGING PHASE
  // ============================================================================
  judging: {
    [USER_STATES.NOT_REGISTERED]: {
      headline: 'Judging Is Underway',
      status: 'Judges are reviewing all submissions.',
      context: (stats) => `${stats.submissions || 0} projects are currently being scored.`,
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Results announced in',
    },
    [USER_STATES.SUBMITTED]: {
      headline: 'Judging Is Underway',
      status: (ctx) => `Your project is under review: ${ctx.projectTitle || 'Your project'}`,
      context: () => 'Scoring is active. Keep an eye on announcements for final rankings.',
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Results announced in',
    },
    // Default
    [USER_STATES.FREE_AGENT_NO_IDEA]: {
      headline: 'Judging Is Underway',
      status: 'Judging is underway.',
      context: (stats) => `${stats.submissions || 0} projects are being scored now.`,
      primaryCTA: { label: 'Browse Submissions', action: 'voting' },
      secondaryCTA: null,
      footerPrefix: 'Results announced in',
    },
  },

  // ============================================================================
  // RESULTS PHASE
  // ============================================================================
  results: {
    [USER_STATES.NOT_REGISTERED]: {
      headline: 'Final Results Are Live',
      status: 'Winners have been announced.',
      context: () => 'Review rankings, standout builds, and closing highlights from this HackDay.',
      primaryCTA: { label: 'See Results', action: 'results' },
      secondaryCTA: null,
      footerPrefix: '',
    },
    [USER_STATES.SUBMITTED]: {
      headline: 'Your Final Placement Is Ready',
      status: (ctx) => `Final placement for ${ctx.projectTitle || 'your project'} is now available.`,
      context: () => 'Review final rankings and compare your outcome against top submissions.',
      primaryCTA: { label: 'See Results', action: 'results' },
      secondaryCTA: null,
      footerPrefix: '',
    },
    // Default
    [USER_STATES.FREE_AGENT_NO_IDEA]: {
      headline: 'Final Results Are Live',
      status: 'This HackDay is complete.',
      context: () => 'Explore winners, top submissions, and the strongest demo narratives.',
      primaryCTA: { label: 'See Results', action: 'results' },
      secondaryCTA: null,
      footerPrefix: '',
    },
  },
};

/**
 * Get content for a specific phase and user state
 * @param {string} phase - Current event phase
 * @param {string} userState - Computed user state
 * @returns {Object} Content object
 */
export function getMissionContent(phase, userState) {
  const phaseContent = MISSION_CONTENT[phase];
  if (!phaseContent) {
    // Fallback to registration-like content
    return {
      heroVariant: 'welcome',
      headline: 'Welcome to HackDay',
      status: 'Build with a team, ship in 24 hours, and compete for top awards.',
      context: () => 'Check the schedule for current activity and next milestones.',
      primaryCTA: { label: 'View Schedule', action: 'schedule' },
      secondaryCTA: null,
      footerPrefix: '',
    };
  }

  // Try exact match, then fallbacks
  return phaseContent[userState] ||
    phaseContent[USER_STATES.FREE_AGENT_NO_IDEA] ||
    Object.values(phaseContent)[0];
}

export default MISSION_CONTENT;
