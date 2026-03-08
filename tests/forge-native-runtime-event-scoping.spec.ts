import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

async function readSource(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('runtime app-view event scoping contract', () => {
  it('routes App bootstrap and refresh paths through the shared app-mode payload helper', async () => {
    const source = await readSource('forge-native/static/runtime-frontend/src/App.jsx');

    expect(source).toContain("const appModeResolverPayload = useMemo(");
    expect(source).toContain("appModeResolverPayload={appModeResolverPayload}");
    expect(source).toContain("invokeEventScopedResolver(invoke, 'getCurrentUser', bootstrapAppModeResolverPayload)");
    expect(source).toContain("invokeEventScopedResolver(invoke, 'getTeams', bootstrapAppModeResolverPayload)");
    expect(source).toContain("invokeEventScopedResolver(invoke, 'getRegistrations', bootstrapAppModeResolverPayload)");
    expect(source).toContain("invokeEventScopedResolver(invoke, 'getTeams', appModeResolverPayload)");
    expect(source).toContain("invokeEventScopedResolver(invoke, 'getFreeAgents', appModeResolverPayload)");
    expect(source).toContain("invokeEventScopedResolver(invoke, 'getRegistrations', appModeResolverPayload)");
    expect(source).toContain("const createResult = await invokeEventScopedResolver(");
    expect(source).toContain("'createTeam',");
  });

  it('keeps dashboard and schedule event reads page-scoped without inline payload objects', async () => {
    const dashboardSource = await readSource('forge-native/static/runtime-frontend/src/components/Dashboard.jsx');
    const scheduleSource = await readSource('forge-native/static/runtime-frontend/src/components/Schedule.jsx');

    expect(dashboardSource).not.toContain('const resolverPayload =');
    expect(dashboardSource).toContain("invokeEventScopedResolver(invoke, 'getRegistrations', appModeResolverPayload)");
    expect(dashboardSource).toContain("invokeEventScopedResolver(invoke, 'getActivityFeed', appModeResolverPayload, { limit: 20 })");
    expect(dashboardSource).toContain("invokeEventScopedResolver(invoke, 'getSchedule', appModeResolverPayload)");
    expect(dashboardSource).toContain("invokeEventScopedResolver(\n          invoke,\n          'checkFreeAgentReminders',");

    expect(scheduleSource).not.toContain('const resolverPayload =');
    expect(scheduleSource).toContain("invokeEventScopedResolver(invoke, 'getSchedule', appModeResolverPayload)");
  });

  it('scopes remaining admin and voting event-derived resolver calls with the shared payload helper', async () => {
    const adminSource = await readSource('forge-native/static/runtime-frontend/src/components/AdminPanel.jsx');
    const votingSource = await readSource('forge-native/static/runtime-frontend/src/components/Voting.jsx');
    const configModeSource = await readSource('forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx');

    expect(adminSource).toContain("invokeEventScopedResolver(invoke, 'getEventSettings', appModeResolverPayload)");
    expect(adminSource).toContain("invokeEventScopedResolver(invoke, 'getIdeaSummary', appModeResolverPayload)");
    expect(adminSource).toContain("'markIdeaNotViable',");
    expect(adminSource).toContain("invokeEventScopedResolver(invoke, 'updateEventSettings', appModeResolverPayload, {");
    expect(adminSource).toContain("invokeEventScopedResolver(invoke, 'adminResetEventData', appModeResolverPayload, {");
    expect(adminSource).toContain("invokeEventScopedResolver(invoke, 'updateEventBranding', appModeResolverPayload, {");

    expect(votingSource).toContain("invokeEventScopedResolver(invoke, 'castVote', appModeResolverPayload, { teamId })");

    expect(configModeSource).toContain('appModeResolverPayload = null,');
    expect(configModeSource).toContain('return buildAppModeResolverPayload(eventPageId) || {};');
  });
});
