# Sprint 42C — Final Window Fix: Visible Glazing + Frames, Multi-Storey Key Collision

## Confirmation

Sprint 42B proved with bright magenta debug material that window meshes **do render** and are **positioned correctly**. The real problem was:

1. **Glass material**: The subtle transparent cyan was effectively invisible at normal camera distance, especially with the dark interior background.
2. **Multi-storey React key collision**: `openingId` is identical across storeys, so `win-${openingId}` keys collide — React only renders the last per key (placed 6, rendered 3 for 2 storeys).

Both are fixed in this sprint.

## Fixed — FIX 1: Glass + Frame Material

### Glass pane
`WINDOW_GLASS_MAT` at `src/components/bim/BimModel3D.tsx:28-33`:
- Color: `#7dd3fc` (light sky/AI-cyan, reads well on dark interior and exterior)
- `transparent: true`, `opacity: 0.5`, `depthWrite: false`
- `side: THREE.DoubleSide` — visible from inside and outside
- `roughness: 0.1`, `metalness: 0.0`
- `emissive: '#06b6d4'` with `emissiveIntensity: 0.15` — subtle glow prevents full invisibility

### Frame (4 bars)
`WINDOW_FRAME_MAT` at `src/components/bim/BimModel3D.tsx:35-38`:
- Color: `#cbd5e1` (brand Muted), `roughness: 0.7`, `metalness: 0.0`
- Head + sill: horizontal bars, thickness 0.06, spans `width + 0.12`
- Left + right jambs: vertical bars, thickness 0.06, spans `height + 0.12`
- The frame guarantees the window is always visible as a framed opening, even if the glass is subtle.

### Glass geometry
- Thin box (`wallThickness * 0.5` deep) fits inside the wall, not protruding.

## Fixed — FIX 2: Multi-Storey Key Collision

**Root cause**: `splitWall` in `planTo3d.ts:186` sets `openingId: op.id` (the plan's opening ID). For multi-storey plans, `splitWall` runs once per storey, producing openings with the same `openingId` for each storey. React keys like `door-id1` and `door-id1` collide — only the last per key renders.

**Fix applied** to `src/components/bim/BimModel3D.tsx`:
- Doors: key changed from `` `door-${o.openingId}` `` to `` `door-${o.openingId}-s${o.storeyIndex}` ``
- Windows: key changed from `` `win-${o.openingId}` `` to `` `win-${o.openingId}-s${o.storeyIndex}` ``

**Verification**: For a 2-storey plan with 2 windows + 1 door per storey: placed = 6, all 6 have unique composite identities, visually distinct from each other.

## Debug Removed

All Sprint 42B debug instrumentation fully removed — confirmed by grep:
- `WIN-42B` — no matches in src/
- `magenta` — no matches in src/
- `DEBUG_WINDOW_OVERLAY` — no matches in src/
- `windowRenderCount` / `windowPlacements` — no matches in src/

## Before/After

| Aspect | Before (42B debug) | After (42C final) |
|--------|-------------------|-------------------|
| Glass material | Opaque magenta `#ff00ff`, emissive 0.6 | Sky cyan `#7dd3fc`, transparent 0.5, subtle emissive glow 0.15 |
| Frame | Removed (no frame meshes) | 4-bar frame (head, sill, jambs), `#cbd5e1`, 0.06 thick |
| Pane depth | `wallThickness * 1.5` (protruding) | `wallThickness * 0.5` (inside wall) |
| Multi-storey keys | `win-${openingId}` — collision | `win-${openingId}-s${storeyIndex}` — unique |
| Door keys | `door-${openingId}` — collision | `door-${openingId}-s${storeyIndex}` — unique |
| On-screen overlay | `[WIN-42B] placed: X \| rendered: Y` | Removed |
| Console.log | `[WIN-42B]` per-window JSON | Removed |

## Validation

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (baseline unchanged) |
| Tests (`vitest run`) | **346 passed** (26 files) — +1 new test |
| Build (`npm run build`) | Success — 3D chunk code-split |
| 42B debug references in src/ | 0 matches |
