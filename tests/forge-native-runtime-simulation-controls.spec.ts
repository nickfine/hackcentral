import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function readSource(relativePath: string) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('runtime simulation controls contract', () => {
  it('keeps header simulation controls available to event admins without global dev mode', async () => {
    const layoutSource = await readSource('forge-native/static/runtime-frontend/src/components/AppLayout.jsx');

    expect(layoutSource).toContain("const canUseDevControls = isDevMode || isRealAdmin || isEventAdmin;");
    expect(layoutSource).toContain('{canUseDevControls && (');
    expect(layoutSource).toContain("const devModeActive = canUseDevControls && Boolean(devRoleOverride || isDevMode);");
  });

  it('keeps admin-panel phase simulation available to event admins', async () => {
    const appSource = await readSource('forge-native/static/runtime-frontend/src/App.jsx');

    expect(appSource).toContain("const canUseSimulationControls = devMode || isEventAdmin || user?.role === 'admin';");
    expect(appSource).toContain('onPhaseChange={canUseSimulationControls ? handlePhaseChange : null}');
  });
});
