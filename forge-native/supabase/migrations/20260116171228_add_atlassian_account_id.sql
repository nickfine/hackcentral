-- Add atlassian_account_id column to User table for identity linking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS atlassian_account_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_user_atlassian_id ON "User"(atlassian_account_id);;
