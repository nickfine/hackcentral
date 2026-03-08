import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('macro create wizard rules contract', () => {
  it('removes dead rule fields from the legacy macro create flow', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/macro-frontend/src/App.tsx'),
      'utf8'
    );

    expect(source).toContain('<label htmlFor="m-max-team">Max team size</label>');
    expect(source).not.toContain('<label htmlFor="m-min-team">Min team size</label>');
    expect(source).not.toContain('minTeamSize,');
    expect(source).not.toContain('setMinTeamSize');
    expect(source).not.toContain('minTeamSize:');
    expect(source).not.toContain('Allow cross-team mentoring');
    expect(source).not.toContain('Require demo link');
    expect(source).not.toContain('Judging model');
    expect(source).not.toContain('Categories (comma-separated)');
    expect(source).not.toContain('<label htmlFor="m-prizes">Prizes</label>');
    expect(source).not.toContain('allowCrossTeamMentoring,');
    expect(source).not.toContain('requireDemoLink,');
    expect(source).not.toContain('judgingModel,');
    expect(source).not.toContain('categoriesInput,');
    expect(source).not.toContain('prizesText,');
    expect(source).not.toContain('allowCrossTeamMentoring:');
    expect(source).not.toContain('requireDemoLink:');
    expect(source).not.toContain('judgingModel:');
    expect(source).not.toContain('categories:');
    expect(source).not.toContain('prizesText:');
  });
});
