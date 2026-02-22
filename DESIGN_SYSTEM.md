# HackCentral Design System

Shared UI components and patterns used across major pages. Components live in `src/components/shared/` and are exported from `src/components/shared/index.ts`. Theme tokens are in `src/styles/globals.css`.

**Authoritative visual reference:** [docs/HackDay_Design_system.md](docs/HackDay_Design_system.md) is the single source of truth for colours, typography, spacing, cards, and buttons. All UI must follow it.

## Color palette

Aligned with HackDay 2026 Design System (teal-only accent; Tailwind gray neutrals; semantic status only).

| Role | Hex / token | Use |
|------|-------------|-----|
| **Primary (teal only)** | `#14b8a6` / `teal-500` / `--color-primary` | CTAs, active states, focus ring, hero accent. No second accent. |
| **Neutrals** | Tailwind **gray** scale only | Backgrounds, borders, muted text (`--color-muted`, `--color-border`, `--color-card`). Do not mix slate/zinc/neutral. |
| **Semantic status** | **Emerald** (success), **Amber** (warning), **Red** (error/blocked) | Status indicators only; never as decoration. |
| **Border / card** | `--color-border`, `--color-card` | Cards, inputs, borders (gray-200 / gray-700 in dark). |

Use semantic tokens (`text-primary`, `bg-card`, `border-border`, `text-muted-foreground`) so dark mode and future theme changes stay consistent.

## Typography & spacing

- **Font:** `--font-sans` (Inter) for UI; `--font-mono` for code.
- **Four-tier typography:** Tier 1 page title `text-4xl sm:text-5xl font-black tracking-tight`; Tier 2 section `text-lg font-semibold` or `text-2xl font-bold` for subpage titles; Tier 3 body `text-sm font-normal`; Tier 4 meta `text-xs font-normal`. Tier colours: Tier 1 `text-gray-900` (light) / `text-white` (dark); Tier 2 `text-gray-800` / `text-gray-100`; Tier 3 `text-gray-700` / `text-gray-300`; Tier 4 `text-gray-500` / `text-gray-400`. Section labels: `text-xs font-semibold tracking-wider` (use `.section-label` or equivalent).
- **Spacing:** 24px between major sections (`gap-6` / `mb-6`); 12px for tight blocks (`gap-3`); card padding `p-5`; section label to content `pb-2`. All vertical gaps in multiples of 12px.

## Premium hover & cards

- **Cards:** White (light) / gray-800 (dark), `rounded-xl`, `border border-border`, `shadow-sm` (light only). No gradients on cards. Internal padding `p-5`.
- **Clickable cards:** `hover:shadow-md transition-shadow`; for emphasis add `hover:scale-[1.02] hover:-translate-y-0.5` (PersonCard, HackCard, StatCard, SimilarHackCard).

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

- **Buttons:** Primary `btn btn-primary` (teal, `rounded-lg`; no pill-shaped primary). Secondary/outline `btn btn-outline` (gray border, transparent bg). Use `btn-sm` or `btn-md`; `btn-icon` for icon-only.
- **Cards:** `card` (from globals) with `p-5`; use `hover:shadow-md transition-shadow` for clickable list cards. No gradients on cards.
- **Badges:** `badge`, `badge-outline`, `badge-muted` (rounded-lg, not pill); use project constants (e.g. `HACK_TYPE_BADGE_COLORS`, `PROJECT_STATUS_BADGE_COLORS`) for status/type.
- **Dark mode:** Full dark support; use `dark:` variants and theme variables so cards, text, and borders follow the doc’s dark column (e.g. gray-800 cards, gray-700 borders, tier text colours).

## Gold standard pages

- **Dashboard** and **Profile** (and the hack detail flow) define the visual language: SectionHeader, StatCard, ModalWrapper, cards, badges, spacing.
- New pages and modals should prefer these shared components and the same tokens (`border-border`, `bg-card`, `text-muted-foreground`, etc.).
