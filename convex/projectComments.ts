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
 * List comments for a project with author info. Enforces project visibility.
 */
export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    const hasAccess = await userHasProjectAccess(ctx, projectId, project);
    if (!hasAccess) return [];

    const comments = await ctx.db
      .query("projectComments")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    // Sort by creation time ascending
    comments.sort((a, b) => a._creationTime - b._creationTime);

    const result = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        return {
          comment: {
            _id: comment._id,
            projectId: comment.projectId,
            authorId: comment.authorId,
            content: comment.content,
            isAiRelated: comment.isAiRelated,
            _creationTime: comment._creationTime,
          },
          author: author
            ? {
                fullName: author.fullName,
                avatarUrl: author.avatarUrl,
              }
            : null,
        };
      })
    );

    return result;
  },
});

/**
 * Add a comment to a project. Requires auth and project access.
 */
export const add = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
    isAiRelated: v.optional(v.boolean()),
  },
  handler: async (ctx, { projectId, content, isAiRelated }) => {
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

    const trimmed = content.trim();
    if (!trimmed) throw new Error("Comment content is required");
    if (trimmed.length > 2000) throw new Error("Comment must be 2000 characters or less");

    await ctx.db.insert("projectComments", {
      projectId,
      authorId: profile._id,
      content: trimmed,
      isAiRelated: isAiRelated ?? false,
    });
  },
});
