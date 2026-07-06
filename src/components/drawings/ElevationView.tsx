import type { ElevationDrawing, ElevationLine, ElevationRect, ElevationPolygon, ElevationText } from '@/adapters/planToElevations'

interface ElevationViewProps {
  drawing: ElevationDrawing | null
}

function renderLines(lines: ElevationLine[]) {
  return lines.map((l, i) => (
    <line
      key={`l-${i}`}
      x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
      stroke={l.stroke ?? '#f8fafc'}
      strokeWidth={l.strokeWidth ?? 0.04}
      strokeLinecap="round"
      strokeDasharray={l.dashed ? '0.18 0.12' : undefined}
    />
  ))
}

function renderRects(rects: ElevationRect[]) {
  return rects.map((r, i) => (
    <rect
      key={`r-${i}`}
      x={r.x} y={r.y} width={r.w} height={r.h}
      fill={r.fill ?? 'none'}
      stroke={r.stroke ?? '#f8fafc'}
      strokeWidth={r.strokeWidth ?? 0.04}
    />
  ))
}

function renderPolygons(polygons: ElevationPolygon[]) {
  return polygons.map((p, i) => {
    const pts = p.points.map(pt => `${pt.x},${pt.y}`).join(' ')
    return (
      <polygon
        key={`p-${i}`}
        points={pts}
        fill={p.fill ?? 'none'}
        stroke={p.stroke ?? '#f8fafc'}
        strokeWidth={p.strokeWidth ?? 0.04}
        strokeLinejoin="round"
      />
    )
  })
}

function renderTexts(texts: ElevationText[]) {
  return texts.map((t, i) => (
    <text
      key={`t-${i}`}
      x={t.x} y={t.y}
      fontSize={t.fontSize ?? 0.4}
      fill={t.fill ?? '#f8fafc'}
      textAnchor={(t.anchor ?? 'start') as 'start' | 'middle' | 'end' | 'inherit'}
      dominantBaseline="central"
      fontFamily="system-ui, sans-serif"
    >
      {t.text}
    </text>
  ))
}

export function ElevationView({ drawing }: ElevationViewProps) {
  if (!drawing) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
        <p className="text-sm text-stone-400">Drawing unavailable — no active plan</p>
      </div>
    )
  }

  const [vbW, vbH] = drawing.viewBox.split(' ').slice(2).map(Number)

  return (
    <div className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-950/80">
      <div className="border-b border-stone-700/60 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{drawing.title}</h3>
      </div>
      <svg
        viewBox={drawing.viewBox}
        className="block h-auto w-full"
        role="img"
        aria-label={drawing.title}
        style={{ maxHeight: '70vh', minHeight: 200 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <rect x="0" y="0" width={vbW} height={vbH} fill="transparent" />
        {renderLines(drawing.lines)}
        {renderRects(drawing.rects)}
        {renderPolygons(drawing.polygons)}
        {renderTexts(drawing.texts)}
      </svg>
      <div className="border-t border-stone-700/60 px-3 py-1.5">
        <p className="text-[10px] text-stone-400">Dimensions in metres · Scale approximate</p>
      </div>
    </div>
  )
}
