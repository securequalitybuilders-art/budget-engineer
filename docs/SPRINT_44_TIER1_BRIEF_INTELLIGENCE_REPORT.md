# Sprint 44 — Tier 1: Design Brief Intelligence

## Overview
Tier 1 of the DzeNhare enterprise architectural intelligence upgrade. New modules for typology knowledge base, climate zones, heritage patterns, and a quality gate — layered on top of the existing generator with full fallback.

## 14 Building Typologies

| # | ID | Display Name | Default Storeys | Key Aliases |
|---|-----|-------------|----------------|-------------|
| 1 | `house-residential` | House / Residential | 1 | house, home, dwelling, bungalow, villa |
| 2 | `apartment-multi` | Apartment / Multi-Unit | 4 | apartment, flat, condo, block of flats |
| 3 | `clinic-health` | Clinic / Health Centre | 1 | clinic, hospital, health centre, dispensary |
| 4 | `school-classroom` | School / Classroom Block | 2 | school, classroom, college, university |
| 5 | `hotel-fullservice` | Hotel (Full Service) | 3 | hotel, lodge, guest house, resort |
| 6 | `office-commercial` | Office / Commercial | 2 | office, workspace, corporate, business park |
| 7 | `retail-shop` | Retail / Shop | 1 | shop, store, supermarket, grocery |
| 8 | `restaurant` | Restaurant / Eatery | 1 | restaurant, cafe, diner, food court |
| 9 | `church-worship` | Church / Place of Worship | 1 | church, mosque, temple, chapel |
| 10 | `warehouse-industrial` | Warehouse / Industrial | 1 | warehouse, factory, workshop, depot |
| 11 | `community-hall` | Community Hall | 1 | village hall, town hall, meeting hall |
| 12 | `market` | Market / Informal Trading | 1 | market, kiosk, stall, vending |
| 13 | `petrol-station` | Petrol Station / Filling Station | 1 | filling station, gas station, service station |
| 14 | `mixed-use` | Mixed-Use (Commercial + Residential) | 3 | mixed-use, live-work, shop flat |

**Detection**: `detectTypology(text)` matches aliases as word-boundary regex patterns. Confidence = `min(1, matchCount * 0.35 + 0.10)`. **UI override**: if `buildingType` dropdown is set (not 'other'), the matching typology is forced with 95%+ confidence.

**ZBC/SANS mapping**: Each typology maps to best-effort SANS 10400 class and ZBC building class. These are approximate citations for early-stage reference, not legal determinations.

## Climate Zones (Zimbabwe)

| Zone ID | Name | Cities | Strategy |
|---------|------|--------|----------|
| `HARARE_Highveld` | Harare Highveld | Harare, Chitungwiza, Marondera, Nyanga | North orientation, moderate shading (eaves 0.6–0.9 m), high thermal mass, cross-ventilation |
| `VICFALLS_Lowveld` | Victoria Falls Lowveld | Victoria Falls, Hwange, Kariba, Beitbridge | Deep shading (eaves 1.2–1.5 m), medium thermal mass, deep cross-ventilation, stack-effect |
| `MUTARE_EasternHighlands` | Mutare Eastern Highlands | Mutare, Chimanimani, Chipinge | NE orientation for morning sun, mist protection on SE facade, medium thermal mass |
| `BULAWAYO_Midlands` | Bulawayo Midlands | Bulawayo, Gweru, Masvingo | North-facing, moderate-to-deep shading, high thermal mass, night-purging |
| `GENERIC_Zimbabwe` | Generic Zimbabwe | (fallback) | Standard north orientation, 0.6 m eaves, brick-and-block construction |

**Detection**: `detectClimate(text)` scans for city keywords. Returns GENERIC as fallback.

## Heritage Patterns

| ID | Name | Cultural Context | Design Implications |
|----|------|-----------------|-------------------|
| `kraal` | Kraal / Courtyard Homestead | Traditional Zim homestead, circular huts around shared courtyard | Central courtyard, circular arrangement, entry gate |
| `rondavel` | Rondavel / Round Hut | Iconic circular thatched hut in daga/brick | Circular plan, conical roof, thick walls, deep eaves |
| `veranda` | Veranda / Varanda | Colonial-era adopted feature, now defining Zim architecture | Deep verandas on N/E facades, columns at 2.0–2.5 m, depth 1.8–3.0 m |
| `courtyard-hearth` | Courtyard as Hearth / Imbizo Space | Social heart of the home (dare/inkundla) | Central courtyard, rooms open onto it, natural light/ventilation source |
| `great-zimbabwe` | Great Zimbabwe Enclosure | 11th–15th c. monumental dry-stone architecture | Screen walls, conical tower forms, stone cladding, courtyard hierarchy |

## Quality Gate Checks

| Check | Score Impact | Threshold |
|-------|-------------|-----------|
| Typology confidence | −15 if <70%, −25 if none | ≥70% confidence |
| Site area | −30 if <50 m², −10 if <100 m², −5 if unknown | ≥100 m² recommended |
| Building/site ratio | −10 if >70% | ≤70% |
| Budget adequacy | −10 if <$300/m² | ≥$300/m² |
| Climate specificity | −5 if generic | Specific city/region |
| Heritage bonus | +10 if heritage pattern detected | — |
| Program detection | −10 if no rooms found | ≥1 room type |

**Pass/fail**: score ≥70 = passed.

## Fallback Architecture

Tier 1 is a **pure add-on** — it never replaces the existing generator:
1. `AiBriefPanel.handleGenerate()` runs the existing pipeline first (parseWithEngine → generateDesignOptionsFromBriefText → callbacks)
2. After success, a separate `try { await import('@/engine/parseBrief'); parseBrief(...) }` runs
3. If Tier 1 fails (any error), the catch silently absorbs it — existing flow is untouched
4. The readout component (`Tier1Readout`) only renders if `tier1Parsed` state is non-null

**No regression**: 2D plan, 3D BIM, BOQ, PDF report, PWA — all unchanged.

## UI Readout

`Tier1Readout.tsx` renders a collapsible section below the Generate button on `AiBriefPanel`:
- Collapsed: shows "Tier-1 Intelligence" header with score badge (green/amber/red)
- Expanded: shows typology + confidence %, climate zone, heritage pattern, quality issues (color-coded by severity), recommendations
- Styled to match brand (stone-900 background, cyan labels, amber/emerald/red severity colors)

## Files Changed

| File | Status |
|------|--------|
| `src/engine/tier1-types.ts` | New (88 lines) |
| `src/engine/typology-kb.ts` | New (219 lines) |
| `src/engine/climate-kb.ts` | New (69 lines) |
| `src/engine/heritage-kb.ts` | New (80 lines) |
| `src/engine/parseBrief.ts` | New (237 lines) |
| `src/components/ai/Tier1Readout.tsx` | New (106 lines) |
| `src/components/ai/AiBriefPanel.tsx` | Modified (+18 lines) |
| `src/__tests__/tier1BriefIntelligence.test.ts` | New (171 lines, 22 tests) |
| `CHANGELOG.md` | Modified |
| `docs/SPRINT_44_TIER1_BRIEF_INTELLIGENCE_REPORT.md` | New |

## Validation

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (baseline unchanged) |
| Tests (`vitest run`) | **368 passed** (27 files) — was 346 before |
| Build (`npm run build`) | Success — 3D code-split; Tier 1 engine (20 kB) lazy-loaded |
