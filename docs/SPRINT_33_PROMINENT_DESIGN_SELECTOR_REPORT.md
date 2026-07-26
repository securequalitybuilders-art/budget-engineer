# Sprint 33 — Make Design Option Selection Front-and-Center (Unmissable)

## Problem (Confirmed Twice with Screenshots)

After Sprint 32 added:
- A "Select a design option to continue" prompt
- Locked Design stage tab with tooltip
- Auto-scroll to design options

A real user **still could not find where to select a design option**. Root cause:

1. The design option cards rendered at the TOP of the main canvas area, but this
   area competes with the toolbar, PlanCanvas, PlanComparison, and mobile message.
2. With all side panels open (Builder Guide + Properties + History + Engineering
   Studio + BOQ + Governance + Feedback), the main content area is narrow and
   the cards appear below the fold.
3. The user's attention is on the Engineering Studio panel where they just clicked
   "Generate Design →" and saw the success message. The cards are in a completely
   different column (the main canvas area), out of sight.
4. The cards lacked visual weight — just a plain grid of small buttons with no
   branded container, no section heading, and no distinguishable background.

**"The single most important action in the whole app is physically off-screen on a normal window."**

## Chosen Approach: Top-of-Canvas Branded Section

After evaluating two approaches:
- **Modal/Overlay** — would block the user from seeing the canvas context.
- **Top-of-canvas branded section** — places the selector in the main content
  area where it's impossible to miss, but keeps the canvas visible below.

I chose the **top-of-canvas branded section** because:
- It doesn't block the user's view of the PlanCanvas or other content.
- It's always visible at the top of the scrollable main area.
- It can be collapsed or scrolled past once the user selects an option.
- It's more consistent with the app's existing layout patterns.

## What Changed

### Before (Sprint 32)

```
┌──────────────────────────────────┐
│  Toolbar                         │
│  ┌─┐ ┌─┐ ┌─┐ ┌─────┐ ┌─┐ ┌─┐  │
│  └─┘ └─┘ └─┘ └─────┘ └─┘ └─┘  │
├──────────────────────────────────┤
│  Select a design option to       │  ← small cyan text, easy to miss
│  continue                        │
│                                  │
│  ┌──────────┐ ┌──────────┐       │  ← small cards, no branded container
│  │ Compact  │ │Standard  │       │
│  │ 44 m²    │ │ 80 m²    │       │
│  │ Select   │ │ Selected │       │
│  └──────────┘ └──────────┘       │
│                                  │
│  [PlanCanvas]                    │
│                                  │
└──────────────────────────────────┘
```

### After (Sprint 33)

```
┌──────────────────────────────────┐
│  Toolbar                         │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ ╔══════════════════════╗   │  │
│  │ ║  Choose your design  ║   │  │  ← large section heading + icon
│  │ ╚══════════════════════╝   │  │
│  │                            │  │
│  │  ┌──────────────┐ ┌──────┐ │  │  ← bordered branded container
│  │  │ Compact      │ │Stand │ │  │     (cyan border + shadow)
│  │  │ 44 m²        │ │80 m² │ │  │
│  │  │ 3 elements   │ │5 elem│ │  │  ← larger cards with more info
│  │  │ [Select this] │ │[Selec]│ │  │
│  │  └──────────────┘ └──────┘ │  │
│  │                            │  │
│  │  ┌─ Selected confirmation  │  │  ← CTA bar with "View 2D floor plan"
│  │  │  ✓ Compact selected     │  │
│  │  │  [View 2D floor plan →] │  │
│  │  └─────────────────────────┘  │
│  │                            │  │
│  │  [Regenerate options]      │  │
│  └────────────────────────────┘  │
│                                  │
│  [PlanCanvas]                    │
│                                  │
└──────────────────────────────────┘
```

### Key Changes

1. **Branded container**: The entire selection area is wrapped in a `rounded-2xl
   border-2 border-cyan-500/25 bg-slate-900/80 shadow-lg shadow-cyan-500/5`
   section that visually separates it from the rest of the canvas.

2. **Section header**: Icon + "Choose your design" heading + descriptive subtitle
   ("Select a design option to unlock the Design stage" or "Design selected — you
   can change anytime").

3. **Larger option cards**: Cards use `border-2` instead of `border`, show element
   count alongside area/floors, and have "Select this design" / "Selected" badges.

4. **Selection CTA**: After selection, a confirmation bar appears: green checkmark
   + "Compact selected" + "View 2D floor plan →" button that sets canvas view to
   'plan' and scrolls to the canvas area.

5. **Regenerate button**: Moved below the cards, using `variant="secondary"` and
   `size="sm"` so it doesn't compete with the primary selection action.

6. **Responsive grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — stacks
   vertically on mobile/condensed widths, expands to 2–3 columns on larger screens.

## Files Added/Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replaced card section with prominent branded "Choose your design" container, added selection CTA, larger cards |
| `src/__tests__/designOptionSelector.test.ts` | 4 new tests |
| `docs/SPRINT_33_PROMINENT_DESIGN_SELECTOR_REPORT.md` | This file |
| `CHANGELOG.md` | Sprint 33 entry |

## Before/After UX

| Aspect | Before (Sprint 32) | After (Sprint 33) |
|--------|-------------------|-------------------|
| Section visibility | Plain grid with no container | Branded `rounded-2xl` section with `border-2` + shadow |
| Heading | None (just card buttons) | "Choose your design" with icon + subtitle |
| Card size | `p-4` with `border` | `p-4` with `border-2` + `hover:scale-[1.02]` |
| Card info | Name, area, floors | Name, area, floors, **element count** |
| Badge text | "Select" / "Selected" | "**Select this design**" / "Selected" |
| Selection feedback | Text "View 2D floor plan →" | **Confirmation bar** + **"View 2D floor plan →" button** |
| Regenerate button | Inline with cards | Separate row below cards |
| Zero-options state | Empty canvas + generate button | Same (prompts to use AI Brief) |

## Tests Added

File: `src/__tests__/designOptionSelector.test.ts` (4 tests)

- `selectedDesignId starts null when no option selected`
- `selecting an option sets selectedDesignId and unlocks Design stage`
- `changing selection updates selectedDesignId`
- `clearing selection re-locks Design stage`

All pass with 0 warnings.

## Validation Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **9 warnings** (all pre-existing) |
| `npm test` | **255 passed** (21 files) |
| `npm run build` | 3389 modules, no errors |

## Remaining Limitations

1. **No React Testing Library**: The prominent selector's visual presence cannot
   be tested with a component render test. The store-based tests verify the
   underlying selection logic works correctly.

2. **Empty state unchanged**: When no design options exist, the existing empty
   state (plain canvas + generate button) is preserved. A future sprint could
   add a more prominent "Get started with AI Brief" callout, but the current
   state already directs users to the Engineering Studio panel.

3. **Side panel overlap on very narrow screens**: On extremely narrow viewports
   (< 768px) with all side panels visible, the main content area compresses
   significantly. The responsive grid handles this by collapsing to a single
   column, but the section's horizontal padding may still cause content to feel
   cramped. The `overflow-auto` on the container ensures scrollability.
