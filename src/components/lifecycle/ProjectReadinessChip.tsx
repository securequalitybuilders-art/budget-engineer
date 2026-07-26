import { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useAssuranceStore } from '@/stores/assuranceStore';
import { computeProjectReadiness } from '@/lib/lifecycle/lifecycleSummary';

export function ProjectReadinessChip() {
  const { intakes, feasibilityAssessments, riskGates, riskRegister, solvencyChecks } = useAssuranceStore();

  const readiness = useMemo(() => computeProjectReadiness({
    intakes, feasibilityAssessments, riskGates, riskRegister, solvencyChecks,
  }), [intakes, feasibilityAssessments, riskGates, riskRegister, solvencyChecks]);

  const chipConfig = useMemo(() => {
    switch (readiness.overallState) {
      case 'cleared':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2, label: 'Cleared' };
      case 'blocked':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Blocked' };
      case 'deferred':
        return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertTriangle, label: 'Deferred' };
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Rejected' };
      case 'in-feasibility':
        return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock, label: 'In Feasibility' };
      default:
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: ShieldCheck, label: 'Not Started' };
    }
  }, [readiness.overallState]);

  const Icon = chipConfig.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${chipConfig.color}`}
      title={readiness.blockers.length > 0 ? readiness.blockers.join('; ') : 'No blockers'}>
      <Icon size={10} />
      {chipConfig.label}
      {readiness.blockers.length > 0 && (
        <span className="ml-0.5 rounded-full bg-red-500/30 px-1 text-[8px]">{readiness.blockers.length}</span>
      )}
    </div>
  );
}
