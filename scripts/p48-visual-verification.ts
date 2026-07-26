// P48.5 Runtime Visual Verification
// Generates SVG plans and a structured multi-storey report for 140m² and 160m² 2-storey residential
import { generatePlanModel } from '../src/engine/plan-generator'
import { exportPlanToSvg } from '../src/lib/export/svg-export'
import { getMinimumDimensions } from '../src/lib/geometry/plan-intelligence'
import * as fs from 'fs'
import * as path from 'path'

function makeOption(area: number) {
  return { id: 'test', name: 'Test', buildingType: 'house' as const, grossFloorArea: area, floors: 2, elements: [] }
}

const FLOOR_HEIGHT = 3.0
const WALL_THICKNESS = 0.2

function generateSectionSvg(plan: import('../src/domain/plan').PlanModel): string {
  const pxPerM = 200
  const svgW = 800
  const svgH = 600
  const ox = 100
  const oy = 50
  const footprintDepth = plan.height / (2 * 1.1)
  const floorBoundary = footprintDepth * 1.1 / 2
  const groundRooms = plan.rooms.filter(r => r.y < floorBoundary && !r.name.startsWith('['))
  const upperRooms = plan.rooms.filter(r => r.y >= floorBoundary && !r.name.startsWith('['))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="100%" height="100%" fill="#1e293b" />
  <text x="${svgW / 2}" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#f8fafc" font-weight="bold">Section A-A — Cross Section</text>
  <rect x="${ox}" y="${oy + 120}" width="${pxPerM * 8}" height="${WALL_THICKNESS * pxPerM}" fill="#64748b" />
  <text x="${ox + pxPerM * 8 + 10}" y="${oy + 120 + 8}" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">Slab-on-grade</text>
  <rect x="${ox}" y="${oy + 120 - FLOOR_HEIGHT * pxPerM}" width="${pxPerM * 8}" height="${FLOOR_HEIGHT * pxPerM}" fill="#334155" fill-opacity="0.3" stroke="#475569" stroke-width="1" />
  <text x="${ox + pxPerM * 4}" y="${oy + 120 - FLOOR_HEIGHT * pxPerM / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#cbd5e1">Ground Floor (${groundRooms.length} rooms)</text>
  <rect x="${ox}" y="${oy + 120 - FLOOR_HEIGHT * pxPerM}" width="${pxPerM * 8}" height="${WALL_THICKNESS * pxPerM}" fill="#64748b" />
  <text x="${ox + pxPerM * 8 + 10}" y="${oy + 120 - FLOOR_HEIGHT * pxPerM + 8}" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">Suspended slab</text>
  <rect x="${ox}" y="${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM}" width="${pxPerM * 8}" height="${FLOOR_HEIGHT * pxPerM}" fill="#334155" fill-opacity="0.3" stroke="#475569" stroke-width="1" />
  <text x="${ox + pxPerM * 4}" y="${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM + FLOOR_HEIGHT * pxPerM / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#cbd5e1">Upper Floor (${upperRooms.length} rooms)</text>
  <rect x="${ox}" y="${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM - 0.15 * pxPerM}" width="${pxPerM * 8}" height="${0.15 * pxPerM}" fill="#64748b" />
  <path d="M ${ox} ${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM - 0.15 * pxPerM} L ${ox + pxPerM * 4} ${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM - 0.6 * pxPerM} L ${ox + pxPerM * 8} ${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM - 0.15 * pxPerM}" fill="none" stroke="#94a3b8" stroke-width="2" />
  <g fill="#f59e0b" fill-opacity="0.4" stroke="#f59e0b" stroke-width="1">
    <rect x="${ox + pxPerM * 3}" y="${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM}" width="${pxPerM * 1.5}" height="${2 * FLOOR_HEIGHT * pxPerM}" />
    <text x="${ox + pxPerM * 3.75}" y="${oy + 120 - FLOOR_HEIGHT * pxPerM}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#fef3c7">Stair Core</text>
  </g>
  <line x1="${ox}" y1="${oy + 120 + 30}" x2="${ox + pxPerM * 8}" y2="${oy + 120 + 30}" stroke="#94a3b8" stroke-width="1" />
  <text x="${ox + pxPerM * 4}" y="${oy + 120 + 42}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">8.0m (nominal building width)</text>
  <line x1="${ox - 30}" y1="${oy + 120}" x2="${ox - 30}" y2="${oy + 120 - FLOOR_HEIGHT * pxPerM}" stroke="#94a3b8" stroke-width="1" />
  <text x="${ox - 35}" y="${oy + 120 - FLOOR_HEIGHT * pxPerM / 2}" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">3.0m</text>
  <line x1="${ox - 30}" y1="${oy + 120 - FLOOR_HEIGHT * pxPerM}" x2="${ox - 30}" y2="${oy + 120 - 2 * FLOOR_HEIGHT * pxPerM}" stroke="#94a3b8" stroke-width="1" />
  <text x="${ox - 35}" y="${oy + 120 - 1.5 * FLOOR_HEIGHT * pxPerM}" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">3.0m</text>
  <rect x="${ox}" y="${oy + 120 + 60}" width="${pxPerM * 8}" height="60" fill="#1e293b" stroke="#334155" stroke-width="1" />
  <text x="${ox + 10}" y="${oy + 120 + 75}" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">2-Storey Residential — ${plan.rooms.filter(r => !r.name.startsWith('[')).length} rooms total</text>
  <text x="${ox + 10}" y="${oy + 120 + 90}" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">Core/Shaft: continuous through both floors</text>
  <text x="${ox + 10}" y="${oy + 120 + 105}" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">Ground: public zones (lounge, kitchen)  |  Upper: private zones (bedrooms, bathrooms)</text>
</svg>`
}

function generateElevationSvg(plan: import('../src/domain/plan').PlanModel, view: 'front' | 'side'): string {
  const footprintDepth = plan.height / (2 * 1.1)
  const width = view === 'front' ? plan.width : footprintDepth
  const label = view === 'front' ? 'Front Elevation' : 'Side Elevation'
  const pxPerM = Math.min(500 / Math.max(width, 1), 200)
  const svgW = 800
  const svgH = 500
  const ox = 100
  const oy = 50

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="100%" height="100%" fill="#1e293b" />
  <text x="${svgW / 2}" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#f8fafc" font-weight="bold">${label}</text>
  <rect x="${ox}" y="${oy + 2 * FLOOR_HEIGHT * pxPerM + 20}" width="${width * pxPerM}" height="3" fill="#475569" />
  <text x="${ox + width * pxPerM + 10}" y="${oy + 2 * FLOOR_HEIGHT * pxPerM + 22}" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">Ground level</text>
  <rect x="${ox}" y="${oy}" width="${width * pxPerM}" height="${2 * FLOOR_HEIGHT * pxPerM}" fill="#334155" fill-opacity="0.5" stroke="#475569" stroke-width="1.5" />
  <line x1="${ox}" y1="${oy + FLOOR_HEIGHT * pxPerM}" x2="${ox + width * pxPerM}" y2="${oy + FLOOR_HEIGHT * pxPerM}" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4" />
  <text x="${ox + 5}" y="${oy + FLOOR_HEIGHT * pxPerM - 5}" font-family="Arial, sans-serif" font-size="9" fill="#94a3b8">Floor level +3.0m</text>
  <text x="${ox + 5}" y="${oy + 2 * FLOOR_HEIGHT * pxPerM - 5}" font-family="Arial, sans-serif" font-size="9" fill="#94a3b8">Floor level +6.0m</text>
  <g fill="#0ea5e9" fill-opacity="0.15" stroke="#0ea5e9" stroke-width="0.5">
    <rect x="${ox + width * pxPerM * 0.15}" y="${oy + 0.3 * FLOOR_HEIGHT * pxPerM}" width="${width * pxPerM * 0.2}" height="${0.5 * FLOOR_HEIGHT * pxPerM}" rx="2" />
    <rect x="${ox + width * pxPerM * 0.65}" y="${oy + 0.3 * FLOOR_HEIGHT * pxPerM}" width="${width * pxPerM * 0.2}" height="${0.5 * FLOOR_HEIGHT * pxPerM}" rx="2" />
    <rect x="${ox + width * pxPerM * 0.15}" y="${oy + FLOOR_HEIGHT * pxPerM + 0.3 * FLOOR_HEIGHT * pxPerM}" width="${width * pxPerM * 0.2}" height="${0.5 * FLOOR_HEIGHT * pxPerM}" rx="2" />
    <rect x="${ox + width * pxPerM * 0.65}" y="${oy + FLOOR_HEIGHT * pxPerM + 0.3 * FLOOR_HEIGHT * pxPerM}" width="${width * pxPerM * 0.2}" height="${0.5 * FLOOR_HEIGHT * pxPerM}" rx="2" />
  </g>
  <rect x="${ox + width * pxPerM * 0.4}" y="${oy + FLOOR_HEIGHT * pxPerM + 0.1 * FLOOR_HEIGHT * pxPerM}" width="${width * pxPerM * 0.1}" height="${0.9 * FLOOR_HEIGHT * pxPerM}" fill="#7c3aed" fill-opacity="0.2" stroke="#7c3aed" stroke-width="1" rx="1" />
  <text x="${ox + width * pxPerM * 0.45}" y="${oy + FLOOR_HEIGHT * pxPerM + 0.5 * FLOOR_HEIGHT * pxPerM}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#a78bfa">ENTRANCE</text>
  <line x1="${ox}" y1="${oy + 2 * FLOOR_HEIGHT * pxPerM + 35}" x2="${ox + width * pxPerM}" y2="${oy + 2 * FLOOR_HEIGHT * pxPerM + 35}" stroke="#94a3b8" stroke-width="1" />
  <text x="${ox + width * pxPerM / 2}" y="${oy + 2 * FLOOR_HEIGHT * pxPerM + 47}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">${width.toFixed(1)}m</text>
  <line x1="${ox + width * pxPerM + 20}" y1="${oy}" x2="${ox + width * pxPerM + 20}" y2="${oy + 2 * FLOOR_HEIGHT * pxPerM}" stroke="#94a3b8" stroke-width="1" />
  <text x="${ox + width * pxPerM + 25}" y="${oy + FLOOR_HEIGHT * pxPerM}" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">6.0m</text>
</svg>`
}

// === Main ===
const tempDir = process.env.TEMP || '/tmp'
const outDir = path.join(tempDir, 'p48-visual-verification')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

for (const area of [140, 160]) {
  const origNow = Date.now
  Date.now = () => 42

  const plan = generatePlanModel(makeOption(area))

  Date.now = origNow

  // Plan SVG
  fs.writeFileSync(path.join(outDir, `${area}m2-plan.svg`), exportPlanToSvg(plan), 'utf-8')

  // Section SVG
  fs.writeFileSync(path.join(outDir, `${area}m2-section.svg`), generateSectionSvg(plan), 'utf-8')

  // Elevations
  fs.writeFileSync(path.join(outDir, `${area}m2-front-elevation.svg`), generateElevationSvg(plan, 'front'), 'utf-8')
  fs.writeFileSync(path.join(outDir, `${area}m2-side-elevation.svg`), generateElevationSvg(plan, 'side'), 'utf-8')

  // Structured multi-storey report
  const floorBoundary = (plan.height / 2) / 2
  const groundRooms = plan.rooms.filter(r => r.y < floorBoundary && !r.name.startsWith('['))
  const upperRooms = plan.rooms.filter(r => r.y >= floorBoundary && !r.name.startsWith('['))
  const constraints = plan.rooms.filter(r => r.name.startsWith('['))

  // Overlap check
  let overlaps = 0
  const overlapDetails: string[] = []
  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i], b = plan.rooms[j]
      if (a.name === 'Circulation' || b.name === 'Circulation') continue
      if (a.name.startsWith('[') || b.name.startsWith('[')) continue
      const aFloor = Math.floor(a.y / (plan.height / 2))
      const bFloor = Math.floor(b.y / (plan.height / 2))
      if (aFloor !== bFloor) continue
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
        overlaps++
        if (overlapDetails.length < 5) overlapDetails.push(`${a.name} ↔ ${b.name}`)
      }
    }
  }

  // Dimension check
  const dimIssues: string[] = []
  for (const r of plan.rooms) {
    if (r.name.startsWith('[')) continue
    const d = getMinimumDimensions(r.name)
    if (r.width < d.minWidth - 0.01) dimIssues.push(`${r.name} w=${r.width.toFixed(2)}<${d.minWidth}`)
    else if (r.height < d.minDepth - 0.01) dimIssues.push(`${r.name} d=${r.height.toFixed(2)}<${d.minDepth}`)
  }

  console.log(`\n=== ${area}m² 2-Storey Visual Verification ===`)
  console.log(`  Plan: ${plan.width.toFixed(2)}m × ${plan.height.toFixed(2)}m`)
  console.log(`  Rooms: ${groundRooms.length} ground + ${upperRooms.length} upper = ${groundRooms.length + upperRooms.length} total`)
  console.log(`  Constraints: ${constraints.length}`)
  console.log(`  Walls: ${plan.walls.length}  Openings: ${plan.openings.length}`)
  console.log(`  Overlaps: ${overlaps} ${overlaps === 0 ? '✓' : '✗'}`)
  console.log(`  Dim issues: ${dimIssues.length} ${dimIssues.length === 0 ? '✓' : '✗'}`)
  console.log(`  Core ground: ${constraints.some(r => r.y < floorBoundary) ? '✓' : '✗'}`)
  console.log(`  Core upper:  ${constraints.some(r => r.y >= floorBoundary) ? '✓' : '✗'}`)
  console.log(`  Upper rooms ≥5: ${upperRooms.length >= 5 ? '✓' : '✗'} (has ${upperRooms.length})`)

  console.log(`\n  Ground floor rooms:`)
  for (const r of groundRooms) console.log(`    ${(r.name as string).padEnd(18)} ${r.width.toFixed(2)}×${r.height.toFixed(2)}  @ (${r.x.toFixed(2)},${r.y.toFixed(2)})`)
  console.log(`\n  Upper floor rooms:`)
  for (const r of upperRooms) console.log(`    ${(r.name as string).padEnd(18)} ${r.width.toFixed(2)}×${r.height.toFixed(2)}  @ (${r.x.toFixed(2)},${r.y.toFixed(2)})`)
  console.log(`\n  Constraint markers:`)
  for (const r of constraints) console.log(`    ${(r.name as string).padEnd(18)} ${r.width.toFixed(2)}×${r.height.toFixed(2)}  @ (${r.x.toFixed(2)},${r.y.toFixed(2)})`)
}

console.log(`\nSVG files written to ${outDir}/`)
