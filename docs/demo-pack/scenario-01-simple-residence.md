# Scenario 1: Simple Residence — Demo Residence

## Overview

The primary demo project. A 3-bedroom family house in Harare, Zimbabwe, with an open-plan living/dining/kitchen, master en-suite, family bathroom, guest toilet, and covered patio. Single-storey, ~120m², face brick exterior, aluminium windows, corrugated iron roof.

**Capabilities demonstrated:**
- Brief → Design pipeline (plain English → 3 design options)
- Plan model with 9 rooms, 11 walls, 10 openings
- 2D CAD document with wall and opening layers
- 14-line-item BOQ with ~$42K estimate (Zimbabwe rates)
- 4 project transactions (project, brief, design, BOQ events)
- ZBC 1996 compliance checking

## How to Load

1. Open the app
2. Click "Load Demo Project" on the Home page
3. Once loaded, you'll be taken to the project dashboard
4. The project is named "Demo Residence"

## Walkthrough

### 1. Project Dashboard
- Project status: `costing` (fully progressed)
- See name, region (Zimbabwe), currency (USD), version
- Transaction log shows 4 events: CREATE, UPDATE, AI_GENERATE, CREATE

### 2. Design Options
- **Standard Layout**: 12m × 10m, 120m², 3 bedrooms (default)
- **Compact Design**: 10m × 10m, 100m², 3 bedrooms (economical)
- **Spacious Family Home**: 14m × 10m, 140m², 3 bedrooms (premium)
- Each option has different quantities for walls, slab, roof, foundation, openings

### 3. Plan Model / Floor Plan
- 9 rooms: Living/Dining, Kitchen, Master Bedroom, En-suite, Bedroom 2, Bedroom 3, Family Bathroom, Guest Toilet, Covered Patio
- 11 walls (external + internal)
- 10 openings (doors + windows)
- Scale: 1:100

### 4. BOQ & Cost Breakdown
- 14 items across 4 sections:
  - **Substructure**: Excavation ($375), Strip footing ($1,122)
  - **Superstructure**: Brick walling ($4,620), Slab ($10,200), Roofing ($1,848), Trusses ($960)
  - **Finishes**: Windows ($1,200), Doors ($600), Plastering ($2,112), Floor tiling ($2,500)
  - **MEP**: Plumbing ($2,500), Electrical ($2,000), Paint ($1,320), Ceiling ($2,160)
- Total: ~$34,370 + 10% contingency (~$3,437) = ~$37,807
- Pricing region: Zimbabwe, USD

### 5. CAD Document
- 11 CAD walls matching the plan model
- 10 CAD openings with bim classification
- Layers: walls (brick), openings
- Editable via the CAD panel

### 6. Compliance Checking
- Standards: ZBC 1996
- Cross-reference plan model against building code requirements
- Advisory output (not certification)

### 7. Validation (P1–P5)
- Project should register at P3 (Developed Design — costed, drawn)
- Can progress to P4 with compliance check and governance review
- P5 requires full package export

## Key Metrics

| Metric | Value |
|--------|-------|
| Floor area | 120 m² |
| Bedrooms | 3 |
| Design options | 3 |
| Rooms in plan | 9 |
| Walls | 11 |
| Openings | 10 |
| BOQ items | 14 |
| BOQ total | ~$34,370 |
| Contingency (10%) | ~$3,437 |
| Estimated total | ~$37,807 |

## What to Try Next

1. Switch design options and see how BOQ changes
2. Open the 3D viewer and orbit the model
3. Open the CAD panel and edit a wall or add an opening
4. Run the validation engine to see P1–P5 readiness
5. Take a self-assessment for this project
6. Create a presentation board and export as SVG
7. Browse the Reference Case Library for comparison
