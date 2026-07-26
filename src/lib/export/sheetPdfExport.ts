import type { PlanModel } from '@/domain/plan'
import { exportPlanToSvg } from './svg-export'

export interface PdfSheetOptions {
  format?: 'a3' | 'a4'
  orientation?: 'portrait' | 'landscape'
  title?: string
  sheetNumber?: number
  totalSheets?: number
  projectName?: string
}

const FORMAT_DIMS: Record<string, { w: number; h: number }> = {
  'a4-portrait': { w: 210, h: 297 },
  'a4-landscape': { w: 297, h: 210 },
  'a3-portrait': { w: 297, h: 420 },
  'a3-landscape': { w: 420, h: 297 },
}

function getDim(format: string, orientation: string) {
  const key = `${format}-${orientation}`
  return FORMAT_DIMS[key] ?? FORMAT_DIMS['a4-portrait']
}

let _svgToPngConverter: ((svg: string, width: number, height: number) => Promise<string>) | null = null

export function _setSvgToPngUrl(fn: ((svg: string, width: number, height: number) => Promise<string>) | null) {
  _svgToPngConverter = fn
}

async function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  if (_svgToPngConverter) return _svgToPngConverter(svg, width, height)

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.width = width
  img.height = height
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(url)
  return canvas.toDataURL('image/png')
}

export async function exportPlanToPdf(
  plan: PlanModel,
  options: PdfSheetOptions = {},
): Promise<Blob> {
  const format = options.format ?? 'a4'
  const orientation = options.orientation ?? 'landscape'
  const dim = getDim(format, orientation)

  const svg = exportPlanToSvg(plan)
  const imgW = 2400
  const imgH = Math.round((imgW * dim.h) / dim.w)
  const pngUrl = await svgToPngDataUrl(svg, imgW, imgH)

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ format, orientation, unit: 'mm' })
  const margin = 15
  const drawW = dim.w - margin * 2
  const drawH = dim.h - margin * 2 - 18
  const img = pngUrl as unknown as string

  doc.addImage(img, 'PNG', margin, margin, drawW, drawH, undefined, 'FAST')

  const title = options.title ?? 'Floor Plan'
  const project = options.projectName ?? 'Budget Engineer'
  const sheetStr = options.sheetNumber != null && options.totalSheets != null
    ? `Sheet ${options.sheetNumber} of ${options.totalSheets}`
    : ''

  doc.setFontSize(7)
  doc.setTextColor(100)
  doc.text(project, margin, dim.h - 4)
  doc.text(title, dim.w / 2, dim.h - 4, { align: 'center' })
  if (sheetStr) doc.text(sheetStr, dim.w - margin, dim.h - 4, { align: 'right' })

  return doc.output('blob')
}

export async function downloadPlanPdf(
  plan: PlanModel,
  filename: string,
  options: PdfSheetOptions = {},
): Promise<void> {
  const blob = await exportPlanToPdf(plan, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
