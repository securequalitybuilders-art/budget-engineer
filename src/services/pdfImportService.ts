export interface PdfRenderResult {
  dataUrl: string
  width: number
  height: number
  pageCount: number
}

export async function renderPdfFirstPage(_file: File): Promise<PdfRenderResult | null> {
  return null
}
