export interface CreateHackDayLaunchResult {
  appViewUrl?: string | null;
  childPageUrl?: string | null;
}

export function resolveCreateHackDayLaunchUrl(result: CreateHackDayLaunchResult): string | null {
  const appViewUrl = typeof result.appViewUrl === 'string' ? result.appViewUrl.trim() : '';
  if (appViewUrl) return appViewUrl;

  const childPageUrl = typeof result.childPageUrl === 'string' ? result.childPageUrl.trim() : '';
  return childPageUrl || null;
}
