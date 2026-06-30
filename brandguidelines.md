# DzeNhare Brand Guidelines — Budget Engineer

> **Version:** 1.0.0  
> **System:** Dark-First Enterprise Design Language

---

## 1. COLOR SYSTEM

### 1.1 Brand Palette

| Token | Hex | Usage |
|---|---|---|
| `brand-deep-cobalt` | `#1a365d` | Primary brand color, headers, primary buttons, active states |
| `brand-warm-sand` | `#d4a574` | Accent, highlights, call-to-action, selected state |
| `brand-ai-cyan` | `#06B6D4` | AI-generated content markers, AI badge, AI suggestions |
| `brand-bim-violet` | `#8B5CF6` | BIM elements, 3D viewer, model indicators |

### 1.2 Surface Palette

| Token | Hex | Usage |
|---|---|---|
| `surface-dark` | `#0b1220` | Page background (dark base) |
| `surface-panel` | `#111c31` | Card, panel, sidebar, modal backgrounds |
| `surface-elevated` | `#1a2744` | Hovered cards, dropdowns, tooltips |
| `surface-input` | `#0f1a2e` | Input fields, textareas, search bars |

### 1.3 Border Palette

| Token | Hex | Usage |
|---|---|---|
| `border-default` | `#24324b` | Default borders, dividers, table lines |
| `border-hover` | `#3a4b6b` | Hover state borders |
| `border-focus` | `#06B6D4` | Focus ring, selected border |

### 1.4 Text Palette

| Token | Hex | Usage |
|---|---|---|
| `text-body` | `#e2e8f0` | Primary body text |
| `text-muted` | `#94a3b8` | Secondary text, labels, placeholders |
| `text-inverse` | `#0b1220` | Text on light/sand backgrounds |

### 1.5 Semantic Palette

| Token | Hex | Usage |
|---|---|---|
| `semantic-success` | `#22c55e` | Success, completed, validated, green lights |
| `semantic-warning` | `#f59e0b` | Warning, caution, pending review |
| `semantic-danger` | `#ef4444` | Error, delete, critical, failure |
| `semantic-info` | `#06B6D4` | Info, tips, guidance |

### 1.6 CAD/BIM Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `cad-wall` | `#4a5568` | Wall outlines in CAD |
| `cad-wall-fill` | `#2d3748` | Wall fill in CAD |
| `cad-slab` | `#718096` | Slab/floor elements |
| `cad-beam` | `#d4a574` | Structural beams |
| `cad-column` | `#8B5CF6` | Columns |
| `cad-dimension` | `#06B6D4` | Dimension lines, annotations |
| `cad-grid` | `#1a365d` | Grid lines |
| `cad-selection` | `#d4a574` | Selected element highlight |
| `bim-wall-3d` | `#4a5568` | 3D wall mesh |
| `bim-roof` | `#8B5CF6` | 3D roof mesh |
| `bim-transparent` | `rgba(17,28,49,0.6)` | Transparent/semi surfaces |

---

## 2. TYPOGRAPHY

### 2.1 Font Stack

```css
--font-sans: 'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

### 2.2 Type Scale

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 2.5rem (40px) | 700 | 1.1 | Page titles, hero |
| Heading 1 | 1.875rem (30px) | 600 | 1.2 | Section titles |
| Heading 2 | 1.5rem (24px) | 600 | 1.25 | Card titles |
| Heading 3 | 1.25rem (20px) | 600 | 1.3 | Subsection titles |
| Body Large | 1rem (16px) | 400 | 1.5 | Primary body text |
| Body | 0.875rem (14px) | 400 | 1.5 | Secondary text, table cells |
| Body Small | 0.75rem (12px) | 400 | 1.5 | Captions, metadata |
| Caption | 0.625rem (10px) | 500 | 1.4 | Badges, tiny labels |
| Code | 0.8125rem (13px) | 400 | 1.6 | Code blocks, measurements |

### 2.3 Text Styles

- Body text color: `text-body` (`#e2e8f0`)
- Muted text: `text-muted` (`#94a3b8`)
- Links: `brand-ai-cyan` (`#06B6D4`) with underline on hover
- Code/numbers: `--font-mono` for all measurements, quantities, prices
- No text under 10px (accessibility)

---

## 3. SPACING SYSTEM

Use Tailwind's default spacing scale consistently:

| Token | Pixels | Usage |
|---|---|---|
| `space-1` | 4px | Micro spacing, icon gaps |
| `space-2` | 8px | Tight spacing, button padding |
| `space-3` | 12px | Element spacing |
| `space-4` | 16px | Default spacing, card padding |
| `space-5` | 20px | Section spacing |
| `space-6` | 24px | Between cards, form sections |
| `space-8` | 32px | Page sections, modals |
| `space-10` | 40px | Major sections |
| `space-12` | 48px | Page margins |
| `space-16` | 64px | Maximum spacing |

### Panel Padding Rules
- Desktop cards/panels: `p-6`
- Mobile cards/panels: `p-4`
- Dense panels (tables, lists): `p-4`
- Page content: `p-8`

---

## 4. DARK MODE

The app is **dark-first** — dark mode is the default and only theme.

```css
:root {
  --color-bg: #0b1220;
  --color-surface: #111c31;
  --color-elevated: #1a2744;
  --color-border: #24324b;
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;
}
```

- No light mode toggle (dark-first brand identity)
- All colors pass WCAG AA contrast on `#0b1220` background
- Glass panels use `backdrop-filter: blur(12px)` with `rgba(17,28,49,0.8)`

---

## 5. COMPONENT STYLES

### 5.1 Buttons

| Variant | BG | Text | Border | Hover BG |
|---|---|---|---|---|
| Primary | `#1a365d` | `#e2e8f0` | None | `#24324b` |
| Accent | `#d4a574` | `#0b1220` | None | `#c49564` |
| Ghost | Transparent | `#94a3b8` | None | `rgba(255,255,255,0.05)` |
| Danger | `#ef4444` | `#fff` | None | `#dc2626` |
| Outline | Transparent | `#e2e8f0` | `#24324b` | `rgba(255,255,255,0.05)` |

- Border radius: `rounded-lg` (8px)
- Padding: `px-4 py-2` (default), `px-3 py-1.5` (small)
- Font: `font-medium text-sm`
- Icons: 16x16, left-aligned, `gap-2`
- Disabled: `opacity-50 cursor-not-allowed`

### 5.2 Cards

```css
.card {
  @apply bg-[#111c31] border border-[#24324b] rounded-xl p-6;
}
```

- Hover: `border-[#3a4b6b]` with optional `shadow-lg`
- Glass variant: `bg-[rgba(17,28,49,0.8)] backdrop-blur-[12px]`
- Bento grid: use CSS Grid with `grid-cols-12` or `grid-cols-6`

### 5.3 Tables

| Element | Style |
|---|---|
| Header | `bg-[#1a2744] text-muted text-xs font-semibold uppercase tracking-wider` |
| Row | `border-b border-[#24324b] hover:bg-[rgba(255,255,255,0.02)]` |
| Cell | `py-3 px-4 text-sm text-body` |
| Striped | `odd:bg-[rgba(255,255,255,0.01)]` |

### 5.4 Inputs

```css
.input {
  @apply bg-[#0f1a2e] border border-[#24324b] rounded-lg px-4 py-2.5
         text-body text-sm placeholder:text-muted
         focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent
         disabled:opacity-50;
}
```

### 5.5 Badges / Tags

| Variant | BG | Text |
|---|---|---|
| Default | `#1a2744` | `#94a3b8` |
| AI | `rgba(6,182,212,0.15)` | `#06B6D4` |
| BIM | `rgba(139,92,246,0.15)` | `#8B5CF6` |
| Success | `rgba(34,197,94,0.15)` | `#22c55e` |
| Warning | `rgba(245,158,11,0.15)` | `#f59e0b` |
| Danger | `rgba(239,68,68,0.15)` | `#ef4444` |

- Border radius: `rounded-full` (pill) or `rounded-md` (tag)
- Padding: `px-2.5 py-0.5`
- Font: `text-xs font-medium`

### 5.6 Dialogs / Modals

- Overlay: `bg-[rgba(0,0,0,0.6)] backdrop-blur-[4px]`
- Panel: `bg-[#111c31] border border-[#24324b] rounded-2xl p-6`
- Width: `max-w-lg` (default), `max-w-2xl` (large)
- Animation: `animate-in fade-in zoom-in-95`

### 5.7 Tooltips

- BG: `#1a2744`
- Text: `#e2e8f0`
- Border: `#24324b`
- Border radius: `rounded-md`
- Padding: `px-3 py-1.5`
- Font: `text-xs`

---

## 6. CHART STYLE

- BG: transparent (inherits panel/surface)
- Grid lines: `#24324b` (thin, dashed)
- Axes: `#94a3b8`
- Line colors: `#06B6D4`, `#8B5CF6`, `#d4a574`, `#22c55e`
- Bar fill: gradient from brand color to 60% opacity
- Pie/donut: brand palette sequence
- Tooltip: match app tooltip style
- Legend: `text-muted text-xs`
- No background fills on chart areas

---

## 7. MOTION & MICROINTERACTIONS

### 7.1 Durations
| Action | Duration | Easing |
|---|---|---|
| Hover | 150ms | ease-out |
| Click | 100ms | ease-in-out |
| Panel open | 200ms | ease-out |
| Modal open | 250ms | ease-out |
| Page transition | 300ms | ease-in-out |
| Loading skeleton | 1.5s loop | ease-in-out |

### 7.2 Transitions
```css
--transition-fast: 150ms ease-out;
--transition-normal: 200ms ease-out;
--transition-slow: 300ms ease-in-out;
```

### 7.3 Rules
- Prefer `opacity` and `transform` for animations (GPU-composited)
- No animation on `width`, `height`, `top`, `left`, `margin`, `padding`
- Use Tailwind's `transition-all` with caution — prefer specific properties
- Loading states: use skeleton screens (not spinners) for content areas
- Buttons: subtle scale `transform: scale(0.97)` on click (active state)
- Cards: `translateY(-2px)` + `shadow-lg` on hover
- Page transitions: fade + subtle slide

---

## 8. ACCESSIBILITY RULES

- Minimum contrast ratio: WCAG AA (4.5:1 normal text, 3:1 large text)
- All interactive elements must be keyboard-focusable
- Focus indicator: `ring-2 ring-[#06B6D4]` (never `outline: none` alone)
- All images/icons must have `alt` text
- Form fields must have associated `<label>` elements
- Use semantic HTML (`<nav>`, `<main>`, `<aside>`, `<section>`, `<article>`)
- Buttons must be `<button>` elements, not `<div>` with click handlers
- Toggle/switch must have `role="switch"` and `aria-checked`
- All color use must have non-color indicators (icons, text, patterns)
- Touch targets minimum 44×44px on mobile
- Reduced motion: respect `prefers-reduced-motion`
