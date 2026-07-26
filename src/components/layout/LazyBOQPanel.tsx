import { lazy, Suspense } from 'react';
const BOQPanelInner = lazy(() =>
  import('./BOQPanel').then((m) => ({ default: m.BOQPanel })),
);
export function LazyBOQPanel() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-[#111c31]" />}>
      <BOQPanelInner />
    </Suspense>
  )
}