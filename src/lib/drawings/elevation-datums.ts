import { LW } from './lineweights';

const FONT = 'Arial,Helvetica,sans-serif';

function fmt(n: number): string {
  return n.toFixed(1);
}

export function renderLevelDatum(
  elevation: number,
  label: string,
  x: number,
  y: number,
  isGround: boolean,
  printMode: boolean,
): string[] {
  const col = printMode ? '#475569' : '#94a3b8';
  const textCol = printMode ? '#1e293b' : '#e2e8f0';
  const tickLen = 6;
  const parts: string[] = [];

  const datumSymbol = isGround ? '▼' : '▬';
  const elevText = elevation === 0 ? '±0.000' : `+${elevation.toFixed(3)}`;

  parts.push(`<line x1="${fmt(x - tickLen)}" y1="${fmt(y)}" x2="${fmt(x + tickLen)}" y2="${fmt(y)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);

  parts.push(`<text x="${fmt(x - tickLen - 4)}" y="${fmt(y + 3)}" fill="${textCol}" font-size="7" text-anchor="end" font-family="${FONT}">${datumSymbol} ${elevText} ${label}</text>`);

  return parts;
}

export function renderDatumLine(
  fromX: number,
  toX: number,
  y: number,
  elevation: number,
  label: string,
  printMode: boolean,
): string[] {
  const col = printMode ? '#475569' : '#94a3b8';
  const textCol = printMode ? '#1e293b' : '#e2e8f0';
  const tickLen = 5;
  const parts: string[] = [];

  parts.push(`<line x1="${fmt(fromX)}" y1="${fmt(y)}" x2="${fmt(toX)}" y2="${fmt(y)}" stroke="${col}" stroke-width="${LW.REFERENCE}" stroke-dasharray="2 2"/>`);

  parts.push(`<line x1="${fmt(fromX)}" y1="${fmt(y - tickLen)}" x2="${fmt(fromX)}" y2="${fmt(y + tickLen)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);

  const elevText = elevation === 0 ? '±0.000' : `+${elevation.toFixed(3)}`;
  parts.push(`<text x="${fmt(fromX - 6)}" y="${fmt(y - 4)}" fill="${textCol}" font-size="7" text-anchor="end" font-family="${FONT}">${elevText} ${label}</text>`);

  return parts;
}

export interface DatumLevel {
  elevation: number;
  label: string;
  isGround?: boolean;
}

export function renderDatumColumn(
  levels: DatumLevel[],
  rightX: number,
  sz: (z: number) => number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const col = printMode ? '#475569' : '#94a3b8';

  const sorted = [...levels].sort((a, b) => a.elevation - b.elevation);

  for (let i = 0; i < sorted.length; i++) {
    const lvl = sorted[i];
    const y = sz(lvl.elevation);
    const datum = renderLevelDatum(lvl.elevation, lvl.label, rightX + 40, y, !!lvl.isGround, printMode);
    parts.push(...datum);

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const yNext = sz(next.elevation);
      const midY = (y + yNext) / 2;
      const d = (next.elevation - lvl.elevation);
      parts.push(`<line x1="${fmt(rightX + 40)}" y1="${fmt(y)}" x2="${fmt(rightX + 40)}" y2="${fmt(yNext)}" stroke="${col}" stroke-width="${LW.DIMENSION}"/>`);
      parts.push(`<text x="${fmt(rightX + 44)}" y="${fmt(midY + 3)}" fill="${col}" font-size="7" font-family="${FONT}">${d.toFixed(2)}m</text>`);
    }
  }

  return parts;
}

export function renderOverallHeightNote(
  totalHeight: number,
  storeyCount: number,
  x: number,
  y: number,
  printMode: boolean,
): string {
  const col = printMode ? '#475569' : '#94a3b8';
  return `<text x="${fmt(x)}" y="${fmt(y)}" fill="${col}" font-size="7" text-anchor="end" font-family="${FONT}">Overall height ${totalHeight.toFixed(2)}m · ${storeyCount} storey</text>`;
}

export function renderScaleNote(scale: string, x: number, y: number, printMode: boolean): string {
  const col = printMode ? '#475569' : '#94a3b8';
  return `<text x="${fmt(x)}" y="${fmt(y)}" fill="${col}" font-size="7" font-family="${FONT}">Scale ${scale}</text>`;
}
