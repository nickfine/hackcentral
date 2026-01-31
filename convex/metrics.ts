import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  library_asset: "Library Asset",
  project_ai_artefact: "Project AI Artefact",
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
