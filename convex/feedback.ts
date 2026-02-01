import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create feedback (in-app user feedback). Optional userId when authenticated.
 */
export const create = mutation({
  args: {
    message: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { message, category }) => {
    const trimmed = message.trim();
    if (!trimmed) throw new Error("Message is required");
    if (trimmed.length > 5000) throw new Error("Message must be 5000 characters or less");

    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;
    if (identity) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
      if (profile) userId = profile._id;
    }
    await ctx.db.insert("feedback", {
      userId,
      message: trimmed,
      category: category?.trim() || undefined,
    });
  },
});

/**
 * List feedback (admin-only; not exposed in app initially).
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    // Optional: restrict to admin by email or role; for now allow any authenticated user to list
    const all = await ctx.db.query("feedback").collect();
    return all.sort((a, b) => b._creationTime - a._creationTime).slice(0, 100);
  },
});
