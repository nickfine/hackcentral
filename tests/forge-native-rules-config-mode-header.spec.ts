import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('rules config-mode header contract', () => {
  it('registers the rules header title and renders it with EditableText', async () => {
    const [registrySource, rulesSource] = await Promise.all([
      fs.readFile(
        path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/configMode/contentRegistry.js'),
        'utf8'
      ),
      fs.readFile(
        path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/components/Rules.jsx'),
        'utf8'
      ),
    ]);

    expect(registrySource).toContain("key: 'rules.header.title'");
    expect(registrySource).toContain("label: 'Rules Header Title'");
    expect(rulesSource).toContain('contentKey="rules.header.title"');
    expect(rulesSource).toContain('fallback="HackDay Rules"');
    expect(rulesSource).not.toContain('<h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary mb-2">');
  });
});
