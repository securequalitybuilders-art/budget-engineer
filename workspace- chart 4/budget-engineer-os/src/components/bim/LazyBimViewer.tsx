import React, { Suspense } from 'react';

const BimViewer = React.lazy(() => import('./BimViewer'));

export function LazyBimViewer() {
  return (
    <Suspense fallback={
      <div className="bg-[#0b1220] border border-[#24324b] rounded-xl h-[450px] flex items-center justify-center text-[#94a3b8] text-sm shadow-inner">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
          <span>Synthesizing 3D BIM massing & boolean voids...</span>
        </div>
      </div>
    }>
      <BimViewer />
    </Suspense>
  );
}
