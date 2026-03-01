import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import {
  createProblem,
  createArtifact,
  createHack,
  createProject,
  flagProblem,
  getArtifact,
  getBootstrapData,
  getPipelineBoard,
  getPathway,
  listShowcaseHacks,
  listPathways,
  getShowcaseHackDetail,
  setShowcaseFeatured,
  setPathwayStepCompletion,
  trackTeamPulseExport,
  getProblemExchangeCapabilities,
  listProblemImportCandidates,
  listProblems,
  listArtifacts,
  movePipelineItem,
  upsertPathway,
  updatePipelineStageCriteria,
  moderateProblem,
  markArtifactReuse,
  updateProblemStatus,
  updateMentorProfile,
  voteProblem,
} from './backend/hackcentral';
import { HdcService } from './backend/hdcService';
import type {
  CreateProblemInput,
  CreateArtifactInput,
  ActivateAppModeContextResult,
  CreateInstanceDraftInput,
  FlagProblemInput,
  GetPipelineBoardInput,
  ListShowcaseHacksInput,
  ListPathwaysInput,
  SetShowcaseFeaturedInput,
  MovePipelineItemInput,
  UpdatePipelineStageCriteriaInput,
  ModerateProblemInput,
  SetPathwayStepCompletionInput,
  UpsertPathwayInput,
  UpdateProblemStatusInput,
  ListArtifactsInput,
  ListProblemsInput,
  ListProblemImportCandidatesInput,
  SetActiveAppModeContextResult,
  SubmitHackInput,
  TrackTeamPulseExportInput,
  ViewerContext,
} from './shared/types';

interface RawResolverContext {
  accountId?: string;
  siteUrl?: string;
  timezone?: string;
}

function getViewer(context: RawResolverContext | undefined): ViewerContext {
  return {
    accountId: context?.accountId || 'unknown-atlassian-account',
    siteUrl: context?.siteUrl || 'unknown-site',
    timezone: context?.timezone || 'UTC',
  };
}

const ACTIVE_APP_MODE_CONTEXT_STORAGE_KEY_PREFIX = 'activeAppModeContext:v1:';
const APP_MODE_CONTEXT_SCHEMA_VERSION = 1;
const APP_MODE_CONTEXT_TTL_MS = 12 * 60 * 60 * 1000;

function normalizeConfluencePageId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

function getActiveAppModeContextStorageKey(accountId: string): string {
  return `${ACTIVE_APP_MODE_CONTEXT_STORAGE_KEY_PREFIX}${accountId}`;
}

async function persistActiveAppModeContext(
  viewer: ViewerContext,
  pageId: string,
  eventId: string,
  runtimeSource: string
): Promise<SetActiveAppModeContextResult> {
  const activatedAt = new Date().toISOString();
  const envelope = {
    schemaVersion: APP_MODE_CONTEXT_SCHEMA_VERSION,
    pageId,
    eventId,
    activatedAt,
    expiresAt: new Date(Date.now() + APP_MODE_CONTEXT_TTL_MS).toISOString(),
  };

  if (viewer.accountId && viewer.accountId !== 'unknown-atlassian-account') {
    await storage.set(getActiveAppModeContextStorageKey(viewer.accountId), envelope);
  }

  return {
    success: true,
    pageId,
    eventId,
    runtimeSource,
  };
}

const resolver = new Resolver();
const hdcService = new HdcService();

resolver.define('getBootstrapData', async (request: { context?: RawResolverContext }) => {
  const viewer = getViewer(request.context as RawResolverContext | undefined);
  return getBootstrapData(viewer);
});

resolver.define(
  'createHack',
  async (request: {
    context?: RawResolverContext;
    payload: {
      title: string;
      description?: string;
      assetType: 'prompt' | 'skill' | 'app';
      visibility?: 'private' | 'org' | 'public';
      content?: string;
      demoUrl?: string;
      teamMembers?: string[];
      sourceEventId?: string;
      tags?: string[];
      linkedArtifactIds?: string[];
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return createHack(viewer, request.payload);
  }
);

resolver.define(
  'hdcCreateArtifact',
  async (request: { context?: RawResolverContext; payload: CreateArtifactInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return createArtifact(viewer, request.payload);
  }
);

resolver.define(
  'hdcListArtifacts',
  async (request: { context?: RawResolverContext; payload: ListArtifactsInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return listArtifacts(viewer, request.payload || {});
  }
);

resolver.define(
  'hdcGetArtifact',
  async (request: { context?: RawResolverContext; payload: { artifactId: string } }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return getArtifact(viewer, request.payload.artifactId);
  }
);

resolver.define(
  'hdcMarkArtifactReuse',
  async (request: { context?: RawResolverContext; payload: { artifactId: string } }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return markArtifactReuse(viewer, request.payload.artifactId);
  }
);

resolver.define(
  'hdcCreateProblem',
  async (request: { context?: RawResolverContext; payload: CreateProblemInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return createProblem(viewer, request.payload);
  }
);

resolver.define(
  'hdcListProblems',
  async (request: { context?: RawResolverContext; payload: ListProblemsInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return listProblems(viewer, request.payload || {});
  }
);

resolver.define(
  'hdcListProblemImportCandidates',
  async (request: { context?: RawResolverContext; payload: ListProblemImportCandidatesInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return listProblemImportCandidates(viewer, request.payload || {});
  }
);

resolver.define(
  'hdcListPathways',
  async (request: { context?: RawResolverContext; payload: ListPathwaysInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return listPathways(viewer, request.payload || {});
  }
);

resolver.define(
  'hdcGetPathway',
  async (request: { context?: RawResolverContext; payload: { pathwayId: string } }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return getPathway(viewer, request.payload.pathwayId);
  }
);

resolver.define(
  'hdcUpsertPathway',
  async (request: { context?: RawResolverContext; payload: UpsertPathwayInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return upsertPathway(viewer, request.payload);
  }
);

resolver.define(
  'hdcSetPathwayStepCompletion',
  async (request: { context?: RawResolverContext; payload: SetPathwayStepCompletionInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return setPathwayStepCompletion(viewer, request.payload);
  }
);

resolver.define(
  'hdcVoteProblem',
  async (request: { context?: RawResolverContext; payload: { problemId: string } }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return voteProblem(viewer, request.payload.problemId);
  }
);

resolver.define(
  'hdcUpdateProblemStatus',
  async (request: { context?: RawResolverContext; payload: UpdateProblemStatusInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return updateProblemStatus(viewer, request.payload);
  }
);

resolver.define(
  'hdcFlagProblem',
  async (request: { context?: RawResolverContext; payload: FlagProblemInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return flagProblem(viewer, request.payload);
  }
);

resolver.define(
  'hdcModerateProblem',
  async (request: { context?: RawResolverContext; payload: ModerateProblemInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return moderateProblem(viewer, request.payload);
  }
);

resolver.define(
  'hdcGetProblemExchangeCapabilities',
  async (request: { context?: RawResolverContext }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return getProblemExchangeCapabilities(viewer);
  }
);

resolver.define(
  'hdcGetPipelineBoard',
  async (request: { context?: RawResolverContext; payload: GetPipelineBoardInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return getPipelineBoard(viewer, request.payload || {});
  }
);

resolver.define(
  'hdcMovePipelineItem',
  async (request: { context?: RawResolverContext; payload: MovePipelineItemInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return movePipelineItem(viewer, request.payload);
  }
);

resolver.define(
  'hdcListShowcaseHacks',
  async (request: { context?: RawResolverContext; payload: ListShowcaseHacksInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return listShowcaseHacks(viewer, request.payload || {});
  }
);

resolver.define(
  'hdcGetShowcaseHackDetail',
  async (request: { context?: RawResolverContext; payload: { projectId: string } }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return getShowcaseHackDetail(viewer, request.payload.projectId);
  }
);

resolver.define(
  'hdcSetShowcaseFeatured',
  async (request: { context?: RawResolverContext; payload: SetShowcaseFeaturedInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return setShowcaseFeatured(viewer, request.payload);
  }
);

resolver.define(
  'hdcUpdatePipelineStageCriteria',
  async (request: { context?: RawResolverContext; payload: UpdatePipelineStageCriteriaInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return updatePipelineStageCriteria(viewer, request.payload);
  }
);

resolver.define(
  'hdcTrackTeamPulseExport',
  async (request: { context?: RawResolverContext; payload: TrackTeamPulseExportInput }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return trackTeamPulseExport(viewer, request.payload);
  }
);

resolver.define(
  'createProject',
  async (request: {
    context?: RawResolverContext;
    payload: {
      title: string;
      description?: string;
      visibility?: 'private' | 'org' | 'public';
      hackType?: 'prompt' | 'skill' | 'app';
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return createProject(viewer, request.payload);
  }
);

resolver.define(
  'updateMentorProfile',
  async (request: {
    context?: RawResolverContext;
    payload: {
      mentorCapacity: number;
      happyToMentor: boolean;
      seekingMentor: boolean;
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return updateMentorProfile(viewer, request.payload);
  }
);

resolver.define(
  'hdcGetContext',
  async (request: {
    context?: RawResolverContext;
    payload: {
      pageId: string;
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.getContext(viewer, request.payload.pageId);
  }
);

resolver.define(
  'hdcGetAppViewUrl',
  async (request: {
    context?: RawResolverContext;
    payload: {
      pageId: string;
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.getAppViewUrl(viewer, request.payload.pageId);
  }
);

resolver.define(
  'hdcActivateAppModeContext',
  async (request: {
    context?: RawResolverContext;
    payload: {
      pageId: string;
    };
  }): Promise<ActivateAppModeContextResult> => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    const pageId = normalizeConfluencePageId(request.payload?.pageId);
    if (!pageId) {
      throw new Error('A valid pageId is required to activate app mode context.');
    }

    const context = await hdcService.getContext(viewer, pageId);
    if (context.pageType !== 'instance' || !context.event?.id) {
      if (viewer.accountId && viewer.accountId !== 'unknown-atlassian-account') {
        await storage.delete(getActiveAppModeContextStorageKey(viewer.accountId));
      }
      return {
        success: false,
        pageId,
        eventId: null,
        reason: 'context_not_found',
        runtimeSource: null,
      };
    }

    return persistActiveAppModeContext(viewer, pageId, context.event.id, 'hdc_context');
  }
);

// Backwards-compatible alias for cached clients still invoking legacy key.
resolver.define(
  'activateAppModeContext',
  async (request: {
    context?: RawResolverContext;
    payload: {
      pageId: string;
    };
  }): Promise<ActivateAppModeContextResult> => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    const pageId = normalizeConfluencePageId(request.payload?.pageId);
    if (!pageId) {
      throw new Error('A valid pageId is required to activate app mode context.');
    }

    const context = await hdcService.getContext(viewer, pageId);
    if (context.pageType !== 'instance' || !context.event?.id) {
      if (viewer.accountId && viewer.accountId !== 'unknown-atlassian-account') {
        await storage.delete(getActiveAppModeContextStorageKey(viewer.accountId));
      }
      return {
        success: false,
        pageId,
        eventId: null,
        reason: 'context_not_found',
        runtimeSource: null,
      };
    }

    return persistActiveAppModeContext(viewer, pageId, context.event.id, 'hdc_context');
  }
);

resolver.define(
  'hdcSetActiveAppModeContext',
  async (request: {
    context?: RawResolverContext;
    payload: {
      pageId: string;
      eventId: string;
    };
  }): Promise<SetActiveAppModeContextResult> => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    const pageId = normalizeConfluencePageId(request.payload?.pageId);
    const eventId = typeof request.payload?.eventId === 'string' ? request.payload.eventId.trim() : '';
    if (!pageId) {
      throw new Error('A valid pageId is required to set app mode context.');
    }
    if (!eventId) {
      throw new Error('A valid eventId is required to set app mode context.');
    }
    return persistActiveAppModeContext(viewer, pageId, eventId, 'hdc_direct');
  }
);

resolver.define(
  'hdcCreateInstanceDraft',
  async (request: {
    context?: RawResolverContext;
    payload: CreateInstanceDraftInput;
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.createInstanceDraft(viewer, request.payload);
  }
);

resolver.define(
  'hdcLaunchInstance',
  async (request: {
    context?: RawResolverContext;
    payload: {
      eventId: string;
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.launchInstance(viewer, request.payload.eventId);
  }
);

resolver.define(
  'hdcDeleteDraftInstance',
  async (request: {
    context?: RawResolverContext;
    payload: {
      eventId: string;
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.deleteDraftInstance(viewer, request.payload.eventId);
  }
);

resolver.define(
  'hdcSubmitHack',
  async (request: {
    context?: RawResolverContext;
    payload: SubmitHackInput;
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.submitHack(viewer, request.payload);
  }
);

resolver.define(
  'hdcCompleteAndSync',
  async (request: {
    context?: RawResolverContext;
    payload: {
      eventId: string;
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.completeAndSync(viewer, request.payload.eventId);
  }
);

resolver.define(
  'hdcRetrySync',
  async (request: {
    context?: RawResolverContext;
    payload: {
      eventId: string;
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.retrySync(viewer, request.payload.eventId);
  }
);

resolver.define(
  'hdcBulkCleanupTestEvents',
  async (request: {
    context?: RawResolverContext;
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return hdcService.bulkCleanupTestEvents(viewer);
  }
);

export const handler = resolver.getDefinitions();
