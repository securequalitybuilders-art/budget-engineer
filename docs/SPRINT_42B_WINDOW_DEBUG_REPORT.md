# Sprint 42B — Debug: Expose Windows with Bright Debug Material + Render-Count Readout

## Investigation Findings

### 1. Window render-loop code (quoted from BimModel3D.tsx:265-274)

```tsx
{/* Doors */}
{result.openings.filter((o) => o.kind === 'door').map((o) => (
  <DoorMesh key={`door-${o.openingId}`} op={o} />
))}

{/* Windows */}
{result.openings.filter((o) => o.kind === 'window').map((o) => (
  <WindowMesh key={`win-${o.openingId}`} op={o} />
))}
```

**Analysis:**
- **No conditionals**: straight `.filter().map()` — no early return, no only-first, no wall-type guard.
- **No wrong group**: Both door and window arrays are children of the same `<group ref={buildingRef}>` (line 256). Not a separate or mispositioned group.
- **React key collision for multi-storey**: The key `win-${o.openingId}` uses `openingId` from `planTo3d.ts:186` which is set to `op.id` (the plan's opening ID). For multi-storey plans, each storey calls `splitWall` with the same plan, producing openings with identical `openingId` for each storey. React will see duplicate keys and only render the **last** matching element for each key. For single-storey plans (which most generated plans are), the keys are unique — no collision.
  - **Impact**: For a 2-storey building with 3 windows per storey, React only renders 3 windows (storey 1), not 6. Storey 0 windows are dropped.
  - **Single-storey**: No collision, all windows should render.

### 2. Placed vs rendered counts

For a single-storey generated 120 sqm plan:
- `defaultOpenings()` creates 3 window openings (on the first 3 external walls)
- `planTo3d` returns 3 window placements
- The render loop creates 3 `<WindowMesh>` elements
- **placed === rendered for single storey**: 3 = 3

For a 2-storey plan (same openings):
- `planTo3d` returns 6 window placements (3 per storey)
- React key collision: `win-id1`, `win-id1` — only last per key renders
- **placed=6, rendered=3** — 3 windows lost on storey 0

### 3. Sample window Y values vs storeyHeight

For a generated 120 sqm plan (single storey, storeyHeight=3):

| Window | Wall | offset | centerX | centerZ | centerY | sill | height | glass Y (centerY+sill+h/2) | wall range |
|--------|------|--------|---------|---------|---------|------|--------|---------------------------|------------|
| win 1 | ext[0] (bottom) | 0.20 | ~2.5 | 0 | 0 | 0.9 | 1.5 | 1.65 | 0..3 |
| win 2 | ext[1] (right) | 0.38 | 12 | ~3.0 | 0 | 0.9 | 1.5 | 1.65 | 0..3 |
| win 3 | ext[2] (top) | 0.56 | ~9.5 | 8 | 0 | 0.9 | 1.5 | 1.65 | 0..3 |

All window Y positions (1.65) are well within the wall height (0..3). No off-range positioning.

### 4. Hypothesis for why windows were invisible (even after Sprint 42)

**The glass was rendering but was nearly invisible because:**

**(a) DepthWrite interaction with ceilings:** The ceiling slabs are at `yOffset = (storey+1)*storeyHeight - thickness` (e.g., 2.95 for storey 0). The window glass center is at Y=1.65, well below the ceiling. No Z-fighting with ceilings.

**(b) The glass box depth (`wallThickness * 0.85` = ~0.17m for 0.2m wall) places glass faces INSIDE the wall pier thickness.** The wall extends from -0.1 to +0.1 in local Z. The glass extends from -0.085 to +0.085. When viewed from an angle, the glass face is recessed 1.5cm behind the wall face. While the depth test should pass (glass face is behind wall face from outside), in practice this can cause the glass to appear very dim because:
  - The glass is at the bottom of the wall's depth buffer edge
  - With `depthWrite: true` (Sprint 42 had `depthWrite: false`, which was correct), the glass writes to the depth buffer and subsequent transparent passes may interact badly

**(c) The most likely culprit: SPRINT 42 already fixed depthWrite to `false`, BUT the user confirmed the problem was BEFORE Sprint 42. If the user is testing against the Sprint 42 fix and still sees invisible windows, then the frame width (6cm = still thin at 30m camera distance) and the 45% opacity cyan tint against a dark interior are simply too subtle.**

### 5. Debug changes applied (TEMPORARY)

| Change | Temp value | Rationale |
|--------|-----------|-----------|
| Glass material | Opaque magenta `#ff00ff`, emissive, emissiveIntensity 0.6 | Cannot be missed, unlike subtle cyan transparent |
| Pane depth | `wallThickness * 1.5` (protrudes both sides) | Cannot be hidden inside wall thickness |
| Frame | Removed (all frame meshes) | Single solid box is maximally visible |
| `WINDOW_FRAME_MAT` | Removed (unused) | Clean build |
| On-screen overlay | `[WIN-42B] placed: X \| rendered: Y` | Shows count parity at a glance |
| Console.log | JSON per window position, angle, sill, etc. | Full diagnostic data in dev tools |

## Revert Plan

After the user confirms whether bright magenta windows appear:
1. Revert glass material to Sprint 42's fix (cyan, `doubleSide`, `depthWrite: false`, opacity 0.45)
2. Restore frame meshes with 6cm width
3. Restore `WINDOW_FRAME_MAT`
4. Remove on-screen overlay and console.log
5. Fix React key collision for multi-storey: use `${openingId}-${storeyIndex}`

## Verification Numbers

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings |
| Tests (`vitest run`) | **345 passed** (26 files) |
| Build (`npm run build`) | Success — 3D chunk code-split |
