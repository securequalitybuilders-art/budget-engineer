import { lazy, Suspense, useState } from 'react';
import { useAppStore } from '../../store/appStore';

// Lazy-load the heavy three.js viewer only when the user asks for it,
// keeping it entirely off the initial critical path.
const BimViewer = lazy(() => import('./BimViewer'));

export function BimViewerPanel() {
  const bim = useAppStore((s) => s.bim);
  const materialSystem = useAppStore((s) => s.materialSystem);
  const [show, setShow] = useState(false);

  if (!bim) return null;

  const wallCount = bim.elements.filter((e) => e.type === 'wall').length;
  const floorCount = bim.floors.length;

  return (
    <div className="panel">
      <h3>Stage 67 · 3D BIM Model</h3>
      <p className="sub">{floorCount} storey · {wallCount} walls · drag to orbit, scroll to zoom</p>

      {show ? (
        <Suspense fallback={<p className="note" style={{ padding: 40, textAlign: 'center' }}>Loading 3D engine…</p>}>
          <BimViewer bim={bim} materialSystem={materialSystem} />
        </Suspense>
      ) : (
        <div style={{
          height: 220, display: 'grid', placeItems: 'center', textAlign: 'center',
          background: '#0b1220', border: '1px dashed #24324b', borderRadius: 10,
        }}>
          <div>
            <button className="primary" onClick={() => setShow(true)}>▶ Load 3D Viewer</button>
            <p className="note" style={{ marginTop: 10 }}>
              The 3D engine (three.js) loads on demand — kept off the initial page so the
              app stays fast.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {[
          ['Walls', '#1a365d'], ['Slab', '#334155'], ['Roof', '#475569'],
          ['Door', '#22c55e'], ['Window', '#06b6d4'], ['Stair', '#d4a574'],
        ].map(([label, color]) => (
          <span key={label} className="legend-row">
            <span className="swatch" style={{ background: color }} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
