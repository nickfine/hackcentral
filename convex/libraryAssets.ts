import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * List library assets (filtered by visibility)
 */
export const list = query({
  args: {
    assetType: v.optional(
      v.union(
        v.literal("prompt"),
        v.literal("template"),
        v.literal("agent_blueprint"),
        v.literal("guardrail"),
        v.literal("evaluation_rubric"),
        v.literal("structured_output")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("verified"),
        v.literal("deprecated")
      )
    ),
    arsenalOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { assetType, status, arsenalOnly }) => {
    const identity = await ctx.auth.getUserIdentity();
    let query = ctx.db.query("libraryAssets");

    const assets = await query.collect();

    // Get current user's profile
    let currentProfile = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    // Filter by visibility and other criteria
    return assets.filter((asset) => {
      const isAuthor = currentProfile && asset.authorId === currentProfile._id;

      // Visibility check
      const visibilityOk =
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity) ||
        (asset.visibility === "private" && isAuthor);

      if (!visibilityOk) return false;

      // Filter by asset type
      if (assetType && asset.assetType !== assetType) return false;

      // Filter by status
      if (status && asset.status !== status) return false;

      // Filter by arsenal flag
      if (arsenalOnly && !asset.isArsenal) return false;

      return true;
    });
  },
});

/**
 * Get AI Arsenal items (curated, verified assets)
 */
export const getArsenal = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const assets = await ctx.db
      .query("libraryAssets")
      .withIndex("by_arsenal", (q) => q.eq("isArsenal", true))
      .collect();

    // Filter by visibility
    return assets.filter((asset) => {
      return (
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity)
      );
    });
  },
});

/**
 * Get asset by ID
 */
export const getById = query({
  args: { assetId: v.id("libraryAssets") },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get(assetId);
    if (!asset) {
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

    const isAuthor = currentProfile && asset.authorId === currentProfile._id;

    // Check visibility
    if (
      asset.visibility === "public" ||
      (asset.visibility === "org" && identity) ||
      (asset.visibility === "private" && isAuthor)
    ) {
      return asset;
    }

    return null;
  },
});

/**
 * Create a new library asset
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    assetType: v.union(
      v.literal("prompt"),
      v.literal("template"),
      v.literal("agent_blueprint"),
      v.literal("guardrail"),
      v.literal("evaluation_rubric"),
      v.literal("structured_output")
    ),
    content: v.any(),
    visibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("org"),
        v.literal("public")
      )
    ),
    metadata: v.optional(
      v.object({
        intendedUser: v.optional(v.string()),
        context: v.optional(v.string()),
        limitations: v.optional(v.string()),
        riskNotes: v.optional(v.string()),
        exampleInput: v.optional(v.string()),
        exampleOutput: v.optional(v.string()),
      })
    ),
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

    const assetId = await ctx.db.insert("libraryAssets", {
      title: args.title,
      description: args.description,
      assetType: args.assetType,
      content: args.content,
      status: "draft",
      authorId: profile._id,
      visibility: args.visibility || "org",
      isArsenal: false,
      metadata: args.metadata,
    });

    // Track contribution
    await ctx.db.insert("aiContributions", {
      userId: profile._id,
      contributionType: "library_asset",
      assetId: assetId,
    });

    return assetId;
  },
});

/**
 * Update library asset
 */
export const update = mutation({
  args: {
    assetId: v.id("libraryAssets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.any()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("verified"),
        v.literal("deprecated")
      )
    ),
    visibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("org"),
        v.literal("public")
      )
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { assetId, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const asset = await ctx.db.get(assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile || asset.authorId !== profile._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(assetId, updates);
  },
});
