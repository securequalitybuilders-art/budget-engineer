# Sprint 41 — Fix 3D Roof Coverage, Render All Doors/Windows, Add Room Ceilings

## Phase 1 — Diagnosis

### A) Roof collapsed to thin triangular sliver

**Root cause:** Wrong triangle indices in `RoofMesh` at `src/components/bim/BimModel3D.tsx:147-173`.

For `ridgeAxis='x'` (width >= height), the code built vertices with 6 points forming a gable roof, but the indices for the roof surfaces were wrong:

```ts
// BUG (ridgeAxis='x'):
// South roof:  0,4,1   1,4,5   ← WRONG
// North roof:  3,5,2   3,4,5   ← WRONG
// West gable:  0,3,4
// East gable:  1,5,2
```

Triangle `(0,4,1)` uses SW eave (z=-oh), ridge W end (z=bd/2), and SE eave (z=-oh) — a huge diagonal spanning the building. Triangle `(1,4,5)` uses SE eave (z=-oh), ridge W end (z=bd/2), and ridge E end (z=bd/2) — a nearly vertical triangle at the east side. Together these form degenerate surfaces, not a proper roof quad, causing the roof to collapse to a narrow sliver/crease along the ridge.

Similarly for `ridgeAxis='z'`, the indices `(1,5,2)` and `(1,4,5)` for the "east roof" were malformed.

**Correct indices:**
```ts
// FIX (ridgeAxis='x'):
// South roof (quad 0,1,5,4): 0,1,5  0,5,4
// North roof (quad 3,2,5,4): 3,2,5  3,5,4
// West gable (triangle 0,3,4): 0,3,4
// East gable (triangle 1,2,5): 1,2,5
```

### B) Doors/windows not rendering on all walls

**Root cause:** `DoorMesh` and `WindowMesh` used inconsistent Y positioning in `src/components/bim/BimModel3D.tsx`.

The `<group>` wrapping each door/window was positioned at `[centerX, 0, centerZ]` — Y always 0 — with sub-meshes using world-space Y computed as `op.centerY + offset`. This worked for storey 0 but relied on `centerY = 0`, making the Y arithmetic confusing and potentially fragile if `centerY` ever differed from the group Y.

Additionally, the `leafY` variable in `DoorMesh` was `op.centerY + leafH/2` which produced ambiguous world-vs-local semantics.

**Fix:** Changed the group Y to `op.centerY` (the storey floor level), making all sub-mesh positions local to the storey (sill at local Y=0, leaf center at leafH/2, etc.). This ensures doors/windows are always seated at the correct Y regardless of storey.

**Opening count parity:** The data layer (`planTo3d.ts:splitWall`) always produces the correct number of openings — every `wallOpenings` filter by `wallId` resolves all openings on every wall (external and internal). The issue was only in the rendering layer.

### C) Ceilings (missing feature)

No ceiling meshes existed. Rooms were open at the top.

---

## Phase 2 — Fixes

### Roof (shipped: pitched gable)

Corrected the BufferGeometry indices for both `ridgeAxis='x'` and `ridgeAxis='z'` cases. The roof now:
- Spans the full building footprint + overhang
- Has eaveY exactly at `numberOfStoreys * storeyHeight` (top of top-storey walls)
- Ridge centered on the longer axis at apexY = eaveY + pitchHeight (1.5m rise)
- Two rectangular sloping roof planes + two triangular gable ends
- Non-degenerate, correctly-wound triangles with computed vertex normals

### Doors/Windows

- Changed group position from `[centerX, 0, centerZ]` to `[centerX, centerY, centerZ]`
- Simplified sub-mesh positions to be storey-relative (local Y)
- `DoorMesh`: leaf at `[0, leafH/2, 0]`, frame at `[±width/2, height/2, 0]`, header at `[0, height - jambW/2, 0]`
- `WindowMesh`: glass at `[0, sillHeight + height/2, 0]`, frame at correct local positions
- Every `Opening3d` in `result.openings` renders — no filtering by wall type, no first-only

### Ceilings

- Added `CeilingSlab` interface to `src/adapters/planTo3d.ts`
- Generates one ceiling per room per storey: thin slab (0.05m) at top of each storey (Y = `(storey+1)*storeyHeight - thickness`), spanning the room footprint with 0.05m inset
- Rendering: `<CeilingMesh>` in `BimModel3D.tsx` with brand slate material `#334155`
- Included in the building group for .glb export

---

## Before vs After

| Element | Before | After |
|---------|--------|-------|
| Roof | Collapsed triangular sliver at one corner | Full pitched gable covering entire footprint + overhang |
| Doors | Only some visible (wrong Y positioning) | All doors rendered at correct storey height |
| Windows | Inconsistent visibility | All windows rendered at correct sill + height |
| Ceilings | Not present | One per room per storey, rooms enclosed at top |

---

## Verification Numbers

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (unchanged baseline) |
| Tests (`vitest run`) | **342 passed** (26 files) — +9 roof/opening/ceiling tests |
| Build (`npm run build`) | Success — 3D chunk `BimModel3D-*.js` (865 kB) code-split, GLTFExporter lazy-loaded |
