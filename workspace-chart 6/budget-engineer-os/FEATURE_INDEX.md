# Feature Index — Budget Engineer OS

Every shipped capability, its source files, and its stage doc. Use this to locate or
merge any piece. All features are verified (`tsc` clean + `vite build` + a round-trip test).

| # | Feature | Key source files | Stage doc |
|---|---|---|---|
| Core | Domain types (Cad/Bim/Boq/Txn/Revision/Project) | `src/domain/types.ts` | — |
| Core | BIM generator (walls/slabs/roof/openings/beams/zones) | `src/engine/bimGenerator.ts` | — |
| Core | BOQ generator (12 categories, markups) | `src/engine/boqGenerator.ts` | — |
| Core | Zustand store + `regenAndPersist` write path | `src/store/appStore.ts` | — |
| Core | Dexie persistence (offline) | `src/lib/db.ts` | — |
| AI | Brief → design (regex; LLM-swappable) | `src/ai/briefParser.ts`, `src/ai/designEngine.ts` | 51 |
| 42 | Rebar spec override (Ø / spacing / layers) | `src/lib/rebarSpec.ts` | STAGE42 |
| 43 | Load combinations (SLS / ULS) | `src/lib/loadEngine.ts` | STAGE43 |
| 44 | Regional cost database (ZW/ZA/KE/Global) | `src/lib/rateCard.ts`, `src/lib/currency.ts` | STAGE44 |
| 45 | Footing sizing from load + soil | `src/lib/footingSizer.ts` | STAGE45 |
| 46 | Sized footings → BOQ | `src/engine/boqGenerator.ts` | STAGE46 |
| 47 | Currency-aware BOQ export (CSV + PDF) | `src/lib/boqExport.ts` | STAGE47 |
| 48 | 2D plan in dossier | `src/lib/planSvg.ts` | STAGE48 |
| 49 | Footing reinforcement | `src/lib/footingSizer.ts` | STAGE49 |
| 50 | Multi-floor support | `src/lib/cadSeed.ts`, `bimGenerator.ts` | STAGE50 |
| 51 | Multi-floor AI generation | `src/ai/designEngine.ts`, `briefParser.ts` | STAGE51 |
| 52 | Excavation & formwork | `src/lib/footingSizer.ts`, `rateCard.ts` | STAGE52 |
| 53 | Building section | `src/lib/sectionSvg.ts` | STAGE53 |
| 54 | Stairwell slab void | `src/engine/bimGenerator.ts` | STAGE54 |
| 55 | Stairwell trimmer beams | `src/engine/bimGenerator.ts` | STAGE55 |
| 56 | Stairwell drawn in plan & section | `planSvg.ts`, `sectionSvg.ts` | STAGE56 |
| 57 | Title blocks | `src/lib/titleBlock.ts` | STAGE57 |
| 58 | Drawing register / sheet list | `src/lib/drawingRegister.ts` | STAGE58 |
| 59 | Per-sheet revision history | `drawingRegister.ts`, `boqExport.ts` | STAGE59 |
| 60 | Interactive revision bump (persisted, audited) | `appStore.ts`, `db.ts` | STAGE60 |
| 61 | Auto-bump suggestion (fingerprint) | `src/lib/fingerprint.ts` | STAGE61 |
| 62 | Change summary since last issue | `src/lib/designMetrics.ts` | STAGE62 |
| 63 | Auto-fill revision note from changes | `appStore.ts` | STAGE63 |
| 64 | Selectable section line (A–A / B–B) | `sectionSvg.ts`, `SectionView.tsx` | STAGE64 |
| 65 | Section marker on plan + export selected cut | `planSvg.ts`, `boqExport.ts` | STAGE65 |
| 66 | Section marker on interactive plan | `CadPlanView.tsx` | STAGE66 |
| 67 | **3D BIM viewer (lazy three.js)** | `bim/BimViewer.tsx`, `BimViewerPanel.tsx` | STAGE67 |
| 68 | **Editable + persisted plan (drag)** | `CadPlanView.tsx`, `appStore.ts` | STAGE68 |
| 69 | **Multi-project management (isolated CAD/BIM/BOQ)** | `appStore.ts`, `panels/ProjectSwitcherPanel.tsx` | STAGE69 |
| 70 | **Local-LLM brief parsing (WebLLM, lazy, fallback)** | `ai/aiProvider.ts`, `ai/webllmParser.ts`, `AiBriefPanel.tsx` | STAGE70 |

## BOQ categories (12)
Walls · Slabs · Roof · Openings · Objects · Beams · Columns · Footings · Reinforcement ·
MEP · Excavation · Formwork.

## Store actions (design-changing → all persist + audit)
`generateFromBrief`, `setMaterialSystem`, `setRebarSpec`, `setLoadCombo`, `setSoil`,
`setRateCard`/`setRegion`, `moveCadWall`, `moveCadBlock`, `bumpRevision`.
View-only: `setSelectedElement`, `setActiveFloor`, `setSectionConfig`, `setBriefText`.

## Deliverables / samples (in `samples/`)
`demo-boq-dossier.html` (plans + section + BOQ, issued) · `demo-boq.csv` / `demo-boq-zar.csv`
· `demo-plan.svg` · `demo-section.svg` · `plan-marker-AA.svg` / `plan-marker-BB.svg`
· `bim-3d-isometric.svg` (3D preview) · `ai-multifloor-dossier.html`.

## Known gaps (honest, for the merge)
- AI is a deterministic parser, not yet a local LLM (seam ready: `parseBriefAsync`).
- 2D editing is translate-only (no endpoint reshape / add / delete / snapping in this slice).
- 3D openings are translucent markers, not boolean cut-outs; no 3D element picking.
- Single demo project (no multi-project UI yet).
- Section is schematic (uniform wall members; single cut line at a time).
