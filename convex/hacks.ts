import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";

// ============================================================================
// HELPERS
// ============================================================================

async function requireAdmin(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthorized");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
    .first();
  if (!profile?.isAdmin) throw new ConvexError("Unauthorized");
}

// ============================================================================
// WRITE-THROUGH FROM FORGE (upsert, idempotent on projectId)
// ============================================================================

export const upsertFromForge = mutation({
  args: {
    projectId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    teamName: v.string(),
    memberNames: v.array(v.string()),
    hackDayName: v.optional(v.string()),
    hackDayDate: v.optional(v.string()),
    demoVideoUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    liveDemoUrl: v.optional(v.string()),
    eventId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    painPointId: v.optional(v.id("painPoints")),
    submitterName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) throw new ConvexError("Title is required");
    if (!args.projectId.trim()) throw new ConvexError("projectId is required");

    const existing = await ctx.db
      .query("hacks")
      .withIndex("by_project_id", (q) => q.eq("projectId", args.projectId))
      .first();

    const snapshot = {
      title,
      description: args.description?.trim() || undefined,
      teamName: args.teamName.trim(),
      memberNames: args.memberNames,
      hackDayName: args.hackDayName?.trim() || undefined,
      hackDayDate: args.hackDayDate?.trim() || undefined,
      demoVideoUrl: args.demoVideoUrl?.trim() || undefined,
      repoUrl: args.repoUrl?.trim() || undefined,
      liveDemoUrl: args.liveDemoUrl?.trim() || undefined,
      eventId: args.eventId?.trim() || undefined,
      teamId: args.teamId?.trim() || undefined,
      painPointId: args.painPointId,
      submitterName: args.submitterName?.trim() || undefined,
      submittedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, snapshot);
      return existing._id;
    }

    return ctx.db.insert("hacks", {
      ...snapshot,
      projectId: args.projectId.trim(),
      isHidden: false,
    });
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

export const listForHdc = query({
  args: {
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sortBy = "newest", limit = 50 }) => {
    const rows = await ctx.db
      .query("hacks")
      .withIndex("by_hidden_submitted", (q) => q.eq("isHidden", false))
      .order(sortBy === "oldest" ? "asc" : "desc")
      .take(limit);
    return rows;
  },
});

export const listForEvent = query({
  args: {
    eventId: v.string(),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { eventId, sortBy = "newest", limit = 50 }) => {
    const rows = await ctx.db
      .query("hacks")
      .withIndex("by_event_hidden_submitted", (q) =>
        q.eq("eventId", eventId).eq("isHidden", false)
      )
      .order(sortBy === "oldest" ? "asc" : "desc")
      .take(limit);
    return rows;
  },
});

export const list = query({
  args: {
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sortBy = "newest", limit = 50 }) => {
    const rows = await ctx.db
      .query("hacks")
      .withIndex("by_hidden_submitted", (q) => q.eq("isHidden", false))
      .order(sortBy === "oldest" ? "asc" : "desc")
      .take(limit);
    return rows;
  },
});

export const get = query({
  args: { hackId: v.id("hacks") },
  handler: async (ctx, { hackId }) => ctx.db.get(hackId),
});

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

export const adminHide = mutation({
  args: { hackId: v.id("hacks") },
  handler: async (ctx, { hackId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(hackId, { isHidden: true });
  },
});

export const adminUnhide = mutation({
  args: { hackId: v.id("hacks") },
  handler: async (ctx, { hackId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(hackId, { isHidden: false });
  },
});

export const adminEdit = mutation({
  args: {
    hackId: v.id("hacks"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { hackId, title, description }) => {
    await requireAdmin(ctx);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) throw new ConvexError("Title is required");
    await ctx.db.patch(hackId, {
      title: trimmedTitle,
      description: description?.trim() || undefined,
    });
  },
});

export const adminDelete = internalMutation({
  args: { hackId: v.id("hacks") },
  handler: async (ctx, { hackId }) => {
    await ctx.db.delete(hackId);
  },
});
