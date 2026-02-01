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
