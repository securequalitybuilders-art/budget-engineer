# Stage 27 — Interactive Wall Trim & Corner Joint Solver (Geometric CAD Engine)

## Overview & Executive Summary
In alignment with the **BLAST Framework** and Dzenhare computational design principles (*"Construction Affordable for Everyone"*), Stage 27 implements an exact orthogonal CAD joint solver. Architects and drafting engineers can now fillet join any two non-parallel walls meeting at a corner or intersecting. The computational engine solves the infinite line intersection point and automatically trims or extends both wall endpoints to create a seamless geometric connection.

## Key Architectural Additions

### 1. Geometric Joint Mathematical Solver (`src/lib/cadSolver.ts`)
- Implemented `computeLineIntersection(p1, p2, p3, p4)` determining exact coordinate intersection `(ix, iy)` using Cramer's rule determinant solving.
- Implemented `solveWallCorner(wallA, wallB)` determining which specific endpoints of both walls (`start` vs `end`) are closest to the computed intersection point and snapping them to join flush.

### 2. Audited Store Action (`src/store/appStore.ts`)
- Added `trimExtendCadWalls(wallAId, wallBId)` routing through the central `persistCadAndRegen` pipeline:
  1. Computes the corner intersection coordinate `(ix, iy)`.
  2. Updates source `CadDocument` wall entities.
  3. Synthesizes healed 3D swept-solid `BimModel` massing.
  4. Recalculates engineering quantities and updates `BOQ` takeoff totals.
  5. Commits to local IndexedDB via Dexie and appends an immutable audit record: `CAD_WALLS_TRIMMED_JOINED`.

### 3. Interactive Drafting UI & Tool Palette (`src/components/cad/CadPlanView.tsx`, `CadPropertiesPanel.tsx`)
- **Canvas Tool:** Added **✂ Trim / Join** mode (`'trim'`). Clicking the first wall highlights it in violet; clicking the second wall triggers the corner solver and joins them instantly.
- **Properties Panel:** When exactly two walls are multi-selected (`cadWallIds.length === 2`), mounts a dedicated **UI Pro Max** solver card with a single-click corner fillet CTA.

## Proven Takeoff Verification

Ran verification benchmark (`verify_stage27.mjs`) joining two overlapping walls meeting near `(12, 0)`:

| Wall Entity | Initial Vectors | Stage 27 Solved Vectors | Joint Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Wall A (South)** | `(0, 0) → (14, 0)` | `(0, 0) → (12, 0)` | Trimmed `-2.0 m` | PASS ✓ |
| **Wall B (East)** | `(12, -2) → (12, 8)` | `(12, 0) → (12, 8)` | Trimmed `+2.0 m` | PASS ✓ |
| **Intersection Pt** | Unjoined | `(12.0, 0.0)` | Corner Flush | PASS ✓ |

## Deliverables & Deliverable Presentation
- **Stage Document:** `STAGE27_INTERACTIVE_WALL_TRIM_JOINT_SOLVER.md` (Presented in viewer)
- **Codebase:** Complete reconstructed SPA in `/home/user/budget-engineer-os` validated with clean TypeScript and production build.

## Next Highest-Value Strategic Candidates
1. **Parametric BIM Door/Window Family Customization** (custom frame width, glazing ratio, hardware styling).
2. **Multi-Project Executive Portfolio Dashboard Charts** (visualizing cost distributions across all saved schemes).
3. **Automated Structural Column & Slab Footoff Grid Generator** (auto-placing structural column foundations at wall corner intersections).

Say **proceed** to continue with candidate #1, or name your preferred priority.
