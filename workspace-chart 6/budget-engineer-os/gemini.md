# gemini.md — AntiGravity System Prompt / Context for Budget Engineer OS

You are an AI coding agent working on **Budget Engineer Studio — DzeNhare Secure Quality
Building OS**, a local-first, enterprise-grade **Computational Design OS**:

> AI brief → 2D CAD plan → 3D BIM model → engineering quantities → multi-currency BOQ →
> issued dossier. *"Construction Affordable for Everyone."*

## Hard rules (non-negotiable)

1. **Free / open-source only.** No paid APIs, no SaaS keys, no metered cloud inference.
   AI runs locally (deterministic parser today; WebLLM / transformers.js / Ollama later)
   behind the `parseBriefAsync` seam in `src/ai/briefParser.ts`.
2. **Local-first.** All state persists in IndexedDB via Dexie (`src/lib/db.ts`). Must
   work fully offline.
3. **Audit everything.** Every design-changing mutation goes through the single
   `regenAndPersist` write path in `src/store/appStore.ts` and logs an immutable
   `TransactionEvent`.
4. **Real geometry → real quantities.** Quantities/loads/rebar/footings come from
   formulae over the model, not magic numbers.
5. **Persist real code.** Never report "done" without files on disk that pass
   `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/vite build`, plus a
   round-trip verification (a temporary `.mjs` run via `npx tsx`, deleted after).

## Build / environment notes (IMPORTANT)

- `node_modules` is pruned between sessions → run `npm install` before building.
- Use `./node_modules/.bin/tsc` and `./node_modules/.bin/vite` (a bare `npx tsc` may grab
  the wrong package).
- Use **workspace-relative** paths only (never absolute `/home/user/...` in write_file).
- three.js is heavy: keep it **lazy** and in its own `three-vendor` chunk; never put it on
  the initial critical path.

## Architecture (single source of truth)

- `src/domain/types.ts` — all types.
- `src/ai/{briefParser,designEngine}.ts` — brief → multi-floor CadDocument.
- `src/engine/bimGenerator.ts` — CAD → BIM (incl. stairwell voids + trimmer beams).
- `src/engine/boqGenerator.ts` — BIM + RateCard + RebarSpec + FootingSchedule → BOQ
  (12 categories; markups contingency/fees/VAT from the rate card).
- `src/lib/*` — rateCard, rebarSpec, loadEngine, footingSizer, fingerprint, designMetrics,
  drawingRegister, titleBlock, planSvg, sectionSvg, boqExport, currency, db, cadSeed.
- `src/components/{cad,bim,charts,panels}`, `src/routes/BimRoute.tsx`, `src/store/appStore.ts`.

## Current state (accurate as of Stage 68)

Working, `tsc`-clean, ~171 KB main bundle (three deferred):

- AI brief → parametric **multi-floor** CAD → BIM → structure (loads, footings, rebar,
  beams) → **12-category multi-currency BOQ**.
- **Editable 2D plan** (drag walls/objects → regenerate + persist + audit).
- **3D BIM viewer** (lazy three.js, extruded model).
- Selectable **section** (A–A / B–B) with plan marker; per-floor **plans**; **issued
  dossier** (title blocks, drawing register, revision history, fingerprint-based stale
  detection + change summary + auto-noted bumps).
- Offline Dexie persistence; transaction/audit log; revisions table.

## Definition of done for any change

Files on disk · `tsc` clean · `vite build` success · a verified round-trip showing
quantities/cost/geometry change correctly · a `STAGEnn_*.md` doc · brand + audit preserved
· `FEATURE_INDEX.md` updated.

## Prioritisation

Follow `CRITICAL_PATH_ANALYSIS.md`. Prefer features that **unblock other work** or close a
**stated-vision gap** over low-leverage polish. Remaining critical-path items: multi-project
management, then local-LLM brief parsing. Avoid further drawing-marker micro-polish unless
a client requests it.
