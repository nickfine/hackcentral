import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Tooling Library taxonomy. Optional everywhere so legacy rows stay valid.
const kindValidator = v.union(
  v.literal("operating_context"),
  v.literal("memory"),
  v.literal("learning"),
  v.literal("skill"),
  v.literal("other")
);
const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("org"),
  v.literal("public")
);

export const list = query({
  args: { viewerAccountId: v.optional(v.string()) },
  handler: async (ctx, { viewerAccountId }) => {
    const rows = await ctx.db.query("learnings").order("desc").collect();
    return rows
      .filter((r) => {
        // Missing visibility is treated as 'org' (the pre-taxonomy default).
        const visibility = r.visibility ?? "org";
        if (visibility !== "private") return true;
        // Private rows are visible only to their author.
        return !!viewerAccountId && r.authorAccountId === viewerAccountId;
      })
      .map((r) => ({
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
    kind: v.optional(kindValidator),
    visibility: v.optional(visibilityValidator),
    byteSize: v.optional(v.number()),
    contentHash: v.optional(v.string()),
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
      kind: args.kind ?? "other",
      visibility: args.visibility ?? "org",
      byteSize: args.byteSize,
      contentHash: args.contentHash,
    });
  },
});

export const updateMetadata = mutation({
  args: {
    learningId: v.id("learnings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    kind: v.optional(kindValidator),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, { learningId, title, description, tags, kind, visibility }) => {
    const row = await ctx.db.get(learningId);
    if (!row) throw new ConvexError("Learning not found");
    await ctx.db.patch(learningId, {
      title: title?.trim() || undefined,
      description: description?.trim() || undefined,
      tags,
      ...(kind ? { kind } : {}),
      ...(visibility ? { visibility } : {}),
    });
  },
});

// --- Analysis stub (Tooling Library phase 2) ---
// Placeholder for per-artefact AI analysis. v1 leaves this a no-op so the
// capture/find/download flow ships without any LLM dependency. The future
// implementation will call the Anthropic API via a Forge-side action and
// patch analysisSummary / analysisTags / analysisModel / analyzedAt onto the
// row. See docs/TOOLING-LIBRARY-PLAN.md for the full design and cost spectrum.
export const analyze = mutation({
  args: { learningId: v.id("learnings") },
  handler: async (ctx, { learningId }) => {
    const row = await ctx.db.get(learningId);
    if (!row) throw new ConvexError("Learning not found");
    // Intentionally no-op in v1.
    return { analyzed: false, reason: "analysis not yet implemented" };
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
