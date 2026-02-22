# Code Review: Recognition Leaderboards (Phase 2)

**Date:** 2026-01-30  
**Scope:** Top Mentors & Most Reused Assets (`convex/metrics.ts`, `src/pages/Dashboard.tsx`).

## Summary

The Recognition leaderboards implementation is **consistent and sound**. Backend queries align with schema and visibility rules; frontend follows existing Dashboard patterns. No lint errors.

---

## What Was Checked

### 1. Schema & backend alignment

- **mentorRequests:** `mentorId` is `v.id("profiles")`; `status` includes `"completed"`. `getTopMentors` filters by `status === "completed"` and `_creationTime >= thirtyDaysAgo`, counts by `mentorId`, resolves profile via `ctx.db.get(mentorId)` for `fullName ?? email ?? "Unknown"`. ✅
- **libraryReuseEvents:** Has `assetId`, `_creationTime` (Convex default). `getMostReusedAssets` filters by `_creationTime >= thirtyDaysAgo`, counts by `assetId`, then loads each asset and checks `visibility === "public" || (visibility === "org" && identity)` so private asset titles are never returned. ✅
- **libraryAssets:** `visibility` and `title` used correctly. ✅
- **Time window:** `thirtyDaysAgo` uses the same formula as `getTopContributors` (30 * 24 * 60 * 60 * 1000). ✅

### 2. Return shapes & frontend usage

- **getTopMentors:** Returns `{ mentorId, name, count }[]`. Dashboard uses `entry.mentorId` as key, `entry.name`, `entry.count` with plural "session(s)". ✅
- **getMostReusedAssets:** Returns `{ assetId, title, count }[]`. Dashboard uses `entry.assetId` as key, `entry.title` (with `truncate` and `title` attribute for tooltip), `entry.count` with plural "reuse(s)". ✅
- **getTopContributors:** Returns `{ userId, name, count }[]`. Same pattern (key, name, count). ✅

### 3. Dashboard UI consistency

- **Layout:** New section uses same `grid gap-4 md:grid-cols-2` as "Recent Activity & Top Contributors". ✅
- **Cards:** Same structure: `card p-6`, `h3 font-semibold mb-2`, then loading / empty / list. ✅
- **Loading state:** `=== undefined` → "Loading…". ✅
- **Empty state:** Clear, actionable copy for both sections. ✅
- **List items:** Same pattern: rank (i + 1), label (name/title), count with pluralization (`entry.count !== 1 ? 's' : ''`). ✅
- **Icons:** GraduationCap and BookOpen with `h-4 w-4 text-muted-foreground` in headings; consistent with Dashboard style. ✅

### 4. Visibility & privacy

- **Top Mentors:** Shows mentor name (from profile). No PII beyond what’s already shown elsewhere (e.g. People). ✅
- **Most Reused Assets:** Only public or org-visible assets included; private asset titles never exposed. ✅

### 5. Linting

- No linter errors in `metrics.ts` or `Dashboard.tsx`. ✅

---

## Verdict

**Recognition Leaderboards (Phase 2)** are **consistent and production-ready**. Queries match schema and visibility rules; Dashboard UI matches existing patterns; Playwright tests confirmed rendering and data. No issues found.
