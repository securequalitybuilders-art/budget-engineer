export interface TitleBlockMeta {
  project: string;
  drawing: string;
  sheet?: string;
  scale?: string;
  date?: string;
  revision?: string;
  drawnBy?: string;
}

export const TITLE_BLOCK_H = 46;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildTitleBlock(w: number, h: number, meta: TitleBlockMeta): string {
  const y = h - TITLE_BLOCK_H;
  const date = meta.date ?? new Date().toISOString().slice(0, 10);
  const scale = meta.scale ?? '1:100 @ A4';
  const rev = meta.revision ?? 'A';
  const drawnBy = meta.drawnBy ?? 'Budget Engineer Studio';
  const sheet = meta.sheet;

  const c1 = w - 220;
  const c2 = w - 90;

  const p: string[] = [];
  p.push(`<g font-family="Inter,Arial">`);
  p.push(`<rect x="0" y="${y}" width="${w}" height="${TITLE_BLOCK_H}" fill="#0e1830"/>`);
  p.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#d4a574" stroke-width="2"/>`);
  p.push(`<text x="10" y="${y + 18}" fill="#f8fafc" font-size="12" font-weight="700" font-family="'Space Grotesk',Arial">DZENHARE OS</text>`);
  p.push(`<text x="10" y="${y + 34}" fill="#94a3b8" font-size="10">${esc(meta.project)}</text>`);
  p.push(`<text x="${(w / 2).toFixed(0)}" y="${y + 18}" fill="#e2e8f0" font-size="12" font-weight="600" text-anchor="middle">${esc(meta.drawing)}</text>`);
  p.push(`<text x="${(w / 2).toFixed(0)}" y="${y + 34}" fill="#64748b" font-size="9" text-anchor="middle">${esc(drawnBy)}${sheet ? ` · Sheet ${esc(sheet)}` : ''}</text>`);
  p.push(`<line x1="${c1}" y1="${y}" x2="${c1}" y2="${h}" stroke="#24324b" stroke-width="1"/>`);
  p.push(`<line x1="${c2}" y1="${y}" x2="${c2}" y2="${h}" stroke="#24324b" stroke-width="1"/>`);
  p.push(`<text x="${c1 + 8}" y="${y + 18}" fill="#94a3b8" font-size="9">SCALE</text>`);
  p.push(`<text x="${c1 + 8}" y="${y + 32}" fill="#e2e8f0" font-size="11">${esc(scale)}</text>`);
  p.push(`<text x="${c2 + 8}" y="${y + 18}" fill="#94a3b8" font-size="9">REV</text>`);
  p.push(`<text x="${c2 + 8}" y="${y + 34}" fill="#d4a574" font-size="16" font-weight="700">${esc(rev)}</text>`);
  p.push(`<text x="${c1 + 8}" y="${y + 43}" fill="#64748b" font-size="8">${esc(date)}</text>`);
  p.push(`</g>`);
  return p.join('');
}
