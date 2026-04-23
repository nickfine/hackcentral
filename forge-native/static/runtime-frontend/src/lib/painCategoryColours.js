/**
 * Tag-colour mapping for the Pain Points workshop board.
 * 10 PAIN_CATEGORIES are mapped to 6 colour buckets.
 * Used by: PainItem (tag chip), BoardColumn (header accent), ClustersStrip (card accent).
 */

import { inferCategoryLabel } from '../components/shared/PainItem';

// ─── Colour buckets ───────────────────────────────────────────────────────────

const CYAN   = { text: '#00d4e8', bg: 'rgba(0,212,232,0.10)',   border: 'rgba(0,212,232,0.25)',   dot: '#00d4e8' };
const TEAL   = { text: '#2dd4bf', bg: 'rgba(45,212,191,0.10)',  border: 'rgba(45,212,191,0.25)',  dot: '#2dd4bf' };
const AMBER  = { text: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.25)',  dot: '#fbbf24' };
const VIOLET = { text: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)', dot: '#a78bfa' };
const EMERALD= { text: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.25)',  dot: '#34d399' };
const SLATE  = { text: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', dot: '#94a3b8' };

// ─── Category → colour mapping ────────────────────────────────────────────────

export const CATEGORY_COLOUR_MAP = {
  'UX':          CYAN,
  'Atlassian':   CYAN,
  'Eng':         TEAL,
  'Tech Debt':   TEAL,
  'Automation':  TEAL,
  'Tooling':     TEAL,
  'Infra':       AMBER,
  'Integration': AMBER,
  'Process':     VIOLET,
  'Customer':    EMERALD,
};

/**
 * Returns colour config for a category label.
 * Falls back to slate for any unknown label.
 */
export function getCategoryColour(label) {
  return CATEGORY_COLOUR_MAP[label] ?? SLATE;
}

// ─── Column ordering ──────────────────────────────────────────────────────────

/**
 * Preferred left-to-right column order on the board.
 * User-facing categories first, then technical ones.
 */
export const COLUMN_ORDER = [
  'UX',
  'Atlassian',
  'Customer',
  'Process',
  'Eng',
  'Tech Debt',
  'Automation',
  'Tooling',
  'Infra',
  'Integration',
];

// ─── Cluster detection ────────────────────────────────────────────────────────

/**
 * A cluster is: 3+ pain points sharing the same inferred category
 * AND total reactionCount across the group >= 8.
 *
 * @param {Array} painPoints - raw pain point objects from the resolver
 * @returns {Array} up to 4 clusters, sorted by totalVotes desc
 *   Each: { category, count, totalVotes, painPointIds }
 */
export function detectClusters(painPoints) {
  if (!painPoints?.length) return [];

  // Group by inferred category
  const groups = {};
  for (const pp of painPoints) {
    const cat = inferCategoryLabel(pp.title, pp.description);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(pp);
  }

  const clusters = Object.entries(groups)
    .map(([category, items]) => ({
      category,
      count: items.length,
      totalVotes: items.reduce((sum, pp) => sum + (pp.reactionCount || 0), 0),
      painPointIds: items.map((pp) => pp._id),
    }))
    .filter((c) => c.count >= 3 && c.totalVotes >= 8)
    .sort((a, b) => b.totalVotes - a.totalVotes);

  return clusters.slice(0, 4);
}
