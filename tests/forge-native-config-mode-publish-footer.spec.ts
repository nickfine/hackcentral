import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('config-mode publish footer contract', () => {
  it('uses an inline footer state machine for publish confirmation, progress, and retry', async () => {
    const contextSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigModeContext.jsx'),
      'utf8'
    );
    const sidePanelSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx'),
      'utf8'
    );

    expect(contextSource).toContain("const publishFooterState = useMemo(() => {");
    expect(contextSource).toContain("if (isPublishing) return 'publishing';");
    expect(contextSource).toContain("if (pendingConfirmType !== 'publish') return 'default';");
    expect(contextSource).toContain("if (saveError) return 'error';");
    expect(contextSource).toContain("return 'confirm';");
    expect(contextSource).toContain('cancelPublishDraftRequest');
    expect(contextSource).toContain('publishSummary');

    expect(sidePanelSource).toContain("publishFooterState === 'publishing'");
    expect(sidePanelSource).toContain("publishFooterState === 'error'");
    expect(sidePanelSource).toContain('Updating the live participant view now.');
    expect(sidePanelSource).toContain('Keep this drawer open until publishing finishes.');
    expect(sidePanelSource).toContain('Publishing...');
    expect(sidePanelSource).toContain('cancelPublishDraftRequest');
  });
});
