-- Create TeamInvite table for team captain invites to free agents
CREATE TABLE IF NOT EXISTS "TeamInvite" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "teamId" TEXT NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ,
  UNIQUE("teamId", "userId")
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "TeamInvite_userId_idx" ON "TeamInvite"("userId");
CREATE INDEX IF NOT EXISTS "TeamInvite_teamId_idx" ON "TeamInvite"("teamId");
CREATE INDEX IF NOT EXISTS "TeamInvite_status_idx" ON "TeamInvite"("status");

-- Enable Row Level Security
ALTER TABLE "TeamInvite" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own invites
CREATE POLICY "Users can view their own invites"
  ON "TeamInvite"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Policy: Team captains can view invites for their teams
CREATE POLICY "Team captains can view invites for their teams"
  ON "TeamInvite"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "TeamMember"
      WHERE "TeamMember"."teamId" = "TeamInvite"."teamId"
        AND "TeamMember"."userId" = auth.uid()::text
        AND "TeamMember"."role" = 'OWNER'
        AND "TeamMember"."status" = 'ACCEPTED'
    )
  );

-- Policy: Team captains can create invites
CREATE POLICY "Team captains can create invites"
  ON "TeamInvite"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TeamMember"
      WHERE "TeamMember"."teamId" = "TeamInvite"."teamId"
        AND "TeamMember"."userId" = auth.uid()::text
        AND "TeamMember"."role" = 'OWNER'
        AND "TeamMember"."status" = 'ACCEPTED'
    )
  );

-- Policy: Users can update their own invites (to accept/decline)
CREATE POLICY "Users can update their own invites"
  ON "TeamInvite"
  FOR UPDATE
  USING (auth.uid()::text = "userId");;
