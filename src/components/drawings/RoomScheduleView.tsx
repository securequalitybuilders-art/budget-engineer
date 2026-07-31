import { useMemo } from 'react'
import type { PlanModel } from '@/domain/plan'
import { buildRoomScheduleRows } from '@/lib/drawings/roomScheduleRows'

interface RoomScheduleViewProps {
  activePlan: PlanModel | null
}

export function RoomScheduleView({ activePlan }: RoomScheduleViewProps) {
  const rows = useMemo(() => {
    if (!activePlan) return null
    try {
      return buildRoomScheduleRows(activePlan)
    } catch {
      return null
    }
  }, [activePlan])

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-stone-700/60 bg-stone-900/40 p-12">
        <p className="text-sm text-stone-400">No rooms in the current plan.</p>
      </div>
    )
  }

  const totalArea = rows.reduce((s, r) => s + r.areaM2, 0)
  const compliantCount = rows.filter((r) => r.compliant).length
  const wetCount = rows.filter((r) => r.wetCore).length

  return (
    <div className="overflow-auto rounded-lg border border-stone-700/60 bg-stone-950/80">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-stone-700/60 bg-stone-900/80 text-stone-400">
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-left font-medium uppercase tracking-wider">NO.</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-left font-medium uppercase tracking-wider">ROOM NAME</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-left font-medium uppercase tracking-wider">ZONE</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-right font-medium uppercase tracking-wider">DIMS (mm)</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-right font-medium uppercase tracking-wider">AREA (m²)</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-right font-medium uppercase tracking-wider">MIN (m²)</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-center font-medium uppercase tracking-wider">STATUS</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-center font-medium uppercase tracking-wider">WET</th>
            <th className="sticky top-0 bg-stone-900/80 px-3 py-2 text-center font-medium uppercase tracking-wider">LIGHT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.number}
              className="border-b border-stone-800/60 transition-colors hover:bg-stone-800/40"
            >
              <td className="px-3 py-1.5 text-stone-400">{String(row.number).padStart(2, '0')}</td>
              <td className="px-3 py-1.5 font-medium text-stone-200">{row.name}</td>
              <td className="px-3 py-1.5">
                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  row.zone === 'Public' ? 'bg-emerald-600/20 text-emerald-300' :
                  row.zone === 'Private' ? 'bg-blue-600/20 text-blue-300' :
                  'bg-amber-600/20 text-amber-300'
                }`}>
                  {row.zone}
                </span>
              </td>
              <td className="px-3 py-1.5 text-right text-stone-300 font-mono">{row.widthMm} × {row.heightMm}</td>
              <td className="px-3 py-1.5 text-right text-stone-200 font-mono">{row.areaM2.toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right text-stone-400 font-mono">{row.minSadcM2}</td>
              <td className="px-3 py-1.5 text-center">
                {row.compliant ? (
                  <span className="text-emerald-400 font-bold">✓</span>
                ) : (
                  <span className="text-red-400 font-bold" title={`Below SADC minimum of ${row.minSadcM2} m²`}>✗</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-center">
                {row.wetCore ? <span className="text-cyan-400">●</span> : <span className="text-stone-700">—</span>}
              </td>
              <td className="px-3 py-1.5 text-center">
                {row.naturalLight ? <span className="text-amber-400">●</span> : <span className="text-stone-700">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center gap-4 border-t border-stone-700/60 bg-stone-900/60 px-4 py-2 text-[10px] text-stone-400">
        <span><strong className="text-stone-300">Total area:</strong> {totalArea.toFixed(2)} m²</span>
        <span><strong className="text-stone-300">Compliant:</strong> {compliantCount}/{rows.length}</span>
        <span><strong className="text-stone-300">Wet cores:</strong> {wetCount}</span>
      </div>
    </div>
  )
}
