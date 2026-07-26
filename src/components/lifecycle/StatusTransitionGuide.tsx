import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldCheck, Flag, ShoppingCart, FolderOpen, BarChart3 } from 'lucide-react';
import type { ModuleDependency } from '@/lib/lifecycle/lifecycleSummary';

interface StatusTransitionGuideProps {
  projectId: string;
  currentModule: string;
  dependencies?: ModuleDependency[];
  readinessState?: string;
}

interface TransitionStep {
  module: string;
  label: string;
  icon: React.ReactNode;
  status: 'ready' | 'blocked' | 'pending' | 'current' | 'future';
  linkTo: string;
}

const MODULE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  assurance: { label: 'Assurance', icon: <ShieldCheck size={14} /> },
  delivery: { label: 'Delivery', icon: <Flag size={14} /> },
  procurement: { label: 'Procurement', icon: <ShoppingCart size={14} /> },
  handover: { label: 'Handover', icon: <FolderOpen size={14} /> },
  'project-controls': { label: 'Project Controls', icon: <BarChart3 size={14} /> },
};

const FLOW = ['assurance', 'delivery', 'procurement', 'handover', 'project-controls'];

export function StatusTransitionGuide({ projectId, currentModule, dependencies = [] }: StatusTransitionGuideProps) {
  const currentIndex = FLOW.indexOf(currentModule);

  const steps: TransitionStep[] = FLOW.map((mod, i) => {
    const dep = dependencies.find(d => d.toModule === mod || d.fromModule === currentModule);
    const cfg = MODULE_CONFIG[mod] ?? { label: mod, icon: <ArrowRight size={14} /> };
    let status: TransitionStep['status'] = 'future';
    let icon = cfg.icon;

    if (mod === currentModule) {
      status = 'current';
      return { module: mod, label: cfg.label, icon, status, linkTo: `/project/${projectId}/studio/${mod}` };
    }

    if (i < currentIndex) {
      if (dep?.status === 'blocked') {
        status = 'blocked';
        icon = <XCircle size={14} className="text-red-400" />;
      } else if (dep?.status === 'warning') {
        status = 'pending';
        icon = <AlertTriangle size={14} className="text-amber-400" />;
      } else {
        status = 'ready';
        icon = <CheckCircle2 size={14} className="text-green-400" />;
      }
    } else {
      if (dep?.status === 'blocked') {
        status = 'blocked';
        icon = <XCircle size={14} className="text-red-400" />;
      } else if (dep?.status === 'warning') {
        status = 'pending';
        icon = <AlertTriangle size={14} className="text-amber-400" />;
      }
    }

    return { module: mod, label: cfg.label, icon, status, linkTo: `/project/${projectId}/studio/${mod}` };
  });

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight size={12} className="text-cyan-400" />
        <h3 className="text-[10px] font-semibold text-[var(--text-primary)]">Lifecycle Flow</h3>
      </div>

      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={step.module} className="flex items-center gap-1 flex-1 min-w-0">
            <Link
              to={step.linkTo}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] font-medium transition-colors ${
                step.status === 'current' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                step.status === 'blocked' ? 'bg-red-500/10 text-red-300 border border-red-500/30' :
                step.status === 'ready' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
                step.status === 'pending' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-transparent'
              }`}
            >
              {step.icon}
              <span className="hidden sm:inline truncate">{step.label}</span>
            </Link>
            {i < steps.length - 1 && (
              <span className="shrink-0 text-[var(--text-tertiary)] opacity-30">
                <ArrowRight size={8} />
              </span>
            )}
          </div>
        ))}
      </div>

      {currentIndex >= 0 && currentIndex < steps.length - 1 && (
        <div className="mt-2 text-[9px] text-[var(--text-tertiary)] flex items-center gap-2">
          <span>Next:</span>
          <Link to={steps[currentIndex + 1].linkTo} className="text-cyan-300 hover:underline flex items-center gap-1">
            {steps[currentIndex + 1].label}
            {steps[currentIndex + 1].status === 'blocked' && <XCircle size={10} className="text-red-400" />}
            {steps[currentIndex + 1].status === 'pending' && <AlertTriangle size={10} className="text-amber-400" />}
          </Link>
          {(steps[currentIndex + 1].status === 'blocked' || steps[currentIndex + 1].status === 'pending') && (
            <Link to={steps[currentIndex + 1].linkTo} className="text-amber-300 hover:underline">
              Review
            </Link>
          )}
        </div>
      )}

      {currentIndex < 0 && (
        <div className="mt-1 text-[9px] text-[var(--text-muted)]">
          Start by completing <Link to={`/project/${projectId}/studio/assurance`} className="text-cyan-300 hover:underline">Assurance</Link>
        </div>
      )}
    </div>
  );
}
