-- Create Notification table for in-app notifications
-- Note: Using TEXT for id and userId to match User table structure
CREATE TABLE IF NOT EXISTS "Notification" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "type" TEXT NOT NULL CHECK ("type" IN ('TEAM_INVITE', 'JOIN_REQUEST', 'PHASE_CHANGE', 'REMINDER', 'SYSTEM')),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "actionUrl" TEXT,
  "metadata" JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");

-- Enable Row Level Security
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON "Notification"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON "Notification"
  FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Policy: System can create notifications (via service role)
-- Note: This will be handled via service role in application code

-- Enable Realtime for Notification table
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";;
