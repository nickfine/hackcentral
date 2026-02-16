import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type ProfileDoc = Doc<"profiles"> | null;
type Identity = Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>;

async function getCurrentProfile(
  ctx: QueryCtx,
  identity: Identity
): Promise<ProfileDoc> {
  if (!identity) return null;
  return await ctx.db
    .query("profiles")
    .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
    .first();
}

async function listVisibleProjects(
  ctx: QueryCtx,
  identity: Identity,
  currentProfile: ProfileDoc,
  limit?: number
) {
  const seen = new Set<Id<"projects">>();
  const visible: Doc<"projects">[] = [];
  const memberProjectIds = new Set<Id<"projects">>();

  const addProject = (project: Doc<"projects"> | null) => {
    if (!project || seen.has(project._id)) return;
    seen.add(project._id);
    visible.push(project);
  };

  const publicProjects = await ctx.db
    .query("projects")
    .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
    .collect();
  publicProjects.forEach(addProject);

  if (identity) {
    const orgProjects = await ctx.db
      .query("projects")
      .withIndex("by_visibility", (q) => q.eq("visibility", "org"))
      .collect();
    orgProjects.forEach(addProject);
  }

  if (currentProfile) {
    const myProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", currentProfile._id))
      .collect();
    myProjects.forEach(addProject);

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", currentProfile._id))
      .collect();
    memberships.forEach((m) => memberProjectIds.add(m.projectId));
    const memberProjects = await Promise.all(
      [...memberProjectIds].map((projectId) => ctx.db.get(projectId))
    );
    memberProjects
      .filter((project): project is Doc<"projects"> => project != null)
      .forEach(addProject);
  }

  const filtered = visible.filter((project) => {
    if (project.visibility === "public") return true;
    if (project.visibility === "org") return Boolean(identity);
    if (!currentProfile) return false;
    return project.ownerId === currentProfile._id || memberProjectIds.has(project._id);
  });

  filtered.sort((a, b) => a._creationTime - b._creationTime);
  return limit != null ? filtered.slice(0, limit) : filtered;
}

/**
 * List projects (filtered by visibility)
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const currentProfile = await getCurrentProfile(ctx, identity);
    return await listVisibleProjects(ctx, identity, currentProfile);
  },
});

/**
 * List projects with comment/support counts and current user's like/offer-help state.
 * Same visibility as list; one query for the Projects page. Optional limit for pagination.
 */
export const listWithCounts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    const currentProfile = await getCurrentProfile(ctx, identity);
    const projects = await listVisibleProjects(ctx, identity, currentProfile, limit);
    if (projects.length === 0) return [];

    const projectIds = new Set(projects.map((p) => p._id));

    const commentCountByProject = new Map<Id<"projects">, number>();
    const comments = await ctx.db.query("projectComments").collect();
    for (const comment of comments) {
      if (!projectIds.has(comment.projectId)) continue;
      commentCountByProject.set(
        comment.projectId,
        (commentCountByProject.get(comment.projectId) ?? 0) + 1
      );
    }

    const likeCountByProject = new Map<Id<"projects">, number>();
    const helpCountByProject = new Map<Id<"projects">, number>();
    const userLikedProjects = new Set<Id<"projects">>();
    const userHelpProjects = new Set<Id<"projects">>();
    const supportEvents = await ctx.db.query("projectSupportEvents").collect();
    for (const event of supportEvents) {
      if (!projectIds.has(event.projectId)) continue;
      if (event.supportType === "like") {
        likeCountByProject.set(
          event.projectId,
          (likeCountByProject.get(event.projectId) ?? 0) + 1
        );
      } else if (event.supportType === "offer_help") {
        helpCountByProject.set(
          event.projectId,
          (helpCountByProject.get(event.projectId) ?? 0) + 1
        );
      }

      if (!currentProfile || event.supporterId !== currentProfile._id) continue;
      if (event.supportType === "like") userLikedProjects.add(event.projectId);
      if (event.supportType === "offer_help") userHelpProjects.add(event.projectId);
    }

    const attachedAssetCountByProject = new Map<Id<"projects">, number>();
    const projectAssets = await ctx.db.query("projectLibraryAssets").collect();
    for (const assetLink of projectAssets) {
      if (!projectIds.has(assetLink.projectId)) continue;
      attachedAssetCountByProject.set(
        assetLink.projectId,
        (attachedAssetCountByProject.get(assetLink.projectId) ?? 0) + 1
      );
    }

    return projects.map((project) => ({
      ...project,
      commentCount: commentCountByProject.get(project._id) ?? 0,
      likeCount: likeCountByProject.get(project._id) ?? 0,
      helpOfferCount: helpCountByProject.get(project._id) ?? 0,
      userLiked: userLikedProjects.has(project._id),
      userOfferedHelp: userHelpProjects.has(project._id),
      attachedAssetsCount: attachedAssetCountByProject.get(project._id) ?? 0,
    }));
  },
});

/**
 * Get project by ID
 */
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let currentProfile = null;
    if (identity) {
      currentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
        .first();
    }

    const isOwner = currentProfile && project.ownerId === currentProfile._id;
    const isMember = currentProfile
      ? await ctx.db
          .query("projectMembers")
          .withIndex("by_project_and_user", (q) =>
            q.eq("projectId", project._id).eq("userId", currentProfile._id)
          )
          .first()
      : null;

    // Check visibility
    if (
      project.visibility === "public" ||
      (project.visibility === "org" && identity) ||
      (project.visibility === "private" && (isOwner || isMember))
    ) {
      const owner = await ctx.db.get(project.ownerId);
      return {
        ...project,
        ownerFullName: owner?.fullName ?? owner?.email ?? "Unknown",
      };
    }

    return null;
  },
});

/**
 * Create a new project
 */
const hackTypeValidator = v.optional(
  v.union(
    v.literal("prompt"),
    v.literal("skill"),
    v.literal("app")
  )
);

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    visibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("org"),
        v.literal("public")
      )
    ),
    isAnonymous: v.optional(v.boolean()),
    hackType: hackTypeValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      status: "idea",
      ownerId: profile._id,
      visibility: args.visibility || "private",
      isAnonymous: args.isAnonymous || false,
      workflowTransformed: false,
      hackType: args.hackType,
    });

    return projectId;
  },
});

/**
 * Update project
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("idea"),
        v.literal("building"),
        v.literal("incubation"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    aiImpactHypothesis: v.optional(v.string()),
    aiToolsUsed: v.optional(v.array(v.string())),
    timeSavedEstimate: v.optional(v.number()),
    failuresAndLessons: v.optional(v.string()),
    workflowTransformed: v.optional(v.boolean()),
    visibility: v.optional(
      v.union(
        v.literal("private"),
        v.literal("org"),
        v.literal("public")
      )
    ),
    readinessCompletedAt: v.optional(v.number()),
    riskCheckNotes: v.optional(v.string()),
    sponsorCommittedAt: v.optional(v.number()),
    hackType: hackTypeValidator,
  },
  handler: async (ctx, { projectId, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!profile || project.ownerId !== profile._id) {
      throw new Error("Not authorized");
    }

    const newStatus = updates.status;
    if (newStatus === "building") {
      const hasReadiness =
        project.readinessCompletedAt != null ||
        updates.readinessCompletedAt != null;
      if (!hasReadiness) {
        throw new Error(
          "Complete the AI readiness check before moving to Building (impact hypothesis and risk check)."
        );
      }
    }
    if (newStatus === "incubation") {
      const hasSponsor =
        project.sponsorCommittedAt != null ||
        updates.sponsorCommittedAt != null;
      if (!hasSponsor) {
        throw new Error(
          "Sponsor commitment is required before moving to Incubation."
        );
      }
    }

    await ctx.db.patch(projectId, updates);
  },
});
