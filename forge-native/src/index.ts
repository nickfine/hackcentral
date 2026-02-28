import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import { createHack, createProject, getBootstrapData, updateMentorProfile } from './backend/hackcentral';
import { HdcService } from './backend/hdcService';
import type {
  ActivateAppModeContextResult,
  CreateInstanceDraftInput,
  SetActiveAppModeContextResult,
  SubmitHackInput,
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
