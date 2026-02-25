# LEARNINGS.md - HackCentral Session Notes

**Last Updated:** February 25, 2026

## Project Overview

**HackCentral** is an AI Maturity Accelerator platform that creates HackDay template instances via wizard, which HD26Forge then renders on Confluence.

**Shared Backend:** Both HackCentral and HD26Forge use `https://ssafugtobsqxmqtphwch.supabase.co`

## Critical Relationship with HD26Forge

When users create a HackDay in HackCentral:
1. Wizard collects: eventName, eventTagline, schedule, rules, branding
2. Creates `HackdayTemplateSeed` record in Supabase with `seed_payload`
3. HD26Forge macro detects seed → creates Event record
4. HD26Forge renders with Adaptavist logo + custom name/tagline from wizard

**Important:** Changes to HackCentral wizard affect how HD26Forge displays created HackDays.

## Current Project State

**Version:** 0.3.1 (forge-native)
**Tech Stack:** React 19 + TypeScript + Vite + Convex + Forge Native

**Deployment:**
- Frontend: Vite dev server (localhost:5173)
- Backend: Convex
- Confluence: Forge app on hackdaytemp.atlassian.net

## Key Concepts

### HackDay Template Wizard Flow
```
User fills wizard
  ↓
Stores HackdayTemplateSeed in Supabase (seed_payload)
  ↓
HD26Forge macro loads on Confluence page
  ↓
Detects seed → Creates Event in Supabase
  ↓
Renders HackDay with custom branding/messaging
```

### Shared Data Structure

**HackdayTemplateSeed Table** (Supabase):
- `confluence_page_id` - Links to child page
- `seed_payload` - Complete wizard data (basicInfo, schedule, rules, branding)
- `hackday_event_id` - Created Event ID
- `provision_status` - 'provisioned', 'initialized', 'failed'

**Seed Payload Structure:**
```javascript
{
  basicInfo: {
    eventName: string,
    eventIcon?: string,
    eventTagline?: string,
    primaryAdminEmail?: string,
    coAdminEmails?: string[],
  },
  schedule: { /* dates and times */ },
  rules: {
    minTeamSize?: number,
    maxTeamSize?: number,
    // other constraints
  },
  branding: {
    bannerMessage?: string,
    accentColor?: string,
    bannerImageUrl?: string,
  },
  launchMode?: "draft" | "go_live"
}
```

## Development Notes

### Frontend Architecture
- React components in `src/components/` (shared, ui, dashboard, library, people, projects)
- Custom hooks in `src/hooks/`
- Utilities and design system in `src/lib/`
- Design tokens system in `src/lib/design-system.ts`

### Backend (Convex)
- Database schema in `convex/schema.ts`
- Mutations/queries in `convex/` files (profiles.ts, hackdays.ts, etc.)
- Forge bridge in `convex/forgeBridge.ts` for Confluence integration

### Design System
Follow patterns in DESIGN_SYSTEM.md:
- Shared components: SectionHeader, ModalWrapper, SkeletonGrid
- Page patterns and layouts
- Design tokens for consistency

### Testing
- Framework: Vitest + React Testing Library
- Run: `npm test`
- Coverage: `npm run test:coverage`

## Deployment

### Convex Backend
```bash
npm run convex:deploy  # Deploy to production
```

### Confluence App (Forge Native)
```bash
cd forge-native
npm run custom-ui:build
forge deploy -e production --non-interactive
forge install -e production --upgrade --non-interactive \
  --site hackdaytemp.atlassian.net --product confluence
```

See DEPLOY.md for exact copy-paste steps.

## Known Issues & TODOs

- None identified in recent work
- Refer to learnings.md for specific feature/component notes

## Next Session Quick Start

1. Type: `Read .claude/instructions.md`
2. I'll load context and ask what to work on
3. Expect a model recommendation (Haiku for implementation, Sonnet for analysis)

## Important Files to Know

| File | Purpose |
|------|---------|
| `DESIGN_SYSTEM.md` | UI components and patterns |
| `learnings.md` | HD26Forge-specific continuity notes |
| `.claude/instructions.md` | Session onboarding and quick reference |
| `convex/schema.ts` | Database schema |
| `convex/hackdays.ts` | HackDay creation wizard logic |
| `forge-native/CONTINUATION_HANDOFF.md` | Forge integration notes |
| `forge-native/src/backend/hdcService.ts` | Backend: normalizeEventSchedule, createMilestonesFromSchedule |
| HD26Forge `static/frontend/src/components/Schedule.jsx` | Schedule page rendering and milestone grouping |

## Schedule Builder V2 & Milestone System (Feb 25, 2026)

### Data Flow: Wizard → Backend → HD26Forge Schedule Page

```
Schedule Builder V2 (frontend)
  ↓ generates ScheduleBuilderOutput with timestamps
hdcCreateInstanceDraft (backend)
  ↓ calls normalizeEventSchedule() to extract fields
  ↓ calls createMilestonesFromSchedule() to create Milestone records
Supabase Milestone table
  ↓ HD26Forge reads milestones via getSchedule resolver
HD26Forge Schedule.jsx renders milestones
```

### Key Backend Functions (hdcService.ts)

**`normalizeEventSchedule(input)`** - Extracts schedule fields from wizard output:
- Must include ALL fields the frontend sends (openingCeremonyAt, presentationsAt, judgingStartsAt, etc.)
- Missing fields here = milestones won't be created = won't show on Schedule page
- Now includes `duration` field for multi-day event support

**`createMilestonesFromSchedule(eventId, schedule)`** - Creates Milestone records:
- Pre-event: registrationOpensAt, teamFormationStartsAt, registrationClosesAt
- Hack day: openingCeremonyAt, hackingStartsAt, submissionDeadlineAt, presentationsAt, judgingStartsAt, resultsAnnounceAt
- Multi-day: Creates "Day N - Hacking Continues" for intermediate days when duration > 1

### HD26Forge Schedule Display (static/frontend/src/components/Schedule.jsx)

**Milestone Grouping Logic:**
- Pre-event phases (REGISTRATION, TEAM_FORMATION) → grouped into single "Pre-Event" column
- Hack day phases (HACKING, SUBMISSION, JUDGING, RESULTS) → grouped by date into "Day 1", "Day 2", etc.

**Bug Fixed:** Original code grouped ALL milestones by date, showing pre-event milestones as separate day columns.

### Multi-Day Event Handling

For 3-day events:
- Day 1: Opening Ceremony, Hacking Begins
- Day 2: "Day 2 - Hacking Continues" (auto-generated when duration=3)
- Day 3: Code Freeze, Presentations, Judging, Results

The `duration` field in EventSchedule enables this - without it, intermediate days have no milestones.

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Missing events on Schedule page | `normalizeEventSchedule` not including field | Add field to normalizeEventSchedule return |
| Pre-events shown as separate day columns | HD26Forge grouping by date instead of phase | Group by phase in Schedule.jsx |
| Missing Day 2 on 3-day events | No milestones for intermediate days | Add duration field + generate intermediate milestones |

## Critical Reminders

**Shared Backend Impact:**
- Changes to HackdayTemplateSeed affect HD26Forge rendering
- Supabase migrations affect both projects
- Test created HackDay rendering in HD26Forge when modifying seeds

**Design Consistency:**
- Always use components from DESIGN_SYSTEM.md
- Follow Tailwind CSS 4 patterns
- Keep UI consistent with existing pages

**Wizard Data Flow:**
- seed_payload values become Event display values in HD26Forge
- eventName → dashboard hero title (if useAdaptavistLogo)
- eventTagline → dashboard hero subtitle (if useAdaptavistLogo)

---

**Next time:** Read instructions.md to get oriented, then tell me what you'd like to work on!
