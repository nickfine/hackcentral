import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  PHASE_MAP,
  OBSERVERS_TEAM_ID,
  HACKDAY_SUBMISSION_PAGE_LINK_TABLE,
  NOTIFICATION_BATCH_SIZE,
  JOIN_REASON_MAX_LENGTH,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  getCurrentEvent,
  getUserByAccountId,
  isAdminOrOwner,
  getStoredNotViableIdeas,
  setStoredNotViableIdeas,
  hydrateTeamDetailFields,
  setStoredTeamDetailFields,
  removeStoredTeamDetailFields,
  hasMissingTable,
  makeId,
  chunkArray,
  logDebug,
} from "../lib/helpers.js";
import { transformTeam } from "../lib/transforms.js";

export function registerTeamResolvers(resolver) {
// TEAMS
// ============================================================================

/**
 * Get all teams for current event
 */
resolver.define("getTeams", async (req) => {
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { teams: [] };
  }

  try {
    const startedAt = Date.now();
    const [teamsQueryResult, notViableIdeas] = await Promise.all([
      supabase
        .from("Team")
        .select("id, eventId, name, description, lookingFor, maxSize, createdAt")
        .eq("eventId", event.id)
        // Include legacy rows where isPublic was never set (null)
        .or("isPublic.eq.true,isPublic.is.null")
        .order("createdAt", { ascending: false }),
      getStoredNotViableIdeas(event.id),
    ]);

    const { data: teams, error: teamsError } = teamsQueryResult;
    if (teamsError) throw teamsError;
    const teamRows = teams || [];
    const filteredTeamRows = teamRows.filter((team) => !notViableIdeas[team.id]);
    if (filteredTeamRows.length === 0) {
      return { teams: [] };
    }

    const teamIds = filteredTeamRows.map((t) => t.id);
    const [membersResult, projectsResult] = await Promise.all([
      supabase
        .from("TeamMember")
        .select(`
          id,
          teamId,
          userId,
          role,
          status,
          createdAt,
          user:User(id, name, callsign, skills, vibe)
        `)
        .in("teamId", teamIds),
      supabase
        .from("Project")
        .select("id, teamId, name, description, videoUrl, repoUrl, demoUrl, submittedAt")
        .in("teamId", teamIds),
    ]);

    if (membersResult.error) throw membersResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const membersByTeam = new Map();
    for (const member of membersResult.data || []) {
      if (!membersByTeam.has(member.teamId)) membersByTeam.set(member.teamId, []);
      membersByTeam.get(member.teamId).push(member);
    }

    const projectByTeam = new Map();
    const projectIds = [];
    for (const project of projectsResult.data || []) {
      if (!projectByTeam.has(project.teamId)) {
        projectByTeam.set(project.teamId, project);
        projectIds.push(project.id);
      }
    }

    let submissionLinksByProjectId = new Map();
    if (projectIds.length > 0) {
      try {
        const { data: linkRows, error: linkError } = await supabase
          .from(HACKDAY_SUBMISSION_PAGE_LINK_TABLE)
          .select("project_id,submission_page_id,submission_page_url,output_page_ids")
          .in("project_id", projectIds);
        if (!linkError) {
          submissionLinksByProjectId = new Map(
            (linkRows || []).map((row) => [row.project_id, row])
          );
        } else if (!hasMissingTable(linkError, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
          throw linkError;
        }
      } catch (linkError) {
        if (!hasMissingTable(linkError, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
          throw linkError;
        }
      }
    }

    const baseTeams = filteredTeamRows.map((team) =>
      transformTeam(
        team,
        membersByTeam.get(team.id) || [],
        projectByTeam.get(team.id),
        projectByTeam.get(team.id) ? submissionLinksByProjectId.get(projectByTeam.get(team.id).id) : null
      )
    );

    // problem/moreInfo are only needed in TeamDetail (getTeam), not the list view.
    // Skipping hydrateTeamDetailFields here removes N storage.get() calls from the hot path.
    logDebug(`[getTeams] event=${event.id} rows=${teamRows.length} ms=${Date.now() - startedAt}`);

    return { teams: baseTeams };
  } catch (error) {
    console.error("getTeams error:", error);
    throw new Error(`Failed to get teams: ${error.message}`);
  }
});

resolver.define("getIdeaSummary", async (req) => {
  const accountId = getCallerAccountId(req);
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { ideas: [] };
  }

  try {
    const caller = await getUserByAccountId(supabase, accountId, "id, role, name, email");
    if (!isAdminOrOwner(caller, accountId)) {
      throw new Error("Admin access required");
    }

    const { data: teamRows, error: teamsError } = await supabase
      .from("Team")
      .select("id, eventId, name, description, lookingFor, maxSize, isPublic, isAutoCreated, createdAt, updatedAt")
      .eq("eventId", event.id)
      .order("createdAt", { ascending: false });

    if (teamsError) throw teamsError;

    const visibleTeams = (teamRows || []).filter((team) => !(team.isAutoCreated && team.id === OBSERVERS_TEAM_ID));
    if (visibleTeams.length === 0) {
      return { ideas: [] };
    }

    const teamIds = visibleTeams.map((team) => team.id);
    const [membersResult, projectsResult, notViableMap] = await Promise.all([
      supabase
        .from("TeamMember")
        .select(`
          id,
          teamId,
          userId,
          role,
          status,
          createdAt,
          user:User(id, name, callsign, vibe)
        `)
        .in("teamId", teamIds),
      supabase
        .from("Project")
        .select("id, teamId, submittedAt")
        .in("teamId", teamIds),
      getStoredNotViableIdeas(event.id),
    ]);

    if (membersResult.error) throw membersResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const membersByTeam = new Map();
    for (const member of membersResult.data || []) {
      if (!membersByTeam.has(member.teamId)) membersByTeam.set(member.teamId, []);
      membersByTeam.get(member.teamId).push(member);
    }

    const projectByTeam = new Map();
    for (const project of projectsResult.data || []) {
      if (!projectByTeam.has(project.teamId)) {
        projectByTeam.set(project.teamId, project);
      }
    }

    const ideas = visibleTeams.map((team) => {
      const teamMembers = membersByTeam.get(team.id) || [];
      const acceptedMembers = teamMembers.filter((member) => member.status === "ACCEPTED");
      const pendingMembers = teamMembers.filter((member) => member.status === "PENDING");
      const ownerMember = acceptedMembers.find((member) => member.role === "OWNER");
      const project = projectByTeam.get(team.id);
      const notViableMeta = notViableMap[team.id] || null;

      return {
        id: team.id,
        name: team.name || "",
        description: team.description || "",
        captainName: ownerMember?.user?.name || "Unassigned",
        memberCount: acceptedMembers.length,
        pendingCount: pendingMembers.length,
        maxMembers: Number(team.maxSize) || 5, // API: Transform DB `maxSize` → API `maxMembers`
        lookingFor: team.lookingFor ? team.lookingFor.split(",").map((value) => value.trim()).filter(Boolean) : [],
        createdAt: team.createdAt || null,
        updatedAt: team.updatedAt || null,
        submissionStatus: project?.submittedAt ? "submitted" : "not_submitted",
        isPublic: team.isPublic !== false,
        viabilityStatus: notViableMeta ? "not_viable" : "viable",
        notViableMeta,
      };
    });

    return { ideas };
  } catch (error) {
    console.error("getIdeaSummary error:", error);
    throw new Error(`Failed to get idea summary: ${error.message}`);
  }
});

resolver.define("markIdeaNotViable", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, reason } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const normalizedReason = typeof reason === "string" ? reason.trim().slice(0, JOIN_REASON_MAX_LENGTH) : "";
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    throw new Error("No current event found");
  }

  try {
    const caller = await getUserByAccountId(supabase, accountId, "id, role, name, email");
    if (!isAdminOrOwner(caller, accountId)) {
      throw new Error("Admin access required");
    }

    const { data: teamData, error: teamError } = await supabase
      .from("Team")
      .select("id, eventId, name, isAutoCreated")
      .eq("id", teamId)
      .eq("eventId", event.id)
      .limit(1);

    if (teamError) throw teamError;
    const team = teamData?.[0];
    if (!team) {
      throw new Error("Idea not found");
    }
    if (team.isAutoCreated && team.id === OBSERVERS_TEAM_ID) {
      throw new Error("Observers team cannot be marked not viable");
    }

    const notViableMap = await getStoredNotViableIdeas(event.id);
    if (notViableMap[teamId]) {
      return { success: true, alreadyNotViable: true, teamId };
    }

    const { data: teamMembers, error: membersError } = await supabase
      .from("TeamMember")
      .select("id, userId")
      .eq("teamId", teamId);
    if (membersError) throw membersError;

    const memberRows = teamMembers || [];
    const memberIds = memberRows.map((row) => row.id);
    const userIds = Array.from(new Set(memberRows.map((row) => row.userId).filter(Boolean)));

    if (userIds.length > 0) {
      const { error: freeAgentUpdateError } = await supabase
        .from("User")
        .update({
          isFreeAgent: true,
          updatedAt: new Date().toISOString(),
        })
        .in("id", userIds);

      if (freeAgentUpdateError) throw freeAgentUpdateError;
    }

    if (memberIds.length > 0) {
      const { error: deleteMemberError } = await supabase
        .from("TeamMember")
        .delete()
        .in("id", memberIds);
      if (deleteMemberError) throw deleteMemberError;
    }

    const { error: updateTeamError } = await supabase
      .from("Team")
      .update({
        isPublic: false,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", teamId);
    if (updateTeamError) throw updateTeamError;

    const nowIso = new Date().toISOString();
    if (userIds.length > 0) {
      const notifications = userIds.map((userId) => ({
        id: makeId("notif"),
        userId,
        type: "IDEA_NOT_VIABLE",
        title: "Idea marked not viable",
        message: normalizedReason
          ? `Your idea "${team.name}" was marked not viable. ${normalizedReason}. You are now a free agent.`
          : `Your idea "${team.name}" was marked not viable because it is already being worked on. You are now a free agent.`,
        actionUrl: "marketplace",
        createdAt: nowIso,
      }));

      for (const batch of chunkArray(notifications, NOTIFICATION_BATCH_SIZE)) {
        const { error: notificationError } = await supabase
          .from("Notification")
          .insert(batch);
        if (notificationError) {
          console.warn("Failed to notify one or more users about not-viable idea:", notificationError.message);
        }
      }
    }

    notViableMap[teamId] = {
      teamId,
      teamName: team.name || "",
      markedAt: nowIso,
      markedByAccountId: accountId,
      reason: normalizedReason,
    };
    await setStoredNotViableIdeas(event.id, notViableMap);

    return {
      success: true,
      teamId,
      markedAt: nowIso,
      releasedMemberCount: userIds.length,
    };
  } catch (error) {
    console.error("markIdeaNotViable error:", error);
    throw new Error(`Failed to mark idea not viable: ${error.message}`);
  }
});

/**
 * Get a single team by ID with full details
 */
resolver.define("getTeam", async (req) => {
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Fetch team, members, and project in parallel
    const [teamResult, membersResult, projectResult] = await Promise.all([
      supabase.from("Team").select("*").eq("id", teamId).limit(1),
      supabase.from("TeamMember").select(`*, user:User(*)`).eq("teamId", teamId),
      supabase.from("Project").select("*").eq("teamId", teamId).limit(1),
    ]);

    const { data: teamData, error: teamError } = teamResult;
    const team = teamData?.[0];
    if (teamError || !team) {
      throw new Error("Team not found");
    }

    const members = membersResult.data;
    const projectRow = projectResult.data?.[0];
    let submissionLinkRow = null;
    if (projectRow?.id) {
      try {
        const { data: linkRows, error: linkError } = await supabase
          .from(HACKDAY_SUBMISSION_PAGE_LINK_TABLE)
          .select("project_id,submission_page_id,submission_page_url,output_page_ids")
          .eq("project_id", projectRow.id)
          .limit(1);
        if (!linkError) {
          submissionLinkRow = linkRows?.[0] || null;
        } else if (!hasMissingTable(linkError, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
          throw linkError;
        }
      } catch (linkError) {
        if (!hasMissingTable(linkError, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
          throw linkError;
        }
      }
    }

    // Transform team with full member set (accepted + pending).
    const transformedTeam = await hydrateTeamDetailFields(
      transformTeam(team, members || [], projectRow, submissionLinkRow)
    );

    return { team: transformedTeam };
  } catch (error) {
    console.error("getTeam error:", error);
    throw new Error(`Failed to get team: ${error.message}`);
  }
});

/**
 * Update team details (captain only)
 */
resolver.define("updateTeam", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, updates } = req.payload || {};
  if (!teamId || !updates) {
    throw new Error("teamId and updates are required");
  }

  const supabase = getSupabaseClient();
  let didTransferCaptain = false;

  try {
    // Find user by Atlassian ID
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Verify user is team captain
    const { data: captainData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const captain = captainData?.[0];
    if (!captain) {
      throw new Error("Only team captain can update team details");
    }

    // Handle captain transfer separately
    if (updates.captainId && updates.captainId !== user.id) {
      // Verify new captain is a team member
      const { data: newCaptainMember } = await supabase
        .from("TeamMember")
        .select("*")
        .eq("teamId", teamId)
        .eq("userId", updates.captainId)
        .eq("status", "ACCEPTED")
        .limit(1);

      if (!newCaptainMember?.[0]) {
        throw new Error("New captain must be an existing team member");
      }

      // Demote current captain to MEMBER
      await supabase
        .from("TeamMember")
        .update({ role: "MEMBER" })
        .eq("id", captain.id);

      // Promote new captain to OWNER
      await supabase
        .from("TeamMember")
        .update({ role: "OWNER" })
        .eq("id", newCaptainMember[0].id);
      didTransferCaptain = true;

      // Remove captainId from updates to avoid setting it on Team table
      delete updates.captainId;
    }

    const teamDetailFieldUpdates = {};
    if (Object.prototype.hasOwnProperty.call(updates, "problem")) {
      teamDetailFieldUpdates.problem = typeof updates.problem === "string" ? updates.problem : "";
    }
    if (Object.prototype.hasOwnProperty.call(updates, "moreInfo")) {
      teamDetailFieldUpdates.moreInfo = typeof updates.moreInfo === "string" ? updates.moreInfo : "";
    }

    // Build update object for Team table (DB-native fields only)
    const teamUpdates = {};
    if (updates.name !== undefined) teamUpdates.name = updates.name;
    if (updates.description !== undefined) teamUpdates.description = updates.description;
    if (updates.lookingFor !== undefined) {
      teamUpdates.lookingFor = Array.isArray(updates.lookingFor)
        ? updates.lookingFor.join(", ")
        : updates.lookingFor;
    }
    if (updates.maxMembers !== undefined) {
      const newMax = Number(updates.maxMembers);
      // Validate max size is between 2 and 5
      if (newMax >= 2 && newMax <= 5) {
        teamUpdates.maxSize = newMax; // API: Transform API `maxMembers` → DB `maxSize`
      }
    }
    teamUpdates.updatedAt = new Date().toISOString();

    // Update team if there are changes
    if (Object.keys(teamUpdates).length > 1) {
      const { error: updateError } = await supabase
        .from("Team")
        .update(teamUpdates)
        .eq("id", teamId);

      if (updateError) throw updateError;
    }

    // Persist problem/moreInfo in Forge storage for schema compatibility.
    if (Object.keys(teamDetailFieldUpdates).length > 0) {
      await setStoredTeamDetailFields(teamId, teamDetailFieldUpdates);
    }

    const hasOnlyTeamDetailFieldUpdates =
      Object.keys(teamUpdates).length === 1 &&
      Object.keys(teamDetailFieldUpdates).length > 0 &&
      !didTransferCaptain;
    if (hasOnlyTeamDetailFieldUpdates) {
      return {
        success: true,
        teamId,
      };
    }

    // Fetch and return updated team
    const { data: updatedTeamData } = await supabase
      .from("Team")
      .select("*")
      .eq("id", teamId)
      .limit(1);

    const { data: members } = await supabase
      .from("TeamMember")
      .select(`*, user:User(*)`)
      .eq("teamId", teamId);

    const { data: projectData } = await supabase
      .from("Project")
      .select("*")
      .eq("teamId", teamId)
      .limit(1);
    const project = projectData?.[0];
    let submissionLinkRow = null;
    if (project?.id) {
      try {
        const { data: linkRows, error: linkError } = await supabase
          .from(HACKDAY_SUBMISSION_PAGE_LINK_TABLE)
          .select("project_id,submission_page_id,submission_page_url,output_page_ids")
          .eq("project_id", project.id)
          .limit(1);
        if (!linkError) {
          submissionLinkRow = linkRows?.[0] || null;
        } else if (!hasMissingTable(linkError, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
          throw linkError;
        }
      } catch (linkError) {
        if (!hasMissingTable(linkError, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
          throw linkError;
        }
      }
    }

    return {
      team: await hydrateTeamDetailFields(
        transformTeam(updatedTeamData?.[0], members || [], project, submissionLinkRow)
      ),
    };
  } catch (error) {
    console.error("updateTeam error:", error);
    throw new Error(`Failed to update team: ${error.message}`);
  }
});

/**
 * Create a new team
 */
resolver.define("createTeam", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamData } = req.payload || {};
  if (!teamData) {
    throw new Error("teamData is required");
  }

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    throw new Error("No current event found");
  }

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

    const teamId = makeId("team");

    // Get trackSide from user or default to HUMAN
    const trackSide = user.trackSide || "HUMAN";

    // Create team
    const { error: teamError } = await supabase.from("Team").insert({
      id: teamId,
      eventId: event.id,
      name: teamData.name,
      description: teamData.description || "",
      lookingFor: teamData.lookingFor?.join(", ") || "",
      maxSize: teamData.maxMembers || 5, // API: Transform API `maxMembers` → DB `maxSize`
      trackSide: trackSide,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (teamError) throw teamError;

    // Add creator as owner
    const { error: memberError } = await supabase.from("TeamMember").insert({
      id: makeId("member"),
      teamId,
      userId: user.id,
      role: "OWNER",
      status: "ACCEPTED",
      createdAt: new Date().toISOString(),
    });

    if (memberError) throw memberError;

    // Update user to not be free agent
    await supabase.from("User").update({ isFreeAgent: false }).eq("id", user.id);

    return { teamId, eventId: event.id };
  } catch (error) {
    console.error("createTeam error:", error);
    throw new Error(`Failed to create team: ${error.message}`);
  }
});

/**
 * Request to join a team
 */
resolver.define("requestToJoin", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, message } = req.payload || {};
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

    // Prevent duplicate requests / membership rows
    const { data: existingMemberData, error: existingMemberError } = await supabase
      .from("TeamMember")
      .select("id, status")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .limit(1);

    if (existingMemberError) throw existingMemberError;

    const existingMember = existingMemberData?.[0];
    if (existingMember) {
      if (existingMember.status === "ACCEPTED") {
        throw new Error("Already a member of this team");
      }
      if (existingMember.status === "PENDING") {
        throw new Error("Join request already pending");
      }
    }

    // Check team capacity before creating request
    const { data: teamData, error: teamError } = await supabase
      .from("Team")
      .select("id, maxSize")
      .eq("id", teamId)
      .limit(1);

    if (teamError) throw teamError;

    const team = teamData?.[0];
    if (!team) {
      throw new Error("Team not found");
    }

    // Count current accepted members
    const { data: currentMembers, error: membersError } = await supabase
      .from("TeamMember")
      .select("id")
      .eq("teamId", teamId)
      .eq("status", "ACCEPTED");

    if (membersError) throw membersError;

    const currentMemberCount = currentMembers?.length || 0;
    const maxSize = team.maxSize || 5;

    if (currentMemberCount >= maxSize) {
      throw new Error("Team is already at maximum capacity");
    }

    // Create join request
    const { error: joinError } = await supabase.from("TeamMember").insert({
      id: makeId("member"),
      teamId,
      userId: user.id,
      role: "MEMBER",
      status: "PENDING",
      message: message?.trim() || null,
      createdAt: new Date().toISOString(),
    });

    if (joinError) throw joinError;

    // Create notification for team captain
    const { data: teamInfo } = await supabase
      .from("Team")
      .select("members:TeamMember(userId, role)")
      .eq("id", teamId)
      .limit(1);

    const captain = teamInfo?.[0]?.members?.find(m => m.role === "OWNER");
    if (captain) {
      await supabase.from("Notification").insert({
        id: makeId("notif"),
        userId: captain.userId,
        type: "JOIN_REQUEST",
        title: "Join Request Received",
        message: `${user.name || "Someone"} wants to join your team`,
        actionUrl: `teams?teamId=${teamId}`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("requestToJoin error:", error);
    throw new Error(`Failed to request join: ${error.message}`);
  }
});

/**
 * Handle join request (accept/decline)
 */
resolver.define("handleJoinRequest", async (req) => {
  const accountId = getCallerAccountId(req);
  const { requestId, accepted } = req.payload || {};
  if (!requestId || accepted === undefined) {
    throw new Error("requestId and accepted are required");
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

    // Get the request
    const { data: requestData, error: requestError } = await supabase
      .from("TeamMember")
      .select("*, team:Team(*)")
      .eq("id", requestId)
      .limit(1);

    const request = requestData?.[0];
    if (requestError || !request) {
      throw new Error("Join request not found");
    }

    // Verify user is team captain
    const { data: captainData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", request.teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const captain = captainData?.[0];

    if (!captain) {
      throw new Error("Only team captain can handle join requests");
    }

    if (accepted) {
      // Check if team is already at maximum capacity
      const { data: currentMembers } = await supabase
        .from("TeamMember")
        .select("id")
        .eq("teamId", request.teamId)
        .eq("status", "ACCEPTED");

      const currentMemberCount = currentMembers?.length || 0;
      const maxSize = request.team?.maxSize || 5;

      if (currentMemberCount >= maxSize) {
        throw new Error("Team is already at maximum capacity");
      }

      // Accept request
      const { error: updateError } = await supabase
        .from("TeamMember")
        .update({ status: "ACCEPTED" })
        .eq("id", requestId);

      if (updateError) throw updateError;

        // Update user to not be free agent
        await supabase.from("User").update({ isFreeAgent: false }).eq("id", request.userId);

        // Create notification for the user who was accepted
        await supabase.from("Notification").insert({
          id: makeId("notif"),
          userId: request.userId,
          type: "JOIN_REQUEST",
          title: "Join Request Accepted",
          message: "Your request to join the team has been accepted",
          actionUrl: "teams",
        });
      } else {
      // Reject request - delete it
      const { error: deleteError } = await supabase.from("TeamMember").delete().eq("id", requestId);
      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error("handleJoinRequest error:", error);
    throw new Error(`Failed to handle join request: ${error.message}`);
  }
});

/**
 * Leave a team
 */
resolver.define("leaveTeam", async (req) => {
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

    // Remove from team
    const { error: leaveError } = await supabase
      .from("TeamMember")
      .delete()
      .eq("teamId", teamId)
      .eq("userId", user.id);

    if (leaveError) throw leaveError;

    // Update user to be free agent
    await supabase.from("User").update({ isFreeAgent: true }).eq("id", user.id);

    return { success: true };
  } catch (error) {
    console.error("leaveTeam error:", error);
    throw new Error(`Failed to leave team: ${error.message}`);
  }
});

/**
 * Delete a team (captain only)
 */
resolver.define("deleteTeam", async (req) => {
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

    // Verify user is team captain
    const { data: captainData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const captain = captainData?.[0];
    const isAdmin = isAdminOrOwner(user, accountId);

    if (!captain && !isAdmin) {
      throw new Error("Only team captain can delete team");
    }

    // Allow delete (disband) only until the hack starts; once hacking or later, block.
    // Admins can delete teams at any phase.
    if (!isAdmin) {
      const event = await getCurrentEvent(supabase, req);
      if (!event) {
        throw new Error("No current event found");
      }
      const appPhase = PHASE_MAP[event.phase] || "signup";
      const canDeleteByPhase = appPhase === "signup" || appPhase === "team_formation";
      if (!canDeleteByPhase) {
        throw new Error("Teams cannot be deleted once the hack has started. Contact an admin if you need to disband.");
      }
    }

    // Resolve team members up-front so we can safely free them after deletion.
    const { data: memberRows, error: memberLookupError } = await supabase
      .from("TeamMember")
      .select("userId")
      .eq("teamId", teamId);
    if (memberLookupError) throw memberLookupError;

    // Remove dependent rows first; do not rely on DB-level cascade behavior.
    const { error: inviteDeleteError } = await supabase
      .from("TeamInvite")
      .delete()
      .eq("teamId", teamId);
    if (inviteDeleteError) throw inviteDeleteError;

    const { error: projectDeleteError } = await supabase
      .from("Project")
      .delete()
      .eq("teamId", teamId);
    if (projectDeleteError) throw projectDeleteError;

    const { error: memberDeleteError } = await supabase
      .from("TeamMember")
      .delete()
      .eq("teamId", teamId);
    if (memberDeleteError) throw memberDeleteError;

    const { error: deleteError } = await supabase
      .from("Team")
      .delete()
      .eq("id", teamId);
    if (deleteError) throw deleteError;
    await removeStoredTeamDetailFields(teamId);

    const memberIds = Array.from(
      new Set((memberRows || []).map((row) => row.userId).filter(Boolean))
    );
    if (memberIds.length > 0) {
      const { error: freeAgentError } = await supabase
        .from("User")
        .update({ isFreeAgent: true, updatedAt: new Date().toISOString() })
        .in("id", memberIds);
      if (freeAgentError) throw freeAgentError;
    }

    return { success: true };
  } catch (error) {
    console.error("deleteTeam error:", error);
    throw new Error(`Failed to delete team: ${error.message}`);
  }
});

// ============================================================================
// TEAM INVITES
// ============================================================================

/**
 * Get free agents (users who are not on a team)
 */
resolver.define("getFreeAgents", async (req) => {
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { freeAgents: [] };
  }

  try {
    // Get all free agents
    const { data: freeAgents, error } = await supabase
      .from("User")
      .select("*")
      .eq("isFreeAgent", true)
      .eq("role", "USER")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    // Get pending invites for these users
    const userIds = (freeAgents || []).map(u => u.id);
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        team:Team(id, name)
      `)
      .in("userId", userIds)
      .eq("status", "PENDING");

    if (invitesError) throw invitesError;

    // Group invites by userId
    const invitesByUser = {};
    (invites || []).forEach(invite => {
      if (!invitesByUser[invite.userId]) {
        invitesByUser[invite.userId] = [];
      }
      invitesByUser[invite.userId].push({
        id: invite.id,
        teamId: invite.teamId,
        teamName: invite.team?.name || "Unknown Team",
        message: invite.message || "",
        createdAt: invite.createdAt,
      });
    });

    // Transform to Forge format
    const transformedAgents = (freeAgents || []).map(user => ({
      id: user.id,
      accountId: user.atlassian_account_id,
      name: user.name || "Unknown",
      email: user.email,
      skills: user.skills ? user.skills.split(",").map(s => s.trim()) : [],
      invites: invitesByUser[user.id] || [],
    }));

    return { freeAgents: transformedAgents };
  } catch (error) {
    console.error("getFreeAgents error:", error);
    throw new Error(`Failed to get free agents: ${error.message}`);
  }
});


}
