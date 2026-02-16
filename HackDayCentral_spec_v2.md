# HackDay Central: Multi-Tenant Architecture Specification

*Version 2.0 - February 2026*

*The Adaptavist Group - Internal Product Specification*

*Author: Dr Nick Fine*

---

## Executive Summary

HackDay Central (HDC) will evolve from a single-instance hackathon management system into a multi-tenant platform serving as the central hub and template factory for hackathon events across The Adaptavist Group. This specification defines the architecture, data models, user flows, error handling and technical implementation for creating on-demand HackDay instances while maintaining a unified library and cross-event analytics.

This version (2.0) incorporates structural improvements including a consolidated creation wizard, explicit permission tiers, data sync failure handling, page property size management and comprehensive error state definitions.

---

## 1. Architecture Overview

### 1.1 Confluence Macro Strategy

**Confirmed approach:** Single Macro, Multiple Pages

- HackDay Central = Parent Confluence page with HDC macro
- Each HackDay instance = Child page under HDC with HackDay macro instance
- Confluence page hierarchy provides natural navigation and organisation
- Native Confluence permissions supplement app-level access control

### 1.2 Page Hierarchy Structure

| Level | Page Structure |
|-------|---------------|
| Parent | HackDay Central (single page with HDC macro) |
| Children | Annual HackDay 2026 (child page with HackDay macro) |
| | Q2 Innovation Sprint (child page with HackDay macro) |
| | Engineering Team HackDay (child page with HackDay macro) |

### 1.3 Permission Model

The permission model defines three distinct roles with explicit capability boundaries.

#### 1.3.1 Instance Creation Rights

- Any user authenticated with @adaptavist.com email domain can create new HackDay instances
- Creator automatically becomes the primary admin for that instance

#### 1.3.2 Role Definitions

| Role | Capabilities | Restrictions |
|------|-------------|-------------|
| Primary Admin | Full event configuration, schedule changes, branding, marking events complete, adding/removing co-admins, deleting draft instances, triggering data sync | Cannot be removed except by transferring primary admin role to another user |
| Co-Admin | Full event configuration, schedule changes, branding, managing participants | Cannot transfer primary admin role, cannot delete the instance, cannot add other co-admins |
| Participant | View event details, register, join teams, submit hacks, vote (when enabled) | No access to admin settings, schedule configuration or branding |

#### 1.3.3 Admin Transfer

- If a primary admin account is deactivated in the company directory, primary admin role automatically transfers to the first co-admin (by date added)
- If no co-admins exist, the instance enters an orphaned state visible in HDC admin dashboard for manual reassignment
- Primary admin can manually transfer their role to any co-admin via instance settings

#### 1.3.4 Participant Access

- All @adaptavist.com users can view and participate in any HackDay instance
- Instance admins control event-specific settings (team formation rules, submission requirements)
- Future consideration: department-restricted instances or invite-only events

---

## 2. Instance Creation Flow

The creation and setup process uses a single consolidated wizard to reduce context-switching and minimise drop-off risk. Users can save progress and return at any point.

### 2.1 Consolidated Creation Wizard

Triggered from HDC dashboard via prominent [Create New HackDay] button. All steps are part of a single progressive flow with [Save as Draft] available at every step.

#### Step 1: Basic Information

| Field | Description | Validation |
|-------|------------|------------|
| Event Name | Required. E.g. 'Winter 2026 Innovation Sprint' | Must be unique across all instances (case-insensitive). Max 80 characters |
| Primary Admin | Pre-filled with creator's email. Can be changed to another @adaptavist.com user | Must be a valid @adaptavist.com email |
| Co-Admins | Optional. Email autocomplete from @adaptavist.com directory | Each must be a valid @adaptavist.com email |
| Event Icon | Emoji picker or icon selector. Used in HDC cards and app switcher | Required. Default provided |
| Event Tagline | Optional mission statement or description | Max 200 characters |

#### Step 2: Schedule Configuration

All date/time fields default to Europe/London timezone. Timezone can be changed via dropdown.

| Field | Description |
|-------|------------|
| Registration opens | Date/time when participants can begin registering |
| Registration closes | Date/time when registration ends |
| Team formation window | Date/time range for team assembly |
| Hacking period start | Date/time when building begins |
| Submission deadline | Date/time for final submissions |
| Voting period | Start and end dates for voting |
| Results announcement | Date/time for results reveal |

All schedule fields are optional at creation. Events without dates remain in draft status until at least the hacking period and submission deadline are set.

#### Step 3: Rules and Settings

- Team size limits (min/max members per team)
- Submission requirements (video demo, working prototype, documentation - multi-select)
- Voting system: Peer Voting / Panel Judging / Hybrid
- Categories/tracks (optional: Innovation, Technical Excellence, Business Impact, etc.)
- Prizes/recognition structure (optional free text)

#### Step 4: Branding

- Primary theme colour (hex picker, defaults to Adaptavist teal #00827F)
- Event icon (confirmed from Step 1)
- Light/dark mode preference (optional override, defaults to system preference)

#### Step 5: Review and Launch

Summary preview of all configuration. Two launch options:

- **Save as Draft:** instance visible to admins only, configuration can be continued later
- **Go Live:** instance becomes visible to all @adaptavist.com users, registration opens according to schedule

### 2.2 Backend Actions on Instance Creation

When the user confirms creation at any step (draft or live), the following backend sequence executes:

1. Create new Confluence child page under HDC parent
2. Deploy HackDay macro instance to new page
3. Initialise instance data structure in Confluence page properties
4. Register instance in HDC registry (for app switcher and library)
5. Redirect admin to the newly created instance page

### 2.3 Error Handling: Instance Creation

| Error Condition | UI Behaviour | Recovery |
|----------------|-------------|----------|
| Duplicate event name | Inline validation on name field, red border with message | User must choose a different name |
| Confluence API failure (page creation) | Modal error: 'Could not create the HackDay page. Your configuration has been saved.' | Retry button in modal. Configuration persisted client-side |
| Network timeout during creation | Loading spinner with 15-second timeout, then error state | Retry button. Idempotency check prevents duplicate pages |
| Invalid admin email | Inline validation on email field | User corrects the email address |

---

## 3. Data Architecture

### 3.1 Storage Strategy

All data stored in Confluence page properties (structured key-value storage). Each HackDay instance maintains its own local data with selective sync to HDC.

#### 3.1.1 HackDay Central Page Properties

| Key | Description | Size Management |
|-----|------------|----------------|
| hdc.registry | Array of instance metadata (ID, name, type, status, dates, admin, icon) | Lightweight metadata only. No hack content stored here |
| hdc.library | Aggregated completed hacks from all instances | Sharded by year: hdc.library.2025, hdc.library.2026 etc. Each shard limited to 30KB |
| hdc.featured | Curated featured hack IDs (for dashboard display) | IDs only, max 20 entries |

#### 3.1.2 HackDay Instance Page Properties

| Key | Description | Size Management |
|-----|------------|----------------|
| hd.config | Event configuration (name, dates, rules, branding, schedule). Includes changelog array for audit trail | Single object, typically under 5KB |
| hd.participants | User registrations and profiles for this event | Sharded if >50 participants: hd.participants.1, hd.participants.2 etc. |
| hd.teams | Team compositions and metadata | Single key, typically under 10KB |
| hd.hacks | Submitted hacks (title, description, team, assets, voting data) | Sharded by batch: hd.hacks.1, hd.hacks.2 etc. Max 15 hacks per shard (~30KB each) |
| hd.status | Current phase (draft, registration, team-formation, hacking, voting, results, completed) | Single string value |
| hd.bulletin | Team Up bulletin board posts (help requests, mentor offers) | Rolling window: posts older than 30 days auto-archived |
| hd.changelog | Array of admin actions with timestamp and actor | Most recent 100 entries retained |

#### 3.1.3 Page Property Size Strategy

Confluence page properties have a practical limit of approximately 32KB per key. The following strategy prevents hitting this ceiling:

- Sharding: keys that grow with usage (hacks, participants, library) are split into numbered shards
- Each shard targets a maximum of 30KB to leave headroom
- A manifest key (e.g. hd.hacks.manifest) tracks shard count and last-written shard
- Read operations iterate through shards; write operations append to the current shard or create a new one
- Monitoring: HDC admin dashboard displays storage utilisation per instance with warning thresholds at 25KB per key

#### 3.1.4 User Profiles: Derived Approach

Rather than maintaining a separate hdc.users store (which creates cross-cutting consistency issues), user participation history is derived at query time by scanning hd.participants across child pages. This avoids the need for a manually-synced user database.

- Cross-event reputation and badges are computed on demand from completed instance data
- Results are cached client-side for the duration of the user session
- If performance degrades with many instances, a denormalised hdc.users cache can be introduced post-MVP as an optimisation layer rather than a source of truth

### 3.2 Data Sync Flow

#### 3.2.1 Instance to HDC (Push on Event Completion)

When admin marks an event as complete, the following sync process executes:

1. Admin triggers sync via [Complete Event] button in instance admin panel
2. System validates all required data is present (at least one submitted hack, voting complete if applicable)
3. Sync begins: each hack is pushed to hdc.library with source instance ID
4. Instance status updated in hdc.registry to 'completed'
5. Instance enters read-only mode (no further edits to hacks, teams or voting)

#### 3.2.2 Sync Failure Handling

| Failure Scenario | System Behaviour | Admin Action |
|-----------------|-----------------|-------------|
| Partial sync (some hacks pushed, then error) | Sync status set to 'partial'. Event NOT marked as complete. Successfully pushed hacks are retained in library | Admin can retry sync. Retry is idempotent - already-pushed hacks are skipped |
| Network failure during sync | Sync status set to 'failed'. Error message displayed with timestamp | Retry button available. No data loss - source data remains in instance |
| Page property write failure (size limit) | Specific error identifying which key exceeded limits. Sync paused | Admin notified to contact platform team. Manual intervention to archive or shard data |

A sync status indicator is visible in both the instance admin panel and HDC registry, showing one of: not started, in progress, partial, failed, complete.

#### 3.2.3 HDC to Instance (Pull on User Entry)

- When user first accesses an instance, their cross-event reputation/badges are computed from HDC data
- Results cached client-side with 24-hour TTL
- Users can browse HDC library for inspiration (view-only access to previous hacks)

### 3.3 Configuration Audit Trail

All admin changes to event configuration are logged in hd.changelog with the following structure:

| Field | Description |
|-------|------------|
| timestamp | ISO 8601 datetime of the change |
| actor | Email of the admin who made the change |
| action | Type of change (e.g. 'schedule_updated', 'rule_changed', 'status_changed') |
| previous_value | JSON representation of the previous value |
| new_value | JSON representation of the new value |

The changelog retains the most recent 100 entries. Older entries are discarded on write. This provides sufficient audit history for dispute resolution without unbounded growth.

---

## 4. App Switcher Component

Persistent header component visible in both HDC and all HackDay instances, providing seamless navigation between active events.

### 4.1 UI Design

**Location:** Top-right corner of macro header, adjacent to user profile avatar

**Default state:** Compact button showing current location icon/emoji

**Expanded state:** Dropdown menu with categorised instance list

### 4.2 Dropdown Structure

| Section | Contents |
|---------|---------|
| Home | HackDay Central (always top item, navigates to parent page) |
| Live Events | Events currently in hacking/voting phase (indicated with live badge) |
| Upcoming | Events in registration/team-formation phase |
| Recent | Completed events from last 90 days |

### 4.3 Behaviour

- Clicking an instance navigates to that HackDay's Confluence page
- Current location highlighted with distinct background colour
- Badge indicators show unread notifications (new help requests, voting opening)
- Dropdown auto-closes on selection or click-outside
- Instance list sourced from hdc.registry with client-side cache (5-minute refresh interval)

### 4.4 Responsive Behaviour

The app switcher must remain functional across viewport sizes:

- **Desktop (>1024px):** full dropdown with section headers and instance descriptions
- **Tablet (768-1024px):** compact dropdown with instance names only, no descriptions
- **Mobile (<768px):** full-screen overlay replacing the dropdown, with touch-friendly tap targets (minimum 44px height)

---

## 5. Instance Lifecycle

### 5.1 Status Transitions

| Status | Description | Transitions To |
|--------|------------|---------------|
| Draft | Instance created, visible to admins only. Configuration in progress | Live, Deleted |
| Live (Registration) | Visible to all users. Registration open according to schedule | Live (Team Formation) |
| Live (Team Formation) | Teams assembling | Live (Hacking) |
| Live (Hacking) | Building period active | Live (Voting) |
| Live (Voting) | Voting/judging in progress | Results |
| Results | Results published, voting closed | Completed |
| Completed | Event finalised, data synced to HDC. Read-only | Archived |
| Archived | Removed from app switcher 'Recent' list. Accessible via HDC library search | Terminal state |

### 5.2 Draft Deletion

Only instances in Draft status can be deleted. The primary admin can delete a draft instance via instance admin settings.

- Deletion requires confirmation dialog: 'This will permanently delete [Event Name] and its Confluence page. This cannot be undone.'
- Backend: removes Confluence child page, removes entry from hdc.registry
- Live instances cannot be deleted. They can only progress to Completed/Archived status

### 5.3 Archival

Completed instances are automatically archived 90 days after completion. Archived instances:

- Are removed from the app switcher 'Recent' section
- Remain accessible via HDC library search
- Retain all data in read-only mode on their Confluence page
- Their hacks remain in hdc.library permanently

---

## 6. MVP Scope and Future Enhancements

### 6.1 MVP Features (Phase 1)

- Consolidated 5-step creation wizard in HDC
- Confluence page hierarchy with parent/child structure
- Explicit permission tiers (primary admin, co-admin, participant)
- App switcher with live/upcoming/recent categorisation
- Basic branding (primary colour + icon)
- Completed hack sync to HDC library with failure handling and retry
- Derived user profiles (participation history from instance scan)
- @adaptavist.com domain authentication for instance creation
- Draft deletion flow
- Configuration audit trail (changelog)
- Data sharding for hacks and participants
- Error states for creation flow, sync and navigation
- Responsive app switcher (desktop, tablet, mobile)

### 6.2 Future Enhancements (Post-MVP)

- Advanced branding: custom themes, CSS overrides, banner images
- Department-restricted or invite-only instances
- Template library: reusable event templates with pre-configured rules
- Cross-instance leaderboards and gamification
- Automated hack sync (on event completion without manual trigger)
- Integration with Slack for notifications and team formation
- Advanced analytics: participation trends, team diversity metrics, hack reuse tracking
- Public-facing showcase mode for external visibility
- Denormalised hdc.users cache (if derived approach shows performance issues)
- Concurrent active instance limit (if resource concerns emerge)
- Notification preferences (opt-in alerts for new instance creation)

---

## 7. Technical Considerations

### 7.1 Confluence Macro Communication

Macros on different pages need to communicate for data sync and app switcher functionality.

| Option | Approach | Trade-offs |
|--------|---------|------------|
| A (MVP) | Direct page property reads via Confluence REST API. Each macro queries parent/child pages | Simplest implementation. Performance dependent on number of instances. Acceptable for <20 concurrent instances |
| B (Post-MVP) | Custom REST API layer as intermediary. Provides abstraction and caching | More complex. Better performance at scale. Easier to extend with new features |
| C (Future) | Shared state service with real-time sync | Highest complexity. Required only if real-time collaboration features are introduced |

**Recommendation:** Start with Option A for MVP. Migrate to Option B if response times exceed 2 seconds for registry lookups or if instance count grows beyond 20.

### 7.2 Performance and Scalability

- Registry lookup optimisation: cache hdc.registry client-side with 5-minute refresh interval
- Lazy-load instance data: only fetch full hack details when user navigates to specific instance
- Pagination for library: implement infinite scroll with 20 items per page for HDC hack library
- Page property monitoring: HDC admin dashboard shows storage utilisation with warnings at 25KB per key
- Shard management: automated shard creation when any key approaches 30KB

### 7.3 Migration from Existing Single Instance

HackDay 2026 (Viking-themed) already exists. The migration path is:

1. Deploy new HDC parent page with registry initialisation
2. Convert existing HackDay 2026 page into child page of HDC
3. Backfill hdc.registry with HackDay 2026 metadata
4. Sync existing completed hacks to hdc.library
5. Test app switcher navigation between HDC and HackDay 2026
6. Update existing HackDay macro version to include app switcher component

---

## 8. Implementation Roadmap

Total estimated duration: 8 weeks. The roadmap follows a vertical-slice approach, prioritising an end-to-end flow in Phase 1 to de-risk the architecture before widening to the full feature set.

### Phase 1: Vertical Slice (Weeks 1-2)

Goal: one instance creation, one hack submission, one sync to library - end to end.

- Implement HDC parent page structure and registry data model
- Build minimal creation wizard (Steps 1-2 only: name, admin, schedule)
- Develop page creation automation (Confluence API integration)
- Implement basic hack submission in instance
- Build sync flow: single hack push to hdc.library
- Validate data sharding approach with test data

### Phase 2: Full Wizard and Permissions (Weeks 3-4)

- Complete all 5 wizard steps (rules, branding, review)
- Implement permission tiers (primary admin, co-admin, participant)
- Build admin transfer workflow
- Add draft/live status workflow with deletion flow
- Implement configuration audit trail
- Error handling for creation flow (duplicate names, API failures, timeouts)

### Phase 3: Data Sync and App Switcher (Weeks 5-6)

- Full hack sync with failure handling and retry (partial sync, idempotent retry)
- Derived user profile computation (cross-instance participation scan)
- Wire app switcher to registry (dynamic instance list with caching)
- Responsive app switcher (desktop, tablet, mobile layouts)
- Add navigation logic and state management

### Phase 4: Migration and Testing (Week 7)

- Migrate existing HackDay 2026 instance to new architecture
- Comprehensive testing: creation flow, sync, navigation, permissions
- Performance testing with simulated multiple instances (target: <2s registry lookup)
- Data sharding stress test (simulate 50+ hacks per instance)
- Bug fixes and refinements

### Phase 5: Launch (Week 8)

- Deploy to production Confluence environment
- Internal documentation and admin training
- Announce to Adaptavist team with example instances
- Monitor adoption and gather feedback for post-MVP enhancements

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Page property size limits hit earlier than expected | Medium | High | Sharding strategy defined in spec. Monitoring dashboard with 25KB warnings. Archival strategy for old data |
| Confluence API rate limiting during sync | Low | Medium | Batch sync operations. Implement exponential backoff. Sync is admin-triggered so timing is controllable |
| Data consistency issues between HDC and instances | Medium | Medium | Derived user profiles avoid separate sync. Hack sync is idempotent with retry. Sync status indicator provides visibility |
| Primary admin departure mid-event | Low | High | Automatic transfer to first co-admin. Orphaned instance detection in HDC admin dashboard |
| Performance degradation with many instances | Low | Medium | Client-side caching with 5-min refresh. Lazy loading. Migration path to Option B (API layer) defined |
| Scope creep extending timeline beyond 8 weeks | High | Medium | Vertical slice in Phase 1 de-risks core architecture. Clear MVP/post-MVP boundary. Features can be deferred without blocking launch |

---

## Appendix A: Decisions Log

Decisions made during specification development, with rationale.

| Decision | Rationale |
|----------|----------|
| Consolidated single wizard (not two separate wizards) | Reduces context-switching and drop-off risk. Save-as-draft at every step provides the same flexibility as a separate creation step |
| Derived user profiles instead of separate hdc.users store | Avoids cross-cutting consistency issues. Performance is acceptable for MVP scale. Denormalised cache can be added post-MVP if needed |
| Read-only completed instances | Prevents post-hoc modification of results. Maintains integrity of library data |
| 90-day archival window | Balances accessibility (recent events stay visible) with app switcher cleanliness. Archived events remain searchable via library |
| Primary admin auto-transfer on account deactivation | Prevents orphaned instances without requiring manual intervention. Co-admin ordering provides deterministic fallback |
| Manual sync trigger (not automatic) | Gives admins control over when data is finalised. Reduces risk of premature sync. Automatic sync can be added post-MVP |

## Appendix B: Open Questions (Remaining)

The following questions remain open for discussion:

1. Should there be a limit on the number of concurrent active instances? Current recommendation: no limit for MVP, add monitoring
2. Should users receive notifications when new instances are created? Current recommendation: opt-in notification preference, post-MVP
3. Should the HDC library support tagging/categorisation of hacks beyond the source instance? If so, who maintains the taxonomy?

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| HDC | HackDay Central - the parent platform and library |
| Instance | A single HackDay event, represented as a Confluence child page with HackDay macro |
| Shard | A numbered subdivision of a page property key used to stay within size limits |
| Registry | The hdc.registry page property containing metadata for all instances |
| Sync | The process of pushing completed hack data from an instance to the HDC library |
| Derived profile | User participation history computed on demand from instance data rather than stored separately |
