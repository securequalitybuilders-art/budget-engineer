import type { CadDocument, CadWall, CadOpening, CadBlock, Vec2 } from '../domain/cad';
import type { BimModel, BimElement, BimFloor } from '../domain/bim';
function guid(): string { return Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 9); }
function wallLength(w: CadWall): number { const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y; return Math.hypot(dx, dy); }
function wallAngle(w: CadWall): number { return Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x); }
function wallMid(w: CadWall): Vec2 { return { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 }; }
function wallNormal(w: CadWall): Vec2 { const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y, len = Math.hypot(dx, dy) || 1; return { x: -dy / len, y: dx / len }; }
function wallTangent(w: CadWall): Vec2 { const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y, len = Math.hypot(dx, dy) || 1; return { x: dx / len, y: dy / len }; }
function wallBounds(walls: CadWall[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const w of walls) { minX = Math.min(minX, w.start.x, w.end.x); maxX = Math.max(maxX, w.start.x, w.end.x); minY = Math.min(minY, w.start.y, w.end.y); maxY = Math.max(maxY, w.start.y, w.end.y); }
  return { minX, maxX, minY, maxY };
}
export function generateBimModel(cad: CadDocument, projectId: string): BimModel {
  const floors: BimFloor[] = cad.floors.map(f => ({ id: f.id, name: f.name, elevation: f.elevation, height: f.height }));
  const elements: BimElement[] = [];
  const add = (e: BimElement) => elements.push(e);
  for (const f of cad.floors) {
    const fwalls = cad.walls.filter(w => w.floorId === f.id);
    const fopens = cad.openings.filter(o => o.floorId === f.id);
    const fblocks = cad.blocks.filter(b => b.floorId === f.id);
    const bounds = wallBounds(fwalls);
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxY - bounds.minY;
    if (width > 0 && depth > 0) {
      add({ id: `bim-slab-${f.id}`, projectId, floorId: f.id, type: 'slab', cadId: f.id, position: [bounds.minX + width / 2, bounds.minY + depth / 2, f.elevation], rotation: [0, 0, 0], scale: [width, depth, 0.15], metadata: { ifcClass: 'IfcSlab', category: 'Slab' } });
      add({ id: `bim-roof-${f.id}`, projectId, floorId: f.id, type: 'roof', cadId: f.id, position: [bounds.minX + width / 2, bounds.minY + depth / 2, f.elevation + f.height], rotation: [0, 0, 0], scale: [width, depth, 0.12], metadata: { ifcClass: 'IfcRoof', category: 'Roof' } });
    }
    for (const w of fwalls) {
      const len = wallLength(w);
      const mid = wallMid(w);
      const ang = wallAngle(w);
      const th = w.thickness || 0.2;
      const h = w.height || 3;
      add({ id: `bim-${w.id}`, projectId, floorId: f.id, type: 'wall', cadId: w.id, position: [mid.x, mid.y, f.elevation + h / 2], rotation: [0, 0, ang], scale: [len, th, h], metadata: { ifcClass: w.structural ? 'IfcWallStandardCase' : 'IfcWall', category: 'Wall', ...w.metadata } });
    }
    for (const o of fopens) {
      const w = cad.walls.find(ww => ww.id === o.wallId);
      if (!w) continue;
      const t = wallTangent(w);
      const pos = { x: w.start.x + t.x * o.offset, y: w.start.y + t.y * o.offset };
      const ang = wallAngle(w);
      const th = w.thickness || 0.2;
      const sill = o.sillHeight ?? 0;
      const head = o.headHeight ?? 2.1;
      const h = head - sill;
      add({ id: `bim-${o.id}`, projectId, floorId: f.id, type: 'opening', cadId: o.id, position: [pos.x, pos.y, f.elevation + sill + h / 2], rotation: [0, 0, ang], scale: [o.width, th + 0.1, h], metadata: { ifcClass: o.kind === 'door' ? 'IfcDoor' : 'IfcWindow', category: 'Opening' } });
    }
    for (const b of fblocks) {
      if (b.kind === 'footing') {
        const th = b.depth || 0.4;
        add({ id: `bim-${b.id}`, projectId, floorId: f.id, type: 'block', cadId: b.id, position: [b.position.x, b.position.y, f.elevation - th / 2], rotation: [0, 0, b.rotation || 0], scale: [b.width, b.depth, th], metadata: { ifcClass: 'IfcFooting', category: 'Footing' } });
      } else {
        const h = b.kind === 'column' ? 3 : (b.kind === 'stair' || b.kind === 'core') ? 3 : 0.8;
        add({ id: `bim-${b.id}`, projectId, floorId: f.id, type: b.kind === 'column' ? 'column' : 'block', cadId: b.id, position: [b.position.x, b.position.y, f.elevation + h / 2], rotation: [0, 0, b.rotation || 0], scale: [b.width, b.depth, h], metadata: { ifcClass: b.kind === 'column' ? 'IfcBuildingElementProxy' : 'IfcBuildingElementProxy', category: 'Object' } });
      }
    }
    for (const w of fwalls) {
      if (!w.structural) continue;
      const len = wallLength(w);
      const mid = wallMid(w);
      const ang = wallAngle(w);
      const beamDepth = 0.35;
      const beamWidth = 0.25;
      add({ id: `bim-beam-${w.id}`, projectId, floorId: f.id, type: 'beam', cadId: w.id, position: [mid.x, mid.y, f.elevation + (w.height || 3) + 0.175], rotation: [0, 0, ang], scale: [len, beamWidth, beamDepth], metadata: { ifcClass: 'IfcBeam', category: 'Beam' } });
    }
  }
  return { id: `bim-${cad.id}`, projectId, name: cad.name, floors, elements };
}