-- Enable RLS on all tables
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JudgeScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Milestone" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER POLICIES
-- =============================================
-- Anyone can read users (for team browsing)
CREATE POLICY "Users are viewable by everyone" ON public."User"
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public."User"
  FOR UPDATE USING (auth.uid()::text = id);

-- =============================================
-- TEAM POLICIES
-- =============================================
-- Anyone can view public teams
CREATE POLICY "Public teams are viewable by everyone" ON public."Team"
  FOR SELECT USING ("isPublic" = true OR EXISTS (
    SELECT 1 FROM public."TeamMember" 
    WHERE "TeamMember"."teamId" = "Team".id 
    AND "TeamMember"."userId" = auth.uid()::text
    AND "TeamMember".status = 'ACCEPTED'
  ));

-- Authenticated users can create teams
CREATE POLICY "Authenticated users can create teams" ON public."Team"
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Team owners can update their team
CREATE POLICY "Team owners can update team" ON public."Team"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public."TeamMember" 
    WHERE "TeamMember"."teamId" = "Team".id 
    AND "TeamMember"."userId" = auth.uid()::text
    AND "TeamMember".role = 'OWNER'
    AND "TeamMember".status = 'ACCEPTED'
  ));

-- Team owners can delete their team
CREATE POLICY "Team owners can delete team" ON public."Team"
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public."TeamMember" 
    WHERE "TeamMember"."teamId" = "Team".id 
    AND "TeamMember"."userId" = auth.uid()::text
    AND "TeamMember".role = 'OWNER'
    AND "TeamMember".status = 'ACCEPTED'
  ));

-- =============================================
-- TEAM MEMBER POLICIES
-- =============================================
-- Team members and owners can see membership
CREATE POLICY "Team membership viewable by team members" ON public."TeamMember"
  FOR SELECT USING (
    "userId" = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public."TeamMember" tm
      WHERE tm."teamId" = "TeamMember"."teamId"
      AND tm."userId" = auth.uid()::text
      AND tm.status = 'ACCEPTED'
    )
  );

-- Anyone can request to join (create pending membership)
CREATE POLICY "Users can request to join teams" ON public."TeamMember"
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    "userId" = auth.uid()::text AND
    status = 'PENDING'
  );

-- Team owners can update membership status
CREATE POLICY "Team owners can manage membership" ON public."TeamMember"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public."TeamMember" tm
    WHERE tm."teamId" = "TeamMember"."teamId"
    AND tm."userId" = auth.uid()::text
    AND tm.role = 'OWNER'
    AND tm.status = 'ACCEPTED'
  ));

-- Users can delete their own membership (leave team)
CREATE POLICY "Users can leave teams" ON public."TeamMember"
  FOR DELETE USING ("userId" = auth.uid()::text);

-- =============================================
-- PROJECT POLICIES
-- =============================================
-- Anyone can view submitted projects
CREATE POLICY "Projects are viewable by everyone" ON public."Project"
  FOR SELECT USING (true);

-- Team members can create/update projects
CREATE POLICY "Team members can create projects" ON public."Project"
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public."TeamMember"
    WHERE "TeamMember"."teamId" = "Project"."teamId"
    AND "TeamMember"."userId" = auth.uid()::text
    AND "TeamMember".status = 'ACCEPTED'
  ));

CREATE POLICY "Team members can update projects" ON public."Project"
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public."TeamMember"
    WHERE "TeamMember"."teamId" = "Project"."teamId"
    AND "TeamMember"."userId" = auth.uid()::text
    AND "TeamMember".status = 'ACCEPTED'
  ));

-- =============================================
-- VOTE POLICIES
-- =============================================
-- Vote counts are public (for results)
CREATE POLICY "Votes are viewable by everyone" ON public."Vote"
  FOR SELECT USING (true);

-- Users can create votes (with limit enforced in app)
CREATE POLICY "Users can vote" ON public."Vote"
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    "userId" = auth.uid()::text
  );

-- Users can remove their own votes
CREATE POLICY "Users can remove own votes" ON public."Vote"
  FOR DELETE USING ("userId" = auth.uid()::text);

-- =============================================
-- JUDGE SCORE POLICIES
-- =============================================
-- Scores are viewable by everyone (for results)
CREATE POLICY "Judge scores are viewable" ON public."JudgeScore"
  FOR SELECT USING (true);

-- Only judges can create scores
CREATE POLICY "Judges can create scores" ON public."JudgeScore"
  FOR INSERT WITH CHECK (
    auth.uid()::text = "judgeId" AND
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE id = auth.uid()::text
      AND role IN ('JUDGE', 'ADMIN')
    )
  );

-- Judges can update their own scores
CREATE POLICY "Judges can update own scores" ON public."JudgeScore"
  FOR UPDATE USING (
    "judgeId" = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE id = auth.uid()::text
      AND role IN ('JUDGE', 'ADMIN')
    )
  );

-- =============================================
-- EVENT POLICIES
-- =============================================
-- Events are viewable by everyone
CREATE POLICY "Events are viewable by everyone" ON public."Event"
  FOR SELECT USING (true);

-- Only admins can modify events
CREATE POLICY "Admins can manage events" ON public."Event"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public."User"
    WHERE id = auth.uid()::text
    AND role = 'ADMIN'
  ));

-- =============================================
-- EVENT REGISTRATION POLICIES
-- =============================================
CREATE POLICY "Registrations viewable by everyone" ON public."EventRegistration"
  FOR SELECT USING (true);

CREATE POLICY "Users can register for events" ON public."EventRegistration"
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    "userId" = auth.uid()::text
  );

-- =============================================
-- MILESTONE POLICIES
-- =============================================
CREATE POLICY "Milestones are viewable by everyone" ON public."Milestone"
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage milestones" ON public."Milestone"
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public."User"
    WHERE id = auth.uid()::text
    AND role = 'ADMIN'
  ));;
