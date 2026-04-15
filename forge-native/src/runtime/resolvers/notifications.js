import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  getCallerAccountId,
  getCurrentEvent,
  getUserByAccountId,
  makeId,
} from "../lib/helpers.js";

export function registerNotificationResolvers(resolver) {
/**
 * Get user notifications
 */
resolver.define("getUserNotifications", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { data: notifications, error: notificationsError } = await supabase
      .from("Notification")
      .select("id, userId, type, title, message, actionUrl, read, createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (notificationsError) throw notificationsError;

    const unreadCount = (notifications || []).filter(n => !n.read).length;

    return { notifications: notifications || [], unreadCount, error: null };
  } catch (error) {
    console.error("getUserNotifications error:", error);
    return { notifications: [], unreadCount: 0, error: error.message };
  }
});

/**
 * Mark notification as read
 */
resolver.define("markNotificationAsRead", async (req) => {
  const accountId = getCallerAccountId(req);
  const { notificationId } = req.payload || {};
  if (!notificationId) {
    throw new Error("notificationId is required");
  }

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { error: updateError } = await supabase
      .from("Notification")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("userId", user.id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("markNotificationAsRead error:", error);
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
});

/**
 * Mark all notifications as read
 */
resolver.define("markAllNotificationsAsRead", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { error: updateError } = await supabase
      .from("Notification")
      .update({ read: true })
      .eq("userId", user.id)
      .eq("read", false);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error);
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
});

/**
 * Get activity feed (recent team joins, team creations, project submissions)
 */
resolver.define("getActivityFeed", async (req) => {
  try {
    const supabase = getSupabaseClient();
    const limit = req.payload?.limit || 20;
    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      return { activities: [], error: null };
    }

    const [teamsResult, joinsResult, projectsResult] = await Promise.all([
      supabase
        .from("Team")
        .select(`
          id,
          name,
          createdAt,
          members:TeamMember!inner(userId, user:User(id, name))
        `)
        .eq("eventId", event.id)
        .or("isPublic.eq.true,isPublic.is.null")
        .order("createdAt", { ascending: false })
        .limit(limit),
      supabase
        .from("TeamMember")
        .select(`
          id,
          userId,
          teamId,
          createdAt,
          user:User(id, name),
          team:Team!inner(id, name, eventId)
        `)
        .eq("status", "ACCEPTED")
        .eq("team.eventId", event.id)
        .order("createdAt", { ascending: false })
        .limit(limit),
      supabase
        .from("Project")
        .select(`
          id,
          name,
          submittedAt,
          teamId,
          team:Team!inner(id, name, eventId)
        `)
        .not("submittedAt", "is", null)
        .eq("team.eventId", event.id)
        .order("submittedAt", { ascending: false })
        .limit(limit),
    ]);

    if (teamsResult.error) throw teamsResult.error;
    if (joinsResult.error) throw joinsResult.error;
    if (projectsResult.error) throw projectsResult.error;

    const recentTeams = teamsResult.data || [];
    const recentJoins = joinsResult.data || [];
    const recentProjects = projectsResult.data || [];

    // Format activities
    const teamActivities = (recentTeams || []).map(team => {
      const creator = team.members?.find(m => m.user)?.user;
      return {
        id: `team-${team.id}`,
        type: "create",
        teamId: team.id,
        user: creator?.name || "Unknown",
        team: team.name,
        time: team.createdAt,
      };
    });

    const joinActivities = (recentJoins || []).map(member => ({
      id: `join-${member.id}`,
      type: "join",
      teamId: member.team?.id || member.teamId || null,
      user: member.user?.name || "Unknown",
      team: member.team?.name || "Unknown Team",
      time: member.createdAt,
    }));

    const projectActivities = (recentProjects || []).map(project => ({
      id: `project-${project.id}`,
      type: "submit",
      teamId: project.team?.id || project.teamId || null,
      projectId: project.id,
      user: project.team?.name || "Unknown Team",
      team: project.team?.name || "Unknown Team",
      project: project.name,
      time: project.submittedAt,
    }));

    // Combine and sort by time
    const allActivities = [...teamActivities, ...joinActivities, ...projectActivities]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, limit);

    return { activities: allActivities, error: null };
  } catch (error) {
    console.error("getActivityFeed error:", error);
    return { activities: [], error: error.message };
  }
});


}
