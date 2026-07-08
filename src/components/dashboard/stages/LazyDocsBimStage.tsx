import { lazy, Suspense } from 'react';
import type { PlanModel } from '@/domain/plan';
import type { DesignOption } from '@/domain/boq';
const DocsBimStageInner = lazy(() =>
  import('./DocsBimStage').then((m) => ({ default: m.DocsBimStage })),
);
interface LazyDocsBimStageProps {
  activePlan: PlanModel | null;
  selectedDesign: DesignOption | null;
}
export function LazyDocsBimStage(props: LazyDocsBimStageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-[#111c31]" />}>
      <DocsBimStageInner {...props} />
    </Suspense>
  )
}