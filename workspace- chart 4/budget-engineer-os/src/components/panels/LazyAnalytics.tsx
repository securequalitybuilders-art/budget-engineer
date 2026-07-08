import React, { Suspense } from 'react';

const BoqDeltaChartPanel = React.lazy(() => import('./AnalyticsPanels').then(m => ({ default: m.BoqDeltaChartPanel })));
const CrossProjectAnalyticsPanel = React.lazy(() => import('./AnalyticsPanels').then(m => ({ default: m.CrossProjectAnalyticsPanel })));
const BoqShareComparePanel = React.lazy(() => import('./AnalyticsPanels').then(m => ({ default: m.BoqShareComparePanel })));

export function LazyAnalyticsBoundary() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-[#94a3b8]">Loading analytics panels...</div>}>
      <BoqDeltaChartPanel />
      <CrossProjectAnalyticsPanel />
      <BoqShareComparePanel />
    </Suspense>
  );
}
