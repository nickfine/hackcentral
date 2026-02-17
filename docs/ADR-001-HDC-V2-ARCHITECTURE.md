# ADR-001: HDC v2 Runtime Architecture and Delivery Scope

Date: 2026-02-16  
Status: Accepted

## Context

`HackDayCentral_spec_v2.md` describes behavior and a data-storage model centered on Confluence page-property sharding.  
The implemented system in `forge-native` already uses Supabase as runtime storage for event and workflow state (`Event`, `EventAdmin`, `EventSyncState`, `EventAuditLog`, and related entities).

Recent incident-response work (Supabase permissions and legacy schema compatibility) restored working behavior in development and confirmed that continuing delivery on the current Supabase backbone is the fastest path to a stable v2 release.

## Decision

### 1) Runtime source of truth
- Supabase remains the primary runtime source of truth for HackDay Central v2.
- Confluence page metadata remains integration metadata (page linkage, navigation context), not primary workflow state storage.

### 2) Scope target
- Delivery target is **v2 MVP behavioral parity** with `HackDayCentral_spec_v2.md`.
- Storage-mechanism parity (strict Confluence page-property implementation) is explicitly out of current MVP scope.

## Rationale

- The current codebase and migrations are already Supabase-centric; changing storage architecture now would add high risk and delay.
- Production readiness depends more on workflow correctness, lifecycle enforcement, and permission integrity than on storage substrate.
- Recent fixes demonstrate we can absorb legacy schema variance without blocking user-critical workflows.

## Consequences

### Positive
- Fastest route to production-stable delivery.
- Lower migration risk for in-flight development.
- Clear execution path for Phases 1-5 in `PLAN_HDC_V2_EXECUTION.md`.

### Tradeoffs
- We carry technical debt from schema drift and compatibility logic.
- Strict spec storage model remains deferred and may require a future migration project.

## Guardrails

- `FORGE_DATA_BACKEND` should be `supabase` for production.
- Convex path is treated as optional compatibility/fallback in development, not production primary runtime.
- Any new schema changes must include migrations and backward-compatible read/write behavior where feasible.

## Migration strategy note

If strict Confluence page-property storage is required later, it should be treated as a dedicated post-MVP migration initiative with:
- data model mapping spec,
- replay/backfill tooling,
- dual-write cutover window,
- rollback plan.

## References

- `/Users/nickster/Downloads/HackCentral/HackDayCentral_spec_v2.md`
- `/Users/nickster/Downloads/HackCentral/PLAN_HDC_V2_EXECUTION.md`
- `/Users/nickster/Downloads/HackCentral/forge-native/src/backend/supabase/repositories.ts`
