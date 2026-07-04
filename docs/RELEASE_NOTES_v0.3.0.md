# v0.3.0 — DzeNhare OS 3-Tier Enterprise Architectural Intelligence

**Date:** 2026-07-04  
**Tag:** `v0.3.0`  
**Live demo:** https://budget-engineer.vercel.app/  
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

---

## Summary

v0.3.0 is a cumulative release covering Sprints 39–46B. It delivers the **DzeNhare OS Enterprise Architectural Intelligence v3.0** — a three-tier generative architecture engine that transforms a simple brief into production-ready 2D plans, 3D BIM models, and PDF cost reports.

The app now features three integrated intelligence tiers:
- **Tier 1 — Brief Intelligence:** 14 building typologies, climate zones, heritage patterns, and a quality gate that scores brief completeness.
- **Tier 2 — Concept Engine:** Architectural philosophy, design strategy, circulation logic, and massing studies.
- **Tier 3 — Layout Engine:** Three distinct topology generators (Rectangle, L-Shape, Split-Wing) that produce real non-overlapping room-by-room floor plans, feeding downstream 2D/3D/BOQ/PDF.

On the 3D BIM side, all previous geometry issues are fully resolved: walls connect at corners, doors and windows render as real pierced openings with visible glass and frames, roofs span the full building footprint, and room ceilings enclose each space. All openings render correctly on multi-storey buildings. The PWA now auto-updates on deployment.

All validated with **414 automated tests** across 30 files. No paid APIs, no backend, no cloud LLM.

---

## What Changed Since v0.2.0

### Tier 3 Layout Engine — 3 Distinct Topology Generators (Sprint 46 + 46A + 46B)
- **Rectangle topology:** Public front zone / corridor / private back zone with ZBC minimum dimensions.
- **L-Shape topology:** Vertical bedroom wing + horizontal living wing with corner courtyard (for corner sites / heritage patterns).
- **Split-Wing topology:** Two pavilion blocks connected by a central gallery (for clinics, schools, split-function).
- **Courtyard topology** (staged): Rooms distributed across 4 wings around a central void (hotel/townhouse/heritage).
- **FloorPlan→PlanModel adapter** converts topology output to the existing 2D/3D/BOQ pipeline with NaN guards.
- **Graceful degradation:** If a topology fails, a safe banded rectangle fallback + `console.warn` preserves a working plan.
- **Unified single option source:** No duplicate accumulation on regenerate, no stale sidebar panel — the prominent top selector is the single source of truth.
- **38 tests** covering all 4 topologies, degradation, coordinate validity, distinct layout signatures, and idempotency.

### Tier 2 Concept Engine (Sprint 45)
- Philosophy, design strategy, circulation, and massing generators.
- Modular, non-breaking — integrates after Tier 1, before layout generation.

### Tier 1 Brief Intelligence (Sprint 44)
- **14 building typologies** with aliases, SANS 10400/ZBC class mapping, default room programs.
- **Climate zones:** Harare Highveld, Victoria Falls Lowveld, Mutare Eastern Highlands, Bulawayo Midlands, Generic Zimbabwe — each with orientation/shading/thermal mass strategies.
- **Heritage patterns:** Kraal, Rondavel, Veranda, Courtyard-as-Hearth, Great Zimbabwe Enclosure.
- **Quality gate:** Score (0–100), issues, and recommendations with a collapsible UI readout.
- **22 new tests** (368 total at Sprint 44).

### PDF BOQ Cost Report (Sprint 43)
- **"Download PDF Report"** button on the Cost & Deliver panel generates a professional PDF entirely client-side (jsPDF).
- Project summary, trade-grouped BOQ with subtotals, grand total breakdown (subtotal, contingency, fees, VAT).
- Lazy-loaded — PDF libraries are separate chunks, not bundled upfront.
- 8 new tests (346 total at Sprint 43).

### 3D BIM Geometry Fixes (Sprints 40–42C)
- **Walls connect at corners:** Fixed axis-swap bug in wall rotation formula — all wall piers now meet at shared endpoints forming enclosed room volumes.
- **All doors and windows render:** Fixed opening Y-positioning and multi-storey React key collision — every opening in every storey produces a visible mesh.
- **Visible glass and frames:** Cyan glass (`#7dd3fc`, opacity 0.5, DoubleSide, depthWrite: false) + 6 cm frame jambs/header/sill.
- **Gable roof covers full footprint:** Corrected triangle indices — roof now spans the entire building with overhang.
- **Room ceilings:** One ceiling slab per room per storey, inset 0.1 m, brand slate material — rooms are now enclosed at top.
- **34 new tests** (342 total at Sprint 41).

### PWA Auto-Update (Sprint 39D)
- `skipWaiting: true`, `clientsClaim: true`, `cleanupOutdatedCaches: true` in Workbox config.
- New deployments now reach users within one page-reload cycle (previously the old SW cached the app shell indefinitely).
- 5 documented-config tests.

### Building Type Fixes (Sprints 39A–39C)
- **Persistence fix:** `buildingType` field added to `Design` type — persisted designs no longer all load as `'house'`.
- **Stale closure fix:** `useRef` synchronised with dropdown state so async `handleGenerate` reads the latest building type.
- **Canonical `BUILDING_TYPES` constant** shared across dropdown values, room program keys, and residential checks.

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (9 pre-existing warnings) |
| `npm test` | **414 passed, 30 files** |
| `npm run build` | Success — code-split chunks (concept/layout/3D/PDF) |
| New dependencies | None |
| Paid APIs / cloud | None |

---

## How It Works: Brief → Concept → 3 Layouts → 2D → 3D → BOQ → PDF

1. **Enter a brief** — describe your building in the AI Brief panel (e.g. "A 3-bedroom single-storey house in Harare with a veranda").
2. **Tier 1 — Brief Intelligence** parses the text: detects building typology, climate zone, heritage pattern, extracts room program and site dimensions, scores brief quality.
3. **Tier 2 — Concept Engine** generates architectural philosophy, design strategy, circulation logic, and massing.
4. **Tier 3 — Layout Engine** generates **3 distinct topology options**: Rectangle (zoned public/corridor/private), L-Shape (wing + courtyard), Split-Wing (pavilion + gallery). Each is a real non-overlapping room-by-room floor plan with ZBC-compliant dimensions.
5. **Select a design option** — the prominent card selector at the top of the canvas shows topology names and key metrics.
6. **View the 2D floor plan** — room labels with area, building dimensions, metre caption.
7. **View the 3D BIM model** — toggle to 3D mode to see thick walls, floor slabs, doors, windows, gable roof, room ceilings, and PBR materials. Orbit/pan/zoom with mouse or touch.
8. **Export the 3D model** — click "Download 3D model (.glb)" for use in Blender or Windows 3D Viewer.
9. **Review costs** — the BOQ panel shows trade-grouped quantities with subtotals and grand total.
10. **Generate a PDF cost report** — click "Download PDF Report" for a professional project summary with BOQ breakdown.

> No design experience required. Enter a brief, review the options, and iterate.

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

- **v0.3.1** — Multi-user project sharing, cloud sync architecture research
- **v0.4.0** — IFC import/export improvements, drawing register + section views in export
- **v0.5.0** — Structural engine integration (load analysis, footing sizing, column/beam/footing generation)
