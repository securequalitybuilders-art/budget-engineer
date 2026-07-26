# Sprint 82 — 6-Stage Workflow Navigation & Dashboard IA Restructure

## Objective
Restructure the monolithic Dashboard view into 6 discrete workflow stages with a persistent left navigation rail, matching the user's mental model of the design workflow: Brief → Concept → Design → Engineering → Docs & BIM → Cost & Deliver.

## Changes

### New files
| File | Purpose |
|------|---------|
| `src/components/dashboard/stages.ts` | Shared `STAGES` array and `WorkflowStage` type (id, label, shortLabel, description, icon) |
| `src/components/dashboard/StageRail.tsx` | Left vertical nav rail with active highlight, `aria-current="step"`, blocked/done/active/upcoming status dots |
| `src/components/dashboard/stages/BriefStage.tsx` | AiBriefPanel + generated design option cards (when designs exist) |
| `src/components/dashboard/stages/ConceptStage.tsx` | Design option cards + PlanComparison + empty state with Generate button |
| `src/components/dashboard/stages/DesignStage.tsx` | Toolbar (CAD tools + view toggle) + PlanCanvas / 3D viewer / DrawingsPanel + CadSyncControls |
| `src/components/dashboard/stages/EngineeringStage.tsx` | EngineeringStudioPanel (all tabs) + EngineeringAnalysisPanel |
| `src/components/dashboard/stages/DocsBimStage.tsx` | DrawingsPanel + 3D model viewer with Drawings/3D toggle |
| `src/components/dashboard/stages/CostDeliverStage.tsx` | BoqExportPanel + empty state when no design selected |

### Modified files
| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replaced monolithic main content area with StageRail + stage switch; removed EngineeringStudioPanel/BoqExportPanel/EngineeringAnalysisPanel from right sidebar (moved into stage content); onboarding tour "Get started" now sets `activeStage=1` |
| `src/components/dashboard/BuilderJourneyGuide.tsx` | Uses `activeStage` from uiStore instead of computing step from individual UI props |

### Tests
`src/__tests__/stageNavigation.test.tsx` — 18 tests:
- `stages` module: exports 6 stages with labels, each has id/shortLabel/description/icon
- `StageRail`: renders all 6, role="navigation", aria-current="step", onStageChange called on click, blocked status
- `BriefStage`: renders without crashing, shows design option cards
- `ConceptStage`: empty state, design option cards + PlanComparison
- `DesignStage`: empty state, toolbar with view buttons
- `EngineeringStage`: empty state, EngineeringStudioPanel rendered
- `DocsBimStage`: empty state, view toggle
- `CostDeliverStage`: empty state

### Accessibility
- StageRail uses `role="navigation"` with `aria-label="Workflow stages"`
- Active stage button has `aria-current="step"`
- All stage buttons keyboard-operable

## Metrics
- 894 tests pass (49 files) — 18 new tests
- 0 typecheck errors
- 0 lint errors (9 warnings — same as baseline)
- Build green with 30 PWA entries
- 0 occurrences of `text-stone-500` in app files
