# Tooling Library — design and roadmap

The Tooling Library is HackCentral's store of the AI *working files* people develop, distinct from hacks: `CLAUDE.md` and `agents.md` (how they direct AI), `memory.md` and `learnings.md` (domain knowledge), skills, and similar. The goal is org-wide knowledge sharing and learning.

It is built on the existing **Learnings & Memories** feature (Convex `learnings` table), grown into a content-based library rather than a new system. It is surfaced under **Library → AI working files** (see the IA section below). The link-based artifact registry (Supabase `Artifact`) sits beside it under **Library → Reusable artifacts**.

> Note on terminology: this doc has two independent "phase" tracks. **Analysis tiers** (below) describe the AI-analysis roadmap. **IA phases** (the section after) describe the information-architecture reshape. They are not the same phases.

## v1 — shipped

Capture, find, download, done well.

- **Capture** — paste markdown or drag-drop / browse files. Accepts `.md`, `.markdown`, `.txt`. 256KB cap, empty/binary rejected. Multi-drop fans into a review list, one draft per file, each pre-typed from its filename via `detectKindFromFilename`. Content is stored verbatim, never rewritten.
- **Taxonomy** — `kind`: `operating_context` (CLAUDE.md, agents.md), `memory` (memory.md), `learning` (learnings.md, notes), `skill`, `other`. Filename drives auto-detection; the user can override.
- **Visibility** — `private` / `org` / `public`, default `org`. Private items are visible only to their author. Legacy rows with no visibility are treated as `org`.
- **Find** — search (title, description and content), kind filter, tags, author, "useful" status.
- **Download** — single file, verbatim, original filename preserved. Reuses `downloadText`.

Schema is additive: `kind`, `visibility`, `byteSize`, `contentHash` plus four analysis-stub fields are all optional on the `learnings` table, so pre-existing rows stay valid.

## Information architecture (Showcase / Library / AI Toolkit)

Shipping v1 exposed a pre-existing collision in the whole Tooling area: 4 overlapping surfaces (Tooling, Library, HackDay Hacks, + learnings) and 3 clashing type vocabularies (showcase `assetType`, `ArtifactType`, `LearningKind` — "skill" in all three). Diagnosis: the area conflated two jobs — *reusable tooling you apply* vs *the episodic record of what got built at hackdays*. Agreed fix reconciles vocabularies at the presentation layer, **no data migration**.

**IA Phase 1 — shipped (Forge 2.310.0/2.311.0):**
- Renamed the "Tooling" view → **Showcase** (curated hacks only: All/Skills/Prompts/Apps).
- Moved the Learnings surface into the **Library** view as a 2-tab switch: **Reusable artifacts** (Supabase `Artifact`, link-based) | **AI working files** (Convex `learnings`, content-based).
- Promoted **Library** into the primary nav (was deep-link-only).
- De-collided the 3 vocabularies via view-scoped labels; later simplified to clean nouns (Skill/Prompt/Template/Learning/Code snippet) once "Skills" vs "Skill reference" read as redundant. Stored enums untouched.

**IA Phase 2 — target (not built; needs its own plan + approval):**
- **AI Toolkit** — collapse Library's two tabs + curated Showcase hacks into one faceted browse: purpose facets (Prompts, Skills, Apps & code, Operating setups, Learnings & memory, Other) + a **form chip** (◆ content / ↗ link / ⚑ hackday) + source/visibility/featured filters. The form chip carries the link-vs-content distinction so a "skill" is just a "skill", killing the residual label duplication. Vocabulary reconciled via a read-time mapping; no migration.
- **HackDay Gallery** — the `hacks_exchange` all-submissions record, browsable by event/team, with a "Promote to Toolkit" action formalising the existing featured-showcase mechanic.
- **Defer** the cross-backend union read API (the one genuinely risky piece) unless data volume forces it.

## Analysis roadmap (tiers)

"Analyse the files" splits into three tiers in rising order of value and effort. (Independent of the IA phases above.)

### Tier 1 — per-artefact analysis (on capture)

Runs on every file. Auto-summary, suggested tags, detected tools/models/MCPs, a completeness signal, and a check that content matches the filename-detected kind. This is what makes the library browsable rather than a pile of blobs.

- **Mechanism** — Forge has no native LLM. A resolver (or Convex action) calls the Anthropic API via manifest `permissions.external.fetch`. The manifest currently allowlists Supabase, Convex and Atlassian only — add `api.anthropic.com`. The API key is held as a Forge env secret, never in source.
- **When** — async, not on the capture click. Capture stays instant; analysis fills in behind an "analysing" state. The `analyze` mutation stub in `convex/learnings.ts` and the `analysisSummary` / `analysisTags` / `analysisModel` / `analyzedAt` fields are the landing place.
- **Model** — Haiku is plenty for per-file work.

### Tier 2 — cross-corpus digest (the org-learning prize)

Cluster by domain, surface conventions emerging independently across people's CLAUDE.md files, highlight the most-reused, name the gaps where nobody has tooling yet. Output is a periodic "what the org learned this hackday" digest. Run on Sonnet, periodically, not per-file.

### Tier 3 — ask-the-corpus (RAG)

Chat over everyone's tooling ("how are people handling test setup with Claude here"). Needs embeddings and vector search. Path: Supabase pgvector, or Convex vector search. The last tier, once there is enough content to be worth searching.

## Cost spectrum

These files are small (256KB cap, usually a few KB). Per-file analysis on Haiku is a fraction of a penny each, so a whole hackday's intake is pennies to low single-pound territory. The cross-corpus digest on Sonnet, run periodically, is a few pence per run. Embeddings for ask-the-corpus are similarly trivial at this volume. There is no version of this that is expensive at hackday scale — the real cost is engineering time on the UX.

## Fast-follows / options not yet built

- **Bundle download** — zip a person's / team's / a tag's artefacts client-side (JSZip). v1 ships single-file only.
- **Unify with the link-based Artifact registry** — one content library covering both. Bigger: a cross-backend (Supabase + Convex) migration. Deferred deliberately.
- **Confluence-page backing** — optional rendering / commenting layer on top of the stored markdown. Not the source of truth.

## Key files

- `convex/schema.ts` — `learnings` table (kind, visibility, byteSize, contentHash, analysis stub fields)
- `convex/learnings.ts` — upload/list/updateMetadata + `analyze` stub
- `forge-native/src/backend/hackcentral.ts` — passthrough of the new fields
- `forge-native/src/shared/types.ts` + `forge-native/static/frontend/src/types.ts` — `LearningKind`, `LearningVisibility`, extended interfaces
- `forge-native/static/frontend/src/App.tsx` — capture modal, paste, `detectKindFromFilename`, validation, kind filter, verbatim download, analysis stub panel
