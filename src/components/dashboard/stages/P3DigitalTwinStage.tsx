import { useState } from 'react';
import { Eye, Camera, BarChart3, ClipboardCheck, Scan } from 'lucide-react';
import { DigitalTwinViewer } from '@/components/p3/DigitalTwinViewer';
import { ProgressPanel } from '@/components/p3/ProgressPanel';
import { SiteVerificationPanel } from '@/components/p3/SiteVerificationPanel';
import { InspectionChecklistPanel } from '@/components/p3/InspectionChecklistPanel';

type P3Tab = 'overview' | 'progress' | 'verification' | 'checklist';

const TABS: Array<{ key: P3Tab; label: string; icon: typeof Eye }> = [
  { key: 'overview', label: 'Digital Twin', icon: Camera },
  { key: 'progress', label: 'Progress & BvA', icon: BarChart3 },
  { key: 'verification', label: 'Site Verification', icon: Scan },
  { key: 'checklist', label: 'Inspection Checklist', icon: ClipboardCheck },
];

export function P3DigitalTwinStage() {
  const [activeTab, setActiveTab] = useState<P3Tab>('overview');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold transition-all ${
                active
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      {activeTab === 'overview' && <DigitalTwinViewer />}
      {activeTab === 'progress' && <ProgressPanel />}
      {activeTab === 'verification' && <SiteVerificationPanel />}
      {activeTab === 'checklist' && <InspectionChecklistPanel />}
    </div>
  );
}
