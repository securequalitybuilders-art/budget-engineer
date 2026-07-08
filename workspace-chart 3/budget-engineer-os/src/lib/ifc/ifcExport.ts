import type { CadDocument } from '../../domain/cad';

// Real IFC4 STEP (ISO-10303-21 / .ifc) writer — pure string assembly, no library,
// no network, no paid API. Produces a spatial hierarchy
// (IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey) and per-element proxies
// for walls / slabs / roofs / openings / objects.
//
// To guarantee a lossless round-trip back into the Budget Engineer CAD model, each
// element also carries an IfcPropertySet "Dzenhare_CAD" holding the exact source
// geometry/parameters. Standard IFC viewers ignore these custom props; our importer
// reads them to reconstruct the CadDocument precisely.

const ifcClassFor: Record<string, string> = {
  wall: 'IFCWALLSTANDARDCASE',
  door: 'IFCDOOR',
  window: 'IFCWINDOW',
  block: 'IFCBUILDINGELEMENTPROXY',
};

function nowStamp(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, '');
}

export function buildIfcStep(cad: CadDocument): string {
  let id = 0;
  const lines: string[] = [];
  const ref = (s: string) => `#${s}`;
  const push = (body: string): string => { id += 1; lines.push(`#${id}= ${body};`); return String(id); };

  // ---- header ----
  const header = [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('Budget Engineer OS export'),'2;1');`,
    `FILE_NAME('${cad.name}.ifc','${nowStamp()}',(''),(''),'Budget Engineer OS','Budget Engineer OS','');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
  ];

  // ---- owner/context scaffolding ----
  const person = push("IFCPERSON($,$,'Budget Engineer',$,$,$,$,$)");
  const org = push("IFCORGANIZATION($,'Dzenhare',$,$,$)");
  const personOrg = push(`IFCPERSONANDORGANIZATION(${ref(person)},${ref(org)},$)`);
  const app = push(`IFCAPPLICATION(${ref(org)},'1.0','Budget Engineer OS','BEOS')`);
  const ownerHistory = push(`IFCOWNERHISTORY(${ref(personOrg)},${ref(app)},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`);

  const axis = push("IFCDIRECTION((0.,0.,1.))");
  const refDir = push("IFCDIRECTION((1.,0.,0.))");
  const origin = push("IFCCARTESIANPOINT((0.,0.,0.))");
  const placement = push(`IFCAXIS2PLACEMENT3D(${ref(origin)},${ref(axis)},${ref(refDir)})`);
  const worldCtx = push(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,${ref(placement)},$)`);
  const lenUnit = push("IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)");
  const areaUnit = push("IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)");
  const volUnit = push("IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)");
  const unitAssign = push(`IFCUNITASSIGNMENT((${ref(lenUnit)},${ref(areaUnit)},${ref(volUnit)}))`);
  const projPlacement = push(`IFCLOCALPLACEMENT($,${ref(placement)})`);
  const project = push(`IFCPROJECT('${guid()}',${ref(ownerHistory)},'${cad.name}',$,$,$,$,(${ref(worldCtx)}),${ref(unitAssign)})`);
  const site = push(`IFCSITE('${guid()}',${ref(ownerHistory)},'Site',$,$,${ref(projPlacement)},$,$,.ELEMENT.,$,$,$,$,$)`);
  const building = push(`IFCBUILDING('${guid()}',${ref(ownerHistory)},'${cad.name}',$,$,${ref(projPlacement)},$,$,.ELEMENT.,$,$,$)`);
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(project)},(${ref(site)}))`);
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(site)},(${ref(building)}))`);

  // helper: property set carrying exact CAD JSON for lossless re-import
  function dzenharePset(payload: Record<string, unknown>): string {
    const propRefs = Object.entries(payload).map(([k, v]) => {
      const val = typeof v === 'number' ? `IFCREAL(${Number(v)})` : `IFCTEXT('${escapeStep(String(v))}')`;
      return ref(push(`IFCPROPERTYSINGLEVALUE('${k}',$,${val},$)`));
    });
    return push(`IFCPROPERTYSET('${guid()}',${ref(ownerHistory)},'Dzenhare_CAD',$,(${propRefs.join(',')}))`);
  }

  const fnum = (n: number) => {
    // STEP reals must contain a dot.
    const s = String(Number(n.toFixed(6)));
    return s.includes('.') || s.includes('e') || s.includes('E') ? s : `${s}.`;
  };

  // A 3D local placement at (x,y,z) rotated `angle` radians about Z.
  function localPlacement(x: number, y: number, z: number, angle: number): string {
    const loc = push(`IFCCARTESIANPOINT((${fnum(x)},${fnum(y)},${fnum(z)}))`);
    const dir = push(`IFCDIRECTION((${fnum(Math.cos(angle))},${fnum(Math.sin(angle))},${fnum(0)}))`);
    const ap = push(`IFCAXIS2PLACEMENT3D(${ref(loc)},${ref(axis)},${ref(dir)})`);
    return push(`IFCLOCALPLACEMENT(${ref(projPlacement)},${ref(ap)})`);
  }

  // A rectangular profile (in local XY) extruded `height` along +Z, producing a
  // body shape representation. Returns the IfcProductDefinitionShape ref.
  function boxShape(width: number, depth: number, height: number, originX = 0, originY = 0): string {
    const p2 = push(`IFCCARTESIANPOINT((${fnum(originX)},${fnum(originY)}))`);
    const d2 = push(`IFCDIRECTION((${fnum(1)},${fnum(0)}))`);
    const profPlacement = push(`IFCAXIS2PLACEMENT2D(${ref(p2)},${ref(d2)})`);
    const profile = push(`IFCRECTANGLEPROFILEDEF(.AREA.,$,${ref(profPlacement)},${fnum(width)},${fnum(depth)})`);
    const extrudeDir = push(`IFCDIRECTION((${fnum(0)},${fnum(0)},${fnum(1)}))`);
    const extrudePos = push(`IFCAXIS2PLACEMENT3D(${ref(origin)},${ref(axis)},${ref(refDir)})`);
    const solid = push(`IFCEXTRUDEDAREASOLID(${ref(profile)},${ref(extrudePos)},${ref(extrudeDir)},${fnum(height)})`);
    const shapeRep = push(`IFCSHAPEREPRESENTATION(${ref(worldCtx)},'Body','SweptSolid',(${ref(solid)}))`);
    return push(`IFCPRODUCTDEFINITIONSHAPE($,$,(${ref(shapeRep)}))`);
  }

  const storeyRefs: string[] = [];
  const wallEntityRef = new Map<string, string>(); // cad wall id -> IFC entity id (for voids)
  for (const floor of cad.floors) {
    const storey = push(`IFCBUILDINGSTOREY('${guid()}',${ref(ownerHistory)},'${escapeStep(floor.name)}',$,$,${ref(projPlacement)},$,$,.ELEMENT.,${Number(floor.elevation)})`);
    storeyRefs.push(storey);
    const productRefs: string[] = [];

    const relateProduct = (entityRef: string, pset: string) => {
      productRefs.push(ref(entityRef));
      push(`IFCRELDEFINESBYPROPERTIES('${guid()}',${ref(ownerHistory)},$,$,(${ref(entityRef)}),${ref(pset)})`);
    };

    const floorWalls = cad.walls.filter((x) => x.floorId === floor.id);

    // floor footprint (for slab + roof solids)
    const fxs = floorWalls.flatMap((w) => [w.start.x, w.end.x]);
    const fys = floorWalls.flatMap((w) => [w.start.y, w.end.y]);
    const minX = Math.min(0, ...fxs), maxX = Math.max(0, ...fxs);
    const minY = Math.min(0, ...fys), maxY = Math.max(0, ...fys);
    const fw = Math.max(1, maxX - minX), fd = Math.max(1, maxY - minY);

    for (const w of floorWalls) {
      const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
      const angle = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
      // box profile centred on its long axis, extruded to wall height
      const shape = boxShape(len, w.thickness, w.height);
      const place = localPlacement(w.start.x, w.start.y, floor.elevation, angle);
      const e = push(`${ifcClassFor.wall}('${guid()}',${ref(ownerHistory)},'${escapeStep(w.name)}',$,$,${ref(place)},${ref(shape)},$,$)`);
      wallEntityRef.set(w.id, e);
      relateProduct(e, dzenharePset({ beosType: 'wall', beosId: w.id, x1: w.start.x, y1: w.start.y, x2: w.end.x, y2: w.end.y, thickness: w.thickness, height: w.height, structural: String(Boolean(w.metadata.properties.structural)) }));
    }

    // slab (floor plate) and roof plane as thin extruded boxes
    {
      const slabShape = boxShape(fw, fd, 0.2, fw / 2 + minX - fw / 2, fd / 2 + minY - fd / 2);
      const slabPlace = localPlacement(minX, minY, floor.elevation - 0.2, 0);
      push(`IFCSLAB('${guid()}',${ref(ownerHistory)},'${escapeStep(floor.name)} Slab',$,$,${ref(slabPlace)},${ref(slabShape)},$,.FLOOR.)`);
      const roofShape = boxShape(fw, fd, 0.12, 0, 0);
      const roofPlace = localPlacement(minX, minY, floor.elevation + floor.height, 0);
      push(`IFCROOF('${guid()}',${ref(ownerHistory)},'${escapeStep(floor.name)} Roof',$,$,${ref(roofPlace)},${ref(roofShape)},$,.FLAT_ROOF.)`);
    }

    for (const o of cad.openings.filter((x) => x.floorId === floor.id)) {
      const cls = o.kind === 'door' ? ifcClassFor.door : ifcClassFor.window;
      const wall = floorWalls.find((x) => x.id === o.wallId);
      const oh = (o.headHeight ?? 2.1) - (o.sillHeight ?? 0);
      let px = 0, py = 0, ang = 0;
      if (wall) {
        const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) || 1;
        const t = o.offset / len;
        px = wall.start.x + (wall.end.x - wall.start.x) * t;
        py = wall.start.y + (wall.end.y - wall.start.y) * t;
        ang = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      }
      const z = floor.elevation + (o.sillHeight ?? 0);

      // True boolean void: an IfcOpeningElement whose box is subtracted from the host
      // wall via IfcRelVoidsElement. The void is slightly deeper than wall thickness so
      // the cut passes fully through. The door/window then fills the void.
      const voidDepth = (wall?.thickness ?? 0.3) + 0.1;
      const voidShape = boxShape(o.width, voidDepth, oh);
      const voidPlace = localPlacement(px, py, z, ang);
      const openingEl = push(`IFCOPENINGELEMENT('${guid()}',${ref(ownerHistory)},'Void ${escapeStep(o.name)}',$,$,${ref(voidPlace)},${ref(voidShape)},$,.OPENING.)`);
      const hostRef = wall ? wallEntityRef.get(wall.id) : undefined;
      if (hostRef) push(`IFCRELVOIDSELEMENT('${guid()}',${ref(ownerHistory)},$,$,${ref(hostRef)},${ref(openingEl)})`);

      // The filling door/window product (thin panel within the void).
      const fillShape = boxShape(o.width, 0.1, oh);
      const fillPlace = localPlacement(px, py, z, ang);
      const e = push(`${cls}('${guid()}',${ref(ownerHistory)},'${escapeStep(o.name)}',$,$,${ref(fillPlace)},${ref(fillShape)},$,${Number(oh)},${Number(o.width)})`);
      push(`IFCRELFILLSELEMENT('${guid()}',${ref(ownerHistory)},$,$,${ref(openingEl)},${ref(e)})`);
      relateProduct(e, dzenharePset({ beosType: 'opening', beosId: o.id, wallId: o.wallId, kind: o.kind, offset: o.offset, width: o.width, sillHeight: o.sillHeight ?? 0, headHeight: o.headHeight ?? 2.1 }));
    }
    for (const b of cad.blocks.filter((x) => x.floorId === floor.id)) {
      const h = b.kind === 'stair' || b.kind === 'core' ? 3 : 1;
      const shape = boxShape(b.width, b.depth, h);
      const place = localPlacement(b.position.x, b.position.y, floor.elevation, (b.rotation ?? 0) * Math.PI / 180);
      const e = push(`${ifcClassFor.block}('${guid()}',${ref(ownerHistory)},'${escapeStep(b.name)}',$,$,${ref(place)},${ref(shape)})`);
      relateProduct(e, dzenharePset({ beosType: 'block', beosId: b.id, kind: b.kind, x: b.position.x, y: b.position.y, width: b.width, depth: b.depth, rotation: b.rotation ?? 0 }));
    }

    if (productRefs.length) {
      push(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',${ref(ownerHistory)},$,$,(${productRefs.join(',')}),${ref(storey)})`);
    }
  }
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(building)},(${storeyRefs.map(ref).join(',')}))`);

  lines.push('ENDSEC;', 'END-ISO-10303-21;');
  return [...header, ...lines].join('\n');
}

function escapeStep(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// IFC GlobalId: 22-char base64-ish compressed GUID. A stable pseudo-random one is fine here.
const GUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
function guid(): string {
  let s = '';
  for (let i = 0; i < 22; i += 1) s += GUID_CHARS[Math.floor(Math.random() * 64)];
  return s;
}
