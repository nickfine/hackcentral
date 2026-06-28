import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  getCallerAccountId,
  getCurrentEvent,
  getUserByAccountId,
  makeId,
} from "../lib/helpers.js";

export function registerJudgingResolvers(resolver) {
// JUDGING
// ============================================================================

/**
 * Get judge scores
 */
resolver.define("getScores", async (req) => {
  const callerAccountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { scores: [] };
  }

  // Authz: scores (and their private comments) are only visible to judges and
  // admins. Judges may only ever see their *own* scores; admins see all.
  const caller = await getUserByAccountId(supabase, callerAccountId, "id, role");
  const isAdmin = caller?.role === "ADMIN";
  const isJudge = caller?.role === "JUDGE";
  if (!caller || (!isAdmin && !isJudge)) {
    return { scores: [] };
  }

  try {
    let query = supabase.from("JudgeScore").select(`
      *,
      judge:User!judgeId(id, name, image)
    `);

    // Judges are always scoped to their own scores, regardless of payload.
    if (!isAdmin) {
      query = query.eq("judgeId", caller.id);
    }

    const { data: scores, error } = await query;

    if (error) throw error;

    // Map project IDs to team IDs
    const { data: projects } = await supabase.from("Project").select("id, teamId");
    const projectToTeam = {};
    (projects || []).forEach((p) => {
      projectToTeam[p.id] = p.teamId;
    });

    return {
      scores: (scores || []).map((score) => ({
        id: score.id,
        judgeId: score.judgeId,
        teamId: projectToTeam[score.projectId] || score.projectId, // Map projectId to teamId
        innovation: score.scores?.innovation || 0,
        execution: score.scores?.execution || 0,
        design: score.scores?.design || 0,
        relevance: score.scores?.relevance || 0,
        tagValues: score.scores?.tagValues || 0,
        comments: score.comments || "",
        scoredAt: score.createdAt,
      })),
    };
  } catch (error) {
    console.error("getScores error:", error);
    throw new Error(`Failed to get scores: ${error.message}`);
  }
});

/**
 * Helper: Validate judge score field (0-100 range)
 */
function validateScore(score, fieldName) {
  const num = Number(score);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < 0 || num > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }
  return Math.round(num);
}

async function isAcceptedTeamMember(supabase, teamId, userId) {
  if (!teamId || !userId) return false;
  const { data, error } = await supabase
    .from("TeamMember")
    .select("id")
    .eq("teamId", teamId)
    .eq("userId", userId)
    .eq("status", "ACCEPTED")
    .limit(1);
  if (error) throw error;
  return Boolean(data?.[0]);
}

/**
 * Submit judge score
 */
resolver.define("submitScore", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, scoreData } = req.payload || {};
  if (!teamId || !scoreData) {
    throw new Error("teamId and scoreData are required");
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

    // Verify user is judge
    if (user.role !== "JUDGE" && user.role !== "ADMIN") {
      throw new Error("Only judges can submit scores");
    }

    if (await isAcceptedTeamMember(supabase, teamId, user.id)) {
      throw new Error("You cannot score your own team");
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

    // Check if score already exists
    const { data: existingData } = await supabase
      .from("JudgeScore")
      .select("id")
      .eq("judgeId", user.id)
      .eq("projectId", project.id)
      .limit(1);

    const existing = existingData?.[0];

    const scoreRecord = {
      scores: {
        innovation: validateScore(scoreData.innovation || 0, "Innovation"),
        execution: validateScore(scoreData.execution || 0, "Execution"),
        design: validateScore(scoreData.design || 0, "Design"),
        relevance: validateScore(scoreData.relevance || 0, "Relevance"),
        tagValues: validateScore(scoreData.tagValues || 0, "TAG Values"),
      },
      comments: (scoreData.comments || "").toString().trim().slice(0, 1000),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Update existing score
      const { error: updateError } = await supabase
        .from("JudgeScore")
        .update(scoreRecord)
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      // Create new score
      const { error: insertError } = await supabase.from("JudgeScore").insert({
        id: makeId("score"),
        judgeId: user.id,
        projectId: project.id,
        ...scoreRecord,
        createdAt: new Date().toISOString(),
      });

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error("submitScore error:", error);
    throw new Error(`Failed to submit score: ${error.message}`);
  }
});


}
