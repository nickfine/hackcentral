import { ROLE_MAP, HACKDAY_OWNER_TITLE } from "./constants.js";
import { isHackdayOwnerIdentity } from "./helpers.js";

/**
 * Transform Supabase User to Forge registration format
 */
export function transformUser(user) {
  const name = user.name || "Unknown";
  const isHackdayOwner = isHackdayOwnerIdentity({
    email: user.email,
    accountId: user.atlassian_account_id,
    name: user.name,
  });
  return {
    id: user.id,
    name,
    accountId: user.atlassian_account_id || user.id,
    displayName: name,
    callsign: user.callsign || "",
    bio: user.bio || null,
    skills: user.skills ? user.skills.split(",").map((s) => s.trim()) : [],
    role: ROLE_MAP[user.role] || "participant",
    isJudge: user.role === "JUDGE" || user.role === "ADMIN",
    isAdmin: user.role === "ADMIN",
    isHackdayOwner,
    ownerDisplayTitle: isHackdayOwner ? HACKDAY_OWNER_TITLE : null,
    isFreeAgent: !!user.isFreeAgent,
    autoAssignOptIn: !!user.autoAssignOptIn,
    trackSide: user.trackSide || null,
    registeredAt: user.createdAt || new Date().toISOString(),
  };
}

/**
 * Transform Supabase Team to Forge team format
 */
export function transformTeam(team, members, project, submissionLink = null) {
  const captain = members.find((m) => m.role === "OWNER" && m.status === "ACCEPTED");
  const acceptedMembers = members.filter((m) => m.status === "ACCEPTED");
  const pendingRequests = members.filter((m) => m.status === "PENDING");
  const teamProblem =
    team.problem ??
    team.problem_statement ??
    team.problemStatement ??
    "";
  const teamMoreInfo =
    team.moreInfo ??
    team.more_info ??
    team.additionalInfo ??
    team.additional_info ??
    "";

  return {
    id: team.id,
    eventId: team.eventId || "",
    name: team.name,
    description: team.description || "",
    problem: typeof teamProblem === "string" ? teamProblem : "",
    moreInfo: typeof teamMoreInfo === "string" ? teamMoreInfo : "",
    captainId: captain?.userId || null,
    captainName: captain?.user?.name || null,
    members: acceptedMembers.map((m) => ({
      id: m.userId,
      name: m.user?.name || "Unknown",
      callsign: m.user?.callsign || "",
      skills: m.user?.skills ? m.user.skills.split(",").map((s) => s.trim()) : [],
    })),
    lookingFor: team.lookingFor ? team.lookingFor.split(",").map((s) => s.trim()) : [],
    maxMembers: team.maxSize || 5,
    joinRequests: pendingRequests.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user?.name || "Unknown",
      userSkills: m.user?.skills ? m.user.skills.split(",").map((s) => s.trim()) : [],
      message: m.message || "",
      timestamp: m.createdAt,
    })),
    submission: project
      ? {
          status: project.submittedAt ? "submitted" : "draft",
          projectName: project.name || "",
          description: project.description || "",
          demoVideoUrl: project.videoUrl || "",
          repoUrl: project.repoUrl || "",
          liveDemoUrl: project.demoUrl || "",
          submittedAt: project.submittedAt || null,
          submissionPageId: submissionLink?.submission_page_id || null,
          submissionPageUrl: submissionLink?.submission_page_url || null,
          outputPageIds: Array.isArray(submissionLink?.output_page_ids) ? submissionLink.output_page_ids : [],
        }
      : undefined,
    createdAt: team.createdAt,
  };
}
