# Changelog

## Unreleased

- Diagnosed Lighthouse NO_FCP audit failure on project route — root cause was a CSS-only spinner with no visible text rendered indefinitely for non-existent project IDs
- Hardened Dashboard first paint: loading state now shows "Loading project…" text; non-existent projects show "Project not found" fallback with create-project link

---

## v0.1.1 — Public Demo Patch Release

**Date:** 2026-07-02

**Live demo:** https://budget-engineer.vercel.app/
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

### Added since v0.1.0
- Feedback workflow and `/feedback` route (Sprint 21)
- Mobile UX deep polish — hero text sizes, tap targets, always-visible archive/restore, mobile messages (Sprint 22)
- Better CAD room layout algorithm — per-building-type strategies (single-storey, duplex, clinic, commercial) with circulation corridors and wet-core grouping (Sprint 23)
- CAD editing persistence — PlanModel saved/loaded from IndexedDB, auto-save on edit commit, CAD sync status in toolbar (Sprint 24)
- Governance approval workflow — submit/approve/request-changes with comments, timeline, role selector, transaction logging (Sprint 25)
- CAD persistence and sync tests — 33 tests for cadPersistenceService and cadToDesignSyncAdapter (Sprint 26)
- PlanModel→CadDocument roundtrip — conversion adapter for downstream analysis (Sprint 27)
- BOQ source metadata and CAD quantity sync — geometry source, quantity source label, CAD-edited labels, cadQuantitiesAdapter for wall/opening extraction (Sprint 28)
- Manual CAD save/restore UI — CadSyncControls dropdown with Save/Restore/Reset buttons, timestamp, source badge, auto-dismiss status messages (Sprint 29)

### Validation
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 238 passed, 18 files
- Build: success (3388 modules, 20 precache entries)

### Known Limitations
- Downstream adapters still use generated quantities for most line items (CAD-edited labels, not full CAD-derived quantities)
- Snapshot source metadata not yet stored
- No export sync for WS6 boq-export.ts (drawing register + plan SVGs)
- Same room template per floor (no ground/upper variation)
- Finishes and services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)

---

## Sprint 26 — CAD Persistence and Sync Tests

**Date:** 2026-07-02

### Added
- `src/__tests__/fixtures/cadFixtures.ts` — reusable PlanModel and DesignOption factories
- `src/__tests__/cadPersistenceService.test.ts` — 16 tests for save/load/has/delete with null safety, multiple design IDs, timestamp, mutation isolation
- `src/__tests__/cadToDesignSyncAdapter.test.ts` — 17 tests for buildCadSyncMetadata, deriveBim/Boq/Analysis fallback, region param, NaN protection

### Validation
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 192 passed, 16 files
- Build: success

### Fixed
- No bugs found — all tests passed against existing implementation

## Sprint 24 — CAD Editing Persistence and Export Sync

**Date:** 2026-07-02

### Added
- `cadPersistenceService.ts` — save/load/delete PlanModel from IndexedDB `planModels` table
- `cadToDesignSyncAdapter.ts` — fallback wrappers for BIM/BOQ/analysis with GeometrySource metadata (generated-design | persisted-cad | fallback-generated)
- Dexie v4 migration: new `planModels` table (additive, no schema break)
- Dashboard integration: load persisted PlanModel on design selection, auto-save on edit commit, CAD sync status badges in toolbar

### Validation
- Typecheck: 0 errors
- Lint: 0 errors (9 pre-existing warnings)
- Tests: 145 passed, 13 files
- Build: 20 precache entries

### Known Limitations
- Downstream adapters still read from DesignOption (not persisted PlanModel)
- No PlanModel → CadDocument roundtrip wired
- No test coverage for new services/adapter
- No export sync for CAD-edited data

## v0.1.0 — Public MVP Release

**Date:** 2026-07-01

**Live demo:** https://budget-engineer.vercel.app/
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

### Core Pipeline
- AI brief parser (deterministic, regex-based, Zod-validated)
- AI design engine — generates 3 design options (compact/standard/spacious)
- 6-stage pipeline UI: Brief → Concept → Design → Engineering → Docs → Cost
- First-time builder journey with template briefs and guided steps

### CAD / BIM
- 2D plan canvas with pan/zoom, wall drawing, room labels, dimensions
- Multi-floor support
- Wall corner solver (intersection trim)
- DXF/SVG/MakerJS export
- 3D BIM viewer (React Three Fiber) with legend, inspector, floor visibility
- 2D/3D toggle in Dashboard toolbar

### Engineering Analysis
- 3-rule BIM clash detection (opening proximity, overlap, AABB collision)
- Cardinal solar orientation heat gain analysis (N/E/S/W walls + windows)
- MEP services takeoff (electrical, lighting, plumbing points per zone)

### BOQ / Export
- Geometry-derived BOQ quantities (door/window/partition/finish from actual CAD geometry)
- Regional rate card pricing (Zimbabwe, South Africa, Kenya, Global)
- CSV export, HTML dossier, print-to-PDF
- Regional currency support (USD, ZWG)
- Rate assumptions displayed in export

### Persistence & Versioning
- IndexedDB persistence via Dexie (10 tables)
- Project data survives page refresh
- Design snapshot save/load/compare with cost and quantity deltas
- Transaction logging on all mutations
- Governance audit trail (approval readiness checklist, RBAC roles, design fingerprint)

### Portfolio & Governance
- Portfolio Dashboard at `/portfolio` with executive summary stats
- Category distribution breakdown (Walls/Slabs/Roof/Openings/Objects)
- Project search, status filter (All/Active/Archived), sort (newest/name/cost)
- Archive/restore actions on project cards
- Governance/audit panel with approval checklist and RBAC role descriptions

### Testing & CI
- 117 automated tests across 12 files (vitest + fake-indexeddb)
- GitHub Actions CI pipeline: typecheck → lint → test → build
- Test coverage across all core adapters: governance, geometry, BOQ, BIM, analysis, rate cards, persistence, snapshots, archive, portfolio filters

### Known Limitations
- Cost rates are approximate and vary by region — not suitable for procurement
- No professional structural engineer sign-off — designs are for concept/feasibility only
- Generated CAD is deterministic and early-stage — manual editing recommended
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)
- Not a replacement for professional quantity surveyor or engineering review
- Multi-floor uses same room template for all levels
- Finishes and services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
