import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  INVITE_EXPIRY_DAYS,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  getCurrentEvent,
  getUserByAccountId,
  checkAndSendFreeAgentReminders,
  makeId,
  logDebug,
} from "../lib/helpers.js";

export function registerInviteResolvers(resolver) {
/**
 * Get invites for a specific user
 */
resolver.define("getUserInvites", async (req) => {
  const accountId = getCallerAccountId(req);

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

    // Get invites for this user (including expired)
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        team:Team(id, name, description)
      `)
      .eq("userId", user.id)
      .in("status", ["PENDING", "EXPIRED"])
      .order("createdAt", { ascending: false });

    if (invitesError) throw invitesError;

    const now = new Date();
    
    // Check expiration and update expired invites
    const invitesToUpdate = [];
    const transformedInvites = (invites || []).map(invite => {
      const expiresAt = invite.expiresAt ? new Date(invite.expiresAt) : null;
      const isExpired = invite.status === "PENDING" && expiresAt && expiresAt < now;
      
      if (isExpired) {
        invitesToUpdate.push(invite.id);
      }

      return {
        id: invite.id,
        teamId: invite.teamId,
        teamName: invite.team?.name || "Unknown Team",
        teamDescription: invite.team?.description || "",
        message: invite.message || "",
        status: isExpired ? "EXPIRED" : invite.status,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        isExpired,
      };
    });

    // Update expired invites in database
    if (invitesToUpdate.length > 0) {
      await supabase
        .from("TeamInvite")
        .update({ status: "EXPIRED" })
        .in("id", invitesToUpdate);
    }

    return { invites: transformedInvites };
  } catch (error) {
    console.error("getUserInvites error:", error);
    throw new Error(`Failed to get user invites: ${error.message}`);
  }
});

/**
 * Send an invite to a free agent
 */
resolver.define("sendInvite", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, userId, message } = req.payload || {};
  if (!teamId || !userId) {
    throw new Error("teamId and userId are required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find captain by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: captainData, error: captainError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const captain = captainData?.[0];
    if (captainError || !captain) {
      throw new Error("User not found");
    }

    // Verify user is team captain
    const { data: teamMemberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", captain.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    const teamMember = teamMemberData?.[0];

    if (!teamMember) {
      throw new Error("Only team captain can send invites");
    }

    // Check if invite already exists
    const { data: existingInviteData } = await supabase
      .from("TeamInvite")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", userId)
      .eq("status", "PENDING")
      .limit(1);
    const existingInvite = existingInviteData?.[0];

    if (existingInvite) {
      throw new Error("Invite already sent to this user");
    }

    // Create invite with expiration (default 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const { error: inviteError } = await supabase.from("TeamInvite").insert({
      id: makeId("invite"),
      teamId,
      userId,
      message: message || null,
      status: "PENDING",
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });

    if (inviteError) throw inviteError;

    // Get team name for notification
    const { data: teamData } = await supabase
      .from("Team")
      .select("name")
      .eq("id", teamId)
      .limit(1);

    // Create notification for the invited user
    await supabase.from("Notification").insert({
      id: makeId("notif"),
      userId,
      type: "TEAM_INVITE",
      title: "Team Invite Received",
      message: `You've been invited to join ${teamData?.[0]?.name || "a team"}`,
      actionUrl: "marketplace",
    });

    return { success: true };
  } catch (error) {
    console.error("sendInvite error:", error);
    throw new Error(`Failed to send invite: ${error.message}`);
  }
});

/**
 * Respond to an invite (accept or decline)
 */
resolver.define("respondToInvite", async (req) => {
  const accountId = getCallerAccountId(req);
  const { inviteId, accepted } = req.payload || {};
  if (!inviteId || accepted === undefined) {
    throw new Error("inviteId and accepted are required");
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

    // Get the invite
    const { data: inviteData, error: inviteError } = await supabase
      .from("TeamInvite")
      .select("*, team:Team(*)")
      .eq("id", inviteId)
      .eq("userId", user.id)
      .limit(1);

    const invite = inviteData?.[0];
    if (inviteError || !invite) {
      throw new Error("Invite not found");
    }

    if (accepted) {
      // Accept invite
      const { error: updateError } = await supabase
        .from("TeamInvite")
        .update({ status: "ACCEPTED" })
        .eq("id", inviteId);

      if (updateError) throw updateError;

      // Add user to team
      const { error: memberError } = await supabase.from("TeamMember").insert({
        id: makeId("member"),
        teamId: invite.teamId,
        userId: user.id,
        role: "MEMBER",
        status: "ACCEPTED",
        createdAt: new Date().toISOString(),
      });

      if (memberError) throw memberError;

      // Update user to not be free agent
      await supabase.from("User").update({ isFreeAgent: false }).eq("id", user.id);

      // Expire other pending invites for this user
      await supabase
        .from("TeamInvite")
        .update({ status: "EXPIRED" })
        .eq("userId", user.id)
        .eq("status", "PENDING")
        .neq("id", inviteId);

      // Create notification for team captain
      const { data: team } = await supabase
        .from("Team")
        .select("members:TeamMember(userId, role)")
        .eq("id", invite.teamId)
        .limit(1);

      const captain = team?.[0]?.members?.find(m => m.role === "OWNER");
      if (captain) {
        await supabase.from("Notification").insert({
          id: makeId("notif"),
          userId: captain.userId,
          type: "TEAM_INVITE",
          title: "Invite Accepted",
          message: `${user.name || "Someone"} accepted your team invite`,
          actionUrl: `teams?teamId=${invite.teamId}`,
        });
      }
    } else {
      // Decline invite
      const { error: updateError } = await supabase
        .from("TeamInvite")
        .update({ status: "DECLINED" })
        .eq("id", inviteId);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error("respondToInvite error:", error);
    throw new Error(`Failed to respond to invite: ${error.message}`);
  }
});

resolver.define("checkFreeAgentReminders", async (req) => {
  const accountId = getCallerAccountId(req);

  const supabase = getSupabaseClient();
  
  try {
    // Verify user exists
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get current event
    const event = await getCurrentEvent(supabase, req);
    if (!event) {
      return { notified: 0, error: "No current event" };
    }

    // Only check for free agents
    if (!user.isFreeAgent) {
      return { notified: 0, error: null };
    }

    // Check and send reminders
    const result = await checkAndSendFreeAgentReminders(supabase, event.id, event.startDate);
    return result;
  } catch (error) {
    console.error("checkFreeAgentReminders error:", error);
    return { notified: 0, error: error.message };
  }
});

/**
 * Get sent invites for a team (captains only)
 */
resolver.define("getSentInvites", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId } = req.payload || {};
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify user is team captain
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    const { data: teamMemberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    if (!teamMemberData?.[0]) {
      throw new Error("Only team captain can view sent invites");
    }

    // Get all invites for this team
    const { data: invites, error: invitesError } = await supabase
      .from("TeamInvite")
      .select(`
        *,
        user:User(id, name, email)
      `)
      .eq("teamId", teamId)
      .order("createdAt", { ascending: false });

    if (invitesError) throw invitesError;

    const now = new Date();
    
    // Check expiration and update expired invites
    const invitesToUpdate = [];
    const transformedInvites = (invites || []).map(invite => {
      const expiresAt = invite.expiresAt ? new Date(invite.expiresAt) : null;
      const isExpired = invite.status === "PENDING" && expiresAt && expiresAt < now;
      
      if (isExpired) {
        invitesToUpdate.push(invite.id);
      }

      return {
        id: invite.id,
        userId: invite.userId,
        userName: invite.user?.name || "Unknown",
        userEmail: invite.user?.email || "",
        message: invite.message || "",
        status: isExpired ? "EXPIRED" : invite.status,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        isExpired,
      };
    });

    // Update expired invites in database
    if (invitesToUpdate.length > 0) {
      await supabase
        .from("TeamInvite")
        .update({ status: "EXPIRED" })
        .in("id", invitesToUpdate);
    }

    return { invites: transformedInvites };
  } catch (error) {
    console.error("getSentInvites error:", error);
    throw new Error(`Failed to get sent invites: ${error.message}`);
  }
});

/**
 * Resend an invite (for captains)
 */
resolver.define("resendInvite", async (req) => {
  const accountId = getCallerAccountId(req);
  const { inviteId } = req.payload || {};
  if (!inviteId) {
    throw new Error("inviteId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify user is team captain
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get invite
    const { data: inviteData, error: inviteError } = await supabase
      .from("TeamInvite")
      .select("*, team:Team(*)")
      .eq("id", inviteId)
      .limit(1);

    const invite = inviteData?.[0];
    if (inviteError || !invite) {
      throw new Error("Invite not found");
    }

    // Verify user is captain of the team
    const { data: teamMemberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", invite.teamId)
      .eq("userId", user.id)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED")
      .limit(1);

    if (!teamMemberData?.[0]) {
      throw new Error("Only team captain can resend invites");
    }

    // Update expiration to 7 days from now and reset status to PENDING
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from("TeamInvite")
      .update({ 
        status: "PENDING",
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      })
      .eq("id", inviteId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("resendInvite error:", error);
    throw new Error(`Failed to resend invite: ${error.message}`);
  }
});


}
