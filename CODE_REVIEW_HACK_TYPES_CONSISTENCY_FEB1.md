# Code Review: Hack Types Migration — Consistency and Integrity

**Scope:** Post-migration review of the prompts/skills/apps taxonomy for consistency (naming, types, copy) and integrity (schema vs Convex vs UI, optional handling, edge cases).

**Context:** Library asset types and project hack types were unified to `prompt` | `skill` | `app` in v0.6.2. Migration: `convex/migrateHackTypes.ts`; plan: `PLAN_HACK_TYPES_MIGRATION.md`.

---

## 1. Schema and Convex

### 1.1 Schema

- **`convex/schema.ts`**
  - `libraryAssets.assetType`: `v.union(v.literal("prompt"), v.literal("skill"), v.literal("app"))`. Index `by_type` on `["assetType"]`.
  - `projects.hackType`: `v.optional(v.union(v.literal("prompt"), v.literal("skill"), v.literal("app")))`. Index `by_hack_type` on `["hackType"]`.

**Verdict:** Schema is consistent and only allows the three types.

### 1.2 Convex validators

- **`convex/libraryAssets.ts`**
  - `list` and `listWithReuseCounts`: optional `assetType` validator is `prompt` | `skill` | `app`.
  - `create`: required `assetType` is `prompt` | `skill` | `app`.
  - `update`: args do **not** include `assetType` — asset type is create-only and cannot be changed after creation.
- **`convex/projects.ts`**
  - `hackTypeValidator`: optional `prompt` | `skill` | `app`; used in `create` and `update`.

**Verdict:** Convex validators match the schema. Library asset type is intentionally immutable (no `assetType` in `update`).

### 1.3 Convex usage

- **`convex/metrics.ts`** (getFeaturedHacks): Uses `asset.assetType.replace("_", " ")` for blurb. For `prompt`/`skill`/`app` there is no underscore, so the string is unchanged; safe if a legacy value ever appeared.
- **`convex/libraryAssets.ts`** (getSimilar): Uses `by_type` index with `current.assetType`. All stored assets use the new types; index is correct.
- **`convex/migrateHackTypes.ts`**: Maps old → new for library and projects; kept for reference and re-runs. No impact on normal app flow.

**Verdict:** Convex logic is consistent with the three-type model.

---

## 2. App constants and types

### 2.1 Constants

- **`src/constants/project.ts`**
  - `HACK_TYPE_LABELS`: `prompt` → "Prompts", `skill` → "Skills", `app` → "Apps".
  - `HACK_TYPES`: `[{ value: 'prompt', label: 'Prompts' }, { value: 'skill', label: 'Skills' }, { value: 'app', label: 'Apps' }]`.
  - `HACK_TYPE_BADGE_COLORS`: one entry per key `prompt`, `skill`, `app`.
- **`src/pages/Library.tsx`**
  - `ASSET_TYPES`: same three (value + label).
- **`src/pages/Search.tsx`**
  - `ASSET_TYPE_LABELS`: `prompt`, `skill`, `app`.
- **`src/lib/design-system.ts`**
  - `assetTypeLabels`: `prompt` → "Prompt", `skill` → "Skill", `app` → "App".
  - `AssetType`: `keyof typeof assetTypeLabels` → `"prompt" | "skill" | "app"`.

**Verdict:** All UI constants use only the three types and are aligned.

### 2.2 TypeScript types

- **`src/types/database.ts`**
  - `AssetType`: `'prompt' | 'skill' | 'app'`.
  - `HackType`: `'prompt' | 'skill' | 'app'`.
- **`src/types/library.ts`**
  - Uses `AssetType` from index; `AssetContent` still has fields/comments for templates, guardrails, agent config, etc. Those describe **content shape** (e.g. a "skill" asset can have `guardrail_rules` or `template_text`); type label and content structure are separate. No change required for consistency.

**Verdict:** Shared types match schema and constants.

---

## 3. UI behavior and integrity

### 3.1 Project hack type — optional and clear

- **List/cards:** Filter `p.hackType !== hackTypeFilter` correctly excludes projects without `hackType` when a filter is selected. Cards show hack type badge only when `project.hackType` is set.
- **Detail:** Badge only when `project.hackType`; owner sees combobox with options "Set hack type", "Prompts", "Skills", "Apps". When owner selects "Set hack type" (value `''`), the code **does not** call `updateProject`; it shows toast "Select a type to update. Hack type cannot be cleared." and returns. So the DB is never patched with `hackType` omitted, and the user is not told the type was cleared when it was not.

**Verdict:** Optional handling and clear-hack-type behavior are correct and consistent with CODE_REVIEW_CONSISTENCY_INTEGRITY_FEB1.md recommendation.

### 3.2 Library asset type

- **Filter:** Type filter options are All Types, Prompts, Skills, Apps. Query passes `assetType` only when a type is selected; list and listWithReuseCounts filter correctly.
- **Arsenal categories:** Counts use `a.assetType === 'prompt'`, `'skill'`, `'app'`; three categories only.
- **Submit Asset modal:** Type dropdown is Prompt (default), Skill, App. Create mutation receives only these values.
- **Display:** `asset.assetType.replace('_', ' ')` and `ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType` (and similar in design-system/Library) — for current types no underscore; fallback handles any unexpected value.

**Verdict:** Library UI is consistent and safe.

### 3.3 Projects empty state

- **Copy:** When no projects match filters, empty state says "Try adjusting your search, status, or type filter." — already updated for the type filter.

**Verdict:** Consistent with current filters.

### 3.4 Display fallbacks

- **Projects:** `HACK_TYPE_LABELS[project.hackType] ?? project.hackType` and `HACK_TYPE_BADGE_COLORS[project.hackType] ?? '...'` — unknown or legacy values still display without crashing.
- **Library/Search:** `ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType` and `typeIcons[asset.assetType] || <FileText />` — same.

**Verdict:** Fallbacks are in place for robustness.

---

## 4. Copy and narrative

- **Dashboard hero:** "Prompts, skills, and apps — copy one, share yours." (WelcomeHero).
- **Sidebar:** "Explore the AI Arsenal to find proven prompts, skills, and apps."
- **Library subtitle:** "Reusable AI assets: prompts, skills, and apps. The **AI Arsenal** is curated; **All Assets** shows everything in the library."
- **Guide:** "prompts, skills, and apps."
- **Onboarding:** "Curated prompts, skills, and apps..." and "Start by reusing a verified prompt, skill, or app from the Library."
- **README:** "prompts, skills, and apps."

**Verdict:** User-facing copy is aligned with the new taxonomy.

---

## 5. Remaining references to old taxonomy

Intentional or benign:

- **`convex/seedData.ts`:** Some asset `content` still has `guardrailType` (e.g. "Input Filter"). This is **content** for assets that were migrated from guardrails to type `skill`; the field describes the skill’s behavior, not the DB type. No change needed.
- **`src/types/library.ts`:** `AssetContent` comments "For templates", "For agent blueprints", "For guardrails" describe content structure; skill/app assets can still use those shapes. Acceptable as implementation detail.
- **`src/components/dashboard/FeaturedHacks/WallOfThanksStrip.tsx`** and **Recognition/WallOfHacks.tsx:** Sample quote "The guardrail prevented a costly mistake" — user testimonial wording; no schema/type reference.
- **`src/pages/Library.tsx`:** Placeholder "Prompt text, template body, or JSON for structured types" and graduated-assets text "template packs and playbooks" — generic product language, not type enums.
- **`src/pages/Onboarding.tsx`:** "AI Experiment Starter template" — name of a specific path/asset; not the old type "template".
- **`convex/schema.ts`:** impactStories headline example "How Sarah's prompt template saved..." — generic English; fine.
- **`PLAN_HACK_TYPES_MIGRATION.md`** and **`convex/migrateHackTypes.ts`:** Describe migration and old→new mapping; correct to keep.

Historical / docs only (no code impact):

- **learnings.md:** Older entry "Dashboard narrative + hack types E2E" still mentions "Prompts, apps, extensions, skills"; that entry is historical. Newer "Hack types migration E2E" documents the current behavior.
- **CODE_REVIEW_CONSISTENCY_INTEGRITY_FEB1.md:** Describes the previous 7-type hack types; superseded by this review for the three-type model.
- **ROADMAP.md, HackCentral_specification.md, IMPLEMENTATION_PLAN.md, etc.:** Mention old asset/hack types in specs or plans; can be updated later for accuracy or left as historical.

**Verdict:** No inconsistent code; remaining mentions are either content/structure, migration docs, or historical docs.

---

## 6. Edge cases and URLs

- **URLs:** Library and Projects do not encode asset type or hack type in the path. Library uses `useSearchParams` for `q` (search) only, not for type. No legacy `?type=template`-style URLs to support.
- **Filter + no type:** Projects with `hackType === undefined` are excluded when user selects a hack type filter; they appear when "All types" is selected. Correct.
- **Asset type immutable:** Library asset type cannot be updated after create; only create flow and migration set it. Documented above as intentional.

**Verdict:** Edge cases and URL behavior are consistent and safe.

---

## 7. Summary

| Area | Consistency | Integrity | Notes |
|------|-------------|-----------|--------|
| Schema (library + projects) | OK | OK | Only prompt/skill/app. |
| Convex validators (list, create, update) | OK | OK | libraryAssets.update does not accept assetType (create-only). |
| Constants (HACK_*, ASSET_*, assetTypeLabels) | OK | OK | Three types everywhere. |
| Types (database.ts, design-system, library) | OK | OK | AssetContent comments are content structure. |
| ProjectDetail "Set hack type" | OK | OK | No mutation on clear; toast explains. |
| Projects filter + empty state | OK | OK | Type filter and copy correct. |
| Library filter, Arsenal, Submit modal | OK | OK | Three types only. |
| Display fallbacks (labels, badges, icons) | OK | OK | Unknown values handled. |
| Copy (hero, sidebar, Library, Guide, Onboarding, README) | OK | — | Aligned with prompts/skills/apps. |
| Remaining old-type mentions | OK | — | Content, migration, or historical docs. |
| URLs / edge cases | OK | OK | No type in URL; filter behavior correct. |

**Overall:** The hack types migration is consistent and integrity-checked across schema, Convex, constants, types, and UI. No code changes required for consistency or integrity; optional follow-ups are doc updates (ROADMAP, specification) if you want all written specs to say "prompts, skills, apps" everywhere.

---

## 8. Optional follow-ups

1. **Document asset type immutability:** In `convex/libraryAssets.ts` or in PLAN_HACK_TYPES_MIGRATION.md, add a one-line note that asset type is set on create only and not updateable, so future contributors don’t assume it was omitted by mistake.
2. **Spec/docs:** When touching ROADMAP.md or HackCentral_specification.md, replace old asset/hack type lists with "prompts, skills, and apps" where they describe the current product.
3. **learnings.md:** Optionally add a short note under the old "Dashboard narrative + hack types E2E" entry that hack types were later unified to prompts/skills/apps (v0.6.2).
