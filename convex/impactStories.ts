import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Create an impact story. Requires auth.
 */
export const create = mutation({
  args: {
    headline: v.string(),
    storyText: v.optional(v.string()),
    assetId: v.optional(v.id("libraryAssets")),
    projectId: v.optional(v.id("projects")),
    metrics: v.optional(
      v.object({
        timeSaved: v.optional(v.number()),
        errorReduction: v.optional(v.number()),
        throughputGain: v.optional(v.number()),
      })
    ),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) throw new Error("Profile not found");

    const storyId = await ctx.db.insert("impactStories", {
      userId: profile._id,
      headline: args.headline.trim(),
      storyText: args.storyText?.trim() || undefined,
      assetId: args.assetId,
      projectId: args.projectId,
      metrics: args.metrics,
      featured: args.featured ?? false,
    });
    return storyId;
  },
});

/**
 * List impact stories for the feed. Most recent first. Optionally filter by featured.
 * Returns author name and optional project/asset titles for display.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    featuredOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { limit = 20, featuredOnly }) => {
    let q = ctx.db.query("impactStories").order("desc");
    if (featuredOnly) {
      q = q.filter((q) => q.eq(q.field("featured"), true));
    }
    const stories = await q.take(limit);

    const results = await Promise.all(
      stories.map(async (story) => {
        const author = await ctx.db.get(story.userId);
        let projectTitle: string | undefined;
        let assetTitle: string | undefined;
        if (story.projectId) {
          const project = await ctx.db.get(story.projectId);
          projectTitle = project?.title;
        }
        if (story.assetId) {
          const asset = await ctx.db.get(story.assetId);
          assetTitle = asset?.title;
        }
        return {
          _id: story._id,
          _creationTime: story._creationTime,
          headline: story.headline,
          storyText: story.storyText,
          metrics: story.metrics,
          featured: story.featured,
          assetId: story.assetId,
          projectId: story.projectId,
          authorName: author?.fullName ?? author?.email ?? "Unknown",
          projectTitle,
          assetTitle,
        };
      })
    );
    return results;
  },
});
