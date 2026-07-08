import { Suspense, lazy } from 'react';

const BimRoute = lazy(() => import('./routes/BimRoute'));

export default function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1220', color: '#e2e8f0', fontFamily: 'Inter, Arial, sans-serif' }}>Loading Budget Engineer BIM workspace…</div>}>
      <BimRoute />
    </Suspense>
  );
}
