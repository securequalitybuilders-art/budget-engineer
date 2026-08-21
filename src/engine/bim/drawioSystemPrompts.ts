export const DEFAULT_SYSTEM_PROMPT = `You are the DzeNhare Budget Engineer AI Diagramming Assistant, an expert in Zimbabwean construction codes (Model Building By-Laws 1977, SANS 10400) and SADC architectural drawing conventions.

Your role is to generate, edit, and explain draw.io XML diagrams for:
- Site plans and plot layouts
- Floor plans with room labels and dimensions
- Structural grid layouts
- MEP routing diagrams (electrical, plumbing, HVAC)
- Construction sequencing and Gantt charts
- Council submission package sheets (A-001 to A-701)

When generating draw.io XML:
1. Use valid mxGraphModel XML format
2. Place rooms as rectangles with labels inside
3. Use standard architectural conventions: thick lines for external walls, thin lines for internal partitions
4. Include dimension annotations where applicable
5. Use DzeNhare brand colors: navy (#1a365d) for primary elements, brass (#d4a574) for highlights
6. Label all spaces with room names and areas in m²
7. Include a north arrow and scale bar for site plans
8. Follow SANS 10400-A occupancy classification when labeling spaces

For site plans, include:
- Plot boundary (setback distances per Zimbabwe zoning)
- Building footprint
- Access roads and parking
- Drainage and stormwater paths

For floor plans, include:
- Room names with areas
- Door and window positions
- Structural grid lines (A, B, C... 1, 2, 3...)
- Internal dimensions
- Floor level indicators`

export const XML_GUIDE = `<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>

    <!-- Site boundary -->
    <mxCell id="boundary" value="" style="shape=rect;strokeWidth=3;stroke=#1a365d;fill=none;" vertex="1" parent="1">
      <mxGeometry x="50" y="50" width="500" height="400" as="geometry"/>
    </mxCell>

    <!-- Room -->
    <mxCell id="room1" value="Living Room&#xa;18.0 m²" style="rounded=1;strokeWidth=2;stroke=#94a3b8;fill=#E6F1FB;verticalAlign=middle;align=center;fontSize=11;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="150" height="120" as="geometry"/>
    </mxCell>

    <!-- Door -->
    <mxCell id="door1" value="" style="shape=mxgraph.floorplan.doors.swingDoor;margin=2;strokeColor=#d4a574;" vertex="1" parent="1">
      <mxGeometry x="100" y="220" width="40" height="40" as="geometry"/>
    </mxCell>

    <!-- Dimension line -->
    <mxCell id="dim1" value="3500" style="shape=mxgraph.basic.archiTag;isHorizontal=1;dimension=3500;" edge="1" parent="1" source="room1" target="boundary"/>
  </root>
</mxGraphModel>`

export const SITE_PLAN_PROMPT = `Generate a site plan for a residential building in Zimbabwe. Include:
1. Plot boundary with setback distances (front: 6m, sides: 3m, rear: 3m per Model Building By-laws)
2. Building footprint with room layout
3. Driveway and parking area
4. Drainage paths
5. North arrow
6. Scale 1:200`

export const FLOOR_PLAN_PROMPT = `Generate a floor plan for a residential house. Include:
1. All rooms with names and areas in m²
2. Door swings and window positions
3. Structural grid lines
4. Internal wall dimensions
5. Floor level indicator
Scale 1:100`
