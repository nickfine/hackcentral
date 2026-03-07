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
});
