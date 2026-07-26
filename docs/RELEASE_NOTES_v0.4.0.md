# v0.4.0 — Professional Drawings Phase

> **Release date:** 2026-07-06  
> **Previous release:** [v0.3.2](https://github.com/securequalitybuilders-art/budget-engineer/releases/tag/v0.3.2)  
> **Repository:** [github.com/securequalitybuilders-art/budget-engineer](https://github.com/securequalitybuilders-art/budget-engineer)

## Highlights

**11 construction-standard drawing types + A1 presentation sheet + PDF/PNG export.** Every drawing is generated client-side from the same PlanModel geometry — deterministic, offline, free.

### Complete Drawing List

| # | Drawing | Tab Label | Discipline Colour |
|---|---------|-----------|-------------------|
| 1 | Floor Plan (interactive 2D CAD) | Plan | — |
| 2 | Front Elevation | Front Elevation | Black |
| 3 | Side Elevation | Side Elevation | Black |
| 4 | Section A‑A | Section A‑A | Black + material fills |
| 5 | Site Plan | Site Plan | Black |
| 6 | Foundation Plan | Foundation | Black |
| 7 | Roof Plan | Roof Plan | Black |
| 8 | Reflected Ceiling Plan | Ceiling (RCP) | Yellow (#e6b800) |
| 9 | Electrical Layout | Electrical | Yellow (#e6b800) |
| 10 | Plumbing & Drainage | Plumbing | Blue (#2f6fd1) |
| 11 | HVAC/Mechanical | HVAC | Green (#2fae66) |

Each drawing includes:
- Wall outlines in correct coordinate space (same y-flip as 2D/3D)
- Annotations: dimension strings, grid bubbles, level markers
- North arrow, scale bar
- Discipline-colour legend box
- Professional title block + sheet border
- Schematic disclaimer: "Verify with a registered engineer/professional"

### A1 Presentation Sheet

Composes all 9 drawing cells onto a single A1 landscape sheet:
- Row 1: Front Elevation | Side Elevation | Section A‑A
- Row 2: Floor Plan | Site Plan | Foundation Plan
- Row 3: Roof Plan | RCP | Electrical / Plumbing / HVAC
- Master title block: project name, scale, date, sheet A1, disclaimer, DzeNhare OS credit
- Export toolbar: **Export PNG** (canvas at 2×) and **Export PDF** (jsPDF A1 landscape)

### MEP Placement

Pure heuristics for automatic symbol placement:
- **Electrical:** Ceiling lights per room centre, sockets per 3m of wall perimeter, switch near entry, distribution board near main entry
- **Plumbing:** WC/basin/shower/sink/drain/stack per wet room (detected by name), indicative stack when no wet rooms
- **HVAC:** Supply diffuser + return grille per room, central fan coil unit, duct runs to each room
- All safe on empty rooms, no-wet-rooms, or null plans

## Quality

| Metric | Value |
|--------|-------|
| Tests | **681 passed** (41 files) |
| TypeScript | **0 errors** (`npm run typecheck`) |
| ESLint | **0 errors, 9 warnings** (baseline) |
| Build | Success, PWA 30 precached entries |
| Accessibility | No `text-stone-500`, WCAG AA contrast |
| Offline | 100% client-side, IndexedDB, no backend |
| Dependencies | All MIT/Apache 2.0, no paid APIs |

## New Files (Sprints 56–63)

25 new files across drawings, export, and tests — see [CHANGELOG.md](../CHANGELOG.md) for full details.

## Disclaimer

All drawings are schematic and indicative. They must be verified with registered professionals (architect, structural engineer, electrical engineer, plumbing engineer, mechanical engineer) before use in construction. The tool aids early-stage design and cost estimation only — it does not replace qualified professional review.
