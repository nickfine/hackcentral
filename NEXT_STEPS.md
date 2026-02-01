# Next Steps - HackCentral

**Status:** v0.6.4 · Phases 1–4 complete  
**Last updated:** February 1, 2026

For detailed implementation notes, browser test results, and technical patterns see **`learnings.md`**. For full spec and schema see **`ROADMAP.md`**.

---

## Where we are

- **Phases 1–4** (MVP → Pull Dynamics → Core Features → Advanced Features → Continuous Optimization) are implemented and browser-tested.
- **Stack:** Convex + Clerk, React 19, Vite 7, Tailwind 4. Sentry and Vercel Analytics wired for production.
- **In place:** Dashboard (metrics, Gini, export, leaderboards, impact stories, derived badges), Projects (CRUD, dedicated `/projects/:id` page, close/archive + learning capture), People, Library (submit/verify, “more like this”, improved search), Profile (Activity, Mentoring, Settings), mentor matching (Phase 1.5), global search, onboarding, guide, notifications, feedback modal, learning-summary nudge, A/B nudge copy. **Featured hacks (v0.6.4):** Type-appropriate CTAs (prompt/skill → Copy Hack + View Details; app → View Details only); dashboard ensures at least one prompt, skill, app in featured set; QuickStartHacks aligned; HackCard tests; consistency review (CODE_REVIEW_CONSISTENCY_INTEGRITY_FEATURED_HACKS.md).

---

## What’s next

### Iterative / ops

- Use the **feedback loop:** review Sentry and Vercel Analytics; run **A/B tests** (e.g. `NUDGE_COPY_VARIANT` in Convex env).

### Optional enhancements

- **Stale-project nudge** – e.g. “Projects in Building 14+ days with no activity”.
- **Admin feedback UI** – restrict `feedback.list` to admins when adding an admin UI.
- **More A/B levers** – extra toggles/variants in `getPublicConfig`.

### Backlog

- ROADMAP **optional** items: teams, richer AI search.
- **Testing** – more unit/E2E coverage.
- **Manual mentor flow** – full end-to-end mentor request/accept/complete (Phase 1.5 automation had limits).

---

## Run & test

```bash
npm run dev
```

- App: http://localhost:5173  
- Convex dashboard: https://dashboard.convex.dev  
- Seed (if needed): run `seedData:seedCapabilityTags` and `seedData:seedAIArsenal` as internal mutations in Convex.

---

## Docs

| Doc | Purpose |
|-----|--------|
| `learnings.md` | Current state, setup, per-phase notes, browser tests, next steps |
| `ROADMAP.md` | Full technical roadmap and schema |
| `CONVEX_SETUP.md` | Convex setup |
| `CLERK_SETUP.md` | Clerk auth |
| `README.md` | Project overview |

---

## Need help?

- **Convex:** `convex/` folder, `npx convex logs`
- **Clerk:** Clerk Dashboard → Logs
- **Frontend:** Browser console
- **Deploy:** Vercel logs
