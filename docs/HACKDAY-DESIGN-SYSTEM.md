# HackCentral Design System

## Editorial Dark Theme

The runtime frontend uses an editorial dark UI. No backdrop-filter, no gradient borders, no ambient starfield effects in UI components. The `body::before` ambient wash (fixed 560px, two radial gradients — cyan at 12% 0% and purple at 88% 0%) is global and should not be overridden by components.

### Core surface tokens

| Token | Dark value | Usage |
|-------|-----------|-------|
| `--surface-page` | `#111827` | Page background |
| `--surface-card` | `#1f2937` | Card backgrounds |
| `--surface-elevated` | `#374151` | Elevated panels |
| `--border-default` | `rgba(255,255,255,0.1)` | Standard borders |
| `--text-primary` | `#ffffff` | Headings |
| `--text-muted` | `#9ca3af` | Secondary text |
| `--cyan-electric` | `#00f5ff` | Brand cyan (dark mode) |
| `--cyan-electric-bg` | `rgba(0,245,255,0.08)` | Cyan surface tint |
| `--cyan-electric-border` | `rgba(0,245,255,0.3)` | Cyan border |

### Typography

- **Page headings:** Fraunces (`var(--font-heading)`), `font-semibold`, applied via `style={{ fontFamily: 'var(--font-heading)' }}`
- **Body copy:** Manrope (`var(--font-body)`), inherited from `body`
- **Eyebrow labels:** `text-xs uppercase tracking-[0.22em]` in cyan or muted white

### Cyan as accent

Cyan (`#00d4e8` / `#00f5ff` in dark mode) is the primary accent. Use it on:
- Active filter states
- Vote counts and upvote tiles
- Cluster CTA elements
- Column count badges (where applicable)
- Focus rings

Do not flood the page with cyan — it is an accent, not a wash.

---

## Pain Points Tag-Colour Mapping

Defined in `src/lib/painCategoryColours.js`. 10 inferred categories map to 6 colour buckets.
All colours are muted — appropriate for dark editorial UI on `#1f2937` surfaces.

| Category | Colour bucket | Text | Background | Border |
|----------|--------------|------|-----------|--------|
| UX | cyan | `#00d4e8` | `rgba(0,212,232,0.10)` | `rgba(0,212,232,0.25)` |
| Atlassian | cyan | `#00d4e8` | `rgba(0,212,232,0.10)` | `rgba(0,212,232,0.25)` |
| Eng | teal | `#2dd4bf` | `rgba(45,212,191,0.10)` | `rgba(45,212,191,0.25)` |
| Tech Debt | teal | `#2dd4bf` | `rgba(45,212,191,0.10)` | `rgba(45,212,191,0.25)` |
| Automation | teal | `#2dd4bf` | `rgba(45,212,191,0.10)` | `rgba(45,212,191,0.25)` |
| Tooling | teal | `#2dd4bf` | `rgba(45,212,191,0.10)` | `rgba(45,212,191,0.25)` |
| Infra | amber | `#fbbf24` | `rgba(251,191,36,0.10)` | `rgba(251,191,36,0.25)` |
| Integration | amber | `#fbbf24` | `rgba(251,191,36,0.10)` | `rgba(251,191,36,0.25)` |
| Process | violet | `#a78bfa` | `rgba(167,139,250,0.10)` | `rgba(167,139,250,0.25)` |
| Customer | emerald | `#34d399` | `rgba(52,211,153,0.10)` | `rgba(52,211,153,0.25)` |
| (fallback) | slate | `#94a3b8` | `rgba(148,163,184,0.10)` | `rgba(148,163,184,0.25)` |

This mapping is consumed by:
- `PainItem` — tag chip colour (both `default` and `board` variants)
- `BoardColumn` — column header accent line and count badge
- `ClustersStrip` — cluster card left-border accent and CTA colour

---

## Pain Points Workshop Board Layout

### Pattern

The Pain Points page (`src/components/PainPoints.jsx`) renders a workshop board: pain points grouped into columns by their inferred category, sorted by vote count within each column.

### Responsive breakpoints

| Breakpoint | Layout |
|-----------|--------|
| `< 640px` (mobile) | Single column stack; each board column collapses to header-only by default, tap to expand |
| `640px–1023px` (tablet) | 2-column CSS grid (`grid-cols-2`) |
| `≥ 1024px` (desktop) | Horizontal flex row with `overflow-x-auto`; columns `min-w-[260px] max-w-[320px]`; h-scroll activates when > 4–5 columns |

### Column structure

Each `BoardColumn` contains:
1. **Header bar** — category label + count badge (category-coloured) + total votes
2. **Accent line** — 1px horizontal line in the category's border colour
3. **Card list** — `PainItem variant="board"` cards in a scrollable container (`max-h-[65vh] overflow-y-auto`)

### Clusters strip

Shown above the board when >= 1 cluster qualifies. A cluster is: **3+ pain points sharing the same inferred category AND >= 8 total votes across the group**. Detection runs on unfiltered data so clusters persist during search. Implemented in `detectClusters()` in `painCategoryColours.js`.

### v2 enhancements (not yet built)

- Drag-and-drop column / card reorder
- Keyword-based semantic clustering
- Column customisation (hide/show, reorder)
- "Start a team" CTA pre-populated with cluster's pain point IDs
