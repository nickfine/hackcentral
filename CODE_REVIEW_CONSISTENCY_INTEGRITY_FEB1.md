# Code Review: Consistency and Integrity (Dashboard narrative + hack types)

**Scope:** Post-implementation review of the dashboard narrative and hack types feature set for consistency (naming, patterns, types) and integrity (schema vs Convex vs UI, optional handling, edge cases).

**Date:** Feb 1, 2026.

---

## 1. Hack types: schema, Convex, constants, UI

### 1.1 Schema and Convex alignment

- **Schema** ([convex/schema.ts](convex/schema.ts)): `hackType` optional union of 7 literals (`prompt`, `app`, `extension`, `skill`, `template`, `agent_flow`, `playbook`). Index `by_hack_type` on `["hackType"]`.
- **Convex** ([convex/projects.ts](convex/projects.ts)): `hackTypeValidator` reused for `create` and `update` args; `create` inserts `hackType: args.hackType`; `update` patches `...updates` (includes `hackType` when provided).
- **Constants** ([src/constants/project.ts](src/constants/project.ts)): `HACK_TYPE_LABELS`, `HACK_TYPES`, `HACK_TYPE_BADGE_COLORS` — keys/values match schema literals. Order and labels are consistent.

**Verdict:** Schema, Convex, and constants are aligned. No inconsistency.

### 1.2 Types: Convex (camelCase) vs database.ts (snake_case)

- **Runtime:** Projects data comes from Convex (`list`, `listWithCounts`, `getById`). Convex returns camelCase (`hackType`).
- **UI:** [Projects.tsx](src/pages/Projects.tsx) and [ProjectDetail.tsx](src/pages/ProjectDetail.tsx) use `project.hackType` — correct for Convex.
- **Types:** [src/types/database.ts](src/types/database.ts) defines Supabase-style `Project` with `hack_type: HackType | null`. That file is legacy/Supabase-oriented; the app does not use `Project` from database.ts for Convex project results. [Projects.tsx](src/pages/Projects.tsx) uses a local `ProjectWithCounts` interface with `hackType?: string`.

**Verdict:** No conflict. Convex data is camelCase; UI and local types use `hackType`. database.ts remains snake_case for legacy table shape; no code path uses it for Convex project documents.

### 1.3 Optional hackType handling

- **List/cards:** Filter `p.hackType !== hackTypeFilter` correctly excludes projects without `hackType` when a filter is selected. Cards show hack type badge only when `project.hackType` is set (`{project.hackType && (...)}`).
- **Detail:** Badge only when `project.hackType`; owner sees combobox with `value={project.hackType ?? ''}` and option "Set hack type" (value `''`).
- **Create:** Hack type is optional; `hackType: hackType || undefined` passed to `createProject`.

**Verdict:** Optional handling is consistent. Existing projects without `hackType` behave correctly (no badge, filter excludes them when a type is selected).

### 1.4 Clearing hack type (integrity)

- **Current behavior:** In ProjectDetail, when owner selects "Set hack type" (value `''`), the code calls `updateProject({ projectId, hackType: value as ... })` with `value === undefined`. Client sends mutation args; in JSON, `undefined` is omitted, so the server receives an updates object that does not include `hackType`. The patch therefore does not change `hackType`, and the field is not cleared.
- **User impact:** The UI shows "Hack type cleared." but the stored value does not change; after reload, the previous type still appears.

**Recommendation:** Either (1) avoid calling the mutation when value is `''` and show a short message like "Select a type to update" or "Hack type cannot be cleared", or (2) support explicit unset in the backend (e.g. accept `null` and patch to remove the field, if Convex supports it). Option (1) is the minimal fix and avoids misleading the user.

---

## 2. Dashboard: structure and consistency

### 2.1 Tab structure and fragment (updated post-ECD nits)

- **Tabs:** "Wins" (default) and "Team pulse" with `dashboardTab` state. Only one tab’s content is rendered at a time.
- **Wins tab:** Content is wrapped in a fragment (`<>...</>`): **WelcomeHero first**, then optional combined nudge, then PersonalizedNudge, EngagementNudge, FeaturedWinsShowcase (Community Wins), Your recognition (if authenticated), QuickActionsPanel. **No CollectiveProgressCard on Wins** — hero pill is the only maturity hint there.
- **Pulse tab:** "Team pulse" heading, **CollectiveProgressCard** (moved here from Wins to remove redundancy), Export, stat cards, Knowledge Distribution (Gini), Frontline vs leader, TabbedRecognition — all inside `{dashboardTab === 'pulse' && (...)}`.

**Verdict:** Structure is correct. No stray content; tab switching is consistent.

### 2.2 Combined nudge placement (updated post-ECD nits)

- **Current:** The combined nudge and PersonalizedNudge are **inside the Wins tab only**, and appear **after the WelcomeHero**. Order: Hero → combined nudge (when applicable) → PersonalizedNudge → EngagementNudge → Community Wins → Your recognition → Quick actions. This gives "where we are" (narrative + primary CTA) first, then "what to do" (nudges).
- **Pulse tab:** No nudge blocks; leaders see Collective Progress, Export, stat cards, Gini, Frontline, TabbedRecognition only.

**Verdict:** Hero-first hierarchy is satisfied. Nudges no longer compete with the hero for first read.

### 2.3 QuickStartWins export

- **Current:** [QuickStartWins](src/components/dashboard/QuickStartWins/QuickStartWins.tsx) is still exported from [src/components/dashboard/index.ts](src/components/dashboard/index.ts) but is no longer used in [Dashboard.tsx](src/pages/Dashboard.tsx) (replaced by FeaturedWinsShowcase with Starter badges).
- **Verdict:** Export is redundant but harmless. Keeping it allows reuse elsewhere (e.g. onboarding). Optional: remove the export or add a short comment that it is retained for potential reuse.

---

## 3. Wins block: Starter badges and placeholders

### 3.1 Starter badge logic

- **FeaturedWinsShowcase:** Receives `starterCount` (default 4). Passes `isStarter={!isEmpty && index < starterCount}` to WinCard.
- **When empty:** `isEmpty === true` → placeholder wins shown; `isStarter` is false for all (correct).
- **When has wins:** First `starterCount` cards get Starter badge; rest do not.

**Verdict:** Logic is correct and consistent.

### 3.2 Placeholder copy

- **FeaturedWinsShowcase** PLACEHOLDER_WINS: First item title is "Your win could be here"; second remains "Share how AI helped your work". Blurbs are unchanged and still appropriate.

**Verdict:** Placeholder copy is consistent with the "wins" narrative.

---

## 4. Copy and wording

- **Hero:** "Copy a win, use it, share yours." and "Prompts, apps, extensions, skills — copy one, share yours." — aligned with hack types and narrative.
- **Dashboard nudge:** "Add a win from the Library", "Create a project to track your work and attach assets", "Share how AI helped your work" — consistent.
- **Story modal placeholder:** "e.g. How a win saved 12 hours per week".
- **WallOfThanksStrip / WallOfWins:** "Saved my team 5 hours with this win!" — consistent.
- **Projects empty state (no match):** Description is "Try adjusting your search or status filter." — does not mention the hack type filter.

**Recommendation:** Update the Projects empty state to "Try adjusting your search, status, or type filter." for consistency with the new filter.

---

## 5. Summary

| Area | Consistency | Integrity | Notes |
|------|-------------|-----------|--------|
| Hack type schema/Convex/constants | OK | OK | Literals and usage aligned. |
| Types (Convex vs database.ts) | OK | OK | UI uses Convex shape; database.ts is legacy. |
| Optional hackType (list, detail, create) | OK | OK | Filter and badges behave correctly. |
| Clearing hack type in ProjectDetail | OK | Issue | Selecting "Set hack type" does not clear DB; toast is misleading. |
| Dashboard tabs and fragment | OK | OK | Wins vs Pulse content correctly scoped. |
| Combined nudge placement | OK | OK | Inside Wins only; after hero (ECD nits fix). |
| QuickStartWins export | Minor | OK | Unused in Dashboard; export kept for reuse. |
| Starter badges and placeholders | OK | OK | Logic and copy correct. |
| Projects empty state copy | Minor | OK | Add "or type filter" for consistency. |

**Recommended code changes:**

1. **ProjectDetail:** When owner selects "Set hack type" (value `''`), do not call `updateProject` with `hackType: undefined`. Instead show a toast like "Select a type to update" or "Hack type cannot be cleared." so the user is not told the type was cleared when it was not.
2. **Projects:** Update the empty-state description (when no projects match filters) to "Try adjusting your search, status, or type filter."

Optional: Add a comment on the QuickStartWins export; or implement backend support for clearing hack type if product requires it.

---

## 6. Post-ECD nits (Feb 1) — addendum

**Changes applied:** (1) Hero first, then nudges: combined nudge and PersonalizedNudge moved inside the Wins tab and placed **after** WelcomeHero so the narrative is the first thing. (2) Collective Progress redundancy removed from Wins: CollectiveProgressCard removed from the Wins tab (hero pill is the only maturity hint there); CollectiveProgressCard added to the Team pulse tab so leaders still have access.

**Consistency:** Dashboard.tsx page comment updated to match the new layout. Wins tab fragment order and indentation (Your recognition block, QuickActionsPanel) aligned for consistency.

**Integrity:** No duplicate maturity block on Wins; CollectiveProgressCard used only once (Pulse). All props (profile, userCounts, derivedBadges, pulse, maturityWidth, metrics) remain in scope for both tabs; story modal remains at top level (shared).
