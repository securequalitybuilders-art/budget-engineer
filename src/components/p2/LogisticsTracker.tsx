/**
 * P2 Logistics Tracker — Uber-style truck map.
 * Simulated real-time truck locations on an SVG site map with geofencing.
 */
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MapPin, Clock, Package, CheckCircle, Truck as TruckIcon } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { simulateTruckMovement, confirmDelivery, fleetSummary } from '@/engine/sitehawk/fleetManagement';
import type { TruckLocation } from '@/domain/sitehawk';
import { DataTable, DzCard, DzPill, Kicker } from '@/components/dzenhare';

const SITE_LAT = -17.8292;
const SITE_LNG = 31.0522;

function TruckDot({ truck, isZoomed }: { truck: TruckLocation; isZoomed: boolean }) {
  const mapX = ((truck.lng - (SITE_LNG - 0.05)) / 0.1) * 100;
  const mapY = ((truck.lat - (SITE_LAT - 0.05)) / 0.1) * 100;
  const color = truck.status === 'at-gate' ? '#10b981' : truck.status === 'unloading' ? '#3b82f6' : truck.status === 'en-route' ? '#f59e0b' : '#6b7280';
  return (
    <g data-testid={`truck-${truck.id}`}>
      <circle cx={`${mapX}%`} cy={`${mapY}%`} r={isZoomed ? 6 : 4} fill={color} opacity={0.9} />
      <title>{`${truck.driverName} — ${truck.material} — ${truck.status} — ETA ${truck.etaMinutes}min`}</title>
    </g>
  );
}

function SiteMap({ trucks }: { trucks: TruckLocation[] }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button onClick={() => setZoomed(!zoomed)} className="text-xs px-2 py-1 rounded bg-stone-800 text-stone-300 hover:bg-stone-700">
          {zoomed ? 'Zoom Out' : 'Zoom In'}
        </button>
      </div>
      <svg
        viewBox="0 0 400 300"
        className="w-full rounded-lg border border-stone-700 bg-stone-900"
        role="img"
        aria-label="Site truck map"
      >
        <rect x="0" y="0" width="400" height="300" fill="#1c1917" opacity="0.5" />
        <rect x="170" y="120" width="60" height="60" fill="#334155" stroke="#475569" rx="4" />
        <text x="200" y="155" textAnchor="middle" fill="#94a3b8" fontSize="8">SITE</text>
        <circle cx="200" cy="150" r={zoomed ? 40 : 60} fill="none" stroke="#d4a574" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
        <text x="200" y={zoomed ? 90 : 85} textAnchor="middle" fill="#d4a574" fontSize="7" opacity="0.7">Geofence 500m</text>
        {trucks.map(t => <TruckDot key={t.id} truck={t} isZoomed={zoomed} />)}
      </svg>
    </div>
  );
}

export function LogisticsTracker() {
  const { id: projectId } = useProjectStore(s => ({ id: s.projects[0]?.id ?? 'local' }));
  const { logistics, truckLocations, loadForProject, advanceTruck } = useSiteHawkStore(useShallow(s => ({
    logistics: s.logistics,
    truckLocations: s.truckLocations,
    loadForProject: s.loadForProject,
    advanceTruck: s.advanceTruck,
  })));

  useEffect(() => { loadForProject(projectId); }, [projectId, loadForProject]);

  const fSummary = useMemo(() => fleetSummary([], truckLocations), [truckLocations]);

  const handleAdvance = (truckId: string) => {
    const truck = truckLocations.find(t => t.id === truckId);
    if (!truck) return;
    if (truck.status === 'en-route') {
      const moved = simulateTruckMovement({
        truck,
        elapsedMinutes: 30,
        siteLat: SITE_LAT,
        siteLng: SITE_LNG,
        geofenceRadiusM: 500,
      });
      advanceTruck(moved);
    } else if (truck.status === 'at-gate') {
      advanceTruck(confirmDelivery(truck));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DzCard>
          <Kicker><TruckIcon size={14} className="inline mr-1" />Trucks En Route</Kicker>
          <div className="text-2xl font-bold">{fSummary.trucksTracked}</div>
          <DzPill tone="verified">{fSummary.trucksAtGate} at gate</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><Package size={14} className="inline mr-1" />Unloading</Kicker>
          <div className="text-2xl font-bold">{fSummary.trucksUnloading}</div>
          <DzPill tone="neutral">active</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><MapPin size={14} className="inline mr-1" />Inbound Deliveries</Kicker>
          <div className="text-2xl font-bold">{logistics.filter(l => l.status === 'ordered').length}</div>
          <DzPill tone="neutral">pending</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><Clock size={14} className="inline mr-1" />Completed</Kicker>
          <div className="text-2xl font-bold">{logistics.filter(l => l.status === 'delivered').length}</div>
          <DzPill tone="released"><CheckCircle size={12} className="inline mr-1" />done</DzPill>
        </DzCard>
      </div>

      <DzCard>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Live Truck Map</h3>
        <SiteMap trucks={truckLocations} />
      </DzCard>

      <DzCard>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Truck Fleet</h3>
        <DataTable
          columns={[
            { key: 'driverName', header: 'Driver' },
            { key: 'material', header: 'Material' },
            { key: 'supplierName', header: 'Supplier' },
            { key: 'etaMinutes', header: 'ETA', render: (r) => r.etaMinutes < 999 ? `${r.etaMinutes}min` : '—' },
            { key: 'speedKmh', header: 'Speed', render: (r) => `${r.speedKmh} km/h` },
            { key: 'status', header: 'Status', render: (r) => {
              const tone = r.status === 'at-gate' ? 'verified' : r.status === 'unloading' ? 'released' : r.status === 'en-route' ? 'disputed' : 'neutral';
              return <DzPill tone={tone}>{r.status}</DzPill>;
            }},
            { key: 'action', header: '', render: (r) => (
              <button
                data-testid={`advance-${r.id}`}
                onClick={() => handleAdvance(r.id)}
                className="text-xs px-2 py-1 rounded bg-stone-700 text-stone-300 hover:bg-stone-600"
              >
                {r.status === 'en-route' ? 'Simulate' : r.status === 'at-gate' ? 'Confirm' : '—'}
              </button>
            )},
          ]}
          rows={truckLocations}
          rowKey={(r) => r.id}
        />
      </DzCard>

      {logistics.length > 0 && (
        <DzCard>
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Logistics Records</h3>
          <DataTable
            columns={[
              { key: 'material', header: 'Material' },
              { key: 'etaDays', header: 'ETA', render: (r) => `${r.etaDays}d` },
              { key: 'status', header: 'Status', render: (r) => <DzPill tone={r.status === 'delivered' ? 'released' : 'neutral'}>{r.status}</DzPill> },
            ]}
            rows={logistics}
            rowKey={(r) => r.id}
          />
        </DzCard>
      )}
    </div>
  );
}
