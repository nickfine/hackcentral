# Phase 2: Core Features

**Goal:** Complete core modules and workflows (dashboard, library quality/reuse, recognition, AI-assisted features, close/archive capture).

**Status:** In progress  
**Started:** Dashboard completion (Recent Activity + Top Contributors)  
**Reference:** ROADMAP.md § Phase 2 (Weeks 7–10)

---

## Done in Phase 2 (so far)

### ✅ Dashboard – Activity & Leaderboard (v0.4.1)
- **Backend:** `convex/metrics.ts`
  - `getRecentActivity` – last 15 contributions with user + asset/project labels
  - `getTopContributors` – top 10 by contribution count (last 30 days)
- **Frontend:** `src/pages/Dashboard.tsx`
  - Recent Activity list with relative time, empty/loading states
  - Top Contributors leaderboard with counts, empty/loading states
- **Existing:** Metric cards, maturity bar, and `getDashboardMetrics` were already in place.

### ✅ Library – Submit Asset, Verification, Reuse Recording (v0.4.2+)
- Submit Asset modal, author verification workflow (draft/verified/deprecated), “Verified by” display, reuse counts on cards, attach-to-project (v0.4.2).
- **Reuse recording:** `convex/libraryReuse.ts` – `recordReuse(assetId, reuseType, projectId?)`; when `projectId` is provided, also ensures `projectLibraryAssets` row. `src/pages/Library.tsx` – asset detail “I used this” quick action (Copied / Referenced / Linked + “Record use” button) so reuse can be recorded without attaching to a project.

### ✅ Recognition – Leaderboards (first slice)
- **Backend:** `convex/metrics.ts` – `getTopMentors` (top 10 by completed sessions, last 30d), `getMostReusedAssets` (top 10 by reuse events, last 30d; public/org only).
- **Frontend:** `src/pages/Dashboard.tsx` – "Top Mentors" card (GraduationCap), "Most Reused Assets" card (BookOpen), empty/loading states.

---

## Remaining Phase 2 Tasks (in suggested order)

### 1. AI Maturity Dashboard – Optional polish
- **Team comparison view** (with privacy): e.g. anonymized or opt-in team-level maturity.
- **Polling note:** Convex is reactive; no explicit polling needed unless we add a “stale after 5 min” UX.
- **Scope:** Low. Dashboard is functionally complete.

### 2. Library Enhancements
- **Asset submission form**
  - Form: title, description, type, content, visibility, metadata.
  - Validation and create flow; insert `libraryAssets` + `aiContributions`.
- **Quality gates**
  - Status: Draft / Verified / Deprecated (schema already has these).
  - UI: filters, status badges, status change actions (e.g. “Submit for verification”).
- **Verification workflow**
  - Who can verify (e.g. admins or designated reviewers).
  - Mutation to set status to `verified`; optional verification notes.
- **Reuse tracking**
  - `libraryReuse` / `projectLibraryAssets` (or equivalent) already in schema.
  - Events: “Copied”, “Attached to project”, etc.
  - UI: show reuse count on asset cards; optional “Reuse” button that records event.
- **Deprecation workflow**
  - Allow marking assets as deprecated; hide or down-rank in default views; keep in library for history.

**Deliverables:** Submit new assets, filter by status, verification and deprecation actions, reuse counts on assets.

### 3. Recognition & Social Proof
- **Badge calculation**
  - Use `recognitionBadges` (or equivalent) and/or derive from `aiContributions` / reuse.
  - Types from roadmap: e.g. most_reused, most_verified, mentor_champion.
- **Leaderboards**
  - Extend dashboard or add a “Recognition” view: top contributors, top mentors, most reused assets.
- **Impact stories**
  - Schema/table for short stories (e.g. title, summary, author, project/asset link).
  - Submission form and feed on dashboard or dedicated page.
- **Celebration UI**
  - Optional: small animations or toasts when someone gets a badge or story is published.

**Deliverables:** Badges, leaderboards, impact stories feed, optional celebrations.

### 4. AI-Assisted Features
- **Search**
  - Improve library (and optionally project) search: better text matching and/or AI ranking (e.g. semantic similarity).
- **Recommendations**
  - “Similar assets”, “Recommended for you” based on reuse, type, or embeddings if added later.
- **AI-assisted submission**
  - Optional: suggest title, description, or metadata from content (e.g. LLM API).

**Deliverables:** Better search, recommendation surfaces, optional AI-assisted fields.

### 5. Close/Archive Capture ✅ (first slice done)
- **Project close/archive**
  - Form: status → completed/archived, lessons learned (required), time saved (optional), AI tools used (optional), workflow transformed (optional).
- **AI learning capture**
  - Structured fields: failuresAndLessons, timeSavedEstimate, aiToolsUsed, workflowTransformed (schema already had these).
- **Learning summary**
  - Display closed-project learnings in project detail modal when status is completed/archived.
- **Implemented:** `convex/projects.ts` – `getById` returns `ownerFullName`; `src/pages/Projects.tsx` – ProjectDetailModal (card click), learning section, owner-only “Mark completed” / “Archive” form with learning fields; comments inline + “View in full”.

---

## Dependencies & Notes

- **Library enhancements** can be done next; they don’t depend on recognition or AI features.
- **Recognition** can use existing `aiContributions` and mentor data; badge logic can be implemented in Convex (scheduled or on-demand).
- **AI-assisted features** may require an external API (e.g. embeddings/LLM); start with better text search and reuse-based recommendations.
- **Close/archive** depends on projects and optional link to library assets; can follow library enhancements.

---

## Success Criteria for Phase 2 Complete

- [ ] Dashboard: activity + leaderboard live (done); optional team comparison.
- [ ] Library: submit assets, quality gates (Draft/Verified/Deprecated), verification + deprecation, reuse tracking and counts.
- [ ] Recognition: badges and leaderboards; impact stories feed.
- [ ] AI-assisted: improved search and recommendations (and optionally AI-assisted submission).
- [x] Close/archive: form with learning capture and learning summary display (done).

---

*Last updated: after dashboard Recent Activity + Top Contributors (v0.4.1).*
