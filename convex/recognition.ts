import { query } from "./_generated/server";

const BADGE_LABELS: Record<string, string> = {
  mentor_champion: "Mentor Champion",
  most_verified: "Verifier",
  most_reused: "Most Reused",
};

/**
 * Derived badges for the current user (last 30 days). Computed from existing data;
 * no write to recognitionBadges table. Used for "Your recognition" on Dashboard/Profile.
 */
export const getDerivedBadgesForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) return [];

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const badges: { badgeType: string; label: string; metricValue: number }[] = [];

    // Mentor champion: completed mentor sessions (as mentor) in last 30 days
    const mentorRequests = await ctx.db
      .query("mentorRequests")
      .withIndex("by_mentor", (q) => q.eq("mentorId", profile._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("_creationTime"), thirtyDaysAgo)
        )
      )
      .collect();
    if (mentorRequests.length >= 1) {
      badges.push({
        badgeType: "mentor_champion",
        label: BADGE_LABELS.mentor_champion,
        metricValue: mentorRequests.length,
      });
    }

    // Most verified: assets verified by this user (any time)
    const allAssets = await ctx.db.query("libraryAssets").collect();
    const verifiedCount = allAssets.filter(
      (a) => a.verifiedById === profile._id
    ).length;
    if (verifiedCount >= 1) {
      badges.push({
        badgeType: "most_verified",
        label: BADGE_LABELS.most_verified,
        metricValue: verifiedCount,
      });
    }

    // Most reused: total reuse events on assets authored by this user (last 30 days)
    const myAssets = allAssets.filter((a) => a.authorId === profile._id);
    let totalReuse = 0;
    const events = await ctx.db
      .query("libraryReuseEvents")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();
    const myAssetIds = new Set(myAssets.map((a) => a._id));
    for (const e of events) {
      if (myAssetIds.has(e.assetId)) totalReuse += 1;
    }
    if (totalReuse >= 1) {
      badges.push({
        badgeType: "most_reused",
        label: BADGE_LABELS.most_reused,
        metricValue: totalReuse,
      });
    }

    return badges;
  },
});
