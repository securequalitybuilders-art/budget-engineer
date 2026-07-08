import React, { Suspense, useEffect } from 'react';
import { useAppStore } from './store/appStore';

const BimRoute = React.lazy(() => import('./routes/BimRoute'));

export default function App() {
  const initialize = useAppStore(state => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e2e8f0] flex flex-col">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-[#94a3b8]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Budget Engineer Computational Design OS...</span>
          </div>
        </div>
      }>
        <BimRoute />
      </Suspense>
    </div>
  );
}
