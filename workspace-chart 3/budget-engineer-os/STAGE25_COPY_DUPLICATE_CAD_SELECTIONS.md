# Stage 25 — Copy / Duplicate CAD Selections

## Objective
Add practical duplication workflows to the 2D CAD editor so designers can quickly create repeated geometry and layout options without re-drawing elements manually.

This stage introduces **selection duplication** for CAD elements using only local application logic and existing open-source infrastructure.

## What changed

### 1) New store action: `duplicateCadSelection(...)`
Updated:
- `src/store/appStore.ts`

Added:
- `duplicateCadSelection(bimIds, dx?, dy?)`

Behavior:
- accepts selected BIM-linked ids such as `bim-w1`, `bim-b1`, `bim-o1`
- duplicates selected walls and blocks
- automatically duplicates wall-hosted openings when their host wall is duplicated
- remaps duplicated openings to the duplicated wall ids
- applies a configurable translation offset (`dx`, `dy`)
- selects the newly created duplicated elements after creation
- persists via the shared `persistCadAndRegen(...)` pipeline
- logs a transaction:
  - `CAD_SELECTION_DUPLICATED`

### 2) Safer ID generation helper
Added helper:
- `shortId(prefix)`

This is now used for new walls/openings and duplicated elements so the code stays consistent and compact.

## 3) CAD plan duplication UI
Updated:
- `src/components/cad/CadPlanView.tsx`

Added a duplication control strip in the CAD editor with:
- **Duplicate ΔX (m)**
- **Duplicate ΔY (m)**
- **Duplicate Selected** button
- keyboard hint panel

This allows users to offset duplicated geometry in a predictable, fabrication-friendly way.

### Keyboard shortcut
Added:
- **Ctrl/Cmd + D** to duplicate the current selection

The shortcut uses the current duplicate offset fields.

## 4) Supported duplication behavior
### Walls
Duplicated walls preserve:
- start/end geometry
- thickness
- height
- metadata
- floor assignment

The copy is translated by the chosen nudge amount and renamed:
- `South Wall` → `South Wall Copy`

### Openings
If a duplicated wall has hosted openings, those openings are duplicated too.

The duplicated openings preserve:
- kind
- width
- offset along wall
- sill/head data
- metadata

Most importantly, they are **relinked to the duplicated wall**, not the source wall.

### Blocks / objects
Duplicated blocks preserve:
- type
- dimensions
- position (offset by duplication nudge)
- metadata
- floor assignment

### Selection state
After duplication, the newly created copies become the active selection set. This makes repeated duplication workflows much faster.

## Scope note
This stage is focused on **duplicate / offset copy** operations, not clipboard integration. It delivers the practical value of copy-paste for design iteration while staying local-first and dependency-free.

## Verification

### Type check
```bash
./node_modules/.bin/tsc --noEmit
```
Passed.

### Focused duplication verification
A temporary verification script duplicated:
- wall `w1`
- block `b1`
- and implicitly the wall-hosted opening on `w1`

with offset:
- `dx = 2m`
- `dy = 1m`

Observed output:

```json
{
  "duplicatedWalls": [
    {
      "id": "w-copy-1",
      "start": { "x": 2, "y": 1 },
      "end": { "x": 14, "y": 1 },
      "name": "South Wall Copy"
    }
  ],
  "duplicatedOpenings": [
    {
      "id": "o-copy-1",
      "wallId": "w-copy-1",
      "name": "Front Door Copy"
    }
  ],
  "duplicatedBlocks": [
    {
      "id": "b-copy-1",
      "position": { "x": 5, "y": 3 },
      "name": "Sofa Copy"
    }
  ],
  "nextSelectedIds": [
    "bim-w-copy-1",
    "bim-o-copy-1",
    "bim-b-copy-1"
  ]
}
```

This confirms:
- duplicated geometry is offset correctly
- hosted openings follow duplicated walls correctly
- new copies become the active selection set

### Production build
```bash
./node_modules/.bin/vite build
```
Passed.

## Enterprise impact
This stage improves Budget Engineer’s real-world authoring speed:
- faster repetitive plan development
- easier option generation
- better support for modular layouts and repeated design patterns
- stronger workflow continuity for CAD → BIM → BOQ regeneration
- clearer transaction history for copied design intent

## Files changed
- `src/store/appStore.ts`
- `src/components/cad/CadPlanView.tsx`
- `src/routes/BimRoute.tsx`

## Result
Stage 25 adds a practical copy workflow to the CAD editor:

- ✅ duplicate selected CAD elements
- ✅ configurable X/Y duplicate offset
- ✅ Ctrl/Cmd + D duplication shortcut
- ✅ duplicated hosted openings follow duplicated walls
- ✅ duplicated elements become the new active selection
- ✅ full CAD → BIM → BOQ regeneration and transaction logging preserved

## Next highest-value options
1. Grouped property edits for selected walls
2. Clipboard-style copy/paste buffers across floors/projects
3. Further reduce deferred 3D viewer payload latency
