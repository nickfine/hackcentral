# Phase 4: Continuous Optimization

**Goal:** AI admin nudges, lightweight A/B testing, analytics and monitoring (Sentry, Vercel Analytics), user feedback loop.

**Status:** In progress  
**Reference:** ROADMAP § Phase 4 (Continuous Optimization), phase_4_implementation_plan

---

## Workstreams and implementation order

| Order | Workstream | Key deliverables |
|-------|------------|-------------------|
| 1 | **Admin nudge (learning summary)** | ProjectDetail: nudge when completed + empty learning summary; "Add learning summary" form reusing existing fields; `projects.update`. |
| 2 | **User feedback** | Convex `feedback` table + `feedback.create`; Feedback link in Header/Layout; modal or page with form and success toast. |
| 3 | **Error tracking** | Sentry SDK, init in main.tsx, report in ErrorBoundary; env `VITE_SENTRY_DSN`; document in README or .env.example. |
| 4 | **Vercel Analytics** | Add `@vercel/analytics`, render in App/main; document. |
| 5 | **A/B (optional)** | Convex env or single settings doc + one query; one variant (e.g. nudge copy); document how to run a test. |

---

## Concrete file/function changes

### 1. Admin nudge (learning summary)
- [x] `src/pages/ProjectDetail.tsx`: Add nudge block when `isClosed && isOwner && !hasLearningSummary`; "Add learning summary" CTA; inline form reusing lessons/time saved/AI tools/workflow; on submit call `projects.update` with failuresAndLessons, timeSavedEstimate, workflowTransformed, aiToolsUsed (no status change).

### 2. User feedback
- [x] `convex/schema.ts`: Add `feedback` table: `userId` (optional), `message` (string), `category` (optional string), `_creationTime`.
- [x] `convex/feedback.ts`: New file; mutation `feedback.create` with validator; optional query `feedback.list` (admin).
- [x] `src/components/shared/Header.tsx`: Add "Feedback" or "Send feedback" link; click opens modal with form (message required, category optional).
- [x] Modal: message (required), category (e.g. Bug, Idea, Other); on submit call `feedback.create`; toast "Thanks, your feedback was sent."

### 3. Error tracking (Sentry)
- [x] Add `@sentry/react`; init in `src/main.tsx` with `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, ... })`.
- [x] `src/components/shared/ErrorBoundary.tsx`: In `componentDidCatch`, call `Sentry.captureException(error)` (and optional context from errorInfo).
- [x] Document `VITE_SENTRY_DSN` in .env.example / README.

### 4. Vercel Analytics
- [x] Add `@vercel/analytics`; render `<Analytics />` in App.tsx or main.tsx.
- [x] Document in README.

### 5. A/B (optional)
- [x] Convex env var (e.g. `NUDGE_COPY_VARIANT`) or single `appSettings` doc; query `settings.getPublicConfig` returning variant keys.
- [x] One variant (e.g. nudge copy string) switchable; document pattern in README.

---

## Done in Phase 4 (check off as completed)

### 1. Admin nudge
- [x] ProjectDetail: nudge when completed + empty learning summary; Add learning summary form; projects.update.

### 2. User feedback
- [x] feedback table + feedback.create; Header link + modal; toast.

### 3. Error tracking
- [x] Sentry init; ErrorBoundary.captureException; env doc.

### 4. Vercel Analytics
- [x] @vercel/analytics in App/main; doc.

### 5. A/B
- [x] Env or settings doc + one query; one variant; doc.
