import { ConvexHttpClient } from "convex/browser";
import type { BootstrapData, ViewerContext } from "../shared/types";

interface ConvexSnapshotPayload {
  summary: BootstrapData["summary"];
  featuredHacks: BootstrapData["featuredHacks"];
  recentProjects: BootstrapData["recentProjects"];
  people: BootstrapData["people"];
}

interface ConvexConfig {
  deploymentUrl: string;
  queryName: string;
  createHackMutation: string;
  createProjectMutation: string;
  updateMentorProfileMutation: string;
}

const DEFAULT_QUERY_NAME = "forgeBridge:getGlobalPageData";
const DEFAULT_CREATE_HACK_MUTATION = "forgeBridge:createHackFromForge";
const DEFAULT_CREATE_PROJECT_MUTATION = "forgeBridge:createProjectFromForge";
const DEFAULT_UPDATE_MENTOR_MUTATION = "forgeBridge:updateMentorProfileFromForge";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Forge variable: ${name}`);
  }
  return value;
}

function getConfig(): ConvexConfig {
  return {
    deploymentUrl: getRequiredEnv("CONVEX_URL").replace(/\/$/, ""),
    queryName: process.env.CONVEX_FORGE_QUERY || DEFAULT_QUERY_NAME,
    createHackMutation: process.env.CONVEX_FORGE_CREATE_HACK || DEFAULT_CREATE_HACK_MUTATION,
    createProjectMutation: process.env.CONVEX_FORGE_CREATE_PROJECT || DEFAULT_CREATE_PROJECT_MUTATION,
    updateMentorProfileMutation:
      process.env.CONVEX_FORGE_UPDATE_MENTOR || DEFAULT_UPDATE_MENTOR_MUTATION,
  };
}

function getClient(config: ConvexConfig): ConvexHttpClient {
  return new ConvexHttpClient(config.deploymentUrl);
}

export async function getBootstrapData(viewer: ViewerContext): Promise<BootstrapData> {
  const config = getConfig();
  const client = getClient(config);

  const payload = (await client.query(config.queryName as never, {})) as ConvexSnapshotPayload;

  return {
    viewer,
    source: {
      provider: "convex",
      deploymentUrl: config.deploymentUrl,
      queryName: config.queryName,
    },
    summary: payload.summary,
    featuredHacks: payload.featuredHacks ?? [],
    recentProjects: payload.recentProjects ?? [],
    people: payload.people ?? [],
  };
}

export async function createHack(
  viewer: ViewerContext,
  input: {
    title: string;
    description?: string;
    assetType: "prompt" | "skill" | "app";
    visibility?: "private" | "org" | "public";
    content?: string;
  }
): Promise<{ assetId: string; title: string }> {
  const config = getConfig();
  const client = getClient(config);
  return (await client.mutation(config.createHackMutation as never, {
    forgeAccountId: viewer.accountId,
    forgeSiteUrl: viewer.siteUrl,
    ...input,
  } as never)) as { assetId: string; title: string };
}

export async function createProject(
  viewer: ViewerContext,
  input: {
    title: string;
    description?: string;
    visibility?: "private" | "org" | "public";
    hackType?: "prompt" | "skill" | "app";
  }
): Promise<{ projectId: string; title: string }> {
  const config = getConfig();
  const client = getClient(config);
  return (await client.mutation(config.createProjectMutation as never, {
    forgeAccountId: viewer.accountId,
    forgeSiteUrl: viewer.siteUrl,
    ...input,
  } as never)) as { projectId: string; title: string };
}

export async function updateMentorProfile(
  viewer: ViewerContext,
  input: {
    mentorCapacity: number;
    happyToMentor: boolean;
    seekingMentor: boolean;
  }
): Promise<{ profileId: string; mentorCapacity: number }> {
  const config = getConfig();
  const client = getClient(config);
  return (await client.mutation(config.updateMentorProfileMutation as never, {
    forgeAccountId: viewer.accountId,
    forgeSiteUrl: viewer.siteUrl,
    ...input,
  } as never)) as { profileId: string; mentorCapacity: number };
}
