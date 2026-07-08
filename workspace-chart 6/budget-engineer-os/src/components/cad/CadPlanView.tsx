import { useMemo, useRef, useState } from 'react';
import { CadDocument, Vec2 } from '../../domain/types';
import { SectionConfig } from '../../lib/sectionSvg';

interface Props {
  cad: CadDocument;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeFloorId?: string | null;
  sectionMark?: SectionConfig | null;
  editable?: boolean;
  onMoveWall?: (wallId: string, dx: number, dy: number) => void;
  onMoveBlock?: (blockId: string, dx: number, dy: number) => void;
}

const SCALE = 28; // px per metre
const PAD = 30;

const MAT_COLOR: Record<string, string> = {
  concrete: '#1a365d', steel: '#64748b', timber: '#a0522d',
};

type Drag = {
  kind: 'wall' | 'block';
  id: string;
  startClientX: number;
  startClientY: number;
  dxPx: number;
  dyPx: number;
};

export function CadPlanView({
  cad, selectedId, onSelect, activeFloorId, sectionMark,
  editable = false, onMoveWall, onMoveBlock,
}: Props) {
  const floor = cad.floors.find((f) => f.id === activeFloorId) ?? cad.floors[0];
  const walls = cad.walls.filter((w) => w.floorId === floor.id);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const { w, h, ox, oy } = useMemo(() => {
    const pts = walls.flatMap((wl) => [wl.start, wl.end]);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs, 0); const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0); const maxY = Math.max(...ys, 1);
    return {
      w: (maxX - minX) * SCALE + PAD * 2,
      h: (maxY - minY) * SCALE + PAD * 2,
      ox: -minX * SCALE + PAD,
      oy: -minY * SCALE + PAD,
    };
  }, [walls]);

  const px = (p: Vec2) => p.x * SCALE + ox;
  const py = (p: Vec2) => h - (p.y * SCALE + oy);

  // convert a client-pixel delta to viewBox-pixel delta (handles SVG scaling)
  const clientToViewboxScale = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? w / rect.width : 1;
  };

  const startDrag = (kind: 'wall' | 'block', id: string) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    onSelect(`bim-${id}`);
    setDrag({ kind, id, startClientX: e.clientX, startClientY: e.clientY, dxPx: 0, dyPx: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const s = clientToViewboxScale();
    setDrag({ ...drag, dxPx: (e.clientX - drag.startClientX) * s, dyPx: (e.clientY - drag.startClientY) * s });
  };

  const endDrag = () => {
    if (!drag) return;
    // viewBox px → metres; Y is inverted in screen space
    const dxM = Math.round((drag.dxPx / SCALE) * 10) / 10;
    const dyM = Math.round((-drag.dyPx / SCALE) * 10) / 10;
    if (Math.abs(dxM) > 0.05 || Math.abs(dyM) > 0.05) {
      if (drag.kind === 'wall') onMoveWall?.(drag.id, dxM, dyM);
      else onMoveBlock?.(drag.id, dxM, dyM);
    }
    setDrag(null);
  };

  // live preview offset (viewBox px) for the element being dragged
  const previewFor = (kind: 'wall' | 'block', id: string) =>
    drag && drag.kind === kind && drag.id === id ? { tx: drag.dxPx, ty: drag.dyPx } : { tx: 0, ty: 0 };

  return (
    <svg
      ref={svgRef}
      width="100%" viewBox={`0 0 ${w} ${h}`}
      style={{ background: '#0b1220', borderRadius: 10, border: '1px solid #24324b', touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <defs>
        <pattern id="grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
          <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#1a2540" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#grid)" />

      {/* walls */}
      {walls.map((wl) => {
        const isSel = selectedId === `bim-${wl.id}`;
        const mat = wl.metadata.material ?? cad.materialSystem;
        const color = isSel ? '#06b6d4' : (wl.structural ? MAT_COLOR[mat] : '#475569');
        const sw = Math.max(wl.thickness * SCALE, wl.structural ? 6 : 4);
        const { tx, ty } = previewFor('wall', wl.id);
        return (
          <line
            key={wl.id}
            x1={px(wl.start) + tx} y1={py(wl.start) + ty} x2={px(wl.end) + tx} y2={py(wl.end) + ty}
            stroke={color} strokeWidth={sw} strokeLinecap="round"
            style={{ cursor: editable ? 'move' : 'pointer' }}
            onPointerDown={editable ? startDrag('wall', wl.id) : undefined}
            onClick={editable ? undefined : () => onSelect(`bim-${wl.id}`)}
          />
        );
      })}

      {/* opening markers */}
      {cad.openings.filter((o) => o.floorId === floor.id).map((o) => {
        const host = walls.find((wl) => wl.id === o.wallId);
        if (!host) return null;
        const len = Math.hypot(host.end.x - host.start.x, host.end.y - host.start.y);
        const t = o.offset / Math.max(len, 0.01);
        const { tx, ty } = previewFor('wall', host.id);
        const cx = px({ x: host.start.x + (host.end.x - host.start.x) * t, y: host.start.y + (host.end.y - host.start.y) * t }) + tx;
        const cy = py({ x: host.start.x + (host.end.x - host.start.x) * t, y: host.start.y + (host.end.y - host.start.y) * t }) + ty;
        return (
          <circle key={o.id} cx={cx} cy={cy} r={6}
            fill={o.kind === 'door' ? '#22c55e' : '#06b6d4'}
            stroke="#0b1220" strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect(`bim-${o.id}`)}
          />
        );
      })}

      {/* blocks */}
      {cad.blocks.filter((b) => b.floorId === floor.id).map((b) => {
        const isCol = b.kind === 'column';
        const fill = isCol ? MAT_COLOR[b.metadata.material ?? cad.materialSystem] : '#334155';
        const { tx, ty } = previewFor('block', b.id);
        return (
          <rect key={b.id}
            x={b.position.x * SCALE + ox + tx} y={h - (b.position.y * SCALE + oy) - b.depth * SCALE + ty}
            width={b.width * SCALE} height={b.depth * SCALE}
            fill={fill} stroke={selectedId === `bim-${b.id}` ? '#06b6d4' : '#64748b'} strokeWidth={1.5}
            opacity={0.75} rx={2}
            style={{ cursor: editable ? 'move' : 'pointer' }}
            onPointerDown={editable ? startDrag('block', b.id) : undefined}
            onClick={editable ? undefined : () => onSelect(`bim-${b.id}`)}
          />
        );
      })}

      {/* section-line marker */}
      {sectionMark && (() => {
        const bubble = sectionMark.axis === 'AA' ? 'A' : 'B';
        if (sectionMark.axis === 'AA') {
          const ly = py({ x: 0, y: sectionMark.position });
          return (
            <g>
              <line x1={6} y1={ly} x2={w - 6} y2={ly} stroke="#d4a574" strokeWidth={1.5} strokeDasharray="10 4 2 4" />
              {[14, w - 14].map((cx) => (
                <g key={cx}>
                  <circle cx={cx} cy={ly} r={9} fill="#0b1220" stroke="#d4a574" strokeWidth={1.5} />
                  <text x={cx} y={ly + 4} fill="#d4a574" fontSize={11} fontWeight={700} textAnchor="middle">{bubble}</text>
                </g>
              ))}
            </g>
          );
        }
        const lx = px({ x: sectionMark.position, y: 0 });
        return (
          <g>
            <line x1={lx} y1={6} x2={lx} y2={h - 6} stroke="#d4a574" strokeWidth={1.5} strokeDasharray="10 4 2 4" />
            {[14, h - 14].map((cy) => (
              <g key={cy}>
                <circle cx={lx} cy={cy} r={9} fill="#0b1220" stroke="#d4a574" strokeWidth={1.5} />
                <text x={lx} y={cy + 4} fill="#d4a574" fontSize={11} fontWeight={700} textAnchor="middle">{bubble}</text>
              </g>
            ))}
          </g>
        );
      })()}
    </svg>
  );
}
