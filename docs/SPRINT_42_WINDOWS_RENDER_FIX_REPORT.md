# Sprint 42 — Fix Window Rendering So All Windows Are Visible in 3D BIM Model

## Phase 1 — Diagnosis

### Root cause: `WINDOW_GLASS_MAT` missing `depthWrite: false` and `side: THREE.DoubleSide`; frame too thin

After investigation of `src/components/bim/BimModel3D.tsx:28-31` and `:107-130`:

**1. Count parity confirmed correct:** `planTo3d.ts:splitWall` generates window placements identically to doors (no kind-based filtering). The rendering loop at line 270 filters `kind === 'window'` and renders every placement. The existing test `number of opening placements equals number of plan openings per storey` at line 569 passes (asserts 2 windows out of 5 openings). So windows ARE rendered — they're just invisible.

**2. Glass material:** `WINDOW_GLASS_MAT` at line 28-31:
```ts
const WINDOW_GLASS_MAT = new THREE.MeshStandardMaterial({
  color: '#06b6d4', roughness: 0.1, metalness: 0.0,
  transparent: true, opacity: 0.35,
})
```
Missing:
- `depthWrite: false` — Without this, the transparent glass writes to the depth buffer. When other scene elements (wall piers, ceiling slabs) render after the glass, they are depth-tested against the glass's depth, causing artifacts and effectively hiding the glass.
- `side: THREE.DoubleSide` — The thin glass box (thickness = `wallThickness * 0.85`) is centered inside the wall gap. Its front and back faces are visible, but without `DoubleSide`, the interior faces when viewed from inside the building are back-faces and not rendered.
- Opacity at 0.35 was too subtle to be distinguishable from the dark interior background.

**3. Frame width:** `frameW = 0.03` (3cm) and `frameDepth = 0.04` (4cm):
- At typical camera distances (15-30m for a 12m×8m building), a 3cm jamb covers less than 1 pixel. The frame is effectively invisible.
- The opaque door frame had the same issue at `jambW = 0.03`.

**4. Pier gap exists for windows:** `splitWall` at `planTo3d.ts:164-176` treats door and window openings identically — both create a gap based on `op.width` and `op.offset`. No kind-based discrimination.

**Conclusion:** The data layer is correct. The rendering layer creates the meshes. But the glass is transparent with depth corruption and 35% opacity against a dark interior, and the frame is far too thin to resolve. Both factors together make windows effectively invisible.

---

## Phase 2 — Fix

### Glass material (`BimModel3D.tsx:28-32`)
```ts
const WINDOW_GLASS_MAT = new THREE.MeshStandardMaterial({
  color: '#06b6d4', roughness: 0.1, metalness: 0.0,
  transparent: true, opacity: 0.45,
  depthWrite: false,
  side: THREE.DoubleSide,
})
```
- `depthWrite: false` — Prevents depth-buffer corruption from transparent geometry
- `side: THREE.DoubleSide` — Ensures glass is visible from both inside and outside
- `opacity: 0.45` — Slightly higher opacity for better visibility

### Frame width (`BimModel3D.tsx:109-110`)
- `frameW`: 0.03 → **0.06** (3cm → 6cm)
- `frameDepth`: 0.04 → **0.06** (4cm → 6cm)

### Door frame width (`BimModel3D.tsx:86-87`)
- `jambW`: 0.03 → **0.06** (3cm → 6cm)
- `frameDepth`: 0.05 → **0.06** (5cm → 6cm)

---

## Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Glass depthWrite | `true` (depth corrupted) | `false` (clean transparent rendering) |
| Glass side | `FrontSide` (invisible from inside) | `DoubleSide` (visible from all angles) |
| Glass opacity | 0.35 (nearly invisible) | 0.45 (clearly tinted) |
| Window frame width | 3cm (sub-pixel, invisible) | 6cm (reliably visible) |
| Door frame width | 3cm (thin) | 6cm (consistent with windows) |

---

## Verification Numbers

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (unchanged baseline) |
| Tests (`vitest run`) | **345 passed** (26 files) — +3 window-specific tests |
| Build (`npm run build`) | Success — 3D chunk `BimModel3D-*.js` (865 kB) code-split, GLTFExporter lazy-loaded |
