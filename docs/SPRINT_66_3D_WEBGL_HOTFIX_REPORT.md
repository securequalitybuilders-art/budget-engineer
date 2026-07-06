# Sprint 66 (Hotfix) — 3D WebGL Crash Protection

## Root Cause

The 3D component (`BimModel3D` via `LazyBimModel3D`) had **no error boundary** — only a `<Suspense>` loading fallback, which does NOT catch render/runtime errors. When WebGL context creation failed (GPU/driver issues, browser extensions, too many WebGL contexts), the error propagated to React Router and crashed the entire page with:
```
"THREE.WebGLRenderer: A WebGL context could not be created."
"React Router caught the following error during render: Error: Error creating WebGL context."
```

This violated the "never crash" constitution rule.

## Fix Architecture

```
LazyBimModel3D
  ├── Early check: isWebGLAvailable() → false → render Bim3DUnavailable (NO three.js loaded)
  └── ErrorBoundary
       ├── Suspense (loading spinner)
       │    └── BimModel3DInner
       │         ├── <Canvas onCreated={handleCreated} frameloop="demand"
       │         │        gl={{ powerPreference, failIfMajorPerformanceCaveat, ... }}>
       │         │    ├── Scene (building meshes, lights, orbit controls)
       │         │    └── SnapshotCapture
       │         └── Context-lost handler → show Bim3DUnavailable
       └── On error → render Bim3DUnavailable with Retry button
```

## Files Created

| File | Purpose |
|------|---------|
| `src/components/common/ErrorBoundary.tsx` | Reusable class component: `getDerivedStateFromError` + `componentDidCatch`, accepts `fallback` prop (ReactNode or render-prop `(retry) => ReactNode`), default friendly panel with Retry. Role="alert" for a11y. |
| `src/components/bim/Bim3DUnavailable.tsx` | Friendly fallback panel: "3D view unavailable on this device/browser. Your drawings, 2D plan, BOQ, and exports still work. Try a different browser, disable heavy extensions, or reload." + optional Retry button. No text-stone-500. |
| `src/lib/webgl.ts` | `isWebGLAvailable()` helper: creates a canvas and checks for `webgl2` or `webgl` context. Returns false if no WebGL (server-side rendering, old browsers, disabled). |

## Files Modified

| File | Change |
|------|--------|
| `src/components/bim/LazyBimModel3D.tsx` | Added `ErrorBoundary` wrapping the lazy-loaded 3D inner component. Added early `!isWebGLAvailable()` check to render `Bim3DUnavailable` without loading THREE at all. Uses `key={retryKey}` for retry re-mount. |
| `src/components/bim/BimModel3D.tsx` | Added `handleCreated` callback on Canvas that attaches `webglcontextlost` (preventDefault → allows recovery) and `webglcontextrestored` listeners. Added `contextLost` state → renders `Bim3DUnavailable` when context lost. Updated Canvas `gl` props: `powerPreference: 'high-performance'`, `failIfMajorPerformanceCaveat: false`, `frameloop="demand"` to reduce GPU load. |
| `src/__tests__/errorBoundary.test.tsx` | **NEW** — 12 tests: ErrorBoundary renders children/fallback/retry, Bim3DUnavailable text/role/button, isWebGLAvailable mock/null/document. |
| `CHANGELOG.md` | Sprint 66 entry under `[Unreleased]` |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, **9 warnings** (unchanged baseline) |
| `npm test` | **42 files, 703 passed** (+12 new tests) |
| `npm run build` | Success, **PWA 30 entries** |
| `grep text-stone-500 src --include="*.tsx"` | No matches |

## How to verify

1. **Error on 3D render**: Wrap any throwing child in `<ErrorBoundary fallback={(retry) => <Bim3DUnavailable onRetry={retry} />}>`. The page stays intact and shows the friendly "3D view unavailable" panel with a Retry button.
2. **WebGL unavailable**: If `canvas.getContext('webgl2')` and `canvas.getContext('webgl')` both return null, `LazyBimModel3D` renders `Bim3DUnavailable` without attempting to load THREE.js at all.
3. **Context loss**: The Canvas `onCreated` handler attaches `webglcontextlost` (calls `preventDefault()` to allow recovery) and toggles `contextLost` state → renders fallback. On `webglcontextrestored`, recovers automatically.
