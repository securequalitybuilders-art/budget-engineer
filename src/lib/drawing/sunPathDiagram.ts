import type { SunPosition } from '@/domain/site';

export interface SunPathDiagramConfig {
  width: number;
  height: number;
  margin: number;
  sunPositions: SunPosition[];
  selectedTime?: Date;
}

export function generateSunPathSvg(config: SunPathDiagramConfig): string {
  const { width, height, margin, sunPositions, selectedTime } = config;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - margin;

  if (sunPositions.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="${cx}" y="${cy}" text-anchor="middle" fill="#64748b" font-size="12">No sun data</text>
    </svg>`;
  }

  const maxElevation = Math.max(...sunPositions.map((s) => s.elevation), 1);
  const scale = (elevation: number) => (elevation / maxElevation) * radius;

  const pathData = sunPositions
    .filter((s) => s.elevation > 0)
    .map((s) => {
      const aRad = ((s.azimuth - 180) * Math.PI) / 180;
      const r = scale(s.elevation);
      const x = cx + r * Math.sin(aRad);
      const y = cy + r * Math.cos(aRad);
      return { x, y, pos: s };
    });

  const pathD = pathData.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const elevationCircles = [0.25, 0.5, 0.75, 1.0].map((f) => {
    const r = f * radius;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#334155" stroke-width="0.5" stroke-dasharray="3 3"/>`;
  }).join('\n');

  const azimuthLines = [0, 45, 90, 135, 180, 225, 270, 315].map((az) => {
    const aRad = ((az - 180) * Math.PI) / 180;
    const x2 = cx + radius * Math.sin(aRad);
    const y2 = cy + radius * Math.cos(aRad);
    return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#334155" stroke-width="0.3"/>`;
  }).join('\n');

  const dirLabels = [
    { label: 'N', az: 0 }, { label: 'E', az: 90 },
    { label: 'S', az: 180 }, { label: 'W', az: 270 },
  ].map(({ label, az }) => {
    const aRad = ((az - 180) * Math.PI) / 180;
    const r = radius + 12;
    const x = cx + r * Math.sin(aRad);
    const y = cy + r * Math.cos(aRad);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="#94a3b8" font-size="10" font-family="Arial, sans-serif">${label}</text>`;
  }).join('\n');

  const selectedDot = selectedTime
    ? (() => {
        const match = pathData.find(
          (p) =>
            p.pos.time.getHours() === selectedTime.getHours() &&
            p.pos.time.getMinutes() === selectedTime.getMinutes()
        );
        if (!match) return '';
        return `<circle cx="${match.x.toFixed(1)}" cy="${match.y.toFixed(1)}" r="4" fill="#f59e0b" stroke="#1e293b" stroke-width="1.5"/>`;
      })()
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${elevationCircles}
    ${azimuthLines}
    ${dirLabels}
    <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.8"/>
    ${pathData.map((p) => {
      const h = p.pos.time.getHours();
      if (h >= 6 && h <= 18 && h % 2 === 0) {
        return `<text x="${(p.x + 4).toFixed(1)}" y="${(p.y - 4).toFixed(1)}" fill="#94a3b8" font-size="7" font-family="Arial, sans-serif">${h}:00</text>`;
      }
      return '';
    }).join('\n')}
    ${selectedDot}
  </svg>`;
}
