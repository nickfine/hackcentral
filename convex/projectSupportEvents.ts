import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Check if the current user has access to a project (same visibility rules as projects.getById).
 */
async function userHasProjectAccess(
  ctx: QueryCtx,
  projectId: Id<"projects">,
  project: { visibility: string; ownerId: Id<"profiles"> } | null
): Promise<boolean> {
  if (!project) return false;
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
          q.eq("projectId", projectId).eq("userId", currentProfile!._id)
        )
        .first()
    : null;
  return (
    project.visibility === "public" ||
    (project.visibility === "org" && !!identity) ||
    (project.visibility === "private" && !!(isOwner || isMember))
  );
}

/**
 * Get like and help-offer counts for a project. Enforces project visibility.
 */
export const getCountsForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    const hasAccess = await userHasProjectAccess(ctx, projectId, project);
    if (!hasAccess) return { likeCount: 0, helpOfferCount: 0 };

    const events = await ctx.db
      .query("projectSupportEvents")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    let likeCount = 0;
    let helpOfferCount = 0;
    for (const e of events) {
      if (e.supportType === "like") likeCount++;
      else if (e.supportType === "offer_help") helpOfferCount++;
    }
    return { likeCount, helpOfferCount };
  },
});

/**
 * Toggle like for the current user on a project. Requires auth and project access.
 * Returns the new liked state.
 */
export const toggleLike = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) throw new Error("Profile not found");

    const project = await ctx.db.get(projectId);
    const hasAccess = await userHasProjectAccess(ctx, projectId, project);
    if (!hasAccess) throw new Error("Project not found or access denied");

    const existing = await ctx.db
      .query("projectSupportEvents")
      .withIndex("by_project_and_supporter", (q) =>
        q.eq("projectId", projectId).eq("supporterId", profile._id)
      )
      .collect();

    const likeEvent = existing.find((e) => e.supportType === "like");
    if (likeEvent) {
      await ctx.db.delete(likeEvent._id);
      return { liked: false };
    }
    await ctx.db.insert("projectSupportEvents", {
      projectId,
      supporterId: profile._id,
      supportType: "like",
    });
    return { liked: true };
  },
});

/**
 * Toggle offer-help for the current user on a project. Requires auth and project access.
 * Returns the new offered-help state.
 */
export const toggleOfferHelp = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) throw new Error("Profile not found");

    const project = await ctx.db.get(projectId);
    const hasAccess = await userHasProjectAccess(ctx, projectId, project);
    if (!hasAccess) throw new Error("Project not found or access denied");

    const existing = await ctx.db
      .query("projectSupportEvents")
      .withIndex("by_project_and_supporter", (q) =>
        q.eq("projectId", projectId).eq("supporterId", profile._id)
      )
      .collect();

    const helpEvent = existing.find((e) => e.supportType === "offer_help");
    if (helpEvent) {
      await ctx.db.delete(helpEvent._id);
      return { offeredHelp: false };
    }
    await ctx.db.insert("projectSupportEvents", {
      projectId,
      supporterId: profile._id,
      supportType: "offer_help",
    });
    return { offeredHelp: true };
  },
});

/**
 * Get current user's like and offer-help state for a project. Used for filled/unfilled UI.
 */
export const getCurrentUserSupport = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { liked: false, offeredHelp: false };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) return { liked: false, offeredHelp: false };

    const project = await ctx.db.get(projectId);
    const hasAccess = await userHasProjectAccess(ctx, projectId, project);
    if (!hasAccess) return { liked: false, offeredHelp: false };

    const events = await ctx.db
      .query("projectSupportEvents")
      .withIndex("by_project_and_supporter", (q) =>
        q.eq("projectId", projectId).eq("supporterId", profile._id)
      )
      .collect();

    const liked = events.some((e) => e.supportType === "like");
    const offeredHelp = events.some((e) => e.supportType === "offer_help");
    return { liked, offeredHelp };
  },
});
