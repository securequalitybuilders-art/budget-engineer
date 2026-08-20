/**
 * P2 Fleet Management panel.
 * Driver roster, GPS geofencing, delivery confirmation, and fleet summary.
 */
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Users, MapPin, Shield, Phone } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { fleetSummary } from '@/engine/sitehawk/fleetManagement';
import { DataTable, DzCard, DzPill, Kicker } from '@/components/dzenhare';

export function FleetManagement() {
  const { id: projectId } = useProjectStore(s => ({ id: s.projects[0]?.id ?? 'local' }));
  const { drivers, truckLocations, loadForProject } = useSiteHawkStore(useShallow(s => ({
    drivers: s.drivers,
    truckLocations: s.truckLocations,
    loadForProject: s.loadForProject,
  })));

  useEffect(() => { loadForProject(projectId); }, [projectId, loadForProject]);

  const fSummary = useMemo(() => fleetSummary(drivers, truckLocations), [drivers, truckLocations]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DzCard>
          <Kicker><Users size={14} className="inline mr-1" />Drivers</Kicker>
          <div className="text-2xl font-bold">{fSummary.totalDrivers}</div>
          <DzPill tone="neutral">{fSummary.idle} idle</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><MapPin size={14} className="inline mr-1" />En Route</Kicker>
          <div className="text-2xl font-bold">{fSummary.enRoute}</div>
          <DzPill tone="disputed">moving</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><Shield size={14} className="inline mr-1" />Delivering</Kicker>
          <div className="text-2xl font-bold">{fSummary.delivering}</div>
          <DzPill tone="released">on-site</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><Phone size={14} className="inline mr-1" />Off Duty</Kicker>
          <div className="text-2xl font-bold">{fSummary.offDuty}</div>
          <DzPill tone="neutral">resting</DzPill>
        </DzCard>
      </div>

      <DzCard>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Driver Roster</h3>
        <DataTable
          columns={[
            { key: 'name', header: 'Driver' },
            { key: 'phone', header: 'Phone' },
            { key: 'truckId', header: 'Truck' },
            { key: 'licenseClass', header: 'License' },
            { key: 'deliveriesCompleted', header: 'Deliveries' },
            { key: 'totalDistanceKm', header: 'Distance', render: (r) => `${r.totalDistanceKm.toFixed(0)} km` },
            { key: 'status', header: 'Status', render: (r) => {
              const tone = r.status === 'delivering' ? 'released' : r.status === 'en-route' ? 'verified' : r.status === 'idle' ? 'neutral' : 'disputed';
              return <DzPill tone={tone}>{r.status}</DzPill>;
            }},
          ]}
          rows={drivers}
          rowKey={(r) => r.id}
        />
      </DzCard>
    </div>
  );
}
