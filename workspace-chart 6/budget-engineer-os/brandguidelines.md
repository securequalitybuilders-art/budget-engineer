# brandguidelines.md — Dzenhare Budget Engineer Design System (UI/UX Pro Max)

Dark-first, enterprise, computational. No boring white walls.

## Palette (tokens in `src/index.css`)

| Token | Hex | Use |
|---|---|---|
| Deep Cobalt | `#1a365d` | Brand primary, concrete structure |
| Warm Sand | `#d4a574` | Brand accent, highlights |
| AI Cyan | `#06b6d4` | AI features, selection, CTAs |
| BIM Violet | `#8b5cf6` | BIM / secondary links |
| Dark Base | `#0b1220` | Page background / canvas |
| Panel Surface | `#111c31` | Cards & panels |
| Border | `#24324b` | Hairlines |
| Text | `#e2e8f0` | Body |
| Muted | `#94a3b8` | Secondary text |
| Strong | `#f8fafc` | Headings |
| Green / Red / Amber | `#22c55e` / `#ef4444` / `#f59e0b` | Cost up-good / errors / warnings |

## Material colours (structural plan rendering)

- Concrete `#1a365d` · Steel `#64748b` · Timber `#a0522d`.

## Typography

- Display/headings: **Space Grotesk** → Inter fallback.
- Body/UI: **Inter**, system fallback.
- Numbers/tables: tabular-nums for alignment.

## Skeleton (layout)

- Bento grid; two-column at desktop (design journey | engineering output), stacks on mobile.
- Top bar with brand mark + nav pills (Design Journey · Enterprise AI · 3D BIM · Quantities · BOQ).
- Cards: 14px radius, 1px border, 18px padding.

## Skin (aesthetic)

- Glass/aurora restraint; gradient only on brand mark + KPI bars.
- KPI cards: dark base, cyan/green accent values.

## Soul (motion)

- 150ms ease transitions on interactive elements; hover raises border to cyan.
- Selection in 2D plan ↔ 3D BIM uses the `bim-{cadId}` id convention.

## Voice

- Confident, plain, engineering-credible. Money formatted `$00,000.00`.
- Always state the assumption behind a number (e.g. rebar spec, markups).

## Accessibility

- Contrast ≥ 4.5:1 for body text on `--base`/`--panel`.
- Inline styles / embedded SVG only (preview sandbox has no network).
