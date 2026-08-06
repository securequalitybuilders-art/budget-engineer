/**
 * DzeNhare JIT-Dispatch — "Uber for Construction" supply chain domain types.
 * All monetary values are integer cents.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type DispatchState =
  | 'pending'
  | 'accepted'
  | 'en-route'
  | 'arrived'
  | 'delivered'
  | 'verified'
  | 'completed'
  | 'cancelled';

export const DISPATCH_FLOW: DispatchState[] = [
  'pending',
  'accepted',
  'en-route',
  'arrived',
  'delivered',
  'verified',
  'completed',
];

export interface DispatchOrderLine {
  boqLineId: string;
  description: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  totalCents: number;
}

export interface TrackingEvent {
  state: DispatchState;
  at: string;
  lat?: number;
  lng?: number;
  note?: string;
}

export interface DispatchOrder {
  id: string;
  projectId: string;
  projectName?: string;
  milestoneId?: string;
  milestoneName?: string;
  supplierId: string;
  supplierName: string;
  supplierLocation: GeoPoint;
  siteGeofence: GeoPoint[];
  lines: DispatchOrderLine[];
  totalCents: number;
  state: DispatchState;
  triggerPct: number;
  routeKm?: number;
  etaMinutes?: number;
  createdAt: string;
  acceptedAt?: string;
  enRouteAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  verifiedAt?: string;
  completedAt?: string;
  tracking: TrackingEvent[];
  escrowId?: string;
  cancelReason?: string;
}

export interface DispatchRequestInput {
  projectId: string;
  projectName?: string;
  milestoneId?: string;
  milestoneName?: string;
  supplierId: string;
  supplierName: string;
  supplierLocation: GeoPoint;
  siteGeofence: GeoPoint[];
  lines: DispatchOrderLine[];
  triggerPct: number;
  routeKm?: number;
  etaMinutes?: number;
}

export type DisputeType = 'damaged' | 'wrong-material' | 'shortage' | 'late' | 'quality';

export interface DispatchDispute {
  id: string;
  orderId: string;
  type: DisputeType;
  reason: string;
  raisedBy: string;
  raisedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export type EscrowHoldStatus = 'held' | 'released' | 'disputed' | 'refunded';

export interface DisputeRelease {
  immediateCents: number;
  heldCents: number;
  releasedAt: string;
}

export interface EscrowHold {
  id: string;
  orderId: string;
  projectId: string;
  supplierId: string;
  amountCents: number;
  currency: string;
  status: EscrowHoldStatus;
  heldAt: string;
  releasedAt?: string;
  gpsVerified: boolean;
  engineerSignoff: boolean;
  signoffBy?: string;
  signoffAt?: string;
  dispute?: DispatchDispute;
  disputeRelease?: DisputeRelease;
}

export interface HoldInput {
  orderId: string;
  projectId: string;
  supplierId: string;
  amountCents: number;
  currency: string;
}
