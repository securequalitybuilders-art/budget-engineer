# Stage 28 — Parametric BIM Door/Window Family Customization (QTO Engine)

## Overview & Executive Summary
In strict alignment with the **BLAST Framework** and Dzenhare computational design philosophy (*"Construction Affordable for Everyone"*), Stage 28 implements full parametric BIM opening families. Architects and quantity surveyors can now inspect any door or glazed window in the 2D CAD plan and customize engineering family parameters such as frame dimensions, hardware handle specifications, glazing solar/acoustic ratios, and finish powdercoats. Every parameter modification recalculates dynamic takeoff markups and updates the project BOQ instantly.

## Key Architectural Additions

### 1. Parametric Family Takeoff Engine (`src/engine/boqGenerator.ts`)
- Replaced flat opening unit rates with dynamic parametric valuation rules:
  - **Commercial Panic Bar Hardware:** `+$180.00` markup valuation.
  - **Modern Lever Hardware:** `+$45.00` markup valuation.
  - **Glazing Ratio (> 40% Glass):** `+$120.00` safety/tempered panel allowance.
  - **Acoustic Laminated Glazing:** `+$140.00` acoustic specification allowance.
  - **Subdivided Commercial Mullions:** `+$60.00` structural framing allowance.

### 2. Audited Central Store Action (`src/store/appStore.ts`)
- Added `updateCadOpeningFamily(openingId, params)` routing through `persistCadAndRegen`:
  1. Merges custom family parameters into the opening's `metadata.properties`.
  2. Synthesizes updated 3D swept-solid massing.
  3. Recomputes engineering QTO rates and derives an updated `BOQ`.
  4. Commits asynchronously to local IndexedDB via Dexie.
  5. Appends an immutable audit record: `CAD_OPENING_FAMILY_UPDATED`.

### 3. Advanced Family Customization UI (`src/components/cad/CadPropertiesPanel.tsx`, `CadPlanView.tsx`)
- **Properties Panel:** When a single door or window is selected (`cadOpeningIds.length === 1`), mounts an advanced **UI Pro Max** customization card with sliders for glazing ratio, dropdowns for hardware handle styling, operation modes, and finish powdercoats.
- **2D Drafting Canvas:** Openings now visually render glass double-rings and mullion division lines directly inside the wall rough opening gap.

## Takeoff Takeoff Verification

Ran verification test (`verify_stage28.mjs`) customizing opening `o1` (*Main Entrance Door*):

| Parameter / Attribute | Base Specification | Stage 28 Family Spec | Rate Shift | BOQ Grand Total |
| :--- | :--- | :--- | :--- | :--- |
| **Hardware Style** | Modern Lever | Commercial Panic Bar | `+$180.00` | — |
| **Glazing Ratio** | Solid Timber (`0%`) | Glazed Storefront (`80%`) | `+$120.00` | — |
| **Combined Takeoff** | Base Takeoff | Markups Applied | `+$300.00` | **+$386.40 (incl taxes) ✓** |

## Deliverables & Deliverable Presentation
- **Stage Document:** `STAGE28_PARAMETRIC_BIM_OPENING_FAMILIES.md` (Presented in viewer)
- **Codebase:** Reconstructed local SPA validated with clean TypeScript compilation and clean production build.

## Next Highest-Value Strategic Candidates
1. **Multi-Project Executive Portfolio Dashboard Charts** (visualizing cost distributions across all saved schemes).
2. **Automated Structural Column Grid Generator** (auto-placing structural column foundations at wall corner intersections).
3. **Automated PDF Executive Summary Report Generator** (client-ready printable PDF portfolio dossier).

Say **proceed** to continue with candidate #1, or name your preferred priority.
