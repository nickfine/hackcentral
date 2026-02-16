-- Add settings columns to Event table for configurable admin settings
-- Note: Using Event table instead of separate EventSettings table for simplicity

ALTER TABLE "Event" 
ADD COLUMN IF NOT EXISTS "maxTeamSize" INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS "maxVotesPerUser" INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS "submissionDeadline" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "votingDeadline" TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN "Event"."maxTeamSize" IS 'Maximum number of members allowed per team';
COMMENT ON COLUMN "Event"."maxVotesPerUser" IS 'Maximum number of votes each user can cast';
COMMENT ON COLUMN "Event"."submissionDeadline" IS 'Deadline for project submissions';
COMMENT ON COLUMN "Event"."votingDeadline" IS 'Deadline for voting phase';;
