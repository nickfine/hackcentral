import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/App.tsx');
const layoutPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/components/Layout.tsx');
const pipelineHeroPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/components/pipeline/PipelineHero.tsx');
const stageDetailPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/components/pipeline/StageDetail.tsx');
const demoStatePath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/components/shared/DemoState.tsx');
const demoExamplesPath = path.resolve(process.cwd(), 'forge-native/static/frontend/src/demo/examples.ts');

describe('HackCentral demo empty states', () => {
  it('defines shared demo data and a reusable demo-state component', () => {
    const demoExamples = fs.readFileSync(demoExamplesPath, 'utf8');
    const demoState = fs.readFileSync(demoStatePath, 'utf8');

    expect(demoExamples).toContain('export const DEMO_ACTIVITY_EXAMPLES');
    expect(demoExamples).toContain('export const DEMO_NOTIFICATION_EXAMPLES');
    expect(demoExamples).toContain('export const DEMO_PIPELINE_STAGE_EXAMPLES');
    expect(demoState).toContain('Demo examples');
    expect(demoState).toContain('className={`demo-state');
  });

  it('wires demo-state content into the main app empty branches', () => {
    const appSource = fs.readFileSync(appPath, 'utf8');

    expect(appSource).toContain('Activity will appear here once hacks are submitted and HackDays are running.');
    expect(appSource).toContain("Recommendations will appear once there&apos;s activity in your space.");
    expect(appSource).toContain('Nothing shipped yet — be the first. Submit a Hack');
    expect(appSource).toContain('Featured hack examples');
    expect(appSource).toContain('AI Tooling examples');
    expect(appSource).toContain('Pain examples');
    expect(appSource).toContain('Search examples');
    expect(appSource).toContain('Example notifications');
    expect(appSource).not.toContain('What activity looks like once teams start shipping');
    expect(appSource).not.toContain('Example recommendations');
  });

  it('covers the switcher and pipeline empty states too', () => {
    const layoutSource = fs.readFileSync(layoutPath, 'utf8');
    const heroSource = fs.readFileSync(pipelineHeroPath, 'utf8');
    const detailSource = fs.readFileSync(stageDetailPath, 'utf8');

    expect(layoutSource).toContain('No live events yet.');
    expect(layoutSource).toContain('DEMO_SWITCHER_EMPTY_EXAMPLES');
    expect(heroSource).toContain('Pipeline examples');
    expect(detailSource).toContain('Example pains in this stage');
    expect(detailSource).toContain('Example items in this stage');
  });
});
