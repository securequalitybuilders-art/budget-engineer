const SVG_NS = 'http://www.w3.org/2000/svg'

export function serializeSvg(svgEl: SVGSVGElement): string | null {
  try {
    if (!svgEl) return null
    const clone = svgEl.cloneNode(true) as SVGSVGElement
    const style = document.createElementNS(SVG_NS, 'style')
    style.textContent = `
      text { font-family: system-ui, -apple-system, sans-serif; }
      * { color-interpolation-filters: sRGB; }
    `
    clone.insertBefore(style, clone.firstChild)
    return new XMLSerializer().serializeToString(clone)
  } catch {
    return null
  }
}

export async function svgToDataUrl(svgEl: SVGSVGElement, scale = 2): Promise<string | null> {
  const svgStr = serializeSvg(svgEl)
  if (!svgStr) return null

  const vb = svgEl.getAttribute('viewBox')
  if (!vb) return null
  const parts = vb.split(' ').map(Number)
  if (parts.length !== 4) return null
  const [, , w, h] = parts

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load SVG into Image'))
      img.src = url
    })
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    return canvas.toDataURL('image/png')
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

export async function exportSheetPng(svgEl: SVGSVGElement): Promise<void> {
  const dataUrl = await svgToDataUrl(svgEl, 2)
  if (!dataUrl) throw new Error('Failed to render PNG')

  const link = document.createElement('a')
  link.download = 'presentation-sheet.png'
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function exportSheetPdf(svgEl: SVGSVGElement): Promise<void> {
  const dataUrl = await svgToDataUrl(svgEl, 1.5)
  if (!dataUrl) throw new Error('Failed to render PNG for PDF')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsPdfModule: any
  try {
    jsPdfModule = await import('jspdf')
  } catch {
    throw new Error('jsPDF library failed to load')
  }

  const img = new Image()
  img.src = dataUrl
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image for PDF'))
  })

  const orientation = img.width > img.height ? 'l' : 'p'

  const JsPdfClass = jsPdfModule.default
  const doc = new JsPdfClass({
    orientation,
    unit: 'mm',
    format: 'a1',
  })

  const imgW = 841
  const imgH = (img.height / img.width) * imgW

  try {
    doc.addImage(dataUrl, 'PNG', 0, 0, imgW, imgH)
    doc.save('presentation-sheet.pdf')
  } catch (e) {
    throw new Error(`PDF generation failed: ${(e as Error).message}`)
  }
}
