# Dzenhare Budget Engineer Studio

> AI-powered computational design → 2D CAD → 3D BIM → engineering quantities → BOQ.  
> Offline-first, open-source, Africa-focused.

## Quick start

```bash
cd budget-engineer-os
npm install
npm run dev
```

Then open http://localhost:5173.

## What is built so far

This is the **scaffold + data model** (M1–M2 of the BLAST Blueprint). It includes:

- ✅ Vite + React 18 + TypeScript (strict)
- ✅ Tailwind CSS + custom Dzenhare design tokens (Deep Cobalt `#1a365d` + Warm Sand `#d4a574`)
- ✅ Dark-first theme with system/light toggle
- ✅ PWA scaffold (service worker, manifest)
- ✅ shadcn/ui-style components: Button, Card, Input, Select, Textarea, Badge, Label
- ✅ Zustand + Immer state management
- ✅ Dexie.js (IndexedDB) for offline-first project storage
- ✅ Project creation wizard with brief, region, currency, budget
- ✅ Transaction history (immutable event log) for every project/brief mutation
- ✅ Bento dashboard shell: command bar, sidebar, canvas placeholder, properties panel, BOQ panel, AI chat, transaction history
- ✅ Seed Zimbabwe/CWICR-style cost rates in the local database
- ✅ Integer-cents currency handling (no floating-point money)
- ✅ Code-split pages and vendor libraries into separate chunks
- ✅ Command palette (`Cmd/Ctrl + K` or `/`)
- ✅ Global keyboard shortcuts (`T`, `B`, `C`, `Q`, `H`, `N`, `P`, `1-6`, `?`)
- ✅ Real app icons (favicon + PWA 192/512 PNGs)
- ✅ Local AI brief-to-design — deterministic parser + Zod schema → 3 design options (compact/standard/spacious) with rooms and quantities

## Next steps (thin slice pipeline)

1. **AI brief-to-design** — local LLM (`transformers.js` / WebLLM / Ollama) parses brief into parametric JSON.
2. **2D CAD** — `Maker.js` + `Design-Core` canvas renders floor plans; export DXF/SVG.
3. **3D BIM** — `OpenJSCAD` + `Manifold` + `three.js` + `xeokit-sdk` viewer; export IFC/XKT.
4. **QTO engine** — extract volumes/areas/lengths from geometry.
5. **BOQ engine** — map quantities to local CWICR/Zimbabwe rates; produce charts + export CSV/PDF.
6. **4-stage computational pipeline** — structural check → solar analysis → material estimate → BOQ (via Amanbh997 CD skills).

## Context files

The production-ready context files for AntiGravity / AI agents are in the workspace root:

- `gemini.md` — system prompt and open-source stack
- `brandguidelines.md` — UI/UX Pro Max design system
- `project_constitution.md` — technical governance and data model
- `task_plan.md` — BLAST Blueprint with milestones
- `critical_analysis.md` — audit of the original live app

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |

## License

MIT — aligned with the open-source tools it depends on.
