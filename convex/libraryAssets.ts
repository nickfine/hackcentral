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
    const assets = await ctx.db.query("libraryAssets").collect();

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
 * List library assets with reuse counts. Same args and visibility as list.
 */
export const listWithReuseCounts = query({
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
    const assets = await ctx.db.query("libraryAssets").collect();

    let currentProfile = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    const visibleAssets = assets.filter((asset) => {
      const isAuthor = currentProfile && asset.authorId === currentProfile._id;
      const visibilityOk =
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity) ||
        (asset.visibility === "private" && isAuthor);
      if (!visibilityOk) return false;
      if (assetType && asset.assetType !== assetType) return false;
      if (status && asset.status !== status) return false;
      if (arsenalOnly && !asset.isArsenal) return false;
      return true;
    });

    const result = await Promise.all(
      visibleAssets.map(async (asset) => {
        const events = await ctx.db
          .query("libraryReuseEvents")
          .withIndex("by_asset", (q) => q.eq("assetId", asset._id))
          .collect();
        return {
          ...asset,
          totalReuseEvents: events.length,
        };
      })
    );

    return result;
  },
});

/**
 * Get AI Arsenal items with reuse counts. Same visibility as getArsenal.
 */
export const getArsenalWithReuseCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const assets = await ctx.db
      .query("libraryAssets")
      .withIndex("by_arsenal", (q) => q.eq("isArsenal", true))
      .collect();

    const visibleAssets = assets.filter(
      (asset) =>
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity)
    );

    const result = await Promise.all(
      visibleAssets.map(async (asset) => {
        const events = await ctx.db
          .query("libraryReuseEvents")
          .withIndex("by_asset", (q) => q.eq("assetId", asset._id))
          .collect();
        return {
          ...asset,
          totalReuseEvents: events.length,
        };
      })
    );

    return result;
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
      let verifiedByFullName: string | undefined;
      if (asset.verifiedById) {
        const verifier = await ctx.db.get(asset.verifiedById);
        verifiedByFullName = verifier?.fullName ?? verifier?.email;
      }
      return {
        ...asset,
        verifiedByFullName,
      };
    }

    return null;
  },
});

/**
 * Get similar assets (same type, same visibility rules), excluding the given asset.
 * Returns [] if the asset is not found or not visible to the caller (consistent with getById).
 */
export const getSimilar = query({
  args: {
    assetId: v.id("libraryAssets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { assetId, limit = 6 }) => {
    const current = await ctx.db.get(assetId);
    if (!current) return [];

    const identity = await ctx.auth.getUserIdentity();
    let currentProfile = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    const canSeeCurrent =
      current.visibility === "public" ||
      (current.visibility === "org" && identity) ||
      (current.visibility === "private" && currentProfile && current.authorId === currentProfile._id);
    if (!canSeeCurrent) return [];

    const candidates = await ctx.db
      .query("libraryAssets")
      .withIndex("by_type", (q) => q.eq("assetType", current.assetType))
      .collect();

    const similar: typeof candidates = [];
    for (const asset of candidates) {
      if (asset._id === assetId) continue;
      const isAuthor = currentProfile && asset.authorId === currentProfile._id;
      const visibilityOk =
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity) ||
        (asset.visibility === "private" && isAuthor);
      if (!visibilityOk) continue;
      similar.push(asset);
      if (similar.length >= limit) break;
    }

    return similar;
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

    const patch: Record<string, unknown> = { ...updates };
    if (updates.status === "verified") {
      patch.verifiedById = profile._id;
      patch.verifiedAt = Date.now();
    }

    await ctx.db.patch(assetId, patch);
  },
});
