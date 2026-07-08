export type ImportResult =
  | { type: 'dxf'; file: File }
  | { type: 'image'; file: File }
  | { type: 'pdf'; file: File }
  | { type: 'unsupported'; format: string; message: string }

const SUPPORTED_FORMATS_TEXT = 'Supported: DXF, images (PNG/JPG/WebP). For AutoCAD (.dwg) or ArchiCAD (.pln), export to DXF first.'

export function routeImportFile(file: File): ImportResult {
  const name = file.name.toLowerCase()

  if (name.endsWith('.dxf')) return { type: 'dxf', file }

  if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) return { type: 'image', file }

  if (name.endsWith('.pdf')) return { type: 'pdf', file }

  if (name.endsWith('.dwg')) {
    return {
      type: 'unsupported',
      format: 'DWG',
      message: 'Native AutoCAD (.dwg) files cannot be read in the browser. Please export to DXF from AutoCAD and import the .dxf file.',
    }
  }

  if (name.endsWith('.pln')) {
    return {
      type: 'unsupported',
      format: 'PLN',
      message: 'Native ArchiCAD (.pln) files cannot be read in the browser. Please export to DXF from ArchiCAD and import the .dxf file.',
    }
  }

  const ext = name.includes('.') ? name.split('.').pop()?.toUpperCase() ?? '' : ''
  return {
    type: 'unsupported',
    format: ext || 'Unknown',
    message: `${ext || 'This'} file format is not supported. ${SUPPORTED_FORMATS_TEXT}`,
  }
}

export function formatGuidanceNote(): string {
  return SUPPORTED_FORMATS_TEXT
}
