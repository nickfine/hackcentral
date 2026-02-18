import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = '/Users/nickster/Downloads/HackCentral';
const SCRIPT = path.join(ROOT, 'scripts', 'phase7-weekly-report-scaffold.mjs');

describe('phase7 weekly report scaffold', () => {
  it('generates a prefilled weekly verification artifact', () => {
    const outputPath = path.join(os.tmpdir(), `phase7-weekly-scaffold-${Date.now()}.md`);
    const stdout = execFileSync('node', [SCRIPT, '--week-of', '2026-02-23', '--out', outputPath], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(stdout).toContain('Generated:');
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('# HDC v2 Phase 6 Weekly Verification');
    expect(content).toContain('- Week of: 2026-02-23');
    expect(content).toContain('qa:phase6:telemetry-check');
    expect(content).toContain('Total submitted hacks');

    fs.rmSync(outputPath, { force: true });
  });
});
