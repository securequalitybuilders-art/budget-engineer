# Sprint 14 — Guided First-Time Builder Journey

**Date:** 2026-07-01  
**Goal:** Make Budget Engineer easier for ordinary first-time builders by adding a guided plain-English journey that explains: brief → design options → 2D plan → 3D BIM → engineering checks → BOQ → export.

---

## UX Changes

### 1. Home Page — First-Time Builder Journey Section

Added a 6-step section between the hero cards and recent projects:

| Step | Label | Description |
|------|-------|-------------|
| 1 | Describe your project | Write what you want to build in plain English. The AI handles the details. |
| 2 | Generate design options | Get up to 3 design variations to compare and choose from. |
| 3 | View 2D floor plan | See your design as a CAD drawing with rooms, doors, and windows. |
| 4 | View 3D BIM model | Switch to the 3D viewer for a realistic preview of your building. |
| 5 | Check engineering + services | Run clash detection, solar analysis, and MEP takeoff. |
| 6 | Get BOQ + export report | See cost breakdown by region and export CSV or a PDF report. |

Plain-language badges below the section:
- No CAD experience needed
- Works in your browser
- No paid AI API required
- Early estimate, not final professional sign-off

### 2. Project Wizard — Template Brief Examples

On step 3 (Describe your building), added a collapsible "Try an example brief" section with 4 template cards:

1. **Affordable family house** — 3-bedroom, 2-bathroom, open-plan living, veranda, $45,000
2. **Duplex / rental units** — 2-unit duplex, 2 bedrooms each, simple finishes, $80,000
3. **Rural clinic / NGO facility** — 4 consultation rooms, solar power, rainwater harvesting, $120,000
4. **Small shop / commercial space** — ground-floor shop, storage, WC, $30,000

Clicking a template fills the brief field and collapses the section.

### 3. Dashboard — BuilderJourneyGuide Panel

New panel added as the first item in the right sidebar:

- **Collapsible** — `aria-expanded`/`aria-controls` on the header toggle
- **Current step** — highlighted in an amber-tinted card with "Next" action text
- **6-step progress list** — ordered list (`<ol>`) with numbered circles (done ✓, active highlighted, upcoming dimmed)
- **Template briefs** — when at step 1, shows an "Try an example brief" dropdown that links to `/new`
- **Safety note** — always visible footer: "For final construction, consult a registered architect, engineer, and quantity surveyor."
- **Disclaimer strip** — "No CAD experience needed. Works in your browser. No paid AI required."

**Props:** `hasDesignOptions`, `selectedDesignName`, `activeCanvasView`, `hasBoq`, `hasAnalysis`

Journey state machine:
- No design options → step 1
- Design options exist, plan view → step 2-3
- BIM view → step 4
- Analysis available → step 5
- BOQ available → step 6

### 4. Empty State Improvements

Updated empty state text in 5 panels to be beginner-friendly:

| Panel | Before | After |
|-------|--------|-------|
| Dashboard canvas | "Generate design options from a brief to see 2D CAD plans." | "Go to the AI Brief panel on the right to describe your project in plain English." |
| BOQ & Export | "Generate or select a design option to create a BOQ." | "Describe your project in the AI Brief first. Once a design is ready, this panel shows your cost estimate and lets you export a report." |
| Engineering Analysis | "Select or generate a design option to run engineering analysis." | "Describe your project in the AI Brief first. Once designs are ready, this panel checks for clashes, solar orientation, and services." |
| Footing sizing | "Generate a design option to size footings." | "Start with the AI Brief tab to describe your project. Once a design is generated, footings can be sized here." |
| Load analysis | "Generate a design option to analyse loads." | "Start with the AI Brief tab to describe your project. Load analysis runs once a design is ready." |
| Section view | "Generate a design option to view building sections." | "Start with the AI Brief tab. Once a design exists, section views appear here." |

### 5. Accessibility

- **BuilderJourneyGuide**: `role="region"` with `aria-label="Builder journey guide"`, collapsible header with `aria-expanded`/`aria-controls`, step list uses `<ol>` with `aria-label="Journey steps"`, step indicator circles have `aria-hidden="true"`, template section uses `aria-expanded`
- **Home page journey section**: uses `<section>` with `<h2>` heading, step cards use semantic heading hierarchy
- **Existing panels**: Boostrap Panel already has `htmlFor`/`id` on region select, `aria-expanded`/`aria-controls` on assumptions toggle (from Sprint 12)

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/dashboard/BuilderJourneyGuide.tsx` | Journey guide panel — current step, progress list, template briefs, safety note |
| `docs/SPRINT_14_BUILDER_JOURNEY_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Added 6-step "First-Time Builder Journey" section with icon cards and plain-language badges |
| `src/pages/ProjectWizard.tsx` | Added collapsible "Try an example brief" with 4 template cards on step 3 |
| `src/pages/Dashboard.tsx` | Imported and rendered BuilderJourneyGuide in right sidebar with props |
| `src/components/dashboard/BoqExportPanel.tsx` | Updated empty state text |
| `src/components/dashboard/EngineeringAnalysisPanel.tsx` | Updated empty state text |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | Updated 3 empty state messages (footings, loads, section) |
| `CANONICAL_REPO_STATUS.md` | Status → Sprint 14 |
| `MERGE_LOG.md` | Added Sprint 14 entry |
| `README.md` | Mentioned builder journey |

---

## Test Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm test` | ✅ PASS (73 tests, 8 files — no test changes needed) |
| `npm run build` | ✅ PASS (3371 modules, 16 precache) |

No new tests were added — all changes are UI/UX only with no pure helper functions suitable for unit testing. Component-level testing remains deferred.

---

## Remaining Limitations

- The BuilderJourneyGuide shows "step completed" based on state (design exists, BIM view, etc.) rather than actual user interaction tracking — a first-time user who opens the dashboard for the first time will see step 1 regardless
- Template briefs on the Project Wizard prefill the textarea but don't auto-fill derived fields (budget, region)
- The guide does not persist its collapsed/expanded state across sessions
- No tutorial overlay or onboarding tooltip system — purely a static reference panel
- Component-level tests still deferred (PlanCanvas, LazyBimViewer, Dashboard panels)
- Multi-floor room distribution for >2 floors still deferred
