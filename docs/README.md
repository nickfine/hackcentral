# HackCentral docs

Canonical docs for HDC architecture, plans, and ops.

## Source-of-truth order (for continuation)

1. `../STARTUP.md` - Canonical startup/shutdown ritual.
2. `../CONTINUATION.md` - Compact session handoff and next actions.
3. `../HDC-PRODUCT-EXECUTION-PLAN.md` - Live execution ledger (task IDs, status, evidence).
4. `../ROADMAP.md` - Canonical product requirements.
5. `../LEARNINGS.md` - Append-only session learnings and evidence.

## Top-level docs

| Doc | Purpose |
|-----|--------|
| `ADR-001-HDC-V2-ARCHITECTURE.md` | Architecture decision record. |
| `HDC-P1-IA-ROUTING-SPEC.md` | Phase 1 IA/routing implementation contract (`P1.IA.01`). |
| `HDC-P1-REGISTRY-CONTRACT-SPEC.md` | Phase 1 Knowledge Registry backend contract (`P1.REG.01`). |
| `HDC-P1-PROBLEM-EXCHANGE-CONTRACT-SPEC.md` | Phase 1 Problem Exchange backend contract (`P1.PX.01`). |
| `HDC-P1-PIPELINE-CONTRACT-SPEC.md` | Phase 1 Pipeline board contract (`P1.PIPE.01`). |
| `HDC-P1-SHOWCASE-CONTRACT-SPEC.md` | Phase 1 Showcase contract (`P1.SHOW.01`). |
| `HDC-P1-OBS-GUARDRAILS-PACK.md` | Phase 1 regression + telemetry gate pack (`P1.OBS.01`). |
| `HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md` | Standard GO/NO-GO checkpoint template for Phase 1 modules (`P1.OBS.01`). |
| `HDC-P3-EXTRACT-CONTRACT-SPEC.md` | Phase 3 extraction contract (`P3.EXTRACT.01`). |
| `HDC-P3-EXTRACT-OPS-RUNBOOK.md` | Phase 3 extraction replay/idempotency/rollback operations runbook (`P3.EXTRACT.01`). |
| `artifacts/HDC-P1-PIPE-ROLLOUT-CHECKPOINT-20260301-1108Z.md` | Phase 1 Pipeline rollout decision artifact (`P1.PIPE.01`). |
| `artifacts/HDC-P1-OBS-ROLLOUT-CHECKPOINT-20260301-1112Z.md` | Phase 1 observability guardrails checkpoint (`P1.OBS.01`). |
| `HDC-P1-PROBLEM-EXCHANGE-ROLLOUT-CHECKLIST.md` | Phase 1 Problem Exchange rollout gates and rollback checklist (`P1.PX.01`). |
| `HDC-P1-PROBLEM-EXCHANGE-MODERATION-RUNBOOK.md` | Phase 1 Problem Exchange moderation authority runbook (`P1.PX.01`). |
| `HDC-HACKDAY-TEMPLATE-SPINOUT-PLAN.md` | HackDay template spinout summary and completion status. |
| `HDC-CREATE-CHILD-HACKDAY-FLOW.md` | Creating a child HackDay from HDC. |
| `HDC-HACKDAY-TEMPLATE-OPS-RUNBOOK.md` | Ops runbook for template provisioning. |
| `HDC-HACKDAY-TEMPLATE-RELEASE-CHECKLIST.md` | Release checklist. |
| `HDC-HACKDAY-TEMPLATE-PROVISION-SMOKE-TEMPLATE.md` | Smoke test template. |
| `HDC-V2-PHASE*.md` | Historical phase plans and runbooks. |
| `HackDay_Design_system.md` | Design system reference. |

## Folders

| Folder | Purpose |
|--------|---------|
| `archive/` | Historical progress, code reviews, and old plans. See `archive/README.md`. |
| `artifacts/` | Timestamped run outputs (dry runs, verifications). See `artifacts/README.md`. |
| `components/` | Component docs. |
