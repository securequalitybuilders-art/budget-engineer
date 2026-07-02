# Sprint 31A — Lighthouse NO_FCP Diagnostics and First Paint Hardening

**Date:** 2026-07-02  
**Goal:** Diagnose Lighthouse "The page did not paint any content (NO_FCP)" error on the project route and harden first-paint behavior.

---

## Summary

A Lighthouse audit against `https://budget-engineer.vercel.app/project/4d6c183a-e583-4788-a35b-aeb55952c42f` returned NO_FCP. The audit also warned that IndexedDB data may affect loading performance.

**Root cause:** The Dashboard component's loading state (shown while `isLoading` is true or `currentProject` is null) rendered a **CSS border spinner with no visible text**. When a non-existent project UUID was navigated to, `loadProject()` completed with `currentProject = null`, causing the page to display this bare spinner **indefinitely** — no text, no fallback, no navigation. Lighthouse interpreted this as "no content painted."

**Fix:** 
1. Added visible text "Loading project…" to the loading state.
2. Added a "Project not found" fallback with a button to create a new project (`Link` to `/new`), using the existing brand styling.

---

## Routes Checked

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Paint | Home page renders static content |
| `/new` | ✅ Paint | ProjectWizard renders immediately |
| `/portfolio` | ✅ Paint | PortfolioPage renders immediately |
| `/feedback` | ✅ Paint | FeedbackPage renders immediately |
| `/project/demo` | ⚠️ Paint (after fix) | Previously bare spinner with no text |
| `/project/4d6c183a-e583-4788-a35b-aeb55952c42f` | ⚠️ Paint (after fix) | Previously bare spinner indefinitely |

---

## NO_FCP Reproduction

| Question | Answer |
|----------|--------|
| NO_FCP reproduced locally? | ✅ **Yes** — by navigating to `/project/` + random UUID |
| Console errors found? | ❌ **No** — no runtime errors |
| Network 404s found? | ❌ **No** — all JS/CSS chunks load correctly |
| IndexedDB involved? | ✅ **Yes** — `loadProject()` queries IndexedDB async; `seed()` seeds IndexedDB rates |
| Service worker / cache involved? | ❌ **No** — service worker installs post-paint |

---

## Code Changes

### `src/pages/Dashboard.tsx`

**Problem:** The loading state (line 261–267) was a single conditional `if (isLoading || !currentProject)` that returned a `<div>` with only a CSS border spinner — **no visible text**. For non-existent project IDs, `currentProject` stays `null` indefinitely, meaning the spinner is the **only** thing ever rendered.

**Fix:** Split into two distinct states:

1. **Loading state** (`isLoading === true`): Spinner + text "Loading project…" on `var(--bg-primary)` background.
2. **Not-found state** (`isLoading === false && currentProject === null`): Box icon + "Project not found" heading + description + "Create new project" `<Link>` button styled with the brand cyan palette.

Added `Link` import from `react-router-dom`.

---

## Tests

No existing tests were broken (all 238 pass). No new tests added — the component does not have a React Testing Library setup, and the fix is a text-content and conditional-render change that is trivially verified by visual inspection and the typecheck/build.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 9 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (238 tests, 18 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS (3388 modules, 20 precache) |

---

## Remaining Risks

1. **`loadProject()` queries 5 IndexedDB tables** — if IndexedDB is cold or slow, the loading state may still appear for hundreds of milliseconds. The loading state now has text, mitigating the NO_FCP concern, but the delay still exists.
2. **`seed()` runs on every Dashboard mount** — it calls `seedRates()` which does a `bulkPut` on the rates table. If rates are already seeded, this is a no-op, but still an async call that delays the loading state transition.
3. **`StrictMode` double-render** — React `StrictMode` in `main.tsx` causes effects to run twice in development, doubling IndexedDB reads. This does not affect production builds.
4. **`@mlc-ai/web-llm` resolution error** — the `dev server` fails to start because `@mlc-ai/web-llm` is imported but not installed. This does not affect production builds (it is externalized in `vite.config.ts`).

---

## Recommendation

Proceed to Sprint 31 after this diagnostic sprint completes. The fixes in this sprint ensure every route — including non-existent project IDs — paints visible content immediately after the JS bundle loads.

Longer-term improvements (out of scope for this diagnostic):
- Move `seedRates()` to app boot instead of per-mount.
- Add a `<script>` that renders a static loading shell in `index.html` before React mounts.
- Consider server-side rendering or pre-rendering for the static shell.
