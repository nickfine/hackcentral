# HackDay Central - Complete Implementation Roadmap

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [Core Modules Breakdown](#core-modules-breakdown)
5. [Component Architecture](#component-architecture)
6. [Implementation Phases](#implementation-phases)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)
9. [Success Metrics Implementation](#success-metrics-implementation)

---

## Project Overview

**HackDay Central** is an AI Maturity Accelerator platform that transforms early adopter experiments into reusable assets, accelerates adoption through social pull and mentorship, and makes organizational AI maturity visible and measurable.

### Key Principles
- No points for trying AI - only points for reusable outputs and workflow change
- Library quality and trust comes before volume
- Late majority will copy before they create - design for reuse-first
- Participation > perfection, but outputs must become reusable

### Success Metrics
- Accelerate from <20% to >50% regular AI-using contributors within 12 months
- Early adopters seed ≥70% of reusable AI assets
- Increasing Library reuse rate
- Increasing % projects shipping AI artefacts

---

## Technical Architecture

### Stack Summary
```
Frontend:
├── React 18.x (UI framework)
├── Vite 6.x (Build tool & dev server)
├── Tailwind CSS 3.x (Styling)
├── Framer Motion 12.x (Animations)
├── Lucide React 0.x (Icons)
└── Canvas Confetti 1.x (Celebrations)

Backend:
├── Convex 1.x (Database, Real-time, Server Functions)
├── Clerk (Authentication)
└── Convex React Client (Reactive queries)

Testing:
├── Vitest 4.x (Test runner)
├── @testing-library/react 16.x
├── @testing-library/jest-dom 6.x
└── @testing-library/user-event 14.x

Deployment:
└── Forge (Confluence apps on hackdaytemp.atlassian.net)

Note: Exact patch versions should be determined from actual package.json 
generated during project initialization. These ranges indicate major.minor 
compatibility targets.
```

### Project Structure
```
HackCentral/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (buttons, inputs, cards)
│   │   ├── shared/          # Shared components (layout, navigation)
│   │   ├── dashboard/       # AI Maturity Dashboard components
│   │   ├── people/          # People module components
│   │   ├── library/         # Library & AI Arsenal components
│   │   ├── projects/        # Project components
│   │   ├── mentor/          # Mentor matching components
│   │   └── recognition/     # Badges, leaderboards, impact stories
│   ├── hooks/
│   │   ├── useAuth.ts       # Authentication hooks
│   │   ├── useAuth.ts       # Authentication hooks (Clerk)
│   │   ├── useLibrary.ts    # Library data hooks
│   │   ├── useMentor.ts     # Mentor matching hooks
│   │   └── useMetrics.ts    # Metrics tracking hooks
│   ├── lib/
│   │   ├── convex.ts        # Convex client configuration
│   │   ├── design-system.ts  # Design tokens (colors, spacing, typography)
│   │   ├── utils.ts         # Utility functions
│   │   ├── ai-search.ts     # AI search & recommendations
│   │   └── metrics.ts       # Metrics calculation utilities
│   ├── styles/
│   │   ├── globals.css      # Global styles & CSS variables
│   │   └── themes.css       # Light/dark theme tokens
│   ├── types/
│   │   ├── database.ts      # Generated Convex types
│   │   ├── user.ts          # User & profile types
│   │   ├── library.ts       # Library asset types
│   │   └── project.ts       # Project types
│   ├── pages/
│   │   ├── Dashboard.tsx    # AI Maturity Dashboard
│   │   ├── People.tsx       # People directory
│   │   ├── Library.tsx      # Library & AI Arsenal
│   │   ├── Projects.tsx     # Projects list
│   │   └── Profile.tsx      # User profile
│   └── App.tsx              # Main app component with routing
├── convex/
│   ├── schema.ts           # Database schema (TypeScript)
│   ├── profiles.ts         # Profile queries/mutations
│   ├── projects.ts         # Project queries/mutations
│   ├── libraryAssets.ts   # Library queries/mutations
│   ├── capabilityTags.ts   # Capability tag queries
│   └── seedData.ts         # Seed data functions
├── tests/
│   ├── components/         # Component tests
│   ├── hooks/              # Hook tests
│   └── lib/                # Utility tests
├── public/                 # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── vitest.config.ts
```

---

## Database Schema

**Implementation Note**: This project uses **Convex** (document database) instead of Supabase (PostgreSQL). The schema below shows the conceptual data model. The actual implementation is in TypeScript (`convex/schema.ts`) rather than SQL migrations.

**Key Convex Differences**:
- **Schema Definition**: TypeScript schema instead of SQL DDL
- **Queries**: TypeScript query functions instead of SQL
- **Real-time**: All queries are reactive by default (no explicit subscriptions needed)
- **Auth**: Clerk JWT integration instead of Supabase Auth
- **Visibility**: Implemented in query handlers using `ctx.auth.getUserIdentity()` instead of RLS policies
- **Relationships**: Document references with indexes instead of foreign keys

See `convex/schema.ts` for the actual implementation. The SQL below represents the logical data model for reference.

### Core Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  -- Internal code, mapped to display labels in UI
  experience_level TEXT CHECK (experience_level IN ('newbie', 'curious', 'comfortable', 'power_user', 'expert')),
  mentor_capacity INTEGER DEFAULT 0, -- Monthly mentor session limit
  mentor_sessions_used INTEGER DEFAULT 0,
  -- Visibility control: 'private' | 'org' | 'public'
  profile_visibility TEXT DEFAULT 'org' CHECK (profile_visibility IN ('private', 'org', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capability tags as controlled vocabulary via join table
CREATE TABLE capability_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- Internal code (e.g., 'ai_early_adopter')
  display_label TEXT NOT NULL, -- Display label (e.g., 'AI Early Adopter')
  category TEXT, -- Optional grouping
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_capability_tags (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES capability_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, tag_id)
);
```

#### `library_assets`
```sql
CREATE TABLE library_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('prompt', 'template', 'agent_blueprint', 'guardrail', 'evaluation_rubric', 'structured_output')),
  content JSONB NOT NULL, -- Structured content (prompt text, config, etc.)
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'verified', 'deprecated')),
  author_id UUID REFERENCES profiles(id),
  verified_by_id UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  metadata JSONB, -- { intended_user, context, limitations, risk_notes, example_input, example_output }
  -- Visibility control: 'private' | 'org' | 'public'
  visibility TEXT DEFAULT 'org' CHECK (visibility IN ('private', 'org', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_arsenal BOOLEAN DEFAULT FALSE -- Curated AI Arsenal flag
);

-- Reuse count computed from library_reuse_events (see materialized view or trigger)
-- Do not store reuse_count directly - compute on demand or via materialized view
```

#### `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('idea', 'building', 'incubation', 'completed', 'archived')),
  owner_id UUID REFERENCES profiles(id),
  ai_impact_hypothesis TEXT, -- Required for building stage
  ai_tools_used TEXT[],
  time_saved_estimate INTEGER, -- In hours
  failures_and_lessons TEXT,
  workflow_transformed BOOLEAN DEFAULT FALSE, -- Maturity proxy
  -- Visibility control: 'private' | 'org' | 'public' (defaults to private for safety)
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'org', 'public')),
  is_anonymous BOOLEAN DEFAULT FALSE, -- Anonymous submission flag (see anonymity rules below)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Join table for project-library asset relationships
CREATE TABLE project_library_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES library_assets(id) ON DELETE CASCADE,
  attached_by UUID REFERENCES profiles(id),
  attached_at TIMESTAMPTZ DEFAULT NOW(),
  attachment_type TEXT CHECK (attachment_type IN ('referenced', 'copied', 'linked', 'attached')),
  UNIQUE(project_id, asset_id) -- Prevent duplicate attachments
);
```

#### `mentor_requests`
```sql
CREATE TABLE mentor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id),
  mentor_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  requested_duration INTEGER DEFAULT 30, -- Minutes
  topic TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `library_reuse_events`
```sql
CREATE TABLE library_reuse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES library_assets(id),
  user_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  reuse_type TEXT CHECK (reuse_type IN ('referenced', 'copied', 'linked', 'attached')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate reuse events (same user, asset, project, type)
  UNIQUE(asset_id, user_id, project_id, reuse_type)
);

-- Materialized view for reuse counts (refreshed periodically or on-demand)
CREATE MATERIALIZED VIEW library_asset_reuse_counts AS
SELECT 
  asset_id,
  COUNT(DISTINCT user_id) as distinct_user_reuses,
  COUNT(DISTINCT project_id) as distinct_project_reuses,
  COUNT(*) as total_reuse_events
FROM library_reuse_events
GROUP BY asset_id;

-- Index for fast refresh
CREATE UNIQUE INDEX ON library_asset_reuse_counts(asset_id);

-- Alternative: Use trigger to maintain counter (if real-time needed)
-- But prefer materialized view for accuracy and performance

-- Refresh Strategy (see Materialized View Refresh section below)
```

#### `ai_contributions`
```sql
CREATE TABLE ai_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  contribution_type TEXT CHECK (contribution_type IN ('library_asset', 'project_ai_artefact', 'verification', 'improvement')),
  asset_id UUID REFERENCES library_assets(id),
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `recognition_badges`
```sql
CREATE TABLE recognition_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  badge_type TEXT CHECK (badge_type IN ('most_reused', 'most_verified', 'fastest_pull_through', 'mentor_champion')),
  metric_value NUMERIC,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  -- Validation metadata for anti-gaming
  validation_metadata JSONB, -- { distinct_projects_count, distinct_users_count, quality_gate_passed, etc. }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type, period_start, period_end) -- One badge per type per period
);

-- Badge criteria definitions (for reference, enforced in application logic):
-- 'most_reused': Asset reused in >=3 distinct projects OR >=5 distinct users (last 30 days)
-- 'most_verified': User verified >=5 assets that were later reused (last 30 days)
-- 'fastest_pull_through': User completed project with Verified artefact attached within 14 days of idea submission
-- 'mentor_champion': Completed >=4 mentor sessions with positive feedback (last 30 days)
```

#### `impact_stories`
```sql
CREATE TABLE impact_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  asset_id UUID REFERENCES library_assets(id),
  project_id UUID REFERENCES projects(id),
  headline TEXT NOT NULL, -- e.g., "How Sarah's prompt template saved 12 hours per week"
  story_text TEXT,
  metrics JSONB, -- { time_saved, error_reduction, throughput_gain }
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `project_comments`
```sql
CREATE TABLE project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_ai_related BOOLEAN DEFAULT FALSE, -- Flag for AI-related comments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `project_support_events`
```sql
CREATE TABLE project_support_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  supporter_id UUID REFERENCES profiles(id),
  support_type TEXT CHECK (support_type IN ('like', 'offer_help', 'ai_related_comment', 'resource_shared')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, supporter_id, support_type) -- Prevent duplicate support
);
```

#### `project_members`
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('owner', 'collaborator', 'mentor', 'supporter')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

#### `idea_recruitment_requests`
```sql
CREATE TABLE idea_recruitment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES profiles(id), -- Person requesting help
  target_user_id UUID REFERENCES profiles(id), -- Person being recruited
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes & Performance
```sql
-- Library search optimization
CREATE INDEX idx_library_assets_status ON library_assets(status);
CREATE INDEX idx_library_assets_type ON library_assets(asset_type);
CREATE INDEX idx_library_assets_arsenal ON library_assets(is_arsenal) WHERE is_arsenal = TRUE;
CREATE INDEX idx_library_assets_author ON library_assets(author_id);

-- Reuse tracking
CREATE INDEX idx_reuse_events_asset ON library_reuse_events(asset_id);
CREATE INDEX idx_reuse_events_user ON library_reuse_events(user_id);
CREATE INDEX idx_reuse_events_project ON library_reuse_events(project_id);
CREATE INDEX idx_reuse_events_created ON library_reuse_events(created_at);

-- Project-library asset joins
CREATE INDEX idx_project_library_assets_project ON project_library_assets(project_id);
CREATE INDEX idx_project_library_assets_asset ON project_library_assets(asset_id);

-- Collaboration tables
CREATE INDEX idx_project_comments_project ON project_comments(project_id);
CREATE INDEX idx_project_comments_ai_related ON project_comments(is_ai_related) WHERE is_ai_related = TRUE;
CREATE INDEX idx_project_support_events_project ON project_support_events(project_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- Metrics queries
CREATE INDEX idx_contributions_user_date ON ai_contributions(user_id, created_at);
CREATE INDEX idx_contributions_type ON ai_contributions(contribution_type);

-- Mentor matching
CREATE INDEX idx_profiles_mentor_capacity ON profiles(mentor_capacity) WHERE mentor_capacity > 0;
CREATE INDEX idx_mentor_requests_status ON mentor_requests(status, mentor_id);
```

### Visibility & Access Control

**Convex Implementation**: Instead of Row Level Security (RLS) policies, visibility is enforced in Convex query and mutation handlers using `ctx.auth.getUserIdentity()`. The patterns below show the logical access control rules that are implemented in TypeScript.

**Pattern Example** (from `convex/profiles.ts`):
```typescript
export const getById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    const identity = await ctx.auth.getUserIdentity();
    const isOwner = identity && profile.userId === identity.subject;
    
    if (
      profile.profileVisibility === "public" ||
      (profile.profileVisibility === "org" && identity) ||
      isOwner
    ) {
      return profile;
    }
    return null;
  },
});
```

**SQL RLS Equivalents** (for reference - implemented in Convex queries):
```sql
-- Profiles: Respect visibility settings
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles visible by visibility setting" ON profiles FOR SELECT 
  USING (
    profile_visibility = 'public' OR
    (profile_visibility = 'org' AND auth.role() = 'authenticated') OR
    auth.uid() = id
  );
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Library assets: Respect visibility settings
ALTER TABLE library_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Library assets visible by visibility setting" ON library_assets FOR SELECT 
  USING (
    visibility = 'public' OR
    (visibility = 'org' AND auth.role() = 'authenticated') OR
    (visibility = 'private' AND auth.uid() = author_id) OR
    auth.uid() = author_id -- Authors can always see their own
  );
CREATE POLICY "Authenticated users can create assets" ON library_assets FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = author_id -- Enforce author_id matches authenticated user
  );
CREATE POLICY "Users can update own assets" ON library_assets FOR UPDATE 
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Projects: Private by default, respect visibility
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects visible by visibility setting" ON projects FOR SELECT 
  USING (
    visibility = 'public' OR
    (visibility = 'org' AND auth.role() = 'authenticated') OR
    (visibility = 'private' AND (
      auth.uid() = owner_id OR
      EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
    ))
  );
CREATE POLICY "Authenticated users can create projects" ON projects FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = owner_id -- Enforce owner_id matches authenticated user
  );
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Mentor requests: Users can read own requests, mentors can read requests to them
ALTER TABLE mentor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mentor requests" ON mentor_requests FOR SELECT 
  USING (auth.uid() = requester_id OR auth.uid() = mentor_id);
CREATE POLICY "Users can create mentor requests" ON mentor_requests FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = requester_id -- Enforce requester_id matches authenticated user
  );

-- Project comments: Visible to project viewers
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments visible to project viewers" ON project_comments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_comments.project_id
      AND (
        projects.visibility = 'public' OR
        (projects.visibility = 'org' AND auth.role() = 'authenticated') OR
        (projects.visibility = 'private' AND (
          auth.uid() = projects.owner_id OR
          EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
        ))
      )
    )
  );
CREATE POLICY "Authenticated users can create comments" ON project_comments FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = author_id
  );

-- Project members: Visible to project viewers
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members visible to project viewers" ON project_members FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_members.project_id
      AND (
        projects.visibility = 'public' OR
        (projects.visibility = 'org' AND auth.role() = 'authenticated') OR
        (projects.visibility = 'private' AND (
          auth.uid() = projects.owner_id OR
          EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = projects.id AND pm2.user_id = auth.uid())
        ))
      )
    )
  );

-- Library reuse events: Respect project and asset visibility
ALTER TABLE library_reuse_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reuse events visible to project/asset viewers" ON library_reuse_events FOR SELECT 
  USING (
    -- User can see their own reuse events
    auth.uid() = user_id OR
    -- Or if they can see the project
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = library_reuse_events.project_id
      AND (
        projects.visibility = 'public' OR
        (projects.visibility = 'org' AND auth.role() = 'authenticated') OR
        (projects.visibility = 'private' AND (
          auth.uid() = projects.owner_id OR
          EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
        ))
      )
    ) OR
    -- Or if they can see the asset
    EXISTS (
      SELECT 1 FROM library_assets 
      WHERE library_assets.id = library_reuse_events.asset_id
      AND (
        library_assets.visibility = 'public' OR
        (library_assets.visibility = 'org' AND auth.role() = 'authenticated') OR
        (library_assets.visibility = 'private' AND auth.uid() = library_assets.author_id)
      )
    )
  );
CREATE POLICY "Authenticated users can create reuse events" ON library_reuse_events FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

-- AI contributions: Respect project/asset visibility
ALTER TABLE ai_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contributions visible to project/asset viewers" ON ai_contributions FOR SELECT 
  USING (
    -- User can see their own contributions
    auth.uid() = user_id OR
    -- Or if they can see the project (if project_id exists)
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = ai_contributions.project_id
      AND (
        projects.visibility = 'public' OR
        (projects.visibility = 'org' AND auth.role() = 'authenticated') OR
        (projects.visibility = 'private' AND (
          auth.uid() = projects.owner_id OR
          EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
        ))
      )
    )) OR
    -- Or if they can see the asset (if asset_id exists)
    (asset_id IS NULL OR EXISTS (
      SELECT 1 FROM library_assets 
      WHERE library_assets.id = ai_contributions.asset_id
      AND (
        library_assets.visibility = 'public' OR
        (library_assets.visibility = 'org' AND auth.role() = 'authenticated') OR
        (library_assets.visibility = 'private' AND auth.uid() = library_assets.author_id)
      )
    ))
  );
CREATE POLICY "Authenticated users can create contributions" ON ai_contributions FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

-- Recognition badges: Visible to org members, respect user privacy
ALTER TABLE recognition_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges visible to org members" ON recognition_badges FOR SELECT 
  USING (
    auth.role() = 'authenticated' OR
    -- Users can always see their own badges
    auth.uid() = user_id
  );
-- Badges are created by system/admin functions, not directly by users
-- No INSERT policy for regular users (use server-side function)

-- Impact stories: Respect project/asset visibility
ALTER TABLE impact_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stories visible based on project/asset visibility" ON impact_stories FOR SELECT 
  USING (
    -- Story is featured (public)
    featured = TRUE OR
    -- Or user can see the project
    (project_id IS NULL OR EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = impact_stories.project_id
      AND (
        projects.visibility = 'public' OR
        (projects.visibility = 'org' AND auth.role() = 'authenticated') OR
        (projects.visibility = 'private' AND (
          auth.uid() = projects.owner_id OR
          EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
        ))
      )
    )) OR
    -- Or user can see the asset
    (asset_id IS NULL OR EXISTS (
      SELECT 1 FROM library_assets 
      WHERE library_assets.id = impact_stories.asset_id
      AND (
        library_assets.visibility = 'public' OR
        (library_assets.visibility = 'org' AND auth.role() = 'authenticated') OR
        (library_assets.visibility = 'private' AND auth.uid() = library_assets.author_id)
      )
    ))
  );
CREATE POLICY "Authenticated users can create stories" ON impact_stories FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

-- Project support events: Respect project visibility
ALTER TABLE project_support_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support events visible to project viewers" ON project_support_events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_support_events.project_id
      AND (
        projects.visibility = 'public' OR
        (projects.visibility = 'org' AND auth.role() = 'authenticated') OR
        (projects.visibility = 'private' AND (
          auth.uid() = projects.owner_id OR
          EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
        ))
      )
    )
  );
CREATE POLICY "Authenticated users can create support events" ON project_support_events FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = supporter_id
  );

-- Idea recruitment requests: Private to requester and target
ALTER TABLE idea_recruitment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruitment requests visible to requester and target" ON idea_recruitment_requests FOR SELECT 
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_user_id
  );
CREATE POLICY "Authenticated users can create recruitment requests" ON idea_recruitment_requests FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = requester_id
  );

-- Project library assets: Respect project and asset visibility
ALTER TABLE project_library_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project-asset links visible to project/asset viewers" ON project_library_assets FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_library_assets.project_id
      AND (
        projects.visibility = 'public' OR
        (projects.visibility = 'org' AND auth.role() = 'authenticated') OR
        (projects.visibility = 'private' AND (
          auth.uid() = projects.owner_id OR
          EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
        ))
      )
    ) OR
    EXISTS (
      SELECT 1 FROM library_assets 
      WHERE library_assets.id = project_library_assets.asset_id
      AND (
        library_assets.visibility = 'public' OR
        (library_assets.visibility = 'org' AND auth.role() = 'authenticated') OR
        (library_assets.visibility = 'private' AND auth.uid() = library_assets.author_id)
      )
    )
  );
CREATE POLICY "Authenticated users can create project-asset links" ON project_library_assets FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() = attached_by
  );

-- Capability tags: Public read (controlled vocabulary)
ALTER TABLE capability_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Capability tags are viewable by everyone" ON capability_tags FOR SELECT 
  USING (true);
-- Tags are managed by admins/system, not regular users
-- No INSERT/UPDATE policy for regular users

-- Profile capability tags: Respect profile visibility
ALTER TABLE profile_capability_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profile tags visible with profile" ON profile_capability_tags FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = profile_capability_tags.profile_id
      AND (
        profiles.profile_visibility = 'public' OR
        (profiles.profile_visibility = 'org' AND auth.role() = 'authenticated') OR
        auth.uid() = profiles.id
      )
    )
  );
CREATE POLICY "Users can manage own profile tags" ON profile_capability_tags FOR ALL 
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
```

### Anonymous Submission Enforcement

**Purpose**: Support psychological safety for late-majority users who want to experiment without visibility

**Data Layer Rules**:

1. **When `is_anonymous = TRUE`**:
   - `owner_id` is still stored (required for RLS and data integrity)
   - Owner identity is hidden from all UI and API responses
   - Owner cannot be queried via standard project queries

2. **Who Can See Owner Identity**:
   - **Owner themselves**: Always (for their own projects)
   - **System admins**: Only via direct database access (not exposed in API)
   - **Mentors**: NO (mentors cannot see anonymous project owners)
   - **Project members/collaborators**: NO (if added, they see project but not owner)
   - **API responses**: Owner field returns `null` or placeholder when anonymous

3. **RLS Policy Updates**:
   ```sql
   -- Projects SELECT policy must hide owner_id when anonymous
   -- This requires a function or view that masks owner_id
   CREATE OR REPLACE VIEW projects_public AS
   SELECT 
     id, title, description, status, 
     CASE WHEN is_anonymous THEN NULL ELSE owner_id END as owner_id,
     ai_impact_hypothesis, ai_tools_used, time_saved_estimate,
     failures_and_lessons, workflow_transformed, visibility, is_anonymous,
     created_at, updated_at
   FROM projects;
   ```

4. **UI Layer Rules**:
   - Project cards/listings: Show "Anonymous Contributor" instead of owner name/avatar
   - Project detail pages: Hide owner section entirely when anonymous
   - Comments: If project is anonymous, comment author names are still shown (comments are not anonymous)
   - Impact stories: Cannot link anonymous projects (or story must also be anonymous)

5. **Deanonymization**:
   - **Owner can toggle**: Owner can change `is_anonymous` from TRUE to FALSE (one-way, cannot re-anonymize)
   - **Admins cannot**: Admins cannot deanonymize without owner consent (privacy violation)
   - **Audit trail**: Log when anonymity is removed (for compliance)

6. **API Response Masking**:
   ```typescript
   // Example: Project API response transformer
   function maskAnonymousProject(project: Project, userId: string): Project {
     if (project.is_anonymous && project.owner_id !== userId) {
       return { ...project, owner_id: null, owner: null };
     }
     return project;
   }
   ```

**Implementation Steps**:
1. Create `projects_public` view that masks owner_id when anonymous
2. Update all API endpoints to use view or apply masking function
3. Update UI components to handle null owner gracefully
4. Add "Remove anonymity" toggle in project settings (owner only)
5. Add audit logging for anonymity changes

---

### Reuse Count Calculation Strategy

**Convex Implementation**: Convex doesn't have materialized views. Instead, we use aggregation queries that compute reuse counts on-demand.

**Approach**: **Aggregation queries** (computed on-demand, cached by Convex)

**Implementation**:

```typescript
// convex/libraryAssets.ts
export const getReuseCounts = query({
  args: { assetId: v.id("libraryAssets") },
  handler: async (ctx, { assetId }) => {
    const reuseEvents = await ctx.db
      .query("libraryReuseEvents")
      .withIndex("by_asset", (q) => q.eq("assetId", assetId))
      .collect();
    
    return {
      distinctUserReuses: new Set(reuseEvents.map(e => e.userId)).size,
      distinctProjectReuses: new Set(reuseEvents.filter(e => e.projectId).map(e => e.projectId)).size,
      totalReuseEvents: reuseEvents.length,
    };
  },
});
```

**Caching Strategy**:
- Convex automatically caches query results
- Queries refresh when underlying data changes (reactive)
- For expensive aggregations, consider scheduled functions that pre-compute values

**Alternative: Scheduled Functions** (for expensive calculations):
```typescript
// convex/scheduled.ts
import { internalMutation } from "./_generated/server";

export const calculateReuseCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Pre-compute reuse counts and store in a cache table
    // Run every 15 minutes via Convex scheduler
  },
});
```

**Refresh Monitoring**:
- Convex dashboard shows query performance
- Add "Last computed" timestamp to UI if using scheduled functions
- Dashboard shows "Last updated: X minutes ago" for cached values

**Decision**: Use aggregation queries for Phase 1-2. Consider scheduled functions if aggregation becomes too slow (>500ms).

---

### Mentor Capacity Race Condition Prevention

**Problem**: Two mentor requests could be accepted simultaneously, exceeding mentor capacity

**Solution**: **Atomic mutation** with conditional update in Convex

**Convex Implementation**:

```typescript
// convex/mentorRequests.ts
export const acceptRequest = mutation({
  args: { 
    requestId: v.id("mentorRequests"),
    mentorId: v.id("profiles")
  },
  handler: async (ctx, { requestId, mentorId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get mentor profile
    const mentor = await ctx.db.get(mentorId);
    if (!mentor) throw new Error("Mentor not found");
    
    // Check capacity atomically
    if (mentor.mentorSessionsUsed >= mentor.mentorCapacity) {
      throw new Error("Mentor capacity exceeded");
    }
    
    // Get request
    const request = await ctx.db.get(requestId);
    if (!request || request.mentorId !== mentorId || request.status !== "pending") {
      throw new Error("Invalid request");
    }
    
    // Update request status
    await ctx.db.patch(requestId, {
      status: "accepted",
      scheduledAt: Date.now(),
    });
    
    // Increment sessions used atomically
    await ctx.db.patch(mentorId, {
      mentorSessionsUsed: mentor.mentorSessionsUsed + 1,
    });
    
    return { success: true };
  },
});
```

**Convex Atomicity**: Convex mutations are atomic - if the mutation fails partway through, all changes are rolled back. However, to prevent race conditions, we still need to check capacity at the start of the mutation.

**Alternative: Optimistic Updates with Validation**:
```typescript
// Use Convex's built-in conflict detection
export const acceptRequestOptimistic = mutation({
  args: { requestId: v.id("mentorRequests") },
  handler: async (ctx, { requestId }) => {
    const request = await ctx.db.get(requestId);
    const mentor = await ctx.db.get(request.mentorId);
    
    // Check capacity
    if (mentor.mentorSessionsUsed >= mentor.mentorCapacity) {
      throw new Error("Capacity exceeded");
    }
    
    // Atomic update
    await ctx.db.patch(requestId, { status: "accepted" });
    await ctx.db.patch(request.mentorId, { 
      mentorSessionsUsed: mentor.mentorSessionsUsed + 1 
    });
  },
});
```

**Recommended Approach**: Use the first approach (explicit capacity check). Convex's atomic mutations prevent partial updates, but we still need to check capacity before accepting to avoid exceeding limits.

**Client Usage**:
```typescript
// Frontend
const acceptRequest = useMutation(api.mentorRequests.acceptRequest);

await acceptRequest({ 
  requestId: request._id, 
  mentorId: mentor._id 
});
```

---

### Real-time Updates

**Convex Implementation**: Convex queries are reactive by default - the UI automatically updates when data changes. No explicit subscriptions needed. However, we still follow the principle of only using real-time where it adds value (to avoid unnecessary re-renders).

**Selective Real-time Usage** (only for truly collaborative, in-session features):

- `mentor_requests` - Status changes (pending → accepted → completed) for active mentor sessions
- `project_comments` - New comments on projects (for active project discussions)
- `project_support_events` - Support events (likes, help offers) for active project pages
- `project_members` - Member additions/removals for active project views

**Optimized Updates** (use query filters/conditions to limit reactivity):

- `library_assets` - Use query filters to limit reactivity (only watch verified/arsenal assets)
- `library_reuse_events` - Reuse counters computed via aggregation queries (not watched directly)
- `recognition_badges` - Calculated via scheduled functions, queries refresh on-demand
- `impact_stories` - Queries refresh on page navigation or user action

**Rationale**: While Convex queries are reactive by default, we still optimize by:
- Using query filters to limit what's watched
- Using aggregation queries for computed metrics (not watching raw events)
- Refreshing expensive calculations on-demand rather than reactively

---

## Core Modules Breakdown

### 1. AI Maturity Dashboard

**Purpose**: Visualize org-wide maturity progress using staged behavioral model

**Components**:
- `DashboardView.tsx` - Main dashboard container
- `MaturityScoreboard.tsx` - Org-wide metrics display
- `TeamComparison.tsx` - Optional team view (with anonymity controls)
- `MaturityStageIndicator.tsx` - Visual stage progress (Experimenting → Repeating → Scaling → Transforming)
- `MetricsCard.tsx` - Individual metric display cards

**Metrics to Display**:
- % employees with AI contributions in Library
- % projects using AI artefacts
- Weekly active AI contributors
- % projects redesigning workflows around AI
- Early adopter concentration (Gini coefficient)
- Frontline vs leader usage gap

**Data Sources**:
- Aggregated queries from `ai_contributions`, `projects`, `library_reuse_events`
- Polled updates (refresh every 5-10 minutes or on user action)
- Cached metrics with TTL to reduce database load

**Implementation Steps**:
1. Create dashboard layout with grid system
2. Build metrics calculation utilities (`lib/metrics.ts`)
3. Implement metric cards with Framer Motion animations
4. Add polling mechanism for metric updates (every 5-10 minutes)
5. Create maturity stage visualization (progress bars, stage indicators)
6. Add team comparison view (with privacy controls)
7. Implement caching layer for metrics to reduce database load

---

### 2. People Module

**Purpose**: Pull engine for adoption - make support visible, enable mentorship, route late joiners

**Components**:
- `PeopleDirectory.tsx` - Main people listing
- `ProfileCard.tsx` - Individual profile display
- `ProfileTags.tsx` - Experience/capability tag display
- `ProfileEdit.tsx` - Profile editing form
- `AIHelpersList.tsx` - Highlighted AI helpers for project recruitment
- `MentorAvailability.tsx` - Mentor capacity display

**Features**:
- Self-tagging system (experience levels + capability labels)
- Auto-highlight AI Helpers during project recruitment
- Prioritize top Library contributors in "I can help with..." suggestions
- Route "AI Newbie" profiles toward low-risk starter templates

**Data Model**:
- `profiles` table with `experience_level` (internal codes)
- `profile_capability_tags` join table for capability tags
- Join queries with `library_assets` for contributor rankings

**Implementation Steps**:
1. Create profile editing form with tag selection
2. Build people directory with filtering/search
3. Implement AI Helper highlighting logic
4. Add "I can help with..." suggestion algorithm
5. Create profile detail view with contribution history
6. Add mentor availability indicators

---

### 3. Mentor Matching Workflow

**Purpose**: Convert early adopter energy into distributed enablement capacity

**Components**:
- `MentorMatching.tsx` - Main mentor matching interface
- `MentorRequestForm.tsx` - One-click pairing request form
- `MentorCalendar.tsx` - Calendar integration/nudges
- `MentorRequestList.tsx` - Manage mentor requests
- `MentorCapacityIndicator.tsx` - Show available mentor slots

**Flow**:
1. User clicks "Get paired with an AI Mentor"
2. Form collects: topic, preferred duration (15-30 min), urgency
3. System matches based on: mentor capacity, expertise tags, availability
4. Mentor receives notification
5. Calendar nudge/workflow support
6. Auto-close when mentor capacity reached

**Data Model**:
- `mentor_requests` table
- `profiles.mentor_capacity` and `mentor_sessions_used` tracking

**Implementation Steps**:
1. Create mentor request form component
2. Build mentor matching algorithm (capacity + expertise matching)
3. Implement request status workflow (pending → accepted → completed)
4. Add calendar integration (or calendar nudge UI)
5. Create mentor dashboard for managing requests
6. Add capacity protection logic (auto-close when full)
7. Implement notification system (Convex reactive queries or email)

---

### 4. Recognition & Social Proof

**Purpose**: Visible recognition to create social proof, FOMO, measurable value visibility

**Components**:
- `BadgeDisplay.tsx` - Badge component
- `Leaderboard.tsx` - Leaderboard display
- `ImpactStoriesFeed.tsx` - AI Impact Stories feed
- `ImpactStoryCard.tsx` - Individual story card
- `RecognitionBanner.tsx` - Celebration banner with confetti

**Badge Types**:
- Most reused AI assets
- Most verified AI assets
- Fastest pull-through (early adopter → project completion)
- Mentor Champion

**Visibility Rules for Badges**:
- **Badges are always org-visible**: All authenticated users can see badges (social proof mechanism)
- **Badge calculation respects privacy**: Badges are calculated from visible activity only
  - Private project contributions do NOT count toward badges (prevents leakage)
  - Anonymous project contributions do NOT count toward badges
  - Only org/public project contributions count
- **Badge display**: Show badge recipient name (badges are not anonymous)
- **Privacy protection**: If user's only contributions are private, they won't appear on leaderboards

**Impact Stories Format**:
- Headline: "How Sarah's prompt template saved 12 hours per week"
- Story text with metrics
- Featured stories highlighted

**Visibility Rules for Impact Stories**:
- **Cannot link anonymous projects**: If `project.is_anonymous = TRUE`, story cannot reference that project
- **Respect project visibility**: Story visibility inherits from linked project/asset visibility
  - If project is private → story only visible to project members
  - If project is org → story visible to org members
  - If project is public → story visible to all
- **Featured stories**: Must link to public or org-visible projects/assets (cannot feature private work)
- **User privacy**: Story author (`user_id`) is always visible (stories are not anonymous)

**Data Model**:
- `recognition_badges` table (calculated periodically)
- `impact_stories` table

**Implementation Steps**:
1. Create badge calculation service with anti-gaming validation:
   - Most reused: Require distinct projects (>=3) OR distinct users (>=5)
   - Most verified: Require verified assets that were later reused
   - Fastest pull-through: Require Verified artefact attached + minimum quality gate
   - Mentor champion: Require completed sessions with positive feedback
2. Build leaderboard component with filtering (by period, badge type)
3. Implement impact stories feed (polled, not realtime)
4. Add story submission form
5. Create celebration animations (Canvas Confetti)
6. Add periodic badge recalculation (daily/weekly batch job)

---

### 5. Library & AI Arsenal

**Purpose**: Compound engine for adoption - allows late joiners to copy proven patterns

**Components**:
- `LibraryView.tsx` - Main library interface
- `AIArsenalSection.tsx` - Curated AI Arsenal subsection
- `AssetCard.tsx` - Library asset display card
- `AssetDetail.tsx` - Full asset detail view
- `AssetSubmissionForm.tsx` - Submit new asset form
- `QualityGateBadge.tsx` - Status indicator (Draft/Verified/Deprecated)
- `ReuseCounter.tsx` - Display reuse metrics
- `VerificationWorkflow.tsx` - Asset verification interface

**AI Arsenal Features**:
- Curated, high-trust section
- Prompts and templates
- Agent blueprints
- Reusable agent configurations
- Failure analysis ("What hallucinated and why we fixed it")
- Guardrails and policy patterns

**Quality Gates**:
- Status: Draft → Verified → Deprecated
- Minimum metadata required:
  - Intended user/role
  - Context and when to use
  - Limitations
  - Risk notes (privacy, hallucination risk)
  - Example input/output

**Reuse Visibility**:
- Referenced in X projects
- Reuse counts
- Contributor credit
- Verified by (if applicable)

**Data Model**:
- `library_assets` table
- `library_reuse_events` table for tracking
- `project_library_assets` join table for "referenced in X projects"
- `library_asset_reuse_counts` materialized view for reuse metrics

**Implementation Steps**:
1. Create library listing with filtering (type, status, arsenal flag, visibility)
2. Build AI Arsenal curated section
3. Implement asset detail view with full metadata
4. Create asset submission form with validation (enforce required metadata fields)
5. Build verification workflow (review → verify)
6. Add reuse tracking via `library_reuse_events` and `project_library_assets` join table
7. Create reuse counter display component (query materialized view or compute on-demand)
8. Implement deprecation workflow
9. Add visibility controls (private/org/public) with RLS enforcement

---

### 6. AI-Assisted Library Intelligence

**Purpose**: Make Library discoverable and context-aware - not a manual search problem

**Components**:
- `AISearch.tsx` - AI-powered search interface
- `SearchResults.tsx` - Intelligent search results display
- `RecommendationEngine.tsx` - Context-aware recommendations
- `SimilarAssets.tsx` - "Similar to this" suggestions

**Capabilities**:
- AI search + auto-summarize:
  - "Show me best prompts for code review"
  - "Show me guardrails for confidentiality"
- Recommendation engine when submitting ideas:
  - "Similar failed attempts used this guardrail"
  - "This prompt is widely reused in X projects"

**Implementation Approach** (DECIDED):

**Hybrid Approach**: Keyword search (PostgreSQL full-text) + AI-powered ranking/recommendations

- **Search**: PostgreSQL full-text search on title, description, metadata
- **Ranking**: AI API (OpenAI/Anthropic) for semantic similarity scoring
- **Recommendations**: Combine semantic similarity + reuse metrics + verification status
- **Update Cadence**: Recompute recommendations on asset creation/update, cache results
- **Privacy**: Search queries sent to AI API, but no PII in queries (only asset metadata)
- **Evaluation**: Track precision/recall via user click-through rates

**Implementation Steps**:
1. Set up PostgreSQL full-text search indexes on library_assets
2. Create AI search interface component
3. Build search query processing (keyword extraction → full-text search → AI ranking)
4. Implement recommendation algorithm (semantic similarity + reuse metrics + verification status)
5. Add "similar assets" suggestions on asset detail pages (cached)
6. Create recommendation prompts for idea submission flow
7. Add caching layer for search results and recommendations (5-10 min TTL)
8. Track search performance metrics (click-through, time-to-find)

---

### 7. Close/Archive Capture Nudges

**Purpose**: Normalize learning capture and accelerate institutional memory

**Components**:
- `ProjectCloseForm.tsx` - Enhanced close/archive form
- `AILearningCapture.tsx` - AI usage summary capture
- `LearningNudge.tsx` - Nudge component for incomplete captures
- `ArchiveSummary.tsx` - Display archived project learnings

**Required Fields on Close/Archive**:
- AI Usage Summary
- AI tools/agents used
- Time saved estimate
- Failures and lessons

**Visibility Rules for Comments and Support Events**:
- **Comments inherit project visibility**: Comments on private projects are only visible to project members
- **Support events inherit project visibility**: Likes/help offers on private projects are only visible to project members
- **Anonymous projects**: Comments and support events are visible to project members, but project owner identity is hidden
- **Public display**: Comments and support events on public projects are visible to all
- **Privacy protection**: Comment/support counts on private projects are NOT included in public metrics

**Implementation Steps**:
1. Enhance project close/archive modal with AI capture fields
2. Add validation (require or heavily nudge completion)
3. Create learning summary display on archived projects (respects project visibility)
4. Add admin nudge: "This project hasn't posted an AI lesson - want help summarizing?"
5. Store captured data in `projects` table fields
6. Enforce visibility inheritance for comments and support events in UI

---

### 8. Late-Majority Barrier Reduction

**Purpose**: Reduce anxiety, risk, and effort so late majority can participate safely

**Components**:
- `OnboardingFlow.tsx` - Ultra-low-friction onboarding
- `AIAssistSubmit.tsx` - AI-assisted idea submission
- `ProgrammeTemplates.tsx` - Pre-built templates
- `StarterKits.tsx` - Role-based starter kits
- `SandboxMode.tsx` - Sandbox for experiments
- `AnonymousSubmission.tsx` - Anonymous submission option

**Onboarding Paths**:
- AI Experiment Starter template
- Copilot prompt pack for your role
- Start by reusing an AI Arsenal item (copy first, create later)

**Graduated Nudges**:
- New users: Quick AI 101 micro-guide
- Inactive idea submitters: 2-min AI boost prompt linking to AI Arsenal
- Builders: Show best guardrails and agent starter kits
- AI Newbies: Route to low-risk templates + mentor pairing

**Risk Reduction**:
- Anonymous submission option
- Sandbox mode for experiments
- No visibility until published by owner

**Implementation Steps**:
1. Create onboarding flow with user state detection
2. Build AI-assisted submission form (AI generates structured fields)
3. Implement programme templates system
4. Create starter kits by role
5. Add anonymous submission toggle
6. Build sandbox mode (private drafts)
7. Implement graduated nudges based on user state
8. Create AI 101 micro-guide component

---

### 9. Governance (AI Readiness Checks)

**Purpose**: Lightweight governance without "stage gate" framing

**Components**:
- `AIReadinessCheck.tsx` - Building stage requirements
- `RiskCheckForm.tsx` - Lightweight risk assessment
- `IncubationRequirements.tsx` - Incubation stage requirements
- `GovernanceBadge.tsx` - Display governance status

**Building Stage Requirements**:
- AI impact hypothesis (time saved, error reduction, throughput gain)
- Lightweight risk check:
  - Bias
  - Data privacy
  - Misuse

**Incubation Stage Requirements**:
- Sponsor commitment to agent ops review when agentic components exist

**Implementation Steps**:
1. Create AI readiness check form component
2. Build risk assessment checklist
3. Add validation to project status transitions
4. Create governance status display
5. Implement sponsor commitment workflow

---

## Component Architecture

### UI Primitives (`src/components/ui/`)

**Button Components**:
- `Button.tsx` - Base button with variants (primary, secondary, ghost)
- `IconButton.tsx` - Icon-only button
- `ButtonGroup.tsx` - Button groups

**Form Components**:
- `Input.tsx` - Text input
- `Textarea.tsx` - Textarea
- `Select.tsx` - Dropdown select
- `Checkbox.tsx` - Checkbox
- `Radio.tsx` - Radio buttons
- `TagInput.tsx` - Tag selection input
- `FormField.tsx` - Form field wrapper with label/error

**Display Components**:
- `Card.tsx` - Card container
- `Badge.tsx` - Badge/tag display
- `Avatar.tsx` - User avatar
- `Tooltip.tsx` - Tooltip
- `Modal.tsx` - Modal dialog
- `Tabs.tsx` - Tab navigation
- `Accordion.tsx` - Accordion/collapsible

**Layout Components**:
- `Container.tsx` - Page container
- `Grid.tsx` - Grid layout
- `Stack.tsx` - Stack layout
- `Divider.tsx` - Divider line

**Feedback Components**:
- `Alert.tsx` - Alert/notification
- `Toast.tsx` - Toast notifications
- `LoadingSpinner.tsx` - Loading indicator
- `Skeleton.tsx` - Skeleton loader

### Shared Components (`src/components/shared/`)

- `Header.tsx` - App header with navigation
- `Footer.tsx` - App footer
- `Sidebar.tsx` - Sidebar navigation
- `PageHeader.tsx` - Page title and actions
- `SearchBar.tsx` - Global search
- `UserMenu.tsx` - User dropdown menu
- `ThemeToggle.tsx` - Dark/light mode toggle

### Design System (`src/lib/design-system.js`)

```javascript
export const designTokens = {
  colors: {
    arena: {
      primary: 'var(--arena-primary)',
      secondary: 'var(--arena-secondary)',
      // ... arena color palette
    },
    brand: {
      // ... brand colors
    },
    status: {
      success: 'var(--status-success)',
      warning: 'var(--status-warning)',
      error: 'var(--status-error)',
      info: 'var(--status-info)',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    // ... spacing scale
  },
  typography: {
    fontFamily: {
      sans: ['Satoshi', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      // ... font size scale
    },
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      // ... easing functions
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};
```

---

## Implementation Phases

### Phase 1: MVP Foundation (Weeks 1-6)

**Goal**: Establish core infrastructure and minimal viable functionality

**Scope Note**: Narrowed from original 4-week plan. Focus on quality foundation, not feature completeness.

**Tasks**:
1. **Project Setup** (Week 1)
   - Initialize Vite + React project
   - Configure Tailwind CSS with design tokens
   - Set up Convex project (`npx convex dev`) and configure client
   - Set up Clerk authentication
   - Set up ESLint and testing infrastructure
   - Configure Forge deployment

2. **Database Setup** (Week 1-2)
   - Define core database schema in `convex/schema.ts`
   - Create query/mutation functions with visibility checks
   - Define indexes for efficient queries
   - Convex queries are reactive by default (no explicit subscriptions needed)
   - Create aggregation queries for reuse counts

3. **Authentication & Profiles** (Week 2)
   - Configure Clerk JWT integration with Convex
   - Create profile creation/editing (Convex mutations)
   - Add experience level selection (internal codes)
   - Set up capability tags table and references
   - Build basic People directory (read-only, filtered by visibility)

4. **Basic Library** (Week 3-4)
   - Create library listing view (read-only)
   - Add asset detail view
   - Implement basic keyword search (PostgreSQL full-text)
   - Seed 20-30 high-quality AI prompts/templates
   - Create curated AI Arsenal section (read-only)
   - Add visibility controls (private/org/public)

5. **Minimal Projects** (Week 4-5)
   - Create project listing (filtered by visibility)
   - Build project creation form (minimal, with visibility controls)
   - Add project detail view
   - Implement basic project status workflow (idea → building → completed)
   - Add private/sandbox mode support

6. **Basic Collaboration** (Week 5-6)
   - Add project comments (with AI-related flag)
   - Add project support events (likes, help offers)
   - Implement project members table
   - Add basic project visibility enforcement

**Deliverables**:
- Working authentication with profile management
- People directory with profiles (visibility-controlled)
- Library with AI Arsenal (read-only, seeded content)
- Minimal project management (create, view, comment)
- Basic collaboration features
- Deployed to Confluence via Forge

**NOT Included in Phase 1**:
- Asset submission/verification workflow
- Reuse tracking (deferred to Phase 2)
- Mentor matching (deferred to Phase 1.5)
- AI search/recommendations (deferred to Phase 2)
- Recognition system (deferred to Phase 2)
- Governance checks (deferred to Phase 3)

---

### Phase 1.5: Pull Dynamics (Weeks 5-6)

**Goal**: Accelerate pull dynamics before Programmes engine

**Tasks**:
1. **People Enhancements**
   - Complete experience/comfort self-labels
   - Add capability labels
   - Implement AI Helper highlighting
   - Build "I can help with..." suggestions

2. **Mentor Matching**
   - Create mentor request form
   - Build mentor matching algorithm
   - Implement request workflow (pending → accepted → completed)
   - Add mentor capacity tracking
   - Create mentor dashboard

3. **Basic Recognition**
   - Implement reuse counter tracking
   - Create basic badge display
   - Build simple leaderboard
   - Add contribution tracking

**Deliverables**:
- Enhanced People module with matchmaking
- Working mentor matching workflow
- Basic recognition system

---

### Phase 2: Core Features (Weeks 7-10)

**Goal**: Complete core modules and workflows

**Tasks**:
1. **AI Maturity Dashboard**
   - Build dashboard layout
   - Implement metrics calculation utilities
   - Create metric cards
   - Add maturity stage visualization
   - Set up polling mechanism for metrics (every 5-10 minutes, not realtime)
   - Add team comparison view (with privacy)

2. **Library Enhancements**
   - Implement asset submission form with validation
   - Implement quality gates (Draft/Verified/Deprecated)
   - Build verification workflow
   - Add reuse tracking via `library_reuse_events` and `project_library_assets`
   - Create reuse visibility displays (from materialized view)
   - Implement deprecation workflow
   - Add reuse count refresh mechanism (materialized view or trigger)

3. **Recognition & Social Proof**
   - Build badge calculation service
   - Create comprehensive leaderboards
   - Implement impact stories feed
   - Add story submission form
   - Create celebration animations

4. **AI-Assisted Features**
   - Implement AI search (hybrid: PostgreSQL full-text + AI ranking - see Library Intelligence section)
   - Build recommendation engine (semantic similarity + reuse metrics)
   - Add "similar assets" suggestions (cached)
   - Create AI-assisted submission (generate structured fields)

5. **Close/Archive Capture**
   - Enhance project close/archive form
   - Add AI learning capture fields
   - Implement validation/nudges
   - Create learning summary display

**Deliverables**:
- Complete AI Maturity Dashboard
- Full Library with quality gates and reuse tracking
- Recognition system with badges and impact stories
- AI-assisted search and recommendations
- Learning capture on project close

---

### Phase 3: Advanced Features (Weeks 11-14)

**Goal**: Advanced features and optimization

**Tasks**:
1. **Late-Majority Barrier Reduction**
   - Build onboarding flow
   - Create programme templates
   - Implement starter kits by role
   - Add anonymous submission
   - Build sandbox mode
   - Implement graduated nudges
   - Create AI 101 micro-guide

2. **Governance**
   - Build AI readiness check form
   - Create risk assessment checklist
   - Add validation to status transitions
   - Implement sponsor commitment workflow

3. **Standardization Pathways**
   - Build reuse threshold detection (e.g., >10 reuses)
   - Create graduation workflow (template pack, workflow module, playbook)
   - Add notification system for graduations

4. **Advanced Metrics**
   - Implement all success metrics tracking
   - Build Gini coefficient calculation (defined below)
   - Add frontline vs leader gap analysis
   - Create metrics export functionality

**Gini Coefficient Definition** (Fully Specified):

**Population**: All authenticated users with profiles (not just contributors)
- Denominator: Total active users (users who logged in within last 90 days)
- Numerator: Users who made AI contributions in measurement window

**Time Window**: Last 30 days (fixed, not rolling)
- Window start: `Date.now() - 30 * 24 * 60 * 60 * 1000`
- Window end: `Date.now()`
- Recalculate daily via scheduled function

**Measure**: Count of distinct contribution events per user
- Count from `aiContributions` table
- Count all contribution types: `'library_asset'`, `'project_ai_artefact'`, `'verification'`, `'improvement'`
- One contribution = one document in `aiContributions` (regardless of type)
- Do NOT weight by type (all contributions equal)

**Calculation Formula**:
```
G = (2 * Σ(i * y_i)) / (n * Σ(y_i)) - (n + 1) / n
```
Where:
- `n` = total number of users (active users, not just contributors)
- `y_i` = contribution count for user `i` (sorted ascending, 0 for non-contributors)
- `i` = rank position (1 to n)

**Convex Implementation**:
```typescript
// convex/metrics.ts
export const getEarlyAdopterGini = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    
    // Get active users (logged in within last 90 days)
    const allProfiles = await ctx.db.query("profiles").collect();
    const activeUsers = allProfiles.filter(
      p => p._creationTime >= ninetyDaysAgo
    );
    
    // Get contribution counts for last 30 days
    const contributions = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();
    
    // Count contributions per user
    const contributionCounts = new Map<string, number>();
    contributions.forEach(c => {
      const count = contributionCounts.get(c.userId) || 0;
      contributionCounts.set(c.userId, count + 1);
    });
    
    // Create user-contribution pairs (0 for non-contributors)
    const userContributions = activeUsers.map(user => ({
      userId: user._id,
      count: contributionCounts.get(user._id) || 0,
    }));
    
    // Sort by count (ascending)
    userContributions.sort((a, b) => a.count - b.count);
    
    // Calculate Gini coefficient
    const n = userContributions.length;
    if (n === 0) return 0;
    
    const totalContributions = userContributions.reduce((sum, u) => sum + u.count, 0);
    if (totalContributions === 0) return 0;
    
    let sumRankTimesCount = 0;
    userContributions.forEach((user, index) => {
      const rank = index + 1;
      sumRankTimesCount += rank * user.count;
    });
    
    const gini = (2.0 * sumRankTimesCount) / (n * totalContributions) - (n + 1.0) / n;
    return Math.max(0, gini); // Ensure non-negative
  },
});
```

**Target Threshold**: Gini < 0.7
- If Gini >= 0.7: Trigger interventions (mentor matching nudges, barrier reduction campaigns)
- If Gini >= 0.8: Escalate to leadership (concentration risk)

**Reporting**: Display Gini coefficient on dashboard with:
- Current value
- Trend (vs last period)
- Interpretation ("Low concentration" / "Moderate concentration" / "High concentration")

5. **Performance Optimization**
   - Optimize database queries
   - Implement pagination
   - Add caching where appropriate
   - Optimize bundle size

**Deliverables**:
- Complete onboarding and barrier reduction
- Governance system
- Standardization pathways
- Full metrics suite
- Optimized performance

---

### Phase 4: Continuous Optimization (Ongoing)

**Goal**: Iterate based on usage and metrics

**Tasks**:
1. **AI Admin Nudges**
   - "This project hasn't posted an AI lesson - want help summarizing?"
   - Other contextual nudges

2. **A/B Testing**
   - Test onboarding flows
   - Test nudge messaging
   - Test UI variations

3. **Analytics & Monitoring**
   - Set up error tracking (Sentry or similar)
   - Add usage analytics
   - Monitor performance metrics

4. **User Feedback Loop**
   - Collect user feedback
   - Iterate on pain points
   - Continuous improvement

---

## Testing Strategy

### Unit Tests (`tests/`)

**Component Tests**:
- Test UI components in isolation
- Test user interactions
- Test accessibility (ARIA labels, keyboard navigation)

**Hook Tests**:
- Test custom hooks (useAuth, useLibrary, useMentor, etc.)
- Test data fetching and state management
- Test error handling

**Utility Tests**:
- Test metrics calculations
- Test search/recommendation algorithms
- Test data transformations

### Integration Tests

**API Integration**:
- Test Convex queries and mutations
- Test visibility enforcement in query handlers
- Test reactive query updates

**Workflow Tests**:
- Test complete user flows (e.g., submit asset → verify → reuse)
- Test mentor matching flow
- Test project lifecycle

### E2E Tests (Optional, using Playwright)

**Critical Paths**:
- User registration → profile setup → submit asset
- Mentor request → acceptance → completion
- Project creation → AI capture → close

### Test Coverage Goals
- Components: >80%
- Hooks: >90%
- Utilities: >90%
- Critical workflows: 100%

---

## Deployment Plan

### Forge Deployment

See [DEPLOY.md](./DEPLOY.md) for the exact copy-paste steps. Summary:

```bash
cd forge-native
npm run custom-ui:build
forge deploy -e production --non-interactive
forge install -e production --upgrade --non-interactive --site hackdaytemp.atlassian.net --product confluence
```

### Environment Variables

**Development** (`.env.local`):
```
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Production** (Forge environment variables):
- Set via `forge variables set -e production`
- See `forge variables list -e production` for current values

### Monitoring

- Configure error tracking (Sentry)
- Monitor Convex usage and performance (Convex Dashboard)
- Track key metrics (user adoption, Library reuse, etc.)

---

## Success Metrics Implementation

### Metrics Tracking

**Convex Query Functions** (TypeScript):

```typescript
// convex/metrics.ts
import { query } from "./_generated/server";

// Calculate % employees with AI contributions
export const getAiContributorPercentage = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    // Get contributors
    const contributions = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), thirtyDaysAgo))
      .collect();
    
    const contributorIds = new Set(contributions.map(c => c.userId));
    const contributorCount = contributorIds.size;
    
    // Get total profiles
    const allProfiles = await ctx.db.query("profiles").collect();
    const totalCount = allProfiles.length;
    
    return totalCount > 0 ? (contributorCount / totalCount) * 100 : 0;
  },
});

// Calculate % projects using AI artefacts
export const getProjectsWithAiPercentage = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "building"),
          q.eq(q.field("status"), "incubation"),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();
    
    let projectsWithAi = 0;
    for (const project of projects) {
      const hasAssets = await ctx.db
        .query("projectLibraryAssets")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .first();
      
      if (hasAssets) projectsWithAi++;
    }
    
    return projects.length > 0 ? (projectsWithAi / projects.length) * 100 : 0;
  },
});

// Weekly active AI contributors
export const getWeeklyActiveContributors = query({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const contributions = await ctx.db
      .query("aiContributions")
      .filter((q) => q.gte(q.field("_creationTime"), sevenDaysAgo))
      .collect();
    
    const uniqueContributors = new Set(contributions.map(c => c.userId));
    return uniqueContributors.size;
  },
});

// Gini coefficient calculation - see "Gini Coefficient Definition" section above
// Implementation uses aggregation queries instead of SQL
```

**Frontend Metrics Display**:
- Use React hooks to fetch metrics
- Display in Dashboard components
- Poll for updates every 5-10 minutes (or on user action)
- Cache metrics with appropriate TTL (5-10 minutes)
- Use materialized views for expensive calculations

### Metric Collection Points

1. **Library Asset Submission** → Create `ai_contributions` record
2. **Asset Reuse** → Create `library_reuse_events` record AND `project_library_assets` record
   - Refresh materialized view `library_asset_reuse_counts` (or use trigger)
3. **Project AI Artefact Attachment** → Create `project_library_assets` record
4. **Workflow Transformation** → Set `projects.workflow_transformed = TRUE`
5. **Verification** → Update `library_assets.status = 'verified'` AND create `ai_contributions` record (type: 'verification')
6. **Project Comments** → Create `project_comments` record (flag `is_ai_related` if applicable)
7. **Project Support** → Create `project_support_events` record

**Important**: Never update `reuse_count` directly from application code. Use database triggers or materialized views to maintain accuracy.

---

## Next Steps

1. **Review this roadmap** with stakeholders
2. **Set up project** (Vite + React + Convex + Clerk)
3. **Create database schema** (define in `convex/schema.ts`)
4. **Build Phase 1 MVP** following the phased approach
5. **Iterate** based on user feedback and metrics

---

## Organizational Model

### Single-Organization Assumption

**Current Design**: Single-organization platform (no multi-tenant support)

**Explicit Org Boundary Enforcement**:

1. **Email Domain Restriction** (Required):
   - Configure Clerk to restrict signups to approved email domains
   - In Clerk Dashboard: **User & Authentication** → **Restrictions** → Enable email domain restrictions
   - Add your company domain (e.g., `company.com`)
   - Clerk will reject signups from external domains at authentication layer

2. **Convex Query Enforcement** (Defense in Depth):
   ```typescript
   // In profile mutations, validate email domain
   export const upsert = mutation({
     args: { /* ... */ },
     handler: async (ctx, args) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new Error("Not authenticated");
       
       // Validate email domain (if not already validated by Clerk)
       const email = identity.email;
       if (!email?.endsWith("@company.com")) {
         throw new Error("Invalid email domain");
       }
       
       // ... rest of mutation
     },
   });
   ```

3. **Visibility Enforcement**:
   - All Convex queries check visibility using `ctx.auth.getUserIdentity()`
   - All authenticated users are considered org members
   - Public visibility (`'public'`) is optional and can be disabled via config
   - No `org_id` filtering needed (single org assumption)

4. **Team Structure** (Optional, Phase 3+):
   - Add `teams` table with `teamName`, `teamLeadId`
   - Add `teamMembers` join table
   - Support team-level metrics (with anonymity controls)
   - Team membership does not affect org boundary (all teams within same org)

**Future Multi-Tenant Support** (if needed):
- Add `org_id UUID` to all tables
- Update all RLS policies to filter by `org_id = current_org_id()`
- Add `organizations` table
- Add organization management UI
- Implement organization-level settings and isolation

---

## Additional Considerations

### Accessibility
- Ensure all components are keyboard navigable
- Add ARIA labels where needed
- Support screen readers
- Respect `prefers-reduced-motion`

### Performance
- Lazy load routes
- Optimize images
- Use React.memo where appropriate
- Implement virtual scrolling for long lists

### Security
- Enforce visibility checks in all Convex queries/mutations
- Validate all user inputs (both client and server-side)
- Sanitize content before display
- Rate limit API calls
- Use Clerk's built-in security features (password policies, 2FA, session management)

### Scalability
- Design for horizontal scaling
- Use database indexes effectively
- Implement pagination early
- Consider caching strategies

---

**Roadmap Version**: 2.3  
**Last Updated**: January 31, 2026  
**Status**: Updated for Convex implementation - Ready for Implementation

**Key Changes in v2.3**:
- Updated backend stack from Supabase to Convex + Clerk
- Converted SQL schema examples to Convex TypeScript patterns
- Updated RLS policies section to show Convex visibility patterns
- Replaced materialized views with Convex aggregation queries
- Updated SQL functions to Convex query/mutation equivalents
- Updated mentor capacity protection to use Convex atomic mutations
- Updated Gini coefficient calculation to Convex TypeScript implementation
- Updated org boundary enforcement to use Clerk domain restrictions
- Updated real-time section to reflect Convex reactive queries

**Key Changes in v2.2**:
- Removed duplicate Gini coefficient placeholder function (kept only fully specified version)
- Fixed Phase 2 "realtime updates" language to match reduced Realtime scope (polling instead)
- Verified all capability_tags references use join table terminology (no array references)
- Ensured single version block (removed any conflicting version statements)

**Key Changes in v2.1**:
- Added explicit org boundary enforcement (email domain restrictions)
- Completed RLS coverage for all tables (reuse events, contributions, badges, stories, support, recruitment, project-asset links, tags)
- Defined anonymous submission enforcement (data layer, UI layer, API masking, deanonymization rules)
- Specified materialized view refresh strategy (15-minute cron, permissions, monitoring)
- Added mentor capacity race condition prevention (transactional function with row locking)
- Fixed Phase 2 AI search inconsistency (removed "choose approach" language)
- Fully specified Gini metric (population, time window, measure, formula, thresholds)
- Added visibility rules for non-core objects (comments, support events, impact stories, badges respect project/asset visibility)

**Key Changes in v2.0**:
- Fixed dependency version specifications (ranges instead of patch versions)
- Reduced Realtime scope (only collaborative features)
- Replaced UUID arrays with proper join tables
- Fixed reuse_count to compute from events (materialized view)
- Added capability tags as proper table structure
- Changed experience_level to internal codes
- Added visibility controls (private/org/public) with proper RLS
- Enhanced auth policies to enforce author_id = auth.uid()
- Added missing collaboration tables (comments, support, members, recruitment)
- Defined Gini coefficient calculation properly
- Narrowed Phase 1 scope to realistic 6-week MVP
- Decided on AI search approach (hybrid: keyword + AI ranking)
- Fixed SQL function logical errors
- Clarified single-org assumption
- Defined badge criteria with anti-gaming measures
