import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Check if the current user has access to an asset (same visibility as libraryAssets.getById).
 */
async function userHasAssetAccess(
  ctx: QueryCtx,
  _assetId: Id<"libraryAssets">,
  asset: { visibility: string; authorId: Id<"profiles"> } | null
): Promise<boolean> {
  if (!asset) return false;
  const identity = await ctx.auth.getUserIdentity();
  let currentProfile = null;
  if (identity) {
    currentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
  }
  const isAuthor = currentProfile && asset.authorId === currentProfile._id;
  return (
    asset.visibility === "public" ||
    (asset.visibility === "org" && !!identity) ||
    (asset.visibility === "private" && !!isAuthor)
  );
}

/**
 * Check if the current user has access to a project (same visibility as projects.getById).
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
 * Get reuse counts for an asset. Enforces asset visibility.
 */
export const getReuseCountForAsset = query({
  args: { assetId: v.id("libraryAssets") },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get(assetId);
    const hasAccess = await userHasAssetAccess(ctx, assetId, asset);
    if (!hasAccess) {
      return {
        totalReuseEvents: 0,
        distinctProjectReuses: 0,
        distinctUserReuses: 0,
      };
    }

    const events = await ctx.db
      .query("libraryReuseEvents")
      .withIndex("by_asset", (q) => q.eq("assetId", assetId))
      .collect();

    const projectIds = new Set<Id<"projects">>();
    const userIds = new Set<Id<"profiles">>();
    for (const e of events) {
      userIds.add(e.userId);
      if (e.projectId) projectIds.add(e.projectId);
    }

    return {
      totalReuseEvents: events.length,
      distinctProjectReuses: projectIds.size,
      distinctUserReuses: userIds.size,
    };
  },
});

/**
 * Attach an asset to a project. Requires auth and access to both project and asset.
 * Idempotent: if already attached, no-op and return success.
 */
export const attachToProject = mutation({
  args: {
    projectId: v.id("projects"),
    assetId: v.id("libraryAssets"),
    attachmentType: v.union(
      v.literal("referenced"),
      v.literal("copied"),
      v.literal("linked"),
      v.literal("attached")
    ),
  },
  handler: async (ctx, { projectId, assetId, attachmentType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) throw new Error("Profile not found");

    const project = await ctx.db.get(projectId);
    const projectAccess = await userHasProjectAccess(ctx, projectId, project);
    if (!projectAccess) throw new Error("Project not found or access denied");

    const asset = await ctx.db.get(assetId);
    const assetAccess = await userHasAssetAccess(ctx, assetId, asset);
    if (!assetAccess) throw new Error("Asset not found or access denied");

    const existing = await ctx.db
      .query("projectLibraryAssets")
      .withIndex("by_project_and_asset", (q) =>
        q.eq("projectId", projectId).eq("assetId", assetId)
      )
      .first();

    if (existing) {
      return; // Already attached, idempotent success
    }

    await ctx.db.insert("projectLibraryAssets", {
      projectId,
      assetId,
      attachedBy: profile._id,
      attachmentType,
    });

    await ctx.db.insert("libraryReuseEvents", {
      assetId,
      userId: profile._id,
      projectId,
      reuseType: attachmentType,
    });
  },
});
