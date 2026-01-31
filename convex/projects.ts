import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * List projects (filtered by visibility)
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const projects = await ctx.db.query("projects").collect();

    // Get current user's profile
    let currentProfile = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    // Filter by visibility (async-safe)
    const projectsWithAccess = await Promise.all(
      projects.map(async (project) => {
        const isOwner = currentProfile && project.ownerId === currentProfile._id;

        // Check if user is a member
        const isMember = currentProfile
          ? await ctx.db
              .query("projectMembers")
              .withIndex("by_project_and_user", (q) =>
                q.eq("projectId", project._id).eq("userId", currentProfile._id)
              )
              .first()
          : null;

        const hasAccess =
          project.visibility === "public" ||
          (project.visibility === "org" && identity) ||
          (project.visibility === "private" && (isOwner || isMember));

        return hasAccess ? project : null;
      })
    );

    return projectsWithAccess.filter((p) => p !== null);
  },
});

/**
 * List projects with comment/support counts and current user's like/offer-help state.
 * Same visibility as list; one query for the Projects page.
 */
export const listWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const projects = await ctx.db.query("projects").collect();

    let currentProfile = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    const projectsWithAccess = await Promise.all(
      projects.map(async (project) => {
        const isOwner = currentProfile && project.ownerId === currentProfile._id;
        const isMember = currentProfile
          ? await ctx.db
              .query("projectMembers")
              .withIndex("by_project_and_user", (q) =>
                q.eq("projectId", project._id).eq("userId", currentProfile._id)
              )
              .first()
          : null;

        const hasAccess =
          project.visibility === "public" ||
          (project.visibility === "org" && identity) ||
          (project.visibility === "private" && (isOwner || isMember));

        if (!hasAccess) return null;

        const comments = await ctx.db
          .query("projectComments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const supportEvents = await ctx.db
          .query("projectSupportEvents")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        let likeCount = 0;
        let helpOfferCount = 0;
        for (const e of supportEvents) {
          if (e.supportType === "like") likeCount++;
          else if (e.supportType === "offer_help") helpOfferCount++;
        }

        let userLiked = false;
        let userOfferedHelp = false;
        if (currentProfile) {
          const myEvents = supportEvents.filter(
            (e) => e.supporterId === currentProfile._id
          );
          userLiked = myEvents.some((e) => e.supportType === "like");
          userOfferedHelp = myEvents.some((e) => e.supportType === "offer_help");
        }

        const projectAssets = await ctx.db
          .query("projectLibraryAssets")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        return {
          ...project,
          commentCount: comments.length,
          likeCount,
          helpOfferCount,
          userLiked,
          userOfferedHelp,
          attachedAssetsCount: projectAssets.length,
        };
      })
    );

    return projectsWithAccess.filter((p) => p !== null);
  },
});

/**
 * Get project by ID
 */
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let currentProfile = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    const isOwner = currentProfile && project.ownerId === currentProfile._id;
    const isMember = currentProfile
      ? await ctx.db
          .query("projectMembers")
          .withIndex("by_project_and_user", (q) =>
            q.eq("projectId", project._id).eq("userId", currentProfile._id)
          )
          .first()
      : null;

    // Check visibility
    if (
      project.visibility === "public" ||
      (project.visibility === "org" && identity) ||
      (project.visibility === "private" && (isOwner || isMember))
    ) {
      return project;
    }

    return null;
  },
});

/**
 * Create a new project
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    visibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("org"),
        v.literal("public")
      )
    ),
    isAnonymous: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
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

    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      status: "idea",
      ownerId: profile._id,
      visibility: args.visibility || "private",
      isAnonymous: args.isAnonymous || false,
      workflowTransformed: false,
    });

    return projectId;
  },
});

/**
 * Update project
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("idea"),
        v.literal("building"),
        v.literal("incubation"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    aiImpactHypothesis: v.optional(v.string()),
    aiToolsUsed: v.optional(v.array(v.string())),
    timeSavedEstimate: v.optional(v.number()),
    failuresAndLessons: v.optional(v.string()),
    workflowTransformed: v.optional(v.boolean()),
    visibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("org"),
        v.literal("public")
      )
    ),
  },
  handler: async (ctx, { projectId, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile || project.ownerId !== profile._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(projectId, updates);
  },
});
