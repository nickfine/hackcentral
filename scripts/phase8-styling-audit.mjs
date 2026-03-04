#!/usr/bin/env node
import { invokePhase8Action, parseCommonArgs, writePhase8Artifacts } from './lib/phase8-webtrigger.mjs';

function renderMarkdown(report, args) {
  const lines = [];
  lines.push('# HDC Phase 8 Styling Audit');
  lines.push('');
  lines.push(`Generated at (UTC): ${report.generatedAtUtc}`);
  lines.push(`Environment: ${args.environment}`);
  lines.push(`Event query: ${report.eventNameQuery || 'n/a'}`);
  lines.push(`Event id: ${report.eventId || 'n/a'}`);
  lines.push(`Processed: ${report.processedCount}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Runtime macro: ${report.runtimeMacroCount}`);
  lines.push(`- Legacy macro: ${report.legacyMacroCount}`);
  lines.push(`- Missing macro: ${report.missingMacroCount}`);
  lines.push(`- Repair recommended: ${report.repairRecommendedCount}`);
  lines.push(`- High risk: ${report.highRiskCount}`);
  lines.push('');
  lines.push('## Results');
  for (const row of report.results || []) {
    lines.push(`- ${row.eventName} (${row.eventId})`);
    lines.push(`  - pageId: ${row.pageId}`);
    lines.push(`  - macro: ${row.macroSignature}`);
    lines.push(`  - fullWidth: draft=${row.fullWidth?.draft ?? 'null'} published=${row.fullWidth?.published ?? 'null'}`);
    lines.push(`  - introBeforeMacro: ${row.hasLeadingParagraphBeforeMacro}`);
    lines.push(`  - recommendation: ${row.recommendedAction} (${row.riskLevel})`);
    if (row.reason) lines.push(`  - reason: ${row.reason}`);
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
    action: 'audit_hackday_page_styling',
    eventNameQuery: args.eventQuery || undefined,
    eventId: args.eventId || undefined,
    batchSize: args.batchSize,
    cursor: args.cursor || undefined,
  });

  const files = await writePhase8Artifacts({
    args,
    report,
    reportName: 'HDC-P8-STYLING-AUDIT',
    markdown: renderMarkdown(report, args),
  });
  console.log(files.jsonPath);
  console.log(files.mdPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
