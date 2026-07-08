import { lazy, Suspense } from 'react';

export const LazyBoqDeltaChartPanel = lazy(() => import('./BoqDeltaChartPanel').then((m) => ({ default: m.BoqDeltaChartPanel })));
export const LazyCrossProjectAnalyticsPanel = lazy(() => import('./CrossProjectAnalyticsPanel').then((m) => ({ default: m.CrossProjectAnalyticsPanel })));

export function AnalyticsFallback() {
  return <div style={{ background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#94a3b8' }}>Loading analytics…</div>;
}

export function LazyAnalyticsBoundary({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AnalyticsFallback />}>{children}</Suspense>;
}
