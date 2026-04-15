import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  HACKDAY_SUBMISSION_PAGE_LINK_TABLE,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  getEventById,
  normalizeConfluencePageId,
  hasMissingTable,
  escapeStorageText,
  fetchConfluencePageWithFallback,
  extractConfluencePageUrl,
  createConfluenceChildPage,
  updateConfluencePageStorage,
  ensureSubmissionsParentPage,
  makeId,
} from "../lib/helpers.js";

export function registerSubmissionResolvers(resolver) {
// ============================================================================
// SUBMISSIONS
// ============================================================================

function buildRuntimeSubmissionPageStorage(input) {
  const lines = [];
  lines.push("<h1>HackDay Submission</h1>");
  lines.push(`<p><strong>Project:</strong> ${escapeStorageText(input.projectName)}</p>`);
  lines.push(`<p><strong>Team:</strong> ${escapeStorageText(input.teamName)}</p>`);
  lines.push(`<p>${escapeStorageText(input.description || "No description provided.")}</p>`);
  lines.push("<h2>Delivery Links</h2>");
  lines.push(`<p><strong>Demo video:</strong> ${input.demoVideoUrl ? `<a href="${escapeStorageText(input.demoVideoUrl)}">${escapeStorageText(input.demoVideoUrl)}</a>` : "Not provided"}</p>`);
  lines.push(`<p><strong>Repository:</strong> ${input.repoUrl ? `<a href="${escapeStorageText(input.repoUrl)}">${escapeStorageText(input.repoUrl)}</a>` : "Not provided"}</p>`);
  lines.push(`<p><strong>Live demo:</strong> ${input.liveDemoUrl ? `<a href="${escapeStorageText(input.liveDemoUrl)}">${escapeStorageText(input.liveDemoUrl)}</a>` : "Not provided"}</p>`);
  lines.push("<h2>Output Pages</h2>");
  if (!Array.isArray(input.outputLinks) || input.outputLinks.length === 0) {
    lines.push("<p>No output pages generated yet.</p>");
  } else {
    lines.push(
      `<ul>${input.outputLinks
        .map((link) => `<li><a href="${escapeStorageText(link.url)}">${escapeStorageText(link.title)}</a></li>`)
        .join("")}</ul>`
    );
  }
  return lines.join("");
}

function buildRuntimeOutputPageStorage(input) {
  return [
    "<h1>Submission Output</h1>",
    `<p><strong>Output:</strong> ${escapeStorageText(input.title)}</p>`,
    `<p><strong>Source:</strong> ${escapeStorageText(input.sourceReference)}</p>`,
    "<h2>Content</h2>",
    `<p>${escapeStorageText(input.content || "No content captured yet.")}</p>`,
  ].join("");
}

async function syncSubmissionConfluencePages({
  supabase,
  eventPageId,
  eventId,
  teamId,
  teamName,
  projectId,
  projectName,
  description,
  demoVideoUrl,
  repoUrl,
  liveDemoUrl,
}) {
  if (!normalizeConfluencePageId(eventPageId)) {
    return { submissionPageId: null, submissionPageUrl: null, outputPageIds: [] };
  }

  let existingLink = null;
  try {
    const { data: linkRows, error: linkError } = await supabase
      .from(HACKDAY_SUBMISSION_PAGE_LINK_TABLE)
      .select("project_id,event_id,team_id,submission_page_id,submission_page_url,output_page_ids")
      .eq("project_id", projectId)
      .limit(1);
    if (!linkError) {
      existingLink = linkRows?.[0] || null;
    }
  } catch (err) {
    if (!hasMissingTable(err, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
      throw err;
    }
  }

  const submissionsParent = await ensureSubmissionsParentPage(eventPageId);
  const createdPageIds = [];
  const outputDefinitions = [
    {
      key: "demo-video",
      title: `${projectName} · Demo Video`,
      sourceReference: "Submission demoVideoUrl",
      content: demoVideoUrl || null,
    },
    {
      key: "repo",
      title: `${projectName} · Repository`,
      sourceReference: "Submission repoUrl",
      content: repoUrl || null,
    },
    {
      key: "live-demo",
      title: `${projectName} · Live Demo`,
      sourceReference: "Submission liveDemoUrl",
      content: liveDemoUrl || null,
    },
  ].filter((entry) => typeof entry.content === "string" && entry.content.trim().length > 0);

  let submissionPage = null;
  const existingSubmissionPageId = normalizeConfluencePageId(existingLink?.submission_page_id);
  if (existingSubmissionPageId) {
    const fetched = await fetchConfluencePageWithFallback(existingSubmissionPageId);
    if (fetched?.page?.id) {
      submissionPage = {
        pageId: existingSubmissionPageId,
        pageUrl: extractConfluencePageUrl(fetched.page),
        pagePayload: fetched.page,
        requester: fetched.requester,
      };
    }
  }

  if (!submissionPage) {
    const created = await createConfluenceChildPage({
      parentPageId: submissionsParent.pageId,
      title: `${teamName} · ${projectName}`,
      storageValue: buildRuntimeSubmissionPageStorage({
        projectName,
        teamName,
        description,
        demoVideoUrl,
        repoUrl,
        liveDemoUrl,
        outputLinks: [],
      }),
    });
    createdPageIds.push(created.pageId);
    const fetched = await fetchConfluencePageWithFallback(created.pageId);
    if (!fetched) {
      throw new Error(`Unable to read newly created submission page ${created.pageId}`);
    }
    submissionPage = {
      pageId: created.pageId,
      pageUrl: created.pageUrl,
      pagePayload: fetched.page,
      requester: fetched.requester,
    };
  }

  const existingOutputPageIds = Array.isArray(existingLink?.output_page_ids)
    ? existingLink.output_page_ids.map(normalizeConfluencePageId).filter(Boolean)
    : [];
  const outputPageIds = [];
  const outputLinks = [];

  for (let i = 0; i < outputDefinitions.length; i += 1) {
    const definition = outputDefinitions[i];
    const existingOutputPageId = existingOutputPageIds[i] || null;
    if (existingOutputPageId) {
      const fetchedOutput = await fetchConfluencePageWithFallback(existingOutputPageId);
      if (fetchedOutput?.page?.id) {
        await updateConfluencePageStorage({
          page: fetchedOutput.page,
          requester: fetchedOutput.requester,
          storageValue: buildRuntimeOutputPageStorage(definition),
          versionMessage: "Refresh HackDay submission output page",
        });
        outputPageIds.push(existingOutputPageId);
        outputLinks.push({
          title: definition.title,
          url: extractConfluencePageUrl(fetchedOutput.page) || `/wiki/pages/viewpage.action?pageId=${existingOutputPageId}`,
        });
        continue;
      }
    }

    const createdOutput = await createConfluenceChildPage({
      parentPageId: submissionPage.pageId,
      title: definition.title,
      storageValue: buildRuntimeOutputPageStorage(definition),
    });
    createdPageIds.push(createdOutput.pageId);
    outputPageIds.push(createdOutput.pageId);
    outputLinks.push({
      title: definition.title,
      url: createdOutput.pageUrl || `/wiki/pages/viewpage.action?pageId=${createdOutput.pageId}`,
    });
  }

  const refreshedSubmission = await fetchConfluencePageWithFallback(submissionPage.pageId);
  if (!refreshedSubmission) {
    throw new Error(`Unable to refresh submission page ${submissionPage.pageId}`);
  }
  await updateConfluencePageStorage({
    page: refreshedSubmission.page,
    requester: refreshedSubmission.requester,
    storageValue: buildRuntimeSubmissionPageStorage({
      projectName,
      teamName,
      description,
      demoVideoUrl,
      repoUrl,
      liveDemoUrl,
      outputLinks,
    }),
    versionMessage: "Refresh HackDay submission summary",
  });

  const { error: upsertError } = await supabase.from(HACKDAY_SUBMISSION_PAGE_LINK_TABLE).upsert(
    {
      project_id: projectId,
      event_id: eventId || null,
      team_id: teamId || null,
      submission_page_id: submissionPage.pageId,
      submission_page_url: submissionPage.pageUrl || null,
      output_page_ids: outputPageIds,
    },
    { onConflict: "project_id" }
  );
  if (upsertError && !hasMissingTable(upsertError, HACKDAY_SUBMISSION_PAGE_LINK_TABLE)) {
    throw upsertError;
  }

  return {
    submissionPageId: submissionPage.pageId,
    submissionPageUrl: submissionPage.pageUrl || null,
    outputPageIds,
    createdPageIds,
  };
}

/**
 * Helper: Validate URL format and protocol
 */
function validateUrl(url, fieldName, required = false) {
  if (!url && !required) return null;
  if (!url) throw new Error(`${fieldName} is required`);

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`${fieldName} must use http:// or https://`);
    }
    return url.trim();
  } catch (err) {
    throw new Error(`${fieldName} is not a valid URL`);
  }
}

/**
 * Submit or update project submission
 */
resolver.define("submitProject", async (req) => {
  const accountId = getCallerAccountId(req);
  const { teamId, submissionData } = req.payload || {};
  if (!teamId || !submissionData) {
    throw new Error("teamId and submissionData are required");
  }

  const supabase = getSupabaseClient();

  try {
    // Verify user is team member (use limit(1) for custom fetch compatibility)
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("atlassian_account_id", accountId)
      .limit(1);

    const user = userData?.[0];
    if (userError || !user) {
      throw new Error("User not found");
    }

    const { data: memberData } = await supabase
      .from("TeamMember")
      .select("*")
      .eq("teamId", teamId)
      .eq("userId", user.id)
      .eq("status", "ACCEPTED")
      .limit(1);

    const member = memberData?.[0];
    if (!member) {
      throw new Error("User is not a member of this team");
    }

    const { data: teamData, error: teamError } = await supabase
      .from("Team")
      .select("id,eventId,name")
      .eq("id", teamId)
      .limit(1);
    const team = teamData?.[0] || null;
    if (teamError || !team) {
      throw new Error("Team not found");
    }

    // Check if project exists
    const { data: existingData } = await supabase.from("Project").select("id").eq("teamId", teamId).limit(1);
    const existing = existingData?.[0];
    const projectId = existing?.id || makeId("proj");

    const projectData = {
      name: String(submissionData.projectName || "").trim(),
      description: String(submissionData.description || "").trim(),
      videoUrl: validateUrl(submissionData.demoVideoUrl, "Demo video URL"),
      repoUrl: validateUrl(submissionData.repoUrl, "Repository URL"),
      demoUrl: validateUrl(submissionData.liveDemoUrl, "Live demo URL"),
      submittedAt: submissionData.status === "submitted" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Update existing project
      const { error: updateError } = await supabase.from("Project").update(projectData).eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      // Create new project
      const { error: insertError } = await supabase.from("Project").insert({
        id: projectId,
        teamId,
        ...projectData,
        createdAt: new Date().toISOString(),
      });
      if (insertError) throw insertError;
    }

    let submissionPageId = null;
    let submissionPageUrl = null;
    let outputPageIds = [];
    const eventRow = team.eventId ? await getEventById(supabase, team.eventId) : null;
    const eventPageId = normalizeConfluencePageId(eventRow?.confluence_page_id);
    if (eventPageId) {
      try {
        const pageSync = await syncSubmissionConfluencePages({
          supabase,
          eventPageId,
          eventId: team.eventId,
          teamId: team.id,
          teamName: String(team.name || "").trim() || `Team ${team.id}`,
          projectId,
          projectName: projectData.name || `Submission ${projectId}`,
          description: projectData.description || "",
          demoVideoUrl: projectData.videoUrl || null,
          repoUrl: projectData.repoUrl || null,
          liveDemoUrl: projectData.demoUrl || null,
        });
        submissionPageId = pageSync.submissionPageId || null;
        submissionPageUrl = pageSync.submissionPageUrl || null;
        outputPageIds = Array.isArray(pageSync.outputPageIds) ? pageSync.outputPageIds : [];
      } catch (pageSyncError) {
        console.warn(
          "submitProject page sync warning:",
          pageSyncError instanceof Error ? pageSyncError.message : String(pageSyncError)
        );
      }
    }

    return { success: true, submissionPageId, submissionPageUrl, outputPageIds };
  } catch (error) {
    console.error("submitProject error:", error);
    throw new Error(`Failed to submit project: ${error.message}`);
  }
});


}
