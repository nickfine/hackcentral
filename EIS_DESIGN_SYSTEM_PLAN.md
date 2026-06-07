# Apply EIS Design System to HDC

## Context

The EIS Design System (`/Users/nickster/Downloads/eis-design-system.md`) standardises the look of HackDay Central and its three sibling products on:
- Single accent colour `#FF5C25` (Adaptavist orange), retiring teal
- Warm light palette: page `#F7F3EA`, surface `#FEFBF4`, ink `#191F39`, muted `#6B6E76`, hairline `#EAE5DA`
- IBM Plex Sans for body/UI, Fraunces for hero headings only, IBM Plex Mono for code/IDs/metadata
- Four-tier type scale (32 / 20 / 16 / 13px) with 13px UPPERCASE letter-spacing 0.08em labels
- Three hierarchy levels — page, section, item — never a bordered rounded card inside a bordered rounded card
- `rounded-xl` sections, `rounded-lg` buttons and inputs, 8px rhythm, soft single elevation on sections only

The HDC `tokens.css` already has a `:root` block labelled `EIS Design System — warm light theme` (line 309) with most of the colour palette correct, but the migration is half-finished:
- The earlier `:root` block (lines 9-204) still defines teal `--event-accent-base: #0f766e`, Manrope body font, JetBrains Mono, heavy shadows and a 10/14/18/22/28px radius scale that does not match the EIS rounded-lg / rounded-xl pair
- The dark-mode block at line 451 sets `--accent: #2dd4bf` (teal) and cyan neon glows, contradicting the single-accent rule
- `tailwind.config.js` `fontFamily` is system-ui across `sans`, `heading`, `display` — Tailwind utility classes never see the real fonts
- 13 source files hardcode teal/cyan values (`#0f766e`, `#14b8a6`, `#0ea5e9`, cyan-100/400) bypassing the token layer. Eight are in scope: `Tabs.jsx`, `Progress.jsx`, `Marketplace.jsx`, `Schedule.jsx`, `TeamDetail.jsx`, `shared/TeamCard.jsx`, `shared/NavItem.jsx` (dark-mode glow), `teamDetail/PainPointsPanel.jsx`. Five are out of scope (HD children territory): `AdminPanel.jsx`, `adminPanel/PhasesPanel.jsx`, `adminPanel/UsersPanel.jsx`, `adminPanel/MessagingPanel.jsx`, `lib/themePresets.js`. (`index.css` also contains hex values; it is in scope as part of the global stylesheet.)
- `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` are not installed

Outcome: HDC renders the EIS palette and typography consistently as the default cascade. Teal is removed from HDC's default surfaces. AdminPanel and the `adminPanel/` subfolder are excluded (per-event admin = HD children territory). Per-event branding controls and the Editorial / Summit / Studio theme presets remain functional for HD children that have selected them via AdminPanel.

## Scope

In scope (`forge-native/static/runtime-frontend/`):
- `src/styles/tokens.css` — default cascade only; do not touch `[data-theme-preset="editorial"|"summit"|"studio"]` preset blocks (HD children may have those selected)
- `tailwind.config.js`
- `src/main.jsx` (font imports)
- `package.json` (font dependencies, then `npm install`)
- `src/data/constants.js` (APP_VERSION bump)
- `src/index.css` (utility class additions, any teal/cyan hex sweep)
- The 8 non-admin component files that currently hardcode teal/cyan

Out of scope:
- `src/components/AdminPanel.jsx`
- `src/components/adminPanel/*`
- `src/lib/themePresets.js` — preset definitions drive HD children's brand picker, leave intact
- The `[data-theme-preset="editorial"|"summit"|"studio"]` selector blocks in `tokens.css`
- Per-event branding controls (live in AdminPanel)
- `forge-native/static/frontend/` and `forge-native/static/macro-frontend/`
- Three-level hierarchy refactor (no bordered card inside bordered card) — follow-up plan

## Approach

### Phase 0 — Wire the plan into the bootstrap

- Append a single line to `/Users/nickster/Downloads/HackCentral-tag-hackday/CLAUDE.md` (project-level) under the `## Reference Docs` section pointing the next session at `EIS_DESIGN_SYSTEM_PLAN.md` so the bootstrap loads it automatically:
  - `- EIS_DESIGN_SYSTEM_PLAN.md — EIS Design System migration plan for HDC (runtime-frontend), HD children excluded`

### Phase 1 — Foundation

**Tokens** (`src/styles/tokens.css`):
- In the first `:root` block, replace `--event-accent-base: #0f766e` with `var(--accent)` so the brand cascade defaults to EIS orange. Remove the duplicate definition lower down once verified.
- Swap typography vars: `--font-body: 'IBM Plex Sans', system-ui, sans-serif;` and `--font-mono: 'IBM Plex Mono', SF Mono, monospace;`. Keep `--font-heading: 'Fraunces', Georgia, serif;` — EIS treats Fraunces as the acceptable transitional serif.
- Align radius scale to EIS pair: `--radius-lg: 12px;` (buttons, inputs), `--radius-xl: 16px;` (sections). Keep `--radius-card: var(--radius-xl);` for clarity.
- Drop `--shadow-glow-purple` / `--shadow-glow-orange` heavy glow tokens. Leave `--shadow-card` / `--shadow-elevated` from the EIS layer as the only elevation.
- In the dark-mode EIS block (line 451), replace `--accent: #2dd4bf` and `--accent-hover: #14b8a6` with orange equivalents — `--accent: #FF5C25;` and `--accent-hover: #ff7548;`. Drop the cyan neon glow lines (`--nav-active-glow`, `--cyan-electric-*` bright variants).
- Leave the `[data-theme-preset="editorial"|"summit"|"studio"]` selector blocks (and their `[data-color-mode="dark"]` variants) untouched. HD children that picked those presets via AdminPanel must continue to render correctly.
- Add a `.eis-label` utility on body (or in `index.css`): `font: 13px/1 var(--font-body); text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted);` for use everywhere a 13px UPPERCASE label is needed.

**Tailwind** (`tailwind.config.js`):
- `fontFamily.sans` and `fontFamily.body` → `['IBM Plex Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']`
- `fontFamily.heading` and `fontFamily.display` → `['Fraunces', 'Georgia', 'serif']`
- `fontFamily.mono` → `['IBM Plex Mono', 'JetBrains Mono', 'SF Mono', 'Consolas', 'monospace']`
- `borderRadius`: align `'lg': '12px'`, `'xl': '16px'`, `'card': '16px'`. Leave 2xl/3xl as-is for legacy callers.
- `boxShadow`: replace the dark-mode-heavy values with `'sm': 'var(--shadow-card)'`, `'md': 'var(--shadow-elevated)'`, `'lg': 'var(--shadow-elevated)'`. Drop `glow-purple` / `glow-orange` entries.

**Fonts** (`package.json` + `src/main.jsx`):
- `npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono` from `forge-native/`
- In `main.jsx`, replace the Manrope imports with `@fontsource/ibm-plex-sans/400.css`, `500.css`, `600.css`, `700.css` and add `@fontsource/ibm-plex-mono/400.css`, `500.css`
- Keep the Fraunces imports
- Uninstall `@fontsource/manrope` from `package.json` once `npm run runtime:build` confirms no references remain

**Theme presets** (`src/lib/themePresets.js`):
- Leave untouched. It drives the per-event preset picker in AdminPanel (HD children territory). The HDC default cascade already lands on EIS orange via `tokens.css` `:root`, so no edit here is needed for HDC rendering. The `default.accent: '#14b8a6'` swatch shown in the AdminPanel preset picker is cosmetic and stays as-is.

### Phase 2 — Component colour sweep

Replace inline teal/cyan hex with token references in these files:

- `src/components/shared/NavItem.jsx` — dark-mode classes `bg-cyan-400/[0.08]`, `text-cyan-100`, `border-cyan-400/30` → use `bg-accent/[0.08]`, `text-accent`, `border-accent/30` (Tailwind `accent` already maps via tokens). Drop `dark:shadow-[var(--nav-active-glow)]` since that token is deleted.
- `src/components/ui/Tabs.jsx` — locate teal/`#14b8a6`/cyan references via the grep list, replace with `bg-accent`, `text-accent`, `border-accent`.
- `src/components/ui/Progress.jsx` — same swap pattern.
- `src/components/Marketplace.jsx` — replace any hardcoded teal in skill chip styling and selected-tab indicators with token-driven equivalents.
- `src/components/Schedule.jsx` — phase highlight colours.
- `src/components/TeamDetail.jsx` — accent strokes, member chips.
- `src/components/teamDetail/PainPointsPanel.jsx` — selection state, pain point pills.
- `src/components/shared/TeamCard.jsx` — border accent on hover.

Method per file:
1. `grep -n 'teal\|#0f766e\|#14b8a6\|#0ea5e9\|cyan-' <file>` to enumerate hits
2. Replace each with the token-aware equivalent (`var(--accent)`, `text-accent`, `bg-accent/X`, etc.) — never a new hex
3. Save, verify the file still imports `cn` and any used helpers

### Phase 3 — Deploy

Per CLAUDE.md deploy rules (`MANDATORY: Bump APP_VERSION before every deploy`):
1. Bump `src/data/constants.js` `APP_VERSION` from `'1.2.211'` to `'1.2.212'`
2. `cd forge-native && npm run runtime:build`
3. `forge deploy --environment production`

## Files to modify

- `CLAUDE.md` (project root — add one Reference Docs line)
- `forge-native/static/runtime-frontend/src/styles/tokens.css`
- `forge-native/static/runtime-frontend/tailwind.config.js`
- `forge-native/static/runtime-frontend/src/main.jsx`
- `forge-native/static/runtime-frontend/package.json`
- `forge-native/static/runtime-frontend/src/index.css` (add `.eis-label` utility; sweep any remaining hex)
- `forge-native/static/runtime-frontend/src/data/constants.js` (APP_VERSION)
- `forge-native/static/runtime-frontend/src/components/shared/NavItem.jsx`
- `forge-native/static/runtime-frontend/src/components/shared/TeamCard.jsx`
- `forge-native/static/runtime-frontend/src/components/ui/Tabs.jsx`
- `forge-native/static/runtime-frontend/src/components/ui/Progress.jsx`
- `forge-native/static/runtime-frontend/src/components/Marketplace.jsx`
- `forge-native/static/runtime-frontend/src/components/Schedule.jsx`
- `forge-native/static/runtime-frontend/src/components/TeamDetail.jsx`
- `forge-native/static/runtime-frontend/src/components/teamDetail/PainPointsPanel.jsx`

## Verification

Build:
- `cd forge-native && npm run runtime:build` exits clean
- `grep -rn "Manrope\|JetBrains Mono\|#0f766e\|#14b8a6" forge-native/static/runtime-frontend/src --include="*.jsx" --include="*.js" --include="*.css"` returns only out-of-scope hits: `AdminPanel.jsx`, `adminPanel/*`, and `lib/themePresets.js`. Anything else is a sweep miss to fix.

Visual smoke (manually after deploy on tag-hackday.atlassian.net):
- Page background is cream `#F7F3EA`, cards render `#FEFBF4` with hairline `#EAE5DA`, single border, no nested rounded card
- Body text is IBM Plex Sans, headings still Fraunces, code/IDs render IBM Plex Mono
- Primary CTAs are solid orange `#FF5C25` with white text and `rounded-lg`
- Sections use `rounded-xl` and a single soft shadow at most
- 13px UPPERCASE labels appear on stat tiles and table headers (using `.eis-label` or token-driven Tailwind classes)
- No teal or cyan visible anywhere outside AdminPanel
- Dark mode (if a user has it on) renders orange accents — not cyan/neon

End-to-end:
- Dashboard, Marketplace, TeamDetail, Schedule, PainPoints, Voting load without console errors
- AdminPanel renders unchanged behaviourally — colour picker is allowed to look off-brand inside AdminPanel for this iteration
- An HD child with `data-theme-preset="editorial"` (or `summit` / `studio`) selected still renders its preset palette — those blocks are untouched

Rollback:
- `git revert` the deploy commit then `forge deploy --environment production` (APP_VERSION bump only, no DB changes)
