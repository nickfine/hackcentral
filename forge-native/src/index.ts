import Resolver from '@forge/resolver';
import { createHack, createProject, getBootstrapData, updateMentorProfile } from './backend/hackcentral';
import { HdcService } from './backend/hdcService';
import type { CreateInstanceDraftInput, SubmitHackInput, ViewerContext } from './shared/types';

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
    };
  }) => {
    const viewer = getViewer(request.context as RawResolverContext | undefined);
    return createHack(viewer, request.payload);
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
