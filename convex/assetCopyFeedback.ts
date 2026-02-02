import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Record copy feedback (thumbs up/down) when user copies a hack prompt.
 * Triggered after "Copy Prompt" → toast "Did this work for you? [👍] [👎]"
 */

export const record = mutation({
  args: {
    assetId: v.id("libraryAssets"),
    helpful: v.boolean(),
  },
  handler: async (ctx, { assetId, helpful }) => {
    const identity = await ctx.auth.getUserIdentity();

    // Verify asset exists and is accessible
    const asset = await ctx.db.get(assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    // Visibility check: user must be able to see the asset to give feedback
    if (asset.visibility === "private") {
      if (!identity) throw new Error("Not authenticated");
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
      if (!profile || asset.authorId !== profile._id) {
        throw new Error("Asset not found");
      }
    } else if (asset.visibility === "org" && !identity) {
      throw new Error("Not authenticated");
    }

    let userId: Id<"profiles"> | undefined;
    if (identity) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
      userId = profile?._id;
    }

    await ctx.db.insert("assetCopyFeedback", {
      assetId,
      userId,
      helpful,
    });
  },
});
