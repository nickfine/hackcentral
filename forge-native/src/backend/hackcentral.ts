import { ConvexHttpClient } from 'convex/browser';
import type {
  CreateProblemInput,
  CreateProblemResult,
  CreateArtifactInput,
  CreateArtifactResult,
  BootstrapData,
  FlagProblemInput,
  FlagProblemResult,
  GetPipelineBoardInput,
  GetPipelineBoardResult,
  GetPathwayResult,
  GetArtifactResult,
  ListPathwaysInput,
  ListPathwaysResult,
  ListProblemImportCandidatesInput,
  ListProblemImportCandidatesResult,
  ListProblemsInput,
  ListProblemsResult,
  ModerateProblemInput,
  ModerateProblemResult,
  ProblemExchangeCapabilitiesResult,
  ListArtifactsInput,
  ListArtifactsResult,
  MarkArtifactReuseResult,
  MovePipelineItemInput,
  MovePipelineItemResult,
  ListShowcaseHacksInput,
  ListShowcaseHacksResult,
  GetShowcaseHackDetailResult,
  SetShowcaseFeaturedInput,
  SetShowcaseFeaturedResult,
  SetPathwayStepCompletionInput,
  SetPathwayStepCompletionResult,
  UpsertPathwayInput,
  UpsertPathwayResult,
  UpdatePipelineStageCriteriaInput,
  UpdatePipelineStageCriteriaResult,
  UpdateProblemStatusInput,
  UpdateProblemStatusResult,
  CreateHackInput,
  CreateHackResult,
  CreateProjectInput,
  CreateProjectResult,
  UpdateMentorProfileInput,
  UpdateMentorProfileResult,
  VoteProblemResult,
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

function logRegistryNavigability(source: string, registry: BootstrapData['registry']): void {
  const total = registry.length;
  const nonNavigable = registry.filter((item) => !item.isNavigable).length;
  const withMissingPageId = registry.filter((item) => !item.confluencePageId).length;
  console.info('[hdc-switcher-telemetry]', JSON.stringify({ source, total, nonNavigable, withMissingPageId }));
}

function normalizeRegistryItemNavigability(
  item: BootstrapData['registry'][number]
): BootstrapData['registry'][number] {
  const pageId =
    typeof item.confluencePageId === 'string' && item.confluencePageId.trim() ? item.confluencePageId.trim() : null;
  const explicitFlag = (item as { isNavigable?: boolean }).isNavigable;
  const isNavigable = typeof explicitFlag === 'boolean' ? explicitFlag && Boolean(pageId) : Boolean(pageId);

  return {
    ...item,
    confluencePageId: pageId,
    isNavigable,
  };
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
    registry: (payload.registry ?? []).map(normalizeRegistryItemNavigability),
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
    demoUrl: input.demoUrl,
    teamMembers: input.teamMembers,
    sourceEventId: input.sourceEventId,
    tags: input.tags,
    linkedArtifactIds: input.linkedArtifactIds,
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

function unsupportedRegistryBackendError(): never {
  throw new Error(
    '[REGISTRY_UNSUPPORTED_BACKEND] Registry operations require Supabase backend. Set FORGE_DATA_BACKEND=supabase.'
  );
}

function unsupportedProblemExchangeBackendError(): never {
  throw new Error(
    '[PROBLEM_EXCHANGE_UNSUPPORTED_BACKEND] Problem Exchange operations require Supabase backend. Set FORGE_DATA_BACKEND=supabase.'
  );
}

function unsupportedPipelineBackendError(): never {
  throw new Error(
    '[PIPELINE_UNSUPPORTED_BACKEND] Pipeline operations require Supabase backend. Set FORGE_DATA_BACKEND=supabase.'
  );
}

function unsupportedShowcaseBackendError(): never {
  throw new Error(
    '[SHOWCASE_UNSUPPORTED_BACKEND] Showcase operations require Supabase backend. Set FORGE_DATA_BACKEND=supabase.'
  );
}

function unsupportedPathwaysBackendError(): never {
  throw new Error(
    '[PATHWAYS_UNSUPPORTED_BACKEND] Pathway operations require Supabase backend. Set FORGE_DATA_BACKEND=supabase.'
  );
}

function getProblemExchangeModerationMode(): ProblemExchangeCapabilitiesResult['moderationMode'] {
  return 'allowlist';
}

export async function getBootstrapData(viewer: ViewerContext): Promise<BootstrapData> {
  const data = await withConfiguredBackend(
    () => repository.getBootstrapData(viewer),
    () => getBootstrapDataFromConvex(viewer)
  );
  logRegistryNavigability('getBootstrapData', data.registry);
  const createAppUrl = process.env.HACKDAY_CREATE_APP_URL?.trim() || null;
  const parentPageUrl = process.env.CONFLUENCE_HDC_PARENT_PAGE_URL?.trim() || null;
  const parentPageId = process.env.CONFLUENCE_HDC_PARENT_PAGE_ID?.trim() || null;
  return { ...data, createAppUrl, parentPageUrl, parentPageId };
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

export async function createArtifact(
  viewer: ViewerContext,
  input: CreateArtifactInput
): Promise<CreateArtifactResult> {
  return withConfiguredBackend(
    () => repository.createArtifact(viewer, input),
    () => Promise.resolve(unsupportedRegistryBackendError())
  );
}

export async function listArtifacts(
  viewer: ViewerContext,
  input: ListArtifactsInput
): Promise<ListArtifactsResult> {
  return withConfiguredBackend(
    () => repository.listArtifacts(viewer, input),
    () => Promise.resolve(unsupportedRegistryBackendError())
  );
}

export async function getArtifact(
  viewer: ViewerContext,
  artifactId: string
): Promise<GetArtifactResult> {
  return withConfiguredBackend(
    () => repository.getArtifact(viewer, artifactId),
    () => Promise.resolve(unsupportedRegistryBackendError())
  );
}

export async function markArtifactReuse(
  viewer: ViewerContext,
  artifactId: string
): Promise<MarkArtifactReuseResult> {
  return withConfiguredBackend(
    () => repository.markArtifactReuse(viewer, artifactId),
    () => Promise.resolve(unsupportedRegistryBackendError())
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

export async function createProblem(
  viewer: ViewerContext,
  input: CreateProblemInput
): Promise<CreateProblemResult> {
  return withConfiguredBackend(
    () => repository.createProblem(viewer, input),
    () => Promise.resolve(unsupportedProblemExchangeBackendError())
  );
}

export async function listProblems(
  viewer: ViewerContext,
  input: ListProblemsInput
): Promise<ListProblemsResult> {
  return withConfiguredBackend(
    () => repository.listProblems(viewer, input),
    () => Promise.resolve(unsupportedProblemExchangeBackendError())
  );
}

export async function listProblemImportCandidates(
  viewer: ViewerContext,
  input: ListProblemImportCandidatesInput
): Promise<ListProblemImportCandidatesResult> {
  return withConfiguredBackend(
    () => repository.listProblemImportCandidates(viewer, input),
    () => Promise.resolve(unsupportedProblemExchangeBackendError())
  );
}

export async function listPathways(
  viewer: ViewerContext,
  input: ListPathwaysInput
): Promise<ListPathwaysResult> {
  return withConfiguredBackend(
    () => repository.listPathways(viewer, input),
    () => Promise.resolve(unsupportedPathwaysBackendError())
  );
}

export async function getPathway(
  viewer: ViewerContext,
  pathwayId: string
): Promise<GetPathwayResult> {
  return withConfiguredBackend(
    () => repository.getPathway(viewer, pathwayId),
    () => Promise.resolve(unsupportedPathwaysBackendError())
  );
}

export async function upsertPathway(
  viewer: ViewerContext,
  input: UpsertPathwayInput
): Promise<UpsertPathwayResult> {
  return withConfiguredBackend(
    async () => {
      const canManage = await repository.canUserManagePathways(viewer);
      if (!canManage) {
        throw new Error(
          `[PATHWAY_FORBIDDEN] Pathway editor access required via org admin role/capability tags. accountId=${viewer.accountId}`
        );
      }
      return repository.upsertPathway(viewer, input);
    },
    () => Promise.resolve(unsupportedPathwaysBackendError())
  );
}

export async function setPathwayStepCompletion(
  viewer: ViewerContext,
  input: SetPathwayStepCompletionInput
): Promise<SetPathwayStepCompletionResult> {
  return withConfiguredBackend(
    () => repository.setPathwayStepCompletion(viewer, input),
    () => Promise.resolve(unsupportedPathwaysBackendError())
  );
}

export async function voteProblem(
  viewer: ViewerContext,
  problemId: string
): Promise<VoteProblemResult> {
  return withConfiguredBackend(
    () => repository.voteProblem(viewer, problemId),
    () => Promise.resolve(unsupportedProblemExchangeBackendError())
  );
}

export async function updateProblemStatus(
  viewer: ViewerContext,
  input: UpdateProblemStatusInput
): Promise<UpdateProblemStatusResult> {
  return withConfiguredBackend(
    () => repository.updateProblemStatus(viewer, input),
    () => Promise.resolve(unsupportedProblemExchangeBackendError())
  );
}

export async function flagProblem(
  viewer: ViewerContext,
  input: FlagProblemInput
): Promise<FlagProblemResult> {
  return withConfiguredBackend(
    () => repository.flagProblem(viewer, input),
    () => Promise.resolve(unsupportedProblemExchangeBackendError())
  );
}

export async function moderateProblem(
  viewer: ViewerContext,
  input: ModerateProblemInput
): Promise<ModerateProblemResult> {
  return withConfiguredBackend(
    async () => {
      const canModerate = await repository.canUserModerateProblemExchange(viewer);
      if (!canModerate) {
        throw new Error(
          `[PROBLEM_MODERATION_FORBIDDEN] Moderator access required via org admin role/capability tags. accountId=${viewer.accountId}`
        );
      }
      return repository.moderateProblem(viewer, input);
    },
    () => Promise.resolve(unsupportedProblemExchangeBackendError())
  );
}

export async function getProblemExchangeCapabilities(
  viewer: ViewerContext
): Promise<ProblemExchangeCapabilitiesResult> {
  const moderationMode = getProblemExchangeModerationMode();

  return withConfiguredBackend(
    async () => ({
      canModerate: await repository.canUserModerateProblemExchange(viewer),
      moderationMode,
    }),
    () =>
      Promise.resolve({
        canModerate: false,
        moderationMode: 'none',
      })
  );
}

export async function getPipelineBoard(
  viewer: ViewerContext,
  input: GetPipelineBoardInput
): Promise<GetPipelineBoardResult> {
  return withConfiguredBackend(
    () => repository.getPipelineBoard(viewer, input),
    () => Promise.resolve(unsupportedPipelineBackendError())
  );
}

export async function movePipelineItem(
  viewer: ViewerContext,
  input: MovePipelineItemInput
): Promise<MovePipelineItemResult> {
  return withConfiguredBackend(
    async () => {
      const canManage = await repository.canUserManagePipeline(viewer);
      if (!canManage) {
        throw new Error(
          `[PIPELINE_FORBIDDEN] Pipeline admin access required via org admin role/capability tags. accountId=${viewer.accountId}`
        );
      }
      return repository.movePipelineItem(viewer, input);
    },
    () => Promise.resolve(unsupportedPipelineBackendError())
  );
}

export async function updatePipelineStageCriteria(
  viewer: ViewerContext,
  input: UpdatePipelineStageCriteriaInput
): Promise<UpdatePipelineStageCriteriaResult> {
  return withConfiguredBackend(
    async () => {
      const canManage = await repository.canUserManagePipeline(viewer);
      if (!canManage) {
        throw new Error(
          `[PIPELINE_FORBIDDEN] Pipeline admin access required via org admin role/capability tags. accountId=${viewer.accountId}`
        );
      }
      return repository.updatePipelineStageCriteria(viewer, input);
    },
    () => Promise.resolve(unsupportedPipelineBackendError())
  );
}

export async function listShowcaseHacks(
  viewer: ViewerContext,
  input: ListShowcaseHacksInput
): Promise<ListShowcaseHacksResult> {
  return withConfiguredBackend(
    () => repository.listShowcaseHacks(viewer, input),
    () => Promise.resolve(unsupportedShowcaseBackendError())
  );
}

export async function getShowcaseHackDetail(
  viewer: ViewerContext,
  projectId: string
): Promise<GetShowcaseHackDetailResult> {
  return withConfiguredBackend(
    () => repository.getShowcaseHackDetail(viewer, projectId),
    () => Promise.resolve(unsupportedShowcaseBackendError())
  );
}

export async function setShowcaseFeatured(
  viewer: ViewerContext,
  input: SetShowcaseFeaturedInput
): Promise<SetShowcaseFeaturedResult> {
  return withConfiguredBackend(
    async () => {
      const canManage = await repository.canUserManagePipeline(viewer);
      if (!canManage) {
        throw new Error(
          `[SHOWCASE_FORBIDDEN] Showcase admin access required via org admin role/capability tags. accountId=${viewer.accountId}`
        );
      }
      return repository.setShowcaseFeatured(viewer, input);
    },
    () => Promise.resolve(unsupportedShowcaseBackendError())
  );
}
