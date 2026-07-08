import React, { Suspense } from 'react';
const BimRoute = React.lazy(() => import('./routes/BimRoute'));
export default function App() {
  return <Suspense fallback={<div style={{ padding: 40, color: '#94a3b8' }}>Loading Budget Engineer OS…</div>}><BimRoute /></Suspense>;
}