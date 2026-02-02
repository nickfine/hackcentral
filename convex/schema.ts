import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * HackCentral Database Schema
 * Converted from Supabase PostgreSQL to Convex
 */

export default defineSchema({
  // ============================================================================
  // PROFILES
  // ============================================================================
  profiles: defineTable({
    userId: v.string(), // Auth user ID
    email: v.string(),
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // Experience levels: 'newbie' | 'curious' | 'comfortable' | 'power_user' | 'expert'
    experienceLevel: v.optional(
      v.union(
        v.literal("newbie"),
        v.literal("curious"),
        v.literal("comfortable"),
        v.literal("power_user"),
        v.literal("expert")
      )
    ),
    mentorCapacity: v.number(), // Monthly mentor session limit
    mentorSessionsUsed: v.number(),
    // Visibility: 'private' | 'org' | 'public'
    profileVisibility: v.union(
      v.literal("private"),
      v.literal("org"),
      v.literal("public")
    ),
    capabilityTags: v.array(v.id("capabilityTags")), // References to capability tags
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"])
    .index("by_visibility", ["profileVisibility"]),

  // ============================================================================
  // CAPABILITY TAGS (Controlled Vocabulary)
  // ============================================================================
  capabilityTags: defineTable({
    code: v.string(), // Internal code (e.g., 'ai_early_adopter')
    displayLabel: v.string(), // Display label (e.g., 'AI Early Adopter')
    category: v.optional(v.string()), // Optional grouping
    displayOrder: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_category", ["category"]),

  // ============================================================================
  // LIBRARY ASSETS
  // ============================================================================
  libraryAssets: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    // Asset types: 'prompt' | 'skill' | 'app'
    assetType: v.union(
      v.literal("prompt"),
      v.literal("skill"),
      v.literal("app")
    ),
    content: v.any(), // Structured content (prompt text, config, etc.)
    // Status: 'in_progress' | 'verified' | 'deprecated' (legacy 'draft' kept until migration runs)
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("verified"),
      v.literal("deprecated")
    ),
    authorId: v.id("profiles"),
    verifiedById: v.optional(v.id("profiles")),
    verifiedAt: v.optional(v.number()), // Timestamp
    metadata: v.optional(
      v.object({
        intendedUser: v.optional(v.string()),
        context: v.optional(v.string()),
        limitations: v.optional(v.string()),
        riskNotes: v.optional(v.string()),
        exampleInput: v.optional(v.string()),
        exampleOutput: v.optional(v.string()),
      })
    ),
    // Visibility: 'private' | 'org' | 'public'
    visibility: v.union(
      v.literal("private"),
      v.literal("org"),
      v.literal("public")
    ),
    isArsenal: v.boolean(), // Curated Featured Hacks flag
    isAnonymous: v.optional(v.boolean()), // Hide author in UI when true
    // Optional repo/source link (GitHub, GitLab, Bitbucket)
    sourceRepo: v.optional(
      v.object({
        url: v.string(),
        platform: v.union(
          v.literal("github"),
          v.literal("gitlab"),
          v.literal("bitbucket")
        ),
        version: v.optional(v.string()),
        updatedAt: v.optional(v.number()),
        repoName: v.optional(v.string()),
        description: v.optional(v.string()),
        commitMessage: v.optional(v.string()),
      })
    ),
    // Live demo URL for apps (e.g. Vercel, Netlify hosted)
    demoUrl: v.optional(v.string()),
  })
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_type", ["assetType"])
    .index("by_visibility", ["visibility"])
    .index("by_arsenal", ["isArsenal"]),

  // ============================================================================
  // PROJECTS
  // ============================================================================
  projects: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    // Status: 'idea' | 'building' | 'incubation' | 'completed' | 'archived'
    status: v.union(
      v.literal("idea"),
      v.literal("building"),
      v.literal("incubation"),
      v.literal("completed"),
      v.literal("archived")
    ),
    ownerId: v.id("profiles"),
    aiImpactHypothesis: v.optional(v.string()), // Required for building stage
    aiToolsUsed: v.optional(v.array(v.string())),
    timeSavedEstimate: v.optional(v.number()), // In hours
    failuresAndLessons: v.optional(v.string()),
    workflowTransformed: v.boolean(), // Maturity proxy
    // Visibility: 'private' | 'org' | 'public'
    visibility: v.union(
      v.literal("private"),
      v.literal("org"),
      v.literal("public")
    ),
    isAnonymous: v.boolean(), // Anonymous submission flag
    // Governance (Phase 3): building readiness, incubation sponsor
    readinessCompletedAt: v.optional(v.number()),
    riskCheckNotes: v.optional(v.string()),
    sponsorCommittedAt: v.optional(v.number()),
    // Hack type: 'prompt' | 'skill' | 'app'
    hackType: v.optional(
      v.union(
        v.literal("prompt"),
        v.literal("skill"),
        v.literal("app")
      )
    ),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_visibility", ["visibility"])
    .index("by_hack_type", ["hackType"]),

  // ============================================================================
  // PROJECT MEMBERS
  // ============================================================================
  projectMembers: defineTable({
    projectId: v.id("projects"),
    userId: v.id("profiles"),
    // Role: 'owner' | 'collaborator' | 'mentor' | 'supporter'
    role: v.union(
      v.literal("owner"),
      v.literal("collaborator"),
      v.literal("mentor"),
      v.literal("supporter")
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_and_user", ["projectId", "userId"]),

  // ============================================================================
  // MENTOR REQUESTS
  // ============================================================================
  mentorRequests: defineTable({
    requesterId: v.id("profiles"),
    mentorId: v.id("profiles"),
    // Status: 'pending' | 'accepted' | 'completed' | 'cancelled'
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    requestedDuration: v.number(), // Minutes
    topic: v.optional(v.string()),
    scheduledAt: v.optional(v.number()), // Timestamp
    completedAt: v.optional(v.number()), // Timestamp
  })
    .index("by_requester", ["requesterId"])
    .index("by_mentor", ["mentorId"])
    .index("by_status", ["status"])
    .index("by_mentor_and_status", ["mentorId", "status"]),

  // ============================================================================
  // PROJECT COMMENTS
  // ============================================================================
  projectComments: defineTable({
    projectId: v.id("projects"),
    authorId: v.id("profiles"),
    content: v.string(),
    isAiRelated: v.boolean(), // Flag for AI-related comments
  })
    .index("by_project", ["projectId"])
    .index("by_author", ["authorId"])
    .index("by_ai_related", ["isAiRelated"]),

  // ============================================================================
  // PROJECT SUPPORT EVENTS
  // ============================================================================
  projectSupportEvents: defineTable({
    projectId: v.id("projects"),
    supporterId: v.id("profiles"),
    // Support type: 'like' | 'offer_help' | 'ai_related_comment' | 'resource_shared'
    supportType: v.union(
      v.literal("like"),
      v.literal("offer_help"),
      v.literal("ai_related_comment"),
      v.literal("resource_shared")
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_supporter", ["supporterId"])
    .index("by_project_and_supporter", ["projectId", "supporterId"])
    .index("by_type", ["supportType"]),

  // ============================================================================
  // LIBRARY REUSE EVENTS
  // ============================================================================
  libraryReuseEvents: defineTable({
    assetId: v.id("libraryAssets"),
    userId: v.id("profiles"),
    projectId: v.optional(v.id("projects")),
    // Reuse type: 'referenced' | 'copied' | 'linked' | 'attached'
    reuseType: v.union(
      v.literal("referenced"),
      v.literal("copied"),
      v.literal("linked"),
      v.literal("attached")
    ),
  })
    .index("by_asset", ["assetId"])
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"]),

  // ============================================================================
  // PROJECT LIBRARY ASSETS (Join Table)
  // ============================================================================
  projectLibraryAssets: defineTable({
    projectId: v.id("projects"),
    assetId: v.id("libraryAssets"),
    attachedBy: v.id("profiles"),
    // Attachment type: 'referenced' | 'copied' | 'linked' | 'attached'
    attachmentType: v.union(
      v.literal("referenced"),
      v.literal("copied"),
      v.literal("linked"),
      v.literal("attached")
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_asset", ["assetId"])
    .index("by_project_and_asset", ["projectId", "assetId"]),

  // ============================================================================
  // AI CONTRIBUTIONS (Metrics Tracking)
  // ============================================================================
  aiContributions: defineTable({
    userId: v.id("profiles"),
    // Contribution type: 'library_asset' | 'project_ai_artefact' | 'verification' | 'improvement'
    contributionType: v.union(
      v.literal("library_asset"),
      v.literal("project_ai_artefact"),
      v.literal("verification"),
      v.literal("improvement")
    ),
    assetId: v.optional(v.id("libraryAssets")),
    projectId: v.optional(v.id("projects")),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["contributionType"])
    .index("by_asset", ["assetId"])
    .index("by_project", ["projectId"]),

  // ============================================================================
  // RECOGNITION BADGES
  // ============================================================================
  recognitionBadges: defineTable({
    userId: v.id("profiles"),
    // Badge type: 'most_reused' | 'most_verified' | 'fastest_pull_through' | 'mentor_champion'
    badgeType: v.union(
      v.literal("most_reused"),
      v.literal("most_verified"),
      v.literal("fastest_pull_through"),
      v.literal("mentor_champion")
    ),
    metricValue: v.number(),
    periodStart: v.number(), // Timestamp
    periodEnd: v.number(), // Timestamp
    validationMetadata: v.optional(v.any()), // Anti-gaming metadata
  })
    .index("by_user", ["userId"])
    .index("by_type", ["badgeType"])
    .index("by_period", ["periodStart", "periodEnd"]),

  // ============================================================================
  // FEEDBACK (Phase 4: user feedback loop)
  // ============================================================================
  feedback: defineTable({
    userId: v.optional(v.id("profiles")),
    message: v.string(),
    category: v.optional(v.string()),
  }),

  // ============================================================================
  // ASSET COPY FEEDBACK (thumbs up/down after copying prompt)
  // ============================================================================
  assetCopyFeedback: defineTable({
    assetId: v.id("libraryAssets"),
    userId: v.optional(v.id("profiles")), // optional for anon
    helpful: v.boolean(),
  }).index("by_asset", ["assetId"]),

  // ============================================================================
  // IMPACT STORIES
  // ============================================================================
  impactStories: defineTable({
    userId: v.id("profiles"),
    assetId: v.optional(v.id("libraryAssets")),
    projectId: v.optional(v.id("projects")),
    headline: v.string(), // e.g., "How Sarah's prompt template saved 12 hours per week"
    storyText: v.optional(v.string()),
    metrics: v.optional(
      v.object({
        timeSaved: v.optional(v.number()),
        errorReduction: v.optional(v.number()),
        throughputGain: v.optional(v.number()),
      })
    ),
    featured: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_asset", ["assetId"])
    .index("by_project", ["projectId"])
    .index("by_featured", ["featured"]),
});
