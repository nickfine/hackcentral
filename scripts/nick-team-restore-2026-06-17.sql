-- Temporary removal of Nick Fine from team "WorkHood" to self-test the auto-assign toggle.
-- Captured 2026-06-17 before raw-deleting his TeamMember row.
-- RESTORE: re-inserts his exact OWNER membership and resets his flags.
-- First, make sure he isn't left on a stray auto-assigned team from testing:
DELETE FROM "TeamMember"
WHERE "userId" = '5dabd097-4664-43f0-9472-e9d74e9f24b2'
  AND status = 'ACCEPTED';

-- Re-insert his original WorkHood membership exactly as it was:
INSERT INTO "TeamMember" (id, "teamId", "userId", role, status, message, "createdAt")
VALUES (
  'member-a9acda16-67f0-4a51-9269-3234b671009c',
  'team-54e91472-fffc-4761-98d1-62ac2497da81',
  '5dabd097-4664-43f0-9472-e9d74e9f24b2',
  'OWNER',
  'ACCEPTED',
  NULL,
  '2026-06-13 23:44:42.248567'
);

-- Reset his flags to the captured state:
UPDATE "User"
SET "isFreeAgent" = false, "autoAssignOptIn" = false, "updatedAt" = now()
WHERE id = '5dabd097-4664-43f0-9472-e9d74e9f24b2';
