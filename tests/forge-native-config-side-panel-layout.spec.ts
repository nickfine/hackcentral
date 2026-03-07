import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ConfigSidePanel layout contract', () => {
  it('collapses help content and separates primary actions from escape actions', async () => {
    const sidePanelSource = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/ConfigSidePanel.jsx'),
      'utf8'
    );

    expect(sidePanelSource).toContain('const [isHelpOpen, setIsHelpOpen] = useState(false);');
    expect(sidePanelSource).toContain('aria-expanded={isHelpOpen}');
    expect(sidePanelSource).toContain('aria-controls="config-how-this-works"');
    expect(sidePanelSource).toContain('{isHelpOpen && (');
    expect(sidePanelSource).toContain('How this works');
    expect(sidePanelSource).toContain('role="group"');
    expect(sidePanelSource).toContain('aria-label="Primary draft actions"');
    expect(sidePanelSource).toContain('aria-label="Escape draft actions"');

    const primaryActionsIndex = sidePanelSource.indexOf('aria-label="Primary draft actions"');
    const escapeActionsIndex = sidePanelSource.indexOf('aria-label="Escape draft actions"');
    const primaryActionsSource = sidePanelSource.slice(primaryActionsIndex, escapeActionsIndex);

    expect(primaryActionsSource.indexOf('Publish')).toBeLessThan(primaryActionsSource.indexOf('Save Draft'));
    expect(primaryActionsIndex).toBeLessThan(escapeActionsIndex);
  });
});
