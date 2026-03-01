# HDC P3 Feed Baseline Checkpoint

- Timestamp (UTC): 2026-03-01T23:50:00Z
- Task: `P3.FEED.01`
- Roadmap refs: `R12.1`, `R12.2`
- Decision: `IN_PROGRESS` (baseline contract + resolver + Home lane shipped; live smoke pending)

## Completed in this slice

1. Added typed feed contract:
   - `docs/HDC-P3-FEED-CONTRACT-SPEC.md`
   - shared/frontend types for `GetHomeFeedInput`, `HomeFeedSnapshot`, activity + recommendation models.
2. Added backend resolver scaffold:
   - `SupabaseRepository.getHomeFeed(...)` with activity/recommendation assembly and source coverage status.
   - `hdcGetHomeFeed` wiring in backend service and Forge resolver index.
3. Added Home UI lane wiring:
   - "What's happening" activity feed lane.
   - "Recommended for you" recommendation lane.
4. Added contract regression coverage:
   - `tests/forge-native-feed-contract.spec.ts`

## Validation evidence

- `npm run test:run -- tests/forge-native-feed-contract.spec.ts` (`1/1` passing)
- `npm --prefix forge-native run typecheck` (pass)
- `npm --prefix forge-native/static/frontend run typecheck` (pass)

## Remaining for task close

1. Run live resolver smoke (`hdcGetHomeFeed`) against production data.
2. Run live Home UI smoke for feed + recommendation lanes.
3. Publish post-deploy checkpoint and update decision from `IN_PROGRESS` to `GO`.
