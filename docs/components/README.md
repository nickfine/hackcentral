# Shared Components — Usage

Shared UI components live in `src/components/shared/` and are exported from `src/components/shared/index.ts`. See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) for the full design system (colors, typography, accessibility).

## Component list

| Component | File | Use when |
|-----------|------|----------|
| **SectionHeader** | `SectionHeader.tsx` | Page or section title; optional description; optional CTA (primary/outline). |
| **ModalWrapper** | `ModalWrapper.tsx` | Any overlay dialog: backdrop, title, close, Escape, scroll. `maxWidth`: sm, md, lg, xl, 2xl. |
| **StatCard** | `StatCard.tsx` | KPI display: value, label, optional icon and trend. |
| **PersonCard** | `PersonCard.tsx` | People directory cards: avatar, name, experience badge, capability tags, mentor status. Expects `PersonCardProfile` (capabilityTags: `{ id, label }[]`). |
| **ActivityItem** | `ActivityItem.tsx` | Activity feeds: icon, title, description, optional timestamp and metadata. |
| **EmptyState** | `EmptyState.tsx` | Empty lists: icon, title, description, optional action (button or link). Variants: default, compact. |
| **BadgeGroup** | `BadgeGroup.tsx` | Groups of badges with consistent spacing; `maxVisible`, `size`, variants. |
| **SkeletonCard** | `SkeletonCard.tsx` | Loading placeholder. Variants: default, compact, wide, stat. |
| **SkeletonGrid** | `SkeletonGrid.tsx` | Grid of SkeletonCards; use for list/grid loading. `count`, `columns`, `variant`, `gap`. |

## Usage

```tsx
import { SectionHeader, ModalWrapper, StatCard, PersonCard, EmptyState, SkeletonGrid } from '@/components/shared';
// or
import { SectionHeader } from '../components/shared';
```

- **SectionHeader:** `title`, `description?`, `action?` (label, icon, onClick, variant).
- **ModalWrapper:** `isOpen`, `onClose`, `title`, `children`, `titleId?`, `maxWidth?`.
- **StatCard:** `value`, `label`, `icon?`, `trend?`, `className?`.
- **PersonCard:** `profile` (PersonCardProfile), `onClick?`, `showMentorStatus?`, `className?`.
- **EmptyState:** `icon`, `title`, `description?`, `action?` (label, icon, onClick or to), `variant?`.
- **SkeletonGrid:** `count?`, `columns?`, `variant?`, `gap?`, `className?`.

For full props and types, see the component files and `src/components/shared/index.ts` (exported types).

## Gold standard pages

Dashboard, Profile, and the hack detail flow use these components and define the visual language. New pages and modals should prefer these shared components and design tokens (`border-border`, `bg-card`, `text-muted-foreground`, etc.).
