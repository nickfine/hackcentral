# HDC v2 Phase 2 Scope Freeze (Day 3)

Date: 2026-02-16  
Status: Accepted for implementation

## Purpose

Lock the Phase 2 implementation contract for:
- full 5-step creation wizard fields,
- backend payload behavior per step,
- role boundary and lifecycle transition rules.

This document is the implementation source for Day 4+ execution in `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md`.

## References

- `/Users/nickster/Downloads/HackCentral/HackDayCentral_spec_v2.md`
- `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md`
- `/Users/nickster/Downloads/HackCentral/forge-native/src/shared/types.ts`
- `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/hdcService.ts`

## Contract Decisions

1. Runtime remains Supabase-first (per ADR-001).
2. Creation contract is versioned as `wizardSchemaVersion: 2`.
3. Step 1 is the minimum required payload for server-side draft creation.
4. Step 2-5 fields are optional for create, then mutable by admins after draft creation.
5. Lifecycle transitions are explicit and server-enforced; no implicit skipping.

## Canonical Wizard Payload (v2)

```ts
type WizardStep = 1 | 2 | 3 | 4 | 5;

type SubmissionRequirement = "video_demo" | "working_prototype" | "documentation";
type ThemePreference = "system" | "light" | "dark";

interface CreateInstanceDraftInputV2 {
  parentPageId: string;
  creationRequestId: string;
  wizardSchemaVersion: 2;
  completedStep: WizardStep;
  launchMode: "draft" | "go_live";
  basicInfo: {
    eventName: string;
    eventIcon: string;
    eventTagline?: string;
    primaryAdminEmail?: string;
    coAdminEmails?: string[];
  };
  schedule?: {
    timezone?: string;
    registrationOpensAt?: string;
    registrationClosesAt?: string;
    teamFormationStartsAt?: string;
    teamFormationEndsAt?: string;
    hackingStartsAt?: string;
    submissionDeadlineAt?: string;
    votingStartsAt?: string;
    votingEndsAt?: string;
    resultsAnnounceAt?: string;
  };
  rules?: {
    minTeamSize?: number;
    maxTeamSize?: number;
    allowCrossTeamMentoring?: boolean;
    submissionRequirements?: SubmissionRequirement[];
    judgingModel?: "panel" | "popular_vote" | "hybrid";
    categories?: string[];
    prizesText?: string;
    requireDemoLink?: boolean;
  };
  branding?: {
    accentColor?: string;
    themePreference?: ThemePreference;
    bannerMessage?: string;
    bannerImageUrl?: string;
  };
}
```

## Step Contract

### Step 1 Basic Info
- Required: `basicInfo.eventName`, `basicInfo.eventIcon`.
- Validation:
  - `eventName`: required, trimmed, max 80, unique under `parentPageId` (case-insensitive).
  - `primaryAdminEmail` and `coAdminEmails`: `@adaptavist.com` only.
  - `eventTagline`: max 200.

### Step 2 Schedule
- All fields optional.
- Validation:
  - datetimes must be ISO-8601.
  - if both sides present, enforce:
    - `registrationOpensAt <= registrationClosesAt`
    - `teamFormationStartsAt <= teamFormationEndsAt`
    - `hackingStartsAt <= submissionDeadlineAt`
    - `votingStartsAt <= votingEndsAt`
  - if `launchMode=go_live`, require `hackingStartsAt` and `submissionDeadlineAt`.

### Step 3 Rules
- Validation:
  - `minTeamSize >= 1`, `maxTeamSize <= 20`, and `minTeamSize <= maxTeamSize`.
  - `submissionRequirements` values must be from enum.
  - `judgingModel` must be one of `panel|popular_vote|hybrid`.

### Step 4 Branding
- Validation:
  - `accentColor` must be valid hex when present.
  - `themePreference` must be one of `system|light|dark`.

### Step 5 Review + Launch
- `launchMode=draft` keeps lifecycle `draft`.
- `launchMode=go_live` sets lifecycle from schedule:
  - default start phase `registration` when schedule is incomplete for later phases.
  - no direct transition to `completed`/`archived`.

## Draft Save Behavior

1. Client-side continuity:
  - Persist local wizard state by parent page key (`hdc-create-wizard:<pageId>`).
2. Server-side draft:
  - `hdcCreateInstanceDraft` can be called at any step after Step 1 validity passes.
  - idempotency key remains `creationRequestId`.
3. Retry behavior:
  - same `creationRequestId` must return existing draft result if event already created.
4. Creation timeout behavior:
  - keep 15-second timeout UX and surface retry with same `creationRequestId`.

## Role Boundary Matrix (API + UI)

| Action | Primary Admin | Co-Admin | Participant |
|---|---|---|---|
| Create new instance | Yes | Yes | Yes (`@adaptavist.com`) |
| Edit event config | Yes | Yes | No |
| Add/remove co-admins | Yes | No | No |
| Transfer primary admin | Yes | No | No |
| Launch/go-live | Yes | Yes | No |
| Delete draft instance | Yes | No | No |
| Complete + sync | Yes | Yes | No |
| Retry sync | Yes | Yes | No |
| Submit hack | Yes | Yes | Yes |
| Vote (when enabled) | Yes | Yes | Yes |

## Lifecycle Transition Matrix (server-enforced)

| From | To | Allowed Actors | Guardrails |
|---|---|---|---|
| `draft` | `registration` | primary/co-admin | launch/go-live requested |
| `registration` | `team_formation` | primary/co-admin | optional schedule gate |
| `team_formation` | `hacking` | primary/co-admin | optional schedule gate |
| `hacking` | `voting` | primary/co-admin | submissions closed if configured |
| `voting` | `results` | primary/co-admin | voting complete if enabled |
| `results` | `completed` | primary/co-admin | sync status `complete` |
| `completed` | `archived` | system job/admin action | completion age >= 90 days (auto path) |

Rejected transitions:
- any backward transition,
- any skip transition across phases,
- delete when lifecycle != `draft`.

## Persistence Mapping (Supabase-first)

1. Existing fields retained:
  - `Event.hacking_starts_at`, `Event.submission_deadline_at`, `Event.lifecycle_status`.
2. Existing JSON fields retained:
  - `Event.event_rules`, `Event.event_branding`.
3. New storage (Phase 2 implementation target):
  - `Event.event_schedule` JSONB for full Step 2 shape.
4. Backward compatibility:
  - if `event_schedule` missing, derive from legacy columns.
  - continue writing legacy `hacking_starts_at` and `submission_deadline_at` for compatibility.

## Implementation Gates for Day 4/5

Before Day 4 completion:
- UI exposes all Step 2 fields and step-level validation.
- payload includes `wizardSchemaVersion`, `completedStep`, `launchMode`.
- tests cover step validation and payload shaping.

Before Day 5 completion:
- lifecycle transition API enforces matrix above.
- role restrictions for delete/transfer/admin actions enforced and tested.
- draft delete remains primary-admin-only and draft-only.
