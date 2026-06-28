import { getSupabaseClient } from "../lib/supabase";
import { convexQuery } from "../lib/convex.js";
import {
  getCallerAccountId,
  getCurrentEvent,
  getUserByAccountId,
  isAdminOrOwner,
  logDebug,
} from "../lib/helpers.js";
import { OBSERVERS_TEAM_ID } from "../lib/constants.js";
import { transformTeam } from "../lib/transforms.js";

export function registerArchiveResolvers(resolver) {

// ============================================================================
// ARCHIVE — read-only access to past hackdays (phase = RESULTS)
// ============================================================================

/**
 * List all past hackdays with team/submission counts and winner name.
 */
resolver.define("getArchivedEvents", async (req) => {
  const supabase = getSupabaseClient();
  if (!getCallerAccountId(req)) return { events: [] };

  try {
    const { data: events, error } = await supabase
      .from("Event")
      .select("id, name, title, year, startDate, endDate, awards")
      .eq("phase", "RESULTS")
      .order("endDate", { ascending: false });

    if (error || !events?.length) return { events: [] };

    const eventIds = events.map((e) => e.id);

    const [teamsResult, projectsResult] = await Promise.all([
      supabase
        .from("Team")
        .select("id, eventId")
        .in("eventId", eventIds)
        .neq("id", OBSERVERS_TEAM_ID),
      supabase
        .from("Project")
        .select("teamId")
        .not("submittedAt", "is", null),
    ]);

    const teamCountByEvent = {};
    const teamToEvent = {};
    for (const team of teamsResult.data || []) {
      teamCountByEvent[team.eventId] = (teamCountByEvent[team.eventId] || 0) + 1;
      teamToEvent[team.id] = team.eventId;
    }

    const submissionCountByEvent = {};
    for (const project of projectsResult.data || []) {
      const eid = teamToEvent[project.teamId];
      if (eid) submissionCountByEvent[eid] = (submissionCountByEvent[eid] || 0) + 1;
    }

    // Resolve winner team names in one query
    const winnerTeamIds = [...new Set(
      events.filter((e) => e.awards?.winner).map((e) => e.awards.winner)
    )];
    let winnerNameById = {};
    if (winnerTeamIds.length > 0) {
      const { data: winnerTeams } = await supabase
        .from("Team")
        .select("id, name")
        .in("id", winnerTeamIds);
      for (const t of winnerTeams || []) winnerNameById[t.id] = t.name;
    }

    return {
      events: events.map((e) => ({
        id: e.id,
        name: e.title || e.name,
        year: e.year,
        startDate: e.startDate,
        endDate: e.endDate,
        teamCount: teamCountByEvent[e.id] || 0,
        submissionCount: submissionCountByEvent[e.id] || 0,
        winnerName: e.awards?.winner ? (winnerNameById[e.awards.winner] || null) : null,
        awards: e.awards || {},
      })),
    };
  } catch (err) {
    console.error("getArchivedEvents error:", err);
    return { events: [] };
  }
});

/**
 * Get full data for one archived hackday: teams, submissions, pain points, awards.
 * Only works for events in RESULTS phase.
 */
resolver.define("getArchivedEvent", async (req) => {
  const supabase = getSupabaseClient();
  if (!getCallerAccountId(req)) return { event: null, teams: [], painPoints: [] };

  const { eventId } = req.payload || {};
  if (!eventId) return { event: null, teams: [], painPoints: [] };

  try {
    const { data: eventRow, error: eventError } = await supabase
      .from("Event")
      .select("id, name, title, year, startDate, endDate, awards")
      .eq("id", eventId)
      .eq("phase", "RESULTS")
      .limit(1)
      .single();

    if (eventError || !eventRow) return { event: null, teams: [], painPoints: [] };

    const { data: teamRows, error: teamsError } = await supabase
      .from("Team")
      .select("id, eventId, name, description, lookingFor, maxSize, createdAt")
      .eq("eventId", eventId)
      .neq("id", OBSERVERS_TEAM_ID)
      .or("isPublic.eq.true,isPublic.is.null")
      .order("createdAt", { ascending: false });

    if (teamsError) throw teamsError;

    if (!teamRows?.length) {
      return {
        event: { id: eventRow.id, name: eventRow.title || eventRow.name, year: eventRow.year, startDate: eventRow.startDate, endDate: eventRow.endDate, awards: eventRow.awards || {} },
        teams: [],
        painPoints: [],
      };
    }

    const teamIds = teamRows.map((t) => t.id);

    const [membersResult, projectsResult] = await Promise.all([
      supabase
        .from("TeamMember")
        .select("id, teamId, userId, role, status, createdAt, user:User(id, name, callsign, skills, vibe)")
        .in("teamId", teamIds),
      supabase
        .from("Project")
        .select("id, teamId, name, description, videoUrl, repoUrl, demoUrl, submittedAt")
        .in("teamId", teamIds),
    ]);

    const membersByTeam = new Map();
    for (const member of membersResult.data || []) {
      if (!membersByTeam.has(member.teamId)) membersByTeam.set(member.teamId, []);
      membersByTeam.get(member.teamId).push(member);
    }

    const projectByTeam = new Map();
    for (const project of projectsResult.data || []) {
      if (!projectByTeam.has(project.teamId)) projectByTeam.set(project.teamId, project);
    }

    const baseTeams = teamRows.map((team) =>
      transformTeam(
        team,
        membersByTeam.get(team.id) || [],
        projectByTeam.get(team.id),
        null
      )
    );

    // Enrich with pain points per team from Convex
    let painPointsByTeamId = {};
    try {
      painPointsByTeamId = await convexQuery("painPoints:listForTeams", { teamIds }) ?? {};
    } catch { /* non-fatal */ }

    const teams = baseTeams.map((team) => ({
      ...team,
      painPoints: painPointsByTeamId[team.id] ?? [],
    }));

    // All pain points for this event from Convex
    let painPoints = [];
    try {
      painPoints = await convexQuery("painPoints:listForEvent", {
        eventId,
        sortBy: "reactions",
        limit: 100,
      }) ?? [];
    } catch { /* non-fatal */ }

    logDebug(`[getArchivedEvent] event=${eventId} teams=${teams.length} painPoints=${painPoints.length}`);

    return {
      event: {
        id: eventRow.id,
        name: eventRow.title || eventRow.name,
        year: eventRow.year,
        startDate: eventRow.startDate,
        endDate: eventRow.endDate,
        awards: eventRow.awards || {},
      },
      teams,
      painPoints,
    };
  } catch (err) {
    console.error("getArchivedEvent error:", err);
    return { event: null, teams: [], painPoints: [] };
  }
});

// ============================================================================
// AWARDS — set/get for the current event (uses page context like all resolvers)
// ============================================================================

/**
 * Get awards for the current event. Used by Results view.
 */
resolver.define("getEventAwards", async (req) => {
  const supabase = getSupabaseClient();
  try {
    const event = await getCurrentEvent(supabase, req);
    if (!event) return { awards: {} };
    return { awards: event.awards || {} };
  } catch {
    return { awards: {} };
  }
});

/**
 * Set awards for the current event. Admin only.
 * awards shape: { winner: teamId, runnerUp: teamId, thirdPlace: teamId[], peoplesChoice: teamId }
 */
resolver.define("setEventAwards", async (req) => {
  const supabase = getSupabaseClient();
  const callerAccountId = getCallerAccountId(req);
  const caller = await getUserByAccountId(supabase, callerAccountId, "id, role");
  if (!isAdminOrOwner(caller, callerAccountId)) {
    throw new Error("Admin access required");
  }

  const event = await getCurrentEvent(supabase, req);
  if (!event) throw new Error("Event not found");

  const { awards } = req.payload || {};
  if (!awards || typeof awards !== "object") throw new Error("awards object required");

  const { error } = await supabase
    .from("Event")
    .update({ awards })
    .eq("id", event.id);

  if (error) throw new Error(`Failed to save awards: ${error.message}`);
  return { success: true };
});

}
