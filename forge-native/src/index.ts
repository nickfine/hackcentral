import Resolver from '@forge/resolver';
import { createHack, createProject, getBootstrapData, updateMentorProfile } from './backend/hackcentral';
import type { ViewerContext } from './shared/types';

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

export const handler = resolver.getDefinitions();
