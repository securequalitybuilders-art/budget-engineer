import { describe, it, expect } from 'vitest';

// ─── presentationSheetModel ───────────────────────────────────────
import { computePresentationLayout } from '@/components/drawings/presentationSheetModel';

describe('presentationSheetModel', () => {
  it('returns 9 cells', () => {
    const layout = computePresentationLayout();
    expect(layout.cells.length).toBe(9);
  });

  it('has A0 dimensions (1682x1188)', () => {
    const layout = computePresentationLayout();
    expect(layout.sheetW).toBe(1682);
    expect(layout.sheetH).toBe(1188);
  });

  it('first cell is front-elevation', () => {
    const layout = computePresentationLayout();
    expect(layout.cells[0].id).toBe('front-elevation');
    expect(layout.cells[0].label).toBe('FRONT ELEVATION');
  });

  it('last cell is mep-overview', () => {
    const layout = computePresentationLayout();
    expect(layout.cells[8].id).toBe('mep-overview');
  });

  it('every cell has positive dimensions', () => {
    const layout = computePresentationLayout();
    for (const c of layout.cells) {
      expect(c.w).toBeGreaterThan(0);
      expect(c.h).toBeGreaterThan(0);
    }
  });

  it('cells are laid out in 3 columns', () => {
    const layout = computePresentationLayout();
    expect(layout.cells[0].x).toBe(layout.cells[3].x); // col 0
    expect(layout.cells[1].x).toBe(layout.cells[4].x); // col 1
    expect(layout.cells[2].x).toBe(layout.cells[5].x); // col 2
  });

  it('second row starts below first row', () => {
    const layout = computePresentationLayout();
    expect(layout.cells[3].y).toBeGreaterThan(layout.cells[0].y + layout.cells[0].h);
  });

  it('cells have unique ids', () => {
    const layout = computePresentationLayout();
    const ids = layout.cells.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all expected cell ids present', () => {
    const layout = computePresentationLayout();
    const ids = layout.cells.map(c => c.id);
    expect(ids).toContain('front-elevation');
    expect(ids).toContain('side-elevation');
    expect(ids).toContain('section');
    expect(ids).toContain('floor-plan');
    expect(ids).toContain('site-plan');
    expect(ids).toContain('foundation');
    expect(ids).toContain('roof-plan');
    expect(ids).toContain('rcp');
    expect(ids).toContain('mep-overview');
  });

  it('cells do not overlap', () => {
    const layout = computePresentationLayout();
    for (let i = 0; i < layout.cells.length; i++) {
      for (let j = i + 1; j < layout.cells.length; j++) {
        const a = layout.cells[i];
        const b = layout.cells[j];
        const noOverlap = a.x + a.w <= b.x || b.x + b.w <= a.x ||
                          a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(noOverlap).toBe(true);
      }
    }
  });

  it('all cells fit within sheet', () => {
    const layout = computePresentationLayout();
    for (const c of layout.cells) {
      expect(c.x + c.w).toBeLessThanOrEqual(layout.sheetW);
      expect(c.y + c.h).toBeLessThanOrEqual(layout.sheetH);
    }
  });
});
