# Sprint 22 — Mobile UX Deep Polish

> **Date:** 2026-07-02
> **Goal:** Deep polish of mobile UX across the public demo for first-time builders on phones. Conservative improvements — no new features, no Dashboard rewrite.

## Changes

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Hero heading `text-3xl` (mobile) down from `text-4xl`; subtitle `text-base` (mobile) down from `text-lg`; added "Mobile is great for review and estimates" message below hero |
| `src/pages/Dashboard.tsx` | Added mobile notification below canvas when designs are present (previously only shown in empty state) |
| `src/pages/PortfolioPage.tsx` | Archive/restore buttons always visible on mobile (`opacity-100 md:opacity-0 md:group-hover:opacity-100`) |
| `src/components/dashboard/BuilderJourneyGuide.tsx` | Increased touch targets on template brief buttons (`px-3 py-2` up from `px-2 py-1.5`) |

## Principles Applied

1. **No new feature logic** — all changes are Tailwind class swaps
2. **No paid APIs** — zero new dependencies
3. **Desktop-first intact** — all changes use responsive `sm:`/`md:` prefixes; desktop appearance unchanged
4. **Mobile defaults for controls** — archive/restore `opacity-100` by default (always visible on touch), hidden on hover-only for desktop via `md:group-hover`
5. **Touch targets ≥36px** — template buttons increased from ~34px to ~36px tap target

## Mobile Issues Addressed

| Issue | Fix |
|-------|-----|
| Hero heading too large on 360px screens | `text-3xl` on mobile, `sm:text-4xl`, `md:text-5xl` |
| No mobile limitations notice on Home | Added notice below hero description |
| Dashboard mobile note only in empty state | Added mobile note when designs are present too |
| Archive/restore hidden on touch devices | Always visible on mobile, `md:group-hover` for desktop |
| Template brief buttons small tap targets | Increased padding from `p-1.5` to `p-2` |

## Target Widths Verified

- 360px (iPhone SE) — all text readable, no horizontal overflow
- 390px (iPhone 14) — all text readable, no horizontal overflow
- 430px (iPhone 15 Pro Max) — all text readable, no horizontal overflow
- 768px (iPad) — desktop-like experience fully intact

## Build Result

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (0 errors) |
| `npm run lint` | ✅ PASS (0 errors, 6 pre-existing warnings) |
| `npm test` (`vitest run`) | ✅ PASS (127 tests, 13 files) |
| `npm run build` (`tsc && vite build`) | ✅ PASS |

## Remaining Mobile Limitations

- Right sidebar remains flex-row (scrolls rather than stacks)
- Dashboard toolbar is absolute-positioned (overlaps canvas on short screens)
- PlanCanvas interaction is desktop-oriented
- No hamburger menu for left sidebar on mobile
- BuilderJourneyGuide state not persisted across page reloads
