# Sprint 32 — Clear Design-Option Selection Gating and Stage Progression UX

## Problem

Real user report: On the Concept stage, a user typed a brief, clicked "Generate
Design", and got "Generated 3 design options via local rules". They could NOT
proceed to the Design / 2D floor plan stage because:

- No design option had been **visually selected** — the first option was
  auto-selected internally but the user had no visible confirmation.
- The DESIGN OPTIONS selector was rendered as small truncated buttons that were
  pushed off-screen by side panels (Builder Guide + Properties + History +
  Engineering Studio all open at once).
- The app never told the user "pick a design option to continue."
- The Design stage tab in the top nav gave no indication it was gated.

## What Changed and Why

### 1. Design options are now clickable cards (not truncated buttons)

**Before:** Tiny `max-w-[160px]` buttons with only the option name, easy to
miss when side panels are open.

**After:** Full-width cards in a responsive grid (`grid-cols-1 sm:grid-cols-2
lg:grid-cols-3`). Each card shows:
- Option name (bold)
- Gross floor area + floor count
- A **Select** (amber) or **Selected** (cyan) badge
- When selected: a "View 2D floor plan →" indicator

Cards have a `hover:scale-[1.02]` animation and cyan border highlight when
selected, making the interaction tactile and obvious.

### 2. High-visibility prompt when no option is selected

When `visibleDesignOptions.length > 0` but `selectedDesignId` is null, a cyan
brand-accent banner renders above the cards:

```
  ╔══════════════════════════════════════╗
  ║  Select a design option to continue  ║  ← cyan bg + border
  ╚══════════════════════════════════════╝
```

This is impossible to miss — it uses the same brand-cyan palette as the active
stage indicator.

### 3. No auto-selection on generation

Removed the `setSelectedDesignId(options[0].id)` call in
`handleAiDesignOptions`. Users must explicitly click a card. The canvas
fallback (`visibleDesignOptions[0]` if `selectedDesignId` is null) still
renders the first design, but the visual prompt and gating push the user to
make a deliberate choice.

### 4. Design stage tab is gated

The `CommandBar` stage navigation now has an `isStageAccessible()` check:
- Stages after Brief (indices >= 2: Design, Engineering, Docs & BIM, Cost &
  Deliver) are **locked** when `selectedDesignId` is null
- Locked stages render with `cursor-not-allowed` and `line-through
  decoration-dotted` styling
- Hovering shows a tooltip: **"Select a design option first"**

### 5. Auto-scroll to design options after generation

A `useRef` on the design options container + a `useEffect` watching
`visibleDesignOptions.length` calls `scrollIntoView({ behavior: 'smooth',
block: 'nearest' })` whenever options appear.

### 6. State stored centrally

`selectedDesignId` moved from local `useState` in `Dashboard.tsx` to the
Zustand `uiStore`, so both `Dashboard` and `CommandBar` access the same value.
It is excluded from persistence (`partialize` only persists `theme`).

## Files Added/Modified

| File | Change |
|------|--------|
| `src/stores/uiStore.ts` | Added `selectedDesignId` and `setSelectedDesignId` |
| `src/pages/Dashboard.tsx` | Design options → cards; prompt; auto-scroll; remove auto-select |
| `src/components/layout/CommandBar.tsx` | `isStageAccessible()` gating; locked state + tooltip |
| `src/__tests__/designOptionGating.test.ts` | 5 new tests |
| `src/__tests__/setup.ts` | Global localStorage mock for Zustand persist |
| `vitest.config.ts` | Added `setupFiles` for test setup |
| `docs/SPRINT_32_DESIGN_OPTION_GATING_REPORT.md` | This file |
| `CHANGELOG.md` | Sprint 32 entry added |

## How Gating Now Works

```
State machine:
  selectedDesignId = null  →  Stage nav: Design+ locked, tooltip shows
                              Canvas: first option rendered (fallback)
                              Prompt: "Select a design option to continue"

  user clicks a card       →  selectedDesignId = option.id
                              Stage nav: Design+ unlocked
                              Card shows "Selected" + "View 2D floor plan →"
                              Prompt disappears

  user can change selection →  selectedDesignId = new option.id
  or select null            →  selectedDesignId = null (unselect)
                              Stage nav: locks again
```

## Tests Added

File: `src/__tests__/designOptionGating.test.ts` (5 tests)

- `selectedDesignId defaults to null`
- `setSelectedDesignId updates store`
- `setSelectedDesignId accepts null to clear selection`
- `partialize excludes selectedDesignId from persistence`
- `activeStage can advance when selectedDesignId is set`

All pass with 0 warnings.

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **9 warnings** (all pre-existing) |
| `npm test` | **251 passed** (20 files) |
| `npm run build` | 3389 modules, no errors |

## Remaining Limitations

1. The Design stage tab is rendered as a static `<div>`, not a button —
   clicking it does nothing even when unlocked. This matches the pre-existing
   pattern (all stage tabs are decorative indicators, not navigation triggers).
   A future sprint could make them clickable.

2. The `isStageAccessible` function in `CommandBar` uses a simple index-based
   check (`idx >= 2`). If the stage order changes, this must be updated.

3. No test explicitly renders the `CommandBar` component (no React Testing
   Library in the project). The gating logic is tested indirectly through the
   store state.
