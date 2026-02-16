-- Add RLS policies to allow Forge backend (anon key) to access tables
-- These policies allow anonymous access for the Forge backend operations

-- User table: Allow anonymous reads (already exists) and writes for user creation/linking
DROP POLICY IF EXISTS "Forge backend can create users" ON "User";
CREATE POLICY "Forge backend can create users"
  ON "User"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Forge backend can update users by atlassian_id" ON "User";
CREATE POLICY "Forge backend can update users by atlassian_id"
  ON "User"
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- EventRegistration: Allow anonymous inserts for Forge backend
DROP POLICY IF EXISTS "Forge backend can register users" ON "EventRegistration";
CREATE POLICY "Forge backend can register users"
  ON "EventRegistration"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Team: Allow anonymous inserts and updates for Forge backend
DROP POLICY IF EXISTS "Forge backend can create teams" ON "Team";
CREATE POLICY "Forge backend can create teams"
  ON "Team"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Forge backend can update teams" ON "Team";
CREATE POLICY "Forge backend can update teams"
  ON "Team"
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Forge backend can delete teams" ON "Team";
CREATE POLICY "Forge backend can delete teams"
  ON "Team"
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- TeamMember: Allow anonymous operations for Forge backend
DROP POLICY IF EXISTS "Forge backend can manage team members" ON "TeamMember";
CREATE POLICY "Forge backend can manage team members"
  ON "TeamMember"
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Project: Allow anonymous inserts and updates for Forge backend
DROP POLICY IF EXISTS "Forge backend can manage projects" ON "Project";
CREATE POLICY "Forge backend can manage projects"
  ON "Project"
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Vote: Allow anonymous inserts and deletes for Forge backend
DROP POLICY IF EXISTS "Forge backend can manage votes" ON "Vote";
CREATE POLICY "Forge backend can manage votes"
  ON "Vote"
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- JudgeScore: Allow anonymous inserts and updates for Forge backend
DROP POLICY IF EXISTS "Forge backend can manage judge scores" ON "JudgeScore";
CREATE POLICY "Forge backend can manage judge scores"
  ON "JudgeScore"
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);;
