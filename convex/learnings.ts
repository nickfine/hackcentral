import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { viewerAccountId: v.optional(v.string()) },
  handler: async (ctx, { viewerAccountId }) => {
    const rows = await ctx.db.query("learnings").order("desc").collect();
    return rows.map((r) => ({
      ...r,
      likeCount: r.likeCount ?? 0,
      hasLiked: viewerAccountId
        ? (r.likedBy ?? []).includes(viewerAccountId)
        : false,
    }));
  },
});

export const upload = mutation({
  args: {
    filename: v.string(),
    content: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    authorAccountId: v.string(),
    authorName: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.filename.trim()) throw new ConvexError("Filename is required");
    if (!args.authorAccountId.trim()) throw new ConvexError("Author is required");
    return ctx.db.insert("learnings", {
      filename: args.filename.trim(),
      content: args.content,
      title: args.title?.trim() || undefined,
      description: args.description?.trim() || undefined,
      tags: args.tags,
      authorAccountId: args.authorAccountId,
      authorName: args.authorName,
    });
  },
});

export const updateMetadata = mutation({
  args: {
    learningId: v.id("learnings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, { learningId, title, description, tags }) => {
    const row = await ctx.db.get(learningId);
    if (!row) throw new ConvexError("Learning not found");
    await ctx.db.patch(learningId, {
      title: title?.trim() || undefined,
      description: description?.trim() || undefined,
      tags,
    });
  },
});

export const remove = mutation({
  args: { learningId: v.id("learnings") },
  handler: async (ctx, { learningId }) => {
    const row = await ctx.db.get(learningId);
    if (!row) throw new ConvexError("Learning not found");
    await ctx.db.delete(learningId);
  },
});

export const like = mutation({
  args: {
    learningId: v.id("learnings"),
    viewerAccountId: v.string(),
  },
  handler: async (ctx, { learningId, viewerAccountId }) => {
    const row = await ctx.db.get(learningId);
    if (!row) throw new ConvexError("Learning not found");
    const likedBy = row.likedBy ?? [];
    if (likedBy.includes(viewerAccountId)) {
      // toggle off
      await ctx.db.patch(learningId, {
        likedBy: likedBy.filter((id) => id !== viewerAccountId),
        likeCount: Math.max(0, (row.likeCount ?? 0) - 1),
      });
      return { liked: false, likeCount: Math.max(0, (row.likeCount ?? 0) - 1) };
    }
    await ctx.db.patch(learningId, {
      likedBy: [...likedBy, viewerAccountId],
      likeCount: (row.likeCount ?? 0) + 1,
    });
    return { liked: true, likeCount: (row.likeCount ?? 0) + 1 };
  },
});

export const getAdminStatus = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", accountId))
      .first();
    return { isAdmin: profile?.isAdmin === true };
  },
});
