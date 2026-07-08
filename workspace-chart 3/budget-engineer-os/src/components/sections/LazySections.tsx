import { lazy, Suspense } from 'react';

export const LazySnapshotPortfolioSection = lazy(() => import('./SnapshotPortfolioSection'));
export const LazyZoneInspectorSection = lazy(() => import('./ZoneInspectorSection'));

function SectionFallback() {
  return <div style={{ background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#94a3b8' }}>Loading panels…</div>;
}

export function LazySectionBoundary({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SectionFallback />}>{children}</Suspense>;
}
