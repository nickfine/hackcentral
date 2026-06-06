import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("learnings").order("desc").collect();
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
