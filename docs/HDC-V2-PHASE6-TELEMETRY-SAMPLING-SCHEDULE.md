# HDC v2 Phase 6 Telemetry Sampling Schedule

Prepared at (UTC): 2026-02-18T15:33:00Z

## Purpose

Define a fixed cadence and ownership model for runtime telemetry sampling in production.

## Cadence

- Frequency: weekly
- Preferred window: Wednesday 15:00-16:00 UTC
- Environment: production
- Minimum evidence per run:
  - one `metric=registry_lookup`
  - one `metric=sync_execution`

## Ownership

- Primary owner: Engineering on-call
- Secondary owner: Product/Ops reviewer
- Escalation owner: Backend lead

## Sampling Procedure

1. Trigger one live registry read from production UI.
2. Trigger one admin sync action (`Complete + Sync` or `Retry Sync`) on canonical instance.
3. Pull logs via runbook command.
4. Copy matching lines into weekly artifact.
5. Mark sample as complete.

## Escalation Rules

- If both metrics are missing after controlled invocation: raise `SEV-3` and re-run once.
- If still missing on second attempt: raise `SEV-2` telemetry pipeline incident.
- If sync action fails with repeatable retryable error: track as `SEV-2` until stabilized.

## Record Format

For each weekly sample include:
- timestamp window,
- command used,
- matched log lines,
- pass/fail result,
- owner initials.
