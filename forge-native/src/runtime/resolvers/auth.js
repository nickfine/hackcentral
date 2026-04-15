import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  ROLE_MAP,
  REVERSE_ROLE_MAP,
  HACKDAY_OWNER_TITLE,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  fetchUserProfile,
  getCurrentEvent,
  getUserByAccountId,
  isAdminOrOwner,
  isHackdayOwnerIdentity,
  makeId,
} from "../lib/helpers.js";
import { transformUser } from "../lib/transforms.js";

export function registerAuthResolvers(resolver) {
// USER IDENTITY & REGISTRATION
// ============================================================================

/**
 * Get user profile from Confluence API
 * Returns email if user's privacy settings allow
 */
resolver.define("getUserProfile", async (req) => {
  const accountId = getCallerAccountId(req);
  return fetchUserProfile(accountId);
});

/**
 * Get current user from Forge context
 * Links/creates Supabase user automatically and returns user data with isNewUser flag
 */
resolver.define("getCurrentUser", async (req) => {
  // Get accountId from Forge context
  const accountId = req.context?.accountId;
  if (!accountId) {
    throw new Error("No accountId in Forge context");
  }

  const supabase = getSupabaseClient();

  // Fire event lookup + user-by-atlassian-id in parallel (both independent, both fast).
  const [event, { data: existingUserByAtlassianIdData }] = await Promise.all([
    getCurrentEvent(supabase, req),
    supabase.from("User").select("*").eq("atlassian_account_id", accountId).limit(1),
  ]);

  try {
    const existingUserByAtlassianId = existingUserByAtlassianIdData?.[0];

    // Fast path: user found with complete profile — skip Confluence API entirely.
    if (existingUserByAtlassianId?.email && existingUserByAtlassianId?.name) {
      const existingUser = existingUserByAtlassianId;
      const email = existingUser.email;
      const displayName = existingUser.name;

      // Ensure user is registered for current event
      if (event) {
        const { data: registrationData } = await supabase
          .from("EventRegistration")
          .select("id")
          .eq("eventId", event.id)
          .eq("userId", existingUser.id)
          .limit(1);
        if (!registrationData?.[0]) {
          await supabase.from("EventRegistration").insert({
            id: makeId("reg"),
            eventId: event.id,
            userId: existingUser.id,
          });
        }
      }

      const user = transformUser(existingUser);
      const isNewUser = !existingUser.skills;
      const isHackdayOwner = isHackdayOwnerIdentity({ email, accountId, displayName });
      return {
        ...user,
        isHackdayOwner,
        ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
        isNewUser,
      };
    }

    // Slow path: need Confluence API for missing email/name or to find user by email.
    const profile = await fetchUserProfile(accountId);
    const email = profile?.email || `${accountId}@atlassian.local`;
    const displayName = profile?.displayName || email.split("@")[0];

    // If found by atlassian_id but missing email/name, backfill and return.
    if (existingUserByAtlassianId) {
      const realEmail = profile?.email ? email : null;
      const needsUpdate = !existingUserByAtlassianId.email && realEmail;
      if (needsUpdate) {
        await supabase
          .from("User")
          .update({ email: realEmail, updatedAt: new Date().toISOString() })
          .eq("id", existingUserByAtlassianId.id);
      }

      if (event) {
        const { data: registrationData } = await supabase
          .from("EventRegistration")
          .select("id")
          .eq("eventId", event.id)
          .eq("userId", existingUserByAtlassianId.id)
          .limit(1);
        if (!registrationData?.[0]) {
          await supabase.from("EventRegistration").insert({
            id: makeId("reg"),
            eventId: event.id,
            userId: existingUserByAtlassianId.id,
          });
        }
      }

      const user = transformUser(existingUserByAtlassianId);
      const isNewUser = !existingUserByAtlassianId.name ||
                        existingUserByAtlassianId.name === email.split("@")[0] ||
                        !existingUserByAtlassianId.skills;
      const isHackdayOwner = isHackdayOwnerIdentity({ email, accountId, displayName });
      return {
        ...user,
        isHackdayOwner,
        ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
        isNewUser,
      };
    }

    // Not found by atlassian_id — try email lookup.
    const { data: existingUserByEmailData } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .limit(1);

    const existingUser = existingUserByEmailData?.[0];

    if (existingUser) {
      // User exists - link Atlassian ID and/or backfill email if missing
      const updateFields = { atlassian_account_id: accountId, updatedAt: new Date().toISOString() };
      if (!existingUser.email && profile?.email) updateFields.email = email;
      await supabase
        .from("User")
        .update(updateFields)
        .eq("id", existingUser.id);

      // Ensure user is registered for current event
      if (event) {
        const { data: registrationData } = await supabase
          .from("EventRegistration")
          .select("id")
          .eq("eventId", event.id)
          .eq("userId", existingUser.id)
          .limit(1);
        if (!registrationData?.[0]) {
          await supabase.from("EventRegistration").insert({
            id: makeId("reg"),
            eventId: event.id,
            userId: existingUser.id,
          });
        }
      }

      const user = transformUser(existingUser);
      const isNewUser = !existingUser.name ||
                        existingUser.name === email.split("@")[0] ||
                        !existingUser.skills;
      const isHackdayOwner = isHackdayOwnerIdentity({ email, accountId, displayName });
      return {
        ...user,
        isHackdayOwner,
        ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
        isNewUser,
      };
    } else {
      // Create new user
      const newUser = {
        id: makeId("user"),
        email,
        name: displayName,
        atlassian_account_id: accountId,
        role: "USER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: createdUserData, error: createError } = await supabase
        .from("User")
        .insert(newUser)
        .select();

      if (createError) throw createError;

      const user = createdUserData?.[0] || newUser;

      // Register for event if exists
      if (event && user.id) {
        await supabase.from("EventRegistration").insert({
          id: makeId("reg"),
          eventId: event.id,
          userId: user.id,
        });
      }

      const transformedUser = transformUser(user);
      const isHackdayOwner = isHackdayOwnerIdentity({ email, accountId, displayName });
      return {
        ...transformedUser,
        isHackdayOwner,
        ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
        isNewUser: true,
      };
    }
  } catch (error) {
    console.error("getCurrentUser error:", error);
    throw new Error(`Failed to get current user: ${error.message}`);
  }
});

/**
 * Link Atlassian account to Supabase user or create new user
 * Will attempt to fetch actual email from Confluence API if not provided
 */
resolver.define("linkOrCreateUser", async (req) => {
  const accountId = getCallerAccountId(req);
  let { email, displayName } = req.payload || {};
  
  // If email looks like a fallback, try to get real email from Confluence
  if (!email || email.endsWith('@atlassian.local')) {
    const profile = await fetchUserProfile(accountId);
    if (profile?.email) {
      email = profile.email;
      displayName = displayName || profile.displayName;
    } else if (!email) {
      // Use accountId-based email as last resort
      email = `${accountId}@atlassian.local`;
    }
  }

  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  // Note: We continue even if no event is found - user can be created/linked without event

  try {
    // Try to find user by email or Atlassian ID
    const { data: existingUserByEmailData, error: emailError } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .limit(1);
    const existingUserByEmail = existingUserByEmailData?.[0];
    
    if (emailError) {
      console.error("[linkOrCreateUser] Error querying by email:", emailError);
      throw new Error(`Failed to query user by email: ${emailError.message}`);
    }
    
    const { data: existingUserByAtlassianIdData, error: atlassianError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);
    const existingUserByAtlassianId = existingUserByAtlassianIdData?.[0];
    
    if (atlassianError) {
      console.error("[linkOrCreateUser] Error querying by Atlassian ID:", atlassianError);
      throw new Error(`Failed to query user by Atlassian ID: ${atlassianError.message}`);
    }

    const existingUser = existingUserByEmail || existingUserByAtlassianId;

    if (existingUser) {
      // User exists - link/update Atlassian ID if needed
      const updates = {};
      if (!existingUser.atlassian_account_id) {
        updates.atlassian_account_id = accountId;
      }
      if (displayName && !existingUser.name) {
        updates.name = displayName;
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("User")
          .update(updates)
          .eq("id", existingUser.id);

        if (updateError) throw updateError;
      }

      // Register for event if event exists and user not already registered
      if (event) {
        const { data: registrationData } = await supabase
          .from("EventRegistration")
          .select("*")
          .eq("eventId", event.id)
          .eq("userId", existingUser.id)
          .limit(1);
        const registration = registrationData?.[0];

        if (!registration) {
          const { error: regError } = await supabase.from("EventRegistration").insert({
            id: makeId("reg"),
            eventId: event.id,
            userId: existingUser.id,
          });
          if (regError) {
            console.error("Failed to create event registration for existing user:", regError.message);
            return { user: transformUser({ ...existingUser, ...updates }), warning: "Profile saved but event registration failed." };
          }
        }
      }

      return { user: transformUser({ ...existingUser, ...updates }) };
    } else {
      // Create new user
      const newUser = {
        id: makeId("user"),
        email,
        name: displayName || email.split("@")[0],
        atlassian_account_id: accountId,
        role: "USER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: createdUserData, error: createError } = await supabase
        .from("User")
        .insert(newUser)
        .select();

      if (createError) throw createError;

      // Use createdUser if returned (as array), otherwise fall back to newUser
      const user = createdUserData?.[0] || newUser;

      if (event && user && user.id) {
        const { error: regError } = await supabase.from("EventRegistration").insert({
          id: makeId("reg"),
          eventId: event.id,
          userId: user.id,
        });
        if (regError) {
          console.error("Failed to create event registration for new user:", regError.message);
          return { user: transformUser(user), warning: "Profile created but event registration failed." };
        }
      }

      return { user: transformUser(user) };
    }
  } catch (error) {
    console.error("linkOrCreateUser error:", error);
    throw new Error(`Failed to link/create user: ${error.message}`);
  }
});

/**
 * Get all registrations for current event
 */
resolver.define("getRegistrations", async (req) => {
  const supabase = getSupabaseClient();
  const event = await getCurrentEvent(supabase, req);
  if (!event) {
    return { registrations: [] };
  }

  try {
    const { data: registrations, error } = await supabase
      .from("EventRegistration")
      .select(`
        *,
        user:User(*)
      `)
      .eq("eventId", event.id);

    if (error) throw error;

    return {
      registrations: (registrations || []).map((reg) => transformUser(reg.user)),
    };
  } catch (error) {
    console.error("getRegistrations error:", error);
    throw new Error(`Failed to get registrations: ${error.message}`);
  }
});

/**
 * Update user registration (skills, callsign, etc.)
 */
resolver.define("updateRegistration", async (req) => {
  const accountId = getCallerAccountId(req);
  const { updates } = req.payload || {};
  if (!updates) {
    throw new Error("updates is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Find user by Atlassian ID (use limit(1) for custom fetch compatibility)
    const { data: userData, error: findError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (findError || !user) {
      throw new Error("User not found");
    }

    // Prepare update object
    const dbUpdates = {
      updatedAt: new Date().toISOString(),
    };

    const nextName = updates.name ?? updates.displayName;
    if (nextName !== undefined) dbUpdates.name = nextName;
    if (updates.callsign !== undefined) dbUpdates.callsign = updates.callsign;
    if (updates.skills !== undefined) {
      if (Array.isArray(updates.skills)) {
        dbUpdates.skills = updates.skills.join(", ");
      } else if (typeof updates.skills === "string") {
        dbUpdates.skills = updates.skills;
      }
    }
    if (updates.role) {
      dbUpdates.role = REVERSE_ROLE_MAP[updates.role] || "USER";
    }
    if (updates.bio !== undefined) {
      dbUpdates.bio = updates.bio;
    }
    if (updates.isFreeAgent !== undefined) {
      dbUpdates.isFreeAgent = !!updates.isFreeAgent;
    }

    const { data: updatedUserData, error: updateError } = await supabase
      .from("User")
      .update(dbUpdates)
      .eq("id", user.id)
      .select();

    if (updateError) throw updateError;

    const updatedUser = updatedUserData?.[0] || user;
    return { user: transformUser(updatedUser) };
  } catch (error) {
    console.error("updateRegistration error:", error);
    throw new Error(`Failed to update registration: ${error.message}`);
  }
});

/**
 * Admin-only: update another user's role.
 * Payload: { targetUserId: string, role: "participant"|"ambassador"|"judge"|"admin" }
 */
resolver.define("adminUpdateUserRole", async (req) => {
  const accountId = getCallerAccountId(req);
  const { targetUserId, role } = req.payload || {};

  if (!targetUserId || !role) {
    throw new Error("targetUserId and role are required");
  }
  if (!REVERSE_ROLE_MAP[role]) {
    throw new Error(`Invalid role: ${role}`);
  }

  const supabase = getSupabaseClient();

  try {
    const caller = await getUserByAccountId(supabase, accountId, "id, role, email");
    if (!isAdminOrOwner(caller, accountId)) {
      throw new Error("Only admins can update user roles");
    }

    const { error: updateError } = await supabase
      .from("User")
      .update({ role: REVERSE_ROLE_MAP[role], updatedAt: new Date().toISOString() })
      .eq("id", targetUserId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("adminUpdateUserRole error:", error);
    throw new Error(`Failed to update user role: ${error.message}`);
  }
});

/**
 * Admin-only: delete a user registration
 * Payload: { userId: string }
 */
resolver.define("adminDeleteRegistration", async (req) => {
  const accountId = getCallerAccountId(req);
  const { userId } = req.payload || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify caller is admin
    const caller = await getUserByAccountId(supabase, accountId, "id, role, email");
    if (!isAdminOrOwner(caller, accountId)) {
      throw new Error("Only admins can delete user registrations");
    }

    // Get user to delete
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id, name, atlassian_account_id")
      .eq("id", userId)
      .limit(1);

    const userToDelete = userData?.[0];
    if (userError || !userToDelete) {
      throw new Error("User not found");
    }

    // Get all teams where user is captain
    const { data: captainTeams } = await supabase
      .from("TeamMember")
      .select("teamId, team:Team(id, name)")
      .eq("userId", userId)
      .eq("role", "OWNER")
      .eq("status", "ACCEPTED");

    // Delete all TeamMember records for this user
    const { error: teamMemberError } = await supabase
      .from("TeamMember")
      .delete()
      .eq("userId", userId);

    if (teamMemberError) {
      console.warn("Failed to delete TeamMember records:", teamMemberError);
    }

    // Delete all notifications for this user
    const { error: notificationError } = await supabase
      .from("Notification")
      .delete()
      .eq("userId", userId);

    if (notificationError) {
      console.warn("Failed to delete Notification records:", notificationError);
    }

    // If user was captain of any teams, those teams are now orphaned
    // The admin should reassign captains or delete those teams separately
    const orphanedTeamCount = captainTeams?.length || 0;

    // Delete the user
    const { error: deleteError } = await supabase
      .from("User")
      .delete()
      .eq("id", userId);

    if (deleteError) throw deleteError;

    return {
      success: true,
      deletedUserId: userId,
      orphanedTeams: orphanedTeamCount,
      message: orphanedTeamCount > 0
        ? `User deleted. Warning: ${orphanedTeamCount} team(s) are now without a captain.`
        : "User deleted successfully.",
    };
  } catch (error) {
    console.error("adminDeleteRegistration error:", error);
    throw new Error(`Failed to delete user registration: ${error.message}`);
  }
});

/**
 * Update user's auto-assign opt-in preference
 */
resolver.define("updateAutoAssignOptIn", async (req) => {
  const accountId = getCallerAccountId(req);
  const { optIn } = req.payload || {};
  if (optIn === undefined) {
    throw new Error("optIn is required");
  }

  const supabase = getSupabaseClient();

  try {
    const user = await getUserByAccountId(supabase, accountId, "id");

    const { error: updateError } = await supabase
      .from("User")
      .update({
        autoAssignOptIn: optIn,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return { success: true, autoAssignOptIn: optIn };
  } catch (error) {
    console.error("updateAutoAssignOptIn error:", error);
    throw new Error(`Failed to update auto-assign preference: ${error.message}`);
  }
});


}
