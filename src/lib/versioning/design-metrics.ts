import { CadDocument, BimModel, BOQ } from '@/domain/ws6-types';

export interface DesignMetrics {
  walls: number;
  openings: number;
  blocks: number;
  floors: number;
  slabAreaM2: number;
  beamLenM: number;
  grandTotal: number;
  currency: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function designMetrics(cad: CadDocument, bim: BimModel, boq: BOQ | null): DesignMetrics {
  return {
    walls: cad.walls.length,
    openings: cad.openings.length,
    blocks: cad.blocks.length,
    floors: cad.floors.length,
    slabAreaM2: round1(bim.elements.filter((e) => e.type === 'slab').reduce((s, e) => s + (e.area ?? 0), 0)),
    beamLenM: round1(bim.elements.filter((e) => e.type === 'beam').reduce((s, e) => s + (e.length ?? 0), 0)),
    grandTotal: boq ? boq.summary.grandTotal : 0,
    currency: boq ? boq.currency : 'USD',
  };
}

export interface ChangeLine {
  label: string;
  delta: number;
  text: string;
  direction: 'up' | 'down';
}

const sym: Record<string, string> = { USD: '$', ZAR: 'R', KES: 'KSh' };
const money = (n: number, cur: string) => (sym[cur] ?? cur + ' ') + Math.abs(Math.round(n)).toLocaleString();

export function summarizeChanges(prev: DesignMetrics, curr: DesignMetrics): ChangeLine[] {
  const lines: ChangeLine[] = [];
  const push = (label: string, d: number, fmt: (n: number) => string) => {
    if (Math.abs(d) < 0.05) return;
    lines.push({
      label, delta: d,
      text: `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))} ${label}`,
      direction: d > 0 ? 'up' : 'down',
    });
  };
  push('walls', curr.walls - prev.walls, (n) => String(n));
  push('openings', curr.openings - prev.openings, (n) => String(n));
  push('objects', curr.blocks - prev.blocks, (n) => String(n));
  push('floors', curr.floors - prev.floors, (n) => String(n));
  push('m² slab', curr.slabAreaM2 - prev.slabAreaM2, (n) => n.toFixed(1));
  push('m beam', curr.beamLenM - prev.beamLenM, (n) => n.toFixed(1));
  const dCost = curr.grandTotal - prev.grandTotal;
  if (Math.abs(dCost) >= 1) {
    lines.push({
      label: 'grand total', delta: dCost,
      text: `${dCost > 0 ? '+' : '−'}${money(dCost, curr.currency)} grand total`,
      direction: dCost > 0 ? 'up' : 'down',
    });
  }
  return lines;
}
