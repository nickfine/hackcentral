# HackDay Central - Detailed Implementation Plan

Based on ROADMAP.md v2.2

---

## Phase 1: MVP Foundation (Weeks 1-6)

### Week 1: Project Setup & Infrastructure

**Tasks:**
1. Initialize Vite + React 18 project with TypeScript
2. Configure Tailwind CSS with design tokens from `src/lib/design-system.js`
3. Set up Supabase project (create account, configure client)
4. Configure ESLint, Prettier, and Vitest testing infrastructure
5. Set up Vercel deployment with `vercel.json` rewrites for SPA
6. Create folder structure per roadmap spec

**Deliverables:**
- Working dev environment with hot reload
- CI/CD pipeline to Vercel
- Base design system tokens

---

### Week 1-2: Database Setup

**Tasks:**
1. Create core tables via migrations:
   - `profiles` (with visibility controls)
   - `capability_tags` + `profile_capability_tags` (join table)
   - `library_assets`
   - `projects`
   - `project_members`
   - `mentor_requests`

2. Set up RLS policies for all tables (visibility-aware)

3. Create indexes for performance:
   - `idx_library_assets_status`, `idx_library_assets_type`
   - `idx_profiles_mentor_capacity`

4. Create materialized view `library_asset_reuse_counts`

5. Set up Realtime subscriptions (mentor_requests only)

**Deliverables:**
- Complete database schema
- RLS policies enforcing visibility
- Email domain restriction for org boundary

---

### Week 2: Authentication & Profiles

**Tasks:**
1. Implement Supabase Auth (email/password or SSO)
2. Create auth hooks (`src/hooks/useAuth.ts`)
3. Build profile creation flow on first login
4. Create `ProfileEdit.tsx` with:
   - Experience level selection (newbie → expert)
   - Capability tag multi-select
   - Visibility control (private/org/public)
5. Build basic `PeopleDirectory.tsx` (read-only, filtered by visibility)

**Deliverables:**
- Working authentication
- Profile CRUD operations
- Basic people directory

---

### Week 3-4: Basic Library

**Tasks:**
1. Create `LibraryView.tsx` with filtering (type, status, arsenal flag)
2. Build `AssetCard.tsx` and `AssetDetail.tsx` components
3. Implement PostgreSQL full-text search on title/description
4. Seed 20-30 high-quality AI prompts/templates as AI Arsenal
5. Create `AIArsenalSection.tsx` (curated, read-only)
6. Add visibility controls (private/org/public)

**Asset Types to Support:**
- `prompt`, `template`, `agent_blueprint`, `guardrail`, `evaluation_rubric`, `structured_output`

**Deliverables:**
- Library listing with search
- Asset detail view
- Seeded AI Arsenal content

---

### Week 4-5: Minimal Projects

**Tasks:**
1. Create `projects` table migrations (if not done)
2. Build `ProjectList.tsx` with visibility filtering
3. Create `ProjectCreate.tsx` form:
   - Title, description
   - Visibility control (defaults to private)
   - AI impact hypothesis field
4. Build `ProjectDetail.tsx` view
5. Implement status workflow: `idea` → `building` → `completed`
6. Add private/sandbox mode support

**Deliverables:**
- Project CRUD operations
- Status transitions
- Visibility enforcement

---

### Week 5-6: Basic Collaboration

**Tasks:**
1. Create collaboration tables:
   - `project_comments` (with `is_ai_related` flag)
   - `project_support_events` (like, offer_help)
   - `project_members` (owner, collaborator, mentor, supporter)

2. Build comment components:
   - `CommentList.tsx`, `CommentForm.tsx`

3. Build support components:
   - `SupportButton.tsx` (like, offer help)
   - `SupportCount.tsx`

4. Implement RLS for comments/support (inherit project visibility)

**Deliverables:**
- Working comments system
- Support events (likes, help offers)
- Project membership

---

## Phase 1.5: Pull Dynamics (Weeks 5-6, overlapping)

### People Enhancements

**Tasks:**
1. Complete experience/comfort self-labels UI
2. Build `ProfileTags.tsx` for capability display
3. Implement AI Helper highlighting algorithm:
   - Query top Library contributors
   - Prioritize in "I can help with..." suggestions
4. Build `AIHelpersList.tsx` for project recruitment
5. Route "AI Newbie" profiles to starter templates

---

### Mentor Matching

**Tasks:**
1. Create `MentorRequestForm.tsx`:
   - Topic field
   - Duration selector (15-30 min)
   - Urgency indicator

2. Build mentor matching algorithm:
   - Match by capacity (`mentor_capacity - mentor_sessions_used > 0`)
   - Match by expertise tags
   - Respect availability

3. Implement `accept_mentor_request()` PostgreSQL function (race-condition safe with row locking)

4. Create `MentorRequestList.tsx` for mentors to manage requests

5. Build `MentorCapacityIndicator.tsx`

6. Add Realtime subscription for request status changes

**Deliverables:**
- Working mentor request flow
- Capacity protection
- Status workflow (pending → accepted → completed)

---

### Basic Recognition

**Tasks:**
1. Create `library_reuse_events` table
2. Implement reuse tracking on asset copy/reference
3. Build `ReuseCounter.tsx` component
4. Create basic `BadgeDisplay.tsx`
5. Build simple `Leaderboard.tsx` (top contributors)

---

## Phase 2: Core Features (Weeks 7-10)

### AI Maturity Dashboard (Week 7)

**Tasks:**
1. Build `DashboardView.tsx` with grid layout
2. Create metrics calculation utilities (`src/lib/metrics.ts`):
   - `get_ai_contributor_percentage()`
   - `get_projects_with_ai_percentage()`
   - `get_weekly_active_contributors()`

3. Build `MetricsCard.tsx` with Framer Motion animations

4. Create `MaturityStageIndicator.tsx`:
   - Stages: Experimenting → Repeating → Scaling → Transforming

5. Implement polling mechanism (5-10 min refresh)

6. Add `TeamComparison.tsx` (with privacy controls)

**Deliverables:**
- Live dashboard with org metrics
- Maturity stage visualization

---

### Library Enhancements (Week 7-8)

**Tasks:**
1. Build `AssetSubmissionForm.tsx` with validation:
   - Required: title, description, asset_type, content
   - Required metadata: intended_user, context, limitations, risk_notes, example_input/output

2. Implement quality gates:
   - `Draft` → `Verified` → `Deprecated`
   - Build `VerificationWorkflow.tsx`

3. Create `project_library_assets` join table for reuse tracking

4. Build reuse tracking:
   - Log to `library_reuse_events` on copy/reference
   - Update materialized view (15-min cron refresh)

5. Create `QualityGateBadge.tsx` status indicator

6. Implement deprecation workflow

**Deliverables:**
- Asset submission with validation
- Quality gate workflow
- Reuse tracking and display

---

### Recognition & Social Proof (Week 8-9)

**Tasks:**
1. Build badge calculation service with anti-gaming:
   - **Most Reused**: ≥3 distinct projects OR ≥5 distinct users
   - **Most Verified**: ≥5 verified assets later reused
   - **Fastest Pull-Through**: Project completed with Verified asset within 14 days
   - **Mentor Champion**: ≥4 completed sessions with positive feedback

2. Create `recognition_badges` table and periodic calculation job

3. Build comprehensive `Leaderboard.tsx` (filter by period, badge type)

4. Create `ImpactStoriesFeed.tsx` and `ImpactStoryCard.tsx`

5. Build story submission form

6. Add Canvas Confetti celebrations

**Visibility Rules:**
- Badges always org-visible
- Only org/public contributions count (not private/anonymous)

---

### AI-Assisted Features (Week 9-10)

**Tasks:**
1. Set up PostgreSQL full-text search indexes:
   ```sql
   CREATE INDEX idx_library_assets_search ON library_assets
   USING gin(to_tsvector('english', title || ' ' || description));
   ```

2. Build `AISearch.tsx` interface

3. Implement hybrid search:
   - Keyword search (PostgreSQL)
   - AI ranking via OpenAI/Anthropic API

4. Build recommendation engine:
   - Semantic similarity + reuse metrics + verification status

5. Add `SimilarAssets.tsx` component (cached suggestions)

6. Create AI-assisted submission (auto-generate structured fields)

**Deliverables:**
- AI-powered search
- Context-aware recommendations

---

### Close/Archive Capture (Week 10)

**Tasks:**
1. Enhance `ProjectCloseForm.tsx`:
   - AI Usage Summary (required)
   - AI tools/agents used
   - Time saved estimate
   - Failures and lessons

2. Add validation/nudges for incomplete captures

3. Create `ArchiveSummary.tsx` for displaying learnings

4. Add admin nudge: "This project hasn't posted an AI lesson"

---

## Phase 3: Advanced Features (Weeks 11-14)

### Late-Majority Barrier Reduction (Week 11-12)

**Tasks:**
1. Build `OnboardingFlow.tsx` with user state detection
2. Create programme templates system
3. Implement role-based `StarterKits.tsx`
4. Add `AnonymousSubmission.tsx` toggle
5. Build `SandboxMode.tsx` (private drafts)
6. Implement graduated nudges based on user state
7. Create AI 101 micro-guide component

**Onboarding Paths:**
- AI Experiment Starter template
- Copilot prompt pack for your role
- Start by reusing an AI Arsenal item

---

### Governance (Week 12-13)

**Tasks:**
1. Build `AIReadinessCheck.tsx` for Building stage:
   - AI impact hypothesis (time saved, error reduction, throughput)
   - Risk check (bias, privacy, misuse)

2. Create `RiskCheckForm.tsx` checklist

3. Add validation to project status transitions

4. Build `IncubationRequirements.tsx`:
   - Sponsor commitment for agentic components

5. Create `GovernanceBadge.tsx` status display

---

### Advanced Metrics (Week 13-14)

**Tasks:**
1. Implement Gini coefficient calculation:
   - Population: Active users (logged in within 90 days)
   - Window: Last 30 days
   - Measure: Distinct contribution events per user

2. Build frontline vs leader gap analysis

3. Create standardization pathways:
   - Detect reuse threshold (>10 reuses)
   - Graduation workflow (template pack, workflow module, playbook)

4. Add metrics export functionality

**Gini Thresholds:**
- < 0.7: Healthy distribution
- ≥ 0.7: Trigger interventions
- ≥ 0.8: Escalate to leadership

---

### Performance Optimization (Week 14)

**Tasks:**
1. Optimize database queries (analyze slow queries)
2. Implement pagination for all lists
3. Add caching with appropriate TTL (5-10 min)
4. Optimize bundle size (lazy load routes)
5. Implement virtual scrolling for long lists

---

## Phase 4: Continuous Optimization (Ongoing)

### Week 15+

**Tasks:**
1. **AI Admin Nudges**: Contextual prompts for incomplete captures
2. **A/B Testing**: Test onboarding flows, nudge messaging
3. **Analytics & Monitoring**:
   - Set up Sentry for error tracking
   - Add usage analytics
   - Monitor performance metrics

4. **User Feedback Loop**:
   - Collect feedback
   - Iterate on pain points

---

## Summary Timeline

| Phase | Weeks | Focus |
|-------|-------|-------|
| **Phase 1** | 1-6 | MVP: Auth, Library (read-only), Projects, Basic Collaboration |
| **Phase 1.5** | 5-6 | People enhancements, Mentor matching, Basic recognition |
| **Phase 2** | 7-10 | Dashboard, Library submissions, Recognition, AI search |
| **Phase 3** | 11-14 | Onboarding, Governance, Advanced metrics, Optimization |
| **Phase 4** | 15+ | Continuous improvement, A/B testing, Analytics |

---

## Key Dependencies

```
Week 1-2: Infrastructure → All subsequent work
Week 2: Auth → Profile → People
Week 3-4: Library (read-only) → Week 7-8 Library (write)
Week 4-5: Projects → Week 5-6 Collaboration → Week 10 Close/Archive
Week 5-6: Mentor Matching (depends on Profiles)
Week 7: Dashboard (depends on all data tables)
Week 8-9: Recognition (depends on Library reuse tracking)
```

---

## Critical Path Items

1. **Week 1**: Project setup must complete before any development
2. **Week 1-2**: Database schema is foundational - get RLS right early
3. **Week 2**: Auth blocks all user-facing features
4. **Week 3-4**: Library seeding needed for meaningful testing
5. **Week 7**: Dashboard depends on populated data from prior weeks

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| RLS complexity | Test policies thoroughly in Week 2; use Supabase dashboard to verify |
| AI search latency | Implement caching early; fallback to keyword-only if API slow |
| Mentor capacity race conditions | Use transactional PostgreSQL function with row locking |
| Materialized view staleness | 15-min cron refresh; show "Last updated" timestamp in UI |
| Scope creep | Stick to Phase 1 scope; defer "nice to haves" to Phase 2+ |

---

## Definition of Done (Per Phase)

### Phase 1 Complete When:
- [ ] Users can sign up and create profiles
- [ ] People directory shows profiles (visibility-controlled)
- [ ] Library displays seeded AI Arsenal (read-only)
- [ ] Users can create/view projects
- [ ] Basic comments and support events work
- [ ] Deployed to Vercel with working auth

### Phase 1.5 Complete When:
- [ ] Mentor matching flow works end-to-end
- [ ] Capacity protection prevents overbooking
- [ ] Basic reuse tracking captures events
- [ ] Simple leaderboard displays top contributors

### Phase 2 Complete When:
- [ ] Dashboard shows all defined metrics
- [ ] Users can submit and verify library assets
- [ ] Badge calculations run correctly
- [ ] AI search returns relevant results
- [ ] Project close captures AI learnings

### Phase 3 Complete When:
- [ ] Onboarding flow guides new users
- [ ] Governance checks enforce on status transitions
- [ ] Gini coefficient displays with thresholds
- [ ] Performance meets targets (<3s page load)

---

**Plan Version**: 1.0
**Created**: January 31, 2026
**Based on**: ROADMAP.md v2.2
