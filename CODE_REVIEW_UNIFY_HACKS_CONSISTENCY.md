# Code Review: Unify Hacks — Consistency and Integrity

**Scope:** Post-implementation review of the unified Hacks page (Completed + In progress), redirects, nav, and in-app links.

---

## 1. Summary

| Area | Status | Notes |
|------|--------|--------|
| Routes & redirects | OK | `/hacks`, `/library` → `/hacks?tab=completed`, `/projects` → `/hacks?tab=in_progress`; query params preserved |
| Detail routes | OK | `/library/:assetId`, `/projects/:projectId` unchanged |
| Back links from detail | OK | LibraryAssetDetail and ProjectDetail use `/hacks?tab=...` |
| Sidebar / Header | OK | Single "Hacks" item, FolderKanban icon |
| In-app links to /library, /projects | OK | Rely on redirects; behavior correct |
| Library.tsx when embedded in Hacks | Minor | See §2 |
| URL param naming | Minor | See §3 |
| Pages export | Fixed | Hacks added to `src/pages/index.ts` |

---

## 2. Library.tsx Close Modal Navigation

**Finding:** When the user closes the Submit Hack modal after opening it via `?action=new`, Library calls `navigate('/library', { replace: true })`. That triggers a redirect to `/hacks?tab=completed`, so the user ends up in the right place but with an extra redirect.

**Recommendation:** Navigate directly to the canonical list URL so the URL bar and history stay consistent and we avoid a double hop.

**Fix applied:** In `Library.tsx`, when closing the modal and clearing the action param, navigate to `/hacks?tab=completed` instead of `/library`.

---

## 3. URL Param Naming (Featured Hacks / Arsenal)

**Finding:**  
- Sidebar "Featured Hacks" uses `/hacks?tab=completed&arsenal=true`.  
- QuickActionsPanel "Browse Featured Hacks" uses `/library?filter=arsenal`.  
- Library does not read `arsenal` or `filter` from the URL; it always shows both Featured Hacks and All Hacks. So both links behave the same (redirect → Completed tab), but param names differ.

**Recommendation:** Prefer the canonical URL and one param name. Use `/hacks?tab=completed&arsenal=true` for "Featured Hacks" everywhere so bookmarks and analytics are consistent. Optional: have Library respect `arsenal=true` to scroll to or emphasize the Featured section later.

**Fix applied:** QuickActionsPanel "Browse Featured Hacks" href updated from `/library?filter=arsenal` to `/hacks?tab=completed&arsenal=true`. "Submit your first hack" href updated from `/library?action=new` to `/hacks?tab=completed&action=new` for canonical URL consistency.

---

## 4. Default Tab and Shareable URL

**Finding:** Visiting `/hacks` with no query shows the Completed tab but the URL stays `/hacks`. So `/hacks` and `/hacks?tab=completed` both show the same content.

**Recommendation:** Acceptable as-is. Optional improvement: one-time `replace` to `/hacks?tab=completed` when `tab` is missing so the URL always reflects the visible tab (better for sharing and back/forward). Deferred.

---

## 5. Integrity Checks

- **Redirect query preservation:** `RedirectToHacks` copies all current search params and sets `tab`. So `/library?q=foo&action=new` → `/hacks?tab=completed&q=foo&action=new`. Library still sees `q` and `action`; behavior correct.
- **?asset= in Library:** Library redirects `?asset=xxx` to `/library/:assetId`. When the user lands via `/library?asset=xxx` → redirect to `/hacks?tab=completed&asset=xxx`, Library (mounted under Hacks) sees `asset` and redirects to `/library/:assetId`. Correct.
- **NavLink active state:** NavLink `to="/hacks"` matches pathname; `/hacks`, `/hacks?tab=completed`, and `/hacks?tab=in_progress` all highlight the Hacks nav item. Correct.
- **Detail links:** All "View details" and asset cards still use `/library/:assetId` or `/projects/:projectId`. Correct.

---

## 6. Files Touched in This Review

- `src/pages/Library.tsx` — close modal: navigate to `/hacks?tab=completed` when clearing `action=new`.
- `src/pages/index.ts` — export `Hacks`.
- `src/components/dashboard/QuickActionsPanel.tsx` — "Browse Featured Hacks" href → `/hacks?tab=completed&arsenal=true`; "Submit your first hack" href → `/hacks?tab=completed&action=new`.

---

## 7. Links Left as /library or /projects (By Design)

These continue to work via redirects; no change required:

- Dashboard: "Copy Your First Hack", "Explore Completed Hacks", "Browse Completed Hacks", "View Hacks In Progress" → `/library` or `/projects`.
- Guide: "Completed Hacks", "Featured Hacks", "Hacks In Progress" → `/library` or `/library?arsenal=true` or `/projects`.
- Onboarding: "Explore Featured Hacks" → `/library?arsenal=true`.
- FeaturedHacksShowcase: "Browse Completed Hacks", "Submit Hack" → `/library`, `/library?action=new`.
- WelcomeHero: "Copy Your First Hack" → `/library`.
- Search: results link → `/library?q=...`.

Redirects preserve query params, so `action=new`, `q`, `arsenal`, etc. are retained on the unified page.
