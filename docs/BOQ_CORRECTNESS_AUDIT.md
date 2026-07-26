# BOQ Correctness Audit — P10 Fix Stream 6

> **Date:** 2026-07-11  
> **Target:** v1.0.1 source tree  
> **Scope:** End-to-end BOQ generation pipeline — geometry → BIM → line items → pricing

---

## Pipeline Map

```
DesignOption
  ├─ extractGeometryQuantities()  →  GeometryQuantities
  │     (slabArea, roofArea, externalWallArea, doorCount, ...)
  ├─ applyCadQuantityOverrides()  →  overridden GeometryQuantities
  ├─ designOptionToBimModel()     →  BimModel (walls, slabs, roof, openings, zones)
  ├─ generateBoqFromBim()        →  base BOQ items (per BimElement)
  ├─ resolveBoqRate()            →  rate-card rates applied to base items
  └─ extra items added           →  doors, windows, partitions, ext walls,
                                     finishes, services

Result: allItems = [...baseItems, ...extraItems]
```

This structure creates **duplication risk** because the same physical quantities are being
computed in two parallel ways — once from the BIM model (per-element) and once from the
geometry quantities adapter (aggregate).

---

## Audit Checklist

### Wall double-counting

- [ ] Does `boq-generator.ts` create wall items from each `BimElement` of type `wall`?
  - Yes — line 13: `if (e.type === 'wall')` → pushes a wall item per BIM wall element.
- [ ] Does `designToBoq.ts` add extra external wall items?
  - Yes — lines 161–172: `'boq-extra-ext-walls'` pushed unconditionally when `externalWallArea > 0`.
- [ ] Does `designToBoq.ts` add extra partition items?
  - Yes — lines 147–158: `'boq-extra-partitions'` pushed unconditionally when `partitionArea > 0`.
- [ ] Does `generateBoqFromBim` also create internal partition items?
  - Yes — it creates items for **every** BIM wall element, regardless of whether it's external or internal.
- [ ] **Verdict:** ❌ Double/triple counting — walls appear as (1) per-element BIM items, (2) extra-external-wall item, and (3) extra-partition item.

### Opening (door/window) double-counting

- [ ] Does `boq-generator.ts` create opening items from each `BimElement` of type `opening`?
  - Yes — line 23: `if (e.type === 'opening')` → pushes an item at rate 250/each.
- [ ] Does `designToBoq.ts` add extra door items?
  - Yes — lines 119–131: `'boq-extra-doors'` pushed when `doorCount > 0`.
- [ ] Does `designToBoq.ts` add extra window items?
  - Yes — lines 133–144: `'boq-extra-windows'` pushed when `windowCount > 0`.
- [ ] How many BIM opening elements are created per design?
  - One per geometry opening (door or window) — see `designToBim.ts:62–85`.
- [ ] **Verdict:** ❌ Double counting — every door and window appears as both a `boq-generator` opening item and an extra door/window item.

### Roof type misclassification

- [ ] Does `designToBim.ts` always create a concrete slab roof?
  - Yes — line 112: `name: 'Roof slab'`, `material: 'concrete'`.
- [ ] Does `boq-generator.ts` apply a single rate to all roof items?
  - Yes — line 20: `rate: rates.roof_m2` (75/m²), no roof-type branching.
- [ ] Does the system distinguish CGI/truss roof from concrete roof slab?
  - No — the BIM model hard-codes `roof` as `BimRoof` with concrete material.
- [ ] Is `roofArea` computed separately in `geometryQuantitiesAdapter`?
  - Yes — line 124: `roofArea = footprintArea`, but this is only used in assumptions (line 80 of `designToBoq.ts`), not in actual BOQ generation.
- [ ] **Verdict:** ❌ Roof type is not modeled — all roofs are treated as concrete slab at 75/m². CGI/truss costs are not supported.

### Slab accuracy

- [ ] Does `boq-generator.ts` create slab items from each `BimElement` of type `slab`?
  - Yes — line 16: `if (e.type === 'slab')` → per-floor slab item(s).
- [ ] Does `designToBim.ts` create one slab per floor?
  - Yes — line 28–42: one `BimSlab` per floor, plus the roof (type `roof`, not `slab`).
- [ ] Are any extra slab items added by `designToBoq.ts`?
  - No — slab is only in the BIM-generated base items.
- [ ] Is the roof slab double-counted as both a slab and a roof?
  - No — BIM model assigns type `roof` to the roof element and `slab` to floor slabs; `boq-generator` routes them to different categories.
- [ ] **Verdict:** ⚠️ Slabs are not double-counted, but the slab area computation is a flat `footprintArea × floorCount` rather than being derived from actual slab geometry.

### Shell vs finished estimate labeling

- [ ] Does the BOQ indicate whether the estimate is shell-only or includes finishes?
  - Partially — assumptions panel shows "Finishes allowance" and "Services allowance" as fixed-rate fallback items.
- [ ] Are finishes derived from actual room data?
  - Yes — `finishFloorArea` is computed from `geo.rooms` in `geometryQuantitiesAdapter`.
- [ ] Are services derived from actual room data?
  - Yes — `serviceZoneArea` is computed from `geo.zones`.
- [ ] Is there a clear UI label distinguishing "shell estimate" from "finished estimate"?
  - No — both are mixed into a single grand total without separation.
- [ ] **Verdict:** ⚠️ Estimate depth is partially visible through assumptions but not clearly labeled at the summary level.

### Rate consistency

- [ ] Do base BIM items carry hard-coded rates?
  - Yes — `boq-generator.ts:4` defines `rates = { wall_m2: 85, slab_m2: 110, roof_m2: 75, opening_each: 250, object_each: 120 }`.
- [ ] Are these overridden by `resolveBoqRate` in the post-processing step?
  - Partially — only items with mapped `itemKey` are overridden (wall, slab, roof, door, window, opening, object). Items without a match keep the hard-coded rate.
- [ ] Are extra items priced using `resolveBoqRate`?
  - Yes — doors, windows, partitions, and external walls use `resolveBoqRate`.
- [ ] Do finishes and services have fixed rates (35, 45) regardless of region?
  - Yes — these are hard-coded fallback rates with a warning note.
- [ ] **Verdict:** ⚠️ Mixed — rate-card application is inconsistent across items. Finishes/services are flat estimates.

### Idempotency

- [ ] Does calling `buildBoqFromDesignOption` twice produce identical output?
  - Should — all inputs are deterministic (no random IDs, no date-dependent values).
- [ ] Are BOQ line item IDs stable across regenerations?
  - No — `uuid()` in `boq-generator.ts` generates new IDs each time.
- [ ] **Verdict:** ⚠️ Output values are deterministic, but IDs are not stable — making diffs between BOQ versions unreliable.

### CAD vs generated geometry consistency

- [ ] Can CAD overrides cause discrepancies between BIM model and quantity totals?
  - Yes — `applyCadQuantityOverrides` patches `GeometryQuantities` but does not change the BIM model. The BIM is built from `designOptionToBimModel(design)`, not from CAD. So CAD edits are reflected in the extra items but NOT in the BIM-generated base items.
- [ ] **Verdict:** ❌ CAD edits create a mismatch — base items use generated geometry while extra items use CAD-patched quantities.

---

## Summary of Defects

| # | Issue | Severity | Affected Files |
|---|---|---|---|
| 1 | Walls counted 3× (BIM items + extra externals + extra partitions) | CRITICAL | `boq-generator.ts:13`, `designToBoq.ts:147–172` |
| 2 | Doors/windows counted 2× (BIM opening items + extra door/window items) | CRITICAL | `boq-generator.ts:23`, `designToBoq.ts:119–144` |
| 3 | Roof always modeled as concrete slab — no CGI/truss support | HIGH | `designToBim.ts:108–122`, `boq-generator.ts:19–21` |
| 4 | CAD overrides affect quantities but not BIM — mismatch | HIGH | `designToBoq.ts:36–49`, `designToBim.ts:8–131` |
| 5 | Shell vs finished estimate not distinguished in total | MEDIUM | `designToBoq.ts:175–198` |
| 6 | Rate-card application is inconsistent (some items bypassed) | MEDIUM | `designToBoq.ts:96–115` |
| 7 | Finishes/services use fixed fallback rates (35, 45) | MEDIUM | `designToBoq.ts:85–86` |
| 8 | BOQ item IDs regenerated per call — no stable identity | LOW | `boq-generator.ts:134` |

---

## Required Fixes

### Fix 1 — Eliminate wall double-count

**Strategy:** Remove BIM-level wall items from `boq-generator.ts` and rely entirely on
`GeometryQuantities`-derived wall quantities in `designToBoq.ts`.

Alternatively, if BIM items are kept, remove the extra wall items from `designToBoq.ts`
and ensure the BIM model is the single source of truth.

**Files:** `boq-generator.ts:9–14`, `designToBoq.ts:147–172`

### Fix 2 — Eliminate door/window double-count

**Strategy:** Same as walls — choose one path only. Either:
- Keep `generateBoqFromBim` opening items and remove `'boq-extra-doors'`/`'boq-extra-windows'`; or
- Remove BIM opening items and base opening pricing entirely on `GeometryQuantities`.

**Files:** `boq-generator.ts:23`, `designToBoq.ts:119–144`

### Fix 3 — Model roof type

**Strategy:** Add `roofType` to `DesignOption` (or derive from building geometry).
Branch in `boq-generator.ts` or `designToBoq.ts`:
- `concrete-slab` → existing 75/m² slab rate
- `cgi-truss` → lower CGI sheet + timber truss rate
- `green-roof` / `tile` → other appropriate rates

**Files:** `domain/boq.ts` (DesignOption), `designToBim.ts`, `boq-generator.ts`

### Fix 4 — Sync CAD overrides with BIM

**Strategy:** Either:
- Rebuild BIM from CAD-patched geometry before passing to `generateBoqFromBim`; or
- Skip BIM generation entirely when CAD data is the authoritative source.

**Files:** `designToBoq.ts:60–63`, `cadToDesignSyncAdapter.ts`

### Fix 5 — Label estimate depth

**Strategy:** Add `estimateDepth: 'shell' | 'shell-with-allowances' | 'detailed'` to BOQ
metadata. Display in BOQ summary header.

**Files:** `lib/boq/boq-types.ts`, `designToBoq.ts`, `BOQPanel.tsx`

### Fix 6 — Consistent rate-card application

**Strategy:** Move all rate resolution into a single pass. Ensure every item is either:
- resolved from the rate card by `itemKey`; or
- explicitly labeled as a fallback estimate.

**Files:** `designToBoq.ts:96–115`, `rateCardAdapter.ts`

### Fix 7 — Idempotent item IDs

**Strategy:** Derive BOQ item IDs deterministically from the source element/quantity
(e.g., `boq-${category}-${quantityRef}`) instead of `uuid()`.

**Files:** `boq-generator.ts:134`, `designToBoq.ts:122–193`

---

## Test Coverage Gaps

- No test asserts that wall items are not duplicated
- No test asserts that door/window items are not duplicated
- No test asserts roof type handling
- No test for CAD-vs-generated consistency
- No test for estimate-depth labeling
- No idempotency test (calling `buildBoqFromDesignOption` twice on same input)

---

## Audit Procedure

To verify each defect:

1. Run `buildBoqFromDesignOption` with a known `DesignOption`
2. Count items by category:
   - `Walls` items from BIM + extra externals + extra partitions = `totalWallItems`
   - Expected: each wall should appear once
3. Count opening items:
   - BIM openings + extra doors + extra windows = `totalOpeningItems`
   - Expected: each opening should appear once
4. Check roof item material/rate matches design intent
5. Compare BOQ with and without CAD overrides — totals should not diverge
6. Check `estimateDepth` field exists and is populated
7. Run twice — verify same totals (allow ID variance if IDs are derived)
