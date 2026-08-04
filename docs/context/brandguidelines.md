# Budget Engineer — Brand Guidelines

Purpose: This file defines the visual identity, design system, and UI/UX standards
for the Budget Engineer platform. Every component, page, and drawing must follow these guidelines.

## 1. Brand Identity

### 1.1 Name

- Full name: Budget Engineer Studio
- Short name: Budget Engineer
- Tagline: "Making Construction Affordable for Everyone"
- Domain: budget-engineer.vercel.app

### 1.2 Mission

Local-first, browser-based architectural design and cost estimation platform for the
African (SADC) construction industry. Transform plain-language client briefs into
council-ready architectural drawings without paid APIs or backend servers.

### 1.3 Positioning

- NOT a CAD replacement — a drafting parameter engine
- NOT autonomous — requires ACZ-registered professional review (SI 56 of 2025)
- NOT cloud-dependent — runs entirely in the browser
- YES a force multiplier for architects and quantity surveyors

## 2. Color System

### 2.1 Brand Colors

| Token | Dark Mode | Usage |
|---|---|---|
| `--brand-primary` | #1a365d | Headers, primary actions |
| `--brand-primary-dark` | #0f2744 | Dark accents |
| `--brand-secondary` | #2c5282 | Secondary actions |
| `--brand-accent` | #d4a574 | Highlights, active states |

### 2.2 Semantic Colors

| Token | Dark Mode | Usage |
|---|---|---|
| `--accent-ai` | #06b6d4 | AI-related features |
| `--accent-bim` | #8b5cf6 | BIM/3D features |
| `--accent-success` | #10b981 | Success states |
| `--accent-warning` | #f59e0b | Warning states |
| `--accent-danger` | #ef4444 | Error/danger states |

### 2.3 Background Colors

| Token | Dark Mode | Usage |
|---|---|---|
| `--bg-primary` | #0b0f19 | Page background |
| `--bg-secondary` | #111827 | Card surfaces |
| `--bg-tertiary` | #1e293b | Elevated surfaces |
| `--bg-elevated` | #0f172a | Popovers, dropdowns |

### 2.4 Text Colors

| Token | Dark Mode | Usage |
|---|---|---|
| `--text-primary` | #f8fafc | Primary text |
| `--text-secondary` | #94a3b8 | Secondary text |
| `--text-muted` | #8494ab | Placeholder, hints (WCAG AA 5.75:1) |

### 2.5 Border Colors

| Token | Dark Mode | Usage |
|---|---|---|
| `--border-subtle` | rgba(148,163,184,0.1) | Dividers |
| `--border-default` | rgba(148,163,184,0.2) | Card borders |
| `--border-focus` | rgba(212,165,116,0.5) | Focus rings |

### 2.6 Room Zone Colors (Floor Plans)

| Zone | Fill | Stroke | Text | Usage |
|---|---|---|---|---|
| Public | #E6F1FB | #378ADD | #042C53 | Living, reception, sales |
| Private | #EAF3DE | #639922 | #173404 | Bedrooms, offices |
| Service | #FAEEDA | #BA7517 | #412402 | Kitchen, bathroom, store |
| Circulation | #F1EFE8 | #888780 | #2C2C2A | Corridors, stairs |

## 3. Typography

### 3.1 Font Stack

| Role | Font | Weights | Usage |
|---|---|---|---|
| Display | Space Grotesk | 500, 600, 700 | Headings, hero text |
| Body | Inter | 400, 500, 600, 700 | Body text, UI elements |
| Mono | JetBrains Mono | 400, 500, 600 | Code, dimensions, data |

### 3.2 Font Loading (Google Fonts CDN)

Fonts are served from `fonts.googleapis.com` with preconnects in `index.html` and a
print-media swap so they never block first render:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" media="print" onload="this.media='all'" />
```

Only Inter (400–700), Space Grotesk (500–700), and JetBrains Mono (400–600) subsets are
loaded. No local font files are shipped (local TTFs removed; ~1.8 MB saved).

### 3.3 Type Scale

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| h1 | 2.5rem | 700 | 1.2 | Page titles |
| h2 | 2rem | 600 | 1.3 | Section headings |
| h3 | 1.5rem | 600 | 1.4 | Subsection headings |
| h4 | 1.25rem | 500 | 1.4 | Card titles |
| body | 1rem | 400 | 1.6 | Body text |
| small | 0.875rem | 400 | 1.5 | Secondary text |
| caption | 0.75rem | 400 | 1.4 | Captions, labels |

### 3.4 Dimension Formatting

- Metres: `10 000` (space separator, not comma)
- Millimetres: `10 000 mm`
- Angles: `45°`
- Percentages: `45%`

## 4. Layout System

### 4.1 Grid

- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Columns: 12-column grid
- Gutters: 1rem (16px)
- Margins: 1rem mobile, 2rem tablet, 3rem desktop

### 4.2 Spacing Scale

`4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px`

### 4.3 Border Radius

- Small: `var(--border-radius-md)` = 8px
- Medium: `var(--border-radius-lg)` = 12px
- Large: `var(--border-radius-xl)` = 16px
- Full: 9999px (pills)

### 4.4 Shadows

- Subtle: `0 1px 2px rgba(0,0,0,0.05)`
- Medium: `0 4px 6px rgba(0,0,0,0.07)`
- Large: `0 10px 15px rgba(0,0,0,0.1)`
- Focus: `0 0 0 2px var(--border-focus)`

## 5. Component Patterns

### 5.1 Cards

```jsx
<Card className="border-beam">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### 5.2 Buttons

- Primary: `bg-[var(--brand-primary)] text-white`
- Secondary: `bg-[var(--bg-secondary)] text-[var(--text-primary)] border`
- Ghost: `bg-transparent text-[var(--text-secondary)]`
- Danger: `bg-[var(--accent-danger)] text-white`

### 5.3 Form Elements

- Input height: 36px
- Border: `0.5px solid var(--border-default)`
- Focus: `ring-2 ring-[var(--brand-accent)]`
- Placeholder: `text-[var(--text-muted)]`

### 5.4 Glass Effect

```css
.glass {
  background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### 5.5 Aurora Background

```css
.aurora {
  background:
    radial-gradient(ellipse 80% 50% at 20% 30%, rgba(44,82,130,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 80% 20%, rgba(212,165,116,0.25) 0%, transparent 60%);
}
```

## 6. Architectural Drawing Standards

### 6.1 Line Weights (ISO 128)

| Weight | mm | Usage |
|---|---|---|
| 0.18 | Very thin | Dimension lines, hatching |
| 0.25 | Thin | Hidden lines, center lines |
| 0.35 | Medium | Object lines (secondary) |
| 0.50 | Thick | Object lines (primary) |
| 0.70 | Very thick | Section cuts, outlines |
| 1.00 | Extra thick | Title block borders |

### 6.2 Wall Rendering

- Cut walls: Solid black fill (#000000)
- Wall outlines: 0.50mm stroke
- Hidden walls: Dashed 0.25mm stroke
- Center lines: Long-short-long dash 0.18mm stroke

### 6.3 Opening Symbols

- Doors: Arc swing line + door leaf
- Windows: Double line with glazing bars
- Sliding doors: Parallel lines with arrow

### 6.4 Room Fixtures

- WC: Standard symbol with seat
- Basin: Half-circle with tap
- Shower: Square with spray pattern
- Bath: Rounded rectangle
- Kitchen sink: Rectangle with drainer

### 6.5 Annotations

- Room labels: Name + dimensions (mm)
- Dimension lines: With tick marks, text above
- Level markers: Triangle with RL value
- North arrow: Standard arrow with N

## 7. Interaction Patterns

### 7.1 Navigation

- Stage Rail: Left sidebar with 13 pipeline stages
- Command Bar: Top header with project info, discipline switcher
- Command Palette: Ctrl+K for quick actions
- Keyboard Shortcuts: Ctrl+Shift+D for diagnostics

### 7.2 Plan Editing

- Click to select room
- Drag to move room
- Resize handles on room corners
- Parametric constraints enforced in real-time
- Undo/Redo with Ctrl+Z / Ctrl+Shift+Z

### 7.3 Export Flow

- Select drawing tab in DrawingsPanel
- Click SVG/PDF/DXF export button
- File downloads with proper naming convention

## 8. Responsive Design

### 8.1 Mobile (< 768px)

- Single column layout
- Bottom navigation bar
- Collapsed sidebar
- Touch-friendly controls (44px min touch target)

### 8.2 Tablet (768px - 1024px)

- Two-column layout
- Collapsible sidebar
- Adaptive grid

### 8.3 Desktop (> 1024px)

- Full three-column layout
- Persistent sidebar
- Multi-panel views

## 9. Accessibility

### 9.1 WCAG 2.1 AA Compliance

- Contrast ratio ≥ 4.5:1 for normal text
- Contrast ratio ≥ 3:1 for large text
- Focus indicators on all interactive elements
- Keyboard navigation for all functions
- Screen reader compatible with ARIA labels

### 9.2 Specific Requirements

- `aria-label` on all icon buttons
- `aria-current="step"` on active stage
- Skip to main content link
- `role="navigation"` on stage rail
- `role="main"` on content area

## 10. Animation & Transitions

### 10.1 Principles

- **Functional:** Animations serve a purpose (feedback, orientation)
- **Fast:** 150–300ms for micro-interactions
- **Subtle:** No flashy or distracting animations
- **Respectful:** `prefers-reduced-motion` media query

### 10.2 Standard Transitions

- Hover: 150ms ease
- Focus: 200ms ease
- Page transition: 300ms ease-in-out
- Modal: 200ms scale + opacity

### 10.3 Micro-interactions

- Button hover: `scale(1.02)`
- Button active: `scale(0.98)`
- Card hover: shadow increase
- Input focus: ring expansion

## 11. Content Guidelines

### 11.1 Tone

- **Direct:** No fluff, get to the point
- **Technical:** Use correct architectural terminology
- **Action-oriented:** Tell users what to do next
- **Honest:** Never claim more than what's built

### 11.2 Error Messages

- Be specific about what went wrong
- Suggest a fix
- Don't blame the user

### 11.3 Empty States

- Explain what will appear
- Provide a call-to-action
- Use appropriate illustration

## 12. File Naming Conventions

### 12.1 Components

- `PascalCase`: `FloorPlanView.tsx`
- Colocated with tests: `FloorPlanView.test.tsx`

### 12.2 Utilities

- `camelCase`: `formatDimensions.ts`

### 12.3 Styles

- `kebab-case`: `index.css`

### 12.4 Drawings

- Drawing number: `A-101-Ground-Floor-Plan.svg`
- Include scale: `A-301-Section-A-A-1-50.svg`
