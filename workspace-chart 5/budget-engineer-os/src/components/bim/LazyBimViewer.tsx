import React, { Suspense } from 'react';
const BimViewer = React.lazy(() => import('./BimViewer'));
import type { BimModel } from '../../domain/bim';
interface Props { bim: BimModel | null; selectedId: string | null; onSelect: (id: string) => void; highlightIds?: string[]; removedIds?: string[]; modifiedIds?: string[]; }
export default function LazyBimViewer(props: Props) {
  return <Suspense fallback={<div style={{ padding: 40, color: '#94a3b8' }}>Loading 3D viewer…</div>}><BimViewer {...props} /></Suspense>;
}