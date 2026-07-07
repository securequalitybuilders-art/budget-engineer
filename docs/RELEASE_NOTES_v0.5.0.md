# v0.5.0 — Interactive 2D CAD Editor

> **Release date:** 2026-07-06  
> **Previous release:** [v0.4.0](https://github.com/securequalitybuilders-art/budget-engineer/releases/tag/v0.4.0)  
> **Repository:** [github.com/securequalitybuilders-art/budget-engineer](https://github.com/securequalitybuilders-art/budget-engineer)

## Highlights

**Complete interactive 2D CAD editing for rooms and openings, built on SVG-root pointer capture with data-attribute routing.** Rooms can be added, deleted, moved, and resized; doors and windows can be added, moved along walls, and deleted — all with undo/redo and IndexedDB persistence.

### Key Features

- **Room editing:** Add/delete rooms with automatic wall rebuild and dangling-opening cleanup. Move rooms by dragging, resize via 8 selection handles. Guarded against deleting the last room.
- **Opening editing:** Add doors (0.9m) and windows (1.2m) on selected walls. Move openings along walls via drag (offset clamped to wall extent so openings stay fully on wall). Delete openings.
- **Snap-to-grid:** `snapToGrid(value, step)` constrains positions, dimensions, and offsets at a user-selectable step (0.05m / 0.1m / 0.2m / 0.5m / 1.0m, default 0.1m).
- **Keyboard nudge:** Arrow keys nudge selected rooms/doors/windows by the snap step; Shift+Arrow = 10× snap step. Only active in `idle` mode.
- **Live dimension readout:** W×H rendered as SVG `<text>` for each selected room; offset‑% for selected openings. Uses `pointerEvents="none"` so it never blocks interaction.
- **Undo/redo timeline:** Full history stack via `usePlanHistory` (past/future arrays) with a `TimelinePanel` showing the current position. All operations go through `history.set()`.
- **Toolbar:** Grouped with `|` separators: zoom controls, room add/delete, door/window add, snap step `<select>`, undo/redo buttons, export buttons.
- **Persistence:** All edits auto-save to IndexedDB via `cadPersistenceService` with `onCommit`. Survives page refresh, feeds downstream drawings and 3D.
- **SVG-root pointer capture:** All pointer events captured on the SVG root element with `data-room-id`/`data-opening-id`/`data-resize` routing via `Element.closest()`. Absolute `clientX/Y` deltas (frame-independent under capture, works across mouse/stylus/touch).
- **Debug removed:** All `debugInfo` state and `setDebugInfo` calls fully removed — no on-screen debug readout.

## Quality

| Metric | Value |
|--------|-------|
| Tests | **766 passed** (43 files) |
| TypeScript | **0 errors** (`npm run typecheck`) |
| ESLint | **0 errors, 9 warnings** (baseline) |
| Build | Success, PWA 30 precached entries |
| Accessibility | No `text-stone-500`, WCAG AA contrast |
| Offline | 100% client-side, IndexedDB, no backend |
| Dependencies | All MIT/Apache 2.0, no paid APIs |

## New Files (Sprints 65–70)

| File | Sprint | Purpose |
|------|--------|---------|
| `src/lib/geometry/snap.ts` | 70 | `snapToGrid(value, step)` pure helper |
| `src/__tests__/editablePlan.test.ts` | 67 | 63 tests: rooms, openings, snap, nudge, undo/redo, persistence |
| `src/__tests__/errorBoundary.test.tsx` | 66 | Error boundary and WebGL fallback tests |
| `src/components/common/ErrorBoundary.tsx` | 66 | React error boundary component |
| `src/components/bim/Bim3DUnavailable.tsx` | 66 | Friendly "3D unavailable" fallback UI |
| `src/lib/webgl.ts` | 66 | WebGL context-loss detection utility |
| `src/components/drawings/planSheetModel.tsx` | 65 | White-paper CAD floor plan for A1 sheet |

## Disclaimer

All drawing and editing operations are schematic and indicative. Verify with a registered architect, structural engineer, and quantity surveyor before use in construction. The tool aids early-stage design and cost estimation only — it does not replace qualified professional review.
