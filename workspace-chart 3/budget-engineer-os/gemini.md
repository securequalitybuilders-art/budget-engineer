# gemini.md — Budget Engineer OS Context

You are building Dzenhare Budget Engineer OS as an enterprise-grade computational design platform.

## Product mission
Turn a natural-language building brief into:
1. design options
2. 2D CAD drawings
3. 3D BIM model
4. engineering quantities
5. BOQ
6. export-ready delivery documents

## Non-negotiables
- Prefer open-source and local-first solutions.
- Do not introduce paid API dependencies by default.
- Maintain a deterministic computational chain from geometry to quantity to cost.
- Dark mode is the premium default.
- All enterprise features must be auditable, inspectable, and exportable.
- Every UI improvement must support trust, clarity, and professional delivery.

## Step 3 BIM implementation rules
- The BIM model must be generated from the authoritative CAD/plan source, never as disconnected demo geometry.
- Every BIM element should keep stable IDs and source references.
- Floor switching, selection, and metadata inspection are required.
- Quantities and BOQ references should be linkable from BIM elements.
- Use three.js / react-three-fiber / drei before considering heavier BIM viewers.
- Full IFC export is not required initially; IFC-like JSON staging is acceptable.

## Coding standards
- TypeScript strict mode.
- Small composable modules.
- Clear domain separation: cad, bim, quantity, boq, export.
- Avoid fragile magic numbers without naming them.
- Prefer deterministic heuristics before opaque AI behavior.

## UX standards
- Enterprise dark mode first.
- Dense, elegant, readable control panels.
- No generic white-card startup aesthetic.
- Use the Dzenhare palette and restrained glass/aurora styling.
- Always show system status, selected context, and next action.
