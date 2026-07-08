import { CadDocument, CadWall } from '../../domain/cad';

export function parseIfcStep(text: string, projectId: string): CadDocument {
  const doc: CadDocument = {
    id: `cad-${projectId}`,
    projectId,
    name: 'Imported IFC Scheme',
    floors: [{ id: 'floor-1', name: 'Ground Floor', elevation: 0, height: 3.0 }],
    walls: [],
    openings: [],
    blocks: []
  };

  const lines = text.split(/\r?\n/);
  const pSingle = new Map<string, { name: string; val: any }>();
  const pSets = new Map<string, { name: string; props: string[] }>();
  const defByProps: Array<{ elems: string[]; pSetId: string }> = [];

  for (const l of lines) {
    if (!l.startsWith('#')) continue;
    const idx = l.indexOf('=');
    if (idx < 0) continue;
    const id = l.substring(1, idx).trim();
    const body = l.substring(idx + 1).trim();

    if (body.startsWith('IFCBUILDINGSTOREY(')) {
      const parts = body.split(',');
      const sName = parts[2]?.replace(/'/g, '').trim() || `Floor ${id}`;
      if (!doc.floors.some(f => f.id === `floor-${id}`)) {
        doc.floors.push({ id: `floor-${id}`, name: sName, elevation: 0, height: 3.0 });
      }
    } else if (body.startsWith('IFCPROPERTYSINGLEVALUE(')) {
      const parts = body.split(',');
      const pName = parts[0].replace(/IFCPROPERTYSINGLEVALUE\(/, '').replace(/'/g, '').trim();
      const rawVal = parts[2] || '';
      let num = parseFloat(rawVal.replace(/IFCREAL\(/, '').replace(/\)/, ''));
      pSingle.set(id, { name: pName, val: isNaN(num) ? rawVal : num });
    } else if (body.startsWith('IFCPROPERTYSET(')) {
      const pSetName = body.split(',')[2]?.replace(/'/g, '').trim();
      const match = body.match(/\((#[0-9, #]+)\)/);
      const propIds = match ? match[1].replace(/#/g, '').split(',') : [];
      pSets.set(id, { name: pSetName, props: propIds });
    } else if (body.startsWith('IFCRELDEFINESBYPROPERTIES(')) {
      const matchElems = body.match(/\((#[0-9, #]+)\)/);
      const lastHash = body.lastIndexOf('#');
      if (matchElems && lastHash > 0) {
        const elems = matchElems[1].replace(/#/g, '').split(',');
        const pSetId = body.substring(lastHash + 1).replace(/;/, '').trim();
        defByProps.push({ elems, pSetId });
      }
    }
  }

  // Reconstruct exact geometry from Dzenhare_CAD sets
  for (const rel of defByProps) {
    const pSet = pSets.get(rel.pSetId);
    if (!pSet || pSet.name !== 'Dzenhare_CAD') continue;
    const propsMap: Record<string, any> = {};
    for (const pId of pSet.props) {
      const ps = pSingle.get(pId.trim());
      if (ps) propsMap[ps.name] = ps.val;
    }
    for (const elemId of rel.elems) {
      const eid = elemId.trim();
      doc.walls.push({
        id: `w-${eid}`,
        floorId: doc.floors[0].id,
        start: { x: propsMap.startX ?? 0, y: propsMap.startY ?? 0 },
        end: { x: propsMap.endX ?? 10, y: propsMap.endY ?? 0 },
        thickness: propsMap.thickness ?? 0.2,
        height: propsMap.height ?? 3.0,
        name: `Wall #${eid}`,
        structural: propsMap.structural === true || propsMap.structural === '.T.',
        metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: propsMap }
      });
    }
  }

  if (doc.walls.length === 0) {
    // Fallback if generic IFC without Dzenhare_CAD
    doc.walls = [
      { id: 'w-imp-1', floorId: 'floor-1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.2, height: 3.0, name: 'Imported Wall', structural: true, metadata: { ifcClass: 'IfcWall', category: 'Concrete', properties: {} } }
    ];
  }

  return doc;
}
