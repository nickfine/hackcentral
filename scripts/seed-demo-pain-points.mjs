#!/usr/bin/env node
/**
 * Seed 10 demo pain points for screencap purposes.
 * Run: node scripts/seed-demo-pain-points.mjs
 * Nuke: use Admin Panel > Pain Points > Delete All, or run adminDeleteAll mutation.
 */

const CONVEX_URL = 'https://groovy-duck-293.convex.cloud';

const PAIN_POINTS = [
  // --- Atlassian Forge ---
  {
    title: 'Forge app load times are too slow for complex macros',
    submitterName: 'Demo User',
    description: 'Macros with multiple resolver calls take 3-5 seconds to load, breaking the flow of editing a Confluence page.',
    effortEstimate: 'medium',
    impactEstimate: 'high',
  },
  {
    title: 'No way to share Forge app config across Confluence spaces',
    submitterName: 'Demo User',
    description: 'Every space admin has to reconfigure the same Forge app settings independently — there\'s no inheritance or global defaults.',
    effortEstimate: 'medium',
    impactEstimate: 'medium',
  },
  {
    title: 'Forge resolver error messages are too cryptic to debug',
    submitterName: 'Demo User',
    description: 'When a Forge resolver throws, the error surfaced in the UI is a generic 500 with no detail. Developers waste hours hunting down the root cause.',
    effortEstimate: 'low',
    impactEstimate: 'medium',
  },

  // --- AI ---
  {
    title: 'AI code suggestions don\'t understand our internal APIs',
    submitterName: 'Demo User',
    description: 'Copilot and similar tools suggest public library patterns that conflict with our internal SDK conventions, creating more review burden than they save.',
    effortEstimate: 'high',
    impactEstimate: 'high',
  },
  {
    title: 'No audit trail for what AI tools have accessed in our repos',
    submitterName: 'Demo User',
    description: 'We have no visibility into which AI tools are querying our codebase or what data they\'ve seen, which is a compliance risk.',
    effortEstimate: 'medium',
    impactEstimate: 'high',
  },
  {
    title: 'AI meeting summaries consistently miss side-conversation actions',
    submitterName: 'Demo User',
    description: 'Action items that come up in chat during a call never appear in the AI-generated summary, so they get dropped.',
    effortEstimate: 'low',
    impactEstimate: 'medium',
  },

  // --- General ---
  {
    title: 'Cross-team knowledge silos slow down onboarding',
    submitterName: 'Demo User',
    description: 'New joiners spend their first two weeks chasing tribal knowledge that\'s never been documented. We lose momentum and their fresh-eyes perspective.',
    effortEstimate: 'high',
    impactEstimate: 'high',
  },
  {
    title: 'Sprint retros rarely lead to measurable process changes',
    submitterName: 'Demo User',
    description: 'We identify the same problems sprint after sprint but have no lightweight way to track whether the agreed actions were actually implemented.',
    effortEstimate: 'low',
    impactEstimate: 'medium',
  },
  {
    title: 'Customer feature requests get lost between sales and product',
    submitterName: 'Demo User',
    description: 'Sales captures requests in their CRM, product works from a separate backlog — there\'s no reliable handoff and high-value signals quietly disappear.',
    effortEstimate: 'medium',
    impactEstimate: 'high',
  },
  {
    title: 'Release notes are always written last-minute and lack context',
    submitterName: 'Demo User',
    description: 'Engineers write release notes under pressure on deploy day. Customers get terse bullet points with no "why this matters" context.',
    effortEstimate: 'low',
    impactEstimate: 'low',
  },
];

async function submitPainPoint(pp) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'painPoints:submit',
      args: pp,
      format: 'json',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

console.log(`Seeding ${PAIN_POINTS.length} demo pain points to ${CONVEX_URL}...\n`);

let ok = 0;
for (const pp of PAIN_POINTS) {
  try {
    await submitPainPoint(pp);
    console.log(`  ✓  ${pp.title}`);
    ok++;
  } catch (err) {
    console.error(`  ✗  ${pp.title}\n     ${err.message}`);
  }
}

console.log(`\nDone — ${ok}/${PAIN_POINTS.length} inserted.`);
console.log('To clear: use Admin Panel > Pain Points > Delete All, or the adminDeleteAll mutation.');
