import type { CadDocument, CadWall, CadOpening, CadBlock, CadFloor } from '../../domain/cad';

// IFC4 STEP importer for files produced by ifcExport.ts. It reconstructs the exact
// CadDocument from the embedded "Dzenhare_CAD" property sets. Pure parsing — no library.
//
// Strategy:
// 1) index every #id line
// 2) read IfcPropertySingleValue name/value pairs
// 3) regroup each Dzenhare_CAD IfcPropertySet into one CAD record
// 4) read storeys and spatial containment relationships
// 5) map each imported element back to the original storey/floor that contained it

type PropValue = string | number;

type CadRecord = Record<string, PropValue> & { beosType: PropValue; beosId?: PropValue };

function unquote(s: string): string {
  return s.replace(/^'/, '').replace(/'$/, '').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function parseNumberMaybe(raw: string): PropValue {
  const m = raw.match(/^IFCREAL\(([^)]*)\)$/);
  if (m) return Number(m[1]);
  const t = raw.match(/^IFCTEXT\('?([\s\S]*?)'?\)$/);
  if (t) return unquote(`'${t[1]}'`);
  return unquote(raw);
}

export function parseIfcStep(text: string, projectId: string): CadDocument | null {
  const lineMap = new Map<string, string>();
  const rx = /#(\d+)=\s*([\s\S]*?);/g;
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text)) !== null) lineMap.set(match[1], match[2].trim());
  if (lineMap.size === 0) return null;

  const props = new Map<string, { name: string; value: PropValue }>();
  const propertySetToRecord = new Map<string, CadRecord>();
  const propertySetToElement = new Map<string, string>();

  for (const [pid, body] of lineMap) {
    if (!body.startsWith('IFCPROPERTYSINGLEVALUE(')) continue;
    const inner = body.slice('IFCPROPERTYSINGLEVALUE('.length, -1);
    const args = splitTopLevel(inner);
    const name = unquote(args[0]);
    const value = parseNumberMaybe(args[2]);
    props.set(pid, { name, value });
  }

  for (const [psetId, body] of lineMap) {
    if (!(body.startsWith('IFCPROPERTYSET(') && body.includes("'Dzenhare_CAD'"))) continue;
    const inner = body.slice('IFCPROPERTYSET('.length, -1);
    const args = splitTopLevel(inner);
    const listArg = args[args.length - 1];
    const ids = listArg.replace(/[()]/g, '').split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
    const rec: CadRecord = { beosType: '' };
    for (const refId of ids) {
      const p = props.get(refId);
      if (p) rec[p.name] = p.value;
    }
    if (rec.beosType) propertySetToRecord.set(psetId, rec);
  }

  // Resolve which IFC product each Dzenhare_CAD property set belongs to.
  for (const [, body] of lineMap) {
    if (!body.startsWith('IFCRELDEFINESBYPROPERTIES(')) continue;
    const args = splitTopLevel(body.slice('IFCRELDEFINESBYPROPERTIES('.length, -1));
    const objectList = parseStepRefList(args[4]);
    const propertySetRef = stripRef(args[5]);
    if (!propertySetRef || !propertySetToRecord.has(propertySetRef)) continue;
    for (const objectRef of objectList) propertySetToElement.set(propertySetRef, objectRef);
  }

  const floors: CadFloor[] = [];
  const storeyIdToFloorId = new Map<string, string>();
  for (const [storeyRef, body] of lineMap) {
    if (!body.startsWith('IFCBUILDINGSTOREY(')) continue;
    const args = splitTopLevel(body.slice('IFCBUILDINGSTOREY('.length, -1));
    const name = unquote(args[2]);
    const elevation = Number(args[args.length - 1]) || 0;
    const floorId = `floor-${floors.length + 1}`;
    floors.push({ id: floorId, name, elevation, height: 3 });
    storeyIdToFloorId.set(storeyRef, floorId);
  }
  if (floors.length === 0) {
    floors.push({ id: 'floor-1', name: 'Ground Floor', elevation: 0, height: 3 });
  }

  const defaultFloorId = floors[0].id;
  const elementToFloorId = new Map<string, string>();
  for (const [, body] of lineMap) {
    if (!body.startsWith('IFCRELCONTAINEDINSPATIALSTRUCTURE(')) continue;
    const args = splitTopLevel(body.slice('IFCRELCONTAINEDINSPATIALSTRUCTURE('.length, -1));
    const productRefs = parseStepRefList(args[4]);
    const storeyRef = stripRef(args[5]);
    const floorId = (storeyRef && storeyIdToFloorId.get(storeyRef)) || defaultFloorId;
    for (const productRef of productRefs) elementToFloorId.set(productRef, floorId);
  }

  const walls: CadWall[] = [];
  const openings: CadOpening[] = [];
  const blocks: CadBlock[] = [];

  for (const [psetId, r] of propertySetToRecord) {
    const elementRef = propertySetToElement.get(psetId);
    const floorId = (elementRef && elementToFloorId.get(elementRef)) || defaultFloorId;

    if (r.beosType === 'wall') {
      walls.push({
        id: String(r.beosId),
        floorId,
        start: { x: num(r.x1), y: num(r.y1) },
        end: { x: num(r.x2), y: num(r.y2) },
        thickness: num(r.thickness, 0.2),
        height: num(r.height, 3),
        name: 'Wall',
        metadata: { ifcClass: 'IfcWall', category: 'wall', properties: { structural: String(r.structural) === 'true' } },
      });
    } else if (r.beosType === 'opening') {
      const kind = String(r.kind) === 'window' ? 'window' : 'door';
      openings.push({
        id: String(r.beosId),
        wallId: String(r.wallId),
        floorId,
        kind,
        offset: num(r.offset),
        width: num(r.width, kind === 'door' ? 0.9 : 1.2),
        sillHeight: num(r.sillHeight, 0),
        headHeight: num(r.headHeight, 2.1),
        name: kind === 'door' ? 'Door' : 'Window',
        metadata: { ifcClass: kind === 'door' ? 'IfcDoor' : 'IfcWindow', category: 'opening', properties: { fireRated: false } },
      });
    } else if (r.beosType === 'block') {
      blocks.push({
        id: String(r.beosId),
        floorId,
        kind: (String(r.kind) || 'table') as CadBlock['kind'],
        position: { x: num(r.x), y: num(r.y) },
        width: num(r.width, 1),
        depth: num(r.depth, 1),
        rotation: num(r.rotation, 0),
        name: 'Object',
        metadata: { ifcClass: 'IfcFurniture', category: 'furniture', properties: {} },
      });
    }
  }

  if (walls.length === 0 && openings.length === 0 && blocks.length === 0) return null;

  return { id: `cad-${projectId}`, projectId, name: 'Imported IFC Model', floors, walls, openings, blocks };
}

function stripRef(s: string): string | null {
  const m = s.trim().match(/^#(\d+)$/);
  return m ? m[1] : null;
}

function parseStepRefList(s: string): string[] {
  const inner = s.trim().replace(/^\(/, '').replace(/\)$/, '');
  if (!inner) return [];
  return splitTopLevel(inner).map((part) => stripRef(part)).filter((v): v is string => Boolean(v));
}

function num(v: PropValue | undefined, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Split STEP argument list on top-level commas (ignoring those inside () or '').
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inStr) {
      cur += c;
      if (c === "'" && s[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (c === "'") {
      inStr = true;
      cur += c;
      continue;
    }
    if (c === '(') {
      depth += 1;
      cur += c;
      continue;
    }
    if (c === ')') {
      depth -= 1;
      cur += c;
      continue;
    }
    if (c === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
