# Release Notes — v1.0.1 Premium Studio UI Integration & QA Update

> **Release date:** 2026-07-11  
> **Codename:** Premium Studio UI Integration & QA Update  
> **Previous version:** v1.0.0  
> **Tests:** 1,130 across 68 test files  
> **Typecheck:** ✅ Green (strict mode)  
> **Build:** ✅ Green  
> **Lint:** ✅ 0 errors, 8 non-blocking warnings

---

## Overview

**Budget Engineer v1.0.1** completes the **Premium Studio UI Integration & QA pass**.

While v1.0.0 introduced the Premium Architectural Studio feature set, this patch release ensures those capabilities are now properly:

- routed
- discoverable
- mounted in the visible shell
- reachable through normal user workflows
- protected by additional integration and QA coverage

This release does **not** redefine the core product scope.  
Instead, it closes the gap between:

- **implemented in code**
and
- **actually shipped in the UI**

---

## What This Release Fixes

Before v1.0.1, several Premium Studio features existed in code but were only partially surfaced in the UI.

This release completes that integration by making the following fully reachable:

- Interior Studio
- Site Analysis Studio
- Presentation Studio
- Academy
- Guided Import Workflow
- DXF export from visible UI entry points
- Discipline-aware stage navigation
- Route-level error boundaries and studio empty/error states

---

## Highlights

### 1. Site Analysis Studio surfaced in UI
A new project-scoped Site Analysis page is now available:

- `/project/:id/studio/site-analysis`

This page brings the heliodon and site analysis tools into a visible, project-bound workflow with:

- latitude/longitude controls
- orientation controls
- terrain selection
- `HeliodonView`
- `SiteAnalysisPanel`

### 2. Interior Studio fully surfaced
Interior Studio is now routed and discoverable through:

- Home page Premium Studio cards
- Sidebar Studio links
- Design stage launch points

It also now handles:
- missing project context
- empty room states
- loading-state edge cases

### 3. Premium Studio discoverability improved
The app shell now exposes Premium Studio modules more clearly:

- Sidebar Studio section
- Home page Premium Studio Modules cards
- Dashboard-stage launch buttons
- Academy link always visible

### 4. Guided Import workflow mounted
The guided image-to-plan workflow is now reachable directly from the Design stage.

Users can now access:
- Guided Import
- Quick Import
- DXF/Image/PDF import options

without needing hidden or indirect paths.

### 5. DXF export surfaced in user-facing UI
The professional DXF pipeline is now available through visible buttons in:

- Design Stage toolbar
- Drawings Panel

This exercises the real path:

`PlanModel → CadDocument adapter → DXF writer → download`

### 6. Discipline-aware shell integration
The discipline framework is now actively used in the shell:

- `DisciplineSwitcher` mounted in Sidebar
- compact `DisciplineSwitcher` mounted in CommandBar
- StageRail driven by discipline-aware stage registry
- Mobile navigation aligned to the same stage logic
- semantic `StageId` workflow routing now in place

### 7. Error boundaries and empty-state hardening
This release improves resilience across the routed app:

- all major routes wrapped with safe route handling
- Presentation Studio editor isolated from route-level crashes
- studio pages now handle missing project context gracefully
- Academy lesson render failures now degrade safely
- import workflow save errors now report properly

---

## QA Summary

| Feature | Routed? | Discoverable? | Fully Integrated? | Notes |
|---|---|---|---|---|
| Home (`/`) | ✅ | ✅ | ✅ | Premium Studio cards + New Project + Import |
| Project Wizard (`/new`) | ✅ | ✅ | ✅ | 3-step creation flow |
| Project Dashboard (`/project/:id`) | ✅ | ✅ | ✅ | Discipline-aware workspace |
| Interior Studio (`/project/:id/studio/interior`) | ✅ | ✅ | ✅ | Missing-project and empty-state guards |
| Site Analysis Studio (`/project/:id/studio/site-analysis`) | ✅ | ✅ | ✅ | Project-scoped heliodon + site analysis |
| Presentation Studio (`/project/:id/studio/presentation`) | ✅ | ✅ | ✅ | ErrorBoundary wrapped |
| Standalone Site Analysis (`/site-analysis`) | ✅ | ⚠️ | ✅ | Available but less prominently linked |
| Academy (`/academy`) | ✅ | ✅ | ✅ | Empty-state + lesson error fallback |
| Portfolio (`/portfolio`) | ✅ | ✅ | ✅ | Existing portfolio flow intact |
| Feedback (`/feedback`) | ✅ | ✅ | ✅ | Existing feedback flow intact |

---

## Shell / Discipline Integration

### Mounted shell features
- Full `DisciplineSwitcher` in Sidebar
- Compact `DisciplineSwitcher` in CommandBar
- Discipline-aware stages in:
  - StageRail
  - CommandBar
  - MobileNavDrawer
  - Dashboard routing

### Current stage behavior
Examples:
- **ARCH** includes `site-analysis`
- **MEP / ELEC / PLUM / INT** use shorter relevant stage sets
- **STR / LAND / CIVIL** use discipline-scoped stage arrays

### Migration strategy
A transitional compatibility shim remains:

- `activeStageId: StageId` is now primary
- legacy `activeStage: number` remains temporarily for backwards compatibility

This will allow a future cleanup pass to remove the deprecated numeric field safely.

---

## Integration Tests Added

| File | Coverage |
|---|---|
| `src/__tests__/disciplineSystem.test.tsx` | discipline model, stage registry, store, switcher behavior |
| `src/__tests__/studioPages.test.tsx` | InteriorStudio, PresentationStudio, SiteAnalysisStudio |
| `src/__tests__/sidebarStudios.test.tsx` | Sidebar studio links and route targets |
| `src/__tests__/homeDiscoverability.test.tsx` | Home page Premium Studio discoverability |
| `src/__tests__/designStageImportWorkflow.test.tsx` | Guided import visibility and behavior |
| `src/__tests__/dxfExportUi.test.tsx` | DXF export UI visibility and trigger behavior |

---

## Quality Snapshot

| Metric | Value |
|---|---|
| Version | v1.0.1 |
| Tests | 1,130 |
| Test files | 68 |
| TypeScript | 0 errors |
| Build | Green |
| Lint | 0 errors, 8 non-blocking warnings |
| PWA | Enabled |

---

## Known Remaining Gaps

These do **not** block release, but remain useful follow-up items:

| Gap | Impact | Suggested Follow-up |
|---|---|---|
| ImportWorkflow apply path has no loading state | User receives no progress feedback during save | Add `isApplying` state and disabled/apply spinner |
| DXF export has no success/error feedback | User gets no explicit confirmation after click | Add toast/status feedback |
| InteriorStudio loading state is shallow | `isLoading` resolves immediately | Make true async persistence or simplify the state |
| PresentationStudio editor is still eagerly loaded | Heavy pages may load even if unused | Consider lazy wrapper around BoardEditor |
| Academy lesson HTML uses `dangerouslySetInnerHTML` | Content safety depends on trusted source | Add sanitization layer if untrusted content is introduced |
| Standalone Site Analysis page is less discoverable | Not surfaced as strongly as project-scoped version | Optional stronger linking if desired |
| Discipline visibility toggle uses right-click | Not obvious for all users | Add explicit visibility affordance or tooltip |

---

## Documentation Truth

As of v1.0.1:

- all major Premium Studio modules claimed in current docs are now surfaced in the UI
- no known overclaims remain in the current release documentation
- unresolved gaps are documented above as follow-up work, not hidden release debt

---

## Upgrade Guidance

If you are on **v1.0.0**, this update is recommended.

It completes the UI integration layer without changing the core local-first architecture.

---

## Final Summary

**v1.0.1** is the release that makes Premium Studio feel fully shipped.

The Premium feature set introduced in v1.0.0 is now:
- discoverable
- routed
- integrated
- guarded
- tested

---

> **Budget Engineer — Making Construction Affordable for Everyone.**
