import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_ROOT = path.resolve(__dirname, '../../src/runtime');

/**
 * The runtime resolver layer was split out of a single `index.js` into
 * `index.js` + `resolvers/*.js` + `lib/*`. These source-grep contract tests
 * predate that refactor, so they read the whole runtime tree as one corpus
 * rather than assuming a single file. The code text was relocated verbatim,
 * so every existing assertion still holds against the concatenation.
 */
async function readDirSources(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const sources = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      sources.push(...(await readDirSources(full)));
    } else if (/\.(js|mjs|ts)$/.test(entry.name)) {
      sources.push(await fs.readFile(full, 'utf8'));
    }
  }
  return sources;
}

export async function readRuntimeSource() {
  const indexSource = await fs.readFile(path.join(RUNTIME_ROOT, 'index.js'), 'utf8');
  const resolverSources = await readDirSources(path.join(RUNTIME_ROOT, 'resolvers'));
  const libSources = await readDirSources(path.join(RUNTIME_ROOT, 'lib'));
  return [indexSource, ...resolverSources, ...libSources].join('\n\n');
}
