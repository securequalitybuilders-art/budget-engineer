import { LW } from './lineweights';

export type LeaderDirection = 'left' | 'right' | 'up' | 'down' | 'auto';

export interface LeaderNote {
  text: string;
  anchorX: number;
  anchorY: number;
  noteX: number;
  noteY: number;
  direction?: LeaderDirection;
  keynoteNumber?: number;
}

export interface KeynoteEntry {
  number: number;
  text: string;
}

function computeAutoDirection(
  anchorX: number, anchorY: number,
  noteX: number, noteY: number,
): LeaderDirection {
  const dx = noteX - anchorX;
  const dy = noteY - anchorY;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function renderLeaderLine(
  anchorX: number, anchorY: number,
  noteX: number, noteY: number,
  printMode: boolean,
  direction?: LeaderDirection,
): string {
  const dir = direction ?? computeAutoDirection(anchorX, anchorY, noteX, noteY);
  const leaderColor = printMode ? '#64748b' : '#94a3b8';
  const dotR = 1.5;

  let midX = (anchorX + noteX) / 2;
  let midY = (anchorY + noteY) / 2;

  if (dir === 'left') midX = Math.min(anchorX, noteX) + Math.abs(noteX - anchorX) * 0.3;
  else if (dir === 'right') midX = Math.min(anchorX, noteX) + Math.abs(noteX - anchorX) * 0.7;
  else if (dir === 'up') midY = Math.min(anchorY, noteY) + Math.abs(noteY - anchorY) * 0.3;
  else if (dir === 'down') midY = Math.min(anchorY, noteY) + Math.abs(noteY - anchorY) * 0.7;

  const parts: string[] = [];

  parts.push(`<circle cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="${dotR.toFixed(1)}" fill="${leaderColor}" stroke="none"/>`);

  parts.push(`<polyline points="${anchorX.toFixed(1)},${anchorY.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)} ${noteX.toFixed(1)},${noteY.toFixed(1)}" fill="none" stroke="${leaderColor}" stroke-width="${LW.HATCH}" />`);

  return parts.join('');
}

export function renderKeynoteCallout(
  keynoteNumber: number,
  anchorX: number, anchorY: number,
  noteX: number, noteY: number,
  printMode: boolean,
  direction?: LeaderDirection,
): string {
  const parts: string[] = [];
  const bubbleFill = printMode ? '#0f172a' : '#0b1220';
  const bubbleStroke = printMode ? '#475569' : '#94a3b8';
  const textFill = printMode ? '#ffffff' : '#e2e8f0';

  parts.push(renderLeaderLine(anchorX, anchorY, noteX, noteY, printMode, direction));

  parts.push(`<circle cx="${noteX.toFixed(1)}" cy="${noteY.toFixed(1)}" r="7" fill="${bubbleFill}" stroke="${bubbleStroke}" stroke-width="1.5"/>`);
  parts.push(`<text x="${noteX.toFixed(1)}" y="${(noteY + 2.5).toFixed(1)}" fill="${textFill}" font-size="7" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${keynoteNumber}</text>`);

  return parts.join('');
}

export function renderConstructionCallout(
  text: string,
  anchorX: number, anchorY: number,
  noteX: number, noteY: number,
  printMode: boolean,
  direction?: LeaderDirection,
): string {
  const parts: string[] = [];
  const textFill = printMode ? '#e2e8f0' : '#94a3b8';

  parts.push(renderLeaderLine(anchorX, anchorY, noteX, noteY, printMode, direction));

  parts.push(`<text x="${noteX.toFixed(1)}" y="${noteY.toFixed(1)}" fill="${textFill}" font-size="6" font-family="Arial,Helvetica,sans-serif">${text}</text>`);

  return parts.join('');
}

export function renderTaggedCallout(
  tag: string,
  text: string,
  anchorX: number, anchorY: number,
  noteX: number, noteY: number,
  printMode: boolean,
  direction?: LeaderDirection,
): string {
  const parts: string[] = [];
  const tagFill = printMode ? '#0f172a' : '#1e293b';
  const tagStroke = printMode ? '#475569' : '#cbd5e1';
  const tagText = printMode ? '#ffffff' : '#e2e8f0';
  const textFill = printMode ? '#e2e8f0' : '#94a3b8';

  parts.push(renderLeaderLine(anchorX, anchorY, noteX, noteY, printMode, direction));

  const rectW = tag.length * 5 + 10;
  parts.push(`<rect x="${(noteX - rectW / 2).toFixed(1)}" y="${(noteY - 7).toFixed(1)}" width="${rectW.toFixed(1)}" height="14" rx="3" fill="${tagFill}" stroke="${tagStroke}" stroke-width="1"/>`);
  parts.push(`<text x="${noteX.toFixed(1)}" y="${(noteY + 3).toFixed(1)}" fill="${tagText}" font-size="7" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${tag}</text>`);

  parts.push(`<text x="${noteX.toFixed(1)}" y="${(noteY + 18).toFixed(1)}" fill="${textFill}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${text}</text>`);

  return parts.join('');
}

export function renderKeynoteSchedule(
  keynotes: KeynoteEntry[],
  x: number, y: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const bg = printMode ? '#f8fafc' : '#0b1220';
  const border = printMode ? '#cbd5e1' : '#24324b';
  const headerFill = printMode ? '#1e293b' : '#e2e8f0';
  const textFill = printMode ? '#475569' : '#94a3b8';
  const rowH = 16;
  const w = 220;
  const h = 24 + keynotes.length * rowH;

  parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" fill="${bg}" stroke="${border}" stroke-width="1" rx="3"/>`);
  parts.push(`<text x="${(x + w / 2).toFixed(1)}" y="${(y + 14).toFixed(1)}" fill="${headerFill}" font-size="9" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">KEYNOTES</text>`);

  for (let i = 0; i < keynotes.length; i++) {
    const ry = y + 24 + i * rowH;
    const numFill = printMode ? '#0f172a' : '#0b1220';
    const numStroke = printMode ? '#475569' : '#94a3b8';
    const numText = printMode ? '#ffffff' : '#e2e8f0';
    parts.push(`<circle cx="${(x + 14).toFixed(1)}" cy="${(ry + 7).toFixed(1)}" r="6" fill="${numFill}" stroke="${numStroke}" stroke-width="1"/>`);
    parts.push(`<text x="${(x + 14).toFixed(1)}" y="${(ry + 10).toFixed(1)}" fill="${numText}" font-size="6" font-weight="bold" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${keynotes[i].number}</text>`);
    parts.push(`<text x="${(x + 26).toFixed(1)}" y="${(ry + 10).toFixed(1)}" fill="${textFill}" font-size="7" font-family="Arial,Helvetica,sans-serif">${keynotes[i].text}</text>`);
  }

  return parts;
}
