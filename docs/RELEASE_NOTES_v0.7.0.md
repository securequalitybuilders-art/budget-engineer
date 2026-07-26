# v0.7.0 — Parametric Biomimetic Canopy

> **Release date:** 2026-07-07  
> **Phase:** Canopy Phase (complete)

## Headline

**A parametric biomimetic canopy roof — Voronoi-cell surface, structural spine ribs, ETFE panels, and Section drawing integration.** Three sprints (76, 76B, 77) delivered a fully interactive opt-in roof type alongside the existing gable, visible in both 3D and the Section A-A drawing sheet.

## What's New

### 1. Parametric Canopy Roof (3D)
- **Opt-in roof type** — toggle Gable / Canopy in the 3D panel
- **Live sliders:** Span X, Span Z, Rise, Cell Density (capped at 60), Reseed
- **Curved Voronoi surface** — Bowyer–Watson Delaunay triangulation + Sutherland–Hodgman clip, projected onto a parabolic curved surface
- **ETFE-like panels** — translucent cyan cell surfaces with visible edge lattice
- **Structural framing:** spine ribs (thick teal box segments along X/Z axes), perimeter beam, support columns, violet secondary rib network
- **Density cap & geometry disposal** — WebGL context loss prevented via `BufferGeometry.dispose()` cleanup and 120ms debounce on slider input

### 2. Canopy in Section A-A Drawing
- **Section profile** — curved canopy section drawn with `canopySectionProfile()`: arc segments, rib tick marks, column lines
- **ETFE panel fill** — translucent cyan fill in the section cut
- **Gable fallback** — section automatically falls back to gable profile if roof type is gable or canopy params are missing
- **DrawingsPanel controls** — local Gable/Canopy toggle + Rise/Span sliders for the section view

### 3. Structural Spine Ribs
- **Primary ribs** — thick box segments along X and Z symmetry axes, teal material (`SPINE_MAT`)
- **Secondary ribs** — Voronoi edge lattice rendered as line segments
- Combined dragonfly-wing aesthetic

## Quality & Stability

- **847 tests** across 47 files — all passing (30 new in canopy phase)
- **0 TypeScript errors**, **0 ESLint errors** (exactly 9 warnings, baseline)
- **Production build** green with PWA (30 precached entries)
- Pure deterministic geometry engine — no random seed, reproducible Voronoi cells

## Known Limitations

- **Canopy is desktop-focused.** The WebGL canvas requires a GPU; integrated graphics on older devices may struggle at high cell densities (≥40).
- **No interior-wall collision** for the walkthrough in canopy mode (footprint clamp only — same as v0.6.0).
- **Single canopy per building.** The system does not yet support multiple canopy segments or hybrid gable+canopy roofs.

## Technical

- Pure deterministic Voronoi geometry engine in `canopyGeometry.ts` (Bowyer–Watson Delaunay, Sutherland–Hodgman clip, parabolic surface projection)
- React Three Fiber `CanopyMesh.tsx` renders the cell surface, edge network, spine ribs, perimeter, and supports
- Section A-A integration via `canopySectionProfile()` and `computeSpineRibs()` — shared pure-logic functions tested independently
- Geometry disposal via `useEffect` + `useRef` pattern; 120ms debounce via `setTimeout` in `LazyBimModel3D`

## Files

```
M src/engine/canopy/canopyGeometry.ts
M src/components/bim/CanopyMesh.tsx
M src/components/bim/BimModel3D.tsx
M src/components/bim/LazyBimModel3D.tsx
M src/components/drawings/sectionModel.tsx
M src/components/drawings/SectionView.tsx
M src/components/drawings/DrawingsPanel.tsx
M src/__tests__/canopyGeometry.test.ts
```

## Previous Release

[v0.6.0 — Interior Inspection: Walk Through Your Design](RELEASE_NOTES_v0.6.0.md)
