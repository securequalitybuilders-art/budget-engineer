/**
 * P2 Resource Schedule Panel.
 * Labour schedule, equipment plan, and material slots booked.
 */
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Hammer, Users, Truck } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { aggregateJobCosts } from '@/engine/sitehawk/resourceScheduling';
import { buildEquipmentPlan, summarizeEquipment } from '@/engine/sitehawk/equipmentScheduling';
import { DataTable, DzCard, DzPill, Kicker, Money } from '@/components/dzenhare';

export function ResourceSchedulePanel() {
  const { id: projectId } = useProjectStore(s => ({ id: s.projects[0]?.id ?? 'local' }));
  const { schedules, loadForProject } = useSiteHawkStore(useShallow(s => ({
    schedules: s.resourceSchedules,
    loadForProject: s.loadForProject,
  })));

  useEffect(() => { loadForProject(projectId); }, [projectId, loadForProject]);

  const jobCost = useMemo(() => aggregateJobCosts(schedules), [schedules]);
  const equipmentPlan = useMemo(() => buildEquipmentPlan(schedules, { projectId }), [schedules, projectId]);
  const eqSummary = useMemo(() => summarizeEquipment(equipmentPlan.slots), [equipmentPlan.slots]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DzCard>
          <Kicker><Users size={14} className="inline mr-1" />Trade Shifts</Kicker>
          <div className="text-2xl font-bold">{schedules.length}</div>
          <DzPill tone="neutral">{jobCost.crews} crews</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><Hammer size={14} className="inline mr-1" />Equipment Slots</Kicker>
          <div className="text-2xl font-bold">{eqSummary.totalSlots}</div>
          <DzPill tone={eqSummary.inUse > 0 ? 'released' : 'neutral'}>{eqSummary.totalDays} days</DzPill>
        </DzCard>
        <DzCard>
          <Kicker><Truck size={14} className="inline mr-1" />Material Slots</Kicker>
          <div className="text-2xl font-bold">{schedules.filter(s => s.category === 'material').length}</div>
          <DzPill tone="neutral">booked</DzPill>
        </DzCard>
        <DzCard>
          <Kicker>Total Cost</Kicker>
          <Money cents={jobCost.totalCostCents} />
          <div className="text-xs text-stone-400 mt-1">
            Labour <Money cents={jobCost.labourCents} /> / Material <Money cents={jobCost.materialCents} />
          </div>
        </DzCard>
      </div>

      <DzCard>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Labour & Equipment Schedule</h3>
        <DataTable
          columns={[
            { key: 'wbsCode', header: 'WBS' },
            { key: 'name', header: 'Task' },
            { key: 'date', header: 'Date' },
            { key: 'trade', header: 'Trade' },
            { key: 'workers', header: 'Crew', render: (r) => `${r.workers}× ${r.trade}` },
            { key: 'costCents', header: 'Cost', render: (r) => <Money cents={r.costCents} /> },
            { key: 'status', header: 'Status', render: (r) => <DzPill tone={r.status === 'completed' ? 'released' : r.status === 'in-progress' ? 'verified' : 'neutral'}>{r.status}</DzPill> },
          ]}
          rows={schedules}
          rowKey={(r) => r.id}
        />
      </DzCard>

      {equipmentPlan.slots.length > 0 && (
        <DzCard>
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Equipment Plan</h3>
          <DataTable
            columns={[
              { key: 'equipmentType', header: 'Equipment' },
              { key: 'description', header: 'Description' },
              { key: 'scheduledDate', header: 'Start Date' },
              { key: 'durationDays', header: 'Days' },
              { key: 'wbsCode', header: 'WBS' },
              { key: 'costCents', header: 'Cost', render: (r) => <Money cents={r.costCents} /> },
              { key: 'status', header: 'Status', render: (r) => <DzPill tone={r.status === 'in-use' ? 'released' : r.status === 'on-site' ? 'verified' : 'neutral'}>{r.status}</DzPill> },
            ]}
            rows={equipmentPlan.slots}
            rowKey={(r) => r.id}
          />
        </DzCard>
      )}
    </div>
  );
}
