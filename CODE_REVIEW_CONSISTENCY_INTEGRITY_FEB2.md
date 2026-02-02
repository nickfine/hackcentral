# Code Review: Consistency & Integrity (Feb 2, 2026)

**Scope:** Post–sticky-header-fix review for consistency and integrity across pages and shared components.

---

## 1. Summary

| Area | Status | Notes |
|------|--------|-------|
| **Layout & structure** | ✅ | Layout, Header, Sidebar aligned; Hacks page flows correctly without sticky |
| **Shared components** | ✅ | SectionHeader, TabButton, ModalWrapper used correctly |
| **Design system** | ⚠️ | textarea elements use `.input` instead of `.textarea` |
| **Constants / DRY** | ⚠️ | LIBRARY_TYPES, ASSET_TYPES duplicate HACK_TYPES |
| **Copy / casing** | ⚠️ | "All Types" vs "All types" inconsistent |
| **Placeholder UI** | ⚠️ | "More Filters" button has no behavior |
| **Imports** | ⚠️ | Mixed `@/` and `../` (noted in prior reviews) |

---

## 2. Consistency Issues

### 2.1 Duplicate type constants (DRY violation)

Three definitions of the same hack-type options exist:

| Location | Name | Content |
|----------|------|---------|
| `src/constants/project.ts` | `HACK_TYPES` | `{ value: 'prompt', label: 'Prompts' }, …` |
| `src/pages/Hacks.tsx` | `LIBRARY_TYPES` | Identical |
| `src/pages/Library.tsx` | `ASSET_TYPES` | `{ value: 'prompt', label: 'Prompt' }` (singular "Prompt") |

**Recommendation:** Use `HACK_TYPES` from `@/constants/project` in Hacks.tsx and Library.tsx. For Library’s submit form, map `HACK_TYPES` or derive singular labels if needed.

### 2.2 "All Types" vs "All types"

- `Hacks.tsx` line 86: `All Types` (Completed tab)
- `Hacks.tsx` line 141: `All types` (In progress tab)

**Recommendation:** Choose one. "All Types" (capital T) is more common in UI for filter placeholders.

### 2.3 Textarea styling

Design system defines both `.input` and `.textarea`. All textareas use `className="input …"` instead of `className="textarea …"`:

- Header FeedbackModal: `input w-full min-h-[100px]`
- Library SubmitAssetModal: `input w-full min-h-[80px]`, etc.
- Projects create form: `input w-full min-h-[80px]`
- People profile modal: `input w-full h-24 resize-none`
- ProjectDetail: multiple textareas with `input`
- Dashboard story modal: `input min-h-[100px] w-full`

**Recommendation:** Switch textarea elements to `textarea` class for clarity and easier future styling changes.

### 2.4 Import path consistency

Mixed usage of `@/components/shared` and `../components/shared` (and similar for hooks, lib, constants). Both work; prior reviews flagged this as cosmetic. Optional to standardize on `@/` for shared modules.

---

## 3. Integrity Issues

### 3.1 "More Filters" button (dead UI)

`Hacks.tsx` (In progress tab):

```tsx
<button type="button" className="btn btn-outline btn-md">
  <Filter className="h-4 w-4 mr-2" />
  More Filters
</button>
```

No `onClick` handler. Either wire up filter behavior or remove/hide until implemented.

### 3.2 Layout `lg:pt-14` redundancy

`Layout.tsx` line 16:

```tsx
main className="... pt-14 ... lg:pt-14 ..."
```

`pt-14` already applies at all breakpoints. `lg:pt-14` is redundant but harmless.

---

## 4. Structure & Layout

### 4.1 Hacks page (post sticky removal)

- Uses `min-w-0 space-y-6` wrapper ✅
- SectionHeader for "Our Hacks" ✅
- Search/filters/tabs grouped in `space-y-4` ✅
- Library and Projects receive correct props when embedded ✅
- Tab content renders cleanly; no extra wrappers ✅

### 4.2 Layout and scroll behavior

- Header: `fixed top-0 … z-50 h-14`
- Sidebar: `fixed top-14 … z-40`
- Main: `overflow-y-auto`, `pt-14`, `bg-background`
- `globals.css`: `html`/`body` `height: 100%` and `overflow: hidden` to confine scroll to `main` ✅

---

## 5. Recommendations (priority)

| Priority | Item | Effort |
|----------|------|--------|
| High | Unify LIBRARY_TYPES/ASSET_TYPES with HACK_TYPES | Low |
| High | Fix "All Types" vs "All types" casing | Trivial |
| Medium | Wire up or remove "More Filters" button | Low |
| Medium | Use `.textarea` for textarea elements | Low |
| Low | Standardize import paths to `@/` | Medium |
| Low | Remove redundant `lg:pt-14` in Layout | Trivial |

---

## 6. Files Reviewed

- `src/pages/Hacks.tsx`
- `src/pages/Library.tsx`
- `src/pages/Projects.tsx`
- `src/components/shared/Layout.tsx`
- `src/components/shared/Header.tsx`
- `src/components/shared/Sidebar.tsx`
- `src/components/shared/index.ts`
- `src/constants/project.ts`
- `src/styles/globals.css`
- `DESIGN_SYSTEM.md`
- `CODE_REVIEW_CONSISTENCY_INTEGRITY_FINAL.md`
