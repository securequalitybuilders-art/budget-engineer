export type FontFamily = 'Arial' | 'Times New Roman' | 'Courier New' | 'Calibri' | 'Segoe UI'

export interface TextStyleDef {
  name: string
  font: FontFamily
  heightMm: number
  widthFactor: number
  obliqueAngle: number
  bold: boolean
  color: string
  useFor: string[]
}

const TEXT_STYLES: TextStyleDef[] = [
  {
    name: 'Standard',
    font: 'Arial',
    heightMm: 2.5,
    widthFactor: 1,
    obliqueAngle: 0,
    bold: false,
    color: '#2d3748',
    useFor: ['general notes', 'dimensions', 'labels'],
  },
  {
    name: 'Title',
    font: 'Arial',
    heightMm: 5.0,
    widthFactor: 0.9,
    obliqueAngle: 0,
    bold: true,
    color: '#1a202c',
    useFor: ['drawing title', 'sheet title', 'project name'],
  },
  {
    name: 'Subtitle',
    font: 'Arial',
    heightMm: 3.5,
    widthFactor: 1,
    obliqueAngle: 0,
    bold: false,
    color: '#2d3748',
    useFor: ['subtitle', 'scale bar label', 'north arrow text'],
  },
  {
    name: 'Annotation',
    font: 'Arial',
    heightMm: 2.0,
    widthFactor: 1,
    obliqueAngle: 0,
    bold: false,
    color: '#4a5568',
    useFor: ['keynotes', 'callouts', 'room labels'],
  },
  {
    name: 'Dimension',
    font: 'Arial',
    heightMm: 2.5,
    widthFactor: 1,
    obliqueAngle: 0,
    bold: false,
    color: '#4a5568',
    useFor: ['dimension strings', 'coordinate labels'],
  },
  {
    name: 'Notes',
    font: 'Times New Roman',
    heightMm: 2.5,
    widthFactor: 1,
    obliqueAngle: 0,
    bold: false,
    color: '#2d3748',
    useFor: ['general notes paragraphs', 'specifications'],
  },
  {
    name: 'Attribution',
    font: 'Arial',
    heightMm: 1.8,
    widthFactor: 1,
    obliqueAngle: 0,
    bold: false,
    color: '#718096',
    useFor: ['copyright', 'date', 'revision description', 'file path'],
  },
  {
    name: 'Schedule',
    font: 'Arial',
    heightMm: 2.0,
    widthFactor: 0.9,
    obliqueAngle: 0,
    bold: false,
    color: '#2d3748',
    useFor: ['schedule table text', 'door/window schedule'],
  },
]

export function getTextStyle(name: string): TextStyleDef {
  return TEXT_STYLES.find((s) => s.name === name) ?? TEXT_STYLES[0]
}

export function textStyleForPurpose(purpose: string): TextStyleDef {
  for (const style of TEXT_STYLES) {
    if (style.useFor.includes(purpose)) return style
  }
  return TEXT_STYLES[0]
}

export function dxfTextStyleName(style: TextStyleDef): string {
  return style.name.toUpperCase().replace(/\s+/g, '_')
}

export function svgFontDeclaration(style: TextStyleDef, color?: string): string {
  const c = color ?? style.color
  return `font-family="${style.font}" font-size="${style.heightMm}mm" ${style.bold ? 'font-weight="bold"' : ''} fill="${c}"`
}

export { TEXT_STYLES }
