# Phase 3: Advanced Features

**Goal:** Onboarding and barrier reduction, governance, standardization pathways, advanced metrics (Gini, export), global search and notifications, performance optimization.

**Status:** Complete (v0.4.15)  
**Reference:** ROADMAP.md § Phase 3 (Weeks 11–14), UX_REVIEW_PRE_PHASE3.md

---

## Workstreams and implementation order

| Order | Workstream | Key deliverables |
|-------|------------|-------------------|
| 1 | **Global search** | Header search → `/search?q=...`; Search page queries Library + People. |
| 2 | **Advanced metrics – Gini** | `getEarlyAdopterGini` in metrics.ts; Dashboard card. |
| 3 | **Contribution recording** | Write `project_ai_artefact` and `verification` to aiContributions. |
| 4 | **Onboarding** | OnboardingFlow / enhanced CTA; Library, templates, AI 101; starter kits. |
| 5 | **Governance** | Readiness form for building; status validation in projects.update; GovernanceBadge. |
| 6 | **Standardization** | Reuse threshold query; graduation; notifications query + Header bell. |
| 7 | **Metrics export + frontline/leader** | Export button; optional frontline vs leader. |
| 8 | **Performance** | Pagination on Library/People/Projects; lazy routes. |
| 9 | **Polish** | Anonymous submission, sandbox, graduated nudges, AI 101 micro-guide. |

---

## Concrete file/function changes

### 1. Global search
- [ ] `src/components/shared/Header.tsx`: Remove `readOnly` from search input; add state and `onSubmit` → navigate to `/search?q=...`; wire mobile search.
- [ ] `src/pages/Search.tsx`: New page; read `q` from `useSearchParams`; `useQuery(api.libraryAssets.listWithReuseCounts, {})`, `useQuery(api.profiles.list)`; filter client-side; two sections "Library" and "People".
- [ ] `src/App.tsx`: Add route `path="search" element={<Search />}`.
- [ ] `src/pages/index.ts`: Export `Search`.
- [ ] `src/pages/Library.tsx`: On mount, read `?q=` from URL and set initial searchQuery (optional).
- [ ] `src/pages/People.tsx`: On mount, read `?q=` from URL and set initial searchQuery (optional).

### 2. Gini
- [ ] `convex/metrics.ts`: Add `getEarlyAdopterGini` query (ROADMAP formula; active users = profile creation in last 90 days).
- [ ] `src/pages/Dashboard.tsx`: Add Gini card (value, interpretation: Low / Moderate / High); thresholds &lt; 0.7, ≥ 0.7, ≥ 0.8.

### 3. Contribution recording
- [ ] `convex/libraryAssets.ts`: On `update` when status → verified, insert `aiContributions` with type `verification`.
- [ ] `convex/libraryReuse.ts` or `convex/projects.ts`: When attaching asset to project, insert `aiContributions` with type `project_ai_artefact` (or in projects.update when status changes).

### 4. Onboarding
- [ ] `src/pages/Onboarding.tsx` or enhance Dashboard CTA: paths "AI Experiment Starter", "Copilot prompt pack", "Reuse AI Arsenal item"; link to Library, templates; optional `/onboarding` route.
- [ ] Starter kits: map experience/capability to curated asset IDs; show in onboarding or Library.
- [ ] AI 101: static/markdown content at `/guide` or modal; link from Dashboard/onboarding.

### 5. Governance
- [ ] `convex/schema.ts`: Add optional fields to `projects`: e.g. `readinessCompletedAt`, `sponsorCommittedAt`, `readinessPayload` (impact hypothesis, risk check).
- [ ] `convex/projects.ts`: In `update`, validate transition to `building` (require readiness) and to `incubation` (require sponsor when applicable); return clear error.
- [ ] `src/pages/ProjectDetail.tsx`: When owner moves to building, show readiness form (modal or inline); save to project; show GovernanceBadge.

### 6. Standardization
- [ ] `convex/metrics.ts` or `convex/libraryReuse.ts`: Add `getGraduatedAssets(minReuses?)` (e.g. ≥ 10).
- [ ] Notifications: query `getNotificationsForUser(profileId)` (graduations, mentor request updates); wire Header bell to dropdown or `/notifications`.

### 7. Metrics export + frontline/leader
- [ ] Convex: query or HTTP action for dashboard metrics + Gini as JSON/CSV.
- [ ] `src/pages/Dashboard.tsx`: "Export" button → download.
- [ ] Optional: frontline vs leader segment and comparison.

### 8. Performance
- [ ] Convex list queries: add `limit`/cursor pagination (Library, People, Projects, impact stories).
- [ ] `src/App.tsx`: Lazy-load route components (`React.lazy`).

### 9. Polish
- [ ] Anonymous submission: toggle in Submit Asset (and New Project); `isAnonymous` on schema if needed.
- [ ] Sandbox: label visibility or add "Sandbox" option in create flows.
- [ ] Graduated nudges: Dashboard/Layout logic by user state.
- [ ] AI 101 micro-guide: content and links.

---

## Done in Phase 3 (check off as completed)

### 1. Global search
- [x] Header wired; Search page; route; Library/People URL q sync.

### 2. Gini
- [x] getEarlyAdopterGini; Dashboard card.

### 3. Contribution recording
- [x] verification + project_ai_artefact writes.

### 4. Onboarding
- [x] OnboardingFlow / CTA; AI 101; starter kits.

### 5. Governance
- [x] Schema; projects.update validation; readiness form; GovernanceBadge.

### 6. Standardization
- [x] getGraduatedAssets; notifications query; Header bell.

### 7. Metrics export
- [x] Export button; frontline/leader optional.

### 8. Performance
- [x] Pagination; lazy routes.

### 9. Polish
- [x] Anonymous; sandbox; nudges; AI 101.
