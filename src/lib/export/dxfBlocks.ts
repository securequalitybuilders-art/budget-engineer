import type { CadBlockInstance } from '@/domain/cad';

interface BlockDefinition {
  name: string;
  lines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

const BLOCK_LIBRARY: Record<string, BlockDefinition> = {
  SOFA: {
    name: 'SOFA',
    lines: [
      { x1: 0, y1: 0, x2: 1, y2: 0 },
      { x1: 1, y1: 0, x2: 1, y2: 1 },
      { x1: 1, y1: 1, x2: 0, y2: 1 },
      { x1: 0, y1: 1, x2: 0, y2: 0 },
    ],
  },
  BED: {
    name: 'BED',
    lines: [
      { x1: 0, y1: 0, x2: 1.5, y2: 0 },
      { x1: 1.5, y1: 0, x2: 1.5, y2: 2 },
      { x1: 1.5, y1: 2, x2: 0, y2: 2 },
      { x1: 0, y1: 2, x2: 0, y2: 0 },
      { x1: 0, y1: 0.2, x2: 1.5, y2: 0.2 },
    ],
  },
  TABLE: {
    name: 'TABLE',
    lines: [
      { x1: 0, y1: 0, x2: 1, y2: 0 },
      { x1: 1, y1: 0, x2: 1, y2: 1 },
      { x1: 1, y1: 1, x2: 0, y2: 1 },
      { x1: 0, y1: 1, x2: 0, y2: 0 },
    ],
  },
  WC: {
    name: 'WC',
    lines: [
      { x1: 0, y1: 0, x2: 0.4, y2: 0 },
      { x1: 0.4, y1: 0, x2: 0.4, y2: 0.4 },
      { x1: 0.4, y1: 0.4, x2: 0, y2: 0.4 },
      { x1: 0, y1: 0.4, x2: 0, y2: 0 },
      { x1: 0.2, y1: 0.4, x2: 0.2, y2: 0.6 },
    ],
  },
  STAIR: {
    name: 'STAIR',
    lines: [
      { x1: 0, y1: 0, x2: 1, y2: 0 },
      { x1: 1, y1: 0, x2: 1, y2: 1 },
      { x1: 1, y1: 1, x2: 0, y2: 1 },
      { x1: 0, y1: 1, x2: 0, y2: 0 },
    ],
  },
  CORE: {
    name: 'CORE',
    lines: [
      { x1: 0, y1: 0, x2: 1, y2: 0 },
      { x1: 1, y1: 0, x2: 1, y2: 1 },
      { x1: 1, y1: 1, x2: 0, y2: 1 },
      { x1: 0, y1: 1, x2: 0, y2: 0 },
      { x1: 0, y1: 0, x2: 1, y2: 1 },
      { x1: 1, y1: 0, x2: 0, y2: 1 },
    ],
  },
};

export function generateBlockDefinitions(): string {
  let output = '';
  output += '0\nSECTION\n2\nBLOCKS\n';

  for (const def of Object.values(BLOCK_LIBRARY)) {
    output += '0\nBLOCK\n2\n' + def.name + '\n70\n0\n10\n0\n20\n0\n';
    for (const line of def.lines) {
      output += '0\nLINE\n8\n0\n';
      output += '10\n' + line.x1 + '\n20\n' + line.y1 + '\n';
      output += '11\n' + line.x2 + '\n21\n' + line.y2 + '\n';
    }
    output += '0\nENDBLK\n';
  }

  output += '0\nENDSEC\n';
  return output;
}

export function generateBlockInsert(instance: CadBlockInstance, scale: number): string {
  return [
    '0\nINSERT',
    '8\n0',
    '2\n' + instance.blockType.toUpperCase(),
    '10\n' + (instance.position.x * scale),
    '20\n' + (instance.position.y * scale),
    '41\n' + (instance.width * scale),
    '42\n' + (instance.height * scale),
    '50\n' + instance.rotation,
    '',
  ].join('\n');
}

export function getBlockNames(): string[] {
  return Object.keys(BLOCK_LIBRARY);
}
