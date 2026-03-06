# HDC Predeploy Event Backup Snapshot Sweep

Generated at (UTC): 2026-03-06T00:29:20.332Z
Environment: production
Dry run: false
Requested event ids: all active events
Candidate count: 2
Processed count: 2

## Summary
- Created: 0
- Planned: 0
- Failed: 2
- Skipped: 0
- Duration (ms): 11282

## Results
- eventId=7047d6d2-16a7-4d08-aea2-fb9ac26f8125 status=failed name=HackDay 2026
  - lifecycle: registration
  - runtimeType: hackday_template
  - error: Backup snapshot metadata insert returned no rows.
- eventId=d3f7bb14-7d8f-4e92-8740-23b02994b4d4 status=failed name=Shona's IT Hack
  - lifecycle: registration
  - runtimeType: hackday_template
  - error: Backup snapshot metadata insert returned no rows.

