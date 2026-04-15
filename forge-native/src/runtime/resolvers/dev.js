import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  DEMO_EVENT_ID,
  PHASE_MAP,
  ROLE_MAP,
  OBSERVERS_TEAM_ID,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  isAdminOrOwner,
  logDebug,
  makeId,
} from "../lib/helpers.js";

export function registerDevResolvers(resolver) {
/**
 * Check if dev mode is enabled (admin only)
 * DEV MODE - Remove before production
 */
resolver.define("checkDevMode", async (req) => {
  const isDevMode = process.env.ENABLE_DEV_MODE === 'true';
  return { enabled: isDevMode };
});


// ============================================================================
// GET DEMO DATA - Unified demo data from Supabase
// ============================================================================

/**
 * Fetch demo data from Supabase for demo mode
 * This replaces hardcoded mock data with database-driven demo data
 * Shared with HD26AI for consistent cross-platform demos
 */
resolver.define("getDemoData", async ({ context }) => {
  try {
    // Demo DB fetch is intentionally gated so production doesn't depend on
    // seed scripts being in sync. Enable explicitly when needed.
    const useDbDemoData = process.env.ENABLE_DB_DEMO_DATA === "true";
    if (!useDbDemoData) {
      logDebug("[getDemoData] Demo DB fetch disabled (set ENABLE_DB_DEMO_DATA=true to enable)");
      return { error: "Demo DB fetch disabled" };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error("[getDemoData] Supabase client not available");
      return { error: "Database not configured" };
    }

    // Fetch demo event
    const { data: event, error: eventError } = await supabase
      .from("Event")
      .select("*")
      .eq("id", DEMO_EVENT_ID)
      .limit(1);

    if (eventError) {
      console.error("[getDemoData] Error fetching event:", eventError);
      return { error: "Demo event not found. Run seed_demo_data.sql first." };
    }

    const demoEvent = event?.[0];
    if (!demoEvent) {
      return { error: "Demo event not found. Run seed_demo_data.sql first." };
    }

    // Fetch demo users (registrations)
    const { data: users, error: usersError } = await supabase
      .from("User")
      .select("*")
      .like("id", "demo-%");

    if (usersError) {
      console.error("[getDemoData] Error fetching users:", usersError);
    }

    // Fetch demo teams with members
    const { data: teams, error: teamsError } = await supabase
      .from("Team")
      .select(`
        *,
        members:TeamMember(
          id,
          role,
          status,
          userId,
          user:User(id, name, callsign, skills, role, isFreeAgent)
        )
      `)
      .eq("eventId", DEMO_EVENT_ID)
      .order("createdAt", { ascending: true });

    if (teamsError) {
      console.error("[getDemoData] Error fetching teams:", teamsError);
    }

    // Fetch demo projects
    const { data: projects, error: projectsError } = await supabase
      .from("Project")
      .select("*")
      .like("id", "demo-%");

    if (projectsError) {
      console.error("[getDemoData] Error fetching projects:", projectsError);
    }

    // Fetch demo votes
    const { data: votes, error: votesError } = await supabase
      .from("Vote")
      .select("*")
      .like("id", "demo-%");

    if (votesError) {
      console.error("[getDemoData] Error fetching votes:", votesError);
    }

    // Fetch demo judge scores
    const { data: scores, error: scoresError } = await supabase
      .from("JudgeScore")
      .select(`
        *,
        judge:User(id, name, callsign)
      `)
      .like("id", "demo-%");

    if (scoresError) {
      console.error("[getDemoData] Error fetching scores:", scoresError);
    }

    // Fetch demo team invites
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        team:Team(id, name),
        user:User(id, name, callsign, skills)
      `)
      .like("id", "demo-%");

    if (invitesError) {
      console.error("[getDemoData] Error fetching invites:", invitesError);
    }

    // Transform data to frontend format
    const transformedRegistrations = (users || []).map(user => ({
      accountId: user.id,
      displayName: user.name,
      callsign: user.callsign,
      skills: user.skills ? user.skills.split(",") : [],
      role: ROLE_MAP[user.role] || "participant",
      isFreeAgent: user.isFreeAgent,
      isJudge: user.role === "JUDGE",
      isAdmin: user.role === "ADMIN",
      bio: user.bio,
      registeredAt: user.createdAt,
    }));

    // Create project lookup by teamId
    const projectsByTeam = {};
    (projects || []).forEach(p => {
      projectsByTeam[p.teamId] = p;
    });

    // Create vote counts by projectId
    const votesByProject = {};
    (votes || []).forEach(v => {
      votesByProject[v.projectId] = (votesByProject[v.projectId] || 0) + 1;
    });

    // Create scores by projectId
    const scoresByProject = {};
    (scores || []).forEach(s => {
      if (!scoresByProject[s.projectId]) {
        scoresByProject[s.projectId] = [];
      }
      scoresByProject[s.projectId].push({
        judgeId: s.judgeId,
        judgeName: s.judge?.name,
        scores: s.scores,
        comments: s.comments,
        scoredAt: s.createdAt,
      });
    });

    const transformedTeams = (teams || []).map(team => {
      const project = projectsByTeam[team.id];
      const captain = team.members?.find(m => m.role === "OWNER");
      const memberIds = team.members?.filter(m => m.status === "ACCEPTED").map(m => m.userId) || [];
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        captainId: captain?.userId,
        captainName: captain?.user?.name,
        members: memberIds,
        lookingFor: team.lookingFor ? team.lookingFor.split(",") : [],
        maxMembers: team.maxSize, // API: Transform DB `maxSize` → API `maxMembers`
        joinRequests: [],  // Join requests are handled separately
        isObserverTeam: team.isAutoCreated && team.name === "Observers",
        submission: project ? {
          projectName: project.name,
          description: project.description,
          demoVideoUrl: project.videoUrl,
          repoUrl: project.repoUrl,
          liveDemoUrl: project.demoUrl,
          submittedAt: project.submittedAt,
          participantVotes: votesByProject[project.id] || 0,
          judgeScores: scoresByProject[project.id] || [],
        } : null,
        createdAt: team.createdAt,
      };
    });

    const transformedVotes = (votes || []).map(v => ({
      id: v.id,
      voterId: v.userId,
      teamId: projectsByTeam[v.projectId]?.teamId || v.projectId,
      projectId: v.projectId,
      votedAt: v.createdAt,
    }));

    const transformedScores = (scores || []).map(s => ({
      id: s.id,
      judgeId: s.judgeId,
      teamId: projectsByTeam[s.projectId]?.teamId || s.projectId,
      projectId: s.projectId,
      ...(s.scores || {}),
      comments: s.comments,
      scoredAt: s.createdAt,
    }));

    const transformedInvites = (invites || []).map(i => ({
      id: i.id,
      teamId: i.teamId,
      teamName: i.team?.name,
      userId: i.userId,
      userName: i.user?.name,
      userSkills: i.user?.skills ? i.user.skills.split(",") : [],
      message: i.message,
      status: i.status,
      createdAt: i.createdAt,
    }));

    // Get free agents (users with isFreeAgent = true who are not on a team)
    const teamMemberIds = new Set();
    (teams || []).forEach(t => {
      (t.members || []).forEach(m => {
        if (m.status === "ACCEPTED") teamMemberIds.add(m.userId);
      });
    });
    
    const freeAgents = transformedRegistrations.filter(r => 
      r.isFreeAgent && !teamMemberIds.has(r.accountId)
    );

    logDebug(`[getDemoData] Loaded: ${transformedRegistrations.length} users, ${transformedTeams.length} teams, ${transformedVotes.length} votes, ${transformedScores.length} scores`);

    return {
      success: true,
      event: {
        id: demoEvent.id,
        name: demoEvent.name,
        phase: PHASE_MAP[demoEvent.phase] || "signup",
        year: demoEvent.year,
      },
      registrations: transformedRegistrations,
      teams: transformedTeams,
      votes: transformedVotes,
      scores: transformedScores,
      invites: transformedInvites,
      freeAgents: freeAgents,
    };
  } catch (error) {
    console.error("[getDemoData] Error:", error);
    return { error: error.message };
  }
});

// ============================================================================
// DEV HELPER: Create Test Submission
// ============================================================================

/**
 * DEV ONLY: Create a test submission for the first team
 * Requires admin role for security
 */
resolver.define("devCreateTestSubmission", async (req) => {
  const accountId = getCallerAccountId(req);
  const supabase = getSupabaseClient();

  try {
    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id, role, email")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (!isAdminOrOwner(user, accountId)) {
      throw new Error("Only admins can create test submissions");
    }

    // Get first team
    const { data: teams, error: teamError } = await supabase
      .from("Team")
      .select("id, name")
      .neq("id", OBSERVERS_TEAM_ID)
      .limit(1);

    if (teamError || !teams || teams.length === 0) {
      throw new Error("No teams found to create test submission");
    }

    const team = teams[0];

    // Check if project already exists
    const { data: existing } = await supabase
      .from("Project")
      .select("id")
      .eq("teamId", team.id)
      .limit(1);

    const projectData = {
      name: `Test Project for ${team.name}`,
      description: "This is a test submission to verify the Export Results feature works correctly.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      repoUrl: "https://github.com/test/test-repo",
      demoUrl: "https://test-demo.example.com",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      // Update existing
      const { error: updateError } = await supabase
        .from("Project")
        .update(projectData)
        .eq("id", existing[0].id);

      if (updateError) throw updateError;
      return { success: true, message: `Updated test submission for team: ${team.name}`, teamId: team.id };
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from("Project")
        .insert({
          id: makeId("proj"),
          teamId: team.id,
          ...projectData,
          createdAt: new Date().toISOString(),
        });

      if (insertError) throw insertError;
      return { success: true, message: `Created test submission for team: ${team.name}`, teamId: team.id };
    }
  } catch (error) {
    console.error("devCreateTestSubmission error:", error);
    throw new Error(`Failed to create test submission: ${error.message}`);
  }
});


}
