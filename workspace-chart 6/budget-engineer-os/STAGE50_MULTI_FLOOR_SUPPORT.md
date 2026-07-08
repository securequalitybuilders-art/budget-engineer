# Stage 50 — Multi-Floor Support

Continues from Stage 48/49. Turns the OS from single-storey to genuinely
**multi-floor**: storeys in the model, an active-floor selector, per-floor 2D plans
(on screen and in the dossier), and quantities that span every floor.

## What shipped

- **`src/lib/cadSeed.ts`** — the seed is now **two-storey** (Ground + First Floor),
  each with its own envelope + partition; a stair block on the ground floor, a window
  and bed on the first floor. (The BIM/BOQ engines were already floor-aware from Stage 42,
  so the roof auto-moves to the top floor.)
- **`src/store/appStore.ts`** — `activeFloorId` state + `setActiveFloor`; set on
  `initialize` and reset on `generateFromBrief`.
- **`src/components/cad/CadPlanView.tsx`** — takes `activeFloorId` and renders that floor.
- **`src/routes/BimRoute.tsx`** — a floor tab strip above the plan (shown when >1 floor).
- **`src/lib/boqExport.ts`** — the dossier now renders **one plan section per storey**.

## Verified round-trip (real engine, two-storey seed)

| Check | Result |
|---|---|
| Floors | Ground Floor, First Floor |
| Slabs (per floor) | 2 ✓ |
| Roof (top only) | 1, on `floor-2` ✓ |
| Walls per floor | 5 + 5 |
| Slab area in BOQ | 192 m² (= 2 × 96) ✓ |
| Grand total (2-storey) | $103,580.76 (≈ 2× single-storey) |
| Ground plan | has door marker (green) ✓ |
| First-floor plan | has window marker (cyan) ✓ |
| Dossier plan sections | 2 ✓ |

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 145.95 kB (gzip 48.04), no 500 kB warning

## Honest scope note

Floors share an X/Y origin and are drawn as separate plans; there's no vertical
section/elevation view yet, and inter-floor coordination (stair openings cutting slabs,
load transfer between storeys) is not modelled — the load engine still sums vertically by
area. The AI `designEngine` currently generates a single floor; multi-floor generation
from a brief is a future step.

## Next candidates

1. **Multi-floor AI generation** — `designEngine` emits storeys from the brief's floor count.
2. **Excavation & formwork** line items for a fuller foundation takeoff.
3. **Section / elevation view** alongside the per-floor plans.
