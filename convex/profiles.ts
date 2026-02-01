import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get current user's profile
 */
export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    return profile;
  },
});

/**
 * Get profile by ID
 */
export const getById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) {
      return null;
    }

    // Check visibility
    const identity = await ctx.auth.getUserIdentity();
    const isOwner = identity && profile.userId === identity.subject;

    if (
      profile.profileVisibility === "public" ||
      (profile.profileVisibility === "org" && identity) ||
      isOwner
    ) {
      return profile;
    }

    return null;
  },
});

/**
 * List all profiles (filtered by visibility). Optional limit for pagination.
 */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    const profiles = await ctx.db.query("profiles").collect();

    const filtered = profiles.filter((profile) => {
      const isOwner = identity && profile.userId === identity.subject;
      return (
        profile.profileVisibility === "public" ||
        (profile.profileVisibility === "org" && identity) ||
        isOwner
      );
    });
    return limit != null ? filtered.slice(0, limit) : filtered;
  },
});

/**
 * Current user's project and library asset counts (for graduated nudges on Dashboard).
 */
export const getCurrentUserCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { projectCount: 0, libraryAssetCount: 0 };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) return { projectCount: 0, libraryAssetCount: 0 };

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", profile._id))
      .collect();
    const assets = await ctx.db
      .query("libraryAssets")
      .withIndex("by_author", (q) => q.eq("authorId", profile._id))
      .collect();

    return {
      projectCount: projects.length,
      libraryAssetCount: assets.length,
    };
  },
});

/**
 * Create or update profile
 */
export const upsert = mutation({
  args: {
    email: v.string(),
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    experienceLevel: v.optional(
      v.union(
        v.literal("newbie"),
        v.literal("curious"),
        v.literal("comfortable"),
        v.literal("power_user"),
        v.literal("expert")
      )
    ),
    profileVisibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("org"),
        v.literal("public")
      )
    ),
    capabilityTags: v.optional(v.array(v.id("capabilityTags"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if profile exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        ...args,
        capabilityTags: args.capabilityTags || existingProfile.capabilityTags,
      });
      return existingProfile._id;
    } else {
      // Create new profile
      const profileId = await ctx.db.insert("profiles", {
        userId: identity.subject,
        email: args.email,
        fullName: args.fullName,
        avatarUrl: args.avatarUrl,
        experienceLevel: args.experienceLevel,
        mentorCapacity: 0,
        mentorSessionsUsed: 0,
        profileVisibility: args.profileVisibility || "org",
        capabilityTags: args.capabilityTags || [],
      });
      return profileId;
    }
  },
});

/**
 * Update mentor capacity
 */
export const updateMentorCapacity = mutation({
  args: {
    capacity: v.number(),
  },
  handler: async (ctx, { capacity }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      mentorCapacity: capacity,
    });
  },
});
