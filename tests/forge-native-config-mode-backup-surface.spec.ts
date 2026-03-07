import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('config-mode backup surface contract', () => {
  it('keeps backup and restore controls in Admin Panel instead of the config drawer', async () => {
    const sidePanelSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx'),
      'utf8'
    );
    const adminPanelSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/components/AdminPanel.jsx'),
      'utf8'
    );

    expect(sidePanelSource).not.toContain('Backup Safety');
    expect(sidePanelSource).not.toContain('Restore (Platform Admin)');
    expect(sidePanelSource).not.toContain('Current status');
    expect(sidePanelSource).not.toContain('Backup and restore controls now live in the Admin Panel');
    expect(sidePanelSource).not.toContain('>Actions<');
    expect(sidePanelSource).toContain('Open Admin Panel');

    expect(adminPanelSource).toContain('Backup & Restore');
    expect(adminPanelSource).toContain('Backup Safety');
    expect(adminPanelSource).toContain('Restore (Platform Admin)');
    expect(adminPanelSource).toContain('Create Backup Now');
    expect(adminPanelSource).toContain('Preview Restore');
    expect(adminPanelSource).toContain('Apply Restore');
  });
});
