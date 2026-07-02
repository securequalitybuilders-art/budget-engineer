import { describe, it, expect, beforeAll } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db/db';
import {
  saveProjectSnapshot,
  loadProjectSnapshots,
  compareCurrentToSnapshot,
} from '@/services/projectSnapshotService';
import type { DesignOption } from '@/domain/boq';
import type { BoqResult } from '@/adapters/designToBoq';

function makeDesign(overrides?: Partial<DesignOption>): DesignOption {
  return {
    id: 'design-1',
    name: 'Test House',
    grossFloorArea: 120,
    floors: 1,
    buildingType: 'house',
    elements: [
      { id: 'e1', type: 'wall', category: 'wall', name: 'External wall', unit: 'm2', quantity: 96 },
      { id: 'e2', type: 'wall', category: 'wall', name: 'Internal wall', unit: 'm2', quantity: 40 },
    ],
    ...overrides,
  };
}

function makeDesign2(): DesignOption {
  return {
    id: 'design-2',
    name: 'Test House v2',
    grossFloorArea: 150,
    floors: 2,
    buildingType: 'house',
    elements: [
      { id: 'e1', type: 'wall', category: 'wall', name: 'External wall', unit: 'm2', quantity: 120 },
      { id: 'e2', type: 'wall', category: 'wall', name: 'Internal wall', unit: 'm2', quantity: 60 },
      { id: 'e3', type: 'door', category: 'door', name: 'Doors', unit: 'each', quantity: 8 },
    ],
  };
}

function makeBoq(overrides?: Partial<BoqResult>): BoqResult {
  return {
    id: 'boq-1',
    projectId: 'proj-1',
    currency: 'USD',
    items: [],
    summary: { subtotal: 50000, contingency: 5000, professionalFees: 5000, vat: 6000, grandTotal: 66000 },
    assumptions: [],
    quantities: {
      designId: 'design-1',
      designName: 'Test House',
      floors: 1,
      grossFloorArea: 120,
      footprintArea: 80,
      slabArea: 80,
      roofArea: 80,
      externalWallLength: 40,
      internalWallLength: 20,
      externalWallArea: 120,
      internalWallArea: 60,
      partitionArea: 60,
      doorCount: 5,
      windowCount: 4,
      doorArea: 10,
      windowArea: 8,
      openingArea: 18,
      roomCount: 4,
      wetRoomCount: 2,
      kitchenCount: 1,
      bedroomCount: 2,
      clinicRoomCount: 0,
      finishFloorArea: 80,
      serviceZoneArea: 60,
      warnings: [],
    },
    ...overrides,
  };
}

beforeAll(async () => {
  try {
    await db.snapshots.clear();
  } catch {
    // ignore
  }
});

describe('projectSnapshotService', () => {
  // ── saveProjectSnapshot ──
  it('saves a snapshot from design and boq', async () => {
    const saved = await saveProjectSnapshot({
      projectId: 'proj-1',
      design: makeDesign(),
      boq: makeBoq(),
      label: 'v1',
    });
    expect(saved).not.toBeNull();
    expect(saved!.label).toBe('v1');
    expect(saved!.designId).toBe('design-1');
    expect(saved!.grandTotal).toBe(66000);
    expect(saved!.fingerprint.length).toBe(8);
  });

  it('returns null when no design provided', async () => {
    const saved = await saveProjectSnapshot({
      projectId: 'proj-1',
      design: null,
      boq: null,
    });
    expect(saved).toBeNull();
  });

  it('returns null when no projectId', async () => {
    const saved = await saveProjectSnapshot({
      projectId: '',
      design: makeDesign(),
      boq: null,
    });
    expect(saved).toBeNull();
  });

  // ── loadProjectSnapshots ──
  it('loads snapshots for a project', async () => {
    await saveProjectSnapshot({ projectId: 'proj-2', design: makeDesign(), boq: makeBoq(), label: 'snap-a' });
    await saveProjectSnapshot({ projectId: 'proj-2', design: makeDesign(), boq: makeBoq(), label: 'snap-b' });

    const loaded = await loadProjectSnapshots('proj-2');
    expect(loaded.length).toBeGreaterThanOrEqual(2);
    expect(loaded[0].label).toBe('snap-b');
  });

  it('returns empty array for unknown project', async () => {
    const loaded = await loadProjectSnapshots('unknown');
    expect(loaded).toEqual([]);
  });

  it('returns empty array for empty projectId', async () => {
    const loaded = await loadProjectSnapshots('');
    expect(loaded).toEqual([]);
  });

  // ── compareCurrentToSnapshot ──
  it('returns hasComparison false when no snapshot', () => {
    const result = compareCurrentToSnapshot({
      currentDesign: makeDesign(),
      currentBoq: null,
      snapshot: null,
    });
    expect(result.hasComparison).toBe(false);
  });

  it('returns hasComparison false when no current design', () => {
    const snap = {
      id: 's1',
      projectId: 'p1',
      label: 'v1',
      createdAt: new Date().toISOString(),
      designId: 'd1',
      designName: 'Old',
      fingerprint: 'abc12345',
      grossFloorArea: 100,
      floors: 1,
      grandTotal: 50000,
      currency: 'USD',
      quantities: {
        externalWallArea: 100, partitionArea: 50, doorCount: 4, windowCount: 3,
        finishFloorArea: 70, serviceZoneArea: 50, roomCount: 3,
      },
    };
    const result = compareCurrentToSnapshot({
      currentDesign: null,
      currentBoq: null,
      snapshot: snap,
    });
    expect(result.hasComparison).toBe(false);
  });

  it('computes cost delta correctly', () => {
    const snap = {
      id: 's2', projectId: 'p1', label: 'v1', createdAt: new Date().toISOString(),
      designId: 'd1', designName: 'Old', fingerprint: 'abc', grossFloorArea: 100,
      floors: 1, grandTotal: 50000, currency: 'USD',
      quantities: { externalWallArea: 100, partitionArea: 50, doorCount: 4, windowCount: 3, finishFloorArea: 70, serviceZoneArea: 50, roomCount: 3 },
    };
    const result = compareCurrentToSnapshot({
      currentDesign: makeDesign(),
      currentBoq: makeBoq({ summary: { subtotal: 60000, contingency: 6000, professionalFees: 5000, vat: 7100, grandTotal: 78100 } }),
      snapshot: snap,
    });
    expect(result.costDelta).toBe(28100);
    expect(result.costDeltaPercent).toBe(56.2);
  });

  it('no NaN when totals missing', () => {
    const snap = {
      id: 's3', projectId: 'p1', label: 'v1', createdAt: new Date().toISOString(),
      designId: 'd1', designName: 'Old', fingerprint: 'abc', grossFloorArea: 100,
      floors: 1, grandTotal: 0, currency: 'USD',
      quantities: { externalWallArea: 100, partitionArea: 50, doorCount: 4, windowCount: 3, finishFloorArea: 70, serviceZoneArea: 50, roomCount: 3 },
    };
    const result = compareCurrentToSnapshot({
      currentDesign: makeDesign(),
      currentBoq: null,
      snapshot: snap,
    });
    expect(Number.isNaN(result.costDelta)).toBe(false);
    expect(Number.isNaN(result.costDeltaPercent)).toBe(false);
    expect(Number.isNaN(result.areaDelta)).toBe(false);
    expect(Number.isNaN(result.floorDelta)).toBe(false);
    expect(Number.isNaN(result.wallAreaDelta)).toBe(false);
  });

  it('computes quantity deltas correctly', () => {
    const snap = {
      id: 's4', projectId: 'p1', label: 'v1', createdAt: new Date().toISOString(),
      designId: 'd1', designName: 'Old', fingerprint: 'abc', grossFloorArea: 100,
      floors: 1, grandTotal: 40000, currency: 'USD',
      quantities: { externalWallArea: 100, partitionArea: 50, doorCount: 4, windowCount: 3, finishFloorArea: 70, serviceZoneArea: 50, roomCount: 3 },
    };
    const result = compareCurrentToSnapshot({
      currentDesign: makeDesign2(),
      currentBoq: makeBoq(),
      snapshot: snap,
    });
    expect(result.areaDelta).toBe(50);
    expect(result.floorDelta).toBe(1);
    expect(result.doorCountDelta).toBeGreaterThanOrEqual(0);
    expect(result.windowCountDelta).toBeGreaterThanOrEqual(0);
  });

  it('warns when no current BOQ', () => {
    const snap = {
      id: 's5', projectId: 'p1', label: 'v1', createdAt: new Date().toISOString(),
      designId: 'd1', designName: 'Old', fingerprint: 'abc', grossFloorArea: 100,
      floors: 1, grandTotal: 40000, currency: 'USD',
      quantities: { externalWallArea: 100, partitionArea: 50, doorCount: 4, windowCount: 3, finishFloorArea: 70, serviceZoneArea: 50, roomCount: 3 },
    };
    const result = compareCurrentToSnapshot({
      currentDesign: makeDesign(),
      currentBoq: null,
      snapshot: snap,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('No current BOQ');
  });

  // ── roundtrip ──
  it('save/load roundtrip preserves data', async () => {
    const saved = await saveProjectSnapshot({
      projectId: 'proj-roundtrip',
      design: makeDesign({ id: 'rt-1', name: 'Roundtrip Test', grossFloorArea: 200, floors: 2 }),
      boq: makeBoq({ currency: 'ZAR', summary: { subtotal: 100000, contingency: 10000, professionalFees: 8000, vat: 11800, grandTotal: 129800 } }),
      label: 'roundtrip',
    });
    expect(saved).not.toBeNull();

    const loaded = await loadProjectSnapshots('proj-roundtrip');
    expect(loaded.length).toBeGreaterThanOrEqual(1);

    const found = loaded[0];
    expect(found.label).toBe('roundtrip');
    expect(found.designName).toBe('Roundtrip Test');
    expect(found.grossFloorArea).toBe(200);
    expect(found.floors).toBe(2);
    expect(found.grandTotal).toBe(129800);
    expect(found.currency).toBe('ZAR');
    expect(found.fingerprint.length).toBe(8);
  });
});
