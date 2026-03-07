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
  return false;
}
