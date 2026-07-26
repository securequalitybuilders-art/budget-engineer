interface ElevationDiagnosticsProps {
  pipeline: 'rich-svg' | 'legacy-fallback' | 'none'
  fallbackReason?: string
  roomCount: number
  openingCountOnFace: number
  floorCount: number
  segmentCount: number
  conversionOk: boolean
}

export function ElevationDiagnostics({
  pipeline,
  fallbackReason,
  roomCount,
  openingCountOnFace,
  floorCount,
  segmentCount,
  conversionOk,
}: ElevationDiagnosticsProps) {
  const badgeColor = pipeline === 'rich-svg' ? 'bg-emerald-600/20 text-emerald-300 border-emerald-700/40'
    : pipeline === 'legacy-fallback' ? 'bg-amber-600/20 text-amber-300 border-amber-700/40'
    : 'bg-stone-700/30 text-stone-400 border-stone-600/30'

  return (
    <div className="rounded border border-stone-700/40 bg-stone-900/60 px-2.5 py-1.5 text-[10px] leading-relaxed text-stone-400">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`rounded border px-1.5 py-0.5 font-medium ${badgeColor}`}>
          {pipeline === 'rich-svg' ? 'Rich SVG' : pipeline === 'legacy-fallback' ? 'Legacy Fallback' : 'N/A'}
        </span>

        {pipeline === 'legacy-fallback' && fallbackReason && (
          <span className="text-amber-400">
            ⚠ {fallbackReason}
          </span>
        )}

        {pipeline === 'rich-svg' && conversionOk && (
          <span className="text-emerald-400/70">Conversion OK</span>
        )}

        <span>Rooms: {roomCount}</span>
        <span>Floors: {floorCount}</span>
        <span>Openings on face: {openingCountOnFace}</span>
        <span>Frontage segments: {segmentCount}</span>
      </div>
    </div>
  )
}
