# Release Notes — v1.0.0 Premium Architectural Studio

> **Release date:** 2026-07-11  
> **Codename:** Premium Architectural Studio  
> **Previous version:** v0.9.0  
> **Tests:** 1,059 across 61 test files  
> **Typecheck:** ✅ Green (strict mode)  
> **Build:** ✅ Green  
> **Lint:** ✅ Within budget (≤10 warnings)

---

## Overview

**Budget Engineer v1.0.0** is the first major release of the **Premium Architectural Studio** — a transformative upgrade that evolves Budget Engineer from a budgeting tool into a professional-grade, multi-discipline architectural design operating system.

This release delivers **8 implementation phases** (P0–P8) adding 53 new files, ~265 new tests, and 6 major feature modules — all while preserving the core local-first, offline-capable, zero-API-cost architecture.

**Mission:** *Making Construction Affordable for Everyone.*

---

## What's New

### 🏗️ Professional Drafting Standards (P1)

The drawing output layer now meets professional architecture office standards:

- **AIA-standard layer naming** — `A-WALL`, `A-DOOR`, `A-GLAZ`, `A-ANNO`, `S-COLS`, `M-PLMB`, and more
- **Dimension style system** — aligned dimensions with configurable text height, arrow type, and precision
- **Sheet size definitions** — A4, A3, A1, and A0 with correct viewBox scaling for print
- **Professional title blocks** — project info, revision table, scale indicator, sheet numbering, date stamps
- **Drawing naming conventions** — `{project-code}_{sheet-number}_{revision}_{description}` format

### 🧭 Multi-Discipline Framework (P2)

A discipline-aware workspace system that enables profession-specific workflows:

- **6 disciplines:** Architecture, Structure, MEP, Interior, Site, Quantity Surveying
- **Discipline-specific stage arrays** — each discipline shows only its relevant pipeline stages
- **Store-backed discipline switching** — persistent across sessions via Zustand + IndexedDB
- **Discipline switcher UI** — sidebar tab bar with discipline breadcrumb in the command bar
- **Discipline-scoped BOQ filtering** — line items filtered by active discipline
- **Stage ID system** — replaced numeric stage indices with semantic string IDs (`'brief'`, `'concept'`, `'site-analysis'`, `'design'`, `'engineering'`, `'docs-bim'`, `'cost-deliver'`)

### 🛋️ Interior Design Studio (P3)

A full interior design workspace integrated into the project pipeline:

- **62 fixtures** across categories: sanitary, kitchen, lighting, furniture, appliances
- **14 room templates** — bathroom, kitchen, bedroom, living room, office, nursery, laundry, and more
- **Material & finish scheduling** — assign materials per surface (wall, floor, ceiling) per room
- **Interior canvas** — dedicated layout editor reusing existing pointer/touch interaction patterns
- **Material palette panel** — visual material/colour assignment interface
- **BOQ integration** — interior finishes and fixtures automatically flow into BOQ line items via `interiorToBoq` adapter
- **Persistent state** — `interiorStore` with Zustand + Immer + IndexedDB partialize

### ☀️ Heliodon & Site Analysis (P4)

Environmental analysis tools for informed design decisions:

- **Heliodon engine** — pure-function sun-path computation for any latitude/longitude/date (trig-only, no external library)
- **Shadow casting** — shadow polygon projection from building footprint + sun position
- **Wind analysis** — wind exposure computation from wind-rose data
- **Composite site analysis** — orientation optimization, solar exposure assessment, wind impact
- **Sun-path diagram** — SVG-rendered stereographic sun-path with date/time slider
- **Shadow overlay** — SVG overlay on plan views showing shadow study results
- **Site analysis panel** — composite dashboard with all environmental data in one view

### 📸 Image-to-Floor-Plan AI (P5)

Guided workflow to convert floor plan images into editable CAD geometry:

- **Guided import wizard** — step-by-step: upload → calibrate → detect → review → edit
- **Drag-drop image upload** with preview and format validation
- **Scale calibration** — user sets known dimension to establish pixel-to-metre ratio
- **Detection review** — confidence overlay on detected walls with manual clean-up tools
- **Per-wall confidence tracking** — UX communicates detection reliability
- **Improved merging heuristics** — better furniture-vs-wall line discrimination
- **Honest limitations** — clearly documented: door/window detection is approximate, OCR unavailable offline, cluttered scans reduce accuracy

### 📐 Professional DXF Export Pipeline (P6)

Production-quality DXF output for CAD interoperability:

- **DXF writer** — full entity writer with AIA layer codes
- **Paper-space layout** — viewport with title block in paper space
- **Dimension entities** — aligned and rotated dimension export
- **Block INSERT export** — doors, windows, and fixture blocks as INSERT entities
- **DXF importer improvements** — hatch, text, and block import support
- **Roundtrip testing** — export → re-import → geometry comparison verified
- **Naming convention:** `PRJ-001_A-101_R02_Floor-Plan.dxf`

### 🎨 Premium Presentation Board Engine (P7)

Architecture presentation boards for client reviews and planning submissions:

- **Board domain model** — boards with named cells, annotations, snapshots, and template references
- **Grid layout engine** — 1–9 cell layouts on A1/A0 sheet sizes
- **Board annotations** — text boxes, arrow callouts, freehand markup
- **Board editor** — full composition workspace with cell management
- **Board templates** — Concept, Design Development, Planning submission presets
- **Snapshot capture** — capture 2D/3D views into board cells
- **Multi-format export** — SVG, PNG, and PDF export from boards
- **Presentation store** — Zustand + Immer + persist for board state
- **Studio workspace** — dedicated route at `/project/:id/studio/presentation`

### 🎓 Architecture Academy (P8)

In-app learning system for architecture fundamentals:

- **Skill taxonomy** — 5+ skill paths with 3+ lessons each
- **Lesson engine** — Markdown content renderer with structured lessons
- **Progress tracking** — persistent per-user progress via `academyStore` + IndexedDB
- **Skill path browser** — visual path explorer with completion status
- **Context tips** — in-app tooltips linking to relevant lessons from studio tools
- **Academy routes** — `/academy` and `/academy/:skillPath/:lessonId`

---

## Stabilization & Quality (P0)

Before any feature work, v1.0.0 includes a thorough stabilization pass:

- `npm ci` lock sync resolved
- All previously failing tests fixed
- Build memory issues addressed
- README/CI claims reconciled with actual state
- In-app copy verified against reality (no false sync/cloud claims)
- Baseline metrics captured and tracked throughout all 8 phases

---

## Quality Metrics

| Metric | Value |
|---|---|
| Total tests | 1,059 |
| Test files | 62 |
| TypeScript errors | 0 (strict mode) |
| Lint warnings | ≤ 10 (within budget) |
| Build | Green (PWA assets generated) |
| Lighthouse A11y | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Lighthouse Performance | 74–76 (varies by machine) |
| Bundle (initial) | ~575 KB (lazy-loaded panels) |

---

## Architecture Preserved

Throughout all 8 phases, these architectural invariants were maintained:

- ✅ **Local-first** — all data stays in IndexedDB, no cloud dependency
- ✅ **Zero paid APIs** — no OpenAI, no Anthropic, no Gemini API calls
- ✅ **Fully offline** — PWA with service worker, works without network
- ✅ **No data leaves the machine** — privacy by architecture
- ✅ **Modular domain/store/adapter pattern** — clean separation throughout
- ✅ **Test-first discipline** — every feature phase includes dedicated tests
- ✅ **Browser-realistic constraints** — no unreasonable GPU/memory assumptions

---

## New Routes

| Route | Feature |
|---|---|
| `/project/:id/studio/presentation` | Presentation Board Studio |
| `/academy` | Academy skill path browser |
| `/academy/:skillPath/:lessonId` | Individual lesson view |

Existing routes (`/`, `/new`, `/project/:id`, `/portfolio`, `/feedback`) unchanged.

---

## New Stores

| Store | Purpose |
|---|---|
| `disciplineStore` | Active discipline, visible disciplines, discipline tags |
| `interiorStore` | Interior project state (rooms, fixtures, materials) |
| `presentationStore` | Board compositions, annotations, snapshots |
| `academyStore` | Learning progress per skill path |

---

## New Domain Models

| Model | Location |
|---|---|
| `Discipline` | `src/domain/disciplines.ts` — 6 disciplines with config |
| `InteriorProject` | `src/domain/interior.ts` — rooms, fixtures, materials |
| `SiteContext` | `src/domain/site.ts` — lat/lng, orientation, terrain, wind |
| `PresentationBoard` | `src/domain/presentation.ts` — boards, cells, annotations |

---

## Export Capabilities (Complete)

| Format | Scope |
|---|---|
| **DXF** | Floor plans with AIA layers, dimensions, blocks, paper space |
| **PDF** | BOQ dossier, presentation sheets, board export, print-to-PDF |
| **CSV** | BOQ with regional pricing, rate source metadata |
| **HTML** | Self-contained BOQ dossier with print-to-PDF |
| **SVG** | Drawings, sun-path diagrams, shadow overlays, board cells |
| **PNG** | Board export, drawing snapshots |
| **GLB** | 3D BIM model export |
| **IFC** | IFC4 STEP format |
| **ZIP** | Project archive package with manifest |

---

## Known Limitations

These are documented honestly — no false claims:

- **DXF only, no DWG** — DWG is proprietary Autodesk format; impossible to implement fully in-browser. Use DXF export from AutoCAD/ArchiCAD for import.
- **Approximate compliance** — building code checks (ZBC, SANS 10400, Zambia, Botswana) are for early guidance. Always verify with a local authority or registered professional.
- **Wall detection is assistive** — image-to-plan detects edges; manual review and correction is always required.
- **Door/window detection approximate** — no offline OCR for room labels; manual naming required.
- **First-person walkthrough desktop only** — requires pointer-lock (mouse + keyboard).
- **Same room template per floor** — multi-floor designs share layout across levels.
- **WebLLM opt-in** — `@mlc-ai/web-llm` must be installed separately. Full functionality without it.
- **Cost rates are regional defaults** — not suitable for procurement.
- **BOQ finishes/services** — percentage-based estimates, not detailed takeoffs.
- **Not a professional replacement** — aids early-stage design and cost estimation. Does not replace qualified architects or engineers.
- **Board export on large sheets** — A1/A0 with many cells and annotations may stress weaker devices.
- **No multi-user sync** — single-user, local-first only. No real-time collaboration (yet).

---

## Upgrade Path

**From v0.9.0:** All existing projects and IndexedDB data are preserved. New modules (interior, site, boards, academy) initialise empty on existing projects. No destructive migration required.

**New installs:**
```bash
git clone https://github.com/securequalitybuilders-art/budget-engineer
cd budget-engineer
npm install
npm run dev
```

---

## What's Next

v1.0.0 marks the transition from **building** to **hardening, packaging, and presenting**:

1. **Manual QA matrix** — cross-workspace flows, export validation, IndexedDB migration paths, offline/PWA testing
2. **Demo project pack** — pre-built projects showcasing all studio capabilities
3. **Documentation refresh** — full README and guide updates
4. **Screenshot & showcase assets** — marketing-ready captures of all studios
5. **Versioned release tag** — `v1.0.0` frozen on a release branch

---

## Contributors

Built by the DzeNhare / Secure Quality Builders team.

## License

MIT — aligned with all open-source dependencies.

---

> **Making Construction Affordable for Everyone.**
