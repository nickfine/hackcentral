# HackCentral Design System

Shared UI components and patterns used across major pages. Components live in `src/components/shared/` and are exported from `src/components/shared/index.ts`. Theme tokens are in `src/styles/globals.css`.

## Color palette

| Role | Hex / token | Use |
|------|-------------|-----|
| **Primary (teal-cyan)** | `#06b6d4` / `--color-primary` | Buttons, links, focus ring, key CTAs |
| **Teal-cyan accent** | `#0ea5e9` | Gradients, highlights (e.g. confetti) |
| **Secondary (Featured / impact)** | `#d946ef` / `--color-secondary` | Featured badges, impact stories, accents |
| **Pink (Featured)** | `#ec4899` | Optional alternate for Featured; close to secondary |
| **Violet** | `#7c3aed` / `--color-accent-secondary` (#a855f7 in theme) | Accents, maturity stages |
| **Muted** | `--color-muted`, `--color-muted-foreground` | Backgrounds, secondary text |
| **Border / card** | `--color-border`, `--color-card` | Cards, inputs, borders |

Use semantic tokens (`text-primary`, `bg-card`, `border-border`, `text-muted-foreground`) so dark mode and future theme changes stay consistent.

## Typography & spacing

- **Font:** `--font-sans` (Inter) for UI; `--font-mono` for code.
- **Headings:** Page titles `text-2xl md:text-3xl font-bold tracking-tight`; section titles `text-xl font-semibold`; body `text-base leading-relaxed`.
- **Spacing:** 8-point system (multiples of 4/8). Main content `space-y-6` or `min-w-0 space-y-6`; sections `gap-4` / `gap-6`; cards `p-4` or `p-6`. See PLAN_DASHBOARD_POLISH_2026.md for dashboard spacing.

## Premium hover & cards

- **Clickable cards:** `hover:shadow-md transition-shadow`; for emphasis add `hover:scale-[1.02] hover:-translate-y-0.5` (PersonCard, HackCard, StatCard, SimilarHackCard).
- **Cards:** `rounded-xl border border-border bg-card`; use `shadow-sm` and optional hover lift.

## Accessibility (WCAG AA)

- **Contrast:** Use `text-foreground` on `bg-background`, `text-muted-foreground` for secondary text. Primary buttons use `btn-primary` (theme ensures contrast).
- **Focus:** Visible focus ring on buttons and links (`focus-visible:ring-2 focus-visible:ring-primary`).
- **Modals:** ModalWrapper provides `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and Escape-to-close.
- **Keyboard:** Clickable cards use `role="button"`, `tabIndex={0}`, and `onKeyDown` for Enter/Space. Aim for logical tab order and no keyboard traps.

## Page structure

- **Main content wrapper:** Use `min-w-0 space-y-6` (or `space-y-6`) for consistent spacing and overflow on detail/list pages.
- **Page header:** Use `SectionHeader` with `title`, optional `description`, and optional `action` (primary/outline button) instead of raw `<h1>` + `<p>` + button.

## Shared components

| Component | Use when |
|-----------|----------|
| **SectionHeader** | Page or section title; optional description; optional CTA (e.g. "Submit Hack", "New Project", "Export metrics"). |
| **ModalWrapper** | Any overlay dialog: backdrop, title, close button, Escape key, scroll. Use `maxWidth`: `sm`, `md`, `lg`, `xl`, `2xl`. |
| **StatCard** | Dashboard/profile metrics: value, label, optional icon and trend. |
| **PersonCard** | People directory cards: avatar, name, experience, capability tags, mentor status. Used on People page (profile + capabilityTags mapped to PersonCardProfile). |
| **ActivityItem** | Activity feeds: icon, title, description, optional timestamp and metadata. |
| **EmptyState** | Empty lists: icon, title, description, optional action button. |
| **BadgeGroup** | Groups of badges (e.g. capability tags) with consistent spacing and variants. |
| **SkeletonCard** | Loading placeholders. Variants: `default`, `compact`, `wide`, `stat`. |
| **SkeletonGrid** | Grid of skeleton cards; use for list/grid loading (e.g. People, Library, Projects). |
| **RepoLink / RepoLinkOrSuggest** | Source repository links (GitHub, GitLab, Bitbucket). Use `label="View Source Code"` for hero placement. |
| **BeforeAfterSlider** | Split-view comparing Raw Input vs Output; used in hack detail "How to use" examples. |
| **CopyFeedbackToast** | Thumbs up/down prompt after copying a hack; use with `toast.custom()`. |

## Library components

| Component | Use when |
|-----------|----------|
| **RepositoryInput** | Submit Hack form: optional repository URL with validation for GitHub/GitLab/Bitbucket. |
| **PromptWithVariables** | Hack detail: renders prompt text with `[Variable]` placeholders highlighted. |

## Buttons and cards

- **Buttons:** `btn btn-primary`, `btn btn-outline`, `btn btn-ghost`; add `btn-sm` or `btn-md` as needed. Use `btn-icon` for icon-only.
- **Cards:** `card` (from globals) with `p-4` or `p-6`; use `hover:shadow-md transition-shadow` for clickable list cards.
- **Badges:** `badge`, `badge-outline`, `badge-muted`; use project constants (e.g. `HACK_TYPE_BADGE_COLORS`, `PROJECT_STATUS_BADGE_COLORS`) for status/type.

## Gold standard pages

- **Dashboard** and **Profile** (and the hack detail flow) define the visual language: SectionHeader, StatCard, ModalWrapper, cards, badges, spacing.
- New pages and modals should prefer these shared components and the same tokens (`border-border`, `bg-card`, `text-muted-foreground`, etc.).
