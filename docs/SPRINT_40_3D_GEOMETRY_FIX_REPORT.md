# Sprint 40 — Fix 3D BIM Geometry: Connected Walls, Seated Roof, Seated Doors and Windows

## Phase 1 — Geometry Diagnosis

### Root Cause: Single axis-swap bug in wall rotation formula

**`src/adapters/planTo3d.ts:129`** (and replicated at `:318`, `src/components/bim/BimModel3D.tsx:54`):

```ts
// BUG (what the code had):
const angle = -Math.atan2(dx, dz)

// FIX (what it should be):
const angle = Math.atan2(dz, dx)
```

`atan2(y, x)` returns the angle from the positive X axis. When computing a wall's direction in the XZ plane:
- `dx` = wall length along X
- `dz` = wall length along Z

The correct call is `atan2(dz, dx)` — measuring the angle from the +X axis toward the +Z axis. The buggy code swapped the arguments (`atan2(dx, dz)`), measuring the angle from +Z instead, AND negated the result, creating an additional sign flip.

#### How the bug affected each element:

1. **Walls (disconnected fins):**
   - Horizontal wall `(0,0)→(12,0)`: dx=12, dz=0. Bug: `-atan2(12,0) = -π/2`. Fix: `atan2(0,12) = 0`.
   - A rotation of `-π/2` around Y rotates the box's length axis (local +X) to point along world -Z instead of world +X.
   - The wall ran perpendicular to its intended direction, causing it to not connect at corners.
   - Each wall was individually correct in position but rotated 90° off, creating the "disconnected fins" appearance.

2. **Roof (floating gap):**
   - The roof data was correct: `eaveY = numberOfStoreys * storeyHeight` (`planTo3d.ts:285`).
   - Roof vertices are computed in world space (not relative to walls) and correctly span the building bounds with overhang.
   - The roof appeared to "float" because the walls were rotated wrong — the walls didn't reach the roof's eave line and didn't fill the footprint the roof covered.

3. **Doors/windows (floating in space):**
   - Opening positions (`centerX, centerZ`) were computed correctly from segment + offset ratio.
   - But `wallAngle` inherited the wrong rotation from the buggy formula.
   - The door/window group was rotated around Y by the wrong angle, making them face the wrong direction relative to the wall.
   - With the wall itself also rotated wrong, doors appeared to float beside or through the wall.

4. **Wall source was correct:**
   - `planTo3d.ts:268` iterates `plan.walls` directly (same `PlanModel.walls` segments used by the 2D PlanCanvas).
   - No per-room wall derivation, no duplication.
   - The segment start/end points DO share endpoints (forming a closed perimeter).

### Why existing tests missed this
The pure tests only checked **counts, heights, bounds, and positions** — not that wall rotations produce connected corners. The new geometric coherency tests catch this by asserting adjacent walls share endpoints and that the midpoint/rotation formula yields the correct segment direction.

---

## Phase 2 — Fix

### Changes made (3 lines changed)

| File | Line | Change |
|------|------|--------|
| `src/adapters/planTo3d.ts` | 129 | `-Math.atan2(dx, dz)` → `Math.atan2(dz, dx)` |
| `src/adapters/planTo3d.ts` | 318 | `-Math.atan2(dx, dz)` → `Math.atan2(dz, dx)` |
| `src/components/bim/BimModel3D.tsx` | 54 | `-Math.atan2(dx, dz)` → `Math.atan2(dz, dx)` |

### Test expectations fixed (1 line)

| File | Line | Change |
|------|------|--------|
| `src/__tests__/planTo3d.test.ts` | 224 | `-Math.PI/2` → `0` (horizontal wall angle) |

### New geometric coherency tests (13 tests)

| Test | What it asserts |
|------|----------------|
| `adjacent perimeter walls share endpoints` | w1.end == w2.start, w2.end == w3.start, etc. |
| `wall box position and rotation match segment midpoint and direction` | Midpoint at `(start+end)/2`, rotation = `atan2(dz, dx)` |
| `roof eave height exactly equals top of top-storey walls (no gap)` | `eaveY == numberOfStoreys * storeyHeight` |
| `roof footprint covers building bounds with overhang` | Ridge length = dimension + 2×overhang |
| `opening 3D center lies on its wall segment at offset ratio and correct height` | Position from segment start + offset × direction |
| `opening wallAngle matches its wall direction` | door on horizontal → angle 0, window on vertical → π/2 |
| `multi-storey still stacks correctly` | 3 storeys → 3 slabs, 15 walls, eave at 3×storeyHeight |

---

## Before vs After

### Before (broken geometry)
- Walls: individual rotated slabs perpendicular to their intended direction, gaps at corners, no enclosed rooms
- Roof: correct world coordinates but misaligned because walls were wrong
- Doors/windows: rotated wrongly, not seated in wall openings
- .glb export: same broken geometry

### After (coherent connected building)
- Walls: each box aligned with its segment direction, meeting at shared endpoints, forming enclosed room volumes
- Roof: eaves sit exactly on top of top-storey walls, apex at eave + pitch height, overhang beyond walls
- Doors/windows: oriented correctly within wall openings, sitting at correct offset ratio and sill/height
- .glb export: reflects the corrected assembly — serializes the same Three.js group

---

## Verification Numbers

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (unchanged baseline) |
| Tests (`vitest run`) | 333 passed (26 files) — +13 geometric coherency tests |
| Build (`npm run build`) | Success — 3D chunk `BimModel3D-*.js` (865 kB) code-split, GLTFExporter lazy-loaded |

