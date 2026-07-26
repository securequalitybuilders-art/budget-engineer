// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseDxfToPlan } from '@/lib/import/dxf-importer'

const RECTANGLE_LINES_DXF = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
0
20
0
30
0
11
5
21
0
31
0
0
LINE
8
0
10
5
20
0
30
0
11
5
21
4
31
0
0
LINE
8
0
10
5
20
4
30
0
11
0
21
4
31
0
0
LINE
8
0
10
0
20
4
30
0
11
0
21
0
31
0
0
ENDSEC
0
EOF`

const CLOSED_LWPOLYLINE_DXF = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
4
70
1
10
1
20
1
10
4
20
1
10
4
20
3
10
1
20
3
0
ENDSEC
0
EOF`

const MM_SCALE_DXF = `0
SECTION
2
ENTITIES
0
LINE
8
0
10
0
20
0
30
0
11
5000
21
0
31
0
0
LINE
8
0
10
5000
20
0
30
0
11
5000
21
4000
31
0
0
LINE
8
0
10
5000
20
4000
30
0
11
0
21
4000
31
0
0
LINE
8
0
10
0
20
4000
30
0
11
0
21
0
31
0
0
ENDSEC
0
EOF`

const EMPTY_DXF = `0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF`

const GARBAGE_INPUT = 'this is not a dxf file'

const DXF_WITH_UNSUPPORTED = `0
SECTION
2
ENTITIES
0
CIRCLE
8
0
10
5
20
5
40
2
0
LINE
8
0
10
0
20
0
30
0
11
3
21
3
31
0
0
ENDSEC
0
EOF`

describe('parseDxfToPlan', () => {
  it('returns a PlanModel with walls > 0 for a rectangle of LINE entities', () => {
    const plan = parseDxfToPlan(RECTANGLE_LINES_DXF)
    expect(plan).not.toBeNull()
    expect(plan!.walls.length).toBeGreaterThanOrEqual(4)
    expect(plan!.width).toBeGreaterThan(0)
    expect(plan!.height).toBeGreaterThan(0)
    expect(plan!.id).toBeTruthy()
  })

  it('has sensible bounding box from LINE rectangle', () => {
    const plan = parseDxfToPlan(RECTANGLE_LINES_DXF)
    expect(plan).not.toBeNull()
    expect(plan!.width).toBeCloseTo(5, 0)
    expect(plan!.height).toBeCloseTo(4, 0)
  })

  it('creates at least one room from a closed LWPOLYLINE', () => {
    const plan = parseDxfToPlan(CLOSED_LWPOLYLINE_DXF)
    expect(plan).not.toBeNull()
    expect(plan!.rooms.length).toBeGreaterThanOrEqual(1)
    expect(plan!.walls.length).toBeGreaterThanOrEqual(4)
    const room = plan!.rooms[0]
    expect(room.width).toBeGreaterThan(0)
    expect(room.height).toBeGreaterThan(0)
  })

  it('applies mm heuristic: 5000x4000 → ~5x4 metres', () => {
    const plan = parseDxfToPlan(MM_SCALE_DXF)
    expect(plan).not.toBeNull()
    expect(plan!.width).toBeCloseTo(5, 0)
    expect(plan!.height).toBeCloseTo(4, 0)
  })

  it('ignores unsupported entity types (CIRCLE) and still parses LINE entities', () => {
    const plan = parseDxfToPlan(DXF_WITH_UNSUPPORTED)
    expect(plan).not.toBeNull()
    expect(plan!.walls.length).toBeGreaterThanOrEqual(1)
  })

  it('returns null for empty/garbage input', () => {
    expect(parseDxfToPlan(EMPTY_DXF)).toBeNull()
    expect(parseDxfToPlan(GARBAGE_INPUT)).toBeNull()
    expect(parseDxfToPlan('')).toBeNull()
  })

  it('does not throw on any input', () => {
    expect(() => parseDxfToPlan(RECTANGLE_LINES_DXF)).not.toThrow()
    expect(() => parseDxfToPlan(EMPTY_DXF)).not.toThrow()
    expect(() => parseDxfToPlan(GARBAGE_INPUT)).not.toThrow()
    expect(() => parseDxfToPlan('')).not.toThrow()
    expect(() => parseDxfToPlan(null as unknown as string)).not.toThrow()
    expect(() => parseDxfToPlan(undefined as unknown as string)).not.toThrow()
  })

  it('returns a valid PlanModel matching domain interface', () => {
    const plan = parseDxfToPlan(RECTANGLE_LINES_DXF)
    expect(plan).not.toBeNull()
    expect(typeof plan!.id).toBe('string')
    expect(typeof plan!.width).toBe('number')
    expect(typeof plan!.height).toBe('number')
    expect(typeof plan!.wallThickness).toBe('number')
    expect(Array.isArray(plan!.rooms)).toBe(true)
    expect(Array.isArray(plan!.walls)).toBe(true)
    expect(Array.isArray(plan!.openings)).toBe(true)
    expect(plan!.scaleLabel).toBe('1:100')
  })
})
