import { useEffect, useMemo, useState } from 'react';
import { CadDocument, Vec2 } from '../../domain/types';
import { buildSectionSvg, SectionAxis } from '../../lib/sectionSvg';
import { useAppStore } from '../../store/appStore';

export function SectionView({ cad }: { cad: CadDocument }) {
  const [axis, setAxis] = useState<SectionAxis>('AA');
  const [pos, setPos] = useState<number | null>(null);
  const setSectionConfig = useAppStore((s) => s.setSectionConfig);

  // extent of the cut-plane coordinate (Y for AA, X for BB)
  const { lo, hi, mid } = useMemo(() => {
    const planeOf = (p: Vec2) => (axis === 'AA' ? p.y : p.x);
    const vals = cad.walls.flatMap((w) => [planeOf(w.start), planeOf(w.end)]);
    const lo = Math.min(...vals, 0);
    const hi = Math.max(...vals, 1);
    return { lo, hi, mid: (lo + hi) / 2 };
  }, [cad, axis]);

  const position = pos ?? mid;
  const svg = useMemo(
    () => buildSectionSvg(cad, undefined, { axis, position }),
    [cad, axis, position],
  );

  // share the active cut with the rest of the app (plan marker + dossier)
  useEffect(() => {
    setSectionConfig({ axis, position });
  }, [axis, position, setSectionConfig]);

  return (
    <div className="panel">
      <h3>Stage 64 · Building Section</h3>
      <p className="sub">Selectable cut · A–A (looking N) or B–B (looking E)</p>

      <div className="btn-row" style={{ marginBottom: 10 }}>
        <button className={axis === 'AA' ? 'active' : ''} onClick={() => { setAxis('AA'); setPos(null); }}>Section A–A</button>
        <button className={axis === 'BB' ? 'active' : ''} onClick={() => { setAxis('BB'); setPos(null); }}>Section B–B</button>
      </div>

      <label className="field">Cut position · {axis === 'AA' ? 'Y' : 'X'} = {position.toFixed(1)} m</label>
      <input
        type="range" min={lo} max={hi} step={0.1} value={position}
        onChange={(e) => setPos(Number(e.target.value))}
        style={{ width: '100%' }}
      />

      <div
        style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #24324b', background: '#0b1220', marginTop: 10 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="note" style={{ marginTop: 10 }}>
        Choose the section line and slide the cut plane. Only openings on the cut plane (±0.6 m)
        are shown; green = door, cyan = window, sand = stair. Generated from the same model as the plans and BOQ.
      </p>
    </div>
  );
}
