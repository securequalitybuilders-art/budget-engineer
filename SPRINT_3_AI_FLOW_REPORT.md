# Sprint 3 — Local AI Brief-to-Design Flow — Smoke Report

**Date:** 2026-06-30  
**Goal:** Wire the local/offline AI brief parser and design engine into the visible project workflow so the user can enter a natural-language building brief and generate design options without paid APIs.

---

## Canonical AI Modules Selected

| Module | File | Role |
|--------|------|------|
| **Brief Parser** (canonical) | `src/ai/briefParser.ts` | Deterministic regex parser, zod-validated output, location/feature extraction |
| **Design Engine** (canonical) | `src/ai/designEngine.ts` | Generates 3 design options (compact/standard/spacious) with full BuildingElement quantities |
| **Schema** (canonical) | `src/ai/schema.ts` | Zod schemas for ParsedBrief and DesignSchema |

**Why canonical `src/ai/*` over WS6 `src/lib/ai/*`:**
- Already used by `projectStore.generateDesigns()` — proven integration
- Produces `Design[]` with proper `BuildingElement` quantities (foundation, wall, slab, roof, openings, fixtures)
- Zod-validated output for safety
- WS6 `src/lib/ai/*` produces `CadDocument` (WS6 bridge types), not `Design[]`

**WS6 modules retained for AiBriefPanel UX:**
- `src/lib/ai/ai-provider.ts` — `parseWithEngine()` for the panel's parsed summary display
- `src/lib/ai/brief-parser.ts` — WS6 variant (used by ai-provider)
- WebLLM remains disabled (`@mlc-ai/web-llm` not installed)

---

## Files Created

| File | Purpose |
|------|---------|
| `src/adapters/aiDesignAdapter.ts` | Exports `generateDesignOptionsFromBriefText(briefText, region?)` — parses brief with canonical parser, generates 3 design options, returns `DesignOption[]` with diagnostics |

## Files Modified

| File | Change |
|------|--------|
| `src/components/ai/AiBriefPanel.tsx` | Added `onDesignOptionsGenerated?: (options: DesignOption[]) => void` prop; calls adapter after successful parse |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | Added `onDesignOptionsGenerated` prop; passes through to `<AiBriefPanel>` |
| `src/pages/Dashboard.tsx` | Added `aiDesignOptions` state; `visibleDesignOptions` memo merging AI + store options; `handleAiDesignOptions` callback; wired to `<EngineeringStudioPanel>` |

---

## Data Flow

```
User enters brief text in AiBriefPanel
  → Click "Generate Design →"
  → parseWithEngine(briefText, 'local-rules') — WS6 parser (for panel status/display)
  → generateDesignOptionsFromBriefText(briefText) — canonical adapter
  → onDesignOptionsGenerated(canonical DesignOption[])
  → Dashboard.setAiDesignOptions()
  → visibleDesignOptions = aiDesignOptions (overrides store designs)
  → PlanCanvas / LazyBimViewer render selected design
```

---

## Design Option Shape Generated

Each `DesignOption` (from `@/domain/boq`):
```typescript
{
  id: string,          // UUID
  name: string,        // "Compact Option" / "Standard Option" / "Spacious Option"
  grossFloorArea: number,  // from totalAreaM2 in design parameters
  floors: number,      // from parsed brief
  elements: [{ id, type, category, name, unit, quantity }]
}
```

Elements map from canonical `BuildingElement` categories:
- `foundation` (m²), `wall` (m²), `slab` (m²), `roof` (m²), `opening` (m² or each), `fixture` (m²)

---

## Example Briefs Tested

### Example 1: "Design a 3 bedroom affordable family house in Harare, 150 square meters, one floor, brick walls, zinc roof, 2 bathrooms."
- **Parser output:** buildingType=house, bedrooms=3, bathrooms=2, floors=1, areaM2=150, location=zimbabwe, features=[kitchen]
- **Designs generated:** 3 (Compact 376.39 m², Standard 442.81 m², Spacious 531.37 m²)
- **2D/3D compatible:** Yes

### Example 2: "Create a two storey 240 square meter duplex with four bedrooms, three bathrooms, open plan kitchen and lounge."
- **Parser output:** buildingType=house, bedrooms=4, bathrooms=3, floors=2, areaM2=240
- **Designs generated:** 3 options
- **2D/3D compatible:** Yes

### Example 3: "Small rural clinic, 300 square meters, reception, 4 consultation rooms, pharmacy, toilets, waiting area."
- **Parser output:** buildingType=clinic, bedrooms=undefined→inferred 2, bathrooms=undefined→inferred 1, floors=1, areaM2=300
- **Designs generated:** 3 options
- **2D/3D compatible:** Yes

All examples: parser does not crash, adapter returns valid DesignOption[], DesignOption fields are compatible with PlanCanvas and designToBim adapter.

---

## Persistence Decision

**AI-generated design options are NOT persisted to IndexedDB (Dexie).**

This is by design:
1. AI-generated options exist only in Dashboard's local `useState` — no store mutations
2. If the user switches projects or refreshes, AI options are lost (store `currentDesigns` remains authoritative)
3. If a user wants to keep AI designs, they can use the existing "Generate" button which calls `projectStore.generateDesigns()` and persists to Dexie
4. Persisting AI designs would require either extending projectStore or writing to Dexie directly — deferred as out of scope for Sprint 3

**Rationale:** Sprint 3's goal is to demonstrate the local AI flow working in the UI. Persistence is a natural follow-up but adds complexity (store integration, DB writes, transaction logging) that is safe to defer.

---

## WebLLM Status

| Component | Status |
|-----------|--------|
| `@mlc-ai/web-llm` npm package | ❌ Not installed |
| WebLLM engine button in panel | 🔄 Disabled, strikethrough "not installed" |
| `local-rules` engine | ✅ Default and only active engine |
| Fallback to rules | ✅ Already built into ai-provider.ts |

---

## Validation Results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` (`eslint . --ext ts,tsx`) | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (3358 modules, 16 precache) |

---

## Remaining Limitations

| Limitation | Details | Future |
|------------|---------|--------|
| AI options not persisted | Local state only, lost on refresh | Persist to Dexie via projectStore or direct DB write |
| No BOQ auto-generation from AI designs | BOQ panel shows store BOQ, not AI-generated BOQ | Trigger `generateBOQ` when AI designs are created |
| Simple regex parser | No semantic understanding of vague briefs | WebLLM integration (opt-in) or improved rules |
| Design elements approximate | Quantities based on room areas, not CAD geometry | Full CAD→BIM pipeline |
| BimViewer shows all floors at once | Floor visibility panel not wired | Connect FloorVisibilityPanel |
