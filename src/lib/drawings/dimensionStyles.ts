export type DimArrowType = 'arrow' | 'tick' | 'dot' | 'none';
export type DimUnit = 'mm' | 'm';

export interface DimensionStyle {
  name: string;
  textHeight: number;
  arrowSize: number;
  extensionLineExtend: number;
  offsetFromOrigin: number;
  precision: number;
  units: DimUnit;
  color: string;
  arrowType: DimArrowType;
  textColor: string;
  lineColor: string;
}

const DEFAULT_STYLE: DimensionStyle = {
  name: 'Standard',
  textHeight: 6,
  arrowSize: 4,
  extensionLineExtend: 2.5,
  offsetFromOrigin: 2,
  precision: 0,
  units: 'mm',
  color: '#64748b',
  arrowType: 'arrow',
  textColor: '#64748b',
  lineColor: '#64748b',
};

const ARCH_STYLES: Record<string, DimensionStyle> = {
  'Standard': { ...DEFAULT_STYLE },
  'Architectural': {
    ...DEFAULT_STYLE,
    name: 'Architectural',
    textHeight: 7,
    arrowSize: 3,
    arrowType: 'tick',
    precision: 0,
    units: 'mm',
    color: '#94a3b8',
  },
  'Structural': {
    ...DEFAULT_STYLE,
    name: 'Structural',
    textHeight: 6,
    arrowSize: 5,
    arrowType: 'arrow',
    precision: 1,
    units: 'mm',
    color: '#ef4444',
  },
  'Site': {
    name: 'Site',
    textHeight: 7,
    arrowSize: 4,
    extensionLineExtend: 3,
    offsetFromOrigin: 3,
    precision: 1,
    units: 'm',
    color: '#f97316',
    arrowType: 'arrow',
    textColor: '#f97316',
    lineColor: '#f97316',
  },
  'Small': {
    ...DEFAULT_STYLE,
    name: 'Small',
    textHeight: 4,
    arrowSize: 2.5,
    precision: 0,
  },
};

export function getDimensionStyle(name: string): DimensionStyle {
  return ARCH_STYLES[name] ?? DEFAULT_STYLE;
}

export function listDimensionStyles(): string[] {
  return Object.keys(ARCH_STYLES);
}

export function formatDimension(value: number, style: DimensionStyle): string {
  if (style.units === 'm') {
    return (value / 1000).toFixed(style.precision) + 'm';
  }
  return value.toFixed(style.precision) + (style.precision > 0 ? '' : '');
}

export function formatDimensionLabel(value: number, style: DimensionStyle): string {
  const num = style.units === 'm' ? value / 1000 : value;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: style.precision,
    maximumFractionDigits: style.precision,
  });
}

export function dimArrowPath(style: DimensionStyle): string {
  const s = style.arrowSize;
  switch (style.arrowType) {
    case 'tick':
      return `M ${-s/2} ${-s/2} L ${s/2} ${s/2}`;
    case 'dot':
      return `M 0 ${-s/2} A ${s/2} ${s/2} 0 1 1 0 ${s/2} A ${s/2} ${s/2} 0 1 1 0 ${-s/2}`;
    case 'none':
      return '';
    case 'arrow':
    default:
      return `M 0 0 L ${s} ${-s * 0.35} L ${s * 0.85} 0 L ${s} ${s * 0.35} Z`;
  }
}

export { ARCH_STYLES, DEFAULT_STYLE };
