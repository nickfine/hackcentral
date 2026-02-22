import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type ProfileDoc = Doc<"profiles"> | null;
type Identity = Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>;
type AssetFilterArgs = {
  assetType?: "prompt" | "skill" | "app";
  status?: "in_progress" | "verified" | "deprecated";
  arsenalOnly?: boolean;
  excludeDeprecated?: boolean;
  limit?: number;
};

async function getCurrentProfile(
  ctx: QueryCtx,
  identity: Identity
): Promise<ProfileDoc> {
  if (!identity) return null;
  return await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
    .first();
}

async function listFilteredVisibleAssets(
  ctx: QueryCtx,
  identity: Identity,
  currentProfile: ProfileDoc,
  {
    assetType,
    status,
    arsenalOnly,
    excludeDeprecated,
    limit,
  }: AssetFilterArgs
) {
  const isVisibleToUser = (asset: Doc<"libraryAssets">) => {
    if (asset.visibility === "public") return true;
    if (asset.visibility === "org") return Boolean(identity);
    return Boolean(currentProfile && asset.authorId === currentProfile._id);
  };

  const matchesFilters = (asset: Doc<"libraryAssets">) => {
    if (!isVisibleToUser(asset)) return false;
    if (assetType && asset.assetType !== assetType) return false;
    if (status && asset.status !== status) return false;
    if (arsenalOnly && !asset.isArsenal) return false;
    if (excludeDeprecated && asset.status === "deprecated" && status !== "deprecated") return false;
    return true;
  };

  const addAsset = (
    assets: Doc<"libraryAssets">[],
    seen: Set<Id<"libraryAssets">>,
    results: Doc<"libraryAssets">[]
  ) => {
    for (const asset of assets) {
      if (seen.has(asset._id) || !matchesFilters(asset)) continue;
      seen.add(asset._id);
      results.push(asset);
    }
  };

  let candidates: Doc<"libraryAssets">[] = [];
  if (status) {
    candidates = await ctx.db
      .query("libraryAssets")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();
  } else if (assetType) {
    candidates = await ctx.db
      .query("libraryAssets")
      .withIndex("by_type", (q) => q.eq("assetType", assetType))
      .collect();
  } else if (arsenalOnly) {
    candidates = await ctx.db
      .query("libraryAssets")
      .withIndex("by_arsenal", (q) => q.eq("isArsenal", true))
      .collect();
  } else {
    const seen = new Set<Id<"libraryAssets">>();
    const merged: Doc<"libraryAssets">[] = [];

    const publicAssets = await ctx.db
      .query("libraryAssets")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .collect();
    addAsset(publicAssets, seen, merged);

    if (identity) {
      const orgAssets = await ctx.db
        .query("libraryAssets")
        .withIndex("by_visibility", (q) => q.eq("visibility", "org"))
        .collect();
      addAsset(orgAssets, seen, merged);
    }

    if (currentProfile) {
      const myAssets = await ctx.db
        .query("libraryAssets")
        .withIndex("by_author", (q) => q.eq("authorId", currentProfile._id))
        .collect();
      addAsset(myAssets, seen, merged);
    }

    merged.sort((a, b) => a._creationTime - b._creationTime);
    return limit != null ? merged.slice(0, limit) : merged;
  }

  const filtered = candidates.filter(matchesFilters);
  filtered.sort((a, b) => a._creationTime - b._creationTime);
  return limit != null ? filtered.slice(0, limit) : filtered;
}

/**
 * List library assets (filtered by visibility)
 */
export const list = query({
  args: {
    assetType: v.optional(
      v.union(
        v.literal("prompt"),
        v.literal("skill"),
        v.literal("app")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("in_progress"),
        v.literal("verified"),
        v.literal("deprecated")
      )
    ),
    arsenalOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { assetType, status, arsenalOnly }) => {
    const identity = await ctx.auth.getUserIdentity();
    const currentProfile = await getCurrentProfile(ctx, identity);
    return await listFilteredVisibleAssets(ctx, identity, currentProfile, {
      assetType,
      status,
      arsenalOnly,
    });
  },
});

/**
 * Get Featured Hacks items (curated, verified assets)
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
        v.literal("skill"),
        v.literal("app")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("in_progress"),
        v.literal("verified"),
        v.literal("deprecated")
      )
    ),
    arsenalOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    /** When true, exclude assets with status "deprecated" (unless status filter is explicitly "deprecated"). */
    excludeDeprecated: v.optional(v.boolean()),
  },
  handler: async (ctx, { assetType, status, arsenalOnly, limit, excludeDeprecated }) => {
    const identity = await ctx.auth.getUserIdentity();
    const currentProfile = await getCurrentProfile(ctx, identity);
    const assets = await listFilteredVisibleAssets(ctx, identity, currentProfile, {
      assetType,
      status,
      arsenalOnly,
      excludeDeprecated,
      limit,
    });
    if (assets.length === 0) return [];

    const assetIds = new Set(assets.map((asset) => asset._id));
    const reuseCountByAsset = new Map<Id<"libraryAssets">, number>();
    const events = await ctx.db.query("libraryReuseEvents").collect();
    for (const event of events) {
      if (!assetIds.has(event.assetId)) continue;
      reuseCountByAsset.set(
        event.assetId,
        (reuseCountByAsset.get(event.assetId) ?? 0) + 1
      );
    }

    return assets.map((asset) => ({
      ...asset,
      totalReuseEvents: reuseCountByAsset.get(asset._id) ?? 0,
    }));
  },
});

/**
 * Get Featured Hacks items with reuse counts. Same visibility as getArsenal.
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
      if (asset.verifiedById && !asset.isAnonymous) {
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
      v.literal("skill"),
      v.literal("app")
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
    isAnonymous: v.optional(v.boolean()),
    sourceRepo: v.optional(
      v.object({
        url: v.string(),
        platform: v.union(
          v.literal("github"),
          v.literal("gitlab"),
          v.literal("bitbucket")
        ),
        version: v.optional(v.string()),
        updatedAt: v.optional(v.number()),
        repoName: v.optional(v.string()),
        description: v.optional(v.string()),
        commitMessage: v.optional(v.string()),
      })
    ),
    demoUrl: v.optional(v.string()),
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
      status: "in_progress",
      authorId: profile._id,
      visibility: args.visibility || "org",
      isArsenal: false,
      metadata: args.metadata,
      isAnonymous: args.isAnonymous ?? false,
      sourceRepo: args.sourceRepo,
      demoUrl: args.demoUrl,
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
        v.literal("in_progress"),
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
    sourceRepo: v.optional(
      v.object({
        url: v.string(),
        platform: v.union(
          v.literal("github"),
          v.literal("gitlab"),
          v.literal("bitbucket")
        ),
        version: v.optional(v.string()),
        updatedAt: v.optional(v.number()),
        repoName: v.optional(v.string()),
        description: v.optional(v.string()),
        commitMessage: v.optional(v.string()),
      })
    ),
    demoUrl: v.optional(v.string()),
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
    const wasVerified = asset.status === "verified";
    if (updates.status === "verified") {
      patch.verifiedById = profile._id;
      patch.verifiedAt = Date.now();
    }

    await ctx.db.patch(assetId, patch);

    if (updates.status === "verified" && !wasVerified) {
      await ctx.db.insert("aiContributions", {
        userId: profile._id,
        contributionType: "verification",
        assetId,
      });
    }
  },
});

