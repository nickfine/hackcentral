#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from './lib/repo-root.mjs';

const ROOT = resolveRepoRoot(import.meta.url);

const DEFAULT_REQUIRED_SUITES = [
  'tests/forge-native-registry-contract.spec.ts',
  'tests/forge-native-registry-utils.spec.ts',
  'tests/forge-native-registry-runtime-modes.spec.ts',
  'tests/forge-native-problem-exchange-contract.spec.ts',
  'tests/forge-native-problem-exchange-runtime-modes.spec.ts',
  'tests/forge-native-problem-exchange-utils.spec.ts',
  'tests/forge-native-pipeline-contract.spec.ts',
  'tests/forge-native-pipeline-runtime-modes.spec.ts',
  'tests/forge-native-showcase-contract.spec.ts',
  'tests/forge-native-showcase-runtime-modes.spec.ts',
];

function resolveSuites(argv) {
  const suites = argv.slice(2).map((suitePath) => suitePath.trim()).filter(Boolean);
  return suites.length > 0 ? suites : DEFAULT_REQUIRED_SUITES;
}

function main() {
  const suites = resolveSuites(process.argv);
  const missing = suites.filter((suitePath) => !fs.existsSync(path.join(ROOT, suitePath)));

  if (missing.length > 0) {
    console.error('Missing required test suite files:');
    for (const suite of missing) {
      console.error(`- ${suite}`);
    }
    process.exit(1);
  }

  console.log(`Verified ${suites.length} required suite files.`);
}

main();
