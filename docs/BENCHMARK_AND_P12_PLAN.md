# Benchmark & P12 Plan — Architectural Drawing Intelligence

Generated as the recommended next phase after STANDING_INSTRUCTIONS.md.

## Overview

1. Paste standing instructions into system prompt
2. Run 10 benchmark prompts (baseline)
3. Score with rubric
4. Implement P12 — Architectural Drawing Intelligence
5. Re-run benchmarks and compare deltas

---

## Benchmark Pack

### Prompt 1 — 2-Bed Starter House
```
Generate a working-drawing level floor plan for a 2-bedroom detached starter house on a 12 m × 25 m plot.
- 2 bedrooms, 1 shared bathroom, open-plan living + dining, compact kitchen, front porch, rear service yard, 1-car parking
- target GFA: 75–85 m²
- external walls 230 mm, internal partitions 115 mm
- all dimensions in metric, room names + areas, door swings + window positions
- explain wet-core logic, structural wall logic, assumptions
```

### Prompt 2 — 3-Bed Suburban House
```
Generate a professional working-drawing floor plan for a 3-bedroom single-storey suburban house in Zimbabwe.
- master en-suite, 2 secondary bedrooms, shared bathroom, open-plan lounge + dining, closed kitchen + pantry, laundry/utility, covered verandah, 2-car parking
- target GFA: 115–135 m²
- quiet/private bedroom zone, public zone facing front garden, service zone grouped near kitchen
- all dimensions, wall thicknesses, openings, room areas, circulation; structural wall strategy; assumptions + risks
```

### Prompt 3 — 4-Bed Double-Storey Villa
```
Generate a double-storey 4-bedroom villa plan at working-drawing level.
Ground floor: entrance foyer, lounge, dining, kitchen, guest bedroom, guest WC/shower, staircase, utility, 2-car garage
Upper floor: master suite (walk-in closet + en-suite), 2 secondary bedrooms, shared bathroom, family lounge
- target GFA: 180–220 m²
- stacked wet areas; upper load-bearing walls align with walls/beams below
- calculate stair; show room areas + key dimensions
- explain vertical load path, stair geometry, wet-core strategy
```

### Prompt 4 — Duplex / Semi-Detached Pair
```
Generate a semi-detached duplex plan (two mirrored 3-bedroom units sharing a party wall).
Per unit: 3 bedrooms, 2 bathrooms, lounge, kitchen/dining, utility, front porch, rear yard
- central party wall, maximize build efficiency
- target combined GFA: 180–220 m²
- shared wall structurally and acoustically logical
- include door/window logic, room schedule, assumptions
```

### Prompt 5 — 5-Storey Apartment Block
```
Generate a conceptual-to-working hybrid plan for a 5-storey apartment building.
- 2 apartments per floor (2 bed, 2 bath, open-plan living/kitchen, balcony)
- central stair + lift core
- ground floor: entrance lobby, caretaker/store, parking
- rooftop service zone
- target total GFA: 900–1100 m²
- vertical circulation, stacked wet cores, repeated structural grid
- natural lighting + cross-ventilation notes; elevation/section strategy; assumptions + risks
```

### Prompt 6 — Small Clinic
```
Generate a working-drawing floor plan for a small single-storey clinic.
- reception, waiting, 3 consultation rooms, treatment room, pharmacy/dispensary, records/store, staff room, accessible WC, patient WC, service yard
- target GFA: 130–170 m²
- clear public vs clinical circulation; dirty/clean logic; wet rooms clustered; privacy for consultation rooms
- explain circulation and service strategy
```

### Prompt 7 — 8-Classroom School Block
```
Generate a single-storey school classroom block plan.
- 8 classrooms, head teacher office, staff room, store, boys WC, girls WC, accessible WC, covered circulation/verandah, assembly forecourt
- target GFA: 450–650 m²
- classrooms well-lit and naturally ventilated; toilet block separated but accessible
- circulation must handle high occupancy
- explain structural rhythm, corridor logic, sanitation zoning
```

### Prompt 8 — Mixed-Use Corner Building
```
Generate a mixed-use corner building for an urban site.
Ground floor: 2 retail units, lobby, stair core, service room, public WC
Upper floors: 4 small apartments (1 bed, 1 bath, living/kitchen each)
- active frontage on two street edges; clear retail vs residential circulation separation
- target GFA: 350–500 m²
- explain structural grid, frontage logic, service stacking, fire escape strategy
```

### Prompt 9 — Warehouse + Office
```
Generate a plan for a small warehouse with attached office/admin block.
- warehouse floor, loading area, store cage, manager office, open office, kitchenette, staff WC, accessible WC, plant/store room
- target GFA: 300–450 m²
- clear goods movement; office/warehouse separation; structural spans appropriate for industrial
- explain loading logic, structural span logic, fire exit strategy
```

### Prompt 10 — Worship / Community Hall Complex
```
Generate a community worship hall complex plan.
- main prayer/worship hall, male ablution/WC, female ablution/WC, imam/pastor office, small classroom/meeting room, shoe/store area, site forecourt, parking
- target GFA: 180–260 m² building plus site planning
- public gathering flow clear; sanitation zones separated and logical
- site plan showing access, parking, entry sequence
- explain crowd flow, structural roof strategy, wet-core logic
```

---

## Scoring Rubric

| Category | 0–4 | 5–6 | 7–8 | 9–10 |
|---|---|---|---|---|
| Programme completeness | Major omissions | Most spaces included | All requested included | All + sensible support spaces |
| Room size correctness | Undersized or wrong | Marginal or inconsistent | Legal and practical | Optimal for typology |
| Zoning | None | Workable but clumsy | Good separation | Excellent zone logic |
| Circulation / egress | Dead-end or unsafe | Usable but awkward | Clear and logical | Efficient, safe, professional |
| Structural plausibility | Naive / impossible | Some unsupported spans | Mostly plausible | Sound, well-integrated |
| Stair correctness | Symbolic / impossible | Looks plausible but unverified | Properly resolved | Fully verified + fits |
| Wet-core / services | Scattered / implausible | Acceptable but inefficient | Good clustering | Excellent service strategy |
| Openings / daylight | No believable logic | Generic but acceptable | Planned and functional | Well-integrated with orientation |
| Drawing completeness | Schematic only | Basic, missing technical data | Good detail level | Professional working-drawing |
| Assumption honesty | Confident guessing | Some surfaced, some hidden | Mostly explicit | Professional risk handling |

### Automatic fail if < 7 in: Structure, Stair, Circulation, Room Sizes, Wet-Core (where applicable)

### Overall
- 90–100: Excellent
- 75–89: Strong
- 60–74: Usable with review
- < 60: Weak / unreliable

### Per-benchmark review template
```
## Benchmark: [Name]
Scores: Programme _/10, Room Sizes _/10, Zoning _/10, Circulation _/10, Structure _/10, Stair _/10|N/A, Wet-Core _/10|N/A, Openings _/10, Drawing Completeness _/10, Assumption Honesty _/10
Total: _/100
Fail if <7: [list]
Major failures: 1. 2. 3.
Best things: 1. 2. 3.
Fixes needed: 1. 2. 3.
Verdict: Excellent / Strong / Usable / Weak
```

### Before/after comparison table
```
| Benchmark | Before | After | Delta | Before Fail? | After Fail? | Biggest Improvement | Biggest Remaining Problem |
|---|---|---|---|---|---|---|---|
| ... | | | | | | | |
```

---

## P12 — Architectural Drawing Intelligence (IDE Prompt)

### Goal
Upgrade the plan generator so prompt-driven 2D outputs behave like a professional architectural drafter with construction and engineering awareness. This is NOT about prettier boards first — it is about making plan generation architecturally correct before presentation polish.

### Intelligence layers required

#### 1. Programme engine
- derive structured room programme from prompt intent
- infer missing minimum rooms per typology
- infer room count + area bands by typology
- distinguish public/private/service zones
- support residential, commercial, institutional, mixed-use, industrial

#### 2. Zoning engine
- zone plans explicitly: public, private, service, circulation
- typology-specific zoning rules
- front/back/street/garden/service orientation logic
- avoid bedroom-through-bedroom or clinic-through-consult-room access

#### 3. Structural grid logic
- establish plausible structural rhythm before final wall layout
- structural bay spacing by typology/system
- upper-floor wall stacking checks
- roof support logic
- flag spans exceeding assumed system limits

#### 4. Stair engine (must stop being symbolic)
- compute riser count
- compute tread count / run
- fit stair into plan
- support straight, dog-leg, half-landing
- expose stair assumptions
- reject impossible geometry

#### 5. Wet-core logic
- cluster or stack bathrooms, kitchens, utilities, service shafts, ablutions
- reduce implausible long plumbing runs
- support vertical wet stacking for multi-storey
- support shared plumbing walls

#### 6. Door/window logic
- all habitable rooms must have daylight/opening logic
- door swings must be clash-checked
- opening widths match room/function type
- external openings respond to façade/orientation logic where practical

#### 7. Typology intelligence (no more house-like for every programme)
- clinics: consultation/waiting/privacy logic
- schools: corridor/classroom/repetition logic
- apartments: core/stacking/repetition logic
- mixed-use: separate public/commercial from private/residential circulation
- warehouses: loading/goods/admin zoning
- worship/community: crowd flow + sanitation separation

#### 8. Drawing completeness defaults (working-drawing level)
- wall thicknesses, room names, room areas
- overall + internal dimensions, opening indications
- stair direction, north arrow if site-relevant
- assumptions list, structural/wet-core notes

#### 9. Section/elevation derivation readiness
- plan output internally consistent for deriving elevations, sections, schedules, BOQ

#### 10. Assumption honesty
- Confirmed / [ASSUMED] / [UNVERIFIED — CONFIRM BEFORE CONSTRUCTION]

### Acceptance criteria
- output quality improves measurably on benchmark prompts
- stairs no longer symbolic/impossible
- wet-core logic visibly stronger
- structural stacking checked
- circulation failures reduced
- typology-specific planning more distinct
- working-drawing outputs more complete by default
- typecheck, lint, tests, build all pass

### Files likely relevant
- prompt parser / brief parser
- tier 1 / tier 2 / tier 3 engines
- layout engine
- plan generator
- room program library
- building type / typology rules
- section/elevation derivation
- drawing panel defaults
- stair/opening/wet-core helpers

---

## Recommended Workflow

1. Paste STANDING_INSTRUCTIONS.md into system prompt
2. Run all 10 benchmark prompts (baseline)
3. Score with rubric; identify top 5 recurring failures
4. Run the P12 IDE prompt in Antigravity
5. Implement generator improvements
6. Re-run same 10 benchmarks (no prompt editing)
7. Compare before/after scores
8. If core failures persist, iterate; if resolved, proceed to P13 (Premium Drawing Standards)
