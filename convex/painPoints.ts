import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

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
// PUBLIC MUTATIONS
// ============================================================================

export const submit = mutation({
  args: {
    title: v.string(),
    submitterName: v.string(),
    description: v.optional(v.string()),
    effortEstimate: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    impactEstimate: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const submitterName = args.submitterName.trim();
    if (!title) throw new ConvexError("Title is required");
    if (!submitterName) throw new ConvexError("Your name is required");

    const identity = await ctx.auth.getUserIdentity();
    const submittedByUserId = identity
      ? (
          await ctx.db
            .query("profiles")
            .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
            .first()
        )?._id
      : undefined;

    return ctx.db.insert("painPoints", {
      title,
      submitterName,
      description: args.description?.trim() || undefined,
      effortEstimate: args.effortEstimate,
      impactEstimate: args.impactEstimate,
      submittedByUserId,
      reactionCount: 0,
      isHidden: false,
    });
  },
});

export const react = mutation({
  args: { painPointId: v.id("painPoints") },
  handler: async (ctx, { painPointId }) => {
    const painPoint = await ctx.db.get(painPointId);
    if (!painPoint || painPoint.isHidden) return null;
    await ctx.db.patch(painPointId, {
      reactionCount: painPoint.reactionCount + 1,
    });
    return null;
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/** Top pain points for homepage widget (non-hidden only). */
export const list = query({
  args: {
    sortBy: v.optional(v.union(v.literal("reactions"), v.literal("newest"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sortBy = "reactions", limit = 50 }) => {
    let rows = await ctx.db
      .query("painPoints")
      .withIndex("by_hidden", (q) => q.eq("isHidden", false))
      .collect();

    if (sortBy === "reactions") {
      rows = rows.sort((a, b) => b.reactionCount - a.reactionCount);
    } else {
      rows = rows.sort((a, b) => b._creationTime - a._creationTime);
    }

    return rows.slice(0, limit);
  },
});

/** Full list including hidden rows — admins see all, others see non-hidden. */
export const listAll = query({
  args: {
    sortBy: v.optional(v.union(v.literal("reactions"), v.literal("newest"))),
  },
  handler: async (ctx, { sortBy = "reactions" }) => {
    const identity = await ctx.auth.getUserIdentity();
    const profile = identity
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
          .first()
      : null;

    let rows = await ctx.db.query("painPoints").collect();

    if (!profile?.isAdmin) {
      rows = rows.filter((r) => !r.isHidden);
    }

    if (sortBy === "reactions") {
      rows = rows.sort((a, b) => b.reactionCount - a.reactionCount);
    } else {
      rows = rows.sort((a, b) => b._creationTime - a._creationTime);
    }

    return rows;
  },
});

export const get = query({
  args: { painPointId: v.id("painPoints") },
  handler: async (ctx, { painPointId }) => ctx.db.get(painPointId),
});

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

export const adminHide = mutation({
  args: { painPointId: v.id("painPoints") },
  handler: async (ctx, { painPointId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(painPointId, { isHidden: true });
  },
});

export const adminUnhide = mutation({
  args: { painPointId: v.id("painPoints") },
  handler: async (ctx, { painPointId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(painPointId, { isHidden: false });
  },
});

export const adminEdit = mutation({
  args: {
    painPointId: v.id("painPoints"),
    title: v.string(),
    description: v.optional(v.string()),
    effortEstimate: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    impactEstimate: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
  },
  handler: async (ctx, { painPointId, title, description, effortEstimate, impactEstimate }) => {
    await requireAdmin(ctx);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) throw new ConvexError("Title is required");
    await ctx.db.patch(painPointId, {
      title: trimmedTitle,
      description: description?.trim() || undefined,
      effortEstimate,
      impactEstimate,
    });
  },
});

export const adminDelete = mutation({
  args: { painPointId: v.id("painPoints") },
  handler: async (ctx, { painPointId }) => {
    await requireAdmin(ctx);
    const links = await ctx.db
      .query("teamPainPoints")
      .withIndex("by_pain_point", (q) => q.eq("painPointId", painPointId))
      .collect();
    await Promise.all(links.map((l) => ctx.db.delete(l._id)));
    await ctx.db.delete(painPointId);
  },
});

export const adminMerge = mutation({
  args: {
    sourceId: v.id("painPoints"),
    targetId: v.id("painPoints"),
  },
  handler: async (ctx, { sourceId, targetId }) => {
    await requireAdmin(ctx);
    const [source, target] = await Promise.all([
      ctx.db.get(sourceId),
      ctx.db.get(targetId),
    ]);
    if (!source || !target) throw new ConvexError("Pain point not found");

    await ctx.db.patch(targetId, {
      reactionCount: target.reactionCount + source.reactionCount,
    });

    const links = await ctx.db
      .query("teamPainPoints")
      .withIndex("by_pain_point", (q) => q.eq("painPointId", sourceId))
      .collect();
    await Promise.all(links.map((l) => ctx.db.patch(l._id, { painPointId: targetId })));

    await ctx.db.delete(sourceId);
  },
});

// ============================================================================
// TEAM LINKING
// ============================================================================

export const linkToTeam = mutation({
  args: {
    teamId: v.string(),
    eventId: v.string(),
    painPointId: v.id("painPoints"),
  },
  handler: async (ctx, { teamId, eventId, painPointId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Must be logged in");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    const existing = await ctx.db
      .query("teamPainPoints")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .filter((q) => q.eq(q.field("painPointId"), painPointId))
      .first();
    if (existing) return;

    await ctx.db.insert("teamPainPoints", {
      teamId,
      eventId,
      painPointId,
      assignedByUserId: profile?._id,
    });
  },
});

export const unlinkFromTeam = mutation({
  args: {
    teamId: v.string(),
    painPointId: v.id("painPoints"),
  },
  handler: async (ctx, { teamId, painPointId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Must be logged in");

    const link = await ctx.db
      .query("teamPainPoints")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .filter((q) => q.eq(q.field("painPointId"), painPointId))
      .first();
    if (link) await ctx.db.delete(link._id);
  },
});

export const listForTeam = query({
  args: { teamId: v.string() },
  handler: async (ctx, { teamId }) => {
    const links = await ctx.db
      .query("teamPainPoints")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    const painPoints = await Promise.all(links.map((l) => ctx.db.get(l.painPointId)));
    return painPoints.filter(Boolean);
  },
});

// ============================================================================
// VIEWER HELPER
// ============================================================================

export const viewerIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    return profile?.isAdmin === true;
  },
});
