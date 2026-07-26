# v0.1.1 — Public Demo Patch Release

**Date:** 2026-07-02  
**Commit:** b6a5ca7 → (tag v0.1.1)  
**Live demo:** https://budget-engineer.vercel.app/  
**Repository:** https://github.com/securequalitybuilders-art/budget-engineer

---

## Summary

v0.1.1 is a cumulative patch release covering Sprints 21–29. It adds feedback/issue reporting, mobile UX polish, a per-building-type CAD layout algorithm, full CAD editing persistence with manual save/restore UI, governance approval workflow, PlanModel→CadDocument roundtrip, BOQ source traceability metadata, and CAD quantity extraction — all validated with 238 automated tests.

No app architecture changes, no new paid APIs, no backend, no cloud dependencies.

---

## What Changed Since v0.1.0

### Feedback & Issue Reporting (Sprint 21)
- FeedbackPanel component with 8 category types, copy/GitHub/email actions
- Dedicated `/feedback` route
- Privacy-first: no analytics, no telemetry

### Mobile UX Polish (Sprint 22)
- Hero text sizes refined
- Always-visible archive/restore buttons on touch devices
- Larger tap targets throughout
- Mobile-friendly empty states and messages

### Better CAD Room Layout Algorithm (Sprint 23)
- Per-building-type layout strategies: single-storey, duplex/2-storey, clinic, commercial/shop
- Circulation corridors and wet-core grouping
- Improved opening placement (main entrance on front wall, doors on passage walls, windows on external walls)
- Shopfront display windows
- 33 new tests

### CAD Editing Persistence & Export Sync (Sprint 24)
- PlanModel saved/loaded from IndexedDB (Dexie v4, planModels table)
- Auto-save on every edit commit via PlanCanvas
- CAD sync status badges in Dashboard toolbar (Generated / Edited CAD / Fallback)
- Fallback sync adapter for BIM/BOQ/analysis with GeometrySource metadata

### Governance Approval Workflow (Sprint 25)
- Local-first approval workflow: submit for review, approve, request changes, reset to draft
- Comment box with type selector (general, review, approval, change-request)
- Governance timeline with all events
- Role selector (Owner, Reviewer, Viewer)
- Permission-based disabled controls
- 15 new tests

### CAD Persistence & Sync Tests (Sprint 26)
- 16 tests for cadPersistenceService CRUD with null safety, multiple design IDs, timestamp verification
- 17 tests for cadToDesignSyncAdapter fallback with region param and NaN protection
- Reusable PlanModel/DesignOption test fixtures

### PlanModel→CadDocument Roundtrip (Sprint 27)
- `planModelToCadAdapter.ts` — converts persisted PlanModel to canonical CadDocument
- Sync adapter prefers converted CadDocument for analysis when plan exists
- `deriveCadFromPlan` helper for direct CadDocument extraction from PlanModel
- 22 new tests (13 converter + 9 sync)

### BOQ Source Metadata & CAD Quantity Sync (Sprint 28)
- Source metadata in BOQ/CSV/HTML: geometrySource, quantitySourceLabel, computedAt, warnings
- CAD-edited BOQ labels ("from edited CAD" vs "from generated geometry")
- `cadQuantitiesAdapter.ts` for wall length, door/window count, opening area extraction from CadDocument
- Collapsible source badge in BoqExportPanel (color-coded: amber=Edited CAD, red=Fallback, emerald=Generated)
- 21 new tests

### Manual CAD Save/Restore UI (Sprint 29)
- `CadSyncControls.tsx` — compact toolbar dropdown with Save CAD Now, Restore Saved CAD, Reset to Generated
- Last-saved timestamp display
- Source label badge (Edited CAD / Generated / Fallback)
- Auto-dismissing status messages (3 seconds)
- `loadPlanModelMeta` service for safe savedAt retrieval
- 3 new tests

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (9 pre-existing warnings) |
| `npm test` | 238 passed, 18 files |
| `npm run build` | Success (3388 modules, 20 precache) |
| CI last commit | ✅ Passing |

---

## Live Demo Smoke Test

| Route | Status |
|-------|--------|
| `/` (Home) | ✅ |
| `/new` (Project Wizard) | ✅ |
| `/portfolio` (Portfolio Dashboard) | ✅ |
| `/feedback` (Feedback) | ✅ |
| `/project/demo` (SPA fallback) | ✅ |
| `manifest.webmanifest` (PWA manifest) | ✅ |
| Service worker registered | ✅ |
| No critical asset 404s | ✅ |

---

## Known Limitations

- Cost rates are approximate and vary by region — not suitable for procurement or final budgeting
- No professional structural engineer sign-off — designs are for concept/feasibility only
- Generated CAD is deterministic and early-stage — manual editing recommended for real projects
- Downstream adapters still use generated quantities for most line items (labels are CAD-edited, not full CAD-derived)
- Snapshot source metadata not yet stored
- No export sync for WS6 boq-export.ts (drawing register + plan SVGs)
- Same room template per floor (no ground/upper variation)
- Finishes and services are percentage-based estimates
- Mobile review supported; CAD editing best on tablet/desktop
- No cloud sync or multi-user support
- WebLLM parser is opt-in (`@mlc-ai/web-llm` not pre-installed)

---

## Next Roadmap

- **v0.1.2** — Export sync for fully CAD-edited data (snapshot source metadata, full CAD-derived BOQ quantities)
- **v0.2.0** — Improved CAD editing UX (wall dimension input, grid snapping)
- **v0.2.0** — Mobile dashboard refinement (responsive sidebar stacking)
- **v0.2.0** — Optional local WebLLM (install `@mlc-ai/web-llm` to enable)
- **v0.2.0** — Cloud sync optional architecture research (no commitment)
