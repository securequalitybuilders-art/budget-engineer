import type { PlanModel } from '../../domain/plan'
import type { DesignOption } from '../../domain/boq'
import type { EnhancedBrief } from './briefEnhancer'
import type { TopologyCandidate } from '../tier3/multiObjectiveOptimizer'
import type { ComplianceReport } from '../compliance/types'

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

function generateSheetNumber(discipline: SheetDiscipline, sequence: number): string {
  return `${discipline}-${String(sequence).padStart(3, '0')}`
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
    discipline: sheetNumber.startsWith('A') ? 'A' : sheetNumber.startsWith('S') ? 'S' : 'G',
    status: 'FOR_APPROVAL',
    author: 'Budget Engineer AI',
    checker: '',
    approvedBy: '',
  }
}

export function assembleCouncilPackage(
  plan: PlanModel,
  _design: DesignOption,
  brief: EnhancedBrief,
  _selectedCandidate: TopologyCandidate,
  complianceReport: ComplianceReport | null,
  projectName?: string,
): CouncilPackage {
  const pn = projectName ?? `${brief.typology?.displayName ?? 'Building'} - ${brief.siteInfo.widthM ?? 20}m x ${brief.siteInfo.depthM ?? 25}m`
  const projectNumber = 'BE-2026-001'
  const issueDate = new Date().toISOString().slice(0, 10)

  const schedule = buildRoomSchedule(plan)

  const sheets: CouncilSheet[] = []

  let seq = 0

  const addSheet = (discipline: SheetDiscipline, title: string, description: string, scale: string, isPlanView: boolean, content?: () => { svgContent?: string; tableData?: Record<string, string>[] }) => {
    seq++
    const sheetNumber = generateSheetNumber(discipline, seq)
    sheets.push({
      sheetNumber,
      sadcCode: `SANS 0143-${sheetNumber}`,
      discipline,
      title,
      description,
      scale,
      isPlanView,
      generateContent: content ?? (() => ({})),
    })
  }

  addSheet('A', 'Cover Sheet', 'Project overview, site data, and key metrics', 'NTS', false)
  addSheet('A', 'Site Plan', 'Site layout showing building footprint, setbacks, access and services', '1:200', true)
  addSheet('A', 'Floor Plan - Ground Floor', `Ground floor plan - ${brief.typology?.displayName ?? 'Residential'}`, '1:100', true)
  addSheet('A', 'Floor Plan - Upper Floor', 'Upper floor layout and stair connection', '1:100', true)
  addSheet('A', 'Roof Plan', 'Roof layout showing pitch, overhangs, drainage and roof plane annotations', '1:100', true)
  addSheet('A', 'Front Elevation', 'Front (south) elevation with fenestration and material indications', '1:100', false)
  addSheet('A', 'Side Elevation - Left', 'Left (east) elevation', '1:100', false)
  addSheet('A', 'Side Elevation - Right', 'Right (west) elevation', '1:100', false)
  addSheet('A', 'Rear Elevation', 'Rear (north) elevation', '1:100', false)
  addSheet('A', 'Section A-A', 'Cross-section through building showing floor-to-floor heights, roof structure and foundations', '1:50', false)
  addSheet('A', 'Section B-B', 'Longitudinal section through building', '1:50', false)
  addSheet('A', 'Door & Window Schedule', 'Schedule of all openings with sizes, type, material and glazing specification', 'NTS', false, () => ({
    tableData: plan.openings.map((o, i) => ({
      mark: `W${i + 1}`,
      type: o.kind === 'door' ? 'Door' : 'Window',
      widthMM: String(Math.round(o.width * 1000)),
      heightMM: String(Math.round((o.height ?? 2.1) * 1000)),
      sillHeightMM: o.kind === 'window' ? String(Math.round((o.sillHeight ?? 0.9) * 1000)) : '0',
      material: o.kind === 'door' ? 'Timber panel' : 'Aluminium sliding',
      notes: '',
    })),
  }))
  addSheet('A', 'Room Finish Schedule', 'Floor, wall and ceiling finishes per room', 'NTS', false)
  addSheet('A', 'Room Schedule', 'Complete room list with areas and classifications', 'NTS', false, () => ({
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
  addSheet('S', 'Foundation Plan', 'Strip footing layout with dimensions and reinforcement notes', '1:100', true)
  addSheet('S', 'Structural Layout', 'Column, beam and slab layout with structural grid', '1:100', true)
  addSheet('E', 'Electrical Layout', 'Power, lighting, and communication points', '1:100', true)
  addSheet('P', 'Plumbing Layout', 'Hot/cold water supply, drainage, and vent pipe routing', '1:100', true)

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
