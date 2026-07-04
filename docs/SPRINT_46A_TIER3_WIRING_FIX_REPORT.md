# Sprint 46A — Tier 3 Wiring Fix: Topology Labels in Design Option Cards

## Overview

Tier 3 (`generateFloorPlans`) was committed and pushed at `414e407` but never appeared in the live UI — the 3 design-option cards still showed "Compact Option / Standard Option / Spacious Option" from the old `@/ai/designEngine` path. This report documents the root cause, the fix, and the before/after behavior.

## Phase 1 — Root Cause Diagnosis

### Two independent entry paths → two root causes

#### Path A: "Regenerate options" button (main target)

| Step | File:Line | What happened |
|------|-----------|---------------|
| Click | `Dashboard.tsx:262` | `handleGenerate` calls `await generateDesigns(id)` |
| Store | `projectStore.ts:182` | `generateDesignOptions(projectId, parsed)` from `@/ai/designEngine` |
| Names | `src/ai/designEngine.ts:176` | Produces `"Compact Option"`, `"Standard Option"`, `"Spacious Option"` |
| Display | `Dashboard.tsx:440` | `{option.name}` renders the old label |

**Root cause (a)**: `handleGenerate` had **zero awareness** of Tier 3. It only called the store's `generateDesigns`, which uses the old engine. Tier 3 output was never mapped into the option cards.

#### Path B: AI Brief panel "Generate Design" button

| Step | File:Line | What happened |
|------|-----------|---------------|
| Options | `AiBriefPanel.tsx:50` | `generateDesignOptionsFromBriefText` → old 3 names |
| Sent | `AiBriefPanel.tsx:56` | `onDesignOptionsGenerated(options)` → sets `aiDesignOptions` state |
| Tier 3 runs | `AiBriefPanel.tsx:74-77` | `generateFloorPlans` succeeds, calls `onTier3Plans(plans)` |
| Handler | `Dashboard.tsx:283-296` | `handleTier3Plans` reads `aiDesignOptions` from **stale closure** |

**Root cause (b)**: `handleTier3Plans` used `aiDesignOptions` directly from the function closure. When Tier 3 finished (after `onDesignOptionsGenerated`), `aiDesignOptions` was still the **empty array `[]`** from the previous render — React hadn't re-rendered yet. The guard `if (aiDesignOptions.length >= plans.length)` evaluated `0 >= 3 → false`, silently skipping the remap.

## Phase 2 — Wiring Fix

### Fix 1: `handleTier3Plans` — stale closure (`Dashboard.tsx:283-296`)

**Before:**
```typescript
const handleTier3Plans = (plans: FloorPlan[]) => {
    setTier3Plans(plans)
    if (aiDesignOptions.length >= plans.length) {  // stale closure
      const updated = aiDesignOptions.map(...)
      setAiDesignOptions(updated)
    }
  };
```

**After:** Uses functional `setState` to read the latest `aiDesignOptions`:
```typescript
const handleTier3Plans = (plans: FloorPlan[]) => {
    setTier3Plans(plans)
    setAiDesignOptions((prev) => {
      if (prev.length >= plans.length) {
        const updated = prev.map((opt, i) => { ... })
        setSelectedDesignId(updated[0]?.id ?? null)
        return updated
      }
      return prev
    })
  };
```

### Fix 2: `handleGenerate` — Regenerate button now runs Tier 3 (`Dashboard.tsx:262-295`)

**Before:** Only called `await generateDesigns(id)` (old engine).

**After:** After the store generates designs, the handler dynamically imports and runs Tier 3:
1. Reads `currentBrief.rawText` from the store
2. Runs `parseBrief` (Tier 1) → `generateDesignConcept` (Tier 2) → `generateLayoutParameters` + `generateFloorPlans` (Tier 3)
3. Remaps option names to topology names (e.g. "Rectangle — Public Front / Corridor / Private Back")
4. Falls back to `console.warn` if Tier 3 throws — old labels preserved

### Fix 3: Tests — plan names MUST be topology-based, never Compact/Standard/Spacious

Added 3 tests across house/clinic/hotel describe blocks:
```typescript
it('plan names contain topology keywords not Compact/Standard/Spacious', () => {
    for (const p of plans) {
      expect(p.name.toLowerCase()).toContain(p.topology === 'l-shape' ? 'l-shape' : p.topology)
      expect(p.name).not.toMatch(/compact|standard|spacious/i)
    }
  })
```

These tests fail on any plan whose name is "Compact Option" instead of a topology label.

## Before / After

| Aspect | Before | After |
|--------|--------|-------|
| Option card labels | "Compact Option", "Standard Option", "Spacious Option" | "Rectangle — Public Front / Corridor / Private Back", "L-Shape — Vertical Wing + Horizontal Wing + Corner Courtyard", "Split-Wing — Two Pavilions + Central Gallery" |
| AI Brief panel path | Tier 3 computed but names never remapped (stale closure) | Names remapped via functional setState |
| Regenerate button | Only old engine (no Tier 3) | Runs Tier 3 after generation |
| Fallback | Tier 3 errors silently swallowed | Same behavior preserved: `console.warn` + old labels |
| Selected option → PlanModel | `generatePlanModel(selectedDesign)` (generic) | `floorPlanToPlanModel(selectedTier3Plan, selectedDesign)` (topology-specific rooms) |

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | `handleTier3Plans` uses functional `setState`; `handleGenerate` runs Tier 3 after store call |
| `src/__tests__/tier3LayoutEngine.test.ts` | +3 tests: plan names contain topology keywords, not Compact/Standard/Spacious |
| `docs/SPRINT_46A_TIER3_WIRING_FIX_REPORT.md` | New |
| `CHANGELOG.md` | Updated |

## Validation

| Check | Result |
|-------|--------|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint src/`) | 0 errors, 9 warnings (baseline) |
| Tests (`vitest run`) | **411 passed** (30 files, +3 new) — was 408 |
| Build (`npm run build`) | Success — code-split chunks preserved |
