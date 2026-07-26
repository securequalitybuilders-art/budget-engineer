import type { PlanModel } from '../../domain/plan'

export function exportPlanToSvg(plan: PlanModel): string {
  const scale = 40
  const width = Math.ceil(plan.width * scale + 120)
  const height = Math.ceil(plan.height * scale + 120)
  const ox = 60
  const oy = 60

  const rooms = plan.rooms.map((room) => `
    <rect x="${ox + room.x * scale}" y="${oy + room.y * scale}" width="${room.width * scale}" height="${room.height * scale}" fill="${room.color ?? '#334155'}" fill-opacity="0.2" stroke="#94a3b8" stroke-width="1" />
    <text x="${ox + (room.x + room.width / 2) * scale}" y="${oy + (room.y + room.height / 2) * scale}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#ffffff">${escapeXml(room.name)}</text>
  `).join('\n')

  const walls = plan.walls.map((wall) => `
    <line x1="${ox + wall.start.x * scale}" y1="${oy + wall.start.y * scale}" x2="${ox + wall.end.x * scale}" y2="${oy + wall.end.y * scale}" stroke="${wall.type === 'external' ? '#ffffff' : '#cbd5e1'}" stroke-width="${wall.thickness * scale}" stroke-linecap="square" />
  `).join('\n')

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#020617" />
    ${rooms}
    ${walls}
  </svg>`
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
