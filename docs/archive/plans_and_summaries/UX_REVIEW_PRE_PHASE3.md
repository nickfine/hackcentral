# UX Review: What We've Built (Pre–Phase 3)

**Purpose:** Stop and consider the product from a UX perspective before starting Phase 3. Identify changes worth making now so we don't carry friction into the next phase.

**Scope:** All main surfaces: navigation, Dashboard, Library, Projects, People, Profile, modals, and global patterns.

---

## What We've Built (Summary)

### Navigation and shell
- **Header:** Logo "HackDay Central" (links to Dashboard), global search (placeholder, not wired), notifications (icon + dot, not wired), user menu (Clerk).
- **Sidebar (desktop):** Main nav (Dashboard, People, Library, Projects, Profile), Quick Access (AI Arsenal), footer CTA "Get Started" → Explore Library.
- **Mobile:** Hamburger opens overlay nav (same links); header search and notifications visible but non-functional.
- **Landing:** `/` redirects to `/dashboard`. No dedicated "home" or onboarding path.

### Dashboard
- **Page title:** "AI Maturity Dashboard" with short subtitle.
- **Top:** Four metric cards (AI contributors, Projects with AI, Library assets, Weekly active), then maturity bar ("Transforming" stage).
- **Below:** Two-column grid: Recent Activity | Top Contributors; then Top Mentors | Most Reused Assets; then full-width "Your recognition" (badges); then "Impact Stories" with "Share your story" button.
- **Modals:** Share impact story (headline, story text, optional project/asset links).
- **Empty states:** Each section has loading and empty copy. Recognition and stories have clear CTAs.

### Library
- **Page title:** "Library" + "Reusable AI assets, prompts, and templates"; primary CTA "Submit Asset."
- **Search and filters:** Search box (title, description, type, metadata), Type dropdown, Status dropdown.
- **AI Arsenal:** Prominent card with category counts (Prompts, Templates, etc.) and asset cards; link to `/library?arsenal=true`.
- **All Assets:** Heading "All Assets (N)", grid of cards (title, description, type, status, reuses). Deprecated assets sorted last.
- **Asset detail (modal):** Title, status/type badges, description, reuse count, verified by, "More like this," status actions (author), "I used this" / Attach to project, metadata, content, Close.
- **Submit Asset (modal):** Title, description, type, content, visibility, optional metadata.

### Projects
- **Page title:** "Projects" + subtitle; primary CTA "New Project."
- **Search and filters:** Search, status filter.
- **List:** Cards with title, description, status, owner, likes/help counts, comments; click opens Project detail modal.
- **Project detail modal:** Title, status, owner, Close/Archive (owner) with learning form, comments inline, "View in full" (opens Comments modal).
- **Create project (modal):** Title, description, visibility, anonymous checkbox.

### People
- **Page title:** "People" + "Find AI helpers and mentors in your organization"; primary CTA "Get Paired with Mentor."
- **Search and filters:** Search, experience level, mentor filter (All / Available Mentors / Seeking Mentors).
- **List:** Profile cards (avatar, name, experience, tags); click opens Profile detail modal. "Request Mentoring" on others' profiles when applicable.
- **Modals:** Profile detail; Request Mentoring (select mentor, duration, topic).

### Profile
- **Page:** Tabs: Contributions | Projects | Mentoring | Settings. No page-level h1 "Profile" or "My Profile"; first heading is the user's name (h2).
- **Contributions:** Placeholder / empty state.
- **Projects:** List of user's projects (if any).
- **Mentoring:** "Requests I've Made," "Mentoring I'm Providing," capacity prompt.
- **Settings:** View/edit profile (name, experience, visibility, tags, mentor capacity), Edit Profile opens modal.

---

## UX Observations and Likely Changes

### 1. Global header: search and notifications
- **Current:** Header has "Search..." and a notification bell with dot; neither is wired.
- **Risk:** Users may expect global search or notifications to work; dead UI can reduce trust.
- **Options:**  
  - **A.** Wire global search (e.g. navigate to Library or People with query, or a simple global search results view).  
  - **B.** Remove or hide search and notifications until they’re implemented, and add a short "Coming soon" or tooltip if you keep the icons.

### 2. Information hierarchy and page titles
- **Dashboard:** Title is "AI Maturity Dashboard" (product-y). Other pages use plain names ("Library," "Projects," "People"). Profile uses the person’s name as the main heading, not "Profile."
- **Suggestion:** Align page titles: either all product-facing ("Dashboard," "Library," "Projects," "People," "My Profile") or keep "AI Maturity Dashboard" but ensure Profile has a clear page-level label (e.g. "My Profile" above or beside the name) for consistency and accessibility.

### 3. First-time user path
- **Current:** Users land on Dashboard; sidebar CTA is "Explore Library." Dashboard has many metrics and sections but no clear "start here" path for new users.
- **Risk:** New users may not know whether to start with Library, Projects, or People.
- **Options:**  
  - Add a short onboarding strip or card on Dashboard for users with no/minimal activity (e.g. "Create your first project" or "Explore the Library").  
  - Or make the sidebar "Get Started" context-aware (e.g. "Complete your profile" vs "Explore Library") and ensure one primary path is obvious.

### 4. Library: two entry points (Arsenal vs All Assets)
- **Current:** AI Arsenal is a highlighted block above "All Assets"; Arsenal also has its own route and Quick Access link.
- **Observation:** Some users may not realise "All Assets" includes Arsenal items; others may want to go straight to "everything."
- **Suggestion:** Keep structure but clarify copy: e.g. "All Assets" could read "All assets (including Arsenal)" or add one line under the Library title explaining the two areas. Optional: persist "Show Arsenal only" as a filter so behaviour matches expectations.

### 5. Modals and secondary actions
- **Current:** Many primary actions open modals (Submit Asset, New Project, Share story, Edit Profile, Close/Archive, etc.). "View in full" for comments opens a second modal.
- **Observation:** Modals are consistent (backdrop, close, scroll). Deeper flows (e.g. comment threads) can feel buried.
- **Suggestion:** Keep modals for create/edit; consider a dedicated Project page (or full-page comments view) later for heavy collaboration. For now, ensure "View in full" and back/close are obvious (aria-labels, focus management).

### 6. Empty and loading states
- **Current:** Sections use "Loading…" and empty-state copy with CTAs where relevant (e.g. "Share your story," "Complete mentor sessions…").
- **Suggestion:** Audit one pass for tone and consistency (e.g. all empty states end with a single CTA or next step). Consider a shared empty-state component for layout and icon consistency.

### 7. Mobile
- **Current:** Sidebar hidden; hamburger opens nav overlay. Header search and notifications visible but non-functional. Main content is responsive (grids, filters wrap).
- **Risk:** On small screens, filters + search + lists can feel cramped; modals use max-h and scroll.
- **Suggestion:** Test key flows on a small viewport (Library search + open asset; Projects create + open project; People open profile + request mentor). Add a mobile-friendly "Clear filters" or collapse filters into a sheet if needed.

### 8. Accessibility and semantics
- **Current:** Modals use `role="dialog"`, `aria-modal`, `aria-labelledby`; buttons have `aria-label` where needed. Some lists are plain `div`/`ul` with no landmark or heading structure.
- **Suggestion:** Ensure each main section has a visible or off-screen heading (h2/h3) so screen-reader users can jump by heading. Confirm focus is trapped in modals and restored on close.

### 9. Terminology
- **Current:** "AI Arsenal," "artefacts" (in metrics), "reuses," "contributions," "impact stories," "recognition," "Close/Archive" (project).
- **Observation:** Mix of technical and plain language; "artefacts" may be unfamiliar.
- **Suggestion:** Decide on one term for "things people build with AI" (e.g. "AI artefacts" vs "AI assets") and use it consistently in UI and empty states. Optionally add a one-line glossary or tooltip for terms like "Arsenal" or "reuse."

### 10. Profile tab labels
- **Current:** Contributions | Projects | Mentoring | Settings.
- **Observation:** "Contributions" can be vague (library? projects? comments?). "Mentoring" is clear.
- **Suggestion:** If "Contributions" aggregates library + project activity, add a short subtitle or empty-state line (e.g. "Your library and project activity"). If it’s placeholder only, consider renaming to "Activity" or hiding until implemented.

---

## Prioritised Recommendations (Before Phase 3)

**High impact, low effort**
1. **Header:** Either wire global search (e.g. to Library/People + query) or remove/hide search and notifications and add a "Coming soon" note so the UI is honest.
2. **Profile page:** Add a clear page-level heading (e.g. "My Profile") and ensure tab order and labels make sense (e.g. clarify what "Contributions" shows).
3. **Dashboard first-time experience:** One small block or CTA for users with no/minimal activity (e.g. "Complete your profile" or "Explore the Library") so the first step is obvious.

**Medium impact, medium effort**
4. **Terminology:** Pick consistent terms for "artefacts" vs "assets" and "reuse" across Dashboard, Library, and metrics; update copy in one pass.
5. **Library:** One sentence under the title explaining Arsenal vs All Assets (and optionally a filter chip or link that matches the Arsenal route).
6. **Empty states:** One pass to align tone and CTA (and optionally a shared empty-state component).

**Lower priority / Phase 3**
7. **Mobile:** Dedicated pass on filters and modals on small screens; consider collapsible filters or a bottom sheet.
8. **Comments:** If comment-heavy usage grows, plan a full-page or expanded view instead of stacking modals.
9. **Onboarding:** Phase 3 onboarding flow can absorb "first-time path" and glossary hints.

---

## UX decisions log (pre–Phase 3)

*Record of decisions made so Phase 3 doesn't revert or contradict.*

| Area | Decision | Implemented |
|------|----------|-------------|
| **Header search & notifications** | Keep search and notification UI but mark as non-functional: `title="Coming soon"`, `aria-label` "(coming soon)", search input `readOnly`. Do not remove; wire in Phase 3 or later. | Yes |
| **Profile page title** | Page has a clear h1 "My Profile" at the top; user name in the card is h2. Subtitle: "View and manage your contributions, projects, and settings." | Yes |
| **Profile tab: Contributions** | Renamed to **Activity**; section heading "Recent Activity" with subtitle "Your library and project contributions". Clarifies that the tab shows library + project activity. | Yes |
| **Dashboard first-time experience** | Show a "Get started" CTA card when `recentActivity` is loaded and empty. Links: Explore Library, View Projects, Complete profile. Card disappears once there is activity. | Yes |
| **Library: Arsenal vs All Assets** | One sentence under the Library title: "The **AI Arsenal** is curated; **All Assets** shows everything in the library." No extra filter chip for now. | Yes |
| **Terminology** | Use **"assets"** (not "artefacts") in all user-facing copy: Dashboard, Projects, Library, Profile. Internal types/APIs may still use "artefact" where already defined. | Yes |

---

## Next Steps

- Use this doc in a short UX review (e.g. with a stakeholder or a quick pass with real users).
- Phase 3: consider wiring global search, notifications; mobile pass; onboarding flow.
- Update this file if further pre–Phase 3 decisions are made.

---

*Document generated as a pre–Phase 3 UX checkpoint. UX decisions log added after implementing high/medium items.*
