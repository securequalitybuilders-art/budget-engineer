# Budget Engineer Studio — DzeNhare Secure Quality Building OS

A local-first, **free/open-source**, enterprise-grade **Computational Design OS**:

> AI brief → 2D CAD plan → 3D BIM model → engineering quantities → multi-currency BOQ → issued dossier.
> *Construction Affordable for Everyone.*

No paid APIs. No cloud. Runs entirely in the browser with offline persistence.

---

## Quick start

```bash
cd budget-engineer-os
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run typecheck
```

> **Build notes (for agents/CI):** `node_modules` is not committed — run `npm install`
> first. Use `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/vite build`
> (a bare `npx tsc` may resolve the wrong package).

---

## Tech stack (all free OSS)

| Concern | Library | Notes |
|---|---|---|
| UI | React 18 + TypeScript | Vite build |
| State | Zustand | single store, `src/store/appStore.ts` |
| Persistence | Dexie (IndexedDB) | offline-first, `src/lib/db.ts` (v2) |
| 3D | three.js | **lazy-loaded**, own `three-vendor` chunk |
| Drawings | hand-rolled SVG | plans, section, dossier — DOM-free, printable |

**Bundle:** main `index` ~171 KB (56 KB gz); `three-vendor` ~457 KB (115 KB gz) is
deferred and only downloads when the user opens the 3D viewer.

---

## The pipeline (data flow)

```
 brief text ──▶ parseBrief ──▶ generateDesignFromBrief ──▶ CadDocument
                                                              │
                                          (edit plan / material / region / etc.)
                                                              ▼
                                            ┌─────── regenAndPersist ───────┐
                                            │  generateBimModel(cad)        │
                                            │  generateBoqFromBim(bim,...)  │
                                            │  persist cad/bim/boq (Dexie)  │
                                            │  log TransactionEvent (audit) │
                                            └───────────────┬───────────────┘
                                                            ▼
       2D plan (SVG)   3D BIM (three.js)   section (SVG)   BOQ + charts   dossier (HTML/PDF)
```

Every design-changing action funnels through **one write path** (`regenAndPersist` in
`appStore.ts`), so geometry edits always propagate to BIM, BOQ, 3D, audit log, and the
revision fingerprint.

---

## Architecture map

```
src/
  domain/types.ts          Cad/Bim/Boq/Transaction/Revision/Project types (source of truth)
  ai/
    briefParser.ts         brief → ParsedBrief (regex; parseBriefAsync seam for a local LLM)
    designEngine.ts        ParsedBrief → multi-floor CadDocument (parametric)
  engine/
    bimGenerator.ts        CadDocument → BimModel (walls/slabs/roof/openings/beams/zones; stairwell voids)
    boqGenerator.ts        BimModel + RateCard + RebarSpec + FootingSchedule → BOQ (12 categories)
  lib/
    cadSeed.ts             two-storey demo seed
    db.ts                  Dexie schema (projects, cadDocs, bimModels, boqs, transactions, revisions)
    currency.ts            currency symbol/format
    rateCard.ts            regional rate cards (Zimbabwe/CWICR, ZA, KE, Global) — editable
    rebarSpec.ts           parametric reinforcement (bar Ø / spacing / layers → kg/m²)
    loadEngine.ts          dead/live loads + combinations (SLS 1.0G+1.0Q, ULS 1.2G+1.5Q)
    footingSizer.ts        pad sizing from load + soil; rebar; excavation/formwork
    fingerprint.ts         design content hash (stale-issue detection)
    designMetrics.ts       headline metrics + change summary
    drawingRegister.ts     sheet numbers (A-101…), revision history, nextRev
    titleBlock.ts          SVG title block
    planSvg.ts             static 2D plan SVG (+ section marker)
    sectionSvg.ts          static section SVG (selectable A–A / B–B cut)
    boqExport.ts           CSV + printable HTML dossier (plans + section + BOQ)
  engine/, components/, routes/, store/
  components/
    cad/CadPlanView.tsx        interactive 2D plan (selectable + editable drag)
    cad/SectionView.tsx        section panel (axis + cut slider)
    bim/BimViewer.tsx          three.js 3D scene (default export, lazy)
    bim/BimViewerPanel.tsx     lazy gate + legend
    charts/                    KpiCards, CostBreakdownChart
    panels/                    AiBrief, Boq, Export, Material, RateCard, Rebar, LoadAnalysis,
                               FootingSizing, TransactionHistory
  routes/BimRoute.tsx      the workspace (assembles everything)
  store/appStore.ts        Zustand store + regenAndPersist write path
  App.tsx, main.tsx, index.css
```

---

## Non-negotiable rules (carried from the brief)

1. **Free/open-source only** — no paid APIs. AI is local (regex now; LLM-swappable via
   `parseBriefAsync`).
2. **Local-first** — all state in IndexedDB; works offline.
3. **Audit everything** — every mutation logs an immutable `TransactionEvent`.
4. **Real geometry → real quantities** — quantities/loads/rebar from formulae, not magic numbers.
5. **Persist real code** — never claim "done" without files on disk that pass `tsc` + `vite build`.

## Brand
Dark-first Dzenhare system — see `brandguidelines.md`. Deep Cobalt `#1a365d`,
Warm Sand `#d4a574`, AI Cyan `#06b6d4`, BIM Violet `#8b5cf6`, Dark Base `#0b1220`.

## Where to look next
- `CRITICAL_PATH_ANALYSIS.md` — prioritised roadmap.
- `FEATURE_INDEX.md` — every feature mapped to its stage doc + source files.
- `gemini.md` — AntiGravity system prompt for AI coding agents working on this repo.
