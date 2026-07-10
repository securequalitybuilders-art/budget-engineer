import type { DimensionStyle } from '@/lib/drawings/dimensionStyles';
import { formatDimension } from '@/lib/drawings/dimensionStyles';

export interface DimensionExport {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: string;
  text: string;
}

export function generateAlignedDimension(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number,
  style: DimensionStyle
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return '';

  const nx = -dy / len * offset;
  const ny = dx / len * offset;

  const mx = (x1 + x2) / 2 + nx;
  const my = (y1 + y2) / 2 + ny;

  const value = formatDimension(len, style);

  const groups: string[] = [];

  groups.push('0\nDIMENSION\n8\n' + style.name + '\n');
  groups.push('1\n' + value + '\n');
  groups.push('2\n*DIM_REF\n');
  groups.push('10\n' + x1 + '\n20\n' + y1 + '\n');
  groups.push('11\n' + x2 + '\n21\n' + y2 + '\n');
  groups.push('12\n' + mx + '\n22\n' + my + '\n');
  groups.push('13\n' + x1 + '\n23\n' + y1 + '\n');
  groups.push('14\n' + x2 + '\n24\n' + y2 + '\n');
  groups.push('70\n0\n');
  groups.push('40\n' + offset + '\n');
  groups.push('41\n1\n');
  groups.push('42\n' + style.arrowSize + '\n');
  groups.push('50\n0\n');
  groups.push('52\n' + style.precision + '\n');

  return groups.join('');
}

export function generateLinearDimensionH(
  x1: number,
  y: number,
  x2: number,
  offset: number,
  style: DimensionStyle
): string {
  return generateAlignedDimension(x1, y, x2, y, offset, style);
}

export function generateLinearDimensionV(
  x: number,
  y1: number,
  y2: number,
  offset: number,
  style: DimensionStyle
): string {
  return generateAlignedDimension(x, y1, x, y2, offset, style);
}

export function generateDimensionsBlock(
  dimensions: DimensionExport[],
  style: DimensionStyle
): string {
  return dimensions.map((d) => generateAlignedDimension(d.x1, d.y1, d.x2, d.y2, 10, style)).join('');
}
