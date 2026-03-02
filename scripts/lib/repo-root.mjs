import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT_ENV_VAR = 'HDC_REPO_ROOT';
const REQUIRED_MARKERS = ['package.json', 'forge-native', 'docs'];

function hasRepoMarkers(candidateRoot) {
  return REQUIRED_MARKERS.every((marker) => fs.existsSync(path.join(candidateRoot, marker)));
}

export function resolveRepoRoot(importMetaUrl) {
  const envRootRaw = process.env[REPO_ROOT_ENV_VAR];
  if (envRootRaw && envRootRaw.trim()) {
    const envRoot = path.resolve(envRootRaw.trim());
    if (!hasRepoMarkers(envRoot)) {
      throw new Error(
        `Invalid ${REPO_ROOT_ENV_VAR}: "${envRoot}" is missing required markers (${REQUIRED_MARKERS.join(', ')}).`
      );
    }
    return envRoot;
  }

  let current = path.resolve(path.dirname(fileURLToPath(importMetaUrl)));
  while (true) {
    if (hasRepoMarkers(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(`Unable to resolve repository root. Set ${REPO_ROOT_ENV_VAR} to override.`);
}

export function repoRootCommand() {
  return 'REPO_ROOT="${HDC_REPO_ROOT:-$(git rev-parse --show-toplevel)}"';
}
