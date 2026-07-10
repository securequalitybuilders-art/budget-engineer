import { useMemo, useState } from 'react';
import type { ShadowPolygon } from '@/domain/site';
import { computeSunPosition, computeSunPath } from '@/engine/analysis/heliodon';
import { computeShadowPolygon, computeBuildingHeightFromFloors } from '@/engine/analysis/shadowCast';
import { generateSunPathSvg } from '@/lib/drawing/sunPathDiagram';
import { computeShadowOverlayConfig, generateShadowOverlaySvg } from '@/lib/drawing/shadowOverlay';

interface HeliodonViewProps {
  lat: number;
  lng: number;
  buildingFloors?: number;
  className?: string;
}

export function HeliodonView({ lat, lng, buildingFloors = 2, className = '' }: HeliodonViewProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [selectedHour, setSelectedHour] = useState(12);

  const date = useMemo(() => new Date(selectedDate + 'T12:00:00'), [selectedDate]);

  const sunPositions = useMemo(() => computeSunPath(lat, lng, date), [lat, lng, date]);

  const currentSun = useMemo(
    () => computeSunPosition(lat, lng, date, selectedHour),
    [lat, lng, date, selectedHour]
  );

  const sunPathSvg = useMemo(
    () =>
      generateSunPathSvg({
        width: 300,
        height: 300,
        margin: 30,
        sunPositions,
        selectedTime: currentSun.time,
      }),
    [sunPositions, currentSun]
  );

  const buildingFootprint = useMemo(
    () => ({
      vertices: [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 },
      ],
      height: computeBuildingHeightFromFloors(buildingFloors),
    }),
    [buildingFloors]
  );

  const shadows: ShadowPolygon[] = useMemo(
    () => {
      if (currentSun.elevation <= 0) return [];
      return [computeShadowPolygon(buildingFootprint, currentSun, currentSun.time)];
    },
    [buildingFootprint, currentSun]
  );

  const shadowConfig = useMemo(() => computeShadowOverlayConfig(200, 200, shadows), [shadows]);
  const shadowSvg = useMemo(() => generateShadowOverlaySvg(shadows, shadowConfig), [shadows, shadowConfig]);

  const hourOptions = Array.from({ length: 20 }, (_, i) => i + 4);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Hour
          </label>
          <select
            value={selectedHour}
            onChange={(e) => setSelectedHour(Number(e.target.value))}
            className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)]"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Sun Path
          </div>
          <div
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2"
            dangerouslySetInnerHTML={{ __html: sunPathSvg }}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Shadow
          </div>
          <div
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2"
            dangerouslySetInnerHTML={{ __html: shadowSvg }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-[var(--bg-tertiary)] px-3 py-2">
        <div className="text-xs text-[var(--text-secondary)]">
          Sun azimuth: <span className="font-semibold text-[var(--text-primary)]">{currentSun.azimuth.toFixed(1)}°</span>
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          Sun elevation: <span className="font-semibold text-[var(--text-primary)]">{currentSun.elevation.toFixed(1)}°</span>
        </div>
        {currentSun.elevation <= 0 && (
          <div className="text-xs font-medium text-amber-400">Sun is below horizon</div>
        )}
      </div>
    </div>
  );
}
