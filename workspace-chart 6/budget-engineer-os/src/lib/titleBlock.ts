// ============================================================================
// Stage 57 — Drawing title block (shared SVG group builder, no DOM).
// Returns an SVG fragment for a bottom title strip used by plan & section SVGs.
// ============================================================================

export interface TitleBlockMeta {
  project: string;
  drawing: string;   // e.g. "Floor Plan — Ground Floor"
  sheet?: string;    // e.g. "A-101"
  scale?: string;    // e.g. "1:100 @ A4"
  date?: string;     // ISO or display date
  revision?: string; // e.g. "A"
  drawnBy?: string;
}

export const TITLE_BLOCK_H = 46; // px reserved at the bottom of the drawing

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Build the title-block SVG group spanning the full width `w`, sitting in the
 * bottom `TITLE_BLOCK_H` px of a drawing of total height `h`.
 */
export function buildTitleBlock(w: number, h: number, meta: TitleBlockMeta): string {
  const y = h - TITLE_BLOCK_H;
  const date = meta.date ?? new Date().toISOString().slice(0, 10);
  const scale = meta.scale ?? '1:100 @ A4';
  const rev = meta.revision ?? 'A';
  const drawnBy = meta.drawnBy ?? 'Budget Engineer Studio';
  const sheet = meta.sheet;

  // column x-positions for the right-hand info cells
  const c1 = w - 220; // scale/date column divider
  const c2 = w - 90;  // rev column divider

  const p: string[] = [];
  p.push(`<g font-family="Inter,Arial">`);
  // strip background + top rule
  p.push(`<rect x="0" y="${y}" width="${w}" height="${TITLE_BLOCK_H}" fill="#0e1830"/>`);
  p.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#d4a574" stroke-width="2"/>`);
  // brand + project
  p.push(`<text x="10" y="${y + 18}" fill="#f8fafc" font-size="12" font-weight="700" font-family="'Space Grotesk',Arial">DZENHARE OS</text>`);
  p.push(`<text x="10" y="${y + 34}" fill="#94a3b8" font-size="10">${esc(meta.project)}</text>`);
  // drawing title (centre)
  p.push(`<text x="${(w / 2).toFixed(0)}" y="${y + 18}" fill="#e2e8f0" font-size="12" font-weight="600" text-anchor="middle">${esc(meta.drawing)}</text>`);
  p.push(`<text x="${(w / 2).toFixed(0)}" y="${y + 34}" fill="#64748b" font-size="9" text-anchor="middle">${esc(drawnBy)}${sheet ? ` · Sheet ${esc(sheet)}` : ''}</text>`);
  // vertical dividers for info cells
  p.push(`<line x1="${c1}" y1="${y}" x2="${c1}" y2="${h}" stroke="#24324b" stroke-width="1"/>`);
  p.push(`<line x1="${c2}" y1="${y}" x2="${c2}" y2="${h}" stroke="#24324b" stroke-width="1"/>`);
  // scale + date cell
  p.push(`<text x="${c1 + 8}" y="${y + 18}" fill="#94a3b8" font-size="9">SCALE</text>`);
  p.push(`<text x="${c1 + 8}" y="${y + 32}" fill="#e2e8f0" font-size="11">${esc(scale)}</text>`);
  // rev cell
  p.push(`<text x="${c2 + 8}" y="${y + 18}" fill="#94a3b8" font-size="9">REV</text>`);
  p.push(`<text x="${c2 + 8}" y="${y + 34}" fill="#d4a574" font-size="16" font-weight="700">${esc(rev)}</text>`);
  // date under centre-right
  p.push(`<text x="${c1 + 8}" y="${y + 43}" fill="#64748b" font-size="8">${esc(date)}</text>`);
  p.push(`</g>`);
  return p.join('');
}
