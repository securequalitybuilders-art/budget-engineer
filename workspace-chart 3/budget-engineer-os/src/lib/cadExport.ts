import type { CadDocument } from '../domain/cad';

// Minimal, dependency-free DXF (R12 ASCII) writer covering LINE entities for
// walls (as centerlines) and rectangles for blocks. DXF R12 is the most widely
// importable interchange format and needs no library — pure string assembly.

function dxfLine(x1: number, y1: number, x2: number, y2: number, layer: string): string {
  return [
    '0', 'LINE',
    '8', layer,
    '10', x1.toFixed(3), '20', y1.toFixed(3), '30', '0.0',
    '11', x2.toFixed(3), '21', y2.toFixed(3), '31', '0.0',
  ].join('\n');
}

function rectLines(cx: number, cy: number, w: number, d: number, layer: string): string {
  const x1 = cx - w / 2, x2 = cx + w / 2, y1 = cy - d / 2, y2 = cy + d / 2;
  return [
    dxfLine(x1, y1, x2, y1, layer),
    dxfLine(x2, y1, x2, y2, layer),
    dxfLine(x2, y2, x1, y2, layer),
    dxfLine(x1, y2, x1, y1, layer),
  ].join('\n');
}

export function buildCadDxf(cad: CadDocument, floorId?: string): string {
  const walls = cad.walls.filter((w) => !floorId || w.floorId === floorId);
  const blocks = cad.blocks.filter((b) => !floorId || b.floorId === floorId);
  const body: string[] = [];
  for (const w of walls) body.push(dxfLine(w.start.x, w.start.y, w.end.x, w.end.y, 'WALLS'));
  for (const b of blocks) body.push(rectLines(b.position.x, b.position.y, b.width, b.depth, 'FURNITURE'));

  return [
    '0', 'SECTION', '2', 'ENTITIES',
    body.join('\n'),
    '0', 'ENDSEC',
    '0', 'EOF',
  ].join('\n');
}

// Self-contained SVG export of the plan (walls + blocks + openings) so the 2D
// drawing can be saved/printed without any runtime. Coordinates are scaled and
// Y is flipped (CAD up = screen up).
export function buildCadSvg(cad: CadDocument, floorId: string, scale = 40, margin = 40): string {
  const walls = cad.walls.filter((w) => w.floorId === floorId);
  const blocks = cad.blocks.filter((b) => b.floorId === floorId);
  const xs = walls.flatMap((w) => [w.start.x, w.end.x]);
  const ys = walls.flatMap((w) => [w.start.y, w.end.y]);
  const maxX = Math.max(1, ...xs);
  const maxY = Math.max(1, ...ys);
  const W = maxX * scale + margin * 2;
  const H = maxY * scale + margin * 2;
  const tx = (x: number) => margin + x * scale;
  const ty = (y: number) => H - margin - y * scale;

  const wallEls = walls
    .map((w) => `<line x1="${tx(w.start.x)}" y1="${ty(w.start.y)}" x2="${tx(w.end.x)}" y2="${ty(w.end.y)}" stroke="#0f172a" stroke-width="${Math.max(2, w.thickness * scale)}" stroke-linecap="round"/>`)
    .join('');
  const blockEls = blocks
    .map((b) => `<rect x="${tx(b.position.x) - (b.width * scale) / 2}" y="${ty(b.position.y) - (b.depth * scale) / 2}" width="${b.width * scale}" height="${b.depth * scale}" fill="#d4a574" fill-opacity="0.4" stroke="#d4a574"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${wallEls}${blockEls}</svg>`;
}
