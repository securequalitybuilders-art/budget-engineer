import { useState, useMemo } from 'react'
import { GlbViewer } from './GlbViewer'
import type { SiteContext } from '@/domain/site'
import { computeSunPosition } from '@/engine/analysis/heliodon'

interface GlbSiteViewerProps {
  glbUrl: string | null
  site: SiteContext | null
  height?: number | string
  onExportClick?: () => void
  isExporting?: boolean
  exportError?: string | null
}

function formatAzimuth(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const i = Math.round(((deg + 360) % 360) / 45) % 8
  return `${dirs[i]} (${Math.round(deg)}°)`
}

function formatElevation(deg: number): string {
  return `${Math.round(deg)}° above horizon`
}

export function GlbSiteViewer({
  glbUrl,
  site,
  height = 480,
  onExportClick,
  isExporting = false,
  exportError = null,
}: GlbSiteViewerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedHour, setSelectedHour] = useState(12)

  const sunPosition = useMemo(() => {
    if (!site) return null
    const dateStr = selectedDate || new Date().toISOString().slice(0, 10)
    const date = new Date(dateStr + 'T12:00:00Z')
    return computeSunPosition(site.lat, site.lng, date, selectedHour)
  }, [site, selectedDate, selectedHour])

  const hours = Array.from({ length: 20 }, (_, i) => i + 4)

  return (
    <div className="flex h-full flex-col gap-3 lg:flex-row">
      <div className="flex-1">
        <GlbViewer
          glbUrl={glbUrl}
          height={height}
          onExportClick={onExportClick}
          isExporting={isExporting}
          exportError={exportError}
        />
      </div>

      {site && (
        <div className="w-full space-y-3 lg:w-72">
          <div className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-3">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Site Context
            </h4>
            <div className="space-y-1 text-[11px] text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">Latitude</span>
                <span>{site.lat.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Longitude</span>
                <span>{site.lng.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Orientation</span>
                <span>{site.orientation}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Terrain</span>
                <span className="capitalize">{site.terrain}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-3">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Sun Study
            </h4>

            <div className="mb-2 space-y-1.5">
              <label className="block text-[10px] font-medium text-stone-400">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded border border-stone-700 bg-stone-800 px-2 py-1 text-[11px] text-stone-200"
              />
            </div>

            <div className="mb-2 space-y-1.5">
              <label className="block text-[10px] font-medium text-stone-400">Time</label>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="w-full rounded border border-stone-700 bg-stone-800 px-2 py-1 text-[11px] text-stone-200"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            {sunPosition && (
              <div className="space-y-1 rounded-md bg-stone-800/60 p-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-stone-400">Azimuth</span>
                  <span className="text-amber-300">{formatAzimuth(sunPosition.azimuth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Elevation</span>
                  <span className="text-amber-300">{formatElevation(sunPosition.elevation)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
