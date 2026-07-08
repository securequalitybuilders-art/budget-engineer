# v0.9.0 — Workspace, Import & Offline Extraction

> **Release date:** 2026-07-07  
> **Previous release:** v0.8.0 (SADC Building-Code Compliance)

---

## Headline

**Workspace UX:** First-run onboarding tour, 6-stage navigation rail, unified sidebar dashboard with project tools.  
**Import & Extraction:** DXF import → editable PlanModel, multi-format image/PDF backdrop with scale calibration, offline floor-plan wall/room detection via OpenCV.js (WASM).

---

## New Features

### Workspace UX (Sprints 81–83)

- **Onboarding tour** — 6-step interactive overlay on first visit, accessible ARIA, keyboard nav, re-openable from Home footer
- **6-stage navigation rail** — Brief → Concept → Design → Engineering → Docs & BIM → Cost & Deliver with status indicators and empty-state CTAs
- **Unified left sidebar** — stage rail + cross-cutting project tools (BuilderJourneyGuide, Properties, Transactions, Governance, Snapshots, Feedback)

### Import & Extraction (Sprints 84–87)

- **DXF import** — LINE + LWPOLYLINE parsing into editable PlanModel, auto-detect mm units, 7 tests
- **Image/PDF backdrop** — upload as traceable SVG overlay, opacity/visibility controls, scale calibration (px-per-metre)
- **Backdrop rendering fix** — canvas renders immediately when backdrop exists without requiring a design selection
- **Offline wall detection** — "Detect walls" button lazy-loads OpenCV.js, runs HoughLinesP pipeline, creates editable PlanModel with "auto-detected — review and correct" labelling

---

## Quality

| Metric | Value |
|--------|-------|
| Unit tests | **949 passed** (52 files) |
| TypeScript errors | 0 |
| Lint errors | 0 (9 warnings, unchanged) |
| PWA precache | 32 entries |
| Build | Green |

### Full Lint Warnings (9)

```
src/components/ui/Badge.tsx         38  react-refresh/only-export-components
src/components/ui/Button.tsx        53  react-refresh/only-export-components
src/hooks/useCadDocument.ts         20  react-hooks/exhaustive-deps
src/hooks/useCadHistory.ts          40  react-hooks/exhaustive-deps
src/hooks/useEditablePlan.ts        62  react-hooks/exhaustive-deps
src/hooks/usePlanHistory.ts         40  react-hooks/exhaustive-deps
src/services/cadPersistenceService.ts 26  @typescript-eslint/no-unused-vars (×3)
```

---

## Important Notes

- **Import is offline/free** — DXF parsing, image backdrop, and wall detection all run client-side with zero network. No API keys, no data leaving the machine.
- **Detection is approximate** — OpenCV.js wall detection is labelled "auto-detected — review and correct." Accuracy depends on image quality, line thickness, and plan complexity. The user is always placed in the editor to correct dimensions.
- **OpenCV.js lazy-loaded** — 14.5 MB chunk loaded on first "Detect walls" click. Not in main bundle. Not in PWA precache (browser-cached after first use).
- **DPI-independent** — scale is set per-image via the calibration dialog that asks for known width/height in metres.

---

## Files Changed Since v0.8.0

### New Files
- `docs/RELEASE_NOTES_v0.9.0.md`
- `docs/SPRINT_87_WALL_DETECTION_REPORT.md`
- `src/__tests__/wallDetection.test.ts` (17 tests)
- `src/lib/import/wallDetection.ts` (detectWallsFromImage + pure helpers)
- `src/lib/import/dxf-importer.ts`
- `src/lib/import/importRouter.ts`
- `src/lib/import/backdropUtils.ts`
- `src/components/cad/TraceBackdrop.tsx`
- `src/components/dashboard/stages.ts`, `StageRail.tsx`, `BriefStage.tsx`, `ConceptStage.tsx`, `DesignStage.tsx`, `EngineeringStage.tsx`, `DocsBimStage.tsx`, `CostDeliverStage.tsx`
- `src/__tests__/onboardingTour.test.tsx`
- `src/__tests__/stageNavigation.test.tsx`

### Modified Files
- `src/pages/Dashboard.tsx` — stage routing, handleDesignCreated, handleImportFile, backdrop state
- `src/components/cad/PlanCanvas.tsx` — empty plan creation, onDesignCreated callback, backdrop integration
- `src/components/dashboard/stages/DesignStage.tsx` — Detect walls button, detection status
- `src/pages/Dashboard.tsx` — image import → backdrop flow
- `vite.config.ts` — globIgnores opencv-* from precache
- `ATTRIBUTIONS.md` — OpenCV.js credit
- `CHANGELOG.md` — Sprint 81–87 entries

### New Dependencies
- `@techstark/opencv-js` (Apache 2.0, lazy-loaded)

---

*Full commit history: `36e4ae1..21ade10` (Sprint 87)*
