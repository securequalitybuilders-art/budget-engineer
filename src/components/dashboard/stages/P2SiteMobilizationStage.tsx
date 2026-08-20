import { useState } from 'react';
import { MapPin, Users, ShoppingCart, Truck, DollarSign } from 'lucide-react';
import { ResourceSchedulePanel } from '@/components/p2/ResourceSchedulePanel';
import { ProcurementHub } from '@/components/p2/ProcurementHub';
import { LogisticsTracker } from '@/components/p2/LogisticsTracker';
import { FleetManagement } from '@/components/p2/FleetManagement';
import { RealTimeJobCostingPanel } from '@/components/p2/RealTimeJobCostingPanel';
import { StageScaffold } from './StageScaffold';
import { PageEnter } from '@/components/dzenhare';

const TABS = [
  { key: 'resources', label: 'Resource Schedule', icon: Users },
  { key: 'procurement', label: 'Procurement Hub', icon: ShoppingCart },
  { key: 'logistics', label: 'Logistics Tracker', icon: MapPin },
  { key: 'fleet', label: 'Fleet Management', icon: Truck },
  { key: 'jobcost', label: 'Job Costing', icon: DollarSign },
] as const;

type TabKey = typeof TABS[number]['key'];

export function P2SiteMobilizationStage() {
  const [tab, setTab] = useState<TabKey>('resources');

  return (
    <StageScaffold
      stageId="p2-site-mobilization"
      icon={MapPin}
      empty={false}
      emptyTitle="No mobilization data"
      emptyMessage="Logistics, trade scheduling, fleet tracking and supply chain management start here."
    >
      <PageEnter className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-stone-800 pb-2">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'resources' && <ResourceSchedulePanel />}
        {tab === 'procurement' && <ProcurementHub />}
        {tab === 'logistics' && <LogisticsTracker />}
        {tab === 'fleet' && <FleetManagement />}
        {tab === 'jobcost' && <RealTimeJobCostingPanel />}
      </PageEnter>
    </StageScaffold>
  );
}
