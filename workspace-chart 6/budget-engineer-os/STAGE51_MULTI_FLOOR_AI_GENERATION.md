# Stage 51 — Multi-Floor AI Generation

Continues from Stage 50 (Multi-Floor Support). Closes the gap where the AI design
engine ignored the brief's floor count: a "two storey" brief now actually produces
**two stacked storeys**, with the area divided across floors.

## What shipped

- **`src/ai/designEngine.ts`** — `generateDesignFromBrief` is now multi-storey:
  - clamps floor count to 1–6, divides the requested area across floors to set the
    per-floor footprint,
  - generates stacked storeys (shared X/Y origin, elevations `f × 3 m`),
  - entrance **door** on the ground floor, **windows** on upper floors,
  - distributes bedroom partitions across floors,
  - adds a **stair** block when there is more than one floor,
  - names the scheme e.g. *"house — 4 bed / 2 floors"*.
- **`src/ai/briefParser.ts`** — fixed a real bug: counts were digit-only, so
  *"two storey"* / *"three bedroom"* parsed as 1/2. Added a `WORD_NUM` map
  (one–ten, single/double/triple) and a `count()` helper matching **digits or words**,
  applied to floors, bedrooms and bathrooms.

## Verified round-trip (real parser + engines)

| Brief | floors | bedrooms | CAD floors | slabs | roofs |
|---|---|---|---|---|---|
| "…single storey" | 1 | 3 | 1 | 1 | 1 |
| "…two storey" | 2 | 4 | 2 | 2 | 1 |
| "three bedroom **double storey** … 140 sqm" | 2 | 3 | 2 | 2 | 1 |
| "office … 3 floors" | 3 | — | 3 | 3 | 1 |
| "2 storey apartment with **five** bedrooms" | 2 | 5 | 2 | 2 | 1 |

Roof always lands on the top floor only; total slab area matches the brief area
(e.g. 300 m² brief → 300 m² across 3 floors). Generated sample dossier
(`samples/ai-multifloor-dossier.html`): *house — 4 bed / 2 floors*, grand $88,643.87,
with a plan section per storey.

## Validation

- `./node_modules/.bin/tsc --noEmit` ✅ clean
- `./node_modules/.bin/vite build` ✅ success — `index` 146.92 kB (gzip 48.47), no 500 kB warning

## Honest scope note

The generator is still a deterministic parametric layout (rectangular envelope +
even partitions + one stair), not a true space-planning AI — but it now respects the
brief's storey count and divides area correctly. The `parseBriefAsync` seam remains for
dropping in a local LLM (WebLLM/transformers.js) later without changing callers.

## Next candidates

1. **Excavation & formwork** line items for a fuller foundation takeoff.
2. **Section / elevation view** showing the stacked storeys vertically.
3. **Stair opening cuts the upper slab** (inter-floor coordination).
