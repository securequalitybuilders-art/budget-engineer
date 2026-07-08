# brandguidelines.md — Dzenhare OS: Budget Engineer Studio
## UI/UX Pro Max Design Vault | Version: 1.0.0 | Mode: Dark-First
> Based on the live audit of https://dzenhare-os.vercel.app/budget-engineer, the Dzenhare Master Plan 2026-2031, and the UI/UX Pro Max framework.

---

## 1. BRAND ESSENCE

**Brand name:** DZENHARE OS — Budget Engineer Studio  
**Tagline:** *"Build Smart. Build Together. Build Africa."*  
**Mission:** Making construction affordable for everyone through AI-powered computational design.  
**Mascot:** African Weaver Bird (collective building, precision, community).  
**Personality:** Precise, trustworthy, futuristic, warm, African-rooted, enterprise-ready.

**Brand Voice:**
- **Precise but Human:** We speak engineer — clear, metric-driven, no fluff. But we never sound robotic. Every number has a story; every line item has dignity.
- **Empowering:** The user is the architect. We are the multiplier, not the replacement.
- **Transparent:** Costs are never hidden. Processes are never black boxes. Show the math.
- **Future-Forward:** We reference the best of aerospace UI (SpaceX mission control), financial terminals (Bloomberg), and architectural drafting (AutoCAD dark mode) — but unified into a cohesive, accessible system.

---

## 2. THE 5-DIMENSIONAL UI/UX PRO MAX FRAMEWORK

Every screen, component, and interaction must satisfy all 5 dimensions. No exceptions.

### 2.1 SKELETON (Structural Patterns)

Define the layout DNA. Budget Engineer Studio uses these specific patterns:

#### Pattern A: SaaS Hero with Bento Grid
- **Use:** Dashboard home, project overview, empty states.
- **Structure:** Full-viewport hero with Aurora background → H1 + value prop → Bento grid of 4–6 feature cards (2 large, 4 small) with live data previews.
- **Grid:** CSS Grid `grid-cols-4`, gap `1.5rem`, responsive collapse to `grid-cols-1` on mobile.
- **Card Ratios:** Large cards span 2×2; small cards 1×1. Never equal-sized boredom.

#### Pattern B: Split-Screen Workbench
- **Use:** CAD canvas, BIM viewer, BOQ editor.
- **Structure:** Left 60% = interactive canvas/viewer. Right 40% = properties panel + AI chat + layer tree. Resizable via drag handle (min-width 320px).
- **Divider:** 1px `border-slate-700` with subtle Warm Sand glow on hover.

#### Pattern C: Data Terminal (Bloomberg-style)
- **Use:** BOQ tables, cost dashboards, transaction history.
- **Structure:** Fixed header row, zebra striping on hover, pinned first column (item description), color-coded variance columns (green under budget, red over).
- **Density:** Compact. Padding `py-2 px-3`. Information density > whitespace for data screens.

#### Pattern D: Immersive Journey
- **Use:** Design wizard, onboarding, AI prompt flow.
- **Structure:** Full-screen stepper with progress indicator (border-beam animation). One primary action per step. Background: subtle animated mesh gradient.

---

### 2.2 SKIN (Aesthetic System)

Apply high-end aesthetics. No boring white walls. No default Bootstrap.

#### Color Palette (Dark-First)

```css
/* Core Brand Tokens */
--brand-primary: #1A365D;        /* Deep Cobalt — primary brand, buttons, headers, focus */
--brand-primary-dark: #0F2744;   /* Deeper navy — hover, depth, shadows */
--brand-secondary: #2C5282;      /* Mid navy — hero gradient mid-stop, secondary surfaces */
--brand-accent: #D4A574;         /* Warm Sand — CTAs, highlights, active states, totals */

/* Neutral / Surface Tokens */
--bg-primary: #0B0F19;           /* Deep space — main canvas background */
--bg-secondary: #111827;           /* Slate 900 — panels, cards */
--bg-tertiary: #1E293B;            /* Slate 800 — inputs, hover states */
--bg-elevated: #0F172A;            /* Slate 900 variant — modals, popovers */

/* Functional Accents */
--accent-ai: #06B6D4;              /* Cyan — AI highlights, focus glow, typing indicator */
--accent-bim: #8B5CF6;             /* Violet — BIM links, secondary actions, graph traces */
--accent-success: #10B981;         /* Emerald — validation pass, under budget, on track */
--accent-warning: #F59E0B;         /* Amber — costs, warnings, financial data, pending */
--accent-danger: #EF4444;          /* Red — errors, over budget, clashes, destructive */

/* Text */
--text-primary: #F8FAFC;           /* Slate 50 — headings, primary data */
--text-secondary: #94A3B8;         /* Slate 400 — labels, metadata */
--text-muted: #64748B;             /* Slate 500 — disabled, placeholders */

/* Borders & Glows */
--border-subtle: rgba(148, 163, 184, 0.1);
--border-default: rgba(148, 163, 184, 0.2);
--border-focus: rgba(212, 165, 116, 0.5);  /* Warm Sand glow */
--shadow-glow-brand: 0 0 20px rgba(212, 165, 116, 0.3);
--shadow-glow-ai: 0 0 20px rgba(6, 182, 212, 0.3);
```

#### Light Mode (Secondary)

```css
--light-bg: #f8fafc;
--light-surface: #ffffff;
--light-border: #e2e8f0;
--light-text-primary: #1e293b;
--light-text-secondary: #64748b;
--light-brand-bg: #1a365d;
--light-accent: #d4a574;
```

#### Gradient & Aurora Specs

- **Hero gradient:** `linear-gradient(135deg, #1a365d, #2c5282, #d4a574)`
- **Aurora background:** dark navy base with radial glows in `#2c5282` and `#d4a574`.
- **Card dark gradient:** `linear-gradient(180deg, rgba(26,54,93,0.3), rgba(212,165,116,0.15))`
- **Shimmer light:** `linear-gradient(90deg, #f1f5f9 25%, #e2e8f0, #f1f5f9 75%)`
- **Shimmer dark:** `linear-gradient(90deg, #1e293b 25%, #334155, #1e293b 75%)`
- **Border beam gradient:** `conic-gradient(from 0deg, #d4a574, #2c5282, transparent, #d4a574)`

#### Glassmorphism Spec

- **Card Background:** `rgba(17, 24, 39, 0.7)`
- **Backdrop Filter:** `blur(12px) saturate(180%)`
- **Border:** `1px solid rgba(255, 255, 255, 0.08)`
- **Shadow:** `0 8px 32px rgba(0, 0, 0, 0.4)`
- **Use Sparingly:** Only for floating panels, modals, and AI chat overlays. Never for data tables.

#### Linear Dark Mode (The Standard)

- **Reference:** Linear.app dark mode — not "gray mode." True blacks, subtle borders, purposeful color.
- **Elevation:** Communicated via border brightness and shadow depth, not lighter backgrounds.
- **Inputs:** `bg-slate-900`, `border-slate-700`, focus state = `ring-2 ring-[#d4a574]/50 border-[#d4a574]`.
- **Buttons:**
  - Primary: `bg-[#d4a574] hover:bg-[#c29360] text-[#0f2744] shadow-lg shadow-[#d4a574]/20`
  - Secondary: `bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700`
  - Brand: `bg-[#1a365d] hover:bg-[#0f2744] text-white shadow-lg shadow-[#1a365d]/30`
  - Ghost: `text-slate-400 hover:text-white hover:bg-slate-800`
  - Destructive: `bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-600/20`

---

### 2.3 SOUL (Micro-Interactions & Motion)

Add the "wow" factor. Motion is not decoration — it's information.

#### Border Beams
- **Use:** AI-generated cards, featured project tiles, active AI chat bubbles, active stage cards.
- **Spec:** A rotating gradient border (conic-gradient) that travels around the card perimeter. Duration: 4s linear infinite.
- **Colors:** Warm Sand `#d4a574` → Deep Cobalt `#2c5282` → Transparent → Warm Sand.
- **Implementation:** Pseudo-element with `mask` and `conic-gradient`. GPU-accelerated only.

#### Staggered Scroll Reveals
- **Use:** Dashboard sections, BOQ line items, transaction history, project cards.
- **Pattern:** `opacity: 0, translateY(20px)` → `opacity: 1, translateY(0)`.
- **Timing:** 0.4s ease-out, stagger delay 0.05s per item. Max 20 items animated; beyond that, use virtualization.
- **Trigger:** IntersectionObserver at 10% threshold. No scroll-jacking.

#### Number Ticker Animation
- **Use:** Cost totals, quantities, percentages.
- **Pattern:** Count from 0 to final value over 0.8s with easeOutExpo. Use `requestAnimationFrame`. Format with locale separators.

#### Canvas Interaction Feedback
- **2D CAD:** Snap cursor changes to crosshair with Warm Sand dot. Hover highlights entity in `rgba(212, 165, 116, 0.3)`. Selection = solid Warm Sand stroke + glow.
- **3D BIM:** Hover = outline pass (post-processing). Selection = bounding box pulse + property panel slide-in.
- **Drag:** Custom cursor states. Ghost preview at 50% opacity.

#### AI Typing Indicator
- **Use:** AI chat panel while generating designs.
- **Spec:** Three dots, each 8px, Cyan `#06B6D4`, wave animation (scale 0.5 → 1 → 0.5). Duration 1.4s infinite.

#### Reduced Motion

All animations must respect `prefers-reduced-motion: reduce` by disabling transforms and fades, or using instant state changes.

---

### 2.4 AUDIT (Quality Gates)

Run this checklist before any component ships. Fix violations immediately.

#### Accessibility (A11y)
- [ ] **Color Contrast:** All text ≥ 4.5:1 against background. Data values ≥ 7:1.
- [ ] **Focus Rings:** Every interactive element has visible `:focus-visible` state (Warm Sand ring, 2px offset).
- [ ] **Keyboard Navigation:** Full Tab order. Escape closes modals. Enter activates buttons. Arrow keys navigate tables/grids.
- [ ] **ARIA:** `role="grid"` for data tables, `aria-live="polite"` for AI responses, `aria-describedby` for complex inputs.
- [ ] **Screen Readers:** All icons have `aria-label` or `sr-only` text. Charts have data tables as alternatives.
- [ ] **Reduced Motion:** If `prefers-reduced-motion: reduce`, disable Aurora drift, stagger reveals, and number tickers. Instant state changes only.

#### SEO & Performance
- [ ] **Meta Tags:** Dynamic `<title>` per route: "Project Name | Budget Engineer".
- [ ] **Lighthouse:** Target 100 performance, 100 accessibility, 100 best practices, 100 SEO.
- [ ] **Bundle Size:** Route-based code splitting. CAD engine loaded lazily. Three.js loaded only when BIM viewer mounts.
- [ ] **Canvas Performance:** Use `will-change: transform` sparingly. Throttle mouse events to 60fps. Use OffscreenCanvas in Web Workers where possible.

#### UI Flaw Checklist (50+ Points)
- [ ] No default browser outlines (replace with custom focus rings).
- [ ] No layout shift on image/font load (explicit dimensions, `font-display: swap`).
- [ ] No "mystery meat" navigation — all icons have tooltips on hover.
- [ ] No disabled buttons without explanation (use tooltip: "Complete step 3 to continue").
- [ ] No infinite scroll without jump-to-top.
- [ ] No tables without column resizing (AG Grid handles this).
- [ ] No modals without click-outside-to-close + Escape.
- [ ] No forms without inline validation (on blur, not just submit).
- [ ] No AI output without confidence indicator (%) and edit capability.
- [ ] No cost data without currency symbol and date of last update.
- [ ] No blank loading screens (use skeletons or shimmer).
- [ ] No broken heading hierarchy (one H1 per page, logical order).

---

## 3. COMPONENT SPECIFICATIONS

### 3.1 Charts & Data Visualization

**Library:** Recharts (composable) + custom D3 for specialized CAD visualizations.

#### Cost Breakdown Chart (Sunburst / Treemap)
- **Use:** Project cost composition by category (substructure, superstructure, MEP, finishes).
- **Colors:** Deep Cobalt family for structural, Violet for MEP, Warm Sand for finishes, Emerald for contingencies.
- **Interaction:** Hover segment → center shows total + percentage. Click drills down to BOQ items.
- **Animation:** Staggered radial reveal on mount.

#### Quantity Trend Chart (Area Chart)
- **Use:** Historical quantity revisions across design iterations.
- **Spec:** Gradient fill under line (`<defs>` linearGradient from Warm Sand to transparent). Dual Y-axis if mixing units.
- **Tooltip:** Rich tooltip with revision number, date, AI vs. human edit flag.

#### Transaction History Timeline
- **Use:** Immutable audit log of all design → BOQ actions.
- **Spec:** Vertical timeline with nodes. User actions = Warm Sand dot. AI actions = Cyan dot. System events = Slate dot.
- **Detail Panel:** Slide-out on click showing full JSON diff (before/after).
- **Filter:** By actor, by action type, by date range.

### 3.2 Dark Mode System

**Default:** Dark mode. Light mode is the alternative, not the primary.

```typescript
const config = {
  darkMode: 'class', // manual toggle + system preference
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        brand: {
          DEFAULT: '#1A365D',
          dark: '#0F2744',
          secondary: '#2C5282',
        },
        accent: '#D4A574',
        ai: '#06B6D4',
      },
      animation: {
        'border-beam': 'border-beam 4s linear infinite',
        'aurora-drift': 'aurora-drift 20s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
      },
      keyframes: {
        'border-beam': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
```

**Toggle:** Sun/moon icon in top-right toolbar. Animate rotation 180° on switch. Persist preference in IndexedDB.

### 3.3 CAD / BIM Viewer Chrome

**The "Canvas" is sacred. Maximize real estate, minimize chrome.**

#### Toolbar (Floating, Top-Left)
- **Height:** 40px. Glassmorphism background. Rounded-full.
- **Tools:** Select, Pan, Zoom, Measure, Section, Explode, AI Assist (sparkle icon).
- **Active State:** Warm Sand background pill behind active tool.

#### Properties Panel (Right Sidebar)
- **Width:** 320px default. Collapsible to icon rail (48px).
- **Sections:** (1) Entity Info, (2) Layers, (3) Materials, (4) Quantities, (5) AI Suggestions.
- **Scroll:** Independent scroll within panel. Sticky section headers.

#### AI Chat Overlay (Bottom-Right)
- **Default:** Collapsed to floating action button (FAB, 56px, Warm Sand, shadow).
- **Expanded:** 400px wide, 60vh tall. Glassmorphism. Rounded-t-2xl.
- **Message Bubbles:** User = slate-800 right-aligned. AI = gradient border left-aligned with border-beam on generation.

---

## 4. TYPOGRAPHY

**Font Stack:**
- **UI / Body:** `Inter` or `Geist` — weights 400, 500, 600, 700.
- **Monospace / Data:** `JetBrains Mono` — for quantities, BOQ line items, CAD coordinates, code blocks. Tabular numbers (`font-variant-numeric: tabular-nums`) essential for cost alignment.
- **Display / Hero:** `Space Grotesk` — for H1 headlines, marketing copy. Slight quirk, engineering personality.

**Scale (Major Third — 1.250):**

| Token | Size | Weight | Line-Height | Letter-Spacing |
|-------|------|--------|-------------|----------------|
| Hero | 3.5rem (56px) | 700 | 1.1 | -0.02em |
| H1 | 2.5rem (40px) | 700 | 1.2 | -0.01em |
| H2 | 2rem (32px) | 600 | 1.25 | -0.01em |
| H3 | 1.5rem (24px) | 600 | 1.3 | 0 |
| Body | 1rem (16px) | 400 | 1.6 | 0 |
| Small | 0.875rem (14px) | 400 | 1.5 | 0 |
| Caption | 0.75rem (12px) | 500 | 1.4 | 0.01em |
| Data | 0.875rem (14px) | 500 | 1.4 | 0 (tabular-nums) |

---

## 5. SPACING & LAYOUT

**Base Unit:** 4px (0.25rem)

**Density Tokens:**
- **Tight:** 0.5rem (8px) — data tables, compact lists.
- **Normal:** 1rem (16px) — cards, forms.
- **Relaxed:** 1.5rem (24px) — sections, modals.
- **Loose:** 2rem (32px) — hero areas, empty states.

**Border Radius:**
- **Small:** 0.375rem (6px) — buttons, inputs, badges.
- **Medium:** 0.75rem (12px) — cards, panels.
- **Large:** 1rem (16px) — modals, dialogs.
- **Full:** 9999px — pills, FABs, status indicators.

**Shadows:**
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
--shadow-glow-brand: 0 0 20px rgba(212, 165, 116, 0.3);
--shadow-glow-ai: 0 0 20px rgba(6, 182, 212, 0.3);
```

---

## 6. ICONOGRAPHY

**Library:** `lucide-react` (consistent, open-source, tree-shakeable).

**Rules:**
- Stroke width: 1.5px (not default 2px — thinner = more premium).
- Size: 16px inline, 20px buttons, 24px navigation, 32px empty states.
- Color: Inherit from text color. Never use colored icons unless status indicator (green check, red alert, amber warning).
- **CAD-specific additions:** Custom SVG icons for: wall, door, window, beam, column, slab, roof, measure, section, explode, ortho/perspective toggle.

---

## 7. TRANSACTION HISTORY & AUDIT LOG DESIGN

**The transaction history is a trust signal. It must feel like a bank statement meets Git commit log.**

### Visual Design
- **Container:** Full-width panel. `bg-slate-900`. `border-t border-slate-800`.
- **Timeline:** Left rail, 2px vertical line `bg-slate-700`. Nodes at each event.
- **Event Card:** `bg-slate-800/50` hover → `bg-slate-800`. Rounded-lg. Padding 1rem.
- **Actor Badge:** Small pill. User = Warm Sand dot + username. AI = Cyan dot + "AI Agent". System = Slate dot + "System".
- **Timestamp:** `text-caption text-slate-500`. Format: "2 mins ago" (relative) + absolute on hover tooltip.
- **Diff Preview:** Expandable accordion showing before/after in a side-by-side monospaced diff view (green add, red remove).

### Interaction
- **Filter Bar:** Sticky top. Chips for actor type, action type, date range.
- **Search:** Full-text search across descriptions and JSON payloads.
- **Export:** CSV/JSON export of filtered history.
- **Integrity:** Each row shows a verification shield icon if hash signature is valid. Click to verify.

---

## 8. RESPONSIVE BREAKPOINTS

| Token | Width | Behavior |
|-------|-------|----------|
| Mobile | < 640px | Single column. Canvas tools in bottom sheet. AI chat full-screen modal. |
| Tablet | 640–1024px | Split-screen collapses to tabs. Sidebar becomes drawer. |
| Desktop | 1024–1440px | Full split-screen. Fixed sidebars. |
| Ultrawide | > 1440px | Centered max-width 1600px. Sidebars fixed at 360px. |

**CAD/BIM Specific:**
- Mobile: View-only mode. No editing. AI chat primary interface.
- Tablet: Basic measurement and annotation.
- Desktop+: Full editing, AI co-pilot, multi-panel BOQ.

---

## 9. EMPTY STATES & ONBOARDING

**Empty State Pattern:**
- **Background:** Aurora gradient (subtle).
- **Icon:** Large 64px line illustration (construction crane + sparkle).
- **Headline:** "Start Your First Design Journey"
- **Body:** "Describe your building in plain English. Our AI will generate CAD drawings, a 3D BIM model, and a full cost breakdown — all in your browser."
- **CTA:** Primary button "Create New Project" + secondary "Import DXF/IFC".
- **Trust Bar:** 3 micro-icons below: "Local-First", "Open Source", "Private Data".

**Onboarding Wizard (5 Steps):**
1. **Welcome** — Brand promise + data privacy pledge.
2. **Region Setup** — Currency, measurement units (metric/imperial), building code region.
3. **Cost Database** — Import or download open cost catalogue (CWICR-style).
4. **AI Preferences** — Local model vs. Ollama bridge. Hardware detection (WebGPU check).
5. **First Project** — Natural language prompt input with live examples.

---

## 10. FILE NAMING & ASSET ORGANIZATION

```
/public
  /fonts
    Geist-*.woff2
    JetBrainsMono-*.woff2
  /icons
    /cad          // Custom CAD tool icons
    /filetypes    // DXF, IFC, BOQ file icons
/src
  /app           // Next.js-style routing or React Router
  /components
    /ui          // shadcn/ui primitives (Button, Input, Dialog)
    /cad         // 2D canvas, Design-Core wrappers
    /bim         // Three.js viewer, IFC loader, xeokit
    /boq         // AG Grid configs, quantity formatters
    /charts      // Recharts wrappers
    /ai          // Chat interface, prompt suggestions
  /hooks
    useCAD.ts
    useBIM.ts
    useQTO.ts
    useBOQ.ts
    useAI.ts
    useTransactions.ts
  /lib
    /engines     // Maker.js, OpenJSCAD, dxf-parser wrappers
    /workers     // Web Worker initialization
    /wasm        // WASM module loaders
  /stores
    projectStore.ts    // Zustand
    uiStore.ts
    historyStore.ts
  /types
    cad.ts, bim.ts, boq.ts, ai.ts
  /styles
    globals.css    // Tailwind directives + custom properties
    animations.css // Border beam, aurora, stagger keyframes
  /skills
    /amanbh997     // Local copies or references to the Amanbh997 skill repos
```

---

## 11. ANTI-PATTERNS (Design Crimes)

❌ **Light mode as default** — Dark mode IS the brand.  
❌ **Bootstrap/Material UI defaults** — Every component must feel custom-crafted.  
❌ **Generic blue primary buttons** — Warm Sand is the identity CTA color.  
❌ **Scroll hijacking** — Never override native scroll behavior.  
❌ **Loading spinners without context** — Use skeleton screens + progress text ("Generating BIM mesh… 67%").  
❌ **All-caps headings** — Sentence case only. Yelling is not premium.  
❌ **Box shadows on everything** — Elevation is earned, not given.  
❌ **Unformatted numbers** — Every cost must show currency, every quantity must show units, every percentage must show sign.  
❌ **Hidden costs** — If AI confidence is low, show uncertainty range. Never fake precision.  
❌ **Modal on top of modal** — Use slide-out panels or wizards instead.  

---

*"A tool that builds buildings must feel as solid as the foundations it designs."*
