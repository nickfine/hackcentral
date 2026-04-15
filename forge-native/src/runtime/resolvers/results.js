import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  OBSERVERS_TEAM_ID,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  getCurrentEvent,
  isAdminOrOwner,
} from "../lib/helpers.js";

export function registerResultsResolvers(resolver) {
/**
 * Helper: Escape CSV field values
 * Handles quotes, commas, and newlines per RFC 4180
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // If contains special chars (quote, comma, newline), wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return '"' + str + '"';
}

/**
 * Export results to CSV (admin only)
 */
resolver.define("exportResults", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    if (!isAdminOrOwner(user, accountId)) {
      throw new Error("Only admins can export results");
    }

    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      throw new Error("No current event found");
    }

    // Get all teams with submissions
    const { data: teams, error: teamsError } = await supabase
      .from("Team")
      .select(`
        *,
        members:TeamMember(userId, user:User(id, name)),
        project:Project(*)
      `)
      .eq("eventId", event.id)
      .eq("isPublic", true);

    if (teamsError) throw teamsError;

    // Get project IDs for event teams to filter votes/scores
    const eventProjectIds = (teams || [])
      .filter(t => t.project?.id)
      .map(t => t.project.id);

    const eventTeamIds = (teams || []).map(t => t.id);

    // Get votes filtered by event projects
    const { data: votes, error: votesError } = await supabase
      .from("Vote")
      .select("*")
      .in("projectId", eventProjectIds.length > 0 ? eventProjectIds : []);

    if (votesError) throw votesError;

    // Get judge scores filtered by event teams
    const { data: scores, error: scoresError } = await supabase
      .from("JudgeScore")
      .select("*")
      .in("teamId", eventTeamIds.length > 0 ? eventTeamIds : []);

    if (scoresError) throw scoresError;

    // Calculate scores and rankings
    const teamsWithData = (teams || [])
      .filter(t => t.project && t.id !== OBSERVERS_TEAM_ID)
      .map(team => {
        const teamVotes = (votes || []).filter(v => v.projectId === team.project.id);
        const teamScores = (scores || []).filter(s => s.teamId === team.id);
        
        const judgeTotal = teamScores.reduce((sum, s) => {
          return sum + (s.innovation + s.technical + s.presentation + s.impact + s.theme);
        }, 0);
        
        const judgeAvg = teamScores.length > 0 
          ? (judgeTotal / (teamScores.length * 5)) * 100 
          : 0;

        return {
          name: team.name,
          projectName: team.project.name || "",
          judgeScore: judgeTotal,
          judgeAverage: judgeAvg.toFixed(2),
          voteCount: teamVotes.length,
          members: (team.members || []).map(m => m.user?.name || "Unknown").join("; "),
        };
      })
      .sort((a, b) => {
        // Sort by judge score (descending)
        return parseFloat(b.judgeAverage) - parseFloat(a.judgeAverage);
      });

    // Generate CSV
    const csvRows = [];
    csvRows.push([
      "Rank",
      "Team Name",
      "Project Name",
      "Judge Score",
      "Judge Average %",
      "Participant Votes",
      "Members",
    ].join(","));

    teamsWithData.forEach((team, idx) => {
      csvRows.push([
        idx + 1,
        escapeCSVField(team.name),
        escapeCSVField(team.projectName),
        team.judgeScore,
        team.judgeAverage,
        team.voteCount,
        escapeCSVField(team.members),
      ].join(","));
    });

    const csvContent = csvRows.join("\n");

    return { csv: csvContent, error: null };
  } catch (error) {
    console.error("exportResults error:", error);
    return { csv: null, error: error.message };
  }
});


}
