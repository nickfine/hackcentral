/**
 * MOTD (Message of the Day) Messages
 * 
 * Phase and role-specific messages displayed on the Dashboard.
 * This file is the source of truth for MOTD content.
 * 
 * Structure: MOTD_MESSAGES[phase][role] = message
 * 
 * Phases: signup, team_formation, hacking, submission, voting, judging, results
 * Roles: guest, participant, ambassador, judge, admin
 * 
 * Note: 'guest' role is for unregistered visitors who haven't signed up yet.
 */

export const MOTD_MESSAGES = {
  // ============================================================================
  // SIGN UP PHASE
  // ============================================================================
  signup: {
    guest: {
      title: 'Welcome to HackDay!',
      message: 'Great to have you here. Create your profile to unlock ideas, team formation, and the full HackDay experience.',
      variant: 'info',
    },
    participant: {
      title: 'Complete Your Signup',
      message: 'Finish your profile, add your skills, and choose how you want to participate before team formation begins.',
      variant: 'warning',
    },
    ambassador: {
      title: 'Signup Window Active',
      message: 'Encourage newcomers to register now so they are ready when team formation opens.',
      variant: 'info',
    },
    judge: {
      title: 'Signup Phase Active',
      message: 'Participants are completing registration. Team formation and project activity will start next.',
      variant: 'info',
    },
    admin: {
      title: 'Signup Phase',
      message: 'Monitor registration progress and make sure participants can complete signup before team formation opens.',
      variant: 'warning',
    },
  },

  // ============================================================================
  // TEAM FORMATION PHASE
  // ============================================================================
  team_formation: {
    guest: {
      title: 'Welcome to HackDay!',
      message: 'Team formation is live. Register now to join an idea, connect with teammates, and start building this round.',
      variant: 'info',
    },
    participant: {
      title: 'Team Formation in Progress',
      message: "It's time to form your team! Join an existing idea, create your own, or stay as a Free Agent. Teams can have 2-6 members. Don't wait too long—the hack starts soon!",
      variant: 'warning',
    },
    ambassador: {
      title: 'Recruitment Time!',
      message: 'Team formation is underway. This is your chance to recruit participants to your side. Reach out to Free Agents and help them find the perfect team.',
      variant: 'warning',
    },
    judge: {
      title: 'Teams Are Forming',
      message: 'Participants are currently forming teams. Watch the activity feed to see teams come together. Your judging duties will begin after the hacking phase.',
      variant: 'info',
    },
    admin: {
      title: 'Team Formation Phase',
      message: 'Monitor team formation progress. Check for Free Agents who may need assistance finding teams. Consider reaching out to participants without teams as the deadline approaches.',
      variant: 'warning',
    },
  },

  // ============================================================================
  // HACKING PHASE
  // ============================================================================
  hacking: {
    guest: {
      title: 'Hacking Has Begun!',
      message: 'Teams are building amazing projects right now! While registration for this event has closed, check out the activity feed and come back for the next HackDay.',
      variant: 'info',
    },
    participant: {
      title: 'Hacking Has Begun!',
      message: 'The clock is ticking! Work with your team to build something amazing. Remember to save your progress regularly and prepare your submission before the deadline.',
      variant: 'success',
    },
    ambassador: {
      title: 'Hack is Live!',
      message: 'The hack is underway! Support your teams and keep the energy high. Check in with participants and help resolve any blockers they encounter.',
      variant: 'success',
    },
    judge: {
      title: 'Hacking in Progress',
      message: 'Teams are building their projects. Feel free to observe the activity feed. Your scoring interface will activate during the judging phase.',
      variant: 'info',
    },
    admin: {
      title: 'Hacking Phase Active',
      message: 'The hack is live! Monitor progress and be ready to assist with any technical or logistical issues. Keep an eye on the submission deadline.',
      variant: 'success',
    },
  },

  // ============================================================================
  // SUBMISSION PHASE
  // ============================================================================
  submission: {
    guest: {
      title: 'Submissions Are Open!',
      message: 'Teams are submitting their incredible projects. Watch the submissions roll in and see what participants have built!',
      variant: 'info',
    },
    participant: {
      title: 'Submission Window Open',
      message: 'Time to submit your project! Include your demo video, repository link, and project description. Make sure all required fields are complete before the deadline.',
      variant: 'warning',
    },
    ambassador: {
      title: 'Submissions Open',
      message: 'The submission window is open. Remind teams to submit their projects before the deadline. Help ensure all teams have everything they need.',
      variant: 'warning',
    },
    judge: {
      title: 'Submissions in Progress',
      message: 'Teams are submitting their projects. Once submissions close, you\'ll be able to review and score all projects in your Judge Scoring panel.',
      variant: 'info',
    },
    admin: {
      title: 'Submission Phase',
      message: 'Monitor submission progress. Send reminders to teams that haven\'t submitted yet. Check that all submissions meet the requirements.',
      variant: 'warning',
    },
  },

  // ============================================================================
  // VOTING PHASE
  // ============================================================================
  voting: {
    guest: {
      title: 'Voting is Live!',
      message: 'The community is voting for their favorite projects. Browse the amazing submissions and see what teams have built during this HackDay!',
      variant: 'info',
    },
    participant: {
      title: "Vote for People's Champion!",
      message: 'Review the submitted projects and cast your votes. You can vote for up to 5 projects. Help decide who wins the People\'s Champion award!',
      variant: 'info',
    },
    ambassador: {
      title: 'Voting is Open',
      message: 'Encourage participants to vote for their favorite projects. The People\'s Champion is decided by popular vote!',
      variant: 'info',
    },
    judge: {
      title: 'Review Submissions',
      message: 'Participants are voting for People\'s Champion. Use this time to review all submissions and prepare your evaluations. Your scoring panel will open during the judging phase.',
      variant: 'info',
    },
    admin: {
      title: 'Voting Phase Active',
      message: 'Voting is open for participants. Monitor voting progress and remind judges to prepare for the upcoming judging phase.',
      variant: 'info',
    },
  },

  // ============================================================================
  // JUDGING PHASE
  // ============================================================================
  judging: {
    guest: {
      title: 'Judging in Progress',
      message: 'Our judges are evaluating all the amazing submissions. Check back soon for the results!',
      variant: 'info',
    },
    participant: {
      title: 'Judging in Progress',
      message: 'The judges are reviewing all submissions. Sit tight while they evaluate the projects. Results will be announced soon!',
      variant: 'info',
    },
    ambassador: {
      title: 'Judges at Work',
      message: 'The judges are evaluating submissions. Keep the excitement going—results will be announced soon!',
      variant: 'info',
    },
    judge: {
      title: 'Complete Your Evaluations',
      message: 'Please finish scoring all submissions. Your input is crucial for determining the winners. Check your Judge Scoring panel for remaining projects.',
      variant: 'warning',
    },
    admin: {
      title: 'Judging Phase',
      message: 'Monitor judge progress. Ensure all judges complete their evaluations before the deadline. Prepare the results announcement.',
      variant: 'warning',
    },
  },

  // ============================================================================
  // RESULTS PHASE
  // ============================================================================
  results: {
    guest: {
      title: 'Results Are In!',
      message: 'This HackDay has concluded! Check out the winning projects and see what amazing things were built. Join us for the next HackDay!',
      variant: 'success',
    },
    participant: {
      title: 'Results Are In!',
      message: 'Congratulations to all participants! Check out the Results page to see the winners and celebrate the amazing projects built during this HackDay.',
      variant: 'success',
    },
    ambassador: {
      title: 'HackDay Complete!',
      message: 'Another successful HackDay! Check out the winners and celebrate with your teams. Thank you for your support in making this event great.',
      variant: 'success',
    },
    judge: {
      title: 'Thank You, Judges!',
      message: 'Thank you for your time and expertise in evaluating the submissions. Check out the Results page to see the final standings.',
      variant: 'success',
    },
    admin: {
      title: 'Event Complete',
      message: 'This HackDay has concluded! Review the final results and export data as needed. Consider gathering feedback for the next event.',
      variant: 'success',
    },
  },
};

/**
 * Get MOTD for a specific phase and role
 * Falls back to guest message for unregistered users
 * Falls back to participant message if role-specific message not found
 * Falls back to generic welcome message if phase not found
 * 
 * @param {string} phase - Current event phase
 * @param {string} role - User role (guest, participant, ambassador, judge, admin)
 * @param {boolean} isRegistered - Whether the user is registered (defaults to true)
 * @returns {Object} MOTD object with title, message, and variant
 */
export function getMotdForPhaseAndRole(phase, role, isRegistered = true) {
  // Default fallback message for guests/newcomers
  const defaultMotd = {
    title: 'Welcome to HackDay!',
    message: 'You are in the right place. Register to join a team, build fast, and take part in HackDay.',
    variant: 'info',
  };

  // If not registered, use guest role
  const effectiveRole = isRegistered ? (role || 'participant') : 'guest';

  // Check if phase exists
  if (!MOTD_MESSAGES[phase]) {
    return defaultMotd;
  }

  // Try to get role-specific message
  const phaseMessages = MOTD_MESSAGES[phase];
  const motd = phaseMessages[effectiveRole] || 
               phaseMessages.guest || 
               phaseMessages.participant || 
               defaultMotd;

  return motd;
}

/**
 * MOTD variants for styling
 */
export const MOTD_VARIANTS = {
  info: {
    bgClass: 'bg-cyan-accent',
    borderClass: 'border-cyan-primary',
    iconColor: 'text-cyan-primary',
  },
  warning: {
    bgClass: 'bg-orange-accent',
    borderClass: 'border-orange-primary',
    iconColor: 'text-orange-primary',
  },
  success: {
    bgClass: 'bg-green-accent',
    borderClass: 'border-green-primary',
    iconColor: 'text-green-primary',
  },
  error: {
    bgClass: 'bg-red-accent',
    borderClass: 'border-red-primary',
    iconColor: 'text-red-primary',
  },
};

export default MOTD_MESSAGES;
