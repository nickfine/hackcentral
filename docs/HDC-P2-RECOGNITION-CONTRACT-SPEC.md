# HDC P2 Recognition Contract Spec

Last updated: 2026-03-01 16:48 GMT
Owner: HackDay Central Engineering
Task ID: `P2.RECOG.01`
Roadmap refs: `R8.1`, `R8.2`

## Scope

This spec defines the Phase 2 Recognition contract shipped via `getBootstrapData`.

This iteration locks mentor and pathway contribution signal policies first, before full badge automation and full contribution-type leaderboard rollout.

## API Contract

`BootstrapData` now includes:

```ts
recognition?: RecognitionSnapshot | null
```

`RecognitionSnapshot` shape (policy baseline):

```ts
{
  mentorSignal: {
    calculatedAt: string;
    policyVersion: "r8-mentor-sessions-used-v1";
    policySource: "User.mentor_sessions_used";
    badgeThreshold: number;
    leaderboardLimit: number;
    qualifiedMentorChampionCount: number;
    leaderboard: Array<{
      userId: string;
      userName: string;
      mentorSessionsUsed: number;
      rank: number;
      qualifiesMentorChampion: boolean;
    }>;
  };
  pathwaySignal: {
    calculatedAt: string;
    policyVersion: "r8-pathway-completion-v1";
    policySource: "PathwayProgress";
    badgeThresholdDistinctPathways: number;
    leaderboardLimit: number;
    qualifiedPathwayContributorCount: number;
    leaderboard: Array<{
      userId: string;
      userName: string;
      distinctPathwayCount: number;
      completedStepCount: number;
      lastCompletedAt: string | null;
      rank: number;
      qualifiesPathwayContributor: boolean;
    }>;
  };
  leaderboards: {
    builders: Array<{ userId: string; userName: string; count: number; rank: number }>;
    sharers: Array<{ userId: string; userName: string; count: number; rank: number }>;
    solvers: Array<{ userId: string; userName: string; count: number; rank: number }>;
    mentors: Array<{ userId: string; userName: string; count: number; rank: number }>;
  };
  viewerBadges: {
    firstArtifactPublished: boolean;
    firstProblemSolved: boolean;
    fiveArtifactsReused: boolean;
    mentoredThreePeople: boolean;
    contributedToPathway: boolean;
  };
}
```

## Mentor Signal Policy (`R8` decision gate)

Policy locked for P0 implementation:

1. **Signal source**: `User.mentor_sessions_used`.
2. **Badge threshold (`R8.1` mentor condition)**: qualifies when `mentor_sessions_used >= 3`.
3. **Normalization**: non-finite or negative values are coerced to `0`.
4. **Leaderboard metric (`R8.2` mentors lane)**: rank by `mentor_sessions_used` descending.
5. **Deterministic tie-breakers**:
   - `userName` ascending
   - `userId` ascending
6. **Leaderboard cap**: top `25` entries.

Rationale:
- Live schema currently has no dedicated mentorship session table, no recognition event table, and no badge table.
- `User.mentor_sessions_used` is the only production field with stable semantics for mentor contribution volume.

## Pathway Contribution Signal Policy (`R8.1` decision gate)

Policy locked for P0 implementation:

1. **Signal source**: `PathwayProgress`.
2. **Badge threshold (`R8.1` pathway contribution condition)**: qualifies when a user has completions in at least `1` distinct pathway (`distinct pathway_id >= 1`).
3. **Leaderboard metric**: rank users by pathway contribution depth:
   - `distinctPathwayCount` descending
   - `completedStepCount` descending
4. **Deterministic tie-breakers**:
   - `userName` ascending
   - `userId` ascending
5. **Leaderboard cap**: top `25` entries.

Rationale:
- `PathwayProgress` is the only production table with user-level pathway participation events.
- Authoring fields (`Pathway.created_by_user_id` / `updated_by_user_id`) represent curation ownership, not pathway participation/adoption.

## Implementation Notes

- Backend computation lives in `forge-native/src/backend/supabase/repositories.ts` (`buildRecognitionSnapshot`).
- Frontend Team Pulse recognition mentor list now consumes `bootstrap.recognition.mentorSignal.leaderboard` when present.
- Dashboard mentor badge count now uses `qualifiedMentorChampionCount`.
- Dashboard pathway badge count now uses `qualifiedPathwayContributorCount`.
- Segmented leaderboard payload for `R8.2` is now emitted as:
  - `recognition.leaderboards.builders`
  - `recognition.leaderboards.sharers`
  - `recognition.leaderboards.solvers`
  - `recognition.leaderboards.mentors`
- Viewer badge automation payload for `R8.1` is now emitted as:
  - `recognition.viewerBadges`

## Validation

```bash
npm run test:run -- tests/forge-native-recognition-mentor-policy-contract.spec.ts
npm run test:run -- tests/forge-native-team-pulse-metrics-contract.spec.ts tests/forge-native-recognition-mentor-policy-contract.spec.ts
npm --prefix forge-native run typecheck
npm --prefix forge-native/static/frontend run typecheck
```
