import { useMemo } from 'react'
import type { PlanModel } from '@/domain/plan'

interface RoomScheduleViewProps {
  activePlan: PlanModel | null
}

type ZoneClass = 'Public' | 'Private' | 'Service'

interface RoomRow {
  number: number
  name: string
  zone: ZoneClass
  widthMm: number
  heightMm: number
  areaM2: number
  minSadcM2: number
  compliant: boolean
  wetCore: boolean
  naturalLight: boolean
}

const SADC_MIN_AREAS: Record<string, number> = {
  'master bedroom': 16,
  bedroom: 12,
  'single bedroom': 9,
  'double bedroom': 14,
  'living room': 20,
  lounge: 20,
  'dining room': 12,
  kitchen: 8,
  bathroom: 3.5,
  'ensuite': 3,
  wc: 1.5,
  toilet: 1.5,
  study: 8,
  corridor: 2,
  hallway: 3,
  laundry: 4,
  pantry: 2,
  store: 3,
  garage: 18,
  entrance: 4,
  family: 16,
  sitting: 14,
  dressing: 4,
}

const WET_CORE_NAMES = new Set(['bathroom', 'wc', 'toilet', 'kitchen', 'laundry', 'pantry', 'ensuite'])
const PUBLIC_ZONE_NAMES = new Set(['living room', 'lounge', 'dining room', 'family', 'sitting', 'entrance', 'hallway'])
const PRIVATE_ZONE_NAMES = new Set(['master bedroom', 'bedroom', 'single bedroom', 'double bedroom', 'study', 'dressing'])

function classifyZone(name: string): ZoneClass {
  const lower = name.toLowerCase().trim()
  if (PUBLIC_ZONE_NAMES.has(lower)) return 'Public'
  if (PRIVATE_ZONE_NAMES.has(lower)) return 'Private'
  if (WET_CORE_NAMES.has(lower)) return 'Service'
  return 'Service'
}

function isWetCore(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return WET_CORE_NAMES.has(lower)
}

function requiresNaturalLight(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (isWetCore(lower) && lower !== 'pantry' && lower !== 'store') return true
  return PUBLIC_ZONE_NAMES.has(lower) || PRIVATE_ZONE_NAMES.has(lower)
}

function getMinArea(name: string): number {
  const lower = name.toLowerCase().trim()
  return SADC_MIN_AREAS[lower] ?? 6
}

function buildRows(plan: PlanModel): RoomRow[] {
  return plan.rooms.map((room, i) => {
    const area = room.width * room.height
    const minArea = getMinArea(room.name)
    return {
      number: i + 1,
      name: room.name,
      zone: classifyZone(room.name),
      widthMm: Math.round(room.width * 1000),
      heightMm: Math.round(room.height * 1000),
      areaM2: Math.round(area * 100) / 100,
      minSadcM2: minArea,
      compliant: area >= minArea - 0.5,
      wetCore: isWetCore(room.name),
      naturalLight: requiresNaturalLight(room.name),
    }
  })
}

export function RoomScheduleView({ activePlan }: RoomScheduleViewProps) {
  const rows = useMemo(() => {
    if (!activePlan) return null
    try {
      return buildRows(activePlan)
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

export function buildRoomScheduleRows(plan: PlanModel): RoomRow[] {
  return buildRows(plan)
}
