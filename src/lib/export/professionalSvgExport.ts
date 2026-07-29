import type { PlanModel } from '@/domain/plan'

export function exportProfessionalSvg(plan: PlanModel): string {
  const scale = 50
  const margin = 60
  const width = Math.ceil(plan.width * scale + margin * 2)
  const height = Math.ceil(plan.height * scale + margin * 2 + 40)

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <marker id="dot" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4">
        <circle cx="3" cy="3" r="1.5" fill="#d94f4f"/>
      </marker>
      <marker id="tick" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4">
        <line x1="3" y1="0" x2="3" y2="6" stroke="#d94f4f" stroke-width="1"/>
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff"/>`,
  ]

  const ox = margin
  const oy = margin

  const s = (v: number) => v * scale

  for (const wall of plan.walls) {
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const thick = Math.max(wall.thickness * scale, 3)
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
    const cx = (wall.start.x + wall.end.x) / 2
    const cy = (wall.start.y + wall.end.y) / 2
    const fill = wall.type === 'external' ? '#000000' : '#ffffff'
    const stroke = wall.type === 'external' ? '#1a1a1a' : '#6b7280'
    const strokeW = wall.type === 'external' ? '1.5' : '0.8'
    parts.push(`
    <rect x="${ox + s(cx) - s(wl) / 2}" y="${oy + s(cy) - thick / 2}" width="${s(wl)}" height="${thick}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" transform="rotate(${-angle * (180 / Math.PI)}, ${ox + s(cx)}, ${oy + s(cy)})"/>`)
  }

  for (const opening of plan.openings) {
    const wall = plan.walls.find((w) => w.id === opening.wallId)
    if (!wall) continue
    const wl = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y)
    if (wl < 0.01) continue
    const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x)
    const opWidth = opening.width * scale
    const wcX = wall.start.x + (wall.end.x - wall.start.x) * opening.offset
    const wcY = wall.start.y + (wall.end.y - wall.start.y) * opening.offset

    const thick = Math.max(wall.thickness * scale, 3)

    if (opening.kind === 'door') {
      const swingRadius = Math.min(opWidth, thick * 2)
      parts.push(`
    <line x1="${ox + s(wcX)}" y1="${oy + s(wcY)}" x2="${ox + s(wcX) + Math.cos(angle) * opWidth}" y2="${oy + s(wcY) + Math.sin(angle) * opWidth}" stroke="#c2782b" stroke-width="0.8"/>
    <path d="M ${ox + s(wcX)} ${oy + s(wcY)} A ${swingRadius} ${swingRadius} 0 0 1 ${ox + s(wcX) + Math.cos(angle - Math.PI / 2) * swingRadius} ${oy + s(wcY) + Math.sin(angle - Math.PI / 2) * swingRadius}" fill="none" stroke="#c2782b" stroke-width="0.6" stroke-dasharray="2 1.5"/>
    <circle cx="${ox + s(wcX)}" cy="${oy + s(wcY)}" r="1.5" fill="#c2782b"/>`)
    } else {
      const gap = Math.max(thick * 0.15, 2)
      parts.push(`
    <rect x="${ox + s(wcX) - opWidth / 2}" y="${oy + s(wcY) - thick / 2}" width="${opWidth}" height="${thick}" fill="#ffffff" stroke="#4a90d9" stroke-width="0.6"/>
    <line x1="${ox + s(wcX)}" y1="${oy + s(wcY) - thick / 2}" x2="${ox + s(wcX)}" y2="${oy + s(wcY) + thick / 2}" stroke="#4a90d9" stroke-width="0.4"/>
    <line x1="${ox + s(wcX) - opWidth / 4}" y1="${oy + s(wcY) - thick / 2 + gap}" x2="${ox + s(wcX) - opWidth / 4}" y2="${oy + s(wcY) + thick / 2 - gap}" stroke="#4a90d9" stroke-width="0.4"/>
    <line x1="${ox + s(wcX) + opWidth / 4}" y1="${oy + s(wcY) - thick / 2 + gap}" x2="${ox + s(wcX) + opWidth / 4}" y2="${oy + s(wcY) + thick / 2 - gap}" stroke="#4a90d9" stroke-width="0.4"/>`)
    }
  }

  for (const room of plan.rooms) {
    parts.push(`
    <rect x="${ox + s(room.x)}" y="${oy + s(room.y)}" width="${s(room.width)}" height="${s(room.height)}" fill="none" stroke="#e5e7eb" stroke-width="0.3"/>
    <text x="${ox + s(room.x + room.width / 2)}" y="${oy + s(room.y + room.height / 2)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1a1a1a">${escapeXml(room.name.toUpperCase())}</text>
    <text x="${ox + s(room.x + room.width / 2)}" y="${oy + s(room.y + room.height / 2) + 13}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#6b7280">${(room.width * room.height).toFixed(1)} m²</text>`)
  }

  const dimY = margin - 15
  const dimX = margin - 15
  parts.push(`
    <line x1="${ox}" y1="${dimY}" x2="${ox + s(plan.width)}" y2="${dimY}" stroke="#d94f4f" stroke-width="0.5"/>
    <line x1="${ox}" y1="${dimY - 4}" x2="${ox}" y2="${dimY + 4}" stroke="#d94f4f" stroke-width="0.5"/>
    <line x1="${ox + s(plan.width)}" y1="${dimY - 4}" x2="${ox + s(plan.width)}" y2="${dimY + 4}" stroke="#d94f4f" stroke-width="0.5"/>
    <text x="${ox + s(plan.width) / 2}" y="${dimY - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#d94f4f">${(plan.width * 1000).toFixed(0)}</text>
    <line x1="${dimX}" y1="${oy}" x2="${dimX}" y2="${oy + s(plan.height)}" stroke="#d94f4f" stroke-width="0.5"/>
    <line x1="${dimX - 4}" y1="${oy}" x2="${dimX + 4}" y2="${oy}" stroke="#d94f4f" stroke-width="0.5"/>
    <line x1="${dimX - 4}" y1="${oy + s(plan.height)}" x2="${dimX + 4}" y2="${oy + s(plan.height)}" stroke="#d94f4f" stroke-width="0.5"/>
    <text x="${dimX - 8}" y="${oy + s(plan.height) / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#d94f4f" transform="rotate(-90, ${dimX - 8}, ${oy + s(plan.height) / 2})">${(plan.height * 1000).toFixed(0)}</text>`)

  const arrowSize = 14
  const arrowX = ox + s(plan.width) + 30
  const arrowY = oy + 25
  parts.push(`
    <circle cx="${arrowX}" cy="${arrowY}" r="${arrowSize}" fill="none" stroke="#1a1a1a" stroke-width="0.6"/>
    <polygon points="${arrowX},${arrowY - arrowSize + 2} ${arrowX - 5},${arrowY + 2} ${arrowX + 5},${arrowY + 2}" fill="#d94f4f" stroke="none"/>
    <text x="${arrowX}" y="${arrowY + arrowSize + 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#1a1a1a">N</text>`)

  const sbX = ox
  const sbY = oy + s(plan.height) + 30
  const sbLen = s(plan.width) * 0.3
  const sbSeg = sbLen / 4
  parts.push(`
    <line x1="${sbX}" y1="${sbY}" x2="${sbX + sbLen}" y2="${sbY}" stroke="#1a1a1a" stroke-width="0.6"/>
    <rect x="${sbX}" y="${sbY - 4}" width="${sbSeg}" height="8" fill="#1a1a1a"/>
    <rect x="${sbX + sbSeg * 2}" y="${sbY - 4}" width="${sbSeg}" height="8" fill="#1a1a1a"/>
    <text x="${sbX}" y="${sbY + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="#1a1a1a">0</text>
    <text x="${sbX + sbLen / 4}" y="${sbY + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="#1a1a1a">${(plan.width * 0.25).toFixed(1)}m</text>
    <text x="${sbX + sbLen / 2}" y="${sbY + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="#1a1a1a">${(plan.width * 0.5).toFixed(1)}m</text>
    <text x="${sbX + sbLen * 3 / 4}" y="${sbY + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="#1a1a1a">${(plan.width * 0.75).toFixed(1)}m</text>`)

  const tbX = ox
  const tbY = height - 35
  parts.push(`
    <rect x="${tbX}" y="${tbY}" width="140" height="22" fill="none" stroke="#1a1a1a" stroke-width="0.5"/>
    <text x="${tbX + 5}" y="${tbY + 8}" font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="#1a1a1a">FLOOR PLAN</text>
    <text x="${tbX + 5}" y="${tbY + 15}" font-family="Arial, sans-serif" font-size="5" fill="#6b7280">DzeNhare OS</text>
    <text x="${tbX + 5}" y="${tbY + 20}" font-family="Arial, sans-serif" font-size="5" fill="#6b7280">${new Date().toLocaleDateString()}</text>`)

  parts.push(`
    <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="#1a1a1a" stroke-width="0.6"/>
    <text x="${ox}" y="${height - 10}" font-family="Arial, sans-serif" font-size="6" fill="#9ca3af">DIMENSIONS IN MILLIMETRES</text>`)

  parts.push(`</svg>`)

  return parts.join('\n')
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
