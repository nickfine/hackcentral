import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('create wizard child-ownership contract', () => {
  it('keeps the create flow focused on setup and removes schedule and branding ownership screens', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/frontend/src/App.tsx'),
      'utf8'
    );

    expect(source).toContain('Complete the setup details, then review and create your HackDay.');
    expect(source).toContain('Setup Information');
    expect(source).toContain('Open registration immediately');
    expect(source).toContain('HackDay Setup');
    expect(source).toContain('Pain Import');
    expect(source).toContain('Max team size');
    expect(source).not.toContain("['Basic Info', 'Schedule', 'Rules', 'Review']");
    expect(source).not.toContain("['Basic Info', 'Rules', 'Review']");
    expect(source).not.toContain('Set up your event in 3 steps');
    expect(source).not.toContain('Step {wStep} of 3');
    expect(source).not.toContain('Configure schedule and branding later in the HackDay page while Config Mode is enabled.');
    expect(source).not.toContain('Schedule ownership');
    expect(source).not.toContain('Branding ownership');
    expect(source).not.toContain('Child Integrations');
    expect(source).not.toContain('child HackDay page');
    expect(source).not.toContain('Schedule and branding are configured after creation in the HackDay page while Config Mode is enabled.');
    expect(source).not.toContain('<p className="review-block-title">Rules</p>');
    expect(source).not.toContain('wMinTeamSize');
    expect(source).not.toContain('htmlFor="w-min-team"');
    expect(source).not.toContain('minTeamSize:');
    expect(source).not.toContain('<span className="toggle-title">Allow cross-team mentoring</span>');
    expect(source).not.toContain('<span className="toggle-title">Require demo link</span>');
    expect(source).not.toContain('<label htmlFor="w-judging" className="field-label">Judging model</label>');
    expect(source).not.toContain('<label htmlFor="w-categories" className="field-label">Categories</label>');
    expect(source).not.toContain('<label htmlFor="w-prizes" className="field-label">Prizes</label>');
    expect(source).not.toContain('<p className="review-block-title">Schedule</p>');
    expect(source).not.toContain('<p className="review-block-title">Branding</p>');
    expect(source).not.toContain('allowCrossTeamMentoring: wAllowCrossTeamMentoring');
    expect(source).not.toContain('requireDemoLink: wRequireDemoLink');
    expect(source).not.toContain('judgingModel: wJudgingModel');
    expect(source).not.toContain('categories: categories.length > 0 ? categories : undefined');
    expect(source).not.toContain('prizesText: wPrizesText.trim() || undefined');
    expect(source).not.toContain('setWBannerMessage');
    expect(source).not.toContain('setWAccentColor');
    expect(source).not.toContain('setWBannerImageUrl');
    expect(source).not.toContain('setWThemePreference');
    expect(source).not.toContain('bannerMessage: wBannerMessage');
    expect(source).not.toContain('accentColor: wAccentColor');
    expect(source).not.toContain('bannerImageUrl: wBannerImageUrl');
    expect(source).not.toContain('themePreference: wThemePreference');
    expect(source).not.toContain('review-color-chip');
  });
});
