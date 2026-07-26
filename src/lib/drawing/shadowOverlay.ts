import type { ShadowPolygon, Point2D } from '@/domain/site';

export interface ShadowOverlayConfig {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

function polygonPoints(vertices: Point2D[], ox: number, oy: number, scale: number): string {
  return vertices
    .map((v) => `${((v.x * scale) + ox).toFixed(1)},${((v.y * scale) + oy).toFixed(1)}`)
    .join(' ');
}

export function generateShadowOverlaySvg(
  shadows: ShadowPolygon[],
  config: ShadowOverlayConfig
): string {
  const { width, height, offsetX, offsetY, scale } = config;

  if (shadows.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#64748b" font-size="12">No shadow data</text>
    </svg>`;
  }

  const polygons = shadows
    .filter((s) => s.vertices.length >= 3)
    .map(
      (s) =>
        `<polygon points="${polygonPoints(s.vertices, offsetX, offsetY, scale)}" fill="${s.color}" opacity="${s.opacity}" stroke="${s.color}" stroke-width="0.3"/>`
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${polygons}
  </svg>`;
}

export function computeShadowOverlayConfig(
  viewWidth: number,
  viewHeight: number,
  shadows: ShadowPolygon[]
): ShadowOverlayConfig {
  if (shadows.length === 0) {
    return { width: viewWidth, height: viewHeight, offsetX: 0, offsetY: 0, scale: 1 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shadows) {
    for (const v of s.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
  }

  const boundsW = maxX - minX || 1;
  const boundsH = maxY - minY || 1;
  const margin = 40;
  const scaleX = (viewWidth - margin * 2) / boundsW;
  const scaleY = (viewHeight - margin * 2) / boundsH;
  const scale = Math.min(scaleX, scaleY, 10);

  const offsetX = margin - minX * scale + (viewWidth - margin * 2 - boundsW * scale) / 2;
  const offsetY = margin - minY * scale + (viewHeight - margin * 2 - boundsH * scale) / 2;

  return { width: viewWidth, height: viewHeight, offsetX, offsetY, scale };
}
