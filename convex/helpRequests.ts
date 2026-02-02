import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new help request
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.optional(
      v.union(
        v.literal("technical"),
        v.literal("guidance"),
        v.literal("collaboration"),
        v.literal("other")
      )
    ),
  },
  handler: async (ctx, { title, description, category }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get author profile
    const authorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!authorProfile) {
      throw new Error("Profile not found");
    }

    const helpRequestId = await ctx.db.insert("helpRequests", {
      authorId: authorProfile._id,
      title: title.trim(),
      description: description.trim(),
      category,
      status: "open",
    });

    return helpRequestId;
  },
});

/**
 * List help requests with optional filters
 */
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("resolved"))),
    category: v.optional(
      v.union(
        v.literal("technical"),
        v.literal("guidance"),
        v.literal("collaboration"),
        v.literal("other")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, category, limit = 50 }) => {
    let requests;

    // Apply status filter if provided
    if (status) {
      requests = await ctx.db
        .query("helpRequests")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
    } else {
      requests = await ctx.db
        .query("helpRequests")
        .order("desc")
        .take(limit);
    }

    // Apply category filter if provided (post-query since we can't use multiple indexes)
    if (category) {
      requests = requests.filter((r) => r.category === category);
    }

    // Enrich with author info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const author = await ctx.db.get(request.authorId);
        return {
          ...request,
          authorName: author?.fullName || author?.email || "Unknown",
          authorAvatarUrl: author?.avatarUrl,
          authorEmail: author?.email,
        };
      })
    );

    return enrichedRequests;
  },
});

/**
 * Get help requests by current user
 */
export const getByCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile) {
      return [];
    }

    const requests = await ctx.db
      .query("helpRequests")
      .withIndex("by_author", (q) => q.eq("authorId", profile._id))
      .order("desc")
      .collect();

    return requests;
  },
});

/**
 * Mark a help request as resolved
 */
export const markResolved = mutation({
  args: {
    requestId: v.id("helpRequests"),
  },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Help request not found");
    }

    // Get current user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Only the author can mark as resolved
    if (request.authorId !== profile._id) {
      throw new Error("Only the author can mark this request as resolved");
    }

    await ctx.db.patch(requestId, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
  },
});

/**
 * Update a help request
 */
export const update = mutation({
  args: {
    requestId: v.id("helpRequests"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("technical"),
        v.literal("guidance"),
        v.literal("collaboration"),
        v.literal("other")
      )
    ),
  },
  handler: async (ctx, { requestId, title, description, category }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Help request not found");
    }

    // Get current user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Only the author can update
    if (request.authorId !== profile._id) {
      throw new Error("Only the author can update this request");
    }

    const updates: Partial<{
      title: string;
      description: string;
      category: "technical" | "guidance" | "collaboration" | "other";
    }> = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;

    await ctx.db.patch(requestId, updates);
  },
});

/**
 * Delete a help request
 */
export const remove = mutation({
  args: {
    requestId: v.id("helpRequests"),
  },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Help request not found");
    }

    // Get current user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Only the author can delete
    if (request.authorId !== profile._id) {
      throw new Error("Only the author can delete this request");
    }

    await ctx.db.delete(requestId);
  },
});
