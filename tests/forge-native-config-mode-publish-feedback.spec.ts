import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('config-mode publish feedback contract', () => {
  it('surfaces publish progress and failures inside the publish confirm modal', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigModeOverlays.jsx'),
      'utf8'
    );

    expect(source).toContain("import { Alert, Badge, Button, Modal } from '../components/ui';");
    expect(source).toContain('closeOnBackdrop={!confirmBusy}');
    expect(source).toContain('closeOnEscape={!confirmBusy}');
    expect(source).toContain('showCloseButton={!confirmBusy}');
    expect(source).toContain("title=\"Publishing changes\"");
    expect(source).toContain("title=\"Publish failed\"");
    expect(source).toContain('No new changes were published.');
    expect(source).toContain('? \'Publishing...\'');
  });

  it('turns Config Mode off after publish and keeps a visible success notice', async () => {
    const contextSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx'),
      'utf8'
    );
    const toolbarSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigToolbar.jsx'),
      'utf8'
    );

    expect(contextSource).toContain('Participant view is now updated and Config Mode is now off.');
    expect(contextSource).toContain('setIsEnabled(false);');
    expect(contextSource).toContain('setIsDrawerOpen(false);');
    expect(contextSource).toContain('setPendingConfirmType(null);');
    expect(contextSource).toContain('const timerId = window.setTimeout(() => {');

    expect(toolbarSource).toContain('publishSuccess');
    expect(toolbarSource).toContain('CheckCircle2');
    expect(toolbarSource).toContain('{publishSuccess.message}');
  });
});
