import { CadDocument } from '../../domain/cad';

export function buildIfcStep(cad: CadDocument): string {
  const dt = new Date().toISOString().replace(/[-:]/g, '').substring(0, 15);
  let id = 100;
  const lines: string[] = [];
  
  function push(ent: string) {
    id++;
    lines.push(`#${id}=${ent};`);
    return id;
  }
  function guid() {
    return '2A' + Math.random().toString(36).substring(2, 12).toUpperCase() + Math.random().toString(36).substring(2, 12).toUpperCase();
  }

  const proj = push(`IFCPROJECT('${guid()}',$,'${cad.name}',$,$,$,$,(),#101)`);
  const site = push(`IFCSITE('${guid()}',$,'Default Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$)`);
  const bldg = push(`IFCBUILDING('${guid()}',$,'Budget Engineer OS Building',$,$,$,$,$,.ELEMENT.,$,$,$)`);
  
  push(`IFCRELAGGREGATES('${guid()}',$,$,$,#${proj},(#${site}))`);
  push(`IFCRELAGGREGATES('${guid()}',$,$,$,#${site},(#${bldg}))`);

  const wallEntityRef = new Map<string, number>();
  const storeyRefs: number[] = [];

  for (const f of cad.floors) {
    const st = push(`IFCBUILDINGSTOREY('${guid()}',$,'${f.name}',$,$,$,$,$,.ELEMENT.,${f.elevation.toFixed(2)})`);
    storeyRefs.push(st);
    push(`IFCRELAGGREGATES('${guid()}',$,$,$,#${bldg},(#${st}))`);

    const fWalls = cad.walls.filter(w => w.floorId === f.id);
    const elemRefs: number[] = [];

    for (const w of fWalls) {
      const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
      const wEnt = push(`IFCWALLSTANDARDCASE('${guid()}',$,'${w.name}',$,$,$,#${st},'${w.id}')`);
      wallEntityRef.set(w.id, wEnt);
      elemRefs.push(wEnt);

      // Custom property set preserving exact SPP lossless geometry
      const p1 = push(`IFCPROPERTYSINGLEVALUE('startX',$,IFCREAL(${w.start.x}),$)`);
      const p2 = push(`IFCPROPERTYSINGLEVALUE('startY',$,IFCREAL(${w.start.y}),$)`);
      const p3 = push(`IFCPROPERTYSINGLEVALUE('endX',$,IFCREAL(${w.end.x}),$)`);
      const p4 = push(`IFCPROPERTYSINGLEVALUE('endY',$,IFCREAL(${w.end.y}),$)`);
      const p5 = push(`IFCPROPERTYSINGLEVALUE('thickness',$,IFCREAL(${w.thickness}),$)`);
      const p6 = push(`IFCPROPERTYSINGLEVALUE('height',$,IFCREAL(${w.height}),$)`);
      const p7 = push(`IFCPROPERTYSINGLEVALUE('structural',$,IFCBOOLEAN(${w.structural ? '.T.' : '.F.'}),$)`);
      const pSet = push(`IFCPROPERTYSET('${guid()}',$,'Dzenhare_CAD',$,(#${p1},#${p2},#${p3},#${p4},#${p5},#${p6},#${p7}))`);
      push(`IFCRELDEFINESBYPROPERTIES('${guid()}',$,$,$,(#${wEnt}),#${pSet})`);
    }

    const fBlocks = cad.blocks.filter(b => b.floorId === f.id);
    for (const b of fBlocks) {
      const isCol = b.kind === 'column' || b.metadata?.ifcClass === 'IfcColumnStandardCase';
      const entName = isCol ? 'IFCCOLUMNSTANDARDCASE' : 'IFCBUILDINGELEMENTPROXY';
      const bEnt = push(`${entName}('${guid()}',$,'${b.name}',$,$,$,#${st},'${b.id}')`);
      elemRefs.push(bEnt);
    }

    if (elemRefs.length > 0) {
      push(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',$,$,$,(#${elemRefs.join(',#')}),#${st})`);
    }
  }

  // Boolean openings
  for (const o of cad.openings) {
    const hostEnt = wallEntityRef.get(o.wallId);
    if (!hostEnt) continue;
    const oEnt = push(`IFCOPENINGELEMENT('${guid()}',$,'${o.name}',$,$,$,$,'${o.id}')`);
    push(`IFCRELVOIDSELEMENT('${guid()}',$,$,$,#${hostEnt},#${oEnt})`);
    const prodEnt = push(`${o.kind === 'door' ? 'IFCDOOR' : 'IFCWINDOW'}('${guid()}',$,'${o.name}',$,$,$,$,'${o.id}')`);
    push(`IFCRELFILLSELEMENT('${guid()}',$,$,$,#${oEnt},#${prodEnt})`);
  }

  const header = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('IFC4 SPP Model'),'2;1');
FILE_NAME('dzenhare-model.ifc','${dt}',('Dzenhare Architect'),('Dzenhare OS'),'Budget Engineer Studio','Vite App','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#101=IFCEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,$,$);
`;

  return header + lines.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n';
}
