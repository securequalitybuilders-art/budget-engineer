import type { ScheduleSet } from '@/lib/boq/schedules'
import { buildScheduleCsv } from '@/lib/boq/schedules'
import { downloadTextFile } from '@/adapters/designToBoq'

interface SchedulesPanelProps {
  schedules: ScheduleSet | null
}

export function SchedulesPanel({ schedules }: SchedulesPanelProps) {
  if (!schedules) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-stone-400">
        Generate a BOQ first to view schedules.
      </div>
    )
  }

  const hasData =
    schedules.doors.length > 0 ||
    schedules.windows.length > 0 ||
    schedules.roomFinishes.length > 0 ||
    schedules.sanitary.length > 0 ||
    schedules.electricalPoints.length > 0 ||
    schedules.hvac.length > 0 ||
    schedules.roof.length > 0 ||
    schedules.materialTakeoff.length > 0

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-stone-400">
        No schedule data available for this design depth.
      </div>
    )
  }

  const handleExportCsv = () => {
    const csv = buildScheduleCsv(schedules)
    downloadTextFile('schedules.csv', csv)
  }

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/40 p-3">
      <h4 className="mb-2 text-xs font-semibold text-stone-300 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  )

  const Table = ({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-stone-400 border-b border-stone-700/40">
            {headers.map((h, i) => (
              <th key={i} className="px-2 py-1 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-stone-800/40 text-stone-300">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Schedules of Materials & Works</h3>
        <button
          onClick={handleExportCsv}
          className="rounded bg-cyan-600/20 px-2.5 py-1 text-[10px] font-medium text-cyan-400 hover:bg-cyan-600/30"
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-3">
        {schedules.doors.length > 0 && (
          <SectionCard title="Door Schedule">
            <Table
              headers={['Mark', 'Type', 'Width', 'Height', 'Qty', 'Material', 'Finish', 'Ironmongery']}
              rows={schedules.doors.map((d) => [d.mark, d.type, `${d.widthMm}mm`, `${d.heightMm}mm`, d.qty, d.material, d.finish, d.ironmongery])}
            />
          </SectionCard>
        )}

        {schedules.windows.length > 0 && (
          <SectionCard title="Window Schedule">
            <Table
              headers={['Mark', 'Type', 'Width', 'Height', 'Qty', 'Frame', 'Glazing', 'Opening']}
              rows={schedules.windows.map((w) => [w.mark, w.type, `${w.widthMm}mm`, `${w.heightMm}mm`, w.qty, w.frame, w.glazing, w.opening])}
            />
          </SectionCard>
        )}

        {schedules.roomFinishes.length > 0 && (
          <SectionCard title="Room Finish Schedule">
            <Table
              headers={['Room', 'Area (m²)', 'Floor', 'Wall', 'Ceiling', 'Skirting', 'Waterproofing']}
              rows={schedules.roomFinishes.map((r) => [r.room, r.floorAreaM2.toFixed(1), r.floorFinish, r.wallFinish, r.ceilingFinish, r.skirting, r.waterproofing])}
            />
          </SectionCard>
        )}

        {schedules.sanitary.length > 0 && (
          <SectionCard title="Sanitary Schedule">
            <Table
              headers={['Fixture', 'Type', 'Qty', 'Cold', 'Hot', 'Waste']}
              rows={schedules.sanitary.map((s) => [s.fixture, s.type, s.qty, s.cold ? 'Y' : 'N', s.hot ? 'Y' : 'N', s.waste ? 'Y' : 'N'])}
            />
          </SectionCard>
        )}

        {schedules.electricalPoints.length > 0 && (
          <SectionCard title="Electrical Point Schedule">
            <Table
              headers={['Point', 'Type', 'Qty', 'Circuit', 'Rating']}
              rows={schedules.electricalPoints.map((e) => [e.point, e.type, e.qty, e.circuit, `${e.ratingA}A`])}
            />
          </SectionCard>
        )}

        {schedules.hvac.length > 0 && (
          <SectionCard title="HVAC / Mechanical Schedule">
            <Table
              headers={['Unit', 'Type', 'Capacity', 'Qty', 'Area', 'Refrigerant']}
              rows={schedules.hvac.map((h) => [h.unit, h.type, `${h.capacityKw}kW`, h.qty, h.area, h.refrigerant])}
            />
          </SectionCard>
        )}

        {schedules.roof.length > 0 && (
          <SectionCard title="Roof Schedule">
            <Table
              headers={['Section', 'Area (m²)', 'Pitch', 'Covering', 'Insulation', 'Structure']}
              rows={schedules.roof.map((r) => [r.section, r.areaM2.toFixed(1), `${r.pitchDeg}°`, r.covering, r.insulation, r.structure])}
            />
          </SectionCard>
        )}

        {schedules.materialTakeoff.length > 0 && (
          <SectionCard title="Core Material Takeoff">
            <Table
              headers={['Material', 'Unit', 'Quantity', 'Waste %', 'Total']}
              rows={schedules.materialTakeoff.map((m) => [m.material, m.unit, m.quantity.toFixed(1), `${m.wastePct}%`, m.totalQuantity.toFixed(1)])}
            />
          </SectionCard>
        )}
      </div>
    </div>
  )
}
