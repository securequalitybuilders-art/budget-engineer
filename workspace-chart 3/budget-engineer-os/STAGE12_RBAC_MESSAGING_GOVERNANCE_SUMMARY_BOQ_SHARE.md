# Stage 12 — RBAC Messaging, Richer Governance Summaries & BOQ % Composition Analytics

Local-first, free/open-source only. No paid APIs. Dark-first Dzenhare brand preserved.

## Delivered in this stage

### 1. Explicit unauthorized / disabled-action messaging
- `src/lib/rbac.ts` extended with:
  - `GovernanceAction` type (`review | approve | reject | comment`)
  - `isAuthorized(user, action)`
  - `unauthorizedReason(user, action)` → human-readable reason or `undefined`
  - `roleLabel(role)`
- `RbacPanel.tsx` rebuilt into a **permission matrix**: each governance action shows an
  `Allowed`/`Blocked` badge and, when blocked, an amber explanation of the required role.
- `GovernanceActionsPanel.tsx` now renders a `🔒 Restricted` badge and an inline
  amber reason box next to any action the current role cannot perform — actions are
  explained, never silently disabled. Inputs/buttons also carry `title` tooltips.

### 2. Persisted current-user selection across reloads
- New `src/lib/session.ts` (`loadPersistedUserId` / `persistUserId`) backed by `localStorage`.
- `appStore.switchUser` now persists the selected identity.
- `appStore.initialize` restores the persisted identity on boot.
- Fully local — no auth backend, no network.

### 3. Richer governance summary cards
- New `GovernanceSummaryPanel.tsx`:
  - status pill (Draft / In Review / Approved / Rejected) with color + description
  - four metadata cards: Version+Owner, Reviewed-by/at, Approved-by/at, Rejected-by/at
  - dedicated rejection-reason callout
  - "latest decision" summary pulled from governance comment history
  - footer stat row: Reviewers / Comments / Decisions / Updated
- Mounted in `BimRoute.tsx` above the existing `GovernancePanel`.

### 4. BOQ percentage-share (cost composition) analytics
- New `src/lib/boqShare.ts` → `compareBoqShares(left, right)`:
  - normalises each category to a % of its project's grand total
  - computes `shareDelta` (percentage-point shift, right vs left)
  - sorts by largest composition shift first
- New `BoqShareComparePanel.tsx`: dual L/R share bars per category + signed
  percentage-point shift badges. Scale-independent — comparable even when the two
  projects differ greatly in absolute cost.
- Mounted after the existing BOQ delta chart in `BimRoute.tsx`.

## Build status
- `npx tsc --noEmit` → clean.
- `npx vite build` → success.
  - `BimRoute` chunk 177.86 kB → 187.97 kB (new panels).
  - `three-vendor` unchanged (~999 kB) — still the next perf target.

## Notes / next targets
- `three-vendor` payload remains the main performance hotspot.
- Broader cross-project portfolio/snapshot analytics still partly active-project scoped
  (BOQ category + share comparisons are independently fetched and correct).
- RBAC remains local-only (no auth backend) by design.
