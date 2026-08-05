import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ApprovalInbox, { ApprovalRequest } from '../components/portal/ApprovalInbox';
import BuildingPassport from '../components/portal/BuildingPassport';
import { useMilestoneStore } from '@/stores/milestoneStore';
import { useMilestonePlan } from '@/hooks/useMilestonePlan';
import { db } from '@/db/db';
import type { Project } from '@/types';
import { makeReleaseDecision } from '@/engine/milestone/milestoneEngine';
import { PHASES } from '@/engine/construction/constructionPhases';
import { LogOut, Inbox, FileCheck, Loader2 } from 'lucide-react';

const PHASE_LIST = Object.values(PHASES);

export default function ClientPortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProjectId = searchParams.get('project');

  const [project, setProject] = useState<Project | null>(null);
  const [projectReady, setProjectReady] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [budgetCents, setBudgetCents] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'inbox' | 'passport'>('inbox');

  const setMilestone = useMilestoneStore((s) => s.setMilestone);
  const { milestones } = useMilestonePlan(
    projectReady && project ? project.id : undefined,
    budgetCents
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (requestedProjectId) {
        const found = await db.projects.get(requestedProjectId);
        if (!cancelled) setProject(found ?? null);
        return;
      }
      const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
      const active = projects.find((p) => !p.isArchived) ?? projects[0] ?? null;
      if (!cancelled) setProject(active);
    })();
    return () => { cancelled = true; };
  }, [requestedProjectId]);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    void (async () => {
      const boqs = await db.boqs.where('projectId').equals(project.id).toArray();
      if (cancelled) return;
      const latest = boqs.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
      setCurrency(latest?.currency ?? project.currency);
      setBudgetCents(latest?.totalCents);
      setProjectReady(true);
    })();
    return () => { cancelled = true; };
  }, [project]);

  const pendingIds = useMemo(() => {
    return new Set(
      milestones
        .filter(
          (m) =>
            m.proofArtifacts.length > 0 &&
            m.releaseState !== 'released' &&
            m.releaseState !== 'rejected'
        )
        .map((m) => m.id)
    );
  }, [milestones]);

  const requests = useMemo<ApprovalRequest[]>(() => {
    return milestones
      .filter(
        (m) =>
          m.releaseState === 'released' ||
          m.releaseState === 'rejected' ||
          pendingIds.has(m.id)
      )
      .map((m) => {
        const phase = PHASE_LIST[m.order];
        return {
          id: m.id,
          title: m.name,
          description: m.description,
          amount: Math.round(m.plannedCostCents / 100),
          providerName: m.reviewChecks[0]?.assignedTo ?? (phase ? phase.trade : 'Verified Contractor'),
          status:
            m.releaseState === 'released'
              ? 'approved'
              : m.releaseState === 'rejected'
                ? 'rejected'
                : 'pending',
          dateRequested: m.plannedDate,
          currency,
        };
      });
  }, [milestones, pendingIds, currency]);

  const pendingApprovals = milestones.filter((m) => pendingIds.has(m.id));

  const decidedCount = milestones.filter(
    (m) => m.releaseState === 'released' || m.releaseState === 'rejected'
  ).length;

  const handleApprove = async (id: string) => {
    const milestone = milestones.find((m) => m.id === id);
    if (!milestone) return;
    const { milestone: updated } = makeReleaseDecision(milestone, 'pass', 'Client', 'Approved via client portal');
    await setMilestone(updated);
  };

  const handleReject = async (id: string) => {
    const milestone = milestones.find((m) => m.id === id);
    if (!milestone) return;
    const { milestone: updated } = makeReleaseDecision(milestone, 'fail', 'Client', 'Rejected via client portal');
    await setMilestone(updated);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans">
      <nav className="border-b border-stone-800 bg-stone-900 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500 w-8 h-8 rounded-md flex items-center justify-center font-bold text-stone-950">
            D
          </div>
          <span className="font-semibold text-lg tracking-wide">DzeNhare Client</span>
        </div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors text-sm font-medium"
        >
          <LogOut size={16} /> Exit Portal
        </button>
      </nav>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 p-6 md:p-8">
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <div className="mb-6 px-3">
            <h2 className="text-xl font-bold text-stone-100">My Project</h2>
            <p className="text-sm text-stone-400 mt-1">{project?.name ?? '—'}</p>
          </div>

          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'inbox' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Inbox size={18} />
            Approvals
            {pendingApprovals.length > 0 && (
              <span className="ml-auto bg-cyan-500 text-stone-950 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('passport')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'passport' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <FileCheck size={18} />
            Building Passport
          </button>
        </aside>

        <main className="flex-1 animate-in fade-in duration-300">
          {!project ? (
            <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center text-stone-400">
              No project found. Open the portal from a project dashboard to see live approvals.
            </div>
          ) : !projectReady ? (
            <div className="flex items-center justify-center h-64 text-stone-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading your project…
            </div>
          ) : (
            <>
              {activeTab === 'inbox' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatusCard label="Total Milestones" value={milestones.length} />
                    <StatusCard label="Awaiting Approval" value={pendingApprovals.length} tone="text-cyan-400" />
                    <StatusCard label="Funds Released" value={decidedCount} tone="text-emerald-400" />
                    <StatusCard label="In Review / Held" value={milestones.length - decidedCount - pendingApprovals.length} tone="text-amber-400" />
                  </div>
                  <ApprovalInbox
                    requests={requests}
                    onApprove={(id) => void handleApprove(id)}
                    onReject={(id) => void handleReject(id)}
                  />
                </div>
              )}

              {activeTab === 'passport' && (
                <BuildingPassport />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function StatusCard({ label, value, tone = 'text-stone-200' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-3">
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-stone-400 mt-0.5">{label}</div>
    </div>
  );
}
