import { useState } from 'react';
import { EcoCard, EmptyState, LinkButton } from '@/components/ecosystem/ui';
import { type EcosystemData } from '@/components/ecosystem/useEcosystemData';
import { saveRfq } from '@/lib/ecosystem/workflowActions';
import { Link } from 'react-router-dom';

const CATEGORIES = ['Cement & masonry', 'Roofing', 'Steel & fixings', 'Timber', 'Plumbing', 'Electrical', 'Finishes', 'Windows & doors'];

export function RfqCreateWidget({ projects, defaultProjectId, onCreated }: {
  projects: EcosystemData['projects'];
  defaultProjectId?: string | null;
  onCreated: () => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [budgetCents, setBudgetCents] = useState(5000_00);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const project = projects.find((p) => p.id === projectId);

  const submit = async () => {
    if (!project) {
      setError('Select a project first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const rfq = await saveRfq({
        projectId: project.id,
        projectName: project.name,
        title: title.trim() || `${category} package`,
        category,
        priority,
        budgetCents,
        deliveryLocation: location.trim() || project.name,
        requestedBy: 'Project Manager',
      });
      setDone(rfq.requestNumber);
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create RFQ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EcoCard title="Send an RFQ" subtitle="Kick off procurement — suppliers can price it instantly" icon={<span aria-hidden>📋</span>}>
      {projects.length === 0 ? (
        <EmptyState message="Create a project first, then issue RFQs from here." cta={<LinkButton to="/">Create project</LinkButton>} />
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400">Project</span>
              <select
                aria-label="Project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              >
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400">Category</span>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <input
            aria-label="Package title"
            placeholder={`${category} package (optional)`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400">Budget (USD)</span>
              <input
                aria-label="Budget"
                type="number"
                min={0}
                step={100}
                value={Math.round(budgetCents / 100)}
                onChange={(e) => setBudgetCents(Number(e.target.value) * 100)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-slate-400">Priority</span>
              <select
                aria-label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          <input
            aria-label="Delivery location"
            placeholder="Delivery site (defaults to project name)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
          />
          <div className="flex items-center justify-between">
            {error ? <span className="text-xs text-rose-600">{error}</span> : <span />}
            {done ? (
              <span className="text-xs text-emerald-600">{done} issued — <Link to="/ecosystem/supplier" className="underline">suppliers can now quote</Link>.</span>
            ) : (
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Issuing…' : 'Issue RFQ'}
              </button>
            )}
          </div>
        </div>
      )}
    </EcoCard>
  );
}
