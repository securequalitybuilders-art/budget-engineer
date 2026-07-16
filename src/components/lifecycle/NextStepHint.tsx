import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NextStepHintProps {
  hint: string;
  actionLabel?: string;
  actionTo?: string;
  severity?: 'info' | 'warning' | 'success';
}

export function NextStepHint({ hint, actionLabel, actionTo, severity = 'info' }: NextStepHintProps) {
  const colors = {
    info: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
  };

  const icon = severity === 'success' ? <CheckCircle2 size={12} /> : severity === 'warning' ? <AlertTriangle size={12} /> : <ArrowRight size={12} />;

  return (
    <div className={`flex items-center gap-2 rounded-lg border ${colors[severity]} px-3 py-2`}>
      <span className="shrink-0">{icon}</span>
      <span className="text-[10px] font-medium">{hint}</span>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="ml-auto shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-medium transition-colors hover:bg-white/10"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
