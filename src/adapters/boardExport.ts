import type { PresentationBoard } from '@/domain/presentation'
import { composeBoardSvg, type OverlayContext } from '@/lib/presentation/renderOverlay'

export function generateBoardSvg(board: PresentationBoard): string {
  const ctx: OverlayContext = {
    sheetW: board.landscape ? (board.sheetSize === 'A1' ? 841 : 1189) : (board.sheetSize === 'A1' ? 594 : 841),
    sheetH: board.landscape ? (board.sheetSize === 'A1' ? 594 : 841) : (board.sheetSize === 'A1' ? 841 : 1189),
    cells: board.cells,
  }
  return composeBoardSvg(ctx, board.annotations, board.snapshots)
}

export function serializeBoardSvg(svgEl: SVGSVGElement | null): string | null {
  if (!svgEl) return null
  try {
    const clone = svgEl.cloneNode(true) as SVGSVGElement
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = `text { font-family: Arial, Helvetica, sans-serif; }`
    clone.insertBefore(style, clone.firstChild)
    return new XMLSerializer().serializeToString(clone)
  } catch {
    return null
  }
}

export async function exportBoardPng(board: PresentationBoard, svgEl: SVGSVGElement | null): Promise<void> {
  const svgString = serializeBoardSvg(svgEl)
  if (!svgString) throw new Error('Failed to serialize board SVG')

  const scale = 2
  const w = board.landscape ? (board.sheetSize === 'A1' ? 841 : 1189) : (board.sheetSize === 'A1' ? 594 : 841)
  const h = board.landscape ? (board.sheetSize === 'A1' ? 594 : 841) : (board.sheetSize === 'A1' ? 841 : 1189)

  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()

  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `${board.name.replace(/\s+/g, '_')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      resolve()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG for PNG export'))
    }
    img.src = url
  })
}

export async function exportBoardPdf(board: PresentationBoard, svgEl: SVGSVGElement | null): Promise<void> {
  const svgString = serializeBoardSvg(svgEl)
  if (!svgString) throw new Error('Failed to serialize board SVG')

  const w = board.landscape ? (board.sheetSize === 'A1' ? 841 : 1189) : (board.sheetSize === 'A1' ? 594 : 841)
  const h = board.landscape ? (board.sheetSize === 'A1' ? 594 : 841) : (board.sheetSize === 'A1' ? 841 : 1189)

  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: board.landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [w, h],
  })

  const canvas = document.createElement('canvas')
  const scale = 1.5
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()

  return new Promise<void>((resolve, reject) => {
    img.onload = async () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/png')
      pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
      pdf.save(`${board.name.replace(/\s+/g, '_')}.pdf`)
      resolve()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG for PDF export'))
    }
    img.src = url
  })
}

export function generateBoardSvgString(board: PresentationBoard): string {
  return generateBoardSvg(board)
}
