import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new mentor request
 */
export const create = mutation({
  args: {
    mentorId: v.id("profiles"),
    requestedDuration: v.number(), // Minutes (30, 60, 120)
    topic: v.optional(v.string()),
  },
  handler: async (ctx, { mentorId, requestedDuration, topic }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get requester profile
    const requesterProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!requesterProfile) {
      throw new Error("Profile not found");
    }

    // Validate: Can't request yourself as mentor
    if (requesterProfile._id === mentorId) {
      throw new Error("You cannot request yourself as a mentor");
    }

    // Get mentor profile and check capacity
    const mentorProfile = await ctx.db.get(mentorId);
    if (!mentorProfile) {
      throw new Error("Mentor not found");
    }

    if (mentorProfile.mentorCapacity <= mentorProfile.mentorSessionsUsed) {
      throw new Error("This mentor is fully booked this month");
    }

    // Check for existing pending request between these users
    const existingRequest = await ctx.db
      .query("mentorRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", requesterProfile._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("mentorId"), mentorId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingRequest) {
      throw new Error("You already have a pending request with this mentor");
    }

    // Create the request
    const requestId = await ctx.db.insert("mentorRequests", {
      requesterId: requesterProfile._id,
      mentorId,
      status: "pending",
      requestedDuration,
      topic,
    });

    return requestId;
  },
});

/**
 * Get all mentor requests for the current user as a mentor
 */
export const listForMentor = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, { status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const mentorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!mentorProfile) {
      return [];
    }

    let requestsQuery = ctx.db
      .query("mentorRequests")
      .withIndex("by_mentor", (q) => q.eq("mentorId", mentorProfile._id));

    if (status) {
      requestsQuery = requestsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    const requests = await requestsQuery.collect();

    // Enrich with requester profile info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const requesterProfile = await ctx.db.get(request.requesterId);
        return {
          ...request,
          requester: requesterProfile
            ? {
                _id: requesterProfile._id,
                fullName: requesterProfile.fullName,
                email: requesterProfile.email,
                avatarUrl: requesterProfile.avatarUrl,
                experienceLevel: requesterProfile.experienceLevel,
              }
            : null,
        };
      })
    );

    return enrichedRequests;
  },
});

/**
 * Get all mentor requests from the current user as a requester
 */
export const listForRequester = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, { status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const requesterProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!requesterProfile) {
      return [];
    }

    let requestsQuery = ctx.db
      .query("mentorRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", requesterProfile._id));

    if (status) {
      requestsQuery = requestsQuery.filter((q) => q.eq(q.field("status"), status));
    }

    const requests = await requestsQuery.collect();

    // Enrich with mentor profile info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const mentorProfile = await ctx.db.get(request.mentorId);
        return {
          ...request,
          mentor: mentorProfile
            ? {
                _id: mentorProfile._id,
                fullName: mentorProfile.fullName,
                email: mentorProfile.email,
                avatarUrl: mentorProfile.avatarUrl,
                experienceLevel: mentorProfile.experienceLevel,
              }
            : null,
        };
      })
    );

    return enrichedRequests;
  },
});

/**
 * Get available mentors (mentorCapacity > mentorSessionsUsed)
 */
export const getAvailableMentors = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Get all profiles with public or org visibility
    const profiles = await ctx.db
      .query("profiles")
      .filter((q) =>
        q.or(
          q.eq(q.field("profileVisibility"), "org"),
          q.eq(q.field("profileVisibility"), "public")
        )
      )
      .collect();

    // Filter for available mentors and exclude current user
    const availableMentors = profiles.filter((profile) => {
      const hasCapacity = profile.mentorCapacity > profile.mentorSessionsUsed;
      const isNotCurrentUser = identity ? profile.userId !== identity.subject : true;
      return hasCapacity && isNotCurrentUser;
    });

    return availableMentors.map((profile) => ({
      ...profile,
      availableSlots: profile.mentorCapacity - profile.mentorSessionsUsed,
    }));
  },
});

/**
 * Check if current user has a pending request with a specific mentor
 */
export const hasPendingRequestWith = query({
  args: {
    mentorId: v.id("profiles"),
  },
  handler: async (ctx, { mentorId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const requesterProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!requesterProfile) {
      return false;
    }

    const existingRequest = await ctx.db
      .query("mentorRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", requesterProfile._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("mentorId"), mentorId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    return !!existingRequest;
  },
});

/**
 * Update mentor request status
 */
export const updateStatus = mutation({
  args: {
    requestId: v.id("mentorRequests"),
    newStatus: v.union(
      v.literal("accepted"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, { requestId, newStatus, scheduledAt }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    const currentUserProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!currentUserProfile) {
      throw new Error("Profile not found");
    }

    // Verify user is either the mentor or requester
    const isRequester = request.requesterId === currentUserProfile._id;
    const isMentor = request.mentorId === currentUserProfile._id;

    if (!isRequester && !isMentor) {
      throw new Error("You don't have permission to update this request");
    }

    // Validate status transitions
    if (request.status === "pending") {
      if (newStatus !== "accepted" && newStatus !== "cancelled") {
        throw new Error("Pending requests can only be accepted or cancelled");
      }
      if (newStatus === "accepted" && !isMentor) {
        throw new Error("Only the mentor can accept a request");
      }
    } else if (request.status === "accepted") {
      if (newStatus !== "completed" && newStatus !== "cancelled") {
        throw new Error("Accepted requests can only be completed or cancelled");
      }
    } else {
      throw new Error("This request cannot be updated");
    }

    // If accepting, verify mentor still has capacity
    if (newStatus === "accepted") {
      const mentorProfile = await ctx.db.get(request.mentorId);
      if (!mentorProfile) {
        throw new Error("Mentor not found");
      }
      if (mentorProfile.mentorCapacity <= mentorProfile.mentorSessionsUsed) {
        throw new Error("Mentor no longer has available capacity");
      }
    }

    // Update the request
    const updateData: {
      status: typeof newStatus;
      scheduledAt?: number;
      completedAt?: number;
    } = { status: newStatus };
    
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt;
    }
    if (newStatus === "completed") {
      updateData.completedAt = Date.now();
      
      // Increment mentor's sessions used
      const mentorProfile = await ctx.db.get(request.mentorId);
      if (mentorProfile) {
        await ctx.db.patch(request.mentorId, {
          mentorSessionsUsed: mentorProfile.mentorSessionsUsed + 1,
        });
      }
    }

    await ctx.db.patch(requestId, updateData);
  },
});

/**
 * Cancel a mentor request
 */
export const cancel = mutation({
  args: {
    requestId: v.id("mentorRequests"),
  },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    const currentUserProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!currentUserProfile) {
      throw new Error("Profile not found");
    }

    // Verify user is either the mentor or requester
    const isRequester = request.requesterId === currentUserProfile._id;
    const isMentor = request.mentorId === currentUserProfile._id;

    if (!isRequester && !isMentor) {
      throw new Error("You don't have permission to cancel this request");
    }

    // Can only cancel pending or accepted requests
    if (request.status !== "pending" && request.status !== "accepted") {
      throw new Error("This request cannot be cancelled");
    }

    await ctx.db.patch(requestId, {
      status: "cancelled",
    });
  },
});

/**
 * Notifications for the current user (mentor request accepted/completed).
 * Used by Header bell and /notifications page.
 */
export const getNotificationsForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();
    if (!profile) return [];

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const asRequesterRaw = await ctx.db
      .query("mentorRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", profile._id))
      .collect();
    const asRequester = asRequesterRaw
      .filter(
        (r) =>
          (r.status === "accepted" || r.status === "completed") &&
          r._creationTime >= fourteenDaysAgo
      )
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 10);
    const asMentorRaw = await ctx.db
      .query("mentorRequests")
      .withIndex("by_mentor", (q) => q.eq("mentorId", profile._id))
      .collect();
    const asMentor = asMentorRaw
      .filter(
        (r) =>
          (r.status === "accepted" || r.status === "completed") &&
          r._creationTime >= fourteenDaysAgo
      )
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 10);

    type Notification = {
      id: string;
      type: string;
      title: string;
      link: string;
      createdAt: number;
    };
    const notifications: Notification[] = [];
    const seen = new Set<string>();
    for (const r of [...asRequester, ...asMentor]) {
      if (seen.has(r._id)) continue;
      seen.add(r._id);
      const isRequester = r.requesterId === profile._id;
      const otherProfile = await ctx.db.get(
        isRequester ? r.mentorId : r.requesterId
      );
      const otherName = otherProfile?.fullName ?? otherProfile?.email ?? "Someone";
      notifications.push({
        id: r._id,
        type: "mentor_request",
        title:
          r.status === "completed"
            ? `Mentoring session completed with ${otherName}`
            : `Mentor request accepted by ${otherName}`,
        link: "/profile",
        createdAt: r._creationTime,
      });
    }
    notifications.sort((a, b) => b.createdAt - a.createdAt);
    return notifications.slice(0, 20);
  },
});
