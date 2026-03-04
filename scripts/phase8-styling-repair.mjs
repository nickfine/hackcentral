#!/usr/bin/env node
import { invokePhase8Action, parseCommonArgs, writePhase8Artifacts } from './lib/phase8-webtrigger.mjs';

function renderMarkdown(report, args) {
  const lines = [];
  lines.push('# HDC Phase 8 Styling Repair');
  lines.push('');
  lines.push(`Generated at (UTC): ${report.generatedAtUtc}`);
  lines.push(`Environment: ${args.environment}`);
  lines.push(`Dry run: ${report.dryRun}`);
  lines.push(`Event query: ${report.eventNameQuery || 'n/a'}`);
  lines.push(`Event id: ${report.eventId || 'n/a'}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Processed: ${report.processedCount}`);
  lines.push(`- Changed: ${report.changedCount}`);
  lines.push(`- Failed: ${report.failedCount}`);
  lines.push('');
  lines.push('## Results');
  for (const row of report.results || []) {
    lines.push(`- ${row.eventName} (${row.eventId})`);
    lines.push(`  - pageId: ${row.pageId}`);
    lines.push(`  - status: ${row.status}`);
    lines.push(`  - changed: ${row.changed === true}`);
    lines.push(`  - macroRewritten: ${row.macroRewritten === true}`);
    lines.push(`  - fullWidthUpdated: ${row.fullWidthUpdated === true}`);
    lines.push(`  - introParagraphRemoved: ${row.introParagraphRemoved === true}`);
    if (row.reason) lines.push(`  - reason: ${row.reason}`);
  }
  lines.push('');
  lines.push('## Rollback Manifest');
  for (const row of report.rollbackManifest || []) {
    lines.push(`- eventId=${row.eventId} pageId=${row.pageId} changed=${row.changed}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseCommonArgs(process.argv.slice(2), {
    eventQuery: 'HDC',
    batchSize: 50,
    dryRun: true,
  });

  const report = await invokePhase8Action(args, {
    action: 'repair_hackday_page_styling',
    dryRun: args.dryRun,
    eventNameQuery: args.eventQuery || undefined,
    eventId: args.eventId || undefined,
    batchSize: args.batchSize,
    cursor: args.cursor || undefined,
  });

  const files = await writePhase8Artifacts({
    args,
    report,
    reportName: 'HDC-P8-STYLING-REPAIR',
    markdown: renderMarkdown(report, args),
  });
  console.log(files.jsonPath);
  console.log(files.mdPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
