# Budget Engineer Premium Architectural Studio — Upgrade Plan v1.1

> **Version:** 1.1.1  
> **Status:** Approved — frozen for execution  
> **Based on:** Budget Engineer OS v0.9.0 target branch  
> **Date:** 2026-07-10  

---

## Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Phase Map](#2-phase-map)
3. [Module Architecture Breakdown](#3-module-architecture-breakdown)
4. [Data Model Changes](#4-data-model-changes)
5. [Route & Component Map](#5-route--component-map)
6. [UI/UX Plan](#6-uiux-plan)
7. [Export Strategy](#7-export-strategy)
8. [Test Strategy](#8-test-strategy)
9. [Risks, Tradeoffs & Fallbacks](#9-risks-tradeoffs--fallbacks)
10. [Acceptance Criteria](#10-acceptance-criteria)
11. [Appendices](#11-appendices)

---

## 1. Architectural Overview

### Current Architecture

```
Brief → Concept → Design → Engineering → Docs/BIM → Cost/Deliver
                          ↓
              project/:id (single workspace)
```

### Target Architecture

The Premium Studio Hub is a **navigation/product layer** over the existing project workspace — not a separate storage architecture. It adds studio workspaces accessible via `/project/:id/studio/*`.

```
                        PREMIUM STUDIO HUB
  ┌─────────────────────────────────────────────────────────────────┐
  │  Pipeline  │ Interior  │ Site     │ Image→   │ Present   │ Acad │
  │  (existing)│  Studio   │ Analysis │ Plan AI  │ Boards    │ emy  │
  └─────────────────────────────────────────────────────────────────┘
                          ↓
              Multi-Discipline Workspace Context
     Architecture │ Structure │ MEP │ Interior │ Site │ QS/Est
                          ↓
              Premium Presentation Engine
     Title blocks | AIA Layers | Dim Styles | Sheet Sets | DXF
                          ↓
              Local-First Persistence (IndexedDB)
        Projects | Interiors | Sites | Boards | Academy Progress
```

### Key Design Decisions (unchanged from v1.0)

| Decision | Rationale |
|----------|-----------|
| **No native DWG** | DXF-first with AIA layers. DWG is proprietary AutoDesk — impossible to fully implement in-browser. |
| **SVG-native drawings** | Existing rendering (PresentationSheetView, planSheetModel, sectionModel) is well-architected. Extend, don't rewrite. |
| **No paid APIs** | All new features use existing deps or pure math. |
| **Offline-first** | All new data → IndexedDB. No cloud dependency. |

---

## 2. Phase Map

**Baseline health metrics to be re-measured on the implementation branch before P0 exit.** The numbers below are target-branch estimates; actuals must be captured at P0.

### P0 — Stabilization & Truth Alignment (Week 1)

| Task | Detail | Owner |
|------|--------|-------|
| P0.1 | Fix `package-lock.json` / `npm ci` sync | Dev |
| P0.2 | Fix currently failing test suites | Dev |
| P0.3 | Fix or budget production build memory issue | Dev |
| P0.4 | Reconcile README/CI claims with actual branch state | Dev |
| P0.5 | Align in-app copy with reality: project links are local-only, PDF import status, remove "synced when online" if no sync exists | Dev |
| P0.6 | Run `npm run typecheck && npm test && npm run build` — capture baseline metrics | QA |

**P0 exit criteria:** `npm ci` green, test suite 100% green, `npm run build` green, README/CI truthful.

---

### P1 — Premium Drafting Standards (Week 2-3)

| # | File | Description |
|---|------|-------------|
| 1.1 | `src/lib/drawing/titleBlock.ts` | Professional title block engine (project info, revision table, scale, sheet number, dates) |
| 1.2 | `src/lib/drawing/dimensionStyles.ts` | Dimension style system (aligned, text height, arrow type, precision) |
| 1.3 | `src/lib/drawing/layerStandard.ts` | AIA-standard layer naming schema (`A-WALL`, `A-DOOR`, `A-GLAZ`, `A-ANNO`, etc.) |
| 1.4 | `src/lib/drawing/sheetSet.ts` | Sheet size definitions (A4/A3/A1/A0) with viewBox scaling |
| 1.5 | `src/lib/drawing/namingConventions.ts` | Drawing number, revision, discipline prefix, date stamp conventions |
| 1.6 | Modify `PresentationSheetView.tsx` | Upgrade title block rendering |
| 1.7 | Modify `cadPrimitives.tsx` | Add dimension annotation components |
| 1.8 | Modify `styles/index.css` | Add `.sheet-A4/A3/A1/A0`, title block, dimension-line utility classes |

**Font note:** Use system font stack `font-family: Arial, Helvetica, sans-serif;` for print/export. Bundle Arimo or Liberation Sans as the safe embedded default only if system Arial is unavailable in SVG exports. Do NOT redistribute Arial TTF — it is proprietary.

---

### P2 — Multi-Discipline Framework (Week 3-5)

Moved here from P6 because the discipline framework affects layer filtering, workspace switching, drawing packages, BOQ scoping, export packaging, and UI architecture. Doing it early avoids rework across P3-P8.

| # | File | Description |
|---|------|-------------|
| 2.1 | `src/domain/disciplines.ts` | Discipline registry type + config (Arch/Struct/MEP/Interior/Site/QS) |
| 2.2 | `src/stores/disciplineStore.ts` | Zustand store: active discipline, visible disciplines, discipline tags |
| 2.3 | `src/components/layout/DisciplineSwitcher.tsx` | Sidebar discipline tab bar |
| 2.4 | Modify `Sidebar.tsx` | Add discipline switcher |
| 2.5 | Modify `CommandBar.tsx` | Add discipline breadcrumb |
| 2.6 | Modify `PlanCanvas.tsx` | Filter CAD layers by discipline |
| 2.7 | Modify `BimViewer.tsx` (or `BimModel3D.tsx`) | Filter 3D elements by discipline |
| 2.8 | `src/adapters/disciplineBoqAdapter.ts` | Filter BOQ line items by discipline scope |
| 2.9 | `src/domain/stageRegistry.ts` | **Replace numeric stage rail with string stage IDs** |

**Stage ID replacement:**

```typescript
type StageId = 'brief' | 'concept' | 'site-analysis' | 'design'
  | 'engineering' | 'docs-bim' | 'cost-deliver';

// Each discipline has its own ordered stage array
const DISCIPLINE_STAGES: Record<Discipline, StageId[]> = {
  architecture: ['brief','concept','site-analysis','design','engineering','docs-bim','cost-deliver'],
  structure:    ['brief','concept','design','engineering','docs-bim','cost-deliver'],
  mep:          ['brief','concept','design','engineering','docs-bim','cost-deliver'],
  interior:     ['brief','concept','design','engineering','cost-deliver'],
  site:         ['brief','site-analysis','design','engineering','cost-deliver'],
  qs:           ['brief','concept','design','cost-deliver'],
};
```

---

### P3 — Interior Design Studio (Weeks 5-7)

| # | File | Description |
|---|------|-------------|
| 3.1 | `src/domain/interior.ts` | Interior domain model (rooms, fixtures, materials, finish specs) |
| 3.2 | `src/lib/interior/fixtures.ts` | Fixture/component library (≥40: sanitary, kitchen, lighting, furniture) |
| 3.3 | `src/lib/interior/roomTemplates.ts` | Room template presets (bathroom, kitchen, bedroom, living, office) |
| 3.4 | `src/lib/interior/finishSchedule.ts` | Material takeoff for finishes → quantities |
| 3.5 | `src/stores/interiorStore.ts` | Zustand + immer + persist (IndexedDB partialize) |
| 3.6 | `src/components/interior/InteriorCanvas.tsx` | Layout canvas reusing existing pointer/touch editing patterns from CAD |
| 3.7 | `src/components/interior/MaterialPalette.tsx` | Material/color assignment per room surface |
| 3.8 | `src/pages/studio/InteriorStudio.tsx` | Studio workspace page |
| 3.9 | `src/adapters/interiorToBoq.ts` | Convert interior finishes/fixtures → BOQ line items |

**Interaction model:** Reuse existing pointer/touch editing patterns from CAD/editor workflows. Establish a shared interaction vocabulary across all editing surfaces (CAD, interior, boards) to prevent UX fragmentation:

```
Select → Drag → Rotate → Snap → Duplicate → Delete
Group → Align → Nudge (arrow keys) → Undo/Redo
```

No new drag-and-drop dependency required. Keep interaction patterns consistent across CAD canvas, interior canvas, and board editor.

---

### P4 — Heliodon & Site Analysis (Weeks 7-9)

| # | File | Description |
|---|------|-------------|
| 4.1 | `src/domain/site.ts` | Site context model (lat/lng, orientation, terrain, adjacent buildings, wind rose) |
| 4.2 | `src/engine/analysis/heliodon.ts` | Pure-function sun-path engine (sun position for any lat/lng/date — pure trig, no lib) |
| 4.3 | `src/engine/analysis/shadowCast.ts` | Shadow polygon casting from building footprint + sun position |
| 4.4 | `src/engine/analysis/windAnalysis.ts` | Wind exposure computation from wind rose data |
| 4.5 | `src/engine/analysis/siteAnalysis.ts` | Composite site analysis report (orientation optimization, solar exposure, wind) |
| 4.6 | `src/lib/drawing/sunPathDiagram.ts` | Sun-path diagram SVG renderer |
| 4.7 | `src/lib/drawing/shadowOverlay.ts` | Shadow study SVG overlay for plan views |
| 4.8 | `src/components/analysis/HeliodonView.tsx` | Heliodon visualization panel (2D SVG + date/time slider) |
| 4.9 | `src/components/analysis/SiteAnalysisPanel.tsx` | Site analysis composite dashboard |
| 4.10 | Route: `/project/:id/studio/site` | Site analysis workspace |

---

### P5 — Image-to-Floor-Plan AI (Weeks 9-10)

Positioned as **"detect, reconstruct, and clean up"** — not "perfect auto-conversion."

| # | File | Description |
|---|------|-------------|
| 5.1 | `src/components/import/ImportWorkflow.tsx` | Full guided import workflow |
| 5.2 | `src/components/import/ImageImportZone.tsx` | Drag-drop image upload with preview |
| 5.3 | `src/components/import/ScaleCalibration.tsx` | Known-dimension → pixel-ratio calibration wizard |
| 5.4 | `src/components/import/DetectionReview.tsx` | Detection result with confidence overlay + manual clean-up |
| 5.5 | Add `importConfidence` to wall detection types | Track per-wall confidence for UX |
| 5.6 | Modify `DetectedSegment` / `DetectionResult` | Better merging heuristics for furniture vs wall lines |

**Known limitations (document in UX):**
- Door/window detection is approximate — manual adjustment expected
- Room label OCR not available offline — manual naming required
- Cluttered scans and skewed photos reduce accuracy
- Low-quality images → low confidence → manual tracing fallback

---

### P6 — Professional DXF Export (Weeks 10-11)

**DXF v1 scope (this phase):**
- Layers with AIA codes
- Lines, polylines, LWPolylines
- Text entities (aligned)
- Aligned dimensions
- Basic block INSERT (doors, windows)
- Paper-space layout with title block
- **DXF v1.1+ (future):** hatches, advanced dimension styles, extended block libraries, richer paper space

| # | File | Description |
|---|------|-------------|
| 6.1 | `src/lib/export/dxfWriter.ts` | DXF entity writer with AIA layer codes |
| 6.2 | `src/lib/export/dxfPaperSpace.ts` | Paper-space layout with viewport + title block |
| 6.3 | `src/lib/export/dxfDimensions.ts` | Aligned/rotated dimension entity export |
| 6.4 | `src/lib/export/dxfBlocks.ts` | Block INSERT export (doors, windows, fixtures) |
| 6.5 | Modify `src/lib/import/dxf-importer.ts` | Import improvements (hatch, text, blocks) |
| 6.6 | `src/__tests__/dxfRoundtrip.test.ts` | Export → re-import → compare geometry |

**Naming convention:**
```
{project-code}_{sheet-number}_{revision}_{description}.dxf
Example: PRJ-001_A-101_R02_Floor-Plan.dxf
```

---

### P7 — Premium Presentation Board Engine (Weeks 11-13)

| # | File | Description |
|---|------|-------------|
| 7.1 | `src/lib/presentation/boardLayout.ts` | Custom grid layout engine (1-9 cells, A1/A0) |
| 7.2 | `src/lib/presentation/renderOverlay.ts` | SVG + 3D snapshot compositing |
| 7.3 | `src/components/presentation/BoardAnnotator.tsx` | Text boxes, arrow callouts, freehand markup |
| 7.4 | `src/components/presentation/BoardEditor.tsx` | Board composition editor |
| 7.5 | `src/data/presentation/templates.json` | Board templates (Concept, Design Development, Planning) |
| 7.6 | `src/adapters/boardExport.ts` | Export board → PDF/PNG/SVG (reuses existing sheeExport stack) |
| 7.7 | `src/stores/presentationStore.ts` | Zustand + immer + persist |
| 7.8 | Route: `/project/:id/studio/presentation` | Presentation studio workspace |

---

### P8 — Architecture Academy (Weeks 13-14)

| # | File | Description |
|---|------|-------------|
| 8.1 | `src/data/skills/taxonomy.json` | ≥5 skill paths, ≥3 lessons each |
| 8.2 | `src/lib/learning/lessonEngine.ts` | Markdown content renderer |
| 8.3 | `src/stores/academyStore.ts` | Zustand + persist: progress tracking |
| 8.4 | `src/components/academy/SkillPath.tsx` | Skill path browser with progress |
| 8.5 | `src/components/academy/ContextTip.tsx` | In-app tooltip linking to relevant lessons |
| 8.6 | `src/pages/Academy.tsx` | Academy route + layout |
| 8.7 | Route: `/academy` and `/academy/:skillPath/:lessonId` | |

---

### Effort Summary

| Phase | Weeks | New Files | Modified Files | New Tests |
|-------|-------|-----------|----------------|-----------|
| P0 | 1 | 0 | 5-8 | 0 |
| P1 | 2 | 5 | 3 | 30 |
| P2 | 2 | 5 | 5 | 30 |
| P3 | 2 | 10 | 2 | 40 |
| P4 | 2 | 9 | 1 | 50 |
| P5 | 1 | 5 | 2 | 20 |
| P6 | 2 | 6 | 1 | 50 |
| P7 | 2 | 7 | 1 | 30 |
| P8 | 1 | 6 | 1 | 15 |
| **Total** | **15** | **53** | **~22** | **~265** |

**Timing note:** 15 weeks for a single dev; 10-11 weeks for a strong pair.

---

## 3. Module Architecture Breakdown

### 3.1 New Domain Types

```typescript
// src/domain/disciplines.ts
type Discipline = 'architecture'|'structure'|'mep'|'interior'|'site'|'qs';
const DISCIPLINE_CONFIG: Record<Discipline, {label:string; icon:string; color:string; stages:StageId[]}> = { ... };

// src/domain/interior.ts
interface InteriorProject { id:string; projectId:string; rooms:InteriorRoom[]; fixtures:FixtureInstance[]; materialPalette:MaterialAssignment[]; }
interface InteriorRoom { roomId:string; name:string; finishSpec:FinishSpec; }
interface FixtureInstance { id:string; fixtureTypeId:string; position:Point; rotation:number; roomId:string; }
interface MaterialAssignment { roomId:string; surface:'wall'|'floor'|'ceiling'; materialId:string; }

// src/domain/site.ts
interface SiteContext { projectId:string; lat:number; lng:number; orientation:number; terrain:'flat'|'sloping'|'steep'; adjacentBuildings:AdjacentBuilding[]; windRose?:WindRose; }

// src/domain/presentation.ts
interface PresentationBoard { id:string; projectId:string; name:string; layout:BoardCell[]; annotations:BoardAnnotation[]; templateId:string; snapshots:BoardSnapshotRef[]; }

// src/domain/archive.ts
interface ProjectPackage { formatVersion:number; project:ProjectExport; interiors:InteriorProject|null; site:SiteContext|null; boards:PresentationBoard[]; cadDocs:CadDocument[]; bimModels:BimModel[]; boqs:BOQ[]; snapshots:ProjectSnapshot[]; transactions:TransactionEvent[]; }
```

### 3.2 New Engine Modules (all pure functions)

| Engine | File | Description |
|--------|------|-------------|
| Heliodon | `src/engine/analysis/heliodon.ts` | Sun position, sun-path, annual exposure (pure trig) |
| Shadow cast | `src/engine/analysis/shadowCast.ts` | Shadow polygon for given building + sun + context |
| Wind analysis | `src/engine/analysis/windAnalysis.ts` | Wind exposure map from wind rose |
| Site analysis | `src/engine/analysis/siteAnalysis.ts` | Composite report (orientation, solar, wind) |

### 3.3 New Stores

| Store | Pattern | Persist | Tables |
|-------|---------|---------|--------|
| `disciplineStore` | Zustand + immer | No (ephemeral UI) | — |
| `interiorStore` | Zustand + immer | Yes (IndexedDB via partialize) | `interiors` |
| `presentationStore` | Zustand + immer | Yes (IndexedDB via partialize) | `presentationBoards` |
| `academyStore` | Zustand + immer | Yes (IndexedDB via partialize) | `academyProgress` |

### 3.4 New Adapters

| Adapter | Input → Output |
|---------|---------------|
| `interiorToBoq.ts` | `InteriorProject` + `DesignOption` → `BOQLineItem[]` |
| `disciplineBoqAdapter.ts` | `BoqResult` + `Discipline` → filtered `BoqResult` |
| `boardExport.ts` | `PresentationBoard` → PDF/PNG/SVG blob |

---

## 4. Data Model Changes

### 4.1 Dexie v5 Migration

```typescript
// db.ts — version 5
const db = new Dexie('BudgetEngineer');
db.version(5).stores({
  projects: 'id, [ownerId+status], updatedAt',
  briefs: 'projectId',
  designs: 'id, projectId, [projectId+optionIndex]',
  boqs: 'id, projectId, designId',
  transactions: 'id, [projectId+createdAt], entityType',
  rates: 'id, [region+code], source',
  cadDocs: 'id, name, projectId',
  bimModels: 'id, name, projectId',
  governance: 'projectId',
  snapshots: 'id, timestamp, name, projectId',
  planModels: 'id, projectId, designId, savedAt',
  interiors: 'id, projectId',                       // NEW
  siteContexts: 'projectId',                         // NEW
  presentationBoards: 'id, projectId',               // NEW
  academyProgress: 'id, [userId+skillPath]',         // NEW
});

// Migration rules:
// - version 4 → 5: additive only, no destructive changes
// - old projects without interior/site/presentation/academy data → stores initialize default empty state
// - null-safe reads on all new fields
// - migration failure → console.warn + continue with empty state (never crash)
```

### 4.2 Discipline Tag Approach

Instead of sprinkling `discipline?: Discipline` on core types, use a lightweight metadata tag approach:

```typescript
interface DisciplineTagged {
  disciplineTags: Discipline[];  // empty array = all disciplines
}
```

Applied to: `CadWall`, `CadOpening`, `CadLayer`, `BimElement`, `BOQLineItem`, `PlanModel`

### 4.3 Stage ID Replacement

Replace numeric `activeStage: number` with `activeStage: StageId`. See [P2.9](#p2--multi-discipline-framework-week-3-5) for full details.

### 4.4 Naming & Revision Standards (see Appendix D)

---

## 5. Route & Component Map

### 5.1 Routes

| Path | Component | Workspace |
|------|-----------|-----------|
| `/` | `Home` | Landing |
| `/new` | `ProjectWizard` | Project creation |
| `/project/:id` | `Dashboard` | Main pipeline workspace |
| `/project/:id/studio/interior` | `InteriorStudio` | Interior design |
| `/project/:id/studio/site` | `SiteAnalysisView` | Site + heliodon |
| `/project/:id/studio/presentation` | `PresentationStudio` | Presentation boards |
| `/project/:id/studio/:discipline` | `DisciplineWorkspace` | Generic discipline router |
| `/portfolio` | `PortfolioPage` | Cross-project overview |
| `/academy` | `Academy` | Learning portal |
| `/academy/:skillPath/:lessonId` | `LessonView` | Individual lesson |
| `/feedback` | `FeedbackPage` | Feedback |
| `*` | Navigate to `/` | Catch-all |

All studio routes use a consistent `/project/:id/studio/*` namespace.

### 5.2 Major New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DisciplineSwitcher` | `components/layout/` | Sidebar discipline tabs |
| `ImportWorkflow` | `components/import/` | Guided image→plan workflow |
| `InteriorCanvas` | `components/interior/` | Drag-drop interior layout |
| `MaterialPalette` | `components/interior/` | Material/color picker |
| `HeliodonView` | `components/analysis/` | Sun-path + shadow visualization |
| `SiteAnalysisPanel` | `components/analysis/` | Composite site dashboard |
| `BoardEditor` | `components/presentation/` | Presentation board editor |
| `BoardAnnotator` | `components/presentation/` | Annotation tools |
| `SkillPath` | `components/academy/` | Learning path browser |
| `ContextTip` | `components/academy/` | In-app contextual help |

---

## 6. UI/UX Plan

### 6.1 Discipline Workspace Layout

```
┌─────────────────────────────────────────────────────────────┐
│  CommandBar (project name | discipline breadcrumb)           │
├────┬────────────────────────────────────────────────────────┤
│    │  Stage Rail (discipline-specific stages)               │
│ S  ├────────────────────────────────────────────────────────┤
│ i  │                                                         │
│ d  │  Stage-specific content (design / analysis / export)    │
│ e  │                                                         │
│ b  ├────────────────────────────────────────────────────────┤
│ a  │  Properties Panel | BOQ Panel | AI Chat (toggled)      │
│ r  │                                                         │
└────┴────────────────────────────────────────────────────────┘
```

### 6.2 Empty States

Every new workspace must have an empty state:
- "No interior design yet — start with a room template"
- "No site analysis yet — set your project location"
- "No presentation boards yet — create from a template"

### 6.3 Persona Modes (aspirational — not in v1 scope)

- **Beginner mode:** guided step-through, fewer options, tooltips
- **Professional mode:** full tooling, keyboard shortcuts, batch operations

Not committed for v1. If added, it must be a simple UI toggle, not a separate codebase.

### 6.4 Drawing Standards UI

- Sheet size selector (A4/A3/A1/A0) in drawing toolbar
- Layer visibility panel with AIA standard group names
- Dimension style picker per drawing view
- Title block editor (project info, revision table, dates)

---

## 7. Export Strategy

### 7.1 Export Pipeline (corrected from v1.0)

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  SVG Drawing  │────▶│   DXF Writer     │────▶│  .dxf File   │
│  (React/SVG)  │     │  (pure function) │     │  (download)  │
└──────────────┘     └─────────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ AIA Layer Map │
                    │ DimStyle Map  │
                    └──────────────┘
```

### 7.2 Export Matrix

| Content | Format | Method | Status |
|---------|--------|--------|--------|
| Individual drawings | DXF | Pure function → string → blob | P6 (new) |
| Individual drawings | SVG | Current SVG + `download` attribute | Existing |
| Presentation sheet | PDF | jsPDF from SVG (reuses existing `sheetExport.ts`) | Existing |
| Presentation sheet | PNG | SVG → canvas → blob (reuses existing `sheetExport.ts`) | Existing |
| Drawing set (multi-page) | PDF | jsPDF from multiple SVGs | Enhanced |
| BOQ | CSV | Current `buildExportCsv` | Existing |
| BOQ | HTML dossier | Current `buildExportHtml` | Existing |
| BOQ | PDF | jsPDF + autoTable | Existing |
| 3D BIM | GLB | Current Three.js GLB export | Existing |
| Project archive | `.beproj` | ZIP of all project JSON + assets | P0 (cross-cutting) |

### 7.3 Project Archive Format (`.beproj`)

```
project.beproj/
  manifest.json          ← formatVersion, schemaVersion, file list, appVersion, createdAt, checksum
  project.json           ← full Project export
  planModels.json        ← PlanModel array
  interiors.json         ← InteriorProject or null
  siteContexts.json      ← SiteContext or null
  boards.json            ← PresentationBoard array
  cadDocs.json           ← CadDocument array
  bimModels.json         ← BimModel array
  boqs.json              ← BOQ array
  snapshots.json         ← ProjectSnapshot array
  transactions.json      ← TransactionEvent array
  assets/
    backdrop-{hash}.png  ← extracted backdrop images
    snapshot-{hash}.png  ← extracted 3D snapshots
```

**manifest.json:**
```json
{
  "formatVersion": 1,
  "schemaVersion": 5,
  "appVersion": "0.9.0",
  "createdAt": "2026-07-10T12:00:00.000Z",
  "files": ["project.json", "planModels.json", "interiors.json", ...],
  "checksum": "sha256-of-manifest+all-files"
}
```

### 7.4 Naming Conventions

```
Drawings: {project-code}_{sheet-number}_{revision}_{description}.dxf
Boards:   {project-code}_BOARD_{board-number}_{revision}.pdf
Archives: {project-code}_{date}_{version}.beproj
```

### 7.5 Export Governance

Every exported document includes:
- Project name/number
- Issue date + revision date
- Revision number
- Discipline
- Sheet number
- Drawing title
- "Issued for" status (Preliminary / For Review / For Construction / As Built)

---

## 8. Test Strategy

### 8.1 Test Files by Phase

| Phase | Test File | Type | Tests |
|-------|-----------|------|-------|
| P0 | — | — | — |
| P1 | `titleBlock.test.ts` | Unit | 8 |
| P1 | `dimensionStyles.test.ts` | Unit | 6 |
| P1 | `layerStandard.test.ts` | Unit | 8 |
| P1 | `sheetSet.test.ts` | Unit | 4 |
| P1 | `namingConventions.test.ts` | Unit | 4 |
| P2 | `disciplineStore.test.ts` | Unit | 6 |
| P2 | `disciplineBoqAdapter.test.ts` | Unit | 8 |
| P2 | `stageRegistry.test.ts` | Unit | 6 |
| P2 | `disciplineFilter.integration.test.ts` | Integration | 10 |
| P3 | `interiorDomain.test.ts` | Unit | 10 |
| P3 | `interiorStore.test.ts` | Unit | 6 |
| P3 | `finishSchedule.test.ts` | Unit | 8 |
| P3 | `interiorToBoq.test.ts` | Integration | 8 |
| P3 | `interiorCanvas.test.tsx` | Component | 8 |
| P4 | `heliodon.test.ts` | Unit | 12 |
| P4 | `shadowCast.test.ts` | Unit | 10 |
| P4 | `windAnalysis.test.ts` | Unit | 6 |
| P4 | `siteAnalysis.test.ts` | Unit | 8 |
| P4 | `sunPathDiagram.test.ts` | Unit | 6 |
| P4 | `shadowOverlay.test.ts` | Unit | 8 |
| P5 | `detectionReview.test.ts` | Unit | 8 |
| P5 | `importWorkflow.test.ts` | Integration | 12 |
| P6 | `dxfWriter.test.ts` | Unit | 12 |
| P6 | `dxfDimensions.test.ts` | Unit | 8 |
| P6 | `dxfBlocks.test.ts` | Unit | 8 |
| P6 | `dxfRoundtrip.test.ts` | Integration | 12 |
| P6 | `dxfPaperSpace.test.ts` | Unit | 6 |
| P6 | `dxfImporter.test.ts` | Unit (modify existing) | 4 |
| P7 | `boardLayout.test.ts` | Unit | 8 |
| P7 | `boardExport.test.ts` | Integration | 8 |
| P7 | `presentationStore.test.ts` | Unit | 6 |
| P7 | `boardAnnotator.test.tsx` | Component | 8 |
| P8 | `lessonEngine.test.ts` | Unit | 6 |
| P8 | `academyStore.test.ts` | Unit | 4 |
| P8 | `skillPath.test.tsx` | Component | 5 |
| **Cross-cutting** | `dxfRoundtrip.test.ts` | Integration | 12 |
| **Cross-cutting** | `archiveRoundtrip.test.ts` | Integration | 10 |
| **Cross-cutting** | `migrationV4toV5.test.ts` | Integration | 8 |
| **Cross-cutting** | `performanceSmoke.test.ts` | Performance | 6 |

**Cross-cutting migration tests (required):**
| Test | Type | What it verifies |
|------|------|------------------|
| `migrationV4toV5.test.ts` | Integration | v4 DB opens in v5 without data loss |
| `migrationOldProjects.test.ts` | Integration | Old projects load without new tables |
| `migrationNullSafety.test.ts` | Integration | Null-safe defaults applied for missing fields |
| `migrationCorruption.test.ts` | Integration | Broken/partial records fail gracefully (no crash) |

These are critical for a local-first app where the user's browser data IS the database.

**Total estimated new tests:** ~285

### 8.2 Test Patterns

| Pattern | Description |
|---------|-------------|
| **Unit** | Pure function tests (no DOM, no stores) |
| **Integration** | Store + IndexedDB + adapter combined |
| **Component** | React Testing Library render + interaction |
| **Performance** | Render time budgets, bundle size checks |

---

## 9. Risks, Tradeoffs & Fallback Behavior

| Risk | Severity | Mitigation | Fallback |
|------|----------|------------|----------|
| **DWG compatibility** | High | DXF-first with AIA layers. No native DWG. | Instructions for free ODA Converter / LibreCAD |
| **OpenCV.js WASM load failure** | Medium | Lazy-load with progress bar (existing pattern) | "Detection unavailable" + manual tracing on backdrop |
| **WebGL unavailable** | Medium | `Bim3DUnavailable` component exists | 2D elevation drawings |
| **Heliodon CPU cost** | Low | Memoize by date range; Web Worker for batch | Show current-date only |
| **Image detection overpromise** | Medium | UX says "detect, reconstruct, clean up" — not magic | Manual tracing fallback always available |
| **Interior fixture SVG complexity** | Medium | Reuse MEP symbol pattern (12 existing) | Text labels for unsupported fixtures |
| **Multi-discipline state complexity** | Medium | `disciplineTags: Discipline[]` on entities — lightweight | "Show all" mode |
| **Presentation board large sheets** | Low | Chunked render, vector-first export | Image fallback for very large A0 |
| **DXF roundtrip fidelity** | Medium | Roundtrip tests in P6 | Documented tolerance in export notes |
| **DB migration corruption** | Low | Additive-only v4→v5; null-safe reads | Console.warn + empty init — never crash |
| **npm ci / build failure** | High | P0 blocks all further work | Fix or document before proceeding |
| **Export naming inconsistency** | Low | Naming conventions defined in Appendix D | Default naming if project code not set |

### Performance Budget

| Metric | Existing (Sprint 95) | Target |
|--------|---------------------|--------|
| Initial JS bundle | ~575KB | <650KB |
| Lazy chunk per studio route | — | <200KB |
| TTI | ~2.5s | <4s |
| Lighthouse Performance | 74-76 | >70 |
| Lighthouse A11y | 100 | 100 |
| Lighthouse BP | 100 | 100 |
| Lighthouse SEO | 100 | 100 |

---

## 10. Acceptance Criteria

### P0 — Stabilization (Hard Gate — Binary Pass/Fail)

- [ ] `npm ci` passes from clean clone (fresh `rm -rf node_modules && npm ci`)
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes within warning budget (currently ≤10)
- [ ] `npm test` passes fully — all suites green
- [ ] `npm run build` passes in CI memory envelope
- [ ] README and CI badge match actual branch state
- [ ] In-app copy: no false claims about sharing/sync/PDF import/"synced when online"
- [ ] Baseline metrics captured and documented (see Appendix B)

**P0 is a hard blocker. Do not start P1 until all checks pass.

### P1 — Drafting Standards
- [ ] Title block renders on all drawing views (project name, date, scale, sheet num, revision)
- [ ] Dimension annotations follow configurable style
- [ ] AIA layer names in DXF: `A-WALL`, `A-DOOR`, `A-GLAZ`, `A-ANNO`, `A-DIMS`
- [ ] Sheet size selector (A4/A3/A1/A0) changes SVG viewBox
- [ ] All existing tests still pass

### P2 — Multi-Discipline Framework
- [ ] Discipline switcher visible in sidebar
- [ ] Stage rail adapts to selected discipline
- [ ] CAD layers filter by discipline
- [ ] BIM 3D view filters by discipline
- [ ] BOQ adapts groups/sections to discipline
- [ ] Numeric stage IDs fully replaced with string StageId

### P3 — Interior Design Studio
- [ ] ≥40 fixture components in library
- [ ] Room templates for bathroom, kitchen, bedroom, living, office
- [ ] Fixtures snap to grid within room boundaries
- [ ] Material palette assigns finishes per room/surface
- [ ] Finish schedule + interior items appear in BOQ

### P4 — Heliodon & Site Analysis
- [ ] Sun position matches NOAA calculator within ±0.5°
- [ ] Shadow polygons correct for rectangular/L-shaped buildings
- [ ] Site context model persists to IndexedDB
- [ ] Wind rose data configurable by region
- [ ] Sun-path diagram SVG with hourly markers
- [ ] Annual exposure kWh/m² per facade

### P5 — Image-to-Plan AI
- [ ] Drag-drop upload with preview + scale calibration
- [ ] OpenCV.js detection runs with progress indicator
- [ ] Detected walls convert to editable PlanModel
- [ ] Manual clean-up tools (add/delete/move)
- [ ] Confidence overlay per detected wall

### P6 — Professional DXF Export
- [ ] DXF opens in LibreCAD without errors
- [ ] AIA layers present
- [ ] Paper space layout with title block
- [ ] Dimension entities export correctly
- [ ] Block entities as INSERT
- [ ] Roundtrip: export → import → geometry matches within tolerance

### P7 — Presentation Boards (v1 scope frozen)
- [ ] Custom grid layout (1-9 cells)
- [ ] Board can contain SVG drawings, 3D snapshots, text, callouts
- [ ] ≥3 templates (Concept, Design Development, Planning)
- [ ] PDF export at correct A1 sizing
- [ ] Annotation tools: text, arrow callout, dimension label
- [ ] **v1 scope is frozen to the above. No freehand drawing, no layer compositing, no image filters.**

### P8 — Academy
- [ ] ≥5 skill paths, ≥3 lessons each
- [ ] Content renders from Markdown
- [ ] Progress persists across sessions
- [ ] In-context tooltips link to lessons

---

## 11. Appendices

### Appendix A — Dependency Audit

All new features use **zero paid APIs** and **zero new npm packages** with restrictive licenses:

| Feature | Dependencies | License | Source |
|---------|-------------|---------|--------|
| Heliodon | Pure trig (no lib) | MIT | Built-in |
| Shadow casting | Pure geometry | MIT | Built-in |
| Wind analysis | Pure math | MIT | Built-in |
| DXF writer | String building | MIT | Built-in |
| Presentation boards | Existing SVG + jsPDF | MIT | Existing deps |
| Interior design | Existing pointer/touch patterns | MIT | Built-in |
| Image detection | `@techstark/opencv-js` (existing) | Apache 2.0 | Existing dep |
| Academy | Markdown + Zustand + Dexie (existing) | MIT | Existing deps |
| Print font | System Arial/Helvetica/sans-serif fallback | — | System font |

**No new npm packages required.**

---

### Appendix B — Baseline Metrics Capture (P0)

Before P0 exit, record:

```
npm ci:          [PASS/FAIL]
npm run typecheck: [PASS/FAIL] — errors: ___
npm test:        [PASS/FAIL] — suites: ___ / ___ passing — failing: ___
npm run build:   [PASS/FAIL] — output size: ___ KB — memory peak: ___
Lighthouse Perf: ___ — A11y: ___ — BP: ___ — SEO: ___
Total src files: ___
Total tests: ___
Bundle size (initial): ___ KB
```

---

### Appendix C — Data Migration Strategy (Dexie v5)

```typescript
db.version(5).upgrade(tx => {
  // v4 → v5: purely additive — 4 new tables
  // No data transformation needed for existing records
  // New tables initialized empty
  console.info('Migrating BudgetEngineer DB: v4 → v5 (add interiors, siteContexts, presentationBoards, academyProgress)');
}).on('error', err => {
  console.warn('Dexie migration v4→v5 failed — continuing with empty state', err);
});

// Fallback behavior:
// - All new stores initialize with default empty values
// - null-safe reads: store accessors return null/[] if table missing
// - No destructive migration ever
// - Corrupted/partial local data: catch at read boundary, log, return defaults
```

**Repair strategy:**
- If a table access throws → delete and recreate table → log warning
- If checksum validation fails on project archive import → reject import with "file corrupted" message

---

### Appendix D — Naming & Revision Standards

```
Drawing Number Format:  {DISCIPLINE}-{SEQUENCE}
Discipline Prefixes:    A=Architecture, S=Structure, M=MEP, I=Interior, L=Landscape
Example:                A-101 (Architecture, sheet 101)

Revision Format:        R{NN}
Example:                R02

Project Code Format:    {CLIENT}-{PROJECT-NUM}
Example:                BRAD-001

Full Drawing Name:      {PROJECT-CODE}_{DISCIPLINE}-{SHEET-NUM}_{REV}_{TITLE}.dxf
Example:                BRAD-001_A-101_R02_Floor-Plan.dxf

Board Name:             {PROJECT-CODE}_BOARD_{SEQ}_{REV}.pdf
Example:                BRAD-001_BOARD_01_R01.pdf

Archive Name:           {PROJECT-CODE}_{YYYY-MM-DD}_v{VERSION}.beproj
Example:                BRAD-001_2026-07-10_v1.beproj

Revision History (in title block):
  Rev | Date       | Description          | By
  R00 | 2026-07-01 | Preliminary Issue    | BE
  R01 | 2026-07-08 | For Review           | BE
  R02 | 2026-07-15 | For Construction     | BE

Issue Status: [Preliminary | For Review | For Construction | As Built]
```

---

### Appendix E — Project Package Format (`.beproj`)

```json
{
  "formatVersion": 1,
  "createdBy": "Budget Engineer Premium v0.9.0",
  "createdAt": "2026-07-10T12:00:00.000Z",
  "checksum": "sha256-hex-of-payload",
  "payload": {
    "project": { /* Project */ },
    "interior": { /* InteriorProject | null */ },
    "siteContext": { /* SiteContext | null */ },
    "presentationBoards": [ /* PresentationBoard[] */ ],
    "cadDocuments": [ /* CadDocument[] */ ],
    "bimModels": [ /* BimModel[] */ ],
    "boqs": [ /* BOQ[] */ ],
    "snapshots": [ /* ProjectSnapshot[] */ ],
    "transactions": [ /* TransactionEvent[] */ ],
    "assets": {
      "backdropImages": [ /* base64 of loaded backdrop images */ ],
      "snapshots": [ /* base64 of 3D view snapshots */ ]
    }
  }
}
```

**Import conflict behavior:**
| Scenario | Action |
|----------|--------|
| `.beproj` schema version > app supports | Reject with "created by newer version — upgrade app" |
| Checksum mismatch | Reject with "file corrupted — do not use" |
| Import into empty workspace | Create new project from archive |
| Import with same project name | Create as new project copy (append counter) |
| Import over existing project ID | Default: create new project. Option: replace if user confirms. |
| Missing optional sections (no interiors, no boards) | Load gracefully — skip missing files, log warning |
| Partial asset corruption | Skip corrupt asset, log warning, continue import |

**Schema versioning:**
- `formatVersion` integer, incremented on breaking changes
- Import reads `formatVersion` first; rejects if > supported version
- Backward-compatible: older versions upgrade silently
- Migration handlers: `upgradeV1toV2(pkg)`, etc.

**Default import behavior:** Always import as a **new local project copy**. Never overwrite silently.

---

*End of v1.1 plan. All revisions from review incorporated: P0 added, Arial licensing fixed, multi-discipline moved earlier, stage IDs replaced, portability added, paths normalized, export stack corrected, DB migration detailed, appendices expanded.*
