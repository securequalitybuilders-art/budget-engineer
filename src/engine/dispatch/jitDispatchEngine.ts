import type {
  DispatchOrder,
  DispatchOrderLine,
  DispatchRequestInput,
  DispatchState,
  GeoPoint,
  TrackingEvent,
} from '@/domain/dispatch';
import { DISPATCH_FLOW } from '@/domain/dispatch';
import { aggregateMaterialDemand, estimateBulkDiscount } from '@/engine/ecosystem/groupBuy';

const EARTH_RADIUS_KM = 6371;
const DEFAULT_AUTO_TRIGGER_PCT = 90;
const DEFAULT_EXIT_RADIUS_KM = 0.25;

const PRICE_WEIGHT = 0.35;
const DISTANCE_WEIGHT = 0.25;
const RATING_WEIGHT = 0.2;
const RELIABILITY_WEIGHT = 0.2;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

export function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointToSegmentKm(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { lat: a.lat + t * dy, lng: a.lng + t * dx };
  return haversineKm(p, proj);
}

export function distanceToGeofenceKm(point: GeoPoint, polygon: GeoPoint[]): number {
  if (pointInPolygon(point, polygon)) return 0;
  if (polygon.length < 2) return polygon.length === 1 ? haversineKm(point, polygon[0]) : Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    min = Math.min(min, pointToSegmentKm(point, polygon[i], polygon[j]));
  }
  return min;
}

export function estimateEtaMinutes(routeKm: number, avgSpeedKmh = 45): number {
  if (routeKm < 0) return 0;
  return Math.round((routeKm / avgSpeedKmh) * 60);
}

export interface MatchableSupplier {
  id: string;
  name: string;
  location: GeoPoint;
  quoteCents: number;
  rating: number;
  reliabilityScore: number;
}

export interface MatchedSupplier extends MatchableSupplier {
  distanceKm: number;
  etaMinutes: number;
  score: number;
}

export function rankSuppliers(order: Pick<DispatchOrder, 'siteGeofence'>, suppliers: MatchableSupplier[]): MatchedSupplier[] {
  if (suppliers.length === 0) return [];
  const center = centroid(order.siteGeofence);
  const maxDistance = Math.max(1, ...suppliers.map((s) => haversineKm(s.location, center)));
  const maxPrice = Math.max(1, ...suppliers.map((s) => s.quoteCents));
  const scored = suppliers.map((s) => {
    const distanceKm = haversineKm(s.location, center);
    const priceScore = 1 - s.quoteCents / maxPrice;
    const distanceScore = 1 - distanceKm / maxDistance;
    const ratingScore = Math.max(0, Math.min(1, s.rating / 5));
    const reliabilityScore = Math.max(0, Math.min(1, s.reliabilityScore / 100));
    const score =
      PRICE_WEIGHT * priceScore +
      DISTANCE_WEIGHT * distanceScore +
      RATING_WEIGHT * ratingScore +
      RELIABILITY_WEIGHT * reliabilityScore;
    return {
      ...s,
      distanceKm,
      etaMinutes: estimateEtaMinutes(distanceKm),
      score: Math.round(score * 10000) / 10000,
    };
  });
  return scored.sort((a, b) => b.score - a.score);
}

export function matchBestSupplier(order: Pick<DispatchOrder, 'siteGeofence'>, suppliers: MatchableSupplier[]): MatchedSupplier | undefined {
  return rankSuppliers(order, suppliers)[0];
}

export function centroid(polygon: GeoPoint[]): GeoPoint {
  if (polygon.length === 0) return { lat: 0, lng: 0 };
  const sum = polygon.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / polygon.length, lng: sum.lng / polygon.length };
}

export function shouldAutoDispatch(predecessorCompletionPct: number, thresholdPct = DEFAULT_AUTO_TRIGGER_PCT): boolean {
  return predecessorCompletionPct >= thresholdPct;
}

export function lineTotalCents(line: DispatchOrderLine): number {
  return Math.round(line.quantity * line.unitCostCents);
}

export function orderTotalCents(lines: DispatchOrderLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

export function createDispatchOrder(input: DispatchRequestInput): DispatchOrder {
  const now = new Date().toISOString();
  const tracking: TrackingEvent[] = [{ state: 'pending', at: now, note: 'Order broadcast to supplier' }];
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    projectName: input.projectName,
    milestoneId: input.milestoneId,
    milestoneName: input.milestoneName,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    supplierLocation: input.supplierLocation,
    siteGeofence: input.siteGeofence,
    lines: input.lines,
    totalCents: orderTotalCents(input.lines),
    state: 'pending',
    triggerPct: input.triggerPct,
    routeKm: input.routeKm,
    etaMinutes: input.etaMinutes,
    createdAt: now,
    tracking,
  };
}

export function autoTriggerOrders(
  predecessorCompletionPct: number,
  requests: DispatchRequestInput[],
  thresholdPct = DEFAULT_AUTO_TRIGGER_PCT,
): DispatchOrder[] {
  if (!shouldAutoDispatch(predecessorCompletionPct, thresholdPct)) return [];
  return requests.map(createDispatchOrder);
}

const LEGAL_TRANSITIONS: Record<DispatchState, DispatchState[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['en-route', 'cancelled'],
  'en-route': ['arrived', 'cancelled'],
  arrived: ['delivered'],
  delivered: ['verified'],
  verified: ['completed'],
  completed: [],
  cancelled: [],
};

const TIMESTAMP_KEY: Record<DispatchState, keyof DispatchOrder> = {
  pending: 'createdAt',
  accepted: 'acceptedAt',
  'en-route': 'enRouteAt',
  arrived: 'arrivedAt',
  delivered: 'deliveredAt',
  verified: 'verifiedAt',
  completed: 'completedAt',
  cancelled: 'cancelReason',
};

export function transitionDispatch(
  order: DispatchOrder,
  to: DispatchState,
  opts: { note?: string; cancelReason?: string } = {},
): DispatchOrder {
  if (to === order.state) return order;
  if (!LEGAL_TRANSITIONS[order.state].includes(to)) {
    throw new Error(`Illegal dispatch transition ${order.state} -> ${to}`);
  }
  const now = new Date().toISOString();
  const next: DispatchOrder = {
    ...order,
    state: to,
    ...(opts.cancelReason ? { cancelReason: opts.cancelReason } : {}),
    tracking: [...order.tracking, { state: to, at: now, note: opts.note }],
  };
  const key = TIMESTAMP_KEY[to];
  if (key === 'cancelReason') {
    next.cancelReason = next.cancelReason ?? opts.cancelReason ?? 'Cancelled';
  } else if (typeof key === 'string') {
    (next as unknown as Record<string, unknown>)[key] = now;
  }
  return next;
}

export interface GpsUpdateResult {
  order: DispatchOrder;
  transition: DispatchState | null;
}

export function gpsUpdate(
  order: DispatchOrder,
  position: GeoPoint,
  opts: { exitRadiusKm?: number; note?: string } = {},
): GpsUpdateResult {
  const exitRadiusKm = opts.exitRadiusKm ?? DEFAULT_EXIT_RADIUS_KM;
  if (order.state === 'accepted' && haversineKm(position, order.supplierLocation) > exitRadiusKm) {
    return { order: transitionDispatch(order, 'en-route', { note: opts.note ?? 'Vehicle left supplier yard' }), transition: 'en-route' };
  }
  if (order.state === 'en-route' && pointInPolygon(position, order.siteGeofence)) {
    return { order: transitionDispatch(order, 'arrived', { note: opts.note ?? 'Vehicle entered site geofence' }), transition: 'arrived' };
  }
  return { order, transition: null };
}

export interface DispatchDemandRow {
  key: string;
  label: string;
  unit: string;
  quantity: number;
  avgUnitCostCents: number;
  totalCostCents: number;
  projectCount: number;
  discountPct: number;
  groupPriceCents: number;
  savingCents: number;
}

export function forecastBulkDemand(orders: Pick<DispatchOrder, 'projectId' | 'lines'>[]): DispatchDemandRow[] {
  const flattened = orders.flatMap((o) =>
    o.lines.map((line) => ({
      id: line.boqLineId,
      projectId: o.projectId,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitCostCents: line.unitCostCents,
    })),
  );
  const demand = aggregateMaterialDemand(flattened);
  return demand.map((row) => {
    const bulk = estimateBulkDiscount(row.quantity, row.avgUnitCostCents);
    return { ...row, ...bulk };
  });
}

export function dispatchDemandSummary(rows: DispatchDemandRow[]): {
  materialCount: number;
  totalOrderValueCents: number;
  totalSavingCents: number;
  largestProjectCount: number;
} {
  return {
    materialCount: rows.length,
    totalOrderValueCents: rows.reduce((s, r) => s + r.totalCostCents, 0),
    totalSavingCents: rows.reduce((s, r) => s + r.savingCents, 0),
    largestProjectCount: rows.reduce((s, r) => Math.max(s, r.projectCount), 0),
  };
}

export function dispatchFlowIndex(state: DispatchState): number {
  const idx = DISPATCH_FLOW.indexOf(state);
  return idx === -1 ? -1 : idx;
}
