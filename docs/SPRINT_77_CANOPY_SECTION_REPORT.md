# Sprint 77 — Canopy in Section Drawing + Refined Framing

**Status:** Complete  
**Branch:** main (a9eaca5 → <newhash>)  
**Verification:** typecheck 0, lint 9 warnings, 847 tests, build+PWA 30, no text-stone-500

---

## Part 1 — Canopy in Section A-A

The Section A-A drawing now reflects the parametric canopy when Canopy is selected in the DrawingsPanel:

- **Roof type toggle** added to DrawingsPanel (Gable / Canopy buttons above the section SVG)
- **Rise + Span sliders** shown inline when Canopy is selected
- **Canopy profile curve** drawn as medium-weight polyline (32 samples via `canopySectionProfile`)
- **ETFE panel fill** (8% opacity dark ink under the curve)
- **Rib tick marks** every 4th point along the profile
- **Support columns** as dashed vertical lines from canopy corners down to half-building height
- **"CANOPY ROOF (parametric)" label** above the curve
- **Fallback:** wrapped in try/catch; renders gable on any error
- **Gable mode:** entirely unchanged

**New helper in `canopyGeometry.ts`:**  
`canopySectionProfile(params, cutAxis)` — returns `{ points, leftX, rightX, maxY }` for a sampled profile curve along X or Z axis at the section cut.

**Data flow:**  
`DrawingsPanel` (local roofType state + canopyParams) → `SectionView` (new props) → `renderSectionSheet` (new params) → SVG canvas

---

## Part 2 — Refined 3D Framing (dragonfly-wing reference)

The 3D canopy framing now reads more like a structural wing/roof frame:

- **Spine ribs** (primary): four curved ribs along the X and Z axes, sampled at 8 segments each, rendered as thick teal box mesh (`SPINE_MAT`, `#0d9488`, `0.03m` cross-section)
- **Voronoi edge ribs** (secondary): existing line segments, now teal (`#14b8a6`)
- **ETFE panels**: updated from violet to cyan (`#06B6D4`), opacity 0.2 (more visible)
- **Geometry disposal**: spine ribs included in `disposeGeometry` cleanup

**New helper in `canopyGeometry.ts`:**  
`computeSpineRibs(params)` — returns `SpineRib[]` (8 directional segments forming 4 curved spine arches along X and Z axes)

Render order: panels → spine ribs → columns → perimeter beam → Voronoi ribs

---

## Files Changed

| File | Changes |
|---|---|
| `src/engine/canopy/canopyGeometry.ts` | +`canopySectionProfile()`, +`computeSpineRibs()`, +`CanopySectionProfile`, +`SpineRib` types |
| `src/components/drawings/sectionModel.tsx` | `renderSectionSheet` accepts `roofType`+`canopyParams`; canopy rendering block (profile, fill, ribs, columns, label); gable fallback |
| `src/components/drawings/SectionView.tsx` | New props: `roofType`, `canopyParams`; threaded to `renderSectionSheet` |
| `src/components/drawings/DrawingsPanel.tsx` | `sectionRoofType` state, `sectionCanopyParams` state, toggle buttons, Rise/Span sliders |
| `src/components/bim/CanopyMesh.tsx` | Spine ribs geometry + rendering; panel material cyan/teal; `SPINE_MAT`; spineGeo disposal |
| `src/__tests__/canopyGeometry.test.ts` | 8 new tests: `canopySectionProfile` (4) + `computeSpineRibs` (4) |
| `CHANGELOG.md` | Sprint 77 + 76B entries in [Unreleased] |
| `docs/SPRINT_77_CANOPY_SECTION_REPORT.md` | This file |

---

## Verification

```
typecheck: 0 errors
lint:      0 errors, 9 warnings (unchanged)
test:      47 files, 847 passed
build:     success, PWA 30 entries
grep:      no text-stone-500 in src/**/*.tsx
```
