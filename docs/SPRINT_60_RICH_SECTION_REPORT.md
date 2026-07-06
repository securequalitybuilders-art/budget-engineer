# Sprint 60 — Rich Section A‑A

**Goal**: Transform Section A‑A from a bare elevation into a rich architectural building section with solid black cut poché, floor build‑ups, stairs, room labels behind the cut, roof structure, foundation footings in layered soil, and correctly scaled entourage.

## Deliverables

### SectionView.tsx (rewritten)
- **Solid black cut poché** — every element the cut plane passes through (walls, slabs, roof gable) renders as `#1a1a1a` (INK) with ~100% opacity, replacing the previous thin pale hatch.
- **Floor build‑ups** — each slab has a screed line (thin white near slab top), slab band (solid black), and ceiling line below; uses consistent `SLAB_THICKNESS` (0.15 m).
- **Stairs** — sawtooth polyline between storeys with 14 steps, landing at top, dashed handrail line offset inward. Positioned at 60 % of building width.
- **Room labels behind cut** — rooms intersected by the cut plane (`y = plan.height / 2`) render as faint grey rects with room name and area text, per storey. Storey headings ("GROUND FLOOR", etc.) shown behind the section.
- **Foundation footings** — solid black poché beneath each cut wall extending 0.4 m into ground, base width = 3× wall thickness.
- **Roof structure** — rafter lines from eave to ridge at 4 positions, collar tie at mid‑height, all thin/light.
- **Soil layers** — ground datum line + 3-layer soil profile (topsoil, subsoil, rock).
- **Scaled entourage** — 2 trees (round + conifer), 1 person silhouette at correct architectural scale (1.7 m person, 4 m trees).
- **Annotations** — dimension lines (horizontal + vertical), grid bubbles from cut‑plane wall grid lines, level markers at each slab + ridge, drawing title, numbered legend, material legend (concrete, brick, soil), title block, sheet border.

### Tests (cadDrawings.test.ts — 9 new tests, 51 total)
- `renders slab bands >= floors+1` — counts `slab-` keys (≥ 4 for 3 floors)
- `renders stairs when floors >= 2` — counts `stairs-` keys (≥ 1)
- `renders room labels behind cut` — counts `room-label-` keys (≥ 1)
- `renders footing poché` — counts `footing-` keys (≥ 1)
- `renders soil layers` — counts `soil-layers` key (1)
- `renders entourage trees and person` — counts `tree-` and `person` keys
- `returns null for null drawing` — safe fallback
- `returns null for null plan` — safe fallback
- `returns null for zero floors` — safe fallback

## Files Changed
| File | Change |
|------|--------|
| `src/components/drawings/SectionView.tsx` | Full rewrite: solid black poché, floor build‑ups, stairs, room labels, footings, roof trusses, scaled entourage |
| `src/__tests__/cadDrawings.test.ts` | +9 tests for SectionView features; import `renderSectionSheet`, `ReactNode` |

## Breaking Changes
None. All 636 existing tests remain green. Zero type errors.
