# Sprint 81 — First-Run Onboarding Tour

> **Date:** 2026-07-07  
> **Release:** v0.8.0 + Sprint 81  
> **Head:** `be9c27c` + Sprint 81 commit  
> **Theme:** v1.0.0 polish — new user onboarding

---

## Summary

Added an accessible, dismissible, re-openable **onboarding tour** that appears on the user's first Dashboard visit and explains the 6-step workflow. The tour reuses the step definitions from the Builder Journey Guide via a shared `journeySteps` module. A `hasSeenTour` flag is persisted in Zustand + localStorage. A "How it works" (?) button next to the Builder Journey Guide header re-opens the tour any time.

---

## What was built

### 1. Shared Journey Steps (`src/components/dashboard/journeySteps.ts`)

Extracted the 6-step constant from `BuilderJourneyGuide.tsx` into a shared module:

| Step | Label | Description |
|------|-------|-------------|
| 1 | Describe your project | Write a plain-English brief in the AI panel |
| 2 | Review design options | AI generates up to 3 options — pick one |
| 3 | View 2D floor plan | See your design as a CAD drawing |
| 4 | View 3D BIM model | Switch to 3D viewer for realistic preview |
| 5 | Run engineering checks | Clashes, solar orientation, MEP estimates |
| 6 | Get BOQ & export | Cost breakdown and CSV/PDF export |

Both `BuilderJourneyGuide.tsx` and `OnboardingTour.tsx` import from this single source.

### 2. Onboarding Tour (`src/components/onboarding/OnboardingTour.tsx`)

- **Accessible modal overlay** — `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- **6 slides** — icon + title + description, recycling the shared `JOURNEY_STEPS`
- **Navigation** — Next, Back (hidden on first slide), Skip tour (hidden on last slide), "Get started" on last slide
- **Progress dots** — visual bar with `role="progressbar"` and `aria-valuenow/min/max`
- **Focus trap** — Tab/Shift+Tab cycle within dialog; Esc closes; focus returns to trigger
- **Backdrop click** closes the tour
- **Graceful fail-closed** — if the component errors, it simply doesn't render (`return null` path)
- **Brand-consistent** — glassmorphism dark overlay, Deep Cobalt/Cyan/BIM Violet accent icon colors

### 3. First-Run Logic (`src/stores/uiStore.ts` + `src/pages/Dashboard.tsx`)

- `hasSeenTour: boolean` (default `false`) + `setHasSeenTour` action in uiStore
- Persisted to localStorage via `partialize` on the Zustand store
- On Dashboard mount: if `!hasSeenTour`, sets `tourOpen = true`
- Skipping (Esc, backdrop click, "Skip tour" button) or completing ("Get started") calls `setHasSeenTour(true)` so the tour never reappears
- All wrapped in `try/catch` — never breaks the app

### 4. Manual Re-open

- Small "?" button (circle, 20×20) positioned absolutely at the top-right of the Builder Journey Guide panel
- `aria-label="How it works — replay onboarding tour"`
- Click sets `tourOpen = true` regardless of `hasSeenTour`

### 5. Tests (`src/__tests__/onboardingTour.test.tsx`)

12 tests covering:

- First slide renders with correct title/description
- "Next" advances; "Back" returns
- Progress dots reflect position (aria-valuenow)
- Last slide "Get started" calls `onComplete` + `onClose`
- "Skip tour" calls `onClose` but not `onComplete`
- Esc keydown calls `onClose`
- `role="dialog"` and `aria-modal="true"` present
- Does not render when `open={false}`
- Backdrop click closes
- Shared `JOURNEY_STEPS` exports expected list (6 items, correct labels)
- Each step has id, label, description, icon

---

## Quality & Stability

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 9 warnings (baseline unchanged) |
| `npm test` | 876 passed (48 files, +12 new tests) |
| `npm run build` | ✓ built, PWA 30 entries |
| `text-stone-500` in app .tsx | 0 matches |

### Lint Warnings (9 total, all pre-existing)
```
Badge.tsx:38   — react-refresh/only-export-components
Button.tsx:53  — react-refresh/only-export-components
useCadDocument.ts:20  — react-hooks/exhaustive-deps
useCadHistory.ts:40   — react-hooks/exhaustive-deps
useEditablePlan.ts:62 — react-hooks/exhaustive-deps
usePlanHistory.ts:40  — react-hooks/exhaustive-deps
cadPersistenceService.ts:26 (×3) — @typescript-eslint/no-unused-vars
```

---

## Files Changed

### New Files (3)
- `src/components/onboarding/OnboardingTour.tsx` — accessible tour overlay
- `src/components/dashboard/journeySteps.ts` — shared step definitions
- `src/__tests__/onboardingTour.test.tsx` — 12 tests
- `docs/SPRINT_81_ONBOARDING_TOUR_REPORT.md` — this report

### Modified Files (3)
- `src/components/dashboard/BuilderJourneyGuide.tsx` — imports shared steps
- `src/stores/uiStore.ts` — `hasSeenTour` + `setHasSeenTour`
- `src/pages/Dashboard.tsx` — tour wiring + "?" button
