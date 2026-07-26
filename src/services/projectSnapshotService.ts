import { db } from '@/db/db';
import { uuid } from '@/lib/utils';
import type { DesignOption } from '@/domain/boq';
import type { ProjectSnapshot } from '@/domain/versioning';
import type { BoqResult } from '@/adapters/designToBoq';
import { extractGeometryQuantities } from '@/adapters/geometryQuantitiesAdapter';
import { logTransaction } from './projectPersistenceService';

export interface SnapshotQuantitiesSummary {
  externalWallArea: number;
  partitionArea: number;
  doorCount: number;
  windowCount: number;
  finishFloorArea: number;
  serviceZoneArea: number;
  roomCount: number;
}

export interface ProjectSnapshotRecord {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  designId: string;
  designName: string;
  fingerprint: string;
  grossFloorArea: number;
  floors: number;
  grandTotal: number;
  currency: string;
  quantities: SnapshotQuantitiesSummary;
}

export interface SnapshotComparisonResult {
  hasComparison: boolean;
  costDelta: number;
  costDeltaPercent: number;
  areaDelta: number;
  floorDelta: number;
  wallAreaDelta: number;
  doorCountDelta: number;
  windowCountDelta: number;
  warnings: string[];
}

function clampFinite(n: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100) / 100);
}

function pct(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.round(((a - b) / b) * 10000) / 100;
}

function simpleFingerprint(design: DesignOption): string {
  const parts = [
    design.id,
    design.name,
    design.grossFloorArea.toFixed(2),
    String(design.floors),
    String(design.elements.length),
    design.elements.map((e) => `${e.type}:${e.quantity}`).sort().join(';'),
  ];
  let hash = 5381;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function qtySummary(design: DesignOption | null): SnapshotQuantitiesSummary {
  const q = extractGeometryQuantities(design);
  return {
    externalWallArea: clampFinite(q.externalWallArea),
    partitionArea: clampFinite(q.partitionArea),
    doorCount: clampFinite(q.doorCount),
    windowCount: clampFinite(q.windowCount),
    finishFloorArea: clampFinite(q.finishFloorArea),
    serviceZoneArea: clampFinite(q.serviceZoneArea),
    roomCount: clampFinite(q.roomCount),
  };
}

function recordFromSnapshot(snap: ProjectSnapshot): ProjectSnapshotRecord | null {
  try {
    const data = JSON.parse(snap.notes ?? '{}');
    return {
      id: snap.id,
      projectId: snap.projectId,
      label: snap.name,
      createdAt: snap.timestamp,
      designId: snap.cadId,
      designName: data.designName ?? '',
      fingerprint: data.fingerprint ?? '',
      grossFloorArea: clampFinite(data.grossFloorArea),
      floors: clampFinite(data.floors),
      grandTotal: clampFinite(data.grandTotal),
      currency: data.currency ?? 'USD',
      quantities: {
        externalWallArea: clampFinite(data.externalWallArea),
        partitionArea: clampFinite(data.partitionArea),
        doorCount: clampFinite(data.doorCount),
        windowCount: clampFinite(data.windowCount),
        finishFloorArea: clampFinite(data.finishFloorArea),
        serviceZoneArea: clampFinite(data.serviceZoneArea),
        roomCount: clampFinite(data.roomCount),
      },
    };
  } catch {
    return null;
  }
}

export async function saveProjectSnapshot(input: {
  projectId: string;
  design: DesignOption | null | undefined;
  boq: BoqResult | null | undefined;
  label?: string;
}): Promise<ProjectSnapshotRecord | null> {
  if (!input.projectId || !input.design) return null;
  const design = input.design;
  const boq = input.boq;
  const q = qtySummary(design);

  const snap: ProjectSnapshot = {
    id: uuid(),
    projectId: input.projectId,
    name: input.label ?? `v${new Date().toLocaleDateString('en-CA')}`,
    timestamp: new Date().toISOString(),
    cadId: design.id,
    bimId: '',
    boqId: boq?.id ?? '',
    notes: JSON.stringify({
      designName: design.name,
      fingerprint: simpleFingerprint(design),
      grossFloorArea: design.grossFloorArea,
      floors: design.floors,
      grandTotal: boq?.summary?.grandTotal ?? 0,
      currency: boq?.currency ?? 'USD',
      externalWallArea: q.externalWallArea,
      partitionArea: q.partitionArea,
      doorCount: q.doorCount,
      windowCount: q.windowCount,
      finishFloorArea: q.finishFloorArea,
      serviceZoneArea: q.serviceZoneArea,
      roomCount: q.roomCount,
    }),
  };

  try {
    await db.snapshots.put(snap);
    const record = recordFromSnapshot(snap);
    if (record) {
      await logTransaction(
        input.projectId,
        'CREATE',
        'project',
        snap.id,
        `Snapshot saved: ${record.label}`,
      );
    }
    return record;
  } catch {
    return null;
  }
}

export async function loadProjectSnapshots(projectId: string): Promise<ProjectSnapshotRecord[]> {
  if (!projectId) return [];
  try {
    const raw = await db.snapshots
      .where({ projectId })
      .reverse()
      .sortBy('timestamp');
    return raw.map(recordFromSnapshot).filter((r): r is ProjectSnapshotRecord => r !== null);
  } catch {
    return [];
  }
}

export function compareCurrentToSnapshot(input: {
  currentDesign: DesignOption | null | undefined;
  currentBoq: BoqResult | null | undefined;
  snapshot: ProjectSnapshotRecord | null;
}): SnapshotComparisonResult {
  if (!input.snapshot || !input.currentDesign) {
    return {
      hasComparison: false,
      costDelta: 0,
      costDeltaPercent: 0,
      areaDelta: 0,
      floorDelta: 0,
      wallAreaDelta: 0,
      doorCountDelta: 0,
      windowCountDelta: 0,
      warnings: [],
    };
  }

  const currentBoq = input.currentBoq;
  const currentQty = qtySummary(input.currentDesign);
  const snap = input.snapshot;

  const costDelta = clampFinite((currentBoq?.summary?.grandTotal ?? 0) - snap.grandTotal);
  const costDeltaPercent = pct(currentBoq?.summary?.grandTotal ?? 0, snap.grandTotal);
  const areaDelta = clampFinite(input.currentDesign.grossFloorArea - snap.grossFloorArea);
  const floorDelta = Math.round(clampFinite(input.currentDesign.floors - snap.floors));
  const wallAreaDelta = clampFinite(currentQty.externalWallArea - snap.quantities.externalWallArea);
  const doorCountDelta = Math.round(clampFinite(currentQty.doorCount - snap.quantities.doorCount));
  const windowCountDelta = Math.round(clampFinite(currentQty.windowCount - snap.quantities.windowCount));

  const warnings: string[] = [];
  if (!currentBoq) warnings.push('No current BOQ available — cost delta may be zero');

  return {
    hasComparison: true,
    costDelta,
    costDeltaPercent,
    areaDelta,
    floorDelta,
    wallAreaDelta,
    doorCountDelta,
    windowCountDelta,
    warnings,
  };
}
