import type { PlanModel } from '../../domain/plan'
import type { DesignOption } from '../../domain/boq'
import type { EnhancedBrief } from './briefEnhancer'
import type { TopologyCandidate } from '../tier3/multiObjectiveOptimizer'
import type { ComplianceReport } from '../compliance/types'
import { DEFAULT_STOREY_HEIGHT, ROOF_PITCH_HEIGHT } from '../../adapters/planTo3d'
import type { ElevationDrawing } from '../../adapters/planToElevations'
import {
  resolveFrontElevation,
  resolveRearElevation,
  resolveLeftElevation,
  resolveRightElevation,
  resolveSection,
} from '../../lib/drawings/elevationResolver'
import { CONSTRUCTION_DETAILS } from '../construction/constructionDetails'

export interface Iso7200TitleBlock {
  drawingTitle: string
  projectName: string
  projectNumber: string
  drawingNumber: string
  revision: string
  date: string
  scale: string
  sheetNumber: string
  totalSheets: number
  discipline: string
  status: 'PRELIMINARY' | 'FOR_APPROVAL' | 'FOR_CONSTRUCTION' | 'AS_BUILT'
  author: string
  checker: string
  approvedBy: string
}

export type SheetDiscipline = 'A' | 'S' | 'M' | 'E' | 'P' | 'L' | 'G'

export interface CouncilSheet {
  sheetNumber: string
  sadcCode: string
  discipline: SheetDiscipline
  title: string
  description: string
  scale: string
  isPlanView: boolean
  generateContent: () => { svgContent?: string; tableData?: Record<string, string>[] }
}

export interface RoomScheduleEntry {
  roomNumber: string
  roomName: string
  floorLevel: string
  areaM2: number
  widthM: number
  depthM: number
  classification: 'habitable' | 'wet-core' | 'circulation' | 'service'
}

export interface CouncilPackage {
  projectName: string
  projectNumber: string
  issueDate: string
  sheets: CouncilSheet[]
  roomSchedule: RoomScheduleEntry[]
  drawingRegister: { sheetNumber: string; title: string; scale: string; revision: string }[]
  boqSummary: { category: string; totalCost: number; currency: string }
  complianceCertificate: ComplianceReport | null
  titleBlock: Iso7200TitleBlock
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fallbackSvg(title: string, note: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" width="720" height="420">
  <rect x="0" y="0" width="720" height="420" fill="#ffffff"/>
  <text x="40" y="60" font-size="20" font-weight="bold" fill="#0f172a">${esc(title)}</text>
  <text x="40" y="100" font-size="14" fill="#64748b">${esc(note)}</text>
</svg>`
}

function elevationToSvg(drawing: ElevationDrawing | null, title: string): string {
  if (!drawing) return fallbackSvg(title, 'Drawing unavailable - no active plan data.')
  const k = 60
  const lines = drawing.lines
    .map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.stroke ?? '#0f172a'}" stroke-width="${((l.strokeWidth ?? 0.08) * k).toFixed(1)}"${l.dashed ? ' stroke-dasharray="10 8"' : ''}/>`)
    .join('\n')
  const rects = drawing.rects
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill ?? 'none'}" stroke="${r.stroke ?? '#0f172a'}" stroke-width="${((r.strokeWidth ?? 0.08) * k).toFixed(1)}"/>`)
    .join('\n')
  const polys = drawing.polygons
    .map((p) => `<polygon points="${p.points.map((pt) => `${pt.x},${pt.y}`).join(' ')}" fill="${p.fill ?? 'none'}" stroke="${p.stroke ?? '#0f172a'}" stroke-width="${((p.strokeWidth ?? 0.08) * k).toFixed(1)}"/>`)
    .join('\n')
  const texts = drawing.texts
    .map((t) => `<text x="${t.x}" y="${t.y}" font-size="${((t.fontSize ?? 0.3) * k).toFixed(1)}" fill="${t.fill ?? '#334155'}" text-anchor="${t.anchor ?? 'start'}">${esc(t.text)}</text>`)
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${drawing.viewBox}" width="760" height="560">
  <rect x="0" y="0" width="760" height="560" fill="#ffffff"/>
  <g transform="translate(20 20) scale(${(720 / (Number(drawing.viewBox.split(' ')[2]) + 40)).toFixed(3)})">
    ${lines}
    ${rects}
    ${polys}
    ${texts}
  </g>
</svg>`
}

function planToSvg(plan: PlanModel, title: string): string {
  const W = 720
  const H = 540
  const M = 40
  const bw = plan.width || 10
  const bh = plan.height || 10
  const s = Math.min((W - M * 2) / bw, (H - M * 2 - 70) / bh)
  const ox = M + (W - M * 2 - bw * s) / 2
  const oy = M + 70 + (H - M * 2 - 70 - bh * s) / 2

  const roomFills = ['#eef2ff', '#ecfeff', '#fef3c7', '#fce7f3', '#f0fdf4', '#fff7ed', '#f8fafc', '#fef9c3']

  const rooms = plan.rooms
    .map((r, i) => {
      const x = ox + r.x * s
      const y = oy + r.y * s
      const w = r.width * s
      const h = r.height * s
      const fill = roomFills[i % roomFills.length]
      return `<g>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" fill-opacity="0.55" stroke="#cbd5e1" stroke-width="1"/>
        <text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + 5).toFixed(1)}" font-size="13" fill="#334155" text-anchor="middle">${esc(r.name)}</text>
      </g>`
    })
    .join('\n')

  const walls = plan.walls
    .map((w) => {
      const isExt = w.type === 'external'
      return `<line x1="${(ox + w.start.x * s).toFixed(1)}" y1="${(oy + w.start.y * s).toFixed(1)}" x2="${(ox + w.end.x * s).toFixed(1)}" y2="${(oy + w.end.y * s).toFixed(1)}" stroke="${isExt ? '#334155' : '#94a3b8'}" stroke-width="${isExt ? 7 : 3}"/>`
    })
    .join('\n')

  const openings = plan.openings
    .map((o) => {
      const wall = plan.walls.find((w) => w.id === o.wallId)
      if (!wall) return ''
      const cx = wall.start.x + (wall.end.x - wall.start.x) * Math.max(0, Math.min(1, o.offset))
      const cy = wall.start.y + (wall.end.y - wall.start.y) * Math.max(0, Math.min(1, o.offset))
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const len = Math.hypot(dx, dy) || 1
      const nx = dx / len
      const ny = dy / len
      const halfW = o.width / 2
      const x1 = ox + (cx - nx * halfW) * s
      const y1 = oy + (cy - ny * halfW) * s
      const x2 = ox + (cx + nx * halfW) * s
      const y2 = oy + (cy + ny * halfW) * s
      const color = o.kind === 'door' ? '#f59e0b' : '#0ea5e9'
      const mark = o.kind === 'door' ? 'D' : 'W'
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="6"/>
        <text x="${((x1 + x2) / 2).toFixed(1)}" y="${((y1 + y2) / 2 + 5).toFixed(1)}" font-size="11" fill="${color}" text-anchor="middle" font-weight="bold">${mark}</text>`
    })
    .join('\n')

  const note = `Scale ${plan.scaleLabel ?? '1:100'} - ${bw.toFixed(1)}m x ${bh.toFixed(1)}m`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
  <text x="${M}" y="40" font-size="20" font-weight="bold" fill="#0f172a">${esc(title)}</text>
  <text x="${M}" y="62" font-size="13" fill="#64748b">${esc(note)}</text>
  ${rooms}
  ${walls}
  ${openings}
</svg>`
}

function constructionDetailsSvg(): string {
  const W = 760
  const H = 1080
  const colW = (W - 40) / 2
  const rowH = 330
  const cards = CONSTRUCTION_DETAILS
    .map((d, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 20 + col * colW
      const y = 60 + row * rowH
      const dims = d.dimensions
        .slice(0, 4)
        .map((dim, di) => `<text x="${x + 10}" y="${y + 120 + di * 22}" font-size="11" fill="#475569">${esc(dim.label)}: ${esc(dim.value)}</text>`)
        .join('\n')
      const notes = d.constructionNotes
        .slice(0, 2)
        .map((n, ni) => `<text x="${x + 10}" y="${y + 220 + ni * 22}" font-size="10" fill="#64748b">- ${esc(n.slice(0, 90))}</text>`)
        .join('\n')
      return `<g>
        <rect x="${x}" y="${y}" width="${colW - 10}" height="${rowH - 16}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
        <text x="${x + 10}" y="${y + 28}" font-size="12" font-weight="bold" fill="#0f172a">${i + 1}. ${esc(d.title)}</text>
        <text x="${x + 10}" y="${y + 52}" font-size="10" fill="#334155">${esc(d.description.slice(0, 110))}</text>
        <text x="${x + 10}" y="${y + 90}" font-size="10" font-weight="bold" fill="#0f172a">Scale ${esc(d.scale)}</text>
        ${dims}
        ${notes}
      </g>`
    })
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
  <text x="20" y="36" font-size="20" font-weight="bold" fill="#0f172a">Construction Details (SADC Standard)</text>
  ${cards}
</svg>`
}

function complianceCertificateSvg(report: ComplianceReport | null): string {
  const W = 720
  const H = 560
  const body = report
    ? `
  <text x="60" y="150" font-size="15" fill="#334155">Jurisdiction: <tspan font-weight="bold">${esc(report.jurisdiction)}</tspan></text>
  <text x="60" y="190" font-size="34" font-weight="bold" fill="${report.score >= 80 ? '#15803d' : report.score >= 60 ? '#b45309' : '#b91c1c'}">${report.score}%</text>
  <text x="60" y="220" font-size="13" fill="#64748b">Overall compliance score</text>
  <text x="60" y="260" font-size="14" fill="#334155">Rules passed: ${report.passedRules} of ${report.totalRules}</text>
  ${report.warnings.map((w, i) => `<text x="60" y="${290 + i * 24}" font-size="12" fill="#b45309">&#8226; ${esc(w)}</text>`).join('\n')}
  <text x="60" y="${report.warnings.length > 0 ? 320 + report.warnings.length * 24 : 320}" font-size="11" fill="#94a3b8">Certificate issued by Budget Engineer AI - verify with the local council before construction.</text>`
    : `
  <text x="60" y="150" font-size="14" fill="#b45309">No compliance report available.</text>
  <text x="60" y="180" font-size="12" fill="#64748b">Run the compliance engine (SANS 10400 / local by-laws) before issuing this certificate.</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <text x="60" y="90" font-size="24" font-weight="bold" fill="#0f172a">COMPLIANCE CERTIFICATE</text>
  ${body}
</svg>`
}

function buildRoomSchedule(plan: PlanModel): RoomScheduleEntry[] {
  return plan.rooms.map((r, i) => {
    const name = r.name.toLowerCase()
    let classification: RoomScheduleEntry['classification'] = 'habitable'
    const wetCoreNames = ['bathroom', 'ensuite', 'wc', 'laundry', 'pantry', 'kitchen']
    const circulationNames = ['corridor', 'hallway', 'stairwell', 'circulation']
    const serviceNames = ['store', 'plant', 'garage', 'utility']
    if (wetCoreNames.some((w) => name.includes(w))) classification = 'wet-core'
    else if (circulationNames.some((c) => name.includes(c))) classification = 'circulation'
    else if (serviceNames.some((s) => name.includes(s))) classification = 'service'
    return {
      roomNumber: String(i + 1).padStart(3, '0'),
      roomName: r.name,
      floorLevel: 'Ground Floor',
      areaM2: Math.round(r.width * r.height * 100) / 100,
      widthM: Math.round(r.width * 100) / 100,
      depthM: Math.round(r.height * 100) / 100,
      classification,
    }
  })
}

function buildDefaultTitleBlock(drawingTitle: string, projectName: string, sheetNumber: string): Iso7200TitleBlock {
  return {
    drawingTitle,
    projectName,
    projectNumber: 'BE-2026-001',
    drawingNumber: sheetNumber,
    revision: 'A',
    date: new Date().toISOString().slice(0, 10),
    scale: '1:100',
    sheetNumber,
    totalSheets: 18,
    discipline: 'A',
    status: 'FOR_APPROVAL',
    author: 'Budget Engineer AI',
    checker: '',
    approvedBy: '',
  }
}

export function assembleCouncilPackage(
  plan: PlanModel,
  design: DesignOption,
  brief: EnhancedBrief,
  _selectedCandidate: TopologyCandidate,
  complianceReport: ComplianceReport | null,
  projectName?: string,
): CouncilPackage {
  const pn = projectName ?? `${brief.typology?.displayName ?? 'Building'} - ${brief.siteInfo.widthM ?? 20}m x ${brief.siteInfo.depthM ?? 25}m`
  const projectNumber = 'BE-2026-001'
  const issueDate = new Date().toISOString().slice(0, 10)

  const schedule = buildRoomSchedule(plan)
  const floors = Math.max(1, design.floors ?? 1)
  const storeyHeight = DEFAULT_STOREY_HEIGHT
  const pitchHeight = ROOF_PITCH_HEIGHT
  const buildingType = design.buildingType

  const sheets: CouncilSheet[] = []

  const addSheet = (
    sheetNumber: string,
    title: string,
    description: string,
    scale: string,
    isPlanView: boolean,
    content?: () => { svgContent?: string; tableData?: Record<string, string>[] },
  ) => {
    sheets.push({
      sheetNumber,
      sadcCode: `SANS 0143-${sheetNumber}`,
      discipline: 'A',
      title,
      description,
      scale,
      isPlanView,
      generateContent: content ?? (() => ({})),
    })
  }

  // A-001 Drawing Register & Notes - content resolves against the final sheet list
  addSheet(
    'A-001',
    'Drawing Register & Notes',
    'Index of all drawings in this submission with general notes and conventions',
    'NTS',
    false,
    () => ({
      tableData: sheets.map((s) => ({
        sheetNumber: s.sheetNumber,
        title: s.title,
        scale: s.scale,
        revision: 'A',
        status: 'FOR APPROVAL',
      })),
    }),
  )

  addSheet('A-101', 'Site Plan', 'Site layout showing building footprint, setbacks, access and services', '1:200', true, () => ({ svgContent: planToSvg(plan, 'Site Plan') }))
  addSheet('A-102', 'Ground Floor Plan', `Ground floor plan - ${brief.typology?.displayName ?? 'Residential'}`, '1:100', true, () => ({ svgContent: planToSvg(plan, 'Ground Floor Plan') }))
  addSheet('A-103', 'First Floor Plan', 'Upper floor layout and stair connection', '1:100', true, () => ({ svgContent: planToSvg(plan, 'First Floor Plan') }))
  addSheet('A-104', 'Roof Plan', 'Roof layout showing pitch, overhangs, drainage and roof plane annotations', '1:100', true, () => ({ svgContent: planToSvg(plan, 'Roof Plan') }))
  addSheet('A-105', 'Foundation Plan', 'Strip footing layout with dimensions and reinforcement notes', '1:100', true, () => ({ svgContent: planToSvg(plan, 'Foundation Plan') }))

  addSheet('A-201', 'Front Elevation', 'Front (south) elevation with fenestration and material indications', '1:100', false, () => ({
    svgContent: elevationToSvg(resolveFrontElevation(plan, floors, storeyHeight, pitchHeight, buildingType), 'Front Elevation'),
  }))
  addSheet('A-202', 'Rear Elevation', 'Rear (north) elevation', '1:100', false, () => ({
    svgContent: elevationToSvg(resolveRearElevation(plan, floors, storeyHeight, pitchHeight), 'Rear Elevation'),
  }))
  addSheet('A-203', 'Left Side Elevation', 'Left (west) elevation', '1:100', false, () => ({
    svgContent: elevationToSvg(resolveLeftElevation(plan, floors, storeyHeight, pitchHeight), 'Left Side Elevation'),
  }))
  addSheet('A-204', 'Right Side Elevation', 'Right (east) elevation', '1:100', false, () => ({
    svgContent: elevationToSvg(resolveRightElevation(plan, floors, storeyHeight, pitchHeight), 'Right Side Elevation'),
  }))

  addSheet('A-301', 'Section A-A', 'Cross-section through building showing floor-to-floor heights, roof structure and foundations', '1:50', false, () => ({
    svgContent: elevationToSvg(resolveSection(plan, floors, storeyHeight, pitchHeight, buildingType), 'Section A-A'),
  }))
  addSheet('A-302', 'Section B-B', 'Longitudinal section through building', '1:50', false, () => ({
    svgContent: elevationToSvg(resolveSection(plan, floors, storeyHeight, pitchHeight, buildingType), 'Section B-B'),
  }))

  addSheet('A-401', 'Electrical Layout', 'Power, lighting, and communication points', '1:100', true, () => ({ svgContent: planToSvg(plan, 'Electrical Layout') }))
  addSheet('A-402', 'Plumbing Layout', 'Hot/cold water supply, drainage, and vent pipe routing', '1:100', true, () => ({ svgContent: planToSvg(plan, 'Plumbing Layout') }))

  addSheet('A-501', 'Door & Window Schedule', 'Schedule of all openings with sizes, type, material and glazing specification', 'NTS', false, () => ({
    tableData: plan.openings.map((o, i) => ({
      mark: `${o.kind === 'door' ? 'D' : 'W'}${i + 1}`,
      type: o.kind === 'door' ? 'Door' : 'Window',
      widthMM: String(Math.round(o.width * 1000)),
      heightMM: String(Math.round((o.height ?? 2.1) * 1000)),
      sillHeightMM: o.kind === 'window' ? String(Math.round((o.sillHeight ?? 0.9) * 1000)) : '0',
      material: o.kind === 'door' ? 'Timber panel' : 'Aluminium sliding',
      notes: '',
    })),
  }))
  addSheet('A-502', 'Room Schedule', 'Complete room list with areas and classifications', 'NTS', false, () => ({
    tableData: schedule.map((r) => ({
      number: r.roomNumber,
      name: r.roomName,
      level: r.floorLevel,
      area: `${r.areaM2.toFixed(1)} m²`,
      width: `${r.widthM.toFixed(2)} m`,
      depth: `${r.depthM.toFixed(2)} m`,
      class: r.classification,
    })),
  }))

  addSheet('A-601', 'Construction Details', 'SADC standard construction details - wall sections, foundations, roof, openings, stairs and waterproofing', 'Various', false, () => ({
    svgContent: constructionDetailsSvg(),
  }))
  addSheet('A-701', 'Compliance Certificate', 'SANS 10400 / local by-law compliance certificate', 'NTS', false, () => ({
    svgContent: complianceCertificateSvg(complianceReport),
  }))

  const boqCost = 0

  const titleBlock = buildDefaultTitleBlock(sheets[0]?.title ?? 'Council Submission', pn, sheets[0]?.sheetNumber ?? 'A-001')

  return {
    projectName: pn,
    projectNumber,
    issueDate,
    sheets,
    roomSchedule: schedule,
    drawingRegister: sheets.map((s) => ({
      sheetNumber: s.sheetNumber,
      title: s.title,
      scale: s.scale,
      revision: 'A',
    })),
    boqSummary: {
      category: brief.typology?.displayName ?? 'General',
      totalCost: boqCost,
      currency: 'USD',
    },
    complianceCertificate: complianceReport,
    titleBlock,
  }
}

export function printDrawingRegister(pkg: CouncilPackage): string {
  const lines = pkg.drawingRegister.map((e) => `${e.sheetNumber}\t${e.title}\t${e.scale}\t${e.revision}`)
  return ['Sheet No\tTitle\tScale\tRevision', ...lines].join('\n')
}

export function printRoomSchedule(pkg: CouncilPackage): string {
  const lines = pkg.roomSchedule.map((r) => `${r.roomNumber}\t${r.roomName}\t${r.areaM2.toFixed(1)} m²\t${r.classification}`)
  return ['No\tRoom\tArea\tType', ...lines].join('\n')
}
