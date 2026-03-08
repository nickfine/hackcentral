export function buildAppModeResolverPayload(pageId) {
  if (typeof pageId !== 'string') {
    return null;
  }

  const normalizedPageId = pageId.trim();
  if (!normalizedPageId) {
    return null;
  }

  return {
    appMode: true,
    pageId: normalizedPageId,
  };
}

export function mergeAppModeResolverPayload(appModeResolverPayload, payload) {
  if (!appModeResolverPayload) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return appModeResolverPayload;
  }

  return {
    ...payload,
    ...appModeResolverPayload,
  };
}

export function invokeEventScopedResolver(invoke, resolverName, appModeResolverPayload, payload) {
  const mergedPayload = mergeAppModeResolverPayload(appModeResolverPayload, payload);
  if (mergedPayload === undefined) {
    return invoke(resolverName);
  }
  return invoke(resolverName, mergedPayload);
}
