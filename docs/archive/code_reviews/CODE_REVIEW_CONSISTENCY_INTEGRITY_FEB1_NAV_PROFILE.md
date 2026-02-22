# Code Review: Consistency & Integrity (Nav, Profile, URLs)

**Date:** Feb 1, 2026  
**Scope:** Post–nav/profile unification and Quick Access removal. Canonical URLs, dead code cleanup, and cross-app consistency.

---

## Summary

- **Navigation:** Sidebar and mobile nav aligned (Dashboard → Hacks → People → Team pulse). Quick Access and Profile removed from sidebar; profile is reached via header avatar only on desktop, and via Profile in mobile menu.
- **Profile/account:** Single entry point: header avatar and (mobile) Profile link → `/profile`. Account actions (Sign out, Manage account) live on Profile page; Clerk account UI on dedicated `/profile/account` (no modal).
- **URLs:** Internal links use canonical `/hacks?tab=completed` and `/hacks?tab=in_progress` (and `&arsenal=true`, `&action=new`, `&q=...` where needed). `/library` and `/projects` remain as redirect-only routes. Detail routes unchanged: `/library/:assetId`, `/projects/:projectId`.
- **Dead code:** Removed orphaned `QuickStartWins` and `FeaturedWins` folders; removed `UserButton` export.

---

## 1. Navigation consistency

| Area | Before | After |
|------|--------|--------|
| Sidebar | Dashboard, People, Hacks, Team pulse, Profile; Quick Access (Featured Hacks) | Dashboard, Hacks, People, Team pulse; no Quick Access; no Profile (use header avatar) |
| Mobile nav order | Dashboard, People, Hacks, Team pulse, Profile | Dashboard, Hacks, People, Team pulse, Profile (matches sidebar order) |
| Profile entry | Sidebar "Profile" + header UserButton dropdown | Header avatar → `/profile`; mobile "Profile" → `/profile` |

**Verified:** Sidebar `navItems` and `MobileNav` order match. Footer "Explore Hacks" and "All get-started options" still point to `/hacks` and `/onboarding`.

---

## 2. Profile and account

- **Header:** Uses `ProfileLink` (avatar → `/profile`). `UserButton` (Clerk dropdown) no longer exported; component kept in `UserButton.tsx` for optional direct import.
- **Profile page:** Includes "Account" section: signed-in email, "Manage account" → `/profile/account`, "Sign out" (Clerk `signOut`).
- **Profile account route:** `profile/account/*` renders Clerk `<UserProfile />` (path routing). "Back to Profile" links to `/profile`.

**Verified:** No remaining modal-based profile; all account UI is on dedicated pages.

---

## 3. Canonical URLs (internal links)

Internal links updated to canonical Hacks URLs so behavior does not depend on redirects:

| Location | Before | After |
|----------|--------|--------|
| Guide | `/library`, `/library?arsenal=true`, `/projects` | `/hacks?tab=completed`, `/hacks?tab=completed&arsenal=true`, `/hacks?tab=in_progress` |
| Onboarding | `/library?arsenal=true` (×3) | `/hacks?tab=completed&arsenal=true` |
| Dashboard (nudges) | `/library`, `/projects` | `/hacks?tab=completed`, `/hacks?tab=in_progress` |
| FeaturedHacksShowcase | `/library`, `/library?action=new` | `/hacks?tab=completed`, `/hacks?tab=completed&action=new` |
| Search | `/library?q=...` | `/hacks?tab=completed&q=...` |
| HackCard fallback | `/library` | `/hacks?tab=completed` |
| QuickStartHacks fallback | `/library` | `/hacks?tab=completed` |

**Unchanged (correct):**

- Detail links: `/library/:assetId`, `/projects/:projectId` (no redirect; used for asset/project detail).
- QuickActionsPanel: already used `/hacks?tab=completed&arsenal=true` and `/hacks?tab=completed&action=new`.
- Redirect routes: `/library` and `/projects` still redirect with query params preserved (`RedirectToHacks` in `App.tsx`).

---

## 4. Dead code cleanup (DONE)

**Removed:**

| Path | Reason |
|------|--------|
| `src/components/dashboard/QuickStartWins/` | Orphaned folder; index.ts exported non-existent `QuickStartWins` component. |
| `src/components/dashboard/FeaturedWins/` | Orphaned folder (WinCard, FeaturedWinsShowcase, WallOfThanksStrip). Never imported; FeaturedHacks equivalents are used instead. |
| `UserButton` export from `auth/index.ts` | No longer used; ProfileLink is the primary profile UI. |

**Fixed before deletion:**

- `WinCard.tsx` used `/library?asset=` (query param) instead of `/library/:assetId` (path param) — inconsistent with HackCard.

---

## 5. Files touched in this review

- `src/components/shared/Header.tsx` — Mobile nav order (Hacks before People).
- `src/pages/Guide.tsx` — Canonical `/hacks?tab=...` links.
- `src/pages/Onboarding.tsx` — Canonical `/hacks?tab=completed&arsenal=true`.
- `src/pages/Dashboard.tsx` — Already using canonical URLs (verified).
- `src/components/dashboard/FeaturedHacks/FeaturedHacksShowcase.tsx` — Browse and Submit links to canonical URLs.
- `src/components/dashboard/FeaturedHacks/HackCard.tsx` — Fallback URL to canonical.
- `src/components/dashboard/QuickStartHacks/QuickStartHacks.tsx` — Fallback URL to canonical.
- `src/pages/Search.tsx` — Result links to `/hacks?tab=completed&q=...`.
- `src/components/auth/index.ts` — Removed `UserButton` export.
- **Deleted:** `src/components/dashboard/QuickStartWins/`, `src/components/dashboard/FeaturedWins/`.

---

## 6. Verification

- **TypeScript:** `npx tsc --noEmit` passes with no errors.
- **Lint:** No linter errors in modified files.
- **grep `/library` links:** None remain (all canonical or detail routes).
- **grep FeaturedWins/QuickStartWins:** No references remain.

---

## 7. Recommendations

1. **Testing:** Manually confirm "Browse All Hacks", "Explore Completed Hacks", "Manage account", "Sign out", and search result links open the correct pages with correct query params.
2. **Optional:** Delete `UserButton.tsx` if direct imports are not needed.
