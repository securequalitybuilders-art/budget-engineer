# Release Notes — v1.2.0 Detailed BOQ, Schedules & Planning

> **Release date:** 2026-07-11  
> **Codename:** Detailed BOQ, Schedules & Planning  
> **Previous version:** v1.0.1  
> **Tests:** 1,234 across 74 test files  
> **Typecheck:** ✅ Clean  
> **Build:** ✅ Green  
> **Lint:** ✅ 0 errors, 8 non-blocking warnings

---

## Overview

**Budget Engineer v1.2.0** expands the platform from a premium architectural studio into a stronger **preconstruction planning and estimating system**.

This release focuses on the practical outputs needed after concept design is established:

- richer **trade-detailed BOQ generation**
- structured **schedules of materials and components**
- task-based **programme / Gantt outputs**
- **cashflow breakdown over time**

The result is a better bridge between:
- design intent
- early-stage quantity surveying
- material coordination
- contractor pricing discussions
- construction sequencing and spending visibility

---

## Executive Verdict

This release delivers a **trade-detailed early-stage BOQ with schedules and planning outputs**.

The new detailed BOQ engine is real and structured — the expanded trade items are not renderer-only placeholders — but the platform still intentionally presents itself as an **early-stage professional planning tool**, not a final procurement-issue or contractor-certified system.

### What this means in practice
- Detailed trade items are now present in the engine
- Material schedules and programme outputs are available
- Cashflow is generated from structured planning data
- All BOQ UI views now draw from the same canonical detailed engine (P11.2 unification complete)
- However:
  - schedule formulas are still partly simplified relative to the most detailed BOQ path
  - critical path logic is currently sequential/stubbed rather than full CPM
  - some external works remain allowance-oriented

---

## What's New

### 1. Detailed BOQ generation

The BOQ layer is now significantly richer and more structured than earlier releases.

#### Expanded trade detail now covers
- preliminaries
- substructure
- superstructure / walling
- roofing
- openings / joinery
- finishes
- plumbing / drainage
- electrical
- mechanical / HVAC
- provisional / utility allowances
- fees / contingency / tax treatment

#### Examples of newly detailed content
- lintels, wall ties, masonry accessories
- rainwater goods (gutters, downpipes, fittings)
- wall tiles, skirting, architraves, cornices, window sills
- kitchen counters and cupboards
- plumbing fittings, traps, gulleys, valves, geyser accessories
- electrical conduit, boxes, breakers, isolators, earthing, CoC-related items
- utility connection PC allowances
- expanded preliminaries and fit-off labour logic

#### Estimate depth support
The platform now more clearly distinguishes between:
- **Shell**
- **Shell + Allowances**
- **Trade-Detailed**

This helps users understand whether they are looking at:
- a structural shell estimate
- an estimate with parametric finishes/services allowances
- or the most detailed engine output currently available

---

### 2. Schedules added

Budget Engineer now generates schedule-oriented outputs to complement the BOQ.

#### Schedule outputs now include structured coverage for:
- materials / takeoff schedule
- doors
- windows
- room finishes
- sanitary items
- electrical points
- HVAC/mechanical
- roof-related items

#### Why this matters
This improves the platform's usefulness for:
- supplier quote preparation
- trade coordination
- internal design/QS review
- early procurement planning

Schedules are now generated from structured data rather than being purely decorative report sections.

---

### 3. Programme / Gantt generation

A planning layer is now included in the system.

#### Programme outputs include
- structured task objects
- task sequencing
- trade-based breakdown
- duration scaling by area
- dependency chains
- critical-task marking
- CSV/export support

#### Intended use
This programme layer is designed for:
- early project planning
- sequencing review
- client/team communication
- cost-over-time forecasting

It is **not yet a full contractor-grade CPM engine**, but it is a meaningful step toward preconstruction planning.

---

### 4. Cashflow outputs

The planning engine now supports time-based cost reporting.

#### Cashflow outputs include
- weekly grouping
- monthly grouping
- cumulative cost curve
- peak-period identification
- task cost spreading over time
- exportable data outputs
- calendar date labels on all periods

This makes Budget Engineer more useful for:
- staged funding discussions
- owner-builder planning
- early contractor affordability checks
- S-curve style reporting

---

### 5. BOQ Engine Unification (P11.2)

The three previously separate BOQ engines are now unified under a single canonical source of truth (`detailedBoq.ts`). The `buildBoqFromDesignOption` adapter in `designToBoq.ts` delegates directly to the detailed engine, ensuring that `BoqExportPanel`, CSV exports, HTML dossiers, and the formal BOQ download all produce consistent trade-detailed outputs without code duplication.

- All 104+ trade items are now surfaced in the standard export UI
- Provenance tracking moved from item-description text to structured `sourceMetadata`
- CAD quantity overrides flow through correctly via the unified path
- Backward compatible — legacy Engine A persisted data unchanged

### 6. Calendar-date-aware programme & cashflow

All day-offset values in the programme and cashflow engines are now translated to real calendar dates using a configurable project start date (defaults to today).

Affects:
- Gantt chart week markers — show actual dates (e.g. "14 Jul") instead of "W1"
- Task tooltips — show date ranges
- Cashflow bar tooltips — show "14 Jul–20 Jul" instead of "Week 3"
- CSV exports — use "Start Date" / "Finish Date" / "End Date" columns
- Schedules panel — shows "Generated: 11 Jul 2026"

---

## Quality Snapshot

| Metric | Value |
|---|---|
| Version | v1.2.0 |
| Tests | 1,234 |
| Test files | 74 |
| TypeScript | 0 errors |
| Build | Green |
| Lint | 0 errors, 8 non-blocking warnings |
| PWA | Enabled |
| Primary deployment | Vercel |

---

## New Test Coverage

Four new test files were added for this release:

| File | Coverage |
|---|---|
| `src/__tests__/detailedBoq.test.ts` | depth levels, categories, regions, roof types, CSV, NaN checks |
| `src/__tests__/schedules.test.ts` | CSV format, section headers, empty section omission, escaping |
| `src/__tests__/gantt.test.ts` | trade sequences, ordering, scaling, cost splits, critical path, CSV, dayToDate helper |
| `src/__tests__/cashflow.test.ts` | weekly/monthly grouping, cumulative monotonicity, peak detection, cost spread, edge cases, CSV, startDate on periods |

---

## Architecture / Source-of-Truth Findings

The detailed BOQ engine is genuine and structured.

### Confirmed
- the expanded detailed items exist as real engine-level line-item generation
- they are not report-only phantom rows
- material schedule is data-driven
- programme and cashflow are generated from structured task data

### Engine unification (P11.2) — Complete
The three previously separate BOQ engines have been unified:

- **Engine A** — legacy BOQ/store/UI path (`src/ai/boqEngine.ts` + `BOQPanel.tsx`), kept for Dexie-persisted data compatibility
- **Engine B** — mid-level aggregate BOQ/export adapter (`designToBoq.ts`) now **delegates to Engine C** for all item generation
- **Engine C** — detailed trade-rich BOQ engine (`detailedBoq.ts`) is now the **canonical source of truth** for `BoqExportPanel`, CSV/HTML exports, formal BOQ download, schedules, and planning outputs

All 1,234 tests pass. Typecheck and build clean. No new packages. Offline-first preserved.

---

## Section-Level Completeness Summary

| Section | Status |
|---|---|
| Preliminaries | Complete |
| Substructure | Partial |
| Superstructure / Walling | Partial |
| Roofing | Partial |
| Openings / Joinery | Partial |
| Finishes | Complete |
| Plumbing / Drainage | Complete (with caution) |
| Electrical | Complete |
| Mechanical / HVAC | Complete for residential scope |
| External Works | Weak |
| Provisional / Utility Allowances | Partial |
| Fees / Taxes | Complete |
| Material Schedule | Structured, but partially simplified |
| Gantt / Programme | Structured, but critical path still simplified |
| Cashflow | Structured and reconciled |

---

## Known Limitations

This release is a major improvement, but some limitations remain and should be stated clearly.

### BOQ / estimation limitations
- external works remain relatively weak and allowance-oriented unless scope is expanded
- some substructure and roof accessory items still need more complete coverage

### Schedule limitations
- schedules are structured and data-driven, but some schedule formulas still diverge from the most detailed BOQ derivation path
- schedules should still be treated as **indicative** and reviewed before procurement

### Planning / Gantt limitations
- critical path logic is currently simplified
- all tasks may still behave like critical tasks in the current implementation
- float/slack is not yet computed via a full CPM forward/backward pass

### Professional-use limitations
- outputs remain **trade-detailed early-stage planning tools**
- they do not replace licensed QS, architectural, structural, MEP, or contractor review
- utility connection figures and some PC items remain client/site-dependent and must be confirmed locally

---

## Recommended Use Positioning

The most accurate positioning for this release is:

> **Trade-detailed early-stage BOQ with schedules and planning outputs**

This is more accurate than:
- "comprehensive procurement BOQ"
- "contractor-issued programme"
- "final tender package"

because the platform still contains some intentionally simplified planning and schedule assumptions.

---

## Upgrade Guidance

This release is recommended for users who want Budget Engineer to support not only:
- design
- drawings
- shell-level costing

but also:
- richer trade BOQs
- materials schedules
- programme generation
- cashflow reporting

If your workflow includes:
- owner-builder planning
- early contractor pricing
- QS review preparation
- preconstruction packaging

then v1.2.0 is a meaningful upgrade.

---

---

## Final Summary

**v1.2.0** is the release that makes Budget Engineer substantially more useful as a **cost, schedule, and planning companion**.

It adds meaningful trade detail and structured outputs without abandoning the platform's core principles:

- local-first
- offline-first
- zero paid APIs
- privacy by architecture

It is a strong step forward — provided its early-stage, professional-assistive nature remains clearly communicated.

---

> **Budget Engineer — Making Construction Affordable for Everyone.**
