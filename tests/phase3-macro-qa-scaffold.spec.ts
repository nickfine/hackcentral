import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const scriptPath = path.resolve(process.cwd(), 'scripts/phase3-macro-qa-scaffold.mjs');

function runCli(args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
  });
}

describe('phase3-macro-qa-scaffold CLI', () => {
  it('fails when required URL flags are missing', () => {
    const result = runCli([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required flags --parent-url and --instance-url.');
  });

  it('rejects non-https URLs', () => {
    const result = runCli([
      '--parent-url',
      'http://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=1',
      '--instance-url',
      'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=2',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('parent-url must use https.');
  });

  it('rejects invalid path variants', () => {
    const result = runCli([
      '--parent-url',
      'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action/extra?pageId=1',
      '--instance-url',
      'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=2',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('parent-url must use exact path /wiki/pages/viewpage.action.');
  });

  it('rejects lookalike non-Atlassian hosts', () => {
    const result = runCli([
      '--parent-url',
      'https://hackdaytemp.evilatlassian.net/wiki/pages/viewpage.action?pageId=1',
      '--instance-url',
      'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=2',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('parent-url must point to an atlassian.net host.');
  });

  it('writes a scaffold artifact for valid URLs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hdc-macro-qa-'));
    const outFile = path.join(dir, 'artifact.md');
    try {
      const result = runCli([
        '--parent-url',
        'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=111',
        '--instance-url',
        'https://hackdaytemp.atlassian.net/wiki/pages/viewpage.action?pageId=222',
        '--out',
        outFile,
      ]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`Generated: ${path.resolve(outFile)}`);
      const content = fs.readFileSync(outFile, 'utf8');
      expect(content).toContain('Parent pageId: 111');
      expect(content).toContain('Instance pageId: 222');
      expect(content).toContain('- [ ] PASS');
      expect(content).toContain('- [ ] BLOCKED');
      expect(content).toContain('- [ ] FAIL');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
