import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type AssetType = "prompt" | "skill" | "app";
type ProjectStatus = "idea" | "building" | "incubation" | "completed" | "archived";
type ExperienceLevel = "newbie" | "curious" | "comfortable" | "power_user" | "expert";

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  newbie: "Newbie",
  curious: "AI Curious",
  comfortable: "Comfortable",
  power_user: "Power User",
  expert: "Expert",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Idea",
  building: "Building",
  incubation: "Incubation",
  completed: "Completed",
  archived: "Archived",
};

function toForgeUserId(siteUrl: string, accountId: string): string {
  const normalizedSite = siteUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9.-]/g, "_");
  return `forge:${normalizedSite}:${accountId}`;
}

async function ensureForgeProfile(
  ctx: MutationCtx,
  forgeAccountId: string,
  forgeSiteUrl: string
) {
  const userId = toForgeUserId(forgeSiteUrl, forgeAccountId);
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing;

  const safeAccount = forgeAccountId.replace(/[^a-zA-Z0-9._-]/g, "_");
  const profileId = await ctx.db.insert("profiles", {
    userId,
    email: `${safeAccount}@forge.local`,
    fullName: `Atlassian User ${forgeAccountId.slice(0, 8)}`,
    mentorCapacity: 0,
    mentorSessionsUsed: 0,
    profileVisibility: "org",
    capabilityTags: [],
  });
  const created = await ctx.db.get(profileId);
  if (!created) {
    throw new Error("Unable to create Forge profile.");
  }
  return created;
}

export const getGlobalPageData = query({
  args: {},
  handler: async (ctx) => {
    const [profiles, capabilityTags, assets, reuseEvents, projects, projectAssets, projectComments] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("capabilityTags").collect(),
      ctx.db.query("libraryAssets").collect(),
      ctx.db.query("libraryReuseEvents").collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("projectLibraryAssets").collect(),
      ctx.db.query("projectComments").collect(),
    ]);

    const tagLabelById = new Map<Id<"capabilityTags">, string>();
    for (const tag of capabilityTags) {
      tagLabelById.set(tag._id, tag.displayLabel);
    }

    const visibleProfiles = profiles.filter((profile) => profile.profileVisibility !== "private");
    const profileById = new Map(visibleProfiles.map((profile) => [profile._id, profile]));

    const visibleAssets = assets.filter(
      (asset) => asset.visibility !== "private" && asset.status !== "deprecated"
    );
    const visibleAssetIds = new Set(visibleAssets.map((asset) => asset._id));

    const reuseCountByAsset = new Map<Id<"libraryAssets">, number>();
    for (const event of reuseEvents) {
      if (!visibleAssetIds.has(event.assetId)) continue;
      reuseCountByAsset.set(
        event.assetId,
        (reuseCountByAsset.get(event.assetId) ?? 0) + 1
      );
    }

    const featuredHacks = visibleAssets
      .filter((asset) => asset.isArsenal)
      .map((asset) => ({
        id: asset._id,
        title: asset.title,
        description: asset.description ?? "",
        assetType: asset.assetType as AssetType,
        status: asset.status,
        reuseCount: reuseCountByAsset.get(asset._id) ?? 0,
        authorName: asset.isAnonymous
          ? "Anonymous"
          : profileById.get(asset.authorId)?.fullName ??
            profileById.get(asset.authorId)?.email ??
            "Unknown",
        visibility: asset.visibility,
        intendedUser: asset.metadata?.intendedUser ?? null,
        context: asset.metadata?.context ?? null,
        limitations: asset.metadata?.limitations ?? null,
        riskNotes: asset.metadata?.riskNotes ?? null,
        sourceRepoUrl: asset.sourceRepo?.url ?? null,
        demoUrl: asset.demoUrl ?? null,
      }))
      .sort((a, b) => {
        if (b.reuseCount !== a.reuseCount) return b.reuseCount - a.reuseCount;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 8);

    const visibleProjects = projects.filter((project) => project.visibility !== "private");
    const projectAssetCountById = new Map<Id<"projects">, number>();
    for (const link of projectAssets) {
      projectAssetCountById.set(
        link.projectId,
        (projectAssetCountById.get(link.projectId) ?? 0) + 1
      );
    }

    const projectCommentCountById = new Map<Id<"projects">, number>();
    for (const comment of projectComments) {
      projectCommentCountById.set(
        comment.projectId,
        (projectCommentCountById.get(comment.projectId) ?? 0) + 1
      );
    }

    const inProgressProjects = visibleProjects.filter((project) =>
      ["idea", "building", "incubation"].includes(project.status)
    );

    const recentProjects = inProgressProjects
      .slice()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 8)
      .map((project) => ({
        id: project._id,
        title: project.title,
        description: project.description ?? "",
        status: project.status,
        statusLabel: STATUS_LABELS[project.status as ProjectStatus] ?? project.status,
        hackType: project.hackType ?? null,
        ownerName: profileById.get(project.ownerId)?.fullName ??
          profileById.get(project.ownerId)?.email ??
          "Unknown",
        attachedHacksCount: projectAssetCountById.get(project._id) ?? 0,
        commentCount: projectCommentCountById.get(project._id) ?? 0,
        visibility: project.visibility,
        workflowTransformed: project.workflowTransformed,
        aiImpactHypothesis: project.aiImpactHypothesis ?? null,
        aiToolsUsed: project.aiToolsUsed ?? [],
        timeSavedEstimate: project.timeSavedEstimate ?? null,
        failuresAndLessons: project.failuresAndLessons ?? null,
      }));

    const people = visibleProfiles
      .slice()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 12)
      .map((profile) => {
        const capabilities = profile.capabilityTags
          .map((tagId) => tagLabelById.get(tagId))
          .filter((label): label is string => Boolean(label));

        const level = profile.experienceLevel as ExperienceLevel | undefined;
        return {
          id: profile._id,
          fullName: profile.fullName ?? profile.email,
          email: profile.email,
          experienceLevel: level ?? null,
          experienceLabel: level ? EXPERIENCE_LABELS[level] : null,
          mentorCapacity: profile.mentorCapacity,
          mentorSessionsUsed: profile.mentorSessionsUsed,
          mentorSlotsRemaining: Math.max(profile.mentorCapacity - profile.mentorSessionsUsed, 0),
          capabilities,
        };
      });

    const activeMentors = visibleProfiles.filter(
      (profile) => profile.mentorCapacity > profile.mentorSessionsUsed
    ).length;

    return {
      summary: {
        totalPeople: visibleProfiles.length,
        totalHacks: visibleAssets.length,
        featuredHacks: featuredHacks.length,
        inProgressProjects: inProgressProjects.length,
        completedProjects: visibleProjects.filter((project) => project.status === "completed").length,
        activeMentors,
      },
      featuredHacks,
      recentProjects,
      people,
    };
  },
});

export const createHackFromForge = mutation({
  args: {
    forgeAccountId: v.string(),
    forgeSiteUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    assetType: v.union(v.literal("prompt"), v.literal("skill"), v.literal("app")),
    visibility: v.optional(v.union(v.literal("private"), v.literal("org"), v.literal("public"))),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ensureForgeProfile(ctx, args.forgeAccountId, args.forgeSiteUrl);
    const assetId = await ctx.db.insert("libraryAssets", {
      title: args.title,
      description: args.description,
      assetType: args.assetType,
      content: {
        format: "forge_note",
        text: args.content ?? "",
      },
      status: "draft",
      authorId: profile._id,
      visibility: args.visibility ?? "org",
      isArsenal: false,
      isAnonymous: false,
    });

    return { assetId, title: args.title };
  },
});

export const createProjectFromForge = mutation({
  args: {
    forgeAccountId: v.string(),
    forgeSiteUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("org"), v.literal("public"))),
    hackType: v.optional(v.union(v.literal("prompt"), v.literal("skill"), v.literal("app"))),
  },
  handler: async (ctx, args) => {
    const profile = await ensureForgeProfile(ctx, args.forgeAccountId, args.forgeSiteUrl);
    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      status: "idea",
      ownerId: profile._id,
      workflowTransformed: false,
      visibility: args.visibility ?? "org",
      isAnonymous: false,
      hackType: args.hackType,
    });

    return { projectId, title: args.title };
  },
});

export const updateMentorProfileFromForge = mutation({
  args: {
    forgeAccountId: v.string(),
    forgeSiteUrl: v.string(),
    mentorCapacity: v.number(),
    happyToMentor: v.boolean(),
    seekingMentor: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await ensureForgeProfile(ctx, args.forgeAccountId, args.forgeSiteUrl);
    const currentTags = new Set(profile.capabilityTags);

    const happyTag = await ctx.db
      .query("capabilityTags")
      .withIndex("by_code", (q) => q.eq("code", "happy_to_mentor"))
      .first();
    const seekingTag = await ctx.db
      .query("capabilityTags")
      .withIndex("by_code", (q) => q.eq("code", "seeking_mentor"))
      .first();

    if (happyTag?._id) {
      if (args.happyToMentor) currentTags.add(happyTag._id);
      else currentTags.delete(happyTag._id);
    }
    if (seekingTag?._id) {
      if (args.seekingMentor) currentTags.add(seekingTag._id);
      else currentTags.delete(seekingTag._id);
    }

    await ctx.db.patch(profile._id, {
      mentorCapacity: Math.max(0, Math.floor(args.mentorCapacity)),
      capabilityTags: [...currentTags],
    });

    return {
      profileId: profile._id,
      mentorCapacity: Math.max(0, Math.floor(args.mentorCapacity)),
    };
  },
});
