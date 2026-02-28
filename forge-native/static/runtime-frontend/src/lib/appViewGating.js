export function shouldShowOpenAppViewCta({ isMacroHost, eventPageId }) {
  return Boolean(isMacroHost && eventPageId);
}

export function shouldAutoOpenAppView({
  devMode,
  isMacroHost,
  eventPageId,
  appModeContextError,
  openingAppView,
  alreadyAttempted,
}) {
  if (devMode) return false;
  if (!isMacroHost) return false;
  if (!eventPageId) return false;
  if (appModeContextError) return false;
  if (openingAppView) return false;
  if (alreadyAttempted) return false;
  return true;
}
