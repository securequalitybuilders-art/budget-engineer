# Sprint 23 — Better CAD Room Layout Algorithm

> **Date:** 2026-07-02
> **Goal:** Replace overly simple grid/template room placement with a more believable deterministic layout algorithm. Improve geometry quality only — no new features, no paid APIs.

## Changes

### Files Modified
| File | Change |
|------|--------|
| `src/adapters/designGeometryAdapter.ts` | Replaced `getRoomTemplates()` with strategy-based layout functions; improved opening placement; added `clamp()` util; 653 lines (was 435) |
| `src/__tests__/designGeometryAdapter.test.ts` | Added 18 new tests (now 27 total) covering all building types, circulation, validation |

## Layout Strategies Added

### `residentialSingleStoreyRooms(W, D, bedrooms, bathrooms)`
- **Left zone** (42% width): Lounge → Dining → Kitchen → Store (top to bottom)
- **Centre passage** (10% width): Full-depth corridor connecting all rooms
- **Right zone** (48% width): Master bedroom at front, then alternating bedrooms/bathrooms
- Bedrooms and bathrooms interleaved for wet-core proximity
- Kitchen/Dining share adjacency for wet-core grouping

### `residentialTwoStoreyGround(W, D)`
- Left zone: Lounge → Dining → Kitchen → Store
- Right zone: Guest WC, Study, Bedroom 1, Staircase, Utility
- Staircase at back-right corner for upper-floor access

### `residentialTwoStoreyUpper(W, D, bedrooms, bathrooms)`
- Left zone: Retreat (upper landing), extra bedrooms, bathroom
- Right zone: Main bedrooms interleaved with bathrooms, Staircase at same position
- Layout deliberately differs from ground floor

### `clinicRooms(W, D)`
- Front: Reception (left) + Waiting Area (right), both near entrance
- Centre: 4 consultation rooms stacked on left side, corridor adjacent
- Back: Pharmacy, Toilets, Storage
- Reception/Waiting near y=0 entrance

### `commercialRooms(W, D)`
- Front: Open Sales Area (full width)
- Back: Storage, Office (left), Staff WC (right)
- Shopfront windows placed on front wall

## Opening Placement

| Rule | Implementation |
|------|---------------|
| Main entrance | Front wall door at 45% width, opens into Lounge/Reception/Sales |
| Internal doors | On passage/corridor walls connecting rooms to circulation |
| Windows | External walls of bedrooms, lounge, consultation, commercial |
| Kitchen window | Back wall of kitchen (external) |
| Shopfront windows | Two display windows on front wall, flanking entrance |
| Clamping | All offsets clamped ≥0.3m from wall corners |
| No overlaps | `hasDoorOnWall`/`hasWindowOnWall` sets prevent duplicates |

## Behavioral Properties

| Building Type | Rooms | Floors | Circulation | Staircase |
|--------------|-------|--------|------------|-----------|
| Single-storey house | Lounge, Kitchen, Dining, Store, Passage, N bedrooms, M bathrooms | 1 | Central passage | None |
| Duplex ground | Lounge, Dining, Kitchen, Guest WC, Study, Bedroom, Staircase, Store | 2 | Passage | Back-right |
| Duplex upper | Retreat, N bedrooms, M bathrooms, Staircase | 2 | Passage | Same position |
| Clinic | Reception, Waiting, 4× Consultation, Pharmacy, Toilets, Storage | 1 | Corridor | None |
| Shop | Sales Area, Storage, Office, Staff WC | 1 | Open front | None |

## Test Changes

| Test | Count | Coverage |
|------|-------|----------|
| Existing tests (unchanged) | 9 | General shape, null safety, openings, NaN |
| Single-storey house | 6 | Lounge/kitchen/bed/bath, passage, entrance door, passage doors, footprint bounds |
| Duplex | 5 | 2 floors, ground lounge/kitchen, upper bedrooms, staircase, differing layouts |
| Clinic | 4 | Reception/waiting/consultation/pharmacy/toilets, front zone, 4x consultation |
| Shop/commercial | 2 | Sales/storage/office, staff WC |
| Validation | 3 | No NaN, no negative dims, small area, large house |
| **Total** | **27** | |

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (145 tests, 13 files, 18 new) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (20 precache entries) |

## Limitations

- Layouts remain deterministic and rectangular — no real architectural solver
- Passage/corridor placement is hardcoded at 8-10% of building width
- Multi-floor staircase is a room rectangle, not a real stairwell with landing
- Room dimensions are fractions of building footprint — not minimum-function-size aware
- No furniture/block placement inside rooms
- Same room template for all floors of clinic and commercial (they are single-storey by design)
- No L-shaped or T-shaped building footprints — always rectangular
- No external features (porch, veranda, balcony, carport)
