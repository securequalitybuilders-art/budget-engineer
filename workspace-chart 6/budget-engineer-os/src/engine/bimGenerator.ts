import {
  BimElement, BimModel, CadDocument, MaterialSystem, Vec2,
} from '../domain/types';

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function bounds(pts: Vec2[]) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  };
}

/**
 * Generate a BIM model from the CAD document.
 * Slab/roof recompute width/depth from wall bounding box; wall length feeds
 * wall quantities — so geometry edits genuinely change quantities & cost.
 */
export function generateBimModel(cad: CadDocument): BimModel {
  const elements: BimElement[] = [];
  const defaultMat: MaterialSystem = cad.materialSystem;

  for (const floor of cad.floors) {
    const floorWalls = cad.walls.filter((w) => w.floorId === floor.id);
    if (floorWalls.length === 0) continue;

    const pts = floorWalls.flatMap((w) => [w.start, w.end]);
    const b = bounds(pts);
    const fw = Math.max(b.maxX - b.minX, 0.01);
    const fd = Math.max(b.maxY - b.minY, 0.01);
    const footprint = fw * fd;

    // Stage 54: a stair on the floor BELOW cuts a stairwell void in this slab.
    const floorIdx = cad.floors.indexOf(floor);
    const floorBelow = floorIdx > 0 ? cad.floors[floorIdx - 1] : null;
    const stairwellStairs = floorBelow
      ? cad.blocks.filter((bl) => bl.floorId === floorBelow.id && bl.kind === 'stair')
      : [];
    const stairwellVoid = stairwellStairs.reduce((s, bl) => s + bl.width * bl.depth, 0);
    const slabArea = Math.max(footprint - stairwellVoid, 0.01);

    // walls
    for (const w of floorWalls) {
      const len = dist(w.start, w.end);
      const mat = (w.metadata.material ?? defaultMat) as MaterialSystem;
      elements.push({
        id: `bim-${w.id}`,
        cadId: w.id,
        type: 'wall',
        floorId: floor.id,
        name: w.name,
        x: Math.min(w.start.x, w.end.x),
        y: Math.min(w.start.y, w.end.y),
        width: Math.abs(w.end.x - w.start.x) || w.thickness,
        depth: Math.abs(w.end.y - w.start.y) || w.thickness,
        height: w.height,
        length: len,
        area: len * w.height,
        metadata: { ...w.metadata, material: mat },
      });

      // structural walls also act as band beams
      if (w.structural) {
        elements.push({
          id: `bim-beam-${w.id}`,
          cadId: `beam-${w.id}`,
          type: 'beam',
          floorId: floor.id,
          name: `Band beam ${w.name}`,
          x: Math.min(w.start.x, w.end.x),
          y: Math.min(w.start.y, w.end.y),
          width: Math.abs(w.end.x - w.start.x),
          depth: Math.abs(w.end.y - w.start.y),
          height: 0.35,
          length: len,
          metadata: {
            ifcClass: 'IfcBeam', category: 'Beams', material: mat, properties: {},
          },
        });
      }
    }

    // slab
    elements.push({
      id: `bim-slab-${floor.id}`,
      cadId: `slab-${floor.id}`,
      type: 'slab',
      floorId: floor.id,
      name: `Floor slab ${floor.name}`,
      x: b.minX, y: b.minY, width: fw, depth: fd, height: 0.2,
      area: slabArea,
      metadata: {
        ifcClass: 'IfcSlab', category: 'Slabs', material: defaultMat,
        properties: stairwellVoid > 0 ? { stairwellVoidM2: Math.round(stairwellVoid * 100) / 100 } : {},
      },
    });

    // Stage 55: trimmer beams framing each stairwell opening in this slab.
    for (const st of stairwellStairs) {
      const trimLen = 2 * (st.width + st.depth); // perimeter of the opening edge
      elements.push({
        id: `bim-trim-${st.id}-${floor.id}`,
        cadId: `trim-${st.id}-${floor.id}`,
        type: 'beam',
        floorId: floor.id,
        name: `Stairwell trimmer (${st.name})`,
        x: st.position.x, y: st.position.y, width: st.width, depth: st.depth,
        height: 0.4, length: trimLen,
        metadata: {
          ifcClass: 'IfcBeam', category: 'Beams', material: defaultMat,
          properties: { role: 'stairwell-trimmer', openingM2: Math.round(st.width * st.depth * 100) / 100 },
        },
      });
    }

    // roof (top floor only)
    const isTop = floor === cad.floors[cad.floors.length - 1];
    if (isTop) {
      elements.push({
        id: `bim-roof-${floor.id}`,
        cadId: `roof-${floor.id}`,
        type: 'roof',
        floorId: floor.id,
        name: `Roof ${floor.name}`,
        x: b.minX, y: b.minY, width: fw, depth: fd, height: 0.15,
        area: footprint,
        metadata: { ifcClass: 'IfcRoof', category: 'Roof', material: defaultMat, properties: {} },
      });
    }

    // openings
    for (const o of cad.openings.filter((o) => o.floorId === floor.id)) {
      const host = floorWalls.find((w) => w.id === o.wallId);
      if (!host) continue;
      const t = o.offset / Math.max(dist(host.start, host.end), 0.01);
      const px = host.start.x + (host.end.x - host.start.x) * t;
      const py = host.start.y + (host.end.y - host.start.y) * t;
      elements.push({
        id: `bim-${o.id}`,
        cadId: o.id,
        type: 'opening',
        floorId: floor.id,
        name: o.name,
        x: px, y: py, width: o.width, depth: host.thickness,
        height: o.kind === 'door' ? 2.1 : 1.2,
        metadata: o.metadata,
      });
    }

    // blocks (furniture + structural columns/beams/footings)
    for (const bl of cad.blocks.filter((bl) => bl.floorId === floor.id)) {
      const mat = (bl.metadata.material ?? defaultMat) as MaterialSystem;
      elements.push({
        id: `bim-${bl.id}`,
        cadId: bl.id,
        type: 'block',
        floorId: floor.id,
        name: bl.name,
        x: bl.position.x, y: bl.position.y,
        width: bl.width, depth: bl.depth, height: 1,
        length: bl.end ? dist(bl.position, bl.end) : undefined,
        metadata: { ...bl.metadata, material: mat },
      });
    }

    // one room zone per floor envelope (interior)
    elements.push({
      id: `bim-zone-${floor.id}`,
      cadId: `zone-${floor.id}`,
      type: 'roomZone',
      floorId: floor.id,
      name: `Zone ${floor.name}`,
      x: b.minX, y: b.minY, width: fw, depth: fd, height: floor.height,
      area: footprint,
      metadata: { ifcClass: 'IfcSpace', category: 'Objects', properties: {} },
    });
  }

  return { id: `bim-${cad.projectId}`, projectId: cad.projectId, name: cad.name, floors: cad.floors, elements };
}
