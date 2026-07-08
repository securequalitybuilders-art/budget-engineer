import { lazy, Suspense } from 'react';
import type { BimElement } from '../../domain/bim';

const BimViewer = lazy(() => import('./BimViewer').then((m) => ({ default: m.BimViewer })));

export function LazyBimViewer(props: {
  elements: BimElement[];
  ghostElements?: BimElement[];
  activeFloorId: string | 'all';
  selectedElementId?: string;
  highlightIds?: string[];
  removedIds?: string[];
  modifiedIds?: string[];
  onSelect: (id?: string) => void;
}) {
  return (
    <Suspense fallback={<div style={{ minHeight: 620, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg,#07111f,#0f172a)', border: '1px solid #24324b', borderRadius: 20, color: '#94a3b8' }}>Loading 3D BIM viewer…</div>}>
      <BimViewer {...props} />
    </Suspense>
  );
}
