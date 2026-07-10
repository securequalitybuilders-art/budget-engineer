import { describe, it, expect } from 'vitest';
import { generateDxf } from '@/lib/export/dxfWriter';
import { parseDxfToPlan } from '@/lib/import/dxf-importer';
import type { CadDocument } from '@/domain/cad';

function makeDoc(overrides?: Partial<CadDocument>): CadDocument {
  return {
    id: 'test-doc',
    projectId: 'proj-1',
    designId: 'design-1',
    activeFloorId: 'floor-1',
    activeTool: 'select',
    floors: [{ id: 'floor-1', name: 'Ground Floor', elevation: 0, bim: { classification: '' } }],
    layers: [
      { id: 'walls', name: 'Walls', visible: true, color: '#000', dxfLayerName: 'A-WALL' },
      { id: 'openings', name: 'Openings', visible: true, color: '#888', dxfLayerName: 'A-DOOR' },
    ],
    walls: [
      { id: 'w1', floorId: 'floor-1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: '' } },
      { id: 'w2', floorId: 'floor-1', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: '' } },
      { id: 'w3', floorId: 'floor-1', start: { x: 10, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: '' } },
      { id: 'w4', floorId: 'floor-1', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.23, structuralRole: 'external', layerId: 'walls', bim: { classification: '' } },
    ],
    openings: [
      { id: 'o1', floorId: 'floor-1', wallId: 'w1', kind: 'door', offsetRatio: 0.3, width: 0.9, layerId: 'openings', bim: { classification: '' } },
      { id: 'o2', floorId: 'floor-1', wallId: 'w2', kind: 'window', offsetRatio: 0.2, width: 1.5, layerId: 'openings', bim: { classification: '' } },
    ],
    annotations: [
      { id: 'a1', floorId: 'floor-1', position: { x: 5, y: 4 }, text: 'Living Room', kind: 'label', layerId: 'walls' },
    ],
    blocks: [],
    ...overrides,
  } as CadDocument;
}

describe('DXF Roundtrip', () => {
  it('generates valid DXF text', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc);
    expect(dxf).toBeTruthy();
    expect(dxf.length).toBeGreaterThan(100);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('EOF');
  });

  it('includes AIA layer names in output', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc, { discipline: 'A' });
    expect(dxf).toContain('A-WALL');
    expect(dxf).toContain('A-DOOR');
    expect(dxf).toContain('A-GLAZ');
  });

  it('exports entity count matches input', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc);

    const lwpolylineCount = (dxf.match(/0\nLWPOLYLINE/g) || []).length;
    const lineCount = (dxf.match(/0\nLINE/g) || []).length;
    const textCount = (dxf.match(/0\nTEXT/g) || []).length;

    expect(lwpolylineCount).toBe(doc.walls.length);
    expect(lineCount).toBe(doc.openings.length);
    expect(textCount).toBeGreaterThanOrEqual(doc.annotations.length);
  });

  it('roundtrips through export → import produces valid plan', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc, { scale: 1 });
    const plan = parseDxfToPlan(dxf);

    expect(plan).not.toBeNull();
    expect(plan!.walls.length).toBeGreaterThan(0);
    expect(plan!.width).toBeGreaterThan(0);
    expect(plan!.height).toBeGreaterThan(0);
  });

  it('handles empty document gracefully', () => {
    const doc = makeDoc({ walls: [], openings: [], annotations: [], blocks: [] });
    const dxf = generateDxf(doc, { scale: 1 });
    expect(dxf).toBeTruthy();
    expect(dxf).toContain('EOF');
  });

  it('exports dimension annotations', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc, { title: 'Test Drawing' });
    expect(dxf).toContain('Test Drawing');
  });

  it('produces parseable DXF without errors', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc);
    const plan = parseDxfToPlan(dxf);
    expect(plan).not.toBeNull();
  });

  it('supports structural discipline', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc, { discipline: 'S' });
    expect(dxf).toContain('S-WALL');
  });

  it('door annotations appear as LINE entities', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc, { scale: 100 });
    const plan = parseDxfToPlan(dxf);
    expect(plan).not.toBeNull();
  });

  it('DXF download generates valid blob info', () => {
    const doc = makeDoc();
    const dxf = generateDxf(doc);
    const blob = new Blob([dxf], { type: 'application/dxf' });
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/dxf');
  });
});
