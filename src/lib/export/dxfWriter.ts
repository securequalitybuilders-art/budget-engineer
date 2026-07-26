import type { CadDocument } from '@/domain/cad';
import { getAiaLayer } from '@/lib/drawings/layerStandard';
import type { DisciplineCode } from '@/lib/drawings/layerStandard';

export type DxfExportOptions = {
  discipline?: DisciplineCode;
  scale?: number;
  title?: string;
};

function pair(code: number, value: string | number): string {
  return `${code}\n${value}\n`;
}

function writePoint(x: number, y: number, z = 0): string {
  return pair(10, x) + pair(20, y) + pair(30, z);
}

export function generateDxf(
  doc: CadDocument,
  options: DxfExportOptions = {}
): string {
  const { discipline = 'A', scale = 100 } = options;
  const groups: string[] = [];

  groups.push(
    pair(0, 'SECTION'),
    pair(2, 'HEADER'),
    pair(9, '$ACADVER'),
    pair(1, 'AC1009'),
    pair(9, '$INSUNITS'),
    pair(70, 4),
    pair(0, 'ENDSEC'),
  );

  groups.push(pair(0, 'SECTION'), pair(2, 'TABLES'));
  groups.push(pair(0, 'TABLE'), pair(2, 'LAYER'), pair(70, 8));

  const usedLayers = new Set<string>();
  usedLayers.add('0');

  for (const wall of doc.walls) {
    usedLayers.add(wall.layerId);
    const aia = getAiaLayer(`${discipline}-${wall.layerId.toUpperCase()}`);
    if (aia) usedLayers.add(aia.code);
  }
  for (const opening of doc.openings) {
    const aia = getAiaLayer(`${discipline}-${opening.kind === 'door' ? 'DOOR' : 'GLAZ'}`);
    if (aia) usedLayers.add(aia.code);
  }
  if (doc.annotations.length > 0) {
    const aia = getAiaLayer(`${discipline}-ANNO`);
    if (aia) usedLayers.add(aia.code);
  }

  usedLayers.add(`${discipline}-WALL`);
  usedLayers.add(`${discipline}-DOOR`);
  usedLayers.add(`${discipline}-GLAZ`);
  usedLayers.add(`${discipline}-ANNO`);
  usedLayers.add(`${discipline}-DIMS`);

  let layerIndex = 1;
  for (const layerName of usedLayers) {
    const aia = getAiaLayer(layerName);
    const color = aia ? 7 : layerIndex;
    groups.push(
      pair(0, 'LAYER'),
      pair(2, layerName),
      pair(70, 0),
      pair(62, typeof color === 'number' ? color : 7),
      pair(6, 'CONTINUOUS'),
    );
    layerIndex++;
  }

  groups.push(pair(0, 'ENDTAB'), pair(0, 'ENDSEC'));

  groups.push(pair(0, 'SECTION'), pair(2, 'ENTITIES'));

  const wallLayer = `${discipline}-WALL`;
  for (const wall of doc.walls) {
    const sx = wall.start.x * scale;
    const sy = wall.start.y * scale;
    const ex = wall.end.x * scale;
    const ey = wall.end.y * scale;

    if (wall.thickness > 0.01) {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = (-dy / len) * (wall.thickness / 2) * scale;
        const ny = (dx / len) * (wall.thickness / 2) * scale;
        groups.push(
          pair(0, 'LWPOLYLINE'),
          pair(8, wallLayer),
          pair(90, 4),
          pair(70, 1),
          writePoint(sx + nx, sy + ny),
          writePoint(ex + nx, ey + ny),
          writePoint(ex - nx, ey - ny),
          writePoint(sx - nx, sy - ny),
        );
      }
    } else {
      groups.push(
        pair(0, 'LINE'),
        pair(8, wallLayer),
        writePoint(sx, sy),
        writePoint(ex, ey),
      );
    }
  }

  const doorLayer = `${discipline}-DOOR`;
  for (const opening of doc.openings) {
    if (opening.kind !== 'door') continue;
    const wall = doc.walls.find((w) => w.id === opening.wallId);
    if (!wall) continue;

    const wsx = wall.start.x * scale;
    const wsy = wall.start.y * scale;
    const wex = wall.end.x * scale;
    const wey = wall.end.y * scale;

    const dx = wex - wsx;
    const dy = wey - wsy;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0) {
      const doorWidth = opening.width * scale;
      const startRatio = opening.offsetRatio;
      const doorStartX = wsx + dx * startRatio;
      const doorStartY = wsy + dy * startRatio;
      const doorEndX = doorStartX + (dx / len) * doorWidth;
      const doorEndY = doorStartY + (dy / len) * doorWidth;

      groups.push(
        pair(0, 'LINE'),
        pair(8, doorLayer),
        writePoint(doorStartX, doorStartY),
        writePoint(doorEndX, doorEndY),
      );
    }
  }

  const glazLayer = `${discipline}-GLAZ`;
  for (const opening of doc.openings) {
    if (opening.kind !== 'window') continue;
    const wall = doc.walls.find((w) => w.id === opening.wallId);
    if (!wall) continue;

    const wsx = wall.start.x * scale;
    const wsy = wall.start.y * scale;
    const wex = wall.end.x * scale;
    const wey = wall.end.y * scale;

    const dx = wex - wsx;
    const dy = wey - wsy;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0) {
      const winWidth = opening.width * scale;
      const startRatio = opening.offsetRatio;
      const winStartX = wsx + dx * startRatio;
      const winStartY = wsy + dy * startRatio;
      const winEndX = winStartX + (dx / len) * winWidth;
      const winEndY = winStartY + (dy / len) * winWidth;

      groups.push(
        pair(0, 'LINE'),
        pair(8, glazLayer),
        writePoint(winStartX, winStartY),
        writePoint(winEndX, winEndY),
      );
    }
  }

  const annoLayer = `${discipline}-ANNO`;
  for (const ann of doc.annotations) {
    groups.push(
      pair(0, 'TEXT'),
      pair(8, annoLayer),
      pair(1, ann.text),
      pair(40, 2.5 * scale),
      writePoint(ann.position.x * scale, ann.position.y * scale),
      pair(50, 0),
      pair(72, 1),
      writePoint(ann.position.x * scale, ann.position.y * scale),
    );
  }

  for (const block of doc.blocks) {
    const blockName = block.blockType.toUpperCase();
    groups.push(
      pair(0, 'INSERT'),
      pair(8, `${discipline}-ANNO`),
      pair(2, blockName),
      writePoint(block.position.x * scale, block.position.y * scale),
      pair(41, block.width * scale),
      pair(42, block.height * scale),
      pair(50, block.rotation),
    );
  }

  if (options.title) {
    groups.push(
      pair(0, 'TEXT'),
      pair(8, `${discipline}-TTLB`),
      pair(1, options.title),
      pair(40, 3 * scale),
      writePoint(10 * scale, 10 * scale),
      pair(50, 0),
    );
  }

  groups.push(pair(0, 'ENDSEC'), pair(0, 'EOF'));

  return groups.join('');
}

export function downloadDxf(dxf: string, filename: string): void {
  const blob = new Blob([dxf], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.dxf') ? filename : `${filename}.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
