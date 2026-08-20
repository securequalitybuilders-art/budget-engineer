/**
 * P2 Fleet Management & Truck GPS Tracking engine.
 * Simulates truck locations, geofencing, and delivery confirmation.
 * Pure functions — no React, no network.
 */
import type { TruckLocation, FleetDriver } from '@/domain/sitehawk';

export interface FleetOptions {
  projectId?: string;
  now?: Date;
}

export interface SimulateTruckInput {
  truck: TruckLocation;
  elapsedMinutes: number;
  siteLat: number;
  siteLng: number;
  geofenceRadiusM: number;
}

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number { return deg * Math.PI / 180; }

export function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGeofence(lat: number, lng: number, siteLat: number, siteLng: number, radiusM: number): boolean {
  return haversineDistanceM(lat, lng, siteLat, siteLng) <= radiusM;
}

export function simulateTruckMovement(input: SimulateTruckInput): TruckLocation {
  const { truck, elapsedMinutes, siteLat, siteLng, geofenceRadiusM } = input;
  const speedMs = truck.speedKmh / 3.6;
  const distanceM = speedMs * elapsedMinutes * 60;

  const bearing = toRad(truck.heading);
  const distRatio = distanceM / EARTH_RADIUS_M;
  const lat1 = toRad(truck.lat);
  const lng1 = toRad(truck.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distRatio) + Math.cos(lat1) * Math.sin(distRatio) * Math.cos(bearing),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(distRatio) * Math.cos(lat1),
    Math.cos(distRatio) - Math.sin(lat1) * Math.sin(lat2),
  );

  const newLat = lat2 * 180 / Math.PI;
  const newLng = lng2 * 180 / Math.PI;
  const geofenced = isInsideGeofence(newLat, newLng, siteLat, siteLng, geofenceRadiusM);

  const distToSite = haversineDistanceM(newLat, newLng, siteLat, siteLng);
  const etaMinutes = speedMs > 0 ? Math.round(distToSite / speedMs / 60) : 999;

  let status: TruckLocation['status'] = truck.status;
  if (geofenced && status === 'en-route') status = 'at-gate';
  else if (status === 'at-gate' && !geofenced) status = 'departed';

  return {
    ...truck,
    lat: newLat,
    lng: newLng,
    lastPing: new Date().toISOString(),
    geofenced,
    etaMinutes,
    status,
  };
}

export function createTruckLocation(input: {
  projectId: string;
  orderId: string;
  truckId: string;
  driverName: string;
  supplierName: string;
  material: string;
  originLat: number;
  originLng: number;
  heading: number;
  speedKmh: number;
  geofenceRadiusM?: number;
}): TruckLocation {
  return {
    id: `truck-${input.projectId}-${input.orderId}`,
    orderId: input.orderId,
    truckId: input.truckId,
    driverName: input.driverName,
    supplierName: input.supplierName,
    material: input.material,
    lat: input.originLat,
    lng: input.originLng,
    heading: input.heading,
    speedKmh: input.speedKmh,
    lastPing: new Date().toISOString(),
    geofenced: false,
    geofenceRadiusM: input.geofenceRadiusM ?? 500,
    etaMinutes: 999,
    status: 'en-route',
  };
}

export function fleetSummary(drivers: FleetDriver[], trucks: TruckLocation[]): {
  totalDrivers: number;
  idle: number;
  enRoute: number;
  delivering: number;
  offDuty: number;
  trucksTracked: number;
  trucksAtGate: number;
  trucksUnloading: number;
} {
  let idle = 0;
  let enRoute = 0;
  let delivering = 0;
  let offDuty = 0;
  for (const d of drivers) {
    if (d.status === 'idle') idle++;
    else if (d.status === 'en-route') enRoute++;
    else if (d.status === 'delivering') delivering++;
    else offDuty++;
  }
  let trucksAtGate = 0;
  let trucksUnloading = 0;
  for (const t of trucks) {
    if (t.status === 'at-gate') trucksAtGate++;
    else if (t.status === 'unloading') trucksUnloading++;
  }
  return {
    totalDrivers: drivers.length,
    idle,
    enRoute,
    delivering,
    offDuty,
    trucksTracked: trucks.length,
    trucksAtGate,
    trucksUnloading,
  };
}

export function confirmDelivery(truck: TruckLocation): TruckLocation {
  return { ...truck, status: 'unloading', speedKmh: 0, etaMinutes: 0 };
}

export function createDriver(input: {
  projectId: string;
  name: string;
  phone: string;
  truckId: string;
  licenseClass: string;
}): FleetDriver {
  return {
    id: `driver-${input.projectId}-${input.truckId}`,
    projectId: input.projectId,
    name: input.name,
    phone: input.phone,
    truckId: input.truckId,
    licenseClass: input.licenseClass,
    status: 'idle',
    deliveriesCompleted: 0,
    totalDistanceKm: 0,
  };
}
