import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  library_asset: "Library Asset",
  project_ai_artefact: "Project AI asset",
  verification: "Verification",
  improvement: "Improvement",
};

/**
 * Dashboard metrics: org-wide counts and percentages for the AI Maturity Dashboard.
 * Single query returns all numbers in one round-trip.
 */
export const getDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // AI contributors (last 30 days): unique userId from aiContributions
    const contributions30d = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();
    const aiContributorCount = new Set(contributions30d.map((c) => c.userId)).size;

    // Total profiles for percentage
    const allProfiles = await ctx.db.query("profiles").collect();
    const totalProfiles = allProfiles.length;
    const aiContributorPercentage =
      totalProfiles > 0 ? (aiContributorCount / totalProfiles) * 100 : 0;

    // Projects with AI: projects that have at least one projectLibraryAsset
    const allProjects = await ctx.db.query("projects").collect();
    const projectCount = allProjects.length;
    const projectAssets = await ctx.db.query("projectLibraryAssets").collect();
    const projectsWithAiIds = new Set(projectAssets.map((a) => a.projectId));
    const projectsWithAiCount = projectsWithAiIds.size;
    const projectsWithAiPercentage =
      projectCount > 0 ? (projectsWithAiCount / projectCount) * 100 : 0;

    // Library assets count
    const allAssets = await ctx.db.query("libraryAssets").collect();
    const libraryAssetCount = allAssets.length;

    // Weekly active: unique contributors in last 7 days
    const contributions7d = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), sevenDaysAgo))
      .collect();
    const weeklyActiveCount = new Set(contributions7d.map((c) => c.userId)).size;

    return {
      aiContributorCount,
      aiContributorPercentage,
      projectCount,
      projectsWithAiCount,
      projectsWithAiPercentage,
      libraryAssetCount,
      weeklyActiveCount,
    };
  },
});

/**
 * Activity pulse for Live Activity Pulse widget: new assets this week, reuses in last 24h, weekly active.
 * Used for real-time freshness copy and soft pulse animation.
 */
export const getActivityPulse = query({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const assets = await ctx.db.query("libraryAssets").collect();
    const newAssetsThisWeek = assets.filter((a) => a._creationTime >= sevenDaysAgo).length;

    const reuseEvents = await ctx.db.query("libraryReuseEvents").collect();
    const reusesLast24h = reuseEvents.filter((e) => e._creationTime >= oneDayAgo).length;

    const contributions7d = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), sevenDaysAgo))
      .collect();
    const weeklyActiveCount = new Set(contributions7d.map((c) => c.userId)).size;

    return {
      newAssetsThisWeek,
      reusesLast24h,
      weeklyActiveCount,
    };
  },
});

/**
 * Recent activity feed for dashboard: latest contributions with user and optional asset/project info.
 */
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const contributions = await ctx.db
      .query("aiContributions")
      .order("desc")
      .take(15);

    const results = await Promise.all(
      contributions.map(async (c) => {
        const profile = await ctx.db.get(c.userId);
        let assetTitle: string | undefined;
        let projectName: string | undefined;
        if (c.assetId) {
          const asset = await ctx.db.get(c.assetId);
          assetTitle = asset?.title;
        }
        if (c.projectId) {
          const project = await ctx.db.get(c.projectId);
          projectName = project?.title;
        }
        const typeLabel =
          CONTRIBUTION_TYPE_LABELS[c.contributionType] ?? c.contributionType;
        return {
          _id: c._id,
          _creationTime: c._creationTime,
          typeLabel,
          userName: profile?.fullName ?? profile?.email ?? "Unknown",
          assetTitle,
          projectName,
        };
      })
    );
    return results;
  },
});

/**
 * Top contributors in the last 30 days (by contribution count) for dashboard leaderboard.
 */
export const getTopContributors = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const contributions = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();

    const countByUser = new Map<Id<"profiles">, number>();
    for (const c of contributions) {
      const key = c.userId;
      countByUser.set(key, (countByUser.get(key) ?? 0) + 1);
    }

    const sorted = [...countByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const results = await Promise.all(
      sorted.map(async ([userId, count]) => {
        const profile = await ctx.db.get(userId);
        return {
          userId,
          name: profile?.fullName ?? profile?.email ?? "Unknown",
          count,
        };
      })
    );
    return results;
  },
});

/**
 * Top mentors in the last 30 days (by completed mentor sessions).
 */
export const getTopMentors = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const requests = await ctx.db
      .query("mentorRequests")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("_creationTime"), thirtyDaysAgo)
        )
      )
      .collect();

    const countByMentor = new Map<Id<"profiles">, number>();
    for (const r of requests) {
      countByMentor.set(r.mentorId, (countByMentor.get(r.mentorId) ?? 0) + 1);
    }

    const sorted = [...countByMentor.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const results = await Promise.all(
      sorted.map(async ([mentorId, count]) => {
        const profile = await ctx.db.get(mentorId);
        return {
          mentorId,
          name: profile?.fullName ?? profile?.email ?? "Unknown",
          count,
        };
      })
    );
    return results;
  },
});

/**
 * Most reused library assets in the last 30 days (by reuse event count).
 * Returns only assets that are public or org-visible (no private asset titles).
 */
export const getMostReusedAssets = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const identity = await ctx.auth.getUserIdentity();
    const events = await ctx.db
      .query("libraryReuseEvents")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();

    const countByAsset = new Map<Id<"libraryAssets">, number>();
    for (const e of events) {
      countByAsset.set(e.assetId, (countByAsset.get(e.assetId) ?? 0) + 1);
    }

    const sorted = [...countByAsset.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const results: { assetId: Id<"libraryAssets">; title: string; count: number }[] = [];
    for (const [assetId, count] of sorted) {
      const asset = await ctx.db.get(assetId);
      if (!asset) continue;
      const visible =
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity);
      if (visible) {
        results.push({ assetId, title: asset.title, count });
      }
    }
    return results;
  },
});

/**
 * Early adopter concentration (Gini coefficient) for last 30 days.
 * Population: profiles created in last 90 days (proxy for "active users").
 * Measure: contribution events per user from aiContributions in last 30 days.
 * G = (2 * Σ(i * y_i)) / (n * Σ(y_i)) - (n + 1) / n; y_i sorted ascending.
 * Returns value in [0, 1]. Lower = more even distribution.
 */
export const getEarlyAdopterGini = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const allProfiles = await ctx.db.query("profiles").collect();
    const activeUsers = allProfiles.filter((p) => p._creationTime >= ninetyDaysAgo);
    if (activeUsers.length === 0) return 0;

    const contributions = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();

    const contributionCounts = new Map<Id<"profiles">, number>();
    for (const c of contributions) {
      contributionCounts.set(
        c.userId,
        (contributionCounts.get(c.userId) ?? 0) + 1
      );
    }

    const userContributions = activeUsers.map((user) => ({
      userId: user._id,
      count: contributionCounts.get(user._id) ?? 0,
    }));
    userContributions.sort((a, b) => a.count - b.count);

    const n = userContributions.length;
    const totalContributions = userContributions.reduce((sum, u) => sum + u.count, 0);
    if (totalContributions === 0) return 0;

    let sumRankTimesCount = 0;
    userContributions.forEach((u, index) => {
      const rank = index + 1;
      sumRankTimesCount += rank * u.count;
    });

    const gini =
      (2.0 * sumRankTimesCount) / (n * totalContributions) - (n + 1.0) / n;
    return Math.max(0, Math.min(1, gini));
  },
});

/**
 * Frontline vs leader contribution gap (last 30 days).
 * Segment by experienceLevel: leader = power_user | expert; frontline = newbie | curious | comfortable; other = unset/other.
 * Returns contribution counts and active user counts per segment for Dashboard and export.
 */
export const getFrontlineLeaderGap = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const allProfiles = await ctx.db.query("profiles").collect();
    const activeProfiles = allProfiles.filter((p) => p._creationTime >= ninetyDaysAgo);

    const contributions = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();

    const contributionCountByUser = new Map<Id<"profiles">, number>();
    for (const c of contributions) {
      contributionCountByUser.set(
        c.userId,
        (contributionCountByUser.get(c.userId) ?? 0) + 1
      );
    }

    let frontlineContributions = 0;
    let leaderContributions = 0;
    let frontlineUsers = 0;
    let leaderUsers = 0;
    let otherContributions = 0;
    let otherUsers = 0;

    for (const profile of activeProfiles) {
      const count = contributionCountByUser.get(profile._id) ?? 0;
      const level = profile.experienceLevel;
      if (level === "power_user" || level === "expert") {
        leaderContributions += count;
        if (count > 0) leaderUsers += 1;
      } else if (level === "newbie" || level === "curious" || level === "comfortable") {
        frontlineContributions += count;
        if (count > 0) frontlineUsers += 1;
      } else {
        otherContributions += count;
        if (count > 0) otherUsers += 1;
      }
    }

    return {
      frontlineContributions,
      leaderContributions,
      otherContributions,
      frontlineUsers,
      leaderUsers,
      otherUsers,
      frontlineTotalUsers: activeProfiles.filter(
        (p) =>
          p.experienceLevel === "newbie" ||
          p.experienceLevel === "curious" ||
          p.experienceLevel === "comfortable"
      ).length,
      leaderTotalUsers: activeProfiles.filter(
        (p) => p.experienceLevel === "power_user" || p.experienceLevel === "expert"
      ).length,
      otherTotalUsers: activeProfiles.filter(
        (p) =>
          !p.experienceLevel ||
          !["newbie", "curious", "comfortable", "power_user", "expert"].includes(
            p.experienceLevel
          )
      ).length,
    };
  },
});

/**
 * Assets that have reached the reuse threshold (graduated).
 * Returns assets with total reuse count >= minReuses (default 10).
 * Only returns public/org-visible assets.
 */
export const getGraduatedAssets = query({
  args: {
    minReuses: v.optional(v.number()),
  },
  handler: async (ctx, { minReuses = 10 }) => {
    const identity = await ctx.auth.getUserIdentity();
    const events = await ctx.db.query("libraryReuseEvents").collect();
    const countByAsset = new Map<Id<"libraryAssets">, number>();
    for (const e of events) {
      countByAsset.set(e.assetId, (countByAsset.get(e.assetId) ?? 0) + 1);
    }
    const graduatedIds = [...countByAsset.entries()]
      .filter(([, count]) => count >= minReuses)
      .sort((a, b) => b[1] - a[1])
      .map(([assetId]) => assetId);

    const results: { assetId: Id<"libraryAssets">; title: string; reuseCount: number }[] = [];
    for (const assetId of graduatedIds) {
      const asset = await ctx.db.get(assetId);
      if (!asset) continue;
      const visible =
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity);
      if (visible) {
        results.push({
          assetId,
          title: asset.title,
          reuseCount: countByAsset.get(assetId) ?? 0,
        });
      }
    }
    return results;
  },
});

const FRONTLINE_LEVELS = ["newbie", "curious", "comfortable"] as const;

export type FeaturedHack = {
  type: "asset" | "story";
  id: string;
  title: string;
  blurb: string;
  authorName: string;
  authorLevel?: string;
  reuseCount: number;
  isRisingStar: boolean;
  _creationTime: number;
  assetId?: Id<"libraryAssets">;
  storyId?: Id<"impactStories">;
};

/**
 * Unified featured hacks for showcase: high-reuse assets + recent impact stories.
 * Sort: highest reuse first, then recent. Rising Star = frontline level or fewer than 3 total contributions.
 */
export const getFeaturedHacks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 10 }): Promise<FeaturedHack[]> => {
    const identity = await ctx.auth.getUserIdentity();

    // Contribution count per user (for Rising Star: total contributions < 3)
    const allContributions = await ctx.db.query("aiContributions").collect();
    const contributionCountByUser = new Map<Id<"profiles">, number>();
    for (const c of allContributions) {
      contributionCountByUser.set(
        c.userId,
        (contributionCountByUser.get(c.userId) ?? 0) + 1
      );
    }

    // Reuse count per asset (all time for showcase)
    const reuseEvents = await ctx.db.query("libraryReuseEvents").collect();
    const reuseCountByAsset = new Map<Id<"libraryAssets">, number>();
    for (const e of reuseEvents) {
      reuseCountByAsset.set(
        e.assetId,
        (reuseCountByAsset.get(e.assetId) ?? 0) + 1
      );
    }

    const hacks: FeaturedHack[] = [];

    // 1. Library assets (visible: public or org when authenticated)
    const assets = await ctx.db.query("libraryAssets").collect();
    let currentProfile: { _id: Id<"profiles">; fullName?: string; email?: string; experienceLevel?: string } | null = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    for (const asset of assets) {
      const isAuthor = currentProfile && asset.authorId === currentProfile._id;
      const visible =
        asset.visibility === "public" ||
        (asset.visibility === "org" && identity) ||
        (asset.visibility === "private" && isAuthor);
      if (!visible) continue;

      const author = await ctx.db.get(asset.authorId);
      const authorName = asset.isAnonymous
        ? "Anonymous"
        : (author?.fullName ?? author?.email ?? "Unknown");
      const authorLevel = author?.experienceLevel;
      const totalContributions = contributionCountByUser.get(asset.authorId) ?? 0;
      const isRisingStar =
        (authorLevel && FRONTLINE_LEVELS.includes(authorLevel as typeof FRONTLINE_LEVELS[number])) ||
        totalContributions < 3;

      const reuseCount = reuseCountByAsset.get(asset._id) ?? 0;
      const blurb =
        asset.description?.slice(0, 120) ||
        `Reusable ${asset.assetType.replace("_", " ")} — battle-tested in ${reuseCount} project${reuseCount !== 1 ? "s" : ""}.`;

      hacks.push({
        type: "asset",
        id: asset._id,
        title: asset.title,
        blurb: blurb + (asset.description && asset.description.length > 120 ? "…" : ""),
        authorName,
        authorLevel,
        reuseCount,
        isRisingStar,
        _creationTime: asset._creationTime,
        assetId: asset._id,
      });
    }

    // 2. Impact stories
    const stories = await ctx.db.query("impactStories").order("desc").take(20);
    for (const story of stories) {
      const author = await ctx.db.get(story.userId);
      const authorName = author?.fullName ?? author?.email ?? "Unknown";
      const authorLevel = author?.experienceLevel;
      const totalContributions = contributionCountByUser.get(story.userId) ?? 0;
      const isRisingStar =
        (authorLevel && FRONTLINE_LEVELS.includes(authorLevel as typeof FRONTLINE_LEVELS[number])) ||
        totalContributions < 3;

      let reuseCount = 0;
      if (story.assetId) {
        reuseCount = reuseCountByAsset.get(story.assetId) ?? 0;
      }

      let blurb = story.storyText?.slice(0, 120) ?? story.headline;
      if (story.metrics?.timeSaved != null) {
        blurb = `Saved ~${story.metrics.timeSaved}h/week — ${blurb.slice(0, 80)}`;
      }
      if (blurb.length > 120) blurb = blurb.slice(0, 117) + "…";

      hacks.push({
        type: "story",
        id: story._id,
        title: story.headline,
        blurb,
        authorName,
        authorLevel,
        reuseCount,
        isRisingStar,
        _creationTime: story._creationTime,
        storyId: story._id,
        assetId: story.assetId,
      });
    }

    // Sort: reuse desc, then creation time desc; cap at limit
    hacks.sort((a, b) => {
      if (b.reuseCount !== a.reuseCount) return b.reuseCount - a.reuseCount;
      return b._creationTime - a._creationTime;
    });

    return hacks.slice(0, limit);
  },
});
