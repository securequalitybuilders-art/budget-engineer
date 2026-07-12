## v1.3.0-rc.2 — BOQ Full Trade Breakdown + Version Fix

This release candidate fixes two critical issues identified during the rc.1 promotion review.

---

## What changed from rc.1

### 1. Version synchronization (BLOCKING fix)
`package.json` was stuck at `1.2.0` while README and CHANGELOG already referenced `1.3.0-rc.1`.
All version references are now correctly aligned at `1.3.0-rc.2`.

### 2. Full 11-section trade BOQ in Cost & Deliver (USER-REPORTED)
The BOQ tab in the Cost & Deliver stage was showing only the shell summary (7 categories: Slabs, Walls, Roof, Openings, Finishes, MEP). The user correctly reported that many sections appeared "not included."

**Fix:** The Cost & Deliver BOQ tab now bridges the detailed trade-level BOQ engine (`generateDetailedBoq`) into the `BoqExportPanel`, showing all 12 sections:

| # | Trade Section |
|---|---|
| 1 | Preliminaries |
| 2 | Substructure |
| 3 | Superstructure |
| 4 | Roofing |
| 5 | Openings / Joinery |
| 6 | Finishes |
| 7 | Plumbing |
| 8 | Electrical |
| 9 | Mechanical / HVAC |
| 10 | External Works |
| 11 | Provisional Sums |
| 12 | Contingency / Professional Fees / VAT (summary footer) |

Falls back to the shell BOQ if the detailed computation is unavailable.

### 3. BoqExportPanel category ordering
`TRADE_ORDER` now includes both detailed and shell category names so items render in proper trade order regardless of which BOQ engine produces them.

---

## What's unchanged from rc.1

All enterprise platform features from rc.1 are preserved:
- Project export/import (.beproj)
- Diagnostics panel (Ctrl+Shift+D)
- Local RBAC (Owner/Reviewer/Viewer)
- i18n scaffold (English baseline + locale switcher)
- Plugin SDK scaffold
- Docker/nginx deployment baseline
- Security baseline (CSP, sanitization)
- CI pipeline (typecheck → lint → test → build → audit)

---

## Quality snapshot

- **Tests:** 1,503
- **Test files:** 88
- **TypeScript:** strict mode, 0 errors
- **Build:** tsc + vite, green
- **Lint:** max 25 warnings policy

---

## Files changed

| File | Change |
|---|---|
| `package.json` | `1.2.0` → `1.3.0-rc.2` |
| `README.md` | Version refs → rc.2 |
| `CHANGELOG.md` | Added rc.2 entry |
| `src/components/dashboard/stages/CostDeliverStage.tsx` | Bridge detailed BOQ → BoqExportPanel |
| `src/components/dashboard/BoqExportPanel.tsx` | Extended TRADE_ORDER for both engines |
| `src/lib/boq/detailedBoq.ts` | Accept optional overridden quantities |

---

## Live app

**https://budget-engineer.vercel.app/**

---

**Budget Engineer — Making Construction Affordable for Everyone.**
