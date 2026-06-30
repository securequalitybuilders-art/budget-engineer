import type { CadDocument } from '../../domain/cad';

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

  const header = [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('Budget Engineer OS export'),'2;1');`,
    `FILE_NAME('${cad.id}.ifc','${nowStamp()}',(''),(''),'Budget Engineer OS','Budget Engineer OS','');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
  ];

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
  const projectRef = push(`IFCPROJECT('${guid()}',${ref(ownerHistory)},'${cad.id}',$,$,$,$,(${ref(worldCtx)}),${ref(unitAssign)})`);
  const siteRef = push(`IFCSITE('${guid()}',${ref(ownerHistory)},'Site',$,$,${ref(projPlacement)},$,$,.ELEMENT.,$,$,$,$,$)`);
  const buildingRef = push(`IFCBUILDING('${guid()}',${ref(ownerHistory)},'${cad.id}',$,$,${ref(projPlacement)},$,$,.ELEMENT.,$,$,$)`);
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(projectRef)},(${ref(siteRef)}))`);
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(siteRef)},(${ref(buildingRef)}))`);

  function dzenharePset(payload: Record<string, unknown>): string {
    const propRefs = Object.entries(payload).map(([k, v]) => {
      const val = typeof v === 'number' ? `IFCREAL(${Number(v)})` : `IFCTEXT('${escapeStep(String(v))}')`;
      return ref(push(`IFCPROPERTYSINGLEVALUE('${k}',$,${val},$)`));
    });
    return push(`IFCPROPERTYSET('${guid()}',${ref(ownerHistory)},'Dzenhare_CAD',$,(${propRefs.join(',')}))`);
  }

  const storeyRefs: string[] = [];
  for (const floor of cad.floors) {
    const storeyRef = push(`IFCBUILDINGSTOREY('${guid()}',${ref(ownerHistory)},'${escapeStep(floor.name)}',$,$,${ref(projPlacement)},$,$,.ELEMENT.,${Number(floor.elevation)})`);
    storeyRefs.push(storeyRef);
    const productRefs: string[] = [];
    const relateProduct = (entityRef: string, pset: string) => {
      productRefs.push(ref(entityRef));
      push(`IFCRELDEFINESBYPROPERTIES('${guid()}',${ref(ownerHistory)},$,$,(${ref(entityRef)}),${ref(pset)})`);
    };
    const floorWalls = cad.walls.filter((x) => x.floorId === floor.id);

    for (const w of floorWalls) {
      const angle = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
      const shape = boxShape();
      const place = localPlacement(w.start.x, w.start.y, floor.elevation, angle);
      const e = push(`${ifcClassFor.wall}('${guid()}',${ref(ownerHistory)},'Wall',$,$,${ref(place)},${ref(shape)},$,$)`);
      relateProduct(e, dzenharePset({ beosType: 'wall', beosId: w.id, x1: w.start.x, y1: w.start.y, x2: w.end.x, y2: w.end.y, thickness: w.thickness, height: 3, structural: w.structuralRole === 'external' }));
    }

    push(`IFCSLAB('${guid()}',${ref(ownerHistory)},'${escapeStep(floor.name)} Slab',$,$,${ref(projPlacement)},$,$,.FLOOR.)`);
    push(`IFCROOF('${guid()}',${ref(ownerHistory)},'${escapeStep(floor.name)} Roof',$,$,${ref(projPlacement)},$,$,.FLAT_ROOF.)`);

    for (const o of cad.openings.filter((x) => x.floorId === floor.id)) {
      const cls = o.kind === 'door' ? ifcClassFor.door : ifcClassFor.window;
      const wall = floorWalls.find((x) => x.id === o.wallId);
      const oh = (o.headHeight ?? 2.1) - (o.sillHeight ?? 0);
      let px = 0, py = 0, ang = 0;
      if (wall) {
        const t = o.offsetRatio;
        px = wall.start.x + (wall.end.x - wall.start.x) * t;
        py = wall.start.y + (wall.end.y - wall.start.y) * t;
        ang = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      }
      const z = floor.elevation + (o.sillHeight ?? 0);
      const voidShape = boxShape(o.width, 0.4, oh);
      const voidPlace = localPlacement(px, py, z, ang);
      const openingEl = push(`IFCOPENINGELEMENT('${guid()}',${ref(ownerHistory)},'Void',$,$,${ref(voidPlace)},${ref(voidShape)},$,.OPENING.)`);
      const fillShape = boxShape(o.width, 0.1, oh);
      const fillPlace = localPlacement(px, py, z, ang);
      const e = push(`${cls}('${guid()}',${ref(ownerHistory)},'${o.kind === 'door' ? 'Door' : 'Window'}',$,$,${ref(fillPlace)},${ref(fillShape)},$,${Number(oh)},${Number(o.width)})`);
      push(`IFCRELVOIDSELEMENT('${guid()}',${ref(ownerHistory)},$,$,...)`);
      push(`IFCRELFILLSELEMENT('${guid()}',${ref(ownerHistory)},$,$,${ref(openingEl)},${ref(e)})`);
      relateProduct(e, dzenharePset({ beosType: 'opening', beosId: o.id, wallId: o.wallId, kind: o.kind, offset: o.offsetRatio, width: o.width, sillHeight: o.sillHeight ?? 0, headHeight: o.headHeight ?? 2.1 }));
    }
    if (productRefs.length) {
      push(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',${ref(ownerHistory)},$,$,(${productRefs.join(',')}),${ref(storeyRef)})`);
    }
  }
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(buildingRef)},(${storeyRefs.map(ref).join(',')}))`);

  lines.push('ENDSEC;', 'END-ISO-10303-21;');
  return [...header, ...lines].join('\n');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function boxShape(_width?: number, _depth?: number, _height?: number): string {
  return `IFCPRODUCTDEFINITIONSHAPE($,$,(${''}))`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function localPlacement(_x: number, _y: number, _z: number, _angle: number): string {
  return `IFCLOCALPLACEMENT($,IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${0},${0},${0})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`;
}

function escapeStep(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const GUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
function guid(): string {
  let s = '';
  for (let i = 0; i < 22; i += 1) s += GUID_CHARS[Math.floor(Math.random() * 64)];
  return s;
}
