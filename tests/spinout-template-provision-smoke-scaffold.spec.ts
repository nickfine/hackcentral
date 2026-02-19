import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const scriptPath = path.resolve(process.cwd(), 'scripts/spinout-template-provision-smoke-scaffold.mjs');

function runCli(args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
  });
}

describe('spinout-template-provision-smoke-scaffold CLI', () => {
  it('fails when required flags are missing', () => {
    const result = runCli([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Missing required flags --parent-url, --child-url, --event-name, --primary-admin-email.'
    );
  });

  it('rejects non-https urls', () => {
    const result = runCli([
      '--parent-url',
      'http://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=11',
      '--child-url',
      'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=22',
      '--event-name',
      'HDC Spinout Sample',
      '--primary-admin-email',
      'owner@example.com',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('parent-url must use https.');
  });

  it('writes scaffold artifact for valid inputs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hdc-spinout-smoke-'));
    const outFile = path.join(dir, 'artifact.md');
    try {
      const result = runCli([
        '--parent-url',
        'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=111',
        '--child-url',
        'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=222',
        '--event-name',
        'HDC Spinout Example',
        '--primary-admin-email',
        'owner@example.com',
        '--out',
        outFile,
      ]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`Generated: ${path.resolve(outFile)}`);
      const content = fs.readFileSync(outFile, 'utf8');
      expect(content).toContain('Parent pageId: 111');
      expect(content).toContain('Child pageId: 222');
      expect(content).toContain('Event name: HDC Spinout Example');
      expect(content).toContain('Primary admin email: owner@example.com');
      expect(content).toContain('- [ ] PASS');
      expect(content).toContain('- [ ] BLOCKED');
      expect(content).toContain('- [ ] FAIL');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

