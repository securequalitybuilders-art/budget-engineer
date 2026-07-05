# v0.3.1 — PDF 3D Snapshot, Real Courtyard Layout, 2D/3D Consistency

**Date:** 2026-07-05  
**Tag:** `v0.3.1`  
**Live demo:** https://budget-engineer.vercel.app/  
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

---

## Summary

v0.3.1 is a quality-and-polish release covering Sprints 47–49. It delivers three major usability improvements:

1. **PDF cost report with 3D snapshot** — the PDF now includes a PNG image of the current 3D BIM model. PDF generation is hardened against WebGL failures and jspdf-autotable code-split issues.
2. **Real courtyard layout for hotels** — hotels produce a genuine courtyard ring (rooms around a central void) instead of degrading to a rectangle. The building-type dropdown offers all 14 typologies with Auto-detect; explicit selection is respected in both generate paths.
3. **2D/3D plan consistency** — the 2D floor plan and 3D BIM model now share one active PlanModel derived from the selected Tier 3 layout. No more seeing a courtyard in 3D but a generic rectangle in 2D.

All validated with **470 automated tests** across 33 files. No paid APIs, no backend, no cloud LLM.

---

## What Changed Since v0.3.0

### PDF 3D Snapshot + Reliability (Sprints 47, 47A, 47B)
- **3D model snapshot embedded in PDF**: WebGL canvas configured with `preserveDrawingBuffer: true`; `SnapshotCapture` component registers a capture function; PDF cost report includes a "3D Model Preview" section with the rendered snapshot. Gracefully skipped if 3D view was never opened.
- **Isolated capture**: `captureSnapshot()` wrapped in its own try/catch — WebGL context loss or render error no longer blocks PDF generation. PDF always generates; snapshot is omitted if capture fails.
- **jspdf-autotable functional API**: Fixed `TypeError: t.autoTable is not a function` caused by ESM code-split. Switched to `autoTable(doc, opts)` functional API. Guarded all null/undefined/NaN values.
- **+34 tests** (430 at Sprint 47 → 448 at Sprint 47B).

### Real Courtyard + Typology Dropdown (Sprints 48, 48A–48D)
- **Courtyard layout overlap fix**: `generateCourtyard` now computes `wingDepth = max(minD, minW)` across all program items — ZBC-compliant by construction, no post-placement bumps, no rectangle fallback for hotels.
- **Courtyard replaces rectangle for hotels**: `topologies = ['courtyard', 'l-shape', 'split-wing']` for hotel/heritage-courtyard typologies — courtyard is no longer a silently dropped 4th option.
- **Full building-type dropdown**: "Auto-detect from brief" (default) + all 14 Tier 1 typologies with canonical IDs. `parseBrief` skips override on `'auto'`, text detection wins. Explicit selection (e.g. Clinic, Hotel) forces its typology in `parseBrief`.
- **Both generate paths share dropdown value**: `onBuildingTypeChange` lifts the selection from AiBriefPanel to Dashboard state. Both Dashboard's "Generate" button and AiBriefPanel's "Generate" use the same value.
- **+14 tests** (448 at Sprint 47B → 463 at Sprint 48D).

### 2D/3D Plan Consistency (Sprint 49)
- **Single active PlanModel**: The 2D PlanCanvas now receives `activePlan` (the fully resolved plan) instead of just `persistedPlan`. Both views use identical priority: persistedPlan (CAD edits) ≫ floorPlanToPlanModel(tier3) ≫ generatePlanModel(legacy).
- **2D always matches 3D**: Courtyard, L-Shape, Split-Wing, Rectangle — all topologies render identically in 2D and 3D views. Room names, positions, and dimensions are identical.
- **+7 tests** (463 at Sprint 48D → 470 at Sprint 49).

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (9 pre-existing warnings) |
| `npm test` | **470 passed, 33 files** |
| `npm run build` | Success — code-split chunks (concept/layout/3D/PDF) |
| New dependencies | None |
| Paid APIs / cloud | None |

---

## How It Works (unchanged since v0.3.0)

1. **Enter a brief** — describe your building in the AI Brief panel.
2. **Tier 1 — Brief Intelligence** parses the text: detects building typology, climate zone, heritage pattern, extracts room program and site dimensions, scores brief quality.
3. **Tier 2 — Concept Engine** generates architectural philosophy, design strategy, circulation logic, and massing.
4. **Tier 3 — Layout Engine** generates **3 distinct topology options**: Courtyard (hotels/heritage), L-Shape (wing + courtyard), Split-Wing (pavilion + gallery), or Rectangle (zoned public/corridor/private).
5. **Select a design option** — the prominent card selector shows topology names and key metrics.
6. **View the 2D floor plan** — now shows the same topology as 3D.
7. **View the 3D BIM model** — toggle to 3D to see walls, slabs, doors, windows, roof, ceilings, and PBR materials.
8. **Download PDF cost report** — includes a 3D model preview snapshot when available.
9. **Export the 3D model** — download .glb for use in Blender or Windows 3D Viewer.

---

## Known Limitations

- Cost rates are approximate and vary by region — not suitable for procurement or final budgeting
- No professional structural engineer sign-off — designs are for concept/feasibility only
- Generated CAD is deterministic and early-stage — manual editing recommended for real projects
- Same room template per floor (no ground/upper variation)
- Finishes and services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)

---

## Roadmap

- **v0.4.0** — IFC import/export improvements, drawing register + section views in export
- **v0.5.0** — Structural engine integration (load analysis, footing sizing, column/beam/footing generation)
