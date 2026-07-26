import { describe, it, expect } from 'vitest';

// ─── dxfWriter ────────────────────────────────────────────────────
import { generateDxf, type DxfExportOptions } from '@/lib/export/dxfWriter';
import type { CadDocument, CadWall, CadOpening, CadAnnotation } from '@/domain/cad';

function makeMinimalDoc(overrides?: Partial<CadDocument>): CadDocument {
  return {
    walls: [],
    openings: [],
    annotations: [],
    blocks: [],
    layers: [],
    ...overrides,
  };
}

describe('dxfWriter', () => {
  it('generates DXF string with header', () => {
    const dxf = generateDxf(makeMinimalDoc());
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('HEADER');
    expect(dxf).toContain('ENDSEC');
    expect(dxf).toContain('EOF');
  });

  it('includes layer table', () => {
    const dxf = generateDxf(makeMinimalDoc());
    expect(dxf).toContain('TABLE');
    expect(dxf).toContain('LAYER');
  });

  it('handles walls as LWPOLYLINE when thick', () => {
    const doc = makeMinimalDoc({
      walls: [{
        id: 'w1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 },
        thickness: 20, layerId: 'WALL', type: 'wall',
      }],
    });
    const dxf = generateDxf(doc);
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('A-WALL');
  });

  it('handles thin walls as LINE', () => {
    const doc = makeMinimalDoc({
      walls: [{
        id: 'w1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 },
        thickness: 0, layerId: 'WALL', type: 'wall',
      }],
    });
    const dxf = generateDxf(doc);
    expect(dxf).toContain('LINE');
  });

  it('includes door openings as lines', () => {
    const doc = makeMinimalDoc({
      walls: [{
        id: 'w1', start: { x: 0, y: 0 }, end: { x: 200, y: 0 },
        thickness: 10, layerId: 'WALL', type: 'wall',
      }],
      openings: [{
        id: 'd1', wallId: 'w1', kind: 'door', width: 90,
        height: 210, offsetRatio: 0.3, label: 'D1',
      }],
    });
    const dxf = generateDxf(doc);
    expect(dxf).toContain('A-DOOR');
    expect(dxf).toContain('LINE');
  });

  it('includes window openings as lines', () => {
    const doc = makeMinimalDoc({
      walls: [{
        id: 'w1', start: { x: 0, y: 0 }, end: { x: 300, y: 0 },
        thickness: 10, layerId: 'WALL', type: 'wall',
      }],
      openings: [{
        id: 'w1', wallId: 'w1', kind: 'window', width: 120,
        height: 120, offsetRatio: 0.1, label: 'W1',
      }],
    });
    const dxf = generateDxf(doc);
    expect(dxf).toContain('A-GLAZ');
  });

  it('includes annotations as TEXT entities', () => {
    const doc = makeMinimalDoc({
      annotations: [{
        text: 'Bedroom 1', position: { x: 50, y: 50 },
      }],
    });
    const dxf = generateDxf(doc);
    expect(dxf).toContain('TEXT');
    expect(dxf).toContain('Bedroom 1');
  });

  it('includes INSERTS for blocks', () => {
    const doc = makeMinimalDoc({
      blocks: [{
        blockType: 'SOFA', position: { x: 10, y: 10 },
        width: 1, height: 1, rotation: 0,
      }],
    });
    const dxf = generateDxf(doc);
    expect(dxf).toContain('INSERT');
  });

  it('adds title when provided', () => {
    const dxf = generateDxf(makeMinimalDoc(), { title: 'Floor Plan' });
    expect(dxf).toContain('Floor Plan');
    expect(dxf).toContain('A-TTLB');
  });

  it('uses discipline prefix for layers', () => {
    const dxf = generateDxf(makeMinimalDoc(), { discipline: 'S' });
    expect(dxf).toContain('S-WALL');
    expect(dxf).not.toContain('A-WALL');
  });

  it('applies scale factor', () => {
    const doc = makeMinimalDoc({
      walls: [{
        id: 'w1', start: { x: 1, y: 0 }, end: { x: 2, y: 0 },
        thickness: 0, layerId: 'WALL', type: 'wall',
      }],
    });
    const dxf = generateDxf(doc, { scale: 100 });
    // At scale 100: 10 is 1000
    expect(dxf).toContain('10\n100');
  });
});

// ─── dxfBlocks ────────────────────────────────────────────────────
import { generateBlockDefinitions, generateBlockInsert, getBlockNames } from '@/lib/export/dxfBlocks';

describe('dxfBlocks', () => {
  it('generates BLOCKS section', () => {
    const defs = generateBlockDefinitions();
    expect(defs).toContain('SECTION');
    expect(defs).toContain('BLOCKS');
    expect(defs).toContain('ENDSEC');
  });

  it('includes BLOCK definitions', () => {
    const defs = generateBlockDefinitions();
    expect(defs).toContain('BLOCK');
    expect(defs).toContain('ENDBLK');
  });

  it('generates INSERT for a block instance', () => {
    const insert = generateBlockInsert({
      blockType: 'SOFA', position: { x: 5, y: 5 },
      width: 1, height: 1, rotation: 0,
    }, 100);
    expect(insert).toContain('INSERT');
    expect(insert).toContain('SOFA');
    expect(insert).toContain('10\n500'); // 5 * 100
  });

  it('lists available block names', () => {
    const names = getBlockNames();
    expect(names).toContain('SOFA');
    expect(names).toContain('BED');
    expect(names).toContain('TABLE');
    expect(names).toContain('WC');
    expect(names).toContain('STAIR');
    expect(names).toContain('CORE');
  });
});

// ─── dxfDimensions ────────────────────────────────────────────────
import { generateAlignedDimension, generateLinearDimensionH, generateLinearDimensionV, generateDimensionsBlock } from '@/lib/export/dxfDimensions';
import { getDimensionStyle } from '@/lib/drawings/dimensionStyles';

describe('dxfDimensions', () => {
  const style = getDimensionStyle('Architectural');

  it('generates aligned dimension', () => {
    const d = generateAlignedDimension(0, 0, 100, 0, 20, style);
    expect(d).toContain('DIMENSION');
    expect(d).toContain('100'); // length in mm
  });

  it('returns empty for zero-length', () => {
    const d = generateAlignedDimension(0, 0, 0, 0, 20, style);
    expect(d).toBe('');
  });

  it('generates horizontal linear dimension', () => {
    const d = generateLinearDimensionH(0, 100, 200, 20, style);
    expect(d).toContain('DIMENSION');
    expect(d).toContain('200');
  });

  it('generates vertical linear dimension', () => {
    const d = generateLinearDimensionV(50, 0, 150, 20, style);
    expect(d).toContain('DIMENSION');
    expect(d).toContain('150');
  });

  it('generates dimensions block from multiple exports', () => {
    const block = generateDimensionsBlock([
      { x1: 0, y1: 0, x2: 100, y2: 0, layer: 'A-DIMS', text: '100' },
      { x1: 0, y1: 0, x2: 200, y2: 0, layer: 'A-DIMS', text: '200' },
    ], style);
    expect(block).toContain('100');
    expect(block).toContain('200');
  });
});

// ─── dxfPaperSpace ────────────────────────────────────────────────
import { generateDxfPaperSpace } from '@/lib/export/dxfPaperSpace';

describe('dxfPaperSpace', () => {
  it('generates paper space with header', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4' });
    expect(ps).toContain('HEADER');
    expect(ps).toContain('EOF');
  });

  it('includes VPORT table', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4' });
    expect(ps).toContain('VPORT');
  });

  it('includes layers: 0, TITLE-BLOCK, VIEWPORT, BORDER', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4' });
    expect(ps).toContain('TITLE-BLOCK');
    expect(ps).toContain('VIEWPORT');
    expect(ps).toContain('BORDER');
  });

  it('includes BORDER polyline', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4' });
    expect(ps).toContain('BORDER');
    expect(ps).toContain('LWPOLYLINE');
  });

  it('includes viewport with scale factor', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A3', scale: 50 });
    expect(ps).toContain('VIEWPORT');
    expect(ps).toContain('40\n0.02'); // 1/50 = 0.02
  });

  it('includes title text', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4', title: 'TEST PLAN' });
    expect(ps).toContain('TEST PLAN');
  });

  it('includes project name when provided', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4', projectName: 'My Project' });
    expect(ps).toContain('My Project');
  });

  it('includes sheet number when provided', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4', sheetNumber: 'A-101' });
    expect(ps).toContain('A-101');
  });

  it('includes revision when provided', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4', revision: 'R02' });
    expect(ps).toContain('R02');
  });

  it('uses correct A4 dimensions (297x210)', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A4' });
    expect(ps).toContain('10\n287'); // 297 - 10 margin
    expect(ps).toContain('20\n200'); // 210 - 10 margin
  });

  it('uses correct A3 dimensions (420x297)', () => {
    const ps = generateDxfPaperSpace({ sheetSize: 'A3' });
    expect(ps).toContain('10\n410'); // 420 - 10 = 410
  });
});
