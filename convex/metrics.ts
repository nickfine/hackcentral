import { query } from "./_generated/server";

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
