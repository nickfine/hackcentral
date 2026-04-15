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
  const shouldFilterToCaller = !!req.payload?.accountId;
  const callerAccountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { scores: [] };
  }

  try {
    let query = supabase.from("JudgeScore").select(`
      *,
      judge:User!judgeId(id, name, image)
    `);

    // If accountId provided (legacy), filter by the *caller*.
    // Note: payload spoofing is rejected by getCallerAccountId.
    if (shouldFilterToCaller) {
      const { data: userData } = await supabase
        .from("User")
        .select("*")
        .eq("atlassian_account_id", callerAccountId)
        .limit(1);

      const user = userData?.[0];
      if (user) {
        query = query.eq("judgeId", user.id);
      }
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
        technical: score.scores?.technical || 0,
        presentation: score.scores?.presentation || 0,
        impact: score.scores?.impact || 0,
        theme: score.scores?.theme || 0,
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
        technical: validateScore(scoreData.technical || 0, "Technical"),
        presentation: validateScore(scoreData.presentation || 0, "Presentation"),
        impact: validateScore(scoreData.impact || 0, "Impact"),
        theme: validateScore(scoreData.theme || 0, "Theme"),
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
