import { describe, it, expect } from 'vitest';
import {
  matchEquipmentToTask,
  buildEquipmentPlan,
  summarizeEquipment,
  transitionEquipment,
} from '@/engine/sitehawk/equipmentScheduling';
import {
  haversineDistanceM,
  isInsideGeofence,
  simulateTruckMovement,
  createTruckLocation,
  createDriver,
  confirmDelivery,
  fleetSummary,
} from '@/engine/sitehawk/fleetManagement';
import {
  createPurchaseOrder,
  createInvoice,
  transitionPo,
  matchInvoiceToPo,
  buildJobCostSummary,
} from '@/engine/sitehawk/realTimeJobCosting';
import type { ScheduleRecord, TruckLocation, FleetDriver } from '@/domain/sitehawk';

const PROJECT = 'test-proj';
const NOW = new Date('2026-08-15T10:00:00Z');

const SCHEDULE: ScheduleRecord = {
  id: 'sched-1',
  projectId: PROJECT,
  wbsCode: '03-210',
  task: 'Concrete foundation slab',
  startDate: '2026-08-15',
  durationDays: 5,
  predecessors: [],
  costCents: 150_00,
  critical: true,
};

const TRUCK: TruckLocation = {
  id: 'truck-1',
  orderId: 'ord-1',
  truckId: 'TRK-01',
  driverName: 'Kudzai',
  supplierName: 'Willdale',
  material: 'Cement 50kg',
  lat: -17.82,
  lng: 31.04,
  heading: 45,
  speedKmh: 60,
  lastPing: NOW.toISOString(),
  geofenced: false,
  geofenceRadiusM: 500,
  etaMinutes: 30,
  status: 'en-route',
};

const DRIVER: FleetDriver = {
  id: 'driver-1',
  projectId: PROJECT,
  name: 'Tinashe',
  phone: '+263771234567',
  truckId: 'TRK-01',
  licenseClass: 'Class 2',
  status: 'idle',
  deliveriesCompleted: 3,
  totalDistanceKm: 245,
};

describe('Equipment scheduling engine', () => {
  it('matches foundation task to excavator', () => {
    const eq = matchEquipmentToTask(SCHEDULE);
    expect(eq).not.toBeNull();
    expect(eq!.type).toBe('Excavator');
  });

  it('matches concrete slab task to mixer', () => {
    const s: ScheduleRecord = { ...SCHEDULE, id: 'sched-1b', wbsCode: '03-300', task: 'Concrete slab pour' };
    const eq = matchEquipmentToTask(s);
    expect(eq).not.toBeNull();
    expect(eq!.type).toBe('Concrete Mixer');
  });

  it('returns null for unmatched task', () => {
    const s: ScheduleRecord = { ...SCHEDULE, wbsCode: '99-999', task: 'Miscellaneous works' };
    expect(matchEquipmentToTask(s)).toBeNull();
  });

  it('builds equipment plan from schedules', () => {
    const plan = buildEquipmentPlan([SCHEDULE], { projectId: PROJECT });
    expect(plan.slots.length).toBeGreaterThanOrEqual(1);
    expect(plan.totalCostCents).toBeGreaterThan(0);
  });

  it('summarizes equipment slots', () => {
    const plan = buildEquipmentPlan([SCHEDULE], { projectId: PROJECT });
    const summary = summarizeEquipment(plan.slots);
    expect(summary.totalSlots).toBeGreaterThanOrEqual(1);
    expect(summary.totalDays).toBeGreaterThanOrEqual(1);
  });

  it('transitions equipment slot status', () => {
    const plan = buildEquipmentPlan([SCHEDULE], { projectId: PROJECT });
    const next = transitionEquipment(plan.slots[0], 'on-site');
    expect(next.status).toBe('on-site');
    expect(next.equipmentType).toBe(plan.slots[0].equipmentType);
  });
});

describe('Fleet management engine', () => {
  it('computes haversine distance', () => {
    const d = haversineDistanceM(-17.8292, 31.0522, -17.83, 31.05);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(1000);
  });

  it('detects geofence inclusion', () => {
    expect(isInsideGeofence(-17.8292, 31.0522, -17.8292, 31.0522, 500)).toBe(true);
  });

  it('detects geofence exclusion', () => {
    expect(isInsideGeofence(-17.80, 31.10, -17.8292, 31.0522, 500)).toBe(false);
  });

  it('simulates truck movement toward site', () => {
    const moved = simulateTruckMovement({
      truck: TRUCK,
      elapsedMinutes: 30,
      siteLat: -17.8292,
      siteLng: 31.0522,
      geofenceRadiusM: 500,
    });
    expect(moved.lat).not.toBe(TRUCK.lat);
    expect(moved.lng).not.toBe(TRUCK.lng);
    expect(typeof moved.etaMinutes).toBe('number');
  });

  it('creates truck location', () => {
    const t = createTruckLocation({
      projectId: PROJECT,
      orderId: 'ord-2',
      truckId: 'TRK-02',
      driverName: 'Tendai',
      supplierName: 'Simcem',
      material: 'Bricks',
      originLat: -17.80,
      originLng: 31.02,
      heading: 90,
      speedKmh: 45,
    });
    expect(t.status).toBe('en-route');
    expect(t.geofenced).toBe(false);
  });

  it('creates driver', () => {
    const d = createDriver({
      projectId: PROJECT,
      name: 'Blessing',
      phone: '+263782345678',
      truckId: 'TRK-03',
      licenseClass: 'Class 1',
    });
    expect(d.status).toBe('idle');
    expect(d.deliveriesCompleted).toBe(0);
  });

  it('confirms delivery', () => {
    const d = confirmDelivery(TRUCK);
    expect(d.status).toBe('unloading');
    expect(d.etaMinutes).toBe(0);
  });

  it('summarizes fleet', () => {
    const s = fleetSummary([DRIVER], [TRUCK]);
    expect(s.totalDrivers).toBe(1);
    expect(s.idle).toBe(1);
    expect(s.trucksTracked).toBe(1);
    expect(s.trucksAtGate).toBe(0);
  });
});

describe('Real-time job costing engine', () => {
  it('creates purchase order', () => {
    const po = createPurchaseOrder({
      projectId: PROJECT,
      poNumber: 'PO-001',
      supplierName: 'Willdale',
      material: 'Cement',
      quantity: 100,
      unit: 'bags',
      unitCostCents: 850,
      now: NOW,
    });
    expect(po.totalCostCents).toBe(85_000);
    expect(po.status).toBe('draft');
  });

  it('transitions PO', () => {
    const po = createPurchaseOrder({
      projectId: PROJECT,
      poNumber: 'PO-002',
      supplierName: 'Willdale',
      material: 'Bricks',
      quantity: 1000,
      unit: 'units',
      unitCostCents: 130,
      now: NOW,
    });
    const issued = transitionPo(po, 'issued', NOW);
    expect(issued.status).toBe('issued');
    expect(issued.issuedAt).toBeTruthy();
  });

  it('creates invoice', () => {
    const inv = createInvoice({
      projectId: PROJECT,
      invoiceRef: 'INV-001',
      poId: null,
      supplierName: 'Willdale',
      amountCents: 85_000,
      taxCents: 12_750,
      now: NOW,
    });
    expect(inv.totalCents).toBe(97_750);
    expect(inv.status).toBe('received');
  });

  it('matches invoice to PO within tolerance', () => {
    const po = createPurchaseOrder({
      projectId: PROJECT,
      poNumber: 'PO-003',
      supplierName: 'Willdale',
      material: 'Cement',
      quantity: 100,
      unit: 'bags',
      unitCostCents: 850,
      now: NOW,
    });
    const inv = createInvoice({
      projectId: PROJECT,
      invoiceRef: 'INV-002',
      poId: po.id,
      supplierName: 'Willdale',
      amountCents: 85_000,
      taxCents: 0,
      now: NOW,
    });
    const result = matchInvoiceToPo(inv, po);
    expect(result.matched).toBe(true);
  });

  it('flags invoice exceeding tolerance', () => {
    const po = createPurchaseOrder({
      projectId: PROJECT,
      poNumber: 'PO-004',
      supplierName: 'Willdale',
      material: 'Cement',
      quantity: 100,
      unit: 'bags',
      unitCostCents: 850,
      now: NOW,
    });
    const inv = createInvoice({
      projectId: PROJECT,
      invoiceRef: 'INV-003',
      poId: po.id,
      supplierName: 'Willdale',
      amountCents: 100_000,
      taxCents: 0,
      now: NOW,
    });
    const result = matchInvoiceToPo(inv, po);
    expect(result.matched).toBe(false);
    expect(result.varianceCents).toBe(15_000);
  });

  it('builds job cost summary', () => {
    const po1 = createPurchaseOrder({ projectId: PROJECT, poNumber: 'PO-005', supplierName: 'A', material: 'X', quantity: 10, unit: 'kg', unitCostCents: 100, now: NOW });
    const po2 = createPurchaseOrder({ projectId: PROJECT, poNumber: 'PO-006', supplierName: 'B', material: 'Y', quantity: 20, unit: 'kg', unitCostCents: 200, now: NOW });
    const inv1 = createInvoice({ projectId: PROJECT, invoiceRef: 'INV-004', poId: po1.id, supplierName: 'A', amountCents: 1000, taxCents: 150, now: NOW });
    const summary = buildJobCostSummary([po1, po2], [inv1]);
    expect(summary.poCount).toBe(2);
    expect(summary.invoiceCount).toBe(1);
    expect(summary.totalPoCostCents).toBe(5000);
    expect(summary.unmatchedPos).toBe(1);
  });
});
