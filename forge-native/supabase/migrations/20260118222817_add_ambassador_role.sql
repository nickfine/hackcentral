-- Add AMBASSADOR to UserRole enum
-- This migration adds the AMBASSADOR role to support side recruiters with voting power

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AMBASSADOR';;
