# Budget Engineer — AI Context File

Purpose: This file serves as the system prompt for all AI agents working on Budget Engineer.
It ensures every generated output — code, drawings, reports — aligns with Zimbabwe/SADC
construction standards, the DzeNhare mission, and professional architectural practice.

## 1. Mission Statement

"Making Construction Affordable for Everyone"

Budget Engineer is a local-first, browser-based architectural design and cost estimation
platform for the African (SADC) construction industry. It transforms plain-language client
briefs into council-ready architectural drawings, structural calculations, and tender-ready
bills of quantities — all without paid APIs, backend servers, or cloud dependencies.

### Core Principles

- **Local-first:** All computation happens in the browser. IndexedDB stores everything.
- **Zero paid APIs:** No OpenAI keys, no cloud services. Free-tier LLMs only (Gemini, Groq).
- **No backend:** Pure static site deployed on Vercel. No server to maintain.
- **No telemetry:** Zero tracking. User data never leaves their device.
- **Honest positioning:** Never claim more than what's built.
- **Human-in-the-loop:** SI 56 of 2025 mandates ACZ-registered professionals review all plans.

## 2. Technical Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18 |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS | 3.x |
| Build | Vite (Rolldown) | 8.x |
| State | Zustand + Immer | 4.x / 10.x |
| Database | Dexie (IndexedDB) | 4.x |
| 3D | three.js (GLB export) + @google/model-viewer | 0.183 / 4.3 |
| CAD | Maker.js | 0.x |
| Charts | Recharts | 2.x |
| Validation | Zod | 3.x |
| Testing | Vitest | 4.x |
| Deployment | Vercel | — |

### Build Constraints

- `NODE_OPTIONS=--max-old-space-size=4096` required for Vercel build
- 987 source files, ~150,000 lines
- 50 IndexedDB tables, 9 schema versions
- 26 lazy-loaded routes, 26 Zustand stores
- Smoke test: `/dashboard` doesn't exist — use `/portfolio`
- `metresToMm()` formats with space separator ("10 000" not "10000")
- `FILL_CUT_WALL` is #000000 (solid black)

## 3. Building Typologies

The platform supports ALL building typologies relevant to Zimbabwe and the SADC region.
Each typology has specific room programmes, structural parameters, and compliance requirements.

### 3.1 Residential

**House / Residential (`house-residential`)**

- Occupancy: B2 (Medium dwelling, 80–200m²)
- Programme: Living/Dining, Kitchen, Master Bedroom, 2× Bedroom, Bathroom, Toilet, Laundry, Store, Verandah, Garage
- Structure: Masonry 230mm, pitched truss roof, strip foundations
- Site: 300m² min plot, 40% max coverage, 5m front setback
- Fire: 30-min resistance, 25m max travel distance

**Duplex (`duplex`)**

- Occupancy: B2
- Programme: 2× Living/Dining, 2× Kitchen, 2× Master Bedroom, 4× Bedroom, 2× Bathroom, 2× Toilet, 2× Staircase
- Structure: Masonry 230mm with 60-min fire-rated party wall
- Site: 400m² min plot, 45% max coverage

**Apartment / Flat (`apartment-multi`)**

- Occupancy: B2
- Programme: Per unit: Living/Dining, Kitchen, 2× Bedroom, Bathroom. Common: Corridor, 2× Staircase, Lift Core
- Structure: RC frame with brick infill, flat parapet roof, raft foundation
- Site: 800m² min plot, 50% max coverage, FAR 2.0

**Townhouse (`townhouse`)**

- Occupancy: B2
- Programme: Living/Dining, Kitchen, Master Bedroom, 2× Bedroom, Bathroom, Toilet, Staircase
- Structure: Masonry 230mm with party wall, zero side setback
- Site: 200m² min plot, 50% max coverage

### 3.2 Institutional

**Clinic / Health Centre (`clinic-health`)**

- Occupancy: E1
- Programme: Reception/Waiting, 3× Consultation Room, Treatment Room, Pharmacy, 2× Toilet, Store, Staff Room, Corridor
- Structure: Masonry 230mm, flat parapet, strip foundations
- Site: 500m² min plot, 40% max coverage, 6m front setback
- SADC: Separate TB waiting area, pediatric zone, wheelchair accessible throughout
- Compliance: SANS 10400-S accessibility, cross-ventilation for infection control

**School / Classroom Block (`school-classroom`)**

- Occupancy: A3 (Places of Instruction)
- Programme: 6× Classroom (42m² each, 28 students × 1.5m²), Staff Room, Head's Office, Library, 2× Toilet Block, Store, Corridor
- Structure: Masonry 230mm, pitched truss, 3.5m floor height
- Site: 2000m² min plot, 30% max coverage, 10m front setback
- Compliance: Wheelchair accessible kerb cuts and ramps throughout campus

**Church / Place of Worship (`church-worship`)**

- Occupancy: A2 (Assembly)
- Programme: Main Hall/Sanctuary (200m² min), Pastor's Office, 2× Sunday School Room, 2× Toilet, Store, Vestibule
- Structure: RC frame, 15m max span, 5.0m floor height
- Site: 1000m² min plot, 35% max coverage
- Fire: 120-min resistance, 18m max travel, 3 min escape routes
- SANS 10160: Structural loading for dense crowd occupancy

### 3.3 Commercial

**Office / Commercial (`office-commercial`)**

- Occupancy: E1
- Programme: Open-Plan Office (100m²), 4× Private Office, 2× Meeting Room, Reception, 2× Toilet, Kitchenette, Server Room, Corridor, 2× Staircase
- Structure: RC frame, 8m max span, 3.5m floor height
- Site: 500m² min plot, 60% max coverage, FAR 2.5
- Compliance: 400 lux illumination, wheelchair accessible, SANS 10400-S

**Retail / Shop (`retail-shop`)**

- Occupancy: F2 (Small Shop)
- Programme: Sales Floor (50m²), Stock Room, Counter/Checkout, Toilet, Store
- Structure: Masonry 230mm, 8m max span, 4.0m floor height
- Compliance: 500 lux on sales floor, wheelchair accessible

**Hotel (Full Service) (`hotel-fullservice`)**

- Occupancy: H1
- Programme: Reception/Lobby, Restaurant, Commercial Kitchen, 20× Guest Room (18m²), Conference Room, 4× Toilet, Laundry, Corridor, 2× Staircase, Lift Core
- Structure: RC frame, flat parapet, raft foundation
- Site: 2000m² min plot, 50% max coverage
- Compliance: Sprinklers required, strict front-of-house/back-of-house separation

**Mixed-Use (`mixed-use`)**

- Programme: Ground floor retail/commercial, upper floors residential/office
- Structure: Transfer slabs between typologies (150–250m³ high-strength concrete per level)
- Compliance: Separate entrances, circulation cores, fire compartmentation

### 3.4 Industrial

**Warehouse / Industrial (`warehouse-industrial`)**

- Occupancy: G1 (Low fire risk storage)
- Programme: Warehouse Floor (500m² min), Admin Office, Loading Bay, Toilet, Store
- Structure: Steel frame, 20m max span, 6.0m floor height, pad foundations
- Site: 2000m² min plot, 60% max coverage
- Compliance: Factories and Works Act, heavy floor loading (SANS 10160-2)

**Petrol Station (`petrol-station`)**

- Occupancy: J3 (Low risk industrial)
- Programme: Shop/Convenience, Fuel Bay (canopy), Toilet, Store, Pump Island
- Structure: Steel frame, RC slab, chemical-resistant flooring
- Compliance: EMA regulations, fire separation distances, sprinklers required

**Market / Informal Trading (`market`)**

- Occupancy: F2
- Programme: Sales Floor (300m²), 20× Vendor Stall, Aisle/Corridor, Toilet Block, Store, Admin Office
- Structure: Steel frame, 15m max span, 5.0m floor height
- Site: 1500m² min plot, 50% max coverage

## 4. Compliance Framework

### 4.1 Zimbabwean Legislation

- **Model Building By-laws (1977)** — Foundation, masonry, drainage, fire protection
- **Regional, Town and Country Planning Act [Chapter 29:12]** — Setbacks, site coverage, FAR
- **Housing Standards and Control Act [Chapter 29:08]** — Room minimums, natural light, ventilation
- **Urban Councils Act [Chapter 29:15]** — Building heights, floor-to-ceiling heights
- **Factories and Works Act [Chapter 14:08]** — Industrial safety, machinery supervision
- **Environmental Management Act [Chapter 20:27]** — Wetlands, watercourses, sustainability
- **Architects Act SI 56 of 2025** — ACZ registration mandate for plan submission

### 4.2 SADC Standards (SANS 10400 Series)

| Part | Topic | Key Parameters |
|---|---|---|
| A | General Principles | 14 occupancy classes (A1-A3, B1-B3, E1, F1-F3, G1, H1-H2, J1-J3) |
| K | Walls | Thicknesses: 90, 110, 140, 190, 230mm. Min compressive strength: 7 MPa |
| O | Lighting & Ventilation | Natural light: ≥5% floor area. Ventilation: ≥5 L/s per person |
| P | Drainage | Fixture units per fixture type. Pipe gradients: 1:60 to 1:10 |
| S | Accessibility | Wheelchair turning: 1.5m diameter. WC cubicle: 1.8m × 1.8m |
| T | Fire Protection | Max travel distance, compartment areas, escape route widths |
| W | Fire Installation | Extinguishers, hose reels, hydrants based on floor area |

### 4.3 SANS 10160 Series (Structural)

| Part | Topic | Key Parameters |
|---|---|---|
| 2 | Self-weight & Imposed Loads | Live loads per occupancy class (1.5kPa residential, 5.0kPa assembly) |
| 3 | Wind Actions | Regional wind speeds (25–28 m/s for Zimbabwe) |
| 4 | Seismic Actions | Zone factor 0.05 for Zimbabwe |
| 5 | Geotechnical Design | Foundation depth, bearing capacity per soil type |

### 4.4 Occupancy Classification Matrix

| Class | Description | Live Load | Travel Dist | Fire Rating | Accessibility |
|---|---|---|---|---|---|
| A1 | Entertainment | 5.0 kPa | 20m | 120 min | Required |
| A2 | Assembly | 5.0 kPa | 18m | 120 min | Required |
| A3 | Instruction | 3.0 kPa | 18m | 60 min | Required |
| B1 | Large dwelling | 1.5 kPa | 25m | 30 min | No |
| B2 | Medium dwelling | 1.5 kPa | 25m | 30 min | No |
| B3 | Small dwelling | 1.5 kPa | 25m | 30 min | No |
| E1 | Office | 2.5 kPa | 18m | 60 min | Required |
| F1 | Large shop | 5.0 kPa | 18m | 120 min | Required |
| F2 | Small shop | 4.0 kPa | 18m | 60 min | Required |
| G1 | Storage | 7.5 kPa | 25m | 60 min | No |
| H1 | Hotel | 2.0 kPa | 18m | 60 min | Required |
| H2 | Dormitory | 2.0 kPa | 18m | 60 min | Required |
| J1 | High risk industrial | 10.0 kPa | 15m | 240 min | No |
| J2 | Moderate risk industrial | 7.5 kPa | 18m | 120 min | No |
| J3 | Low risk industrial | 5.0 kPa | 25m | 60 min | No |

## 5. Room Standards (Zimbabwe)

| Room | Min Area | Min Width | Min Depth | Ceiling | Natural Light | Ventilation |
|---|---|---|---|---|---|---|
| Master Bedroom | 14 m² | 3.5m | 4.0m | 2.4m | Yes (1.4m² window) | Yes |
| Bedroom | 7.5 m² | 2.7m | 3.0m | 2.4m | Yes (0.75m²) | Yes |
| Kitchen | 5 m² | 2.1m | 2.4m | 2.4m | Yes (0.5m²) | Yes |
| Bathroom | 2.8 m² | 1.5m | 1.8m | 2.1m | No | Yes |
| Living Room | 10 m² | 3.0m | 3.5m | 2.4m | Yes (1.0m²) | Yes |
| Dining Room | 8 m² | 2.7m | 3.0m | 2.4m | Yes (0.8m²) | Yes |
| Toilet | 1.0 m² | 0.8m | 1.2m | 2.1m | No | Yes |
| Corridor | — | 0.9m | — | 2.1m | No | No |
| Staircase | 2.2 m² | 0.9m | 2.4m | 2.1m | No | No |
| Classroom | 42 m² | 6.0m | 7.0m | 2.7m | Yes (4.2m²) | Yes |
| Consultation Room | 10 m² | 3.0m | 3.5m | 2.4m | Yes (1.0m²) | Yes |
| Guest Room | 16 m² | 3.5m | 4.5m | 2.4m | Yes (1.6m²) | Yes |
| Office | 8 m² | 2.5m | 3.0m | 2.4m | Yes (0.8m²) | Yes |

## 6. Architectural Drawing Standards

### 6.1 Drawing Numbering (SADC Convention)

Prefix: **A** Architecture, **S** Structural, **M** Mechanical, **E** Electrical, **P** Plumbing

| Sheet Type | Range |
|---|---|
| Schedule/Index | x-001 to x-099 |
| Plans | x-101 to x-199 |
| Elevations | x-201 to x-299 |
| Sections | x-301 to x-399 |
| Services | x-401 to x-499 |
| Schedules | x-501 to x-599 |
| Details | x-601 to x-699 |
| Compliance | x-701 to x-799 |

### 6.2 Council Submission Package (18 Sheets)

| # | Drawing | Scale | Size |
|---|---|---|---|
| A-001 | Drawing Register & Notes | NTS | A1 |
| A-101 | Site Plan | 1:200 | A1 |
| A-102 | Ground Floor Plan | 1:100 | A1 |
| A-103 | First Floor Plan | 1:100 | A1 |
| A-104 | Roof Plan | 1:100 | A1 |
| A-105 | Foundation Plan | 1:100 | A1 |
| A-201 | Front Elevation | 1:100 | A1 |
| A-202 | Rear Elevation | 1:100 | A1 |
| A-203 | Left Side Elevation | 1:100 | A1 |
| A-204 | Right Side Elevation | 1:100 | A1 |
| A-301 | Section A-A | 1:50 | A1 |
| A-302 | Section B-B | 1:50 | A1 |
| A-401 | Electrical Layout | 1:100 | A1 |
| A-402 | Plumbing Layout | 1:100 | A1 |
| A-501 | Door & Window Schedule | NTS | A1 |
| A-502 | Room Schedule | NTS | A1 |
| A-601 | Construction Details | Various | A1 |
| A-701 | Compliance Certificate | NTS | A1 |

### 6.3 Title Block (ISO 7200)

Every drawing must include:

- Project name
- Drawing title
- Drawing number
- Scale
- Date
- Revision
- Designer name
- Checker name

"Budget Engineer — AI-Powered CAD"
"Local-first • No paid APIs • SADC compliant"

## 7. Free LLM Integration

### 7.1 Providers (No Credit Card Required)

| Provider | Model | Rate Limit | Use Case |
|---|---|---|---|
| Google Gemini | gemini-2.0-flash | 1,500 req/day | RAG compliance analysis |
| Groq | llama-3.3-70b-versatile | 30 RPM | Fast inference |
| GitHub Models | gpt-4o-mini | 150 req/day | Backup LLM |
| OpenRouter | meta-llama/llama-3.3-70b-instruct:free | 200 req/hr | Free models |

### 7.2 RAG Pipeline Architecture

```
PDF Building Codes → Text Extraction → Table-Aware Chunking
    → Vector Embeddings → Indexed Storage
    → Semantic Search → Relevant Sections
    → LLM Analysis → Structured Compliance Report
```

Advanced RAG features:

- Table-aware chunking (preserves data matrices)
- Hierarchical exceptions (parent-child chunking)
- Cross-reference mapping (knowledge graph)
- NLP constraint extraction (legal text → executable rules)

## 8. Project Structure

```
src/
├── app/                    # Router, layout (GlobalLayout, lazy routes)
├── adapters/               # Design→BOQ/CAD/BIM/analysis bridges
├── ai/                     # BOQ engine, brief parse, AI features
├── components/
│   ├── bim/                # 3D model viewer (GLTF), construction sequencing
│   ├── cad/                # Interactive PlanCanvas / WallFirstCanvas
│   ├── dashboard/          # Stage panels (Brief…Budget Engineered)
│   ├── drawings/           # CAD rendering, presentation sheets, paper space
│   ├── ecosystem/          # Builder/Contractor/Bulk Procurement dashboards
│   └── ui/                 # Shared UI components
├── db/                     # Dexie/IndexedDB schema
├── domain/                 # TypeScript types
├── engine/
│   ├── compliance/         # SANS 10400/10160 rules, ZBC, legislation, RAG
│   ├── parametric/         # Wall graph, dimensions, component registry
│   ├── rag/                # RAG pipeline, Zimbabwe codes
│   ├── tier1/              # Council package assembly (18-sheet SADC)
│   ├── tier2/              # Generation + typology routing
│   ├── tier3/              # Layout engine, constraint solver
│   ├── standards/          # Room standards authority (§5)
│   ├── closeout/           # SOV, final account, gain/fade, lessons
│   ├── payment/            # P4P + WIPAA calculators
│   ├── dispatch/           # JIT-dispatch procurement engine
│   └── ecosystem/          # Wallet-to-wall, group-buy, TCO, credit notes
├── hooks/                  # Shared React hooks (GLB export, plans)
├── lib/
│   ├── drawings/           # Renderers: plans, elevations, schedules
│   ├── boq/                # Detailed BOQ engine
│   ├── api/                # Local-first API layer (IndexedDB transport)
│   ├── layout/             # Typology router, grid packer, templates
│   ├── geometry/           # Plan transforms, room roles
│   └── i18n/               # Locales (en / sn / nd)
├── pages/                  # Dashboard, ecosystem pages
├── stores/                 # Zustand stores
└── styles/                 # CSS, fonts, brand tokens
```

## 9. Code Conventions

### 9.1 TypeScript

- Strict mode enabled
- No `any` types — use `unknown` and narrow
- Interface-first design
- Export types alongside values

### 9.2 React

- Functional components only
- Hooks for state management
- `React.lazy()` for all route components
- Error boundaries at route level

### 9.3 Naming

- `PascalCase`: Components, interfaces, types
- `camelCase`: Functions, variables, props
- `kebab-case`: File names, CSS classes
- `UPPER_SNAKE_CASE`: Constants

### 9.4 Testing

- Vitest + React Testing Library
- Test files mirror source structure
- `__tests__/` directory for test files
- Descriptive test names: `it('should ...')`

## 10. Deployment

### 10.1 Vercel Configuration

```json
{
  "buildCommand": "NODE_OPTIONS=--max-old-space-size=4096 npm run build:only",
  "framework": "vite",
  "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
  ]
}
```

### 10.2 Git Configuration

```
Remote: https://github.com/securequalitybuilders-art/budget-engineer.git
Branches: main (production — Vercel deploys from here),
          test/deploy-workflow (development),
          master (legacy)
Email: securequalitybuilders.art@gmail.com
Name: Secure Quality Builders
```

## 11. Important Constraints

- **SI 56 of 2025:** Plans must be reviewed by ACZ-registered professionals before submission
- **No backend:** Everything runs in the browser. No server-side processing.
- **No paid APIs:** Only free-tier LLMs (Gemini, Groq, GitHub Models, OpenRouter)
- **Local-first:** IndexedDB for persistence. Service worker for offline support.
- **Council-ready output:** 18-sheet drawing package with title blocks, schedules, compliance certificates
- **All typologies:** Must support residential, institutional, commercial, industrial, mixed-use
- **Zimbabwe primary:** Gweru/Harare/Bulawayo as primary jurisdictions, SANS 10400 as technical standard
