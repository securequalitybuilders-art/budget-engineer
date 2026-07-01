# Sprint 15 — Mobile Dashboard Layout Polish

**Date:** 2026-07-01  
**Last updated:** 2026-07-01 (post-fix)  
**Goal:** Improve mobile and small-screen usability of the Dashboard and guided builder journey. No new features.

---

## Files Inspected

| File | Purpose |
|------|---------|
| `src/pages/Dashboard.tsx` | Main dashboard layout, right sidebar, canvas empty state, design option buttons |
| `src/components/layout/BentoShell.tsx` | Root layout container |
| `src/components/layout/Sidebar.tsx` | Already has `hidden md:flex` — no change needed |
| `src/components/dashboard/BuilderJourneyGuide.tsx` | Collapsible guide panel |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | Tab list with 6 tabs |
| `src/components/dashboard/EngineeringAnalysisPanel.tsx` | Analysis cards |
| `src/components/dashboard/BoqExportPanel.tsx` | BOQ table + totals |
| `src/pages/Home.tsx` | Hero buttons, journey cards |
| `src/pages/ProjectWizard.tsx` | Already responsive with `sm:grid-cols-2` |
| `tailwind.config.js` | Standard breakpoints (sm: 640, md: 768, lg: 1024) |

---

## Responsive Changes Made

### 1. BentoShell — Prevent horizontal overflow

**File:** `src/components/layout/BentoShell.tsx`  
**Change:** Added `min-w-0` to the root flex container.  
**Target:** All screen sizes — ensures flex children can shrink below their natural width.

### 2. Dashboard Right Sidebar — Horizontal scroll on mobile

**File:** `src/pages/Dashboard.tsx` (line 268)  
**Change:** `overflow-x-auto lg:overflow-x-visible`  
**Target:** < 1024px — panels are scrollable horizontally; ≥ 1024px — behaves as before.  
**Why:** 6 panels (BuilderJourneyGuide, Properties, Transactions, Engineering Studio, BOQ, Analysis) total > 1500px — would overflow on any screen under 1500px.

### 3. Dashboard Canvas Empty State — Mobile note

**File:** `src/pages/Dashboard.tsx` (added after empty-state buttons)  
**Change:** Added `"Mobile: review, estimates, exports supported. For best CAD editing, use a tablet or desktop."`  
**Target:** All mobile users who haven't generated designs yet.

### 4. Design Option Buttons — Truncate long names

**File:** `src/pages/Dashboard.tsx` (line 208)  
**Change:** Added `max-w-[160px] truncate` and `title={option.name}`  
**Target:** Prevents design names like "Compact 3-Bedroom Family Home" from breaking layout on small screens.

### 5. BuilderJourneyGuide — Collapsed by default (REVERTED)

**File:** `src/components/dashboard/BuilderJourneyGuide.tsx`  
**Change:** `useState(false)` (was `true`) — **reverted to `useState(true)`**  
**Target:** Saves vertical space; users tap the cyan "Builder Guide" header to open it.  
**Reason for revert:** First-time users do not see the guide without tapping. Keeping it expanded by default is safer UX.

### 6. BuilderJourneyGuide — Responsive minimum width

**File:** `src/components/dashboard/BuilderJourneyGuide.tsx`  
**Change:** Added `min-w-[200px]` to the outer div.  
**Target:** Prevents the panel from shrinking too much when content is present.

### 7. BOQ Table — Horizontal scroll

**File:** `src/components/dashboard/BoqExportPanel.tsx` (line 146)  
**Change:** `overflow-auto` → `overflow-x-auto` + added `min-w-[400px]` to the `<table>`.  
**Target:** The table (4 columns: Item, Qty, Rate, Total) scrolls horizontally on narrow panels instead of squishing.

### 8. Engineering Studio Tabs — Horizontal scroll (REVERTED)

**File:** `src/components/dashboard/EngineeringStudioPanel.tsx` (line 100)  
**Change:** `flex-wrap` → `overflow-x-auto` — **reverted back to `flex-wrap`**  
**Target:** The 6 tab buttons (AI Brief, Rates, Rebar, Footings, Loads, Section) scroll left/right instead of wrapping unevenly.  
**Reason for revert:** Wrapping to multiple rows is more discoverable than a hidden horizontal scroll. Users may not notice tabs off-screen without a visible scroll indicator.

### 9. Home Hero Buttons — Wrapping

**File:** `src/pages/Home.tsx` (line 49)  
**Change:** `flex` → `flex flex-wrap`  
**Target:** "Start New Project" and "Import DXF/IFC" buttons wrap to a new line on narrow screens instead of overflowing.

---

## Manual Smoke Checklist Results

| Check | Result |
|-------|--------|
| Home at mobile width (390px) | ✅ Hero buttons wrap; journey cards stack; badge row wraps |
| ProjectWizard at mobile width | ✅ Cards stack via existing `grid gap-3` |
| Dashboard at mobile width | ✅ Canvas area flexible; right sidebar scrolls horizontally |
| BuilderJourneyGuide collapses | ✅ Default expanded `useState(true)` (reverted from collapsed) |
| EngineeringStudioPanel tabs | ✅ Wrap to multiple rows via `flex-wrap` (reverted from `overflow-x-auto`) |
| EngineeringAnalysisPanel | ✅ Cards are compact, recommendations wrap |
| BOQ table scrolls | ✅ `overflow-x-auto` + `min-w-[400px]` table |
| 2D/3D toggle visible | ✅ Visible in toolbar (fits within 390px) |
| No critical horizontal page scroll | ✅ Main content area bounded by `min-w-0` |

---

## Test Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm test` | ✅ PASS (73 tests, 8 files) |
| `npm run build` | ✅ PASS (3371 modules, 16 precache) |

No new tests added — all changes are CSS/JSX class-only modifications with no new logic.

### Post-Fix Re-test (2026-07-01)

After reverting Engineering Studio tabs to `flex-wrap` and BuilderJourneyGuide to `useState(true)`:

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm test` | ✅ PASS (73 tests, 8 files) |
| `npm run build` | ✅ PASS (3371 modules, 16 precache) |

---

---

## Issues Found & Fixed

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | Engineering Studio tabs changed from wrapping to scrolling — tabs off-screen without visible indicator | `flex-wrap` → `overflow-x-auto` removed wrapping behavior | Reverted to `flex-wrap`. Tabs wrap to multiple rows on narrow screens. |
| 2 | BuilderJourneyGuide hidden on first load — new users may not discover the guide | `useState(false)` collapsed by default | Reverted to `useState(true)`. Guide is expanded by default. |

**Affected files:** `src/components/dashboard/EngineeringStudioPanel.tsx`, `src/components/dashboard/BuilderJourneyGuide.tsx`

---

## Remaining Mobile Limitations

| Limitation | Details |
|------------|---------|
| **Right sidebar still flex-row** | Panels scroll horizontally on mobile rather than stacking vertically. A vertical stack would be more usable but requires significant layout restructuring. |
| **Dashboard toolbar is absolute** | The glass toolbar overlays the canvas. On very short mobile screens, it may overlap content. |
| **PlanCanvas on mobile** | CAD drawing interaction (pan, zoom, draw walls) is inherently desktop-oriented. The mobile note addresses this. |
| **BimViewer on mobile** | Three.js 3D viewer has small controls on mobile. Works for viewing but not detailed inspection. |
| **No hamburger menu for sidebar** | Left sidebar is hidden on mobile (`hidden md:flex`). A hamburger toggle would improve navigation. |
| **No touch-friendly design options** | Design option buttons are small tap targets on mobile. 32px height meets minimum accessibility guidelines. |
| **BuilderJourneyGuide state not persisted** | Collapsed/expanded state resets on page reload. |
