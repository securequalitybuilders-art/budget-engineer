import { useState, useMemo } from 'react';
import { useHandoverStore } from '@/stores/handoverStore';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useChangeStore } from '@/stores/changeStore';
import { assessHandoverReadiness } from '@/lib/lifecycle/handoverReadiness';
import { Box, ClipboardCheck, Package, Archive, ShieldCheck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface HandoverPanelProps {
  projectId: string;
}

type TabId = 'completion' | 'snags' | 'packages' | 'assets' | 'warranties';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'completion', label: 'Completion', icon: <ClipboardCheck size={14} /> },
  { id: 'snags', label: 'Snags', icon: <ClipboardCheck size={14} /> },
  { id: 'packages', label: 'Packages', icon: <Package size={14} /> },
  { id: 'assets', label: 'Assets', icon: <Archive size={14} /> },
  { id: 'warranties', label: 'Warranties', icon: <ShieldCheck size={14} /> },
];

const STAGE_COLORS: Record<string, string> = {
  'not-started': 'bg-gray-500/20 text-gray-400',
  'in-progress': 'bg-blue-500/20 text-blue-400',
  achieved: 'bg-green-500/20 text-green-400',
  deferred: 'bg-amber-500/20 text-amber-400',
};

const PACKAGE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  'in-preparation': 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  issued: 'bg-indigo-500/20 text-indigo-400',
  acknowledged: 'bg-amber-500/20 text-amber-400',
};

export function HandoverPanel(_props: HandoverPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('completion');
  const { completionStages, snagLists, handoverPackages, assetRegister, warrantyRecords } = useHandoverStore();
  const milestones = useMilestoneStore((s) => s.milestones);
  const ncrs = useChangeStore((s) => s.ncrs);

  const readiness = useMemo(() => assessHandoverReadiness({
    completionStages,
    snagLists,
    handoverPackages,
    milestones,
    ncrs,
  }), [completionStages, snagLists, handoverPackages, milestones, ncrs]);

  return (
    <div className="space-y-6">
      {/* Handover Readiness Banner */}
      <div className={`rounded-xl border p-3 ${
        readiness.isReady
          ? 'border-green-500/30 bg-green-950/20'
          : readiness.blockers.length > 0
            ? 'border-red-500/30 bg-red-950/20'
            : 'border-amber-500/30 bg-amber-950/20'
      }`}>
        <div className="flex items-center gap-2">
          {readiness.isReady ? (
            <CheckCircle size={16} className="text-green-400" />
          ) : readiness.blockers.length > 0 ? (
            <XCircle size={16} className="text-red-400" />
          ) : (
            <AlertTriangle size={16} className="text-amber-400" />
          )}
          <span className={`text-xs font-semibold ${
            readiness.isReady ? 'text-green-300' : readiness.blockers.length > 0 ? 'text-red-300' : 'text-amber-300'
          }`}>
            Handover {readiness.isReady ? 'Ready' : 'Not Ready'}
          </span>
          <span className="text-[9px] text-[var(--text-muted)]">
            {readiness.stageCompletionPct}% completion
            {readiness.blockers.length > 0 && ` · ${readiness.blockers.length} blocker(s)`}
          </span>
        </div>
        {readiness.blockers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {readiness.blockers.map((b, i) => (
              <span key={i} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] text-red-400">{b.description}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-0 border-b border-stone-700/60 bg-stone-900/30 rounded-t-xl overflow-hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-stone-400 hover:text-stone-300 hover:border-stone-500'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'completion' && (
        <div className="space-y-2">
          {completionStages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No completion stages set up.</p>
            </div>
          ) : (
            completionStages.map((stage) => (
              <div key={stage.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] capitalize">{stage.stage.replace(/-/g, ' ')}</span>
                    <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                      {stage.conditions.filter((c) => c.met).length}/{stage.conditions.length} conditions met
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${STAGE_COLORS[stage.status] || ''}`}>
                    {stage.status}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                  <span>Target: {stage.targetDate}</span>
                  {stage.achievedDate && <span>Achieved: {stage.achievedDate}</span>}
                  <span>Certificates: {stage.certificates.length}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'snags' && (
        <div className="space-y-2">
          {snagLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No snag lists yet.</p>
            </div>
          ) : (
            snagLists.map((list) => (
              <div key={list.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{list.name}</span>
                  <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                    {list.snagItems.length} items
                  </span>
                </div>
                <div className="flex gap-2">
                  {['open', 'in-progress', 'resolved', 'verified'].map((status) => {
                    const count = list.snagItems.filter((s) => s.status === status).length;
                    return (
                      <div key={status} className="flex-1 rounded-md bg-[var(--bg-tertiary)] p-1.5 text-center">
                        <div className="text-[9px] text-[var(--text-muted)] capitalize">{status}</div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="space-y-2">
          {handoverPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No handover packages yet.</p>
            </div>
          ) : (
            handoverPackages.map((pkg) => (
              <div key={pkg.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{pkg.name}</span>
                    <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)] capitalize">{pkg.recipientType}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${PACKAGE_STATUS_COLORS[pkg.status] || ''}`}>
                    {pkg.status}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                  <span>Recipient: {pkg.recipient}</span>
                  <span>Contents: {pkg.contents.filter((c) => c.status === 'included').length} included</span>
                  {pkg.issuedDate && <span>Issued: {pkg.issuedDate}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="space-y-2">
          {assetRegister.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Asset register is empty.</p>
            </div>
          ) : (
            assetRegister.map((asset) => (
              <div key={asset.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{asset.name}</span>
                    <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">{asset.assetTag}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                    asset.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    asset.status === 'under-maintenance' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {asset.status}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                  <span>Category: {asset.category}</span>
                  <span>Manufacturer: {asset.manufacturer}</span>
                  <span>Warranty: {asset.warrantyExpiry}</span>
                  <span>Life: {asset.expectedLifeYears}yrs</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'warranties' && (
        <div className="space-y-2">
          {warrantyRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
              <Box size={32} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No warranty records yet.</p>
            </div>
          ) : (
            warrantyRecords.map((warranty) => (
              <div key={warranty.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{warranty.provider}</span>
                    <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">{warranty.warrantyType}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                    warranty.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    warranty.status === 'expired' ? 'bg-gray-500/20 text-gray-400' :
                    warranty.status === 'claimed' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {warranty.status}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                  <span>Ref: {warranty.reference}</span>
                  <span>Start: {warranty.startDate}</span>
                  <span>Expiry: {warranty.expiryDate}</span>
                  <span>Claims: {warranty.claimHistory.length}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
