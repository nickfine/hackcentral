import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('config-mode publish feedback contract', () => {
  it('keeps publish feedback in the drawer footer and out of the centered modal', async () => {
    const overlaySource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigModeOverlays.jsx'),
      'utf8'
    );
    const sidePanelSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx'),
      'utf8'
    );

    expect(overlaySource).toContain("import { Button, Modal } from '../components/ui';");
    expect(overlaySource).toContain('closeOnBackdrop={!confirmBusy}');
    expect(overlaySource).toContain('closeOnEscape={!confirmBusy}');
    expect(overlaySource).toContain('showCloseButton={!confirmBusy}');
    expect(overlaySource).not.toContain('title="Publishing changes"');
    expect(overlaySource).not.toContain('title="Publish failed"');
    expect(overlaySource).not.toContain('Change Summary');

    expect(sidePanelSource).toContain("publishFooterState === 'default'");
    expect(sidePanelSource).toContain('Ready to publish');
    expect(sidePanelSource).toContain('Publish failed');
    expect(sidePanelSource).toContain('Publishing changes');
    expect(sidePanelSource).toContain('No new changes were published.');
    expect(sidePanelSource).toContain('Publish now');
    expect(sidePanelSource).toContain('Retry publish');
    expect(sidePanelSource).toContain('cancelPublishDraftRequest');
  });

  it('turns Config Mode off after publish and keeps a visible success notice near the config control', async () => {
    const contextSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx'),
      'utf8'
    );
    const appLayoutSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/components/AppLayout.jsx'),
      'utf8'
    );

    expect(contextSource).toContain('Participant view is now updated and Config Mode is now off.');
    expect(contextSource).toContain('setIsEnabled(false);');
    expect(contextSource).toContain('setIsDrawerOpen(false);');
    expect(contextSource).toContain('setPendingConfirmType(null);');
    expect(contextSource).toContain('const timerId = window.setTimeout(() => {');
    expect(contextSource).toContain("pendingConfirmType === 'publish'");
    expect(contextSource).toContain("!pendingConfirmType || pendingConfirmType === 'publish'");

    expect(appLayoutSource).toContain('publishSuccess?.message || saveError || null');
    expect(appLayoutSource).toContain('CheckCircle2');
    expect(appLayoutSource).toContain('TriangleAlert');
  });
});
