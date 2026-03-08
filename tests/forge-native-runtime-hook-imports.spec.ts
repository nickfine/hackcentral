import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('runtime hook imports', () => {
  it('imports React hooks that Dashboard uses', async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), 'forge-native/static/runtime-frontend/src/components/Dashboard.jsx'),
      'utf8'
    );

    expect(source).toContain('useCallback(');
    expect(source).toMatch(/import\s+\{[^}]*\buseCallback\b[^}]*\}\s+from\s+'react';/);
  });
});
