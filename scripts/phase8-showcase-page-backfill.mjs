#!/usr/bin/env node
import { invokePhase8Action, parseCommonArgs, writePhase8Artifacts } from './lib/phase8-webtrigger.mjs';

function renderMarkdown(report, args) {
  const lines = [];
  lines.push('# HDC Phase 8 Showcase Page Backfill');
  lines.push('');
  lines.push(`Generated at (UTC): ${report.generatedAtUtc}`);
  lines.push(`Environment: ${args.environment}`);
  lines.push(`Dry run: ${report.dryRun}`);
  lines.push(`Source event id: ${report.sourceEventId || 'n/a'}`);
  lines.push('');
  lines.push('## Batch Summary');
  lines.push(`- Processed: ${report.processedCount}`);
  lines.push(`- Created: ${report.createdCount}`);
  lines.push(`- Skipped: ${report.skippedCount}`);
  lines.push(`- Failed: ${report.failedCount}`);
  lines.push(`- Stopped on error: ${report.stoppedOnError}`);
  lines.push('');
  lines.push('## Coverage');
  lines.push(`- Total showcase rows: ${report.coverage?.total ?? 0}`);
  lines.push(`- Page-backed rows: ${report.coverage?.pageBacked ?? 0}`);
  lines.push(`- Legacy rows: ${report.coverage?.legacyCount ?? 0}`);
  lines.push('');
  lines.push('## Results');
  for (const row of report.results || []) {
    lines.push(`- projectId=${row.projectId} status=${row.status}`);
    if (row.confluencePageId) lines.push(`  - confluencePageId: ${row.confluencePageId}`);
    if (Array.isArray(row.outputPageIds)) lines.push(`  - outputPageIds: ${row.outputPageIds.join(', ') || 'none'}`);
    if (row.reason) lines.push(`  - reason: ${row.reason}`);
  }
  lines.push('');
  lines.push('## Rollback Manifest');
  for (const row of report.rollbackManifest || []) {
    lines.push(`- projectId=${row.projectId} createdPageIds=${(row.createdPageIds || []).join(', ') || 'none'}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {
    batchSize: 20,
    dryRun: true,
  });

  const report = await invokePhase8Action(args, {
    action: 'backfill_showcase_pages',
    dryRun: args.dryRun,
    sourceEventId: args.sourceEventId || undefined,
    batchSize: args.batchSize,
    cursor: args.cursor || undefined,
  });

  const files = await writePhase8Artifacts({
    args,
    report,
    reportName: 'HDC-P8-SHOWCASE-BACKFILL',
    markdown: renderMarkdown(report, args),
  });
  console.log(files.jsonPath);
  console.log(files.mdPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
