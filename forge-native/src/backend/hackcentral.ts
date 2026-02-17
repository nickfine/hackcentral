import { ConvexHttpClient } from 'convex/browser';
import type {
  BootstrapData,
  CreateHackInput,
  CreateHackResult,
  CreateProjectInput,
  CreateProjectResult,
  UpdateMentorProfileInput,
  UpdateMentorProfileResult,
  ViewerContext,
} from '../shared/types';
import { SupabaseRepository } from './supabase/repositories';

const repository = new SupabaseRepository();

interface ConvexBootstrapPayload {
  summary: BootstrapData['summary'];
  featuredHacks: BootstrapData['featuredHacks'];
  recentProjects: BootstrapData['recentProjects'];
  people: BootstrapData['people'];
  registry?: BootstrapData['registry'];
}

type ForgeDataBackendMode = 'supabase' | 'convex' | 'auto';

function isSupabasePermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('supabase permission error') ||
    (message.includes('supabase') && message.includes('(403)')) ||
    message.includes('permission denied for schema public')
  );
}

function getDataBackendMode(): ForgeDataBackendMode {
  const raw = (process.env.FORGE_DATA_BACKEND || 'auto').trim().toLowerCase();
  if (raw === 'supabase' || raw === 'convex' || raw === 'auto') {
    return raw;
  }
  return 'auto';
}

function getConvexConfig(): {
  url: string;
  query: string;
  createHack: string;
  createProject: string;
  updateMentor: string;
} {
  const url = process.env.CONVEX_URL;
  if (!url) {
    throw new Error('Missing CONVEX_URL for Convex fallback.');
  }

  return {
    url,
    query: process.env.CONVEX_FORGE_QUERY || 'forgeBridge:getGlobalPageData',
    createHack: process.env.CONVEX_FORGE_CREATE_HACK || 'forgeBridge:createHackFromForge',
    createProject: process.env.CONVEX_FORGE_CREATE_PROJECT || 'forgeBridge:createProjectFromForge',
    updateMentor: process.env.CONVEX_FORGE_UPDATE_MENTOR || 'forgeBridge:updateMentorProfileFromForge',
  };
}

function getConvexClient(): ConvexHttpClient {
  const { url } = getConvexConfig();
  return new ConvexHttpClient(url);
}

async function withPermissionFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (!isSupabasePermissionError(error)) {
      throw error;
    }
    try {
      return await fallback();
    } catch (fallbackError) {
      const primaryMessage = error instanceof Error ? error.message : 'Unknown Supabase error.';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Unknown Convex fallback error.';
      throw new Error(`${primaryMessage} Convex fallback failed: ${fallbackMessage}`);
    }
  }
}

async function withConfiguredBackend<T>(
  supabase: () => Promise<T>,
  convex: () => Promise<T>
): Promise<T> {
  const mode = getDataBackendMode();
  if (mode === 'supabase') {
    return supabase();
  }
  if (mode === 'convex') {
    return convex();
  }
  return withPermissionFallback(supabase, convex);
}

async function getBootstrapDataFromConvex(viewer: ViewerContext): Promise<BootstrapData> {
  const config = getConvexConfig();
  const client = getConvexClient();
  const payload = (await (client as any).query(config.query, {})) as ConvexBootstrapPayload;

  return {
    viewer,
    source: {
      provider: 'convex',
      deploymentUrl: config.url,
      schema: 'convex',
    },
    summary: payload.summary,
    featuredHacks: payload.featuredHacks,
    recentProjects: payload.recentProjects,
    people: payload.people,
    registry: payload.registry ?? [],
  };
}

async function createHackInConvex(viewer: ViewerContext, input: CreateHackInput): Promise<CreateHackResult> {
  const config = getConvexConfig();
  const client = getConvexClient();
  return (await (client as any).mutation(config.createHack, {
    forgeAccountId: viewer.accountId,
    forgeSiteUrl: viewer.siteUrl,
    title: input.title,
    description: input.description,
    assetType: input.assetType,
    visibility: input.visibility,
    content: input.content,
  })) as CreateHackResult;
}

async function createProjectInConvex(
  viewer: ViewerContext,
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  const config = getConvexConfig();
  const client = getConvexClient();
  return (await (client as any).mutation(config.createProject, {
    forgeAccountId: viewer.accountId,
    forgeSiteUrl: viewer.siteUrl,
    title: input.title,
    description: input.description,
    visibility: input.visibility,
    hackType: input.hackType,
  })) as CreateProjectResult;
}

async function updateMentorInConvex(
  viewer: ViewerContext,
  input: UpdateMentorProfileInput
): Promise<UpdateMentorProfileResult> {
  const config = getConvexConfig();
  const client = getConvexClient();
  return (await (client as any).mutation(config.updateMentor, {
    forgeAccountId: viewer.accountId,
    forgeSiteUrl: viewer.siteUrl,
    mentorCapacity: input.mentorCapacity,
    happyToMentor: input.happyToMentor,
    seekingMentor: input.seekingMentor,
  })) as UpdateMentorProfileResult;
}

export async function getBootstrapData(viewer: ViewerContext): Promise<BootstrapData> {
  return withConfiguredBackend(
    () => repository.getBootstrapData(viewer),
    () => getBootstrapDataFromConvex(viewer)
  );
}

export async function createHack(
  viewer: ViewerContext,
  input: CreateHackInput
): Promise<CreateHackResult> {
  return withConfiguredBackend(
    () => repository.createHack(viewer, input),
    () => createHackInConvex(viewer, input)
  );
}

export async function createProject(
  viewer: ViewerContext,
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  return withConfiguredBackend(
    () => repository.createProject(viewer, input),
    () => createProjectInConvex(viewer, input)
  );
}

export async function updateMentorProfile(
  viewer: ViewerContext,
  input: UpdateMentorProfileInput
): Promise<UpdateMentorProfileResult> {
  return withConfiguredBackend(
    () => repository.updateMentorProfile(viewer, input),
    () => updateMentorInConvex(viewer, input)
  );
}
