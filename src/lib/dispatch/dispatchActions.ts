import { db } from '@/db/db';
import type { Provider } from '@/domain/marketplace';
import type { BOQ } from '@/types';
import type {
  DispatchOrder,
  DispatchOrderLine,
  DispatchRequestInput,
  DispatchState,
  DispatchDispute,
  EscrowHold,
  GeoPoint,
} from '@/domain/dispatch';
import {
  centroid,
  createDispatchOrder,
  gpsUpdate,
  haversineKm,
  orderTotalCents,
  transitionDispatch,
  type MatchableSupplier,
} from '@/engine/dispatch/jitDispatchEngine';
import {
  engineerSignoff,
  escrowSummary,
  gpsVerify,
  holdFunds,
  raiseDispute,
  releaseFunds,
  resolveDispute,
} from '@/engine/dispatch/escrowGateway';
import { supplierScore } from '@/lib/ecosystem/scorecard';

export type DisputeInput = Omit<DispatchDispute, 'id' | 'orderId' | 'raisedAt' | 'resolved'>;

export const DEFAULT_SITE: GeoPoint = { lat: -17.8292, lng: 31.0522 };
export const DEFAULT_TRIGGER_PCT = 90;
export const DEFAULT_CURRENCY = 'USD';

export function siteGeofenceAround(center: GeoPoint = DEFAULT_SITE, sizeDeg = 0.02): GeoPoint[] {
  return [
    { lat: center.lat - sizeDeg, lng: center.lng - sizeDeg },
    { lat: center.lat - sizeDeg, lng: center.lng + sizeDeg },
    { lat: center.lat + sizeDeg, lng: center.lng + sizeDeg },
    { lat: center.lat + sizeDeg, lng: center.lng - sizeDeg },
  ];
}

export function boqToDispatchLines(boq: BOQ): DispatchOrderLine[] {
  return boq.sections.flatMap((s) =>
    s.items.map((item) => ({
      boqLineId: `${boq.id}-${s.id}-${item.id}`,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitCostCents: item.rateCents,
      totalCents: Math.round(item.quantity * item.rateCents),
    })),
  );
}

function providerLocation(p: Provider): GeoPoint {
  const c = p.location.coordinates;
  if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
    return { lat: c[0], lng: c[1] };
  }
  const hash = p.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    lat: DEFAULT_SITE.lat + ((hash % 7) - 3) * 0.06,
    lng: DEFAULT_SITE.lng + ((hash % 5) - 2) * 0.06,
  };
}

export function providerToMatchable(p: Provider, estimatedValueCents = 0): MatchableSupplier {
  const score = supplierScore(p);
  const factor = 1 - Math.min(0.18, Math.max(0, (p.rating - 3) * 0.02 + (p.completedProjects > 5 ? 0.04 : 0)));
  return {
    id: p.id,
    name: p.name,
    location: providerLocation(p),
    quoteCents: estimatedValueCents > 0 ? Math.round(estimatedValueCents * factor) : Math.max(1, (p.totalContractValue ?? 1) * 100),
    rating: p.rating,
    reliabilityScore: score.onTime,
  };
}

export function suppliersToMatchable(providers: Provider[], estimatedValueCents = 0): MatchableSupplier[] {
  return providers.filter((p) => p.type === 'supplier').map((p) => providerToMatchable(p, estimatedValueCents));
}

export function estimateRouteKm(supplier: MatchableSupplier, geofence: GeoPoint[]): number {
  return Math.round(haversineKm(supplier.location, centroid(geofence)) * 10) / 10;
}

export async function listDispatchOrders(): Promise<DispatchOrder[]> {
  return db.dispatchOrders.toArray();
}

export async function listEscrowHolds(): Promise<EscrowHold[]> {
  return db.dispatchHolds.toArray();
}

export async function getDispatchOrder(id: string): Promise<DispatchOrder | undefined> {
  return db.dispatchOrders.get(id);
}

export async function getEscrowHoldForOrder(orderId: string): Promise<EscrowHold | undefined> {
  return db.dispatchHolds.where('orderId').equals(orderId).first();
}

export async function createDispatchFromBoq(params: {
  projectId: string;
  projectName?: string;
  milestoneId?: string;
  milestoneName?: string;
  boq: BOQ;
  provider: Provider;
  triggerPct?: number;
}): Promise<{ order: DispatchOrder; hold: EscrowHold }> {
  const lines = boqToDispatchLines(params.boq);
  if (lines.length === 0) throw new Error('BOQ has no line items to dispatch');
  const totalCents = orderTotalCents(lines);
  const matchable = providerToMatchable(params.provider, totalCents);
  const geofence = siteGeofenceAround();
  const request: DispatchRequestInput = {
    projectId: params.projectId,
    projectName: params.projectName,
    milestoneId: params.milestoneId,
    milestoneName: params.milestoneName,
    supplierId: params.provider.id,
    supplierName: params.provider.name,
    supplierLocation: matchable.location,
    siteGeofence: geofence,
    lines,
    triggerPct: params.triggerPct ?? DEFAULT_TRIGGER_PCT,
    routeKm: estimateRouteKm(matchable, geofence),
  };
  const order = createDispatchOrder(request);
  await db.dispatchOrders.add(order);
  const hold = holdFunds({
    orderId: order.id,
    projectId: params.projectId,
    supplierId: params.provider.id,
    amountCents: order.totalCents,
    currency: DEFAULT_CURRENCY,
  });
  await db.dispatchHolds.add(hold);
  return { order, hold };
}

export async function transitionOrder(id: string, to: DispatchState, note?: string): Promise<DispatchOrder> {
  const order = await db.dispatchOrders.get(id);
  if (!order) throw new Error(`Dispatch ${id} not found`);
  const next = transitionDispatch(order, to, { note });
  await db.dispatchOrders.put(next);
  return next;
}

export async function cancelDispatch(id: string, reason: string): Promise<DispatchOrder> {
  const order = await db.dispatchOrders.get(id);
  if (!order) throw new Error(`Dispatch ${id} not found`);
  const next = transitionDispatch(order, 'cancelled', { cancelReason: reason, note: reason });
  await db.dispatchOrders.put(next);
  return next;
}

export async function simulateGps(
  id: string,
  position: GeoPoint,
): Promise<{ order: DispatchOrder; transition: DispatchState | null }> {
  const order = await db.dispatchOrders.get(id);
  if (!order) throw new Error(`Dispatch ${id} not found`);
  const result = gpsUpdate(order, position);
  if (result.transition) await db.dispatchOrders.put(result.order);
  return result;
}

export async function leaveSupplierYard(id: string): Promise<DispatchState | null> {
  const order = await db.dispatchOrders.get(id);
  if (!order) throw new Error(`Dispatch ${id} not found`);
  const outside = {
    lat: order.supplierLocation.lat + 0.15,
    lng: order.supplierLocation.lng + 0.15,
  };
  const result = await simulateGps(id, outside);
  return result.transition;
}

export async function enterSiteGeofence(id: string): Promise<DispatchState | null> {
  const order = await db.dispatchOrders.get(id);
  if (!order) throw new Error(`Dispatch ${id} not found`);
  const result = await simulateGps(id, centroid(order.siteGeofence));
  return result.transition;
}

export async function verifyAndRelease(
  orderId: string,
  engineerId = 'qs-engineer',
): Promise<{ hold: EscrowHold; order: DispatchOrder }> {
  const order = await db.dispatchOrders.get(orderId);
  const hold = await getEscrowHoldForOrder(orderId);
  if (!order || !hold) throw new Error(`Order or escrow hold for ${orderId} not found`);
  let nextHold = gpsVerify(hold, true);
  nextHold = engineerSignoff(nextHold, engineerId);
  nextHold = releaseFunds(nextHold);
  await db.dispatchHolds.put(nextHold);
  let nextOrder = order;
  if (order.state === 'delivered') {
    nextOrder = transitionDispatch(order, 'verified', { note: 'Delivery accepted' });
    nextOrder = transitionDispatch(nextOrder, 'completed', { note: 'Escrow released after GPS + engineer sign-off' });
  }
  await db.dispatchOrders.put(nextOrder);
  return { hold: nextHold, order: nextOrder };
}

export async function disputeHold(orderId: string, dispute: DisputeInput): Promise<EscrowHold> {
  const hold = await getEscrowHoldForOrder(orderId);
  if (!hold) throw new Error(`Escrow hold for ${orderId} not found`);
  const next = raiseDispute(hold, dispute);
  await db.dispatchHolds.put(next);
  return next;
}

export async function resolveHold(orderId: string): Promise<EscrowHold> {
  const hold = await getEscrowHoldForOrder(orderId);
  if (!hold) throw new Error(`Escrow hold for ${orderId} not found`);
  const next = resolveDispute(hold);
  await db.dispatchHolds.put(next);
  return next;
}

export function isActive(order: DispatchOrder): boolean {
  return order.state !== 'completed' && order.state !== 'cancelled';
}

export function dispatchSummary(orders: DispatchOrder[], holds: EscrowHold[]) {
  const active = orders.filter(isActive);
  const heldValue = active.reduce((s, o) => s + o.totalCents, 0);
  const summary = escrowSummary(holds);
  return {
    total: orders.length,
    active: active.length,
    completed: orders.filter((o) => o.state === 'completed').length,
    cancelled: orders.filter((o) => o.state === 'cancelled').length,
    heldValue,
    releasedValue: summary.totalReleasedCents,
    disputedCount: summary.disputedCount,
  };
}
