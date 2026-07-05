import { useEffect, useMemo, useState } from 'react';
import { CadDocument, Vec2 } from '@/domain/ws6-types';
import { buildSectionSvg, SectionAxis, SectionConfig } from '@/lib/drawings/section-svg';

interface SectionViewProps {
  cad: CadDocument;
  onConfigChange?: (config: SectionConfig) => void;
}

export function SectionView({ cad, onConfigChange }: SectionViewProps) {
  const [axis, setAxis] = useState<SectionAxis>('AA');
  const [pos, setPos] = useState<number | null>(null);

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

  useEffect(() => {
    onConfigChange?.({ axis, position });
  }, [axis, position, onConfigChange]);

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-4">
      <h3 className="font-semibold text-stone-100">Building Section</h3>
      <p className="mb-3 text-xs text-stone-400">Selectable cut · A–A (looking N) or B–B (looking E)</p>

      <div className="mb-3 flex gap-2">
        <button
          onClick={() => { setAxis('AA'); setPos(null); }}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            axis === 'AA' ? 'bg-cyan-700 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          Section A–A
        </button>
        <button
          onClick={() => { setAxis('BB'); setPos(null); }}
          className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
            axis === 'BB' ? 'bg-cyan-700 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
          }`}
        >
          Section B–B
        </button>
      </div>

      <label className="mb-1 block text-xs font-medium text-stone-400">
        Cut position · {axis === 'AA' ? 'Y' : 'X'} = {position.toFixed(1)} m
      </label>
      <input
        type="range" min={lo} max={hi} step={0.1} value={position}
        onChange={(e) => setPos(Number(e.target.value))}
        className="mb-3 w-full"
      />

      <div
        className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-950"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-2 text-xs text-stone-400">
        Choose the section line and slide the cut plane. Only openings on the cut plane (±0.6 m)
        are shown; green = door, cyan = window, sand = stair. Generated from the same model as the plans and BOQ.
      </p>
    </div>
  );
}
