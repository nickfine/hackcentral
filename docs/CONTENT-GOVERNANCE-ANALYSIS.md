# HackDay Ecosystem Content Governance Analysis

## Purpose

This document inventories content across the HackDay ecosystem and recommends what should remain hardcoded vs what should be admin-configurable.

Scope:

- **HackDay app** (`http://localhost:5174`) - participant-facing experience (web + Forge-hosted runtime of the same UI)
- **HackCentral Forge global UI** (`http://localhost:5175`) - organizer hub / registry surface
- **HackCentral Forge macro UI** (`http://localhost:5176`) - organizer setup wizard (source of truth for event config)

Primary goal:

- Define a practical **content governance model** that balances flexibility, UX coherence, and maintainability for recurring HackDay events.

## Method (What Was Reviewed)

- Live UI walkthrough of HackDay routes in local dev mode (`5174`)
- Live UI walkthrough of HackCentral global (`5175`) and full HackCentral macro wizard (`5176`)
- Source review of key components and shared constants in:
  - `HD26Forge/static/frontend/src/components/*`
  - `HD26Forge/static/frontend/src/App.jsx`
  - `HD26Forge/static/frontend/src/data/constants.js`
  - `HackCentral/forge-native/static/macro-frontend/src/App.tsx`
  - `HackCentral/forge-native/static/macro-frontend/src/types.ts`
  - `HackCentral/forge-native/static/frontend/src/App.tsx`
- Design system review: `HackCentral/docs/HackDay_Design_system.md`

## Important Observations / Limits

- HackDay `Schedule` page on local `5174` throws a Forge bridge error in localhost mode (it imports `@forge/bridge` directly in component code). The content inventory for Schedule is based on source and the visible error state.
- HackCentral global `HackDays` page (`5175`) shows registry/listing content, but **create wizard access is env-gated** in local preview (`CONFLUENCE_HDC_PARENT_PAGE_ID`). The full wizard walkthrough was done in the HackCentral macro UI (`5176`), which exposes the same core event setup schema.
- The HackDay app supports both local/demo data and Forge runtime data. Several pages are **hybrid** by design (hardcoded fallback + dynamic event data).

## Classification Model

- `HARDCODED`: Platform-owned copy or structure that should be consistent across events.
- `ADMIN_CONFIGURABLE`: Event organizer/admin can set or change it without code.
- `USER_GENERATED`: Created by participants/judges/captains during the event.
- `HYBRID`: Mix of hardcoded framework + admin-configurable + user data.

## Design System Principles Used in This Analysis

From `HackDay_Design_system.md` and current UI direction:

- **Teal accent discipline**: one dominant accent for primary actions and active states.
- **Action-first hierarchy**: strong page titles, clear next steps, consistent CTA treatment.
- **Consistency over novelty**: core navigation, labels, and workflow structure should be stable.
- **Audience separation (product interpretation)**:
  - HackCentral = organizer/admin configuration
  - HackDay = participant execution experience

This strongly supports a **template-first, bounded customization** approach.

## Executive Summary

### What should be configurable (high confidence)

- Event identity and branding (name, icon, tagline, accent, theme, banners)
- Event timeline and schedule (dates/times, duration, timezone, custom milestones)
- Operational settings (phase, team size limits, vote limits, MOTD/admin message)
- Some rules metadata (judging model, categories, prizes, demo-link requirement)

### What should mostly stay hardcoded (high confidence)

- Core navigation labels and page IA (Dashboard, Schedule, Rules, Submission, Voting, Results)
- Core workflow language and system states (loading, empty, error, permission states)
- Core phase taxonomy and ordering (Registration -> Team Formation -> Hacking -> ...)
- Interaction patterns and CTA vocabulary for coherence ("Open Next Step", "Save", "Back")

### What is currently hardcoded but likely should become configurable

- Rules page detailed content (allowed/not allowed examples, submission requirements copy)
- "New to HackDay?" onboarding narrative content (team size references, demo limits, steps/tips/FAQ)
- Default judge criteria labels/descriptions (Innovation/Execution/Design/Theme Adherence)
- Some award labels on Results page (at least optional override names)

## Content Inventory By Surface

---

## 1. HackCentral (Organizer) - Macro Wizard (`5176`)

This is the clearest **source-of-truth content model** for event setup.

### 1.1 Parent Page Shell / Registry

| Section | Content Examples | Classification | Rationale |
|---|---|---:|---|
| Header shell | "HackDay Central", "Parent page mode" | `HARDCODED` | Product framing, not event-specific |
| Local preview notices | "Local preview mode: resolver calls are disabled." | `HARDCODED` | Environment/system messaging |
| Registry list / empty state | "Registry", "No instances yet." | `HYBRID` | Structure hardcoded, instances dynamic |

### 1.2 Wizard Stepper (6 steps)

| Content | Classification | Rationale |
|---|---:|---|
| Step labels: Basic, Schedule, Schedule Review, Rules, Branding, Review | `HARDCODED` | Stable organizer IA and mental model |
| "Use the 6-step wizard..." explanatory copy | `HARDCODED` | Product workflow guidance |

### 1.3 Step 1 - Basic (Event Identity)

| Field / Content | Classification | Rationale |
|---|---:|---|
| Event name | `ADMIN_CONFIGURABLE` | Primary event identity shown in downstream HackDay surfaces |
| Icon (emoji) | `ADMIN_CONFIGURABLE` | Event identity/branding |
| Tagline | `ADMIN_CONFIGURABLE` | Event-specific messaging |
| Primary admin email | `ADMIN_CONFIGURABLE` | Operational ownership |
| Co-admin emails | `ADMIN_CONFIGURABLE` | Operational ownership |
| Validation text ("Event name is required", domain restrictions) | `HARDCODED` | System guardrails |

Notes:

- Domain restriction (`@adaptavist.com`) is currently product policy/system rule, not event config.

### 1.4 Step 2 - Schedule (Timeline Builder V2)

| Field / Content | Classification | Rationale |
|---|---:|---|
| Duration (1d/2d/3d) | `ADMIN_CONFIGURABLE` | Core event structure varies by event |
| Hack start date/time | `ADMIN_CONFIGURABLE` | Event-specific schedule anchor |
| Timezone | `ADMIN_CONFIGURABLE` | Event geography/participants |
| Standard milestones (enable/disable) | `ADMIN_CONFIGURABLE` | Organizers need to tailor format |
| Standard milestone offsets | `ADMIN_CONFIGURABLE` | Event timing customization |
| Standard milestone labels/descriptions (e.g., "Registration Opens", "Portal opens for sign-ups") | `HYBRID` | Good defaults should be platform-owned; advanced overrides may be optional |
| Custom events (name, signal, days offset, description) | `ADMIN_CONFIGURABLE` | Explicit organizer customization surface |
| Phase tab labels ("Pre-Event", "Hack Day 1", etc.) | `HARDCODED` | Core scheduling structure / orientation |
| Builder helper copy ("Set the milestones leading up to your hack...") | `HARDCODED` | UX guidance |

### 1.5 Step 3 - Schedule Review

| Content | Classification | Rationale |
|---|---:|---|
| Review instructions | `HARDCODED` | Workflow guidance |
| Preview layout (day columns, labels) | `HARDCODED` | UX structure |
| Preview event timeline items | `HYBRID` | Structure hardcoded; actual events admin-configured |
| Timezone label and event counts | `HYBRID` | Labels hardcoded; values configurable |

Key governance implication:

- This preview is a **content QA checkpoint**. It should remain stable and comparable across events.

### 1.6 Step 4 - Rules (Config Metadata)

| Field | Classification | Rationale |
|---|---:|---|
| Min team size / Max team size | `ADMIN_CONFIGURABLE` | Operational rule varies by event |
| Judging model | `ADMIN_CONFIGURABLE` | Event format varies |
| Allow cross-team mentoring | `ADMIN_CONFIGURABLE` | Policy varies |
| Require demo link | `ADMIN_CONFIGURABLE` | Submission policy varies |
| Categories (comma-separated) | `ADMIN_CONFIGURABLE` | Event themes/tracks vary |
| Prizes (text) | `ADMIN_CONFIGURABLE` | Event-specific incentives |

Important nuance:

- This step currently configures **rule metadata**, but not the participant-facing Rules page copy itself.

### 1.7 Step 5 - Branding

| Field | Classification | Rationale |
|---|---:|---|
| Accent colour | `ADMIN_CONFIGURABLE` | Event identity |
| Banner message | `ADMIN_CONFIGURABLE` | Event campaign/announcement message |
| Banner image URL | `ADMIN_CONFIGURABLE` | Visual branding |
| Theme (system/light/dark) | `ADMIN_CONFIGURABLE` | Event presentation preference |

Constraint recommendation:

- Keep the **design system layout and component styling** hardcoded; allow only bounded visual tokens (accent/theme/banner).

### 1.8 Step 6 - Review / Create

| Content | Classification | Rationale |
|---|---:|---|
| Summary labels ("Name", "Admin", "Timezone", etc.) | `HARDCODED` | Stable review IA |
| Summary values | `ADMIN_CONFIGURABLE` | Derived from wizard config |
| "Create as draft child page" behavior messaging | `HARDCODED` | System workflow |

---

## 2. HackCentral (Organizer) - Forge Global UI (`5175`)

This is the organizer **hub / registry shell**. It is broader than HackDay event setup.

### 2.1 Global Shell (Sidebar, Header, Search)

| Content | Classification | Rationale |
|---|---:|---|
| Top-level nav ("Home", "HackDays", "Hacks", "Projects", etc.) | `HARDCODED` | Product IA across HackCentral |
| Global search label | `HARDCODED` | Platform utility |
| Notifications/messages/profile controls | `HARDCODED` | Platform shell |

### 2.2 HackDays Page (Registry / Entry Point)

| Section | Content Examples | Classification | Rationale |
|---|---|---:|---|
| Page framing | "HackDays", "Manage HackDay events" | `HARDCODED` | Stable organizer shell |
| Create button availability | "+ Create HackDay" | `HYBRID` | CTA is hardcoded; visibility depends on environment/permissions |
| HackDay cards (name, tagline, lifecycle status, hacking starts date) | `HYBRID` | Card structure hardcoded; values are event-configurable/dynamic |
| Empty state | "No HackDays yet" | `HARDCODED` | System state |
| Env setup guidance | `CONFLUENCE_HDC_PARENT_PAGE_ID` message | `HARDCODED` | Environment/system instruction |

Governance takeaway:

- HackCentral global should remain a **consistent management shell**; most event customization belongs in the wizard and event-level admin tools.

---

## 3. HackDay (Participant-Facing) - Content Inventory (`5174`)

HackDay is the participant execution layer. Most screens are **hybrid**: stable UX frame + event config + live participant data.

### 3.1 Global App Shell (HackDay)

| Section | Content Examples | Classification | Rationale |
|---|---|---:|---|
| Header brand/logo slot | "HackDay" / Adaptavist logo in seeded instances | `HYBRID` | Layout hardcoded; logo selection varies by runtime/source |
| Countdown & phase labels | "UNTIL TEAM FORMATION BEGINS" | `HYBRID` | Phase labels hardcoded; timings dynamic |
| Primary nav tabs | Dashboard / New to HackDay? / Hack Ideas & Teams / Schedule / Rules / Admin Panel / Results | `HARDCODED` | Core participant IA should remain stable |
| Phase stepper labels | Registration -> Results | `HARDCODED` (with dynamic active state) | Core workflow taxonomy should be consistent |
| Dev mode banner | "DEVELOPMENT MODE ACTIVE..." | `HARDCODED` | Environment/system banner |

### 3.2 Dashboard

Observed live content includes:

- Hero headline and status ("Ready for Team Formation")
- "Next action" CTA
- "Your Readiness"
- "Live Activity"
- "Event Pulse"
- "Coming Up"
- Optional admin message pod (from admin messaging)

| Subsection | Classification | Rationale |
|---|---:|---|
| Dashboard shell titles ("Your Readiness", "Live Activity", "Event Pulse", "Coming Up") | `HARDCODED` | Stable dashboard IA |
| Hero headline/tagline | `HYBRID` | For HackCentral-created events, pulls `eventMeta.name/tagline`; otherwise platform mission copy |
| Next action label and CTA text ("Open Next Step") | `HYBRID` | CTA vocabulary fixed; target/action computed from phase/user state |
| Readiness statuses (Team, Submission, Profile) | `HYBRID` | Labels hardcoded; values dynamic per user/team state |
| Activity feed entries | `USER_GENERATED` (with hardcoded verbs) | User/team actions populate feed; action verbs are platform copy |
| Event Pulse metrics | `HYBRID` | Labels hardcoded; values dynamic |
| "Coming Up" milestones | `HYBRID` | Labels often event-driven via schedule/milestones; section structure hardcoded |
| Admin message pod (MOTD title/message/priority) | `ADMIN_CONFIGURABLE` | Managed in Admin Panel Messaging tab |

### 3.3 New to HackDay? (Onboarding Guide)

This page is currently heavily **hardcoded content**, despite representing event guidance.

Hardcoded content includes:

- 3-step journey narrative
- "First 30 Minutes"
- Key rules summary
- FAQ
- Hero stats (24h build window, team size 2-6, demo limit 3 min)
- Social proof content

| Subsection | Classification | Rationale |
|---|---:|---|
| Page structure and CTA patterns | `HARDCODED` | Should remain consistent |
| Onboarding narrative copy | `HARDCODED` (should become partly configurable/template-driven) | Event guidance varies by format/theme |
| Hero stats (build window/team size/demo limit) | `HARDCODED` (should become `HYBRID`) | These are event-specific rules/timings |
| FAQ answers | `HARDCODED` (some should become configurable) | Common answers differ by event policy |

Recommendation:

- Keep the page structure hardcoded, but source selected content blocks from event config templates.

### 3.4 Marketplace (Hack Ideas & Teams)

| Subsection | Classification | Rationale |
|---|---:|---|
| Page title, explanatory copy, tabs ("Ideas", "Free Agents") | `HARDCODED` | Core collaboration IA |
| Search placeholders / view mode labels | `HARDCODED` | Utility UI copy |
| Team cards (idea name, description, looking-for skills, members) | `USER_GENERATED` | Participant/captain-generated content |
| Free agent cards | `USER_GENERATED` | User profile data |
| "Create New Idea" modal labels | `HARDCODED` | Form structure should be stable |
| Idea creation inputs (name, description, looking-for skills, max team size) | `HYBRID` | User-generated values; allowed fields/options constrained by platform/admin settings |
| Max team size options | `HYBRID` | UI structure hardcoded; upper bound comes from admin/event settings |
| Empty states ("No Free Agents", "No Ideas Found") | `HARDCODED` | System feedback |

### 3.5 Team Detail Page (Idea/Team Workspace)

Observed content includes:

- Team name, join CTA, member count, vibe
- Looking for / skill coverage
- Project Goal / Problem to Solve / More Info
- Quick reactions
- Team members and join requests

| Subsection | Classification | Rationale |
|---|---:|---|
| Page layout and section labels ("PROJECT GOAL", "PROBLEM TO SOLVE", etc.) | `HARDCODED` | Stable team workspace model |
| Team name, description, problem, moreInfo | `USER_GENERATED` | Team/captain-owned content |
| Looking-for skills and max members | `HYBRID` | Team-generated, constrained by platform/admin max rules |
| Team vibe options | `HARDCODED` (enum) + `USER_GENERATED` (selection) | Keep finite set for consistency |
| Reaction labels ("Love this idea", etc.) | `HARDCODED` | Consistent social affordances |
| Reaction counts | `USER_GENERATED` | Participant interactions |
| Join request message | `USER_GENERATED` | Participant-authored |
| Placeholder helper text | `HARDCODED` | UX guidance |

### 3.6 Schedule Page

Important architecture note:

- This page is **hybrid with a hardcoded fallback**.
- It prefers backend milestones (`invoke('getSchedule')`) when available.
- If no milestones exist, it falls back to `SCHEDULE_DATA` in code.

| Subsection | Classification | Rationale |
|---|---:|---|
| Page framing ("Event Schedule", "Schedule") | `HARDCODED` | Stable IA |
| Schedule column layout (Pre-Event / Day N) | `HARDCODED` | Stable visualization pattern |
| Milestone titles/descriptions/times from backend | `ADMIN_CONFIGURABLE` (originating in HackCentral config -> milestone generation) | These should reflect the event setup |
| Custom event signals/colors | `HYBRID` | Signal selection configurable; visual mapping should stay platform-owned |
| Hardcoded fallback `SCHEDULE_DATA` (teams webinar, lunch breaks, etc.) | `HARDCODED` (should be dev-only fallback) | Not appropriate as production content for created events |
| Timezone localization labels | `HYBRID` | Labels hardcoded; localized values dynamic |

### 3.7 Rules Page

Currently almost entirely hardcoded:

- General Rules cards
- Allowed / Not Allowed lists and examples
- Pro Tips list
- Team size and submission/judging wording

| Subsection | Classification | Rationale |
|---|---:|---|
| Page structure and visual pattern | `HARDCODED` | Keep consistent |
| Rule copy and examples | `HARDCODED` (should become `HYBRID`) | Event policies frequently vary |
| Team size / submission / judging text | `HARDCODED` (should reflect event config) | Conflicts with admin-configurable values if not synced |

High-priority governance gap:

- HackCentral captures rule metadata (team sizes, judging model, demo requirement), but the participant Rules page still displays mostly static copy.

### 3.8 Submission Page

| Subsection | Classification | Rationale |
|---|---:|---|
| Page gating messages ("Submissions open during the hack", "No Team Yet") | `HARDCODED` | System workflow feedback |
| Submission workflow labels / buttons ("Save Draft", "Submit Project") | `HARDCODED` | Core UX consistency |
| Submission fields (Project Name, Description, Demo Video URL, Repo URL, Live Demo URL) | `HYBRID` | Structure hardcoded; values user-generated |
| Field required/optional flags | `HYBRID` | Some requirements should come from event config (`requireDemoLink`, submission requirements) |
| Validation/error copy (URL validation, save failures) | `HARDCODED` | System feedback |
| Team name shown in header | `USER_GENERATED` | Team-owned |

Potential future configurability:

- Optional/required submission fields per event (beyond demo link)
- Additional custom fields (only if needed; avoid over-flexibility)

### 3.9 Voting Page (People's Choice)

| Subsection | Classification | Rationale |
|---|---:|---|
| Page framing and vote CTA copy | `HARDCODED` | Consistent experience |
| Max votes limit display | `HYBRID` | Label hardcoded; value admin-configurable (`maxVotesPerUser`) |
| Submitted project cards | `USER_GENERATED` | Team submission data |
| Voting availability warning | `HYBRID` | Copy hardcoded; state driven by event phase |
| Vote button state text ("Vote for this project", "Voted!", "Saving...") | `HARDCODED` | Core interaction language |

### 3.10 Judge Scoring Page

| Subsection | Classification | Rationale |
|---|---:|---|
| Page framing / progress UI | `HARDCODED` | Stable judge workflow |
| Judge criteria labels/descriptions | `HARDCODED` (should become configurable or template-selectable) | Events may use different scoring dimensions |
| Score ranges (0-10) | `HARDCODED` (likely should stay default) | Simplicity/consistency unless a compelling need emerges |
| Judge comments | `USER_GENERATED` | Judge-authored content |
| Project content (submission description/links) | `USER_GENERATED` | Team submissions |
| Permission messaging ("Judges Only") | `HARDCODED` | System access feedback |

### 3.11 Results Page

| Subsection | Classification | Rationale |
|---|---:|---|
| Page framing ("And the Winners Are...") | `HARDCODED` | Consistent reveal experience |
| Award taxonomy (Grand Prize Winner, Runner Up, Third Place, People's Choice) | `HARDCODED` (with optional overrides) | Good default structure, but some events may need custom awards |
| Winner assignments | `HYBRID` | Labels hardcoded; winners dynamic |
| Winner/project content | `USER_GENERATED` | Submission/team content |
| Results phase gating / empty state | `HARDCODED` | System feedback |

### 3.12 Signup Wizard (Participant Onboarding)

| Subsection | Classification | Rationale |
|---|---:|---|
| 3-step structure (Identity / Skills / Participation) | `HARDCODED` | Core participant onboarding flow |
| Labels, placeholders, helper text | `HARDCODED` | UX consistency |
| Skill options list | `HARDCODED` (platform taxonomy) | Useful shared vocabulary; allow custom skill entry for flexibility |
| Selected skills / names / callsigns | `USER_GENERATED` | Participant-owned profile data |
| Validation rules/messages | `HARDCODED` | Platform guardrails |

### 3.13 Profile Page

| Subsection | Classification | Rationale |
|---|---:|---|
| Page structure / labels ("Your Profile", "About Me", "Skills", "Your Team") | `HARDCODED` | Stable participant profile IA |
| User name, callsign, bio, skills | `USER_GENERATED` | Participant-owned content |
| Team membership status badges | `HYBRID` | Labels hardcoded; values dynamic |
| Role badge label | `HYBRID` | Role taxonomy hardcoded; assignment admin-controlled |

### 3.14 Admin Panel (HackDay Event Ops)

This is the **event instance operations** surface after creation.

#### Overview Tab

| Content | Classification | Rationale |
|---|---:|---|
| Overview structure / labels | `HARDCODED` | Stable admin dashboard IA |
| Current phase, submission progress, voting stats | `HYBRID` | Labels hardcoded; values dynamic |
| Operator action guidance copy | `HARDCODED` | Platform coaching for admins |

#### Branding Tab

| Field | Classification | Rationale |
|---|---:|---|
| Accent color, banner image URL, theme, banner message | `ADMIN_CONFIGURABLE` | Event-specific visual identity |
| Save restrictions text ("creator/co-admin only") | `HARDCODED` | Permission/system messaging |

#### Messaging Tab

| Field | Classification | Rationale |
|---|---:|---|
| Message Title | `ADMIN_CONFIGURABLE` | Event communication |
| Priority (Info/Warning/Urgent) | `ADMIN_CONFIGURABLE` (bounded enum) | Operational messaging |
| Message of the Day body | `ADMIN_CONFIGURABLE` | Event communication |
| Character count / helper copy | `HARDCODED` | UX guardrails |

#### Settings Tab

| Field | Classification | Rationale |
|---|---:|---|
| Max Team Size | `ADMIN_CONFIGURABLE` | Event operation setting |
| Max Votes per User | `ADMIN_CONFIGURABLE` | Event voting rule |
| Danger zone/reset controls | `HARDCODED` | System operations, not event content |

#### Phases Tab

| Content | Classification | Rationale |
|---|---:|---|
| Phase labels and descriptions | `HARDCODED` | Core workflow coherence |
| Current phase selection/state | `ADMIN_CONFIGURABLE` | Runtime operation |
| Warning copy about affecting participants | `HARDCODED` | System guidance |

#### Users Tab

| Content | Classification | Rationale |
|---|---:|---|
| User management table labels | `HARDCODED` | Admin UX structure |
| User names/emails | `USER_GENERATED` / directory-derived | User identity data |
| Role assignments | `ADMIN_CONFIGURABLE` (bounded enum) | Event governance |

#### Idea Summary / Analytics Tabs

| Content | Classification | Rationale |
|---|---:|---|
| Table/report layout and metric labels | `HARDCODED` | Stable analysis surfaces |
| Idea viability status toggles | `ADMIN_CONFIGURABLE` | Organizer operational judgment |
| Telemetry values and trends | `HYBRID` | Labels hardcoded; values dynamic |

---

## 4. Cross-App Mapping: What HackCentral Configures vs What HackDay Shows

### 4.1 Clear Mappings (Good)

| HackCentral Config | HackDay Surface |
|---|---|
| `basicInfo.eventName` / `eventTagline` | Dashboard hero title/subtitle (for HackCentral-created instances) |
| `branding.accentColor`, `bannerMessage`, `themePreference`, `bannerImageUrl` | HackDay branding/Admin Panel Branding |
| `schedule` + custom events | Schedule milestones / Schedule Review preview / child schedule (via milestone generation) |
| `rules.maxTeamSize`, `rules.judgingModel`, `rules.requireDemoLink`, etc. | Admin operations + some workflow constraints |

### 4.2 Weak / Missing Mappings (Governance Gaps)

| HackCentral Config | Current HackDay Behavior | Issue |
|---|---|---|
| Rules config (team sizes, judging model, demo requirement) | Participant Rules page mostly hardcoded | Risk of mismatch / trust erosion |
| Event-specific onboarding guidance | "New to HackDay?" page mostly hardcoded | Cannot adapt for different formats |
| Judging model / criteria expectations | Judge page criteria defaults hardcoded | May not match event policy |
| Prize/category text from wizard | Results/rules/onboarding do not consistently surface | Important context is trapped in admin setup |

## 5. Pattern Findings

### 5.1 What varies between hackathon events (high variability)

- Event identity: name, icon, tagline
- Timing and format: duration, timezone, milestone schedule, custom events
- Operational rules: team sizes, judging model, vote limits
- Branding: accent, theme, banner message/image
- Messaging: announcements, urgent notices, participant guidance
- Tracks/categories and prizes

### 5.2 What supports the core workflow (should stay consistent)

- Page IA and navigation
- Phase model and order
- Core task verbs (Join, Submit, Vote, Save, Back, Open)
- Core form layout patterns and validation behavior
- Empty/error/loading patterns
- Dashboard section architecture (readiness/activity/pulse/coming up)

### 5.3 Where admins most likely want control

Highest demand (expected often):

- Schedule and custom events
- Team size/vote settings
- MOTD / participant announcements
- Event branding (banner, accent, theme)
- Prize text and categories

Medium demand (some events only):

- Rules detail copy / allowed tools policy
- Onboarding FAQ and newcomer guidance
- Judging criteria labels/weights/descriptions
- Award labels beyond standard defaults

Low demand (should probably stay fixed):

- Navigation labels
- Core system messaging
- Phase order / workflow terminology

### 5.4 What should remain consistent for UX coherence

To respect the design system and reduce admin burden:

- Teal-led action hierarchy and component patterns
- Core page names and route mental model
- Primary CTA vocabulary and placements
- Validation/error patterns
- Participant flow sequence (Signup -> Teaming -> Build -> Submit -> Vote/Results)

## 6. Ambiguous / UX Decision Areas

These require product decisions before implementation.

### 6.1 Rules page: full custom vs structured policy modules

Ambiguity:

- Should admins rewrite the full Rules page, or only fill structured sections?

Recommendation:

- **Do not** allow full freeform replacement of the Rules page.
- Provide **structured modules** with defaults + optional overrides:
  - Team size rule
  - Submission requirements
  - Judging criteria summary
  - Allowed / not allowed policy additions
  - Code of conduct link/reference

### 6.2 New to HackDay page: generic coaching vs event-specific onboarding

Ambiguity:

- Some onboarding guidance is universal, some is event-specific.

Recommendation:

- Keep the **page structure and most coaching** fixed.
- Allow a small set of event-specific injected values/content blocks:
  - Team size
  - Build window
  - Demo length
  - 3-5 FAQ overrides
  - Optional "special instructions" callout

### 6.3 Judge criteria configuration depth

Ambiguity:

- Do admins need custom criteria, weights, and scoring ranges?

Recommendation:

- Start with **template presets + minor edits**:
  - Default criteria set
  - Optional rename / description edits
  - Optional weights (advanced mode)
- Avoid custom scoring scales initially.

### 6.4 Results awards

Ambiguity:

- Some events have non-standard awards.

Recommendation:

- Keep standard awards as default
- Allow optional additional/renamed awards in a bounded model
- Preserve a stable default reveal layout

## 7. Recommended Content Governance Model

## 7.1 Four-Layer Model

### Layer A: Platform Core (Hardcoded)

Owner: Product/design/engineering

Includes:

- Navigation and page architecture
- Core workflow/phase taxonomy
- System messages, validation, error states
- Interaction labels and patterns
- Design system tokens/layout rules

Change cadence:

- Infrequent, versioned product releases

### Layer B: Event Template Configuration (Admin-Configurable)

Owner: Event organizers (technical product people)

Includes:

- Event identity/branding
- Schedule and custom milestones
- Operational rules/settings
- Categories/prizes
- Participant messaging
- Selected content overrides (rules/onboarding/judging criteria)

Change cadence:

- Per event / per run

### Layer C: Event Instance Operations (Admin-Configurable Runtime)

Owner: Event admins during live event

Includes:

- Current phase
- MOTD/bulletins
- User roles
- Viability/curation actions
- Branding tweaks (if allowed live)
- Max team size / vote settings (with guardrails)

Change cadence:

- Frequent during event

### Layer D: Participant & Judge Content (User-Generated)

Owner: Participants, team captains, judges

Includes:

- Profiles, skills, bios
- Team ideas, goals, problem statements, updates
- Join requests and reactions
- Submissions and links
- Judge comments and scores
- Votes

## 7.2 Governance Rules (Practical)

1. Core IA and workflow labels remain platform-owned.
2. Event admins can customize **content**, not **layout**.
3. Use bounded enums/presets instead of free text where possible.
4. Every admin-editable field should have:
   - default value
   - preview
   - validation
   - clear effect scope ("this changes Dashboard only", etc.)
5. Runtime changes that affect all participants (phase, messaging, vote limits) need warnings.

## 8. Suggested Admin Configuration UI Requirements

Designed for technical product people (not developers).

### 8.1 Required UX capabilities

- **Template-first wizard** with sane defaults (already present in HackCentral)
- **Live preview** for:
  - schedule
  - branding
  - participant-facing message blocks
- **Impact labels** on each setting:
  - "Affects Dashboard hero"
  - "Affects Rules page"
  - "Affects Submission form"
- **Validation + policy hints**:
  - email domain restrictions
  - character limits
  - URL checks
  - rule conflicts (e.g., min > max team size)
- **Draft vs publish** controls
- **Reset to default** per section

### 8.2 Suggested configuration sections (future-state)

In HackCentral (pre-event):

- Event Identity
- Schedule
- Rules & Submission Policy
- Judging Model & Criteria
- Branding
- Participant Guidance (Onboarding/FAQ)
- Prizes & Categories
- Review / Publish

In HackDay Admin Panel (runtime):

- Phase control
- Participant messaging
- Roles/users
- Live settings (team size/vote cap)
- Branding hotfixes (optional, permission-gated)

### 8.3 Advanced Mode (optional)

For recurring event operators only:

- Custom judging criteria
- Additional award categories
- Rules page module overrides
- Onboarding FAQ overrides

Keep hidden behind an "Advanced event customization" toggle.

## 9. Template vs Full-Custom Strategy (Recommendation)

## Recommended approach: **Template + bounded overrides**

Why:

- Matches design system coherence
- Supports recurring events without UI drift
- Reduces admin error risk
- Keeps engineering surface manageable

### Do not use a fully custom content model for participant pages

Avoid:

- Freeform page builders for Dashboard/Rules/Submission/Voting/Results
- Arbitrary component reordering
- Custom CSS per event

### Use structured modules with optional overrides

Good pattern:

- Hardcoded layout
- Default copy blocks
- Configurable values + optional text overrides in specific zones

Examples:

- Dashboard hero: configurable title/tagline/banner message
- Rules page: configurable policy modules + examples
- Judge page: default criteria template with optional edits
- Onboarding page: default narrative with event-specific fact values + FAQ overrides

## 10. Specific Recommendations: What to Change Next

### 10.1 High Priority (content trust / consistency)

1. **Bind HackDay Rules page to event config**
   - Reflect `minTeamSize`, `maxTeamSize`, judging model, demo requirements
   - Keep page layout fixed, inject values and optional policy modules

2. **Promote judge criteria to configurable template data**
   - Start with defaults
   - Allow optional label/description edits in HackCentral

3. **Replace production-facing schedule fallback content**
   - Keep `SCHEDULE_DATA` as dev fallback only
   - Ensure seeded/created events always render milestone-driven schedule content

### 10.2 Medium Priority (event customization value)

1. **Make "New to HackDay?" partially configurable**
   - Team size, demo limit, build window, FAQ overrides, special instructions

2. **Expose categories/prizes on participant-facing surfaces**
   - Rules, dashboard, results, or a dedicated event info block

3. **Optional award label overrides**
   - Preserve default award layout, allow custom names

### 10.3 Low Priority (keep hardcoded unless requested)

1. Nav labels and route structure
2. Core CTA wording and system messages
3. Phase taxonomy/order
4. Base visual composition / design system enforcement

## 11. Proposed Ownership Matrix

| Content Type | Owner | Edit Surface | Governance Level |
|---|---|---|---|
| Core UI labels / IA | Product + Eng | Code | Strict |
| Design system / styling rules | Design + Eng | Code | Strict |
| Event config (identity/schedule/rules/branding) | Event Organizer | HackCentral Wizard | Controlled |
| Runtime operations (phase, MOTD, roles) | Event Admin | HackDay Admin Panel | Controlled |
| Team ideas / submissions / profiles | Participants / Captains / Judges | HackDay | Open (within validation) |

## 12. Final Product-Level Position

The current ecosystem already has the right architectural split:

- **HackCentral** is the right place for pre-event setup and source-of-truth configuration.
- **HackDay** is the right place for participant workflow and live event operations.

The main improvement opportunity is **content alignment**, not architecture:

- More participant-facing content (Rules, onboarding, judging criteria) should be driven by the same event configuration model already established in HackCentral.
- Core workflow language and layout should remain hardcoded for usability and brand consistency.

That gives you:

- flexibility where event formats differ
- consistency where users need familiarity
- a maintainable product surface for recurring events

