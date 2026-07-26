# Sprint 76 — Parametric Biomimetic Canopy (1/3)

> **Date:** 2026-07-07  
> **Phase:** Curved surface + Voronoi cell network + live sliders (geometry foundation complete)

---

## What was built

An **opt-in "Canopy" roof type** for the 3D BIM viewer: a parametric, dragonfly-wing-inspired canopy — a smooth curved surface overlaid with a Voronoi cell network — controlled by live sliders and rendered in 3D.

The existing gable roof is **unchanged**. Users toggle between `Gable` and `Canopy` via a button in the 3D panel.

---

## Geometry approach

### Surface
A shallow sine-dome: `y = heightAboveBuilding + rise * sin(pi*u) * sin(pi*v)` over the unit square `u,v ∈ [0,1]`. This gives a smooth, continuous curvature with:
- Zero rise at the corners (y ≈ heightAboveBuilding)
- Maximum rise at the centre (y ≈ heightAboveBuilding + rise)

### Seed points
Deterministic jittered grid: `ceil(sqrt(cellDensity)) × ceil(sqrt(cellDensity))` grid of seed points in `[0,1]²`, each jittered by ±40% of the cell width using a seeded PRNG (mulberry32). Same `seed` parameter → identical points.

### Voronoi cell network
1. **Bowyer–Watson Delaunay triangulation** on the seed points — pure TypeScript implementation (≈80 lines).
2. **Dual Voronoi cells** from Delaunay circumcenters — each seed's cell = polygon of adjacent triangle circumcenters.
3. **Sutherland–Hodgman clipping** to the unit square `[0,1]²` so every cell stays within the canopy domain.
4. **Project to 3D surface** — each 2D cell vertex lifted via `surfacePoint()`.

### Algorithm attribution
The Voronoi implementation is a pure TypeScript re-implementation of the standard Bowyer–Watson algorithm (originally described by Bowyer 1981 and Watson 1981). No external code was copied. No new dependencies were added.

---

## Sliders (live)

When `Canopy` is selected, live sliders appear below the controls bar:

| Slider | Range | Step | Default |
|--------|-------|------|---------|
| Span X | 3–30 | 0.5 | building width + 1m |
| Span Z | 3–30 | 0.5 | building depth + 1m |
| Rise | 0–5 | 0.1 | 1.5m |
| Density | 3–100 | 1 | 30 |

A **Reseed** button randomizes the seed, producing a new cell pattern.

All sliders have `id` + `htmlFor` linked `<label>` elements and `aria-label` attributes for accessibility.

---

## 3D rendering

`CanopyMesh.tsx` renders:
- **Translucent surface** (BIM violet `#8B5CF6`, 25% opacity, double-sided) — each cell triangulated as a fan from its 3D centroid, with computed vertex normals
- **Cyan edge network** (`#06B6D4`, 80% opacity) — Voronoi cell edges as line segments on the curved surface, giving the distinct dragonfly-wing aesthetic

Both use `useMemo` so geometry is rebuilt only when `CanopyParams` change.

---

## Files

| File | Purpose |
|------|---------|
| `src/engine/canopy/canopyGeometry.ts` | Pure, deterministic Voronoi geometry engine (testable, no Three.js) |
| `src/components/bim/CanopyMesh.tsx` | React Three Fiber 3D render component |
| `src/components/bim/BimModel3D.tsx` | Accepts `roofType` + `canopyParams` props, conditional rendering |
| `src/components/bim/LazyBimModel3D.tsx` | Roof type toggle (`Gable`/`Canopy`) + live sliders |
| `src/__tests__/canopyGeometry.test.ts` | 22 tests |

---

## Tests

22 new tests in `canopyGeometry.test.ts`:
- `surfacePoint`: corners at base height, centre at max height, coordinate mapping, determinism
- `generateSeedPoints`: count ≈ cellDensity, all within `(0,1)²`, same seed → identical, different seed → different, minimum density
- `triangulateDelaunay`: >0 triangles for ≥3 points, empty for <3, many points, determinism
- `computeVoronoiCells`: >0 cells for ≥3 seeds, safe empty for 0/1 seed
- `projectCellsToSurface`: vertices within bounds, centre higher than edges, edges + centroids
- `computeCanopy`: valid result, safe empty for bad params, determinism, different seed → different

---

## Quality gates

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 9 warnings (unchanged baseline) |
| `npm test` | 829 passed (47 files, +22 new) |
| `npm run build` | Success, PWA 30 entries |
| `text-stone-500` in `src/*.tsx` | None |

---

## Next sprints (2/3, 3/3)

- Sprint 77: Paneling / ribs / structural articulation of the canopy surface
- Sprint 78: Section cut through canopy + documentation / export
