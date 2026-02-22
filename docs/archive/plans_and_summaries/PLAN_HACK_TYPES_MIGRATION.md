# Migration Plan: Unify Hack Types to Prompts, Skills, Apps

**Goal:** Use exactly three types everywhere: **prompt**, **skill**, **app**.

**Scope:** Two systems — **Library asset types** (`libraryAssets.assetType`) and **Project hack types** (`projects.hackType`).

---

## After Deploy: Run the Migration Once

Existing data in Convex may still have old enum values. After deploying these changes, run the migration once from the Convex dashboard or by calling the mutation:

1. Open your Convex dashboard → **Functions**.
2. Find **migrateHackTypes: migrateToPromptSkillApp** and run it (no arguments).
3. It returns `{ libraryPatched, projectsPatched }` — the number of documents updated.

Alternatively, from your app or a script: `convex run migrateHackTypes:migrateToPromptSkillApp`.

---

## Recommended Mapping

### Library assets (`libraryAssets.assetType`)

| Old                 | New   |
|---------------------|-------|
| prompt              | prompt |
| template            | skill  |
| agent_blueprint     | app    |
| guardrail           | skill  |
| evaluation_rubric   | skill  |
| structured_output   | skill  |

### Projects (`projects.hackType`)

| Old         | New   |
|-------------|-------|
| prompt      | prompt |
| app         | app    |
| skill       | skill  |
| extension   | app    |
| template    | skill  |
| agent_flow  | app    |
| playbook    | skill  |

You can tweak mappings (e.g. guardrail → app) and apply the same steps.

---

## Phase 1: Data Migration (Convex)

Convex doesn't support in-DB migrations like SQL; you migrate by reading old values and writing new ones in mutations.

1. **Add a one-off migration** (e.g. `convex/migrations/migrateHackTypes.ts` or temporary mutations in `projects.ts` and `libraryAssets.ts`):
   - **Library:** Query all `libraryAssets`, for each doc map `assetType` with the table above (e.g. template/guardrail/evaluation_rubric/structured_output → `skill`, agent_blueprint → `app`, prompt → `prompt`), then `ctx.db.patch(id, { assetType: newType })`.
   - **Projects:** Query all `projects` where `hackType` is set, map (e.g. extension/agent_flow → `app`, template/playbook → `skill`, prompt/app/skill unchanged), then `ctx.db.patch(id, { hackType: newType })`.
2. Run the migration (e.g. from dashboard or a script that invokes the mutation) **before** deploying schema/API changes that remove the old enum values.
3. Optionally add a `migratedAt` or flag so you don't run it twice; remove after cutover.

---

## Phase 2: Schema and Validators

### 2.1 Library asset type → prompt | skill | app

- **`convex/schema.ts`**  
  Replace `libraryAssets.assetType` union with:
  - `v.literal("prompt")`, `v.literal("skill")`, `v.literal("app")`.

- **`convex/libraryAssets.ts`**  
  In **list** and **listArsenal** (and any other query that takes `assetType`), change the optional validator to the same three literals.  
  In **create** mutation, change `assetType` to the same three literals.

### 2.2 Project hack type → prompt | skill | app

- **`convex/schema.ts`**  
  Replace `projects.hackType` optional union with:
  - `v.literal("prompt")`, `v.literal("skill")`, `v.literal("app")`.

- **`convex/projects.ts`**  
  Replace `hackTypeValidator` with an optional union of those three literals (used in **create** and **update**).

---

## Phase 3: App Constants and Types

### 3.1 Project hack types (UI)

- **`src/constants/project.ts`**
  - `HACK_TYPE_LABELS`: only `prompt`, `skill`, `app` (e.g. "Prompts", "Skills", "Apps").
  - `HACK_TYPES`: array `[{ value: 'prompt', label: 'Prompts' }, { value: 'skill', label: 'Skills' }, { value: 'app', label: 'Apps' }]`.
  - `HACK_TYPE_BADGE_COLORS`: one entry per key `prompt`, `skill`, `app`.

### 3.2 Library asset types (UI)

- **`src/pages/Library.tsx`**
  - `ASSET_TYPES`: only `prompt`, `skill`, `app` (value + label).
  - Replace all `assetType` typings (e.g. in `SubmitAssetModalProps.createAsset`, `queryArgs`, filter state) with `'prompt' | 'skill' | 'app'`.
  - **Arsenal categories:** Replace the four `ArsenalCategory` blocks (Prompts, Templates, Agent Blueprints, Guardrails) with three: Prompts, Skills, Apps, and `a.assetType === 'prompt'`, `'skill'`, `'app'`.
  - Any other filter or display that switches on `assetType` (e.g. default filter, "No other X in the library") should use the three types only.

- **`src/pages/Search.tsx`**
  - `ASSET_TYPE_LABELS`: only `prompt`, `skill`, `app`.

- **`src/lib/design-system.ts`**
  - `assetTypeLabels`: only `prompt`, `skill`, `app`.  
  - `AssetType` becomes `keyof typeof assetTypeLabels` (so only those three).

### 3.3 Shared TypeScript types

- **`src/types/database.ts`**
  - `AssetType`: `'prompt' | 'skill' | 'app'`.
  - `HackType`: `'prompt' | 'skill' | 'app'`.

- **`src/types/library.ts`**  
  Uses `AssetType` from index/database; no change except that the type definition is updated as above.

---

## Phase 4: Convex Logic That References Type

- **`convex/metrics.ts`**  
  Line ~499: `asset.assetType.replace("_", " ")` — still works for `prompt`/`skill`/`app` (no underscore). No change required unless you had special casing for old types.

- **`convex/libraryAssets.ts`**  
  **getSimilar** uses `by_type` index with `assetType`; after schema change the index is on the new enum. Ensure all callers pass only `prompt`/`skill`/`app`.

---

## Phase 5: Seed Data

- **`convex/seedData.ts`**
  - Replace every `assetType: "template" as const` (and similar) with the new type:
    - prompt → `"prompt"`
    - template → `"skill"`
    - agent_blueprint → `"app"`
    - guardrail → `"skill"`
    - evaluation_rubric → `"skill"`
    - structured_output → `"skill"`
  - If any seed projects set `hackType`, set them to one of `prompt` / `skill` / `app`.

Re-run or re-seed so dev data matches the new schema.

---

## Phase 6: Copy and UX

- **`src/pages/Guide.tsx`**  
  Replace "prompts, templates, guardrails, evaluation rubrics, and agent blueprints" with "prompts, skills, and apps" (and any similar phrasing).

- **`src/pages/Library.tsx`**  
  Subtitle: e.g. "Reusable AI assets: prompts, skills, and apps" (replace "prompts, templates, and agent blueprints").

- **`src/components/shared/Sidebar.tsx`**  
  "Proven prompts and templates" → e.g. "Proven prompts, skills, and apps".

- **Dashboard hero / FeaturedHacks**  
  Any line like "Prompts, apps, extensions, skills — copy one…" → "Prompts, skills, and apps — copy one…" (or your preferred line).

- **README / PLAN_*.md / CODE_REVIEW_*.md**  
  Search for "template", "agent blueprint", "guardrail", "evaluation rubric", "structured output", "extension", "agent_flow", "playbook" and update to the new taxonomy or "prompts, skills, apps".

---

## Phase 7: Optional Cleanup

- **`src/types/database.ts`**  
  This file is Supabase-oriented; if you still use it for Convex types, keep `AssetType` and `HackType` in sync with the three values. If Convex-generated types are the source of truth, you can leave this as a legacy reference and document that.

- **`src/types/library.ts`**  
  `AssetContent` and similar may reference "agent blueprints", "guardrails", etc. Either keep as implementation detail (e.g. "skill" can still have guardrail-style content) or simplify wording in comments/interfaces.

---

## Order of Operations (Recommended)

1. **Back up / note current state** (e.g. export projects and library assets or run read-only queries to count by type).
2. **Run data migration** (Phase 1) so all existing rows use `prompt` | `skill` | `app`.
3. **Update schema** (Phase 2) and **Convex validators** so only the new enum is accepted.
4. **Update app constants, types, and UI** (Phases 3–4).
5. **Update seed data** (Phase 5).
6. **Update copy** (Phase 6).
7. **Smoke-test:** Create library asset of each type, create project with each hack type, filters, Arsenal categories, Search, Project detail badge, hero text.
8. **Optional:** Remove migration mutation and any temporary flags (Phase 1 cleanup).

---

## Files to Touch (Checklist)

| Area        | File(s) |
|-------------|---------|
| Schema      | `convex/schema.ts` |
| Convex      | `convex/libraryAssets.ts`, `convex/projects.ts`, `convex/metrics.ts`, `convex/seedData.ts` |
| Migration   | New or temporary mutation (e.g. in `convex/` or `convex/migrations/`) |
| Constants   | `src/constants/project.ts` |
| UI          | `src/pages/Library.tsx`, `src/pages/Projects.tsx`, `src/pages/ProjectDetail.tsx`, `src/pages/Search.tsx` |
| Design      | `src/lib/design-system.ts` |
| Types       | `src/types/database.ts`, `src/types/library.ts` (if they define AssetType/HackType) |
| Copy        | `src/pages/Guide.tsx`, `src/components/shared/Sidebar.tsx`, dashboard hero/FeaturedHacks, README/docs |

---

## Edge Cases

- **Project "Set hack type" / clear:** If you keep an empty option (e.g. "Set hack type" with value `''`), ensure the update mutation does **not** send `hackType` when the user chooses "clear" (or handle `''` server-side by setting `hackType` to `undefined`). Same behavior as today; just with the new three-type enum.

- **Library filters:** "All types" plus Prompts / Skills / Apps; no filter for removed types.

- **Existing bookmarks/URLs:** If any URLs encode asset type or hack type (e.g. `?type=template`), add a redirect or mapping from old → new (e.g. `template` → `skill`) so old links still work, or document the breaking change.
