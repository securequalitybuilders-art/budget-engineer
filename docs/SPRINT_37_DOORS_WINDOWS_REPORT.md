# Sprint 37 — Real Doors & Windows in the 3D BIM Model

## Opening & WallSegment Types

### `WallSegment` — `src/domain/plan.ts:16`
```ts
{ id: string; start: Point; end: Point; thickness: number; type: 'external' | 'internal' }
```

### `Opening` — `src/domain/plan.ts:24` (extended this sprint)
```ts
{ id: string; wallId: string; kind: 'door' | 'window'; offset: number; width: number;
  height?: number; sillHeight?: number }
```

**`height` and `sillHeight` were added this sprint as optional fields** — existing
code that creates `Opening` without them continues to work. When absent, defaults
by `kind` are applied in `planTo3d.ts`.

### How offset is measured
`offset` is a **ratio (0–1) from wall start to opening centre**, confirmed by:
- `defaultOpenings()` in `plan-generator.ts:133` — uses values like `0.42`, `0.45`
- `renderOpening()` in `PlanCanvas.tsx:207` — uses `wall.start.x + (wall.end.x - wall.start.x) * offsetRatio`

This is the **PlanModel convention**. (The `GeneratedOpening` in
`designGeometryAdapter.ts` uses metres for offset, but that's a different data
path not used by the 3D BIM model.)

## CSG vs Split-Box — Chose Split-Box, No New Deps

**Approach: Split-box (wall piers).** Each wall with openings is divided into
continuous pier segments (left pier + right pier) separated by gaps at each
opening position. The gaps are exactly `opening.width` wide.

**Why not CSG:**
- CSG libraries (`three-bvh-csg`, `three-csg-ts`) add ~30–50 kB and can produce
  fragile geometry with non-manifold edges and shadow artifacts
- Split-box is deterministic, always produces clean `BoxGeometry` meshes, works
  with shadow maps perfectly, and requires zero new dependencies
- The plan layout has axis-aligned walls with rectangular openings, making the
  split approach trivial to compute and 100% reliable

**Result:** Each wall becomes 0, 1, or 2+ `WallPier` segments. The holes are
real — you can see through them to the other side.

## Door/Window Default Constants

All defined in `src/adapters/planTo3d.ts`:

| Constant | Value | Source |
|----------|-------|--------|
| `DOOR_DEFAULT_HEIGHT` | `2.1` | Matches `DOOR_HEIGHT` in `designGeometryAdapter.ts:73` |
| `DOOR_DEFAULT_SILL` | `0` | Door sits on floor |
| `WINDOW_DEFAULT_HEIGHT` | `1.5` | Matches `WIN_HEIGHT` in `designGeometryAdapter.ts:75` |
| `WINDOW_DEFAULT_SILL` | `0.9` | Matches `WIN_SILL` in `designGeometryAdapter.ts:77` |

## Does generatePlanModel Produce Openings?

**Yes.** `defaultOpenings()` in `plan-generator.ts:128` already generates 1 door
(on a rear external wall) + up to 3 windows (on remaining external walls) + up
to 5 internal doors. So every generated plan already has openings — no additional
generation code was needed.

## Implementation Details

### planTo3d.ts changes
- New `WallPier` type replaces `WallSolid` — represents a continuous segment
  that may be part of a larger wall split by openings
- New `Opening3d` type with resolved 3D position `{centerX, centerY, centerZ}`,
  `wallAngle`, `wallThickness`
- New `resolveOpeningPosition()` pure helper for test use
- New `splitWall()` pure function that, for each wall:
  1. Finds all openings on that wall (`plan.openings.filter(o => o.wallId === wall.id)`)
  2. Sorts by offset
  3. Computes left/right edges of each opening on the wall
  4. Produces pier segments before, between, and after openings
  5. Returns `Opening3d` with resolved centre position, defaults by kind
- `PlanTo3dResult.openings` added
- Empty openings → single solid pier per wall (backward compatible)

### BimModel3D.tsx changes
- `WallMesh` renamed to `WallPierMesh` — one box per continuous segment
- New `DoorMesh` component: door leaf (Warm Sand `#d4a574`) + frame jambs + header
- New `WindowMesh` component: semi-transparent glass pane (AI Cyan `#06b6d4`,
  opacity 0.35) + frame sill/jambs/header
- Components positioned using `opening.wallAngle` rotation and `centerX/Y/Z`
- Door/window repeated per storey

## Files Changed

### Modified
- `src/domain/plan.ts` — added optional `height` and `sillHeight` to `Opening`
- `src/adapters/planTo3d.ts` — split-wall logic, `Opening3d` type, `WallPier`,
  door/window constants, `resolveOpeningPosition` helper
- `src/components/bim/BimModel3D.tsx` — `WallPierMesh`, `DoorMesh`, `WindowMesh`
- `src/pages/Dashboard.tsx` — updated caption to mention doors & windows
- `src/__tests__/planTo3d.test.ts` — 8 new opening tests
- `CHANGELOG.md`

## Validation

| Check | Result |
|-------|--------|
| Typecheck | 0 errors |
| Lint | 0 errors (9 pre-existing warnings) |
| Tests | 297 passed, 24 files (289 + 8 new) |
| Build | 3391 modules, 20 precache entries |
| 3D still lazy chunk? | Yes — `assets/BimModel3D-uB3rycpw.js` (862.62 kB) separate |
| New dependencies | None (split-box, no CSG lib) |
