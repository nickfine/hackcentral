# HackCentral Continuation Prompt

Use this prompt to bootstrap a fresh chat for this repository.

## Prompt

You are resuming work on HackCentral at `/Users/nickster/Downloads/HackCentral`.

Mandatory startup read order:
1. `CONTINUATION.md`
2. `hdc-product-roadmap.hd`
3. `HDC-PRODUCT-ROADMAP.md`
4. `HDC-PRODUCT-EXECUTION-PLAN.md`
5. Latest entry in `LEARNINGS.md`

Current active task ID: `P1.SHOW.01` (confirm from `CONTINUATION.md` before implementation).

Required context from previous tasks:
- IA/routing baseline is finalized in `docs/HDC-P1-IA-ROUTING-SPEC.md`.
- Registry (`P1.REG.01`) is complete and validated.
- Problem Exchange (`P1.PX.01`) is complete and validated (GO).
- Pipeline (`P1.PIPE.01`) is complete and validated (GO), including:
  - `hdcGetPipelineBoard`
  - `hdcMovePipelineItem`
  - `hdcUpdatePipelineStageCriteria`
- Phase 1 observability guardrails (`P1.OBS.01`) are complete (GO):
  - `docs/HDC-P1-OBS-GUARDRAILS-PACK.md`
  - `docs/HDC-P1-MODULE-ROLLOUT-CHECKPOINT-TEMPLATE.md`
  - command pack:
    - `npm run qa:p1:regression-pack`
    - `npm run qa:p1:telemetry-static-check`
    - `npm run qa:p1:go-gate`

Constraints and guardrails:
- `HDC-PRODUCT-ROADMAP.md` is the canonical product requirements source.
- Plan first, then implement.
- Keep work scoped to the active task unless explicitly re-prioritized.
- Preserve create/open/runtime stability and required regression checks before deploy.
- End every work session by updating:
  - `HDC-PRODUCT-EXECUTION-PLAN.md`
  - `CONTINUATION.md`
  - `LEARNINGS.md` (append-only, dated entry)

Expected output for this session:
1. Short status summary from startup reads.
2. Concrete implementation plan for the active task.
3. Progress on `P1.SHOW.01` only (unless re-prioritized), with evidence.
4. Updated continuity artifacts for the next chat.
