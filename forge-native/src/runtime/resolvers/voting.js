import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  getCallerAccountId,
  getCurrentEvent,
  getUserByAccountId,
  makeId,
} from "../lib/helpers.js";

export function registerVotingResolvers(resolver) {
// VOTING
// ============================================================================

/**
 * Get votes for current user
 */
resolver.define("getVotes", async (req) => {
  let accountId;
  try {
    accountId = getCallerAccountId(req);
  } catch {
    return { votes: [], voteCounts: {} };
  }

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { votes: [], voteCounts: {} };
  }

  try {
    await getUserByAccountId(supabase, accountId, "id");

    // Restrict vote calculations to projects belonging to current event teams.
    const { data: teamRows, error: teamError } = await supabase
      .from("Team")
      .select("id")
      .eq("eventId", event.id);
    if (teamError) throw teamError;

    const teamIds = (teamRows || []).map((t) => t.id);
    if (teamIds.length === 0) {
      return { votes: [], voteCounts: {} };
    }

    const { data: projectRows, error: projectError } = await supabase
      .from("Project")
      .select("id, teamId")
      .in("teamId", teamIds);
    if (projectError) throw projectError;

    const projectIds = (projectRows || []).map((p) => p.id);
    if (projectIds.length === 0) {
      return { votes: [], voteCounts: {} };
    }

    const projectToTeam = Object.fromEntries((projectRows || []).map((p) => [p.id, p.teamId]));

    const allVotesResult = await supabase
      .from("Vote")
      .select("userId, projectId, createdAt")
      .in("projectId", projectIds);

    if (allVotesResult.error) throw allVotesResult.error;

    const voteCounts = {};
    for (const vote of allVotesResult.data || []) {
      const teamId = projectToTeam[vote.projectId];
      if (!teamId) continue;
      voteCounts[teamId] = (voteCounts[teamId] || 0) + 1;
    }

    // Format votes for frontend (with voterId and teamId)
    const formattedVotes = (allVotesResult.data || [])
      .map((vote) => {
        const teamId = projectToTeam[vote.projectId];
        if (!teamId) return null;
        return {
          voterId: vote.userId,
          teamId,
          votedAt: vote.createdAt,
        };
      })
      .filter(Boolean);

    return {
      votes: formattedVotes,
      voteCounts,
    };
  } catch (error) {
    console.error("getVotes error:", error);
    throw new Error(`Failed to get votes: ${error.message}`);
  }
});

/**
 * Cast a vote for a team
 */
async function isAcceptedTeamMember(supabase, teamId, userId) {
  if (!teamId || !userId) {
    return false;
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("TeamMember")
    .select("id")
    .eq("teamId", teamId)
    .eq("userId", userId)
    .eq("status", "ACCEPTED")
    .limit(1);

  if (membershipError) throw membershipError;

  return Boolean(membershipData?.[0]);
}

resolver.define("castVote", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (await isAcceptedTeamMember(supabase, teamId, user.id)) {
      throw new Error("You cannot vote for your own team");
    }

    // Get team's project
    const { data: projectData, error: projectError } = await supabase
      .from("Project")
      .select("*")
      .eq("teamId", teamId)
      .limit(1);

    const project = projectData?.[0];
    if (projectError || !project) {
      throw new Error("Team has no submitted project");
    }

    // Check if already voted
    const { data: existingData } = await supabase
      .from("Vote")
      .select("*")
      .eq("userId", user.id)
      .eq("projectId", project.id)
      .limit(1);

    const existing = existingData?.[0];

    if (existing) {
      throw new Error("Already voted for this team");
    }

    // Check vote limit (event setting; default 1)
    const event = await getCurrentEvent(supabase, req);
    const maxVotesPerUser = event?.maxVotesPerUser || 1;

    // Get event teams to filter votes by current event
    const { data: eventTeams } = await supabase
      .from("Team")
      .select("id")
      .eq("eventId", event.id);

    const eventTeamIds = new Set((eventTeams || []).map(t => t.id));

    // Get projects for event teams
    const { data: eventProjects } = await supabase
      .from("Project")
      .select("id")
      .in("teamId", Array.from(eventTeamIds));

    const eventProjectIds = (eventProjects || []).map(p => p.id);

    // Count user's votes for current event only
    const { data: userVotes } = await supabase
      .from("Vote")
      .select("*")
      .eq("userId", user.id)
      .in("projectId", eventProjectIds);

    // NOTE: There is still a race condition between this check and insert
    // Proper fix requires database constraint or transaction
    if ((userVotes || []).length >= maxVotesPerUser) {
      throw new Error(`Maximum ${maxVotesPerUser} votes allowed`);
    }

    // Create vote
    const { error: voteError } = await supabase.from("Vote").insert({
      id: makeId("vote"),
      userId: user.id,
      projectId: project.id,
      createdAt: new Date().toISOString(),
    });

    if (voteError) throw voteError;

    return { success: true };
  } catch (error) {
    console.error("castVote error:", error);
    throw new Error(`Failed to cast vote: ${error.message}`);
  }
});

/**
 * Remove a vote
 */
resolver.define("removeVote", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get team's project
    const { data: projectData } = await supabase.from("Project").select("*").eq("teamId", teamId).limit(1);
    const project = projectData?.[0];

    if (!project) {
      throw new Error("Team has no submitted project");
    }

    // Delete vote
    const { error: deleteError } = await supabase
      .from("Vote")
      .delete()
      .eq("userId", user.id)
      .eq("projectId", project.id);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error("removeVote error:", error);
    throw new Error(`Failed to remove vote: ${error.message}`);
  }
});


}
