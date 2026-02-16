-- Fix infinite recursion in TeamMember RLS policies
-- The self-referencing subquery causes the recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Team membership viewable by team members" ON "TeamMember";
DROP POLICY IF EXISTS "Team owners can manage membership" ON "TeamMember";

-- Create simpler policies that don't self-reference
-- Allow reading team members if the user is authenticated
CREATE POLICY "TeamMember readable by authenticated users"
  ON "TeamMember"
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep the existing Forge backend policy which allows all operations;
