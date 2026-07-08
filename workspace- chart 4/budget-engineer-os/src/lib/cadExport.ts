import { CadDocument } from '../domain/cad';

export function buildCadDxf(cad: CadDocument, floorId: string): string {
  const floor = cad.floors.find(f => f.id === floorId) || cad.floors[0];
  const walls = cad.walls.filter(w => w.floorId === floor.id);
  
  let out = '0\nSECTION\n2\nENTITIES\n';
  for (const w of walls) {
    out += `0\nLINE\n8\n${w.structural ? 'A-WALL-STRC' : 'A-WALL-PART'}\n10\n${w.start.x}\n20\n${w.start.y}\n30\n0\n11\n${w.end.x}\n21\n${w.end.y}\n31\n0\n`;
  }
  out += '0\nENDSEC\n0\nEOF\n';
  return out;
}

export function buildCadSvg(cad: CadDocument, floorId: string): string {
  const floor = cad.floors.find(f => f.id === floorId) || cad.floors[0];
  const walls = cad.walls.filter(w => w.floorId === floor.id);
  const openings = cad.openings.filter(o => o.floorId === floor.id);
  const blocks = cad.blocks.filter(b => b.floorId === floor.id);

  let paths = '';
  for (const w of walls) {
    paths += `<line x1="${w.start.x}" y1="${w.start.y}" x2="${w.end.x}" y2="${w.end.y}" stroke="${w.structural ? '#1a365d' : '#d4a574'}" stroke-width="${w.thickness}" stroke-linecap="square"/>\n`;
  }
  for (const b of blocks) {
    paths += `<rect x="${b.position.x}" y="${b.position.y}" width="${b.width}" height="${b.depth}" fill="#8B5CF6" opacity="0.7" rx="0.1"/>\n`;
    paths += `<text x="${b.position.x + b.width/2}" y="${b.position.y + b.depth/2 + 0.1}" fill="#f8fafc" font-size="0.3" text-anchor="middle" font-family="JetBrains Mono">${b.name}</text>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 18 14" width="900" height="700" style="background:#0b1220;">
  <rect x="-2" y="-2" width="18" height="14" fill="#0b1220"/>
  <g transform="scale(1, -1) translate(0, -10)">
    ${paths}
  </g>
</svg>`;
}
