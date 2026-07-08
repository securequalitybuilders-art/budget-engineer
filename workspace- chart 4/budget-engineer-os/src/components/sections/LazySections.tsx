import React, { Suspense } from 'react';

const SnapshotPortfolioSection = React.lazy(() => import('./SnapshotPortfolioSection'));
const ZoneInspectorSection = React.lazy(() => import('./ZoneInspectorSection'));

export function LazySnapshotPortfolioSection() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-[#94a3b8]">Loading portfolio section...</div>}>
      <SnapshotPortfolioSection />
    </Suspense>
  );
}

export function LazyZoneInspectorSection() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-[#94a3b8]">Loading inspector section...</div>}>
      <ZoneInspectorSection />
    </Suspense>
  );
}
