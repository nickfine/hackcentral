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
    isAdmin: v.optional(v.boolean()), // Set manually in Convex dashboard
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
    .index("by_code", ["code"]),

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
    // Status: 'in_progress' | 'verified' | 'deprecated'
    status: v.union(
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
    // Live demo URL for apps
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
    .index("by_author", ["authorId"]),

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

  // ============================================================================
  // PAIN POINTS
  // ============================================================================
  painPoints: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    submitterName: v.string(),
    submittedByUserId: v.optional(v.id("profiles")),
    effortEstimate: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    impactEstimate: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    reactionCount: v.number(),
    isHidden: v.boolean(),
    eventId: v.optional(v.string()),
    legacySource: v.optional(v.string()),
    legacySourceId: v.optional(v.string()),
    originalCreatedAt: v.optional(v.number()),
  })
    .index("by_reactions", ["reactionCount"])
    .index("by_hidden", ["isHidden"])
    .index("by_hidden_reactions", ["isHidden", "reactionCount"])
    .index("by_event_hidden", ["eventId", "isHidden"])
    .index("by_event_hidden_reactions", ["eventId", "isHidden", "reactionCount"])
    .index("by_legacy_source", ["legacySource", "legacySourceId"]),

  // Per-user reactions (one per accountId per pain point)
  painPointReactions: defineTable({
    painPointId: v.id("painPoints"),
    reactorId: v.string(), // Atlassian account ID
  })
    .index("by_pain_point_reactor", ["painPointId", "reactorId"])
    .index("by_pain_point", ["painPointId"]),

  // Many-to-many: teams (Supabase) <-> pain points (Convex)
  teamPainPoints: defineTable({
    teamId: v.string(),
    eventId: v.string(),
    painPointId: v.id("painPoints"),
    assignedByUserId: v.optional(v.id("profiles")),
  })
    .index("by_team", ["teamId"])
    .index("by_pain_point", ["painPointId"]),

  // ============================================================================
  // HACKS (permanent record of every child HackDay submission)
  // ============================================================================
  hacks: defineTable({
    // Snapshot fields captured at submission time
    title: v.string(),
    description: v.optional(v.string()),
    teamName: v.string(),
    memberNames: v.array(v.string()),
    hackDayName: v.optional(v.string()),
    hackDayDate: v.optional(v.string()),

    // Delivery links
    demoVideoUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    liveDemoUrl: v.optional(v.string()),

    // Cross-reference to Supabase entities
    projectId: v.string(),           // Supabase Project.id — dedup key
    eventId: v.optional(v.string()), // Supabase event ID
    teamId: v.optional(v.string()),  // Supabase team ID

    // Optional linkage to a pain point
    painPointId: v.optional(v.id("painPoints")),

    // Submission metadata
    submitterName: v.optional(v.string()),
    submittedByUserId: v.optional(v.id("profiles")),
    isHidden: v.boolean(),
    submittedAt: v.number(),
  })
    .index("by_project_id", ["projectId"])
    .index("by_hidden", ["isHidden"])
    .index("by_hidden_submitted", ["isHidden", "submittedAt"])
    .index("by_event_hidden", ["eventId", "isHidden"])
    .index("by_event_hidden_submitted", ["eventId", "isHidden", "submittedAt"]),

  // ============================================================================
  // HELP REQUESTS (Bulletin Board)
  // ============================================================================
  helpRequests: defineTable({
    authorId: v.id("profiles"),
    title: v.string(),
    description: v.string(),
    // Category: 'technical' | 'guidance' | 'collaboration' | 'other'
    category: v.optional(
      v.union(
        v.literal("technical"),
        v.literal("guidance"),
        v.literal("collaboration"),
        v.literal("other")
      )
    ),
    // Status: 'open' | 'resolved'
    status: v.union(
      v.literal("open"),
      v.literal("resolved")
    ),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

  // ============================================================================
  // LEARNINGS & MEMORIES
  // ============================================================================
  learnings: defineTable({
    filename: v.string(),
    content: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    authorAccountId: v.string(),
    authorName: v.string(),
    likeCount: v.optional(v.number()),
    likedBy: v.optional(v.array(v.string())),
  })
    .index("by_author", ["authorAccountId"]),
});
