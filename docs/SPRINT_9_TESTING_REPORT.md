# Sprint 9 — Automated Tests for Core Pipeline

**Date:** 2026-07-01  
**Goal:** Add automated unit tests for all core adapters/engines in the Budget Engineer pipeline: AI design → geometry → BIM → analysis → BOQ → persistence.

---

## Test Stack

| Tool | Version | Purpose |
|------|---------|---------|
| vitest | 4.1.9 | Test runner (Vite-native, fast) |
| fake-indexeddb | 6.0.0 | IndexedDB polyfill for Node.js Dexie tests |
| TypeScript | 5.7.3 | Type-safe test assertions |

No jsdom, no @testing-library/react, no paid APIs.

---

## Test Files

| File | Tests | Module Under Test |
|------|-------|-------------------|
| `src/__tests__/aiDesignAdapter.test.ts` | 6 | `generateDesignOptionsFromBriefText`, `generateDefaultDesignOption` |
| `src/__tests__/designGeometryAdapter.test.ts` | 9 | `buildDesignGeometry`: rooms, walls, openings, zones |
| `src/__tests__/designToBim.test.ts` | 8 | `buildBimFromDesignOption`: walls, slabs, roof, openings, roomZones |
| `src/__tests__/designToAnalysis.test.ts` | 8 | `buildAnalysisFromDesignOption`: clash, solar, MEP |
| `src/__tests__/designToBoq.test.ts` | 11 | `buildBoqFromDesignOption`: regional BOQ, CSV, HTML |
| `src/__tests__/rateCardAdapter.test.ts` | 11 | Rate card resolution for all 4 regions |
| `src/__tests__/projectPersistenceService.test.ts` | 5 | Dexie write/read/query smoke tests |
| **Total** | **58** | |

---

## Test Coverage Summary

### Pipeline Stages Covered

| Stage | Adapter/Engine | Covered | Notes |
|-------|---------------|---------|-------|
| Brief → Design | `aiDesignAdapter.ts` | ✅ 6 tests | Residential, vague brief, duplex, default option |
| Design → Geometry | `designGeometryAdapter.ts` | ✅ 9 tests | Null/empty, rooms/walls/openings counts, corner clamping, clinic, duplex, NaN |
| Design → BIM | `designToBim.ts` | ✅ 8 tests | Null/zero-area, element types present, multi-floor, NaN |
| Design → Analysis | `designToAnalysis.ts` | ✅ 8 tests | Null-safe, clash/solar/MEP non-null, window area, MEP points |
| Design → BOQ | `designToBoq.ts` | ✅ 11 tests | Currency checks (ZWL/ZAR/KES/USD), totals differ, assumptions, CSV/HTML content, NaN, cost/m² |
| Rate Cards | `rateCardAdapter.ts` | ✅ 11 tests | 4 regions, default, mapped rates, partition~wall, fallback warning, contingency/fees/vat |
| Persistence | `projectPersistenceService.ts` | ✅ 5 tests | Dexie open, tables, write/read design + transaction, query, boq count |

### Untested Areas (Out of Scope for Sprint 9)

| Area | Reason |
|------|--------|
| UI components (PlanCanvas, LazyBimViewer, BoqExportPanel, Dashboard) | Component tests require jsdom/@testing-library; pure function tests are higher priority |
| WebLLM parser (`src/lib/ai/webllm-parser.ts`) | Requires `@mlc-ai/web-llm` (opt-in dependency) |
| Dexie v3 migration logic | Tested indirectly by persistence service smoke |
| RateCardPanel UI | Component-level |
| Multi-floor room distribution for >2 floors | Complex algorithmic coverage deferred |
| CAD export (DXF/SVG) | String generation tests deferred |
| BIM viewer 3D rendering | Three.js canvas tests deferred |

---

## Build Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 6 pre-existing warnings |
| `npm test` | ✅ 58 passed (7 files) |
| `npm run build` | ✅ 3369 modules, 16 precache |

---

## CI Pipeline

A new `.github/workflows/ci.yml` was created with the following steps:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 20, npm cache)
3. `npm ci`
4. `npm run typecheck`
5. `npm run lint`
6. `npm test`
7. `npm run build`

---

## Issues Fixed

| Issue | Fix |
|-------|-----|
| `toBeFinite()` not a vitest matcher | Replaced with `typeof n === 'number' && !Number.isNaN(n)` checks |
| `actor: 'TEST'` not a valid `ProjectTransaction.action` | Changed to `'CREATE'` |
| Unused `maxDist` / `wlen` variables in geometry test | Removed |
| Unsafe type assertions `e as Type` in BIM test | Changed to `e as unknown as Type` |

---

## Key Decisions

1. **vitest over jest** — Vite-native, no extra config for `@` alias resolution
2. **fake-indexeddb for persistence** — Enables Dexie tests in Node without a browser
3. **`environment: 'node'`** — No DOM needed; all adapters are pure functions
4. **Separate test files per adapter** — Focused, maintainable
5. **No component tests** — Would add complexity without covering high-risk pipeline logic
6. **CI added from scratch** — No existing `.github/workflows/` directory
