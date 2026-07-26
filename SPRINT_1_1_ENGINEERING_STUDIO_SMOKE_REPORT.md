# Sprint 1.1 — Engineering Studio Smoke Report

> **Date:** 2026-06-30  
> **Previous HEAD:** `0724685` ("Wire staged engineering panels into dashboard")  
> **Git identity:** Fixed for future commits — `Secure Quality Builders` / `securequalitybuilders.art@gmail.com`

---

## Panels Checked

| Panel | Tab | Guards | Status |
|-------|-----|--------|--------|
| AiBriefPanel | AI Brief | WebLLM button disabled with `title` tooltip; local-rules active by default | ✅ Safe |
| RateCardPanel | Rates | Defaults to `RATE_CARDS.zimbabwe`; self-contained local state | ✅ Safe |
| RebarSpecPanel | Rebar | `slabArea` defaults to 0; `spec` defaults to `DEFAULT_REBAR_SPEC` | ✅ Safe |
| FootingSizingPanel | Footings | Empty state when no design selected; sample BimModel with slab element | ✅ Safe |
| LoadAnalysisPanel | Loads | Empty state when no design selected; sample BimModel with slab element | ✅ Safe |
| SectionView | Section | Empty state when no design selected; sample CadDocument with 2 walls | ✅ Safe |

---

## WebLLM Status

- **Button:** Disabled (`cursor-not-allowed`, strikethrough label "WebLLM — not installed")
- **Tooltip:** "npm install @mlc-ai/web-llm"
- **Label:** `✅ Local rules active by default — instant, offline, no dependencies` permanently visible
- **Import chain:** `@mlc-ai/web-llm` externalized in `vite.config.ts` → Rollup does not resolve it at build time
- **Runtime safety:** If WebLLM were enabled and installed, the `parseWithEngine` catch block falls back to local-rules

---

## Manual Smoke Checklist (code review)

| # | Check | Status |
|---|-------|--------|
| 1 | Home page loads | ✅ No changes to `Home.tsx` |
| 2 | Project wizard loads | ✅ No changes to `ProjectWizard.tsx` |
| 3 | Dashboard loads | ✅ Component renders; early return `isLoading/!currentProject` guard unchanged |
| 4 | Generate design options button exists | ✅ Preserved |
| 5 | PlanCanvas renders when designs exist | ✅ Preserved |
| 6 | Engineering Studio in right panel | ✅ Renders as tabbed sidebar next to PropertiesPanel/TransactionPanel |
| 7 | AI Brief tab no crash | ✅ Self-contained; local-rules by default |
| 8 | Rates tab no crash | ✅ Defaults to Zimbabwe |
| 9 | Rebar tab no crash | ✅ Defaults to `DEFAULT_REBAR_SPEC` with `slabArea=0` |
| 10 | Footings tab no crash | ✅ Empty state when no design; sample BimModel when design exists |
| 11 | Loads tab no crash | ✅ Empty state when no design; sample BimModel when design exists |
| 12 | Section tab no crash | ✅ Empty state when no design; sample CadDocument with 2 walls |
| 13 | BOQ panel exists | ✅ Preserved |
| 14 | Transaction panel exists | ✅ Preserved |
| 15 | WebLLM missing-package crash | ✅ Button disabled; externalized in vite config |

---

## Small Fixes Applied

| File | Fix |
|------|-----|
| `src/components/ai/AiBriefPanel.tsx` | WebLLM button disabled, strikethrough label, tooltip; permanent "Local rules active by default" message |
| `src/components/dashboard/EngineeringStudioPanel.tsx` | Guard `safeSqrt()` for non-positive areas; empty state messages for Footings/Loads/Section tabs; `buildSampleCad`/`buildSampleBim` return null when area ≤ 0 |

---

## Remaining Risks

- **WS6 `@mlc-ai/web-llm`** — not installed; disabled button prevents user confusion
- **FootingSizingPanel/LoadAnalysisPanel** — use sample BimModel with 1 slab element; not linked to live BIM data
- **SectionView** — uses sample CadDocument with 2 walls; not linked to live PlanCanvas data
- All risks are **non-blocking** and clearly scoped for future sprints

---

## Next Recommended Sprint

Wire the lazy-loaded 3D BIM viewer into the Dashboard, or begin wiring WS5 structural algorithms to live store data.
