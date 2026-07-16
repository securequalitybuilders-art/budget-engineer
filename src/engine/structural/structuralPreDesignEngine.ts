import type { BuildingGraph } from '@/domain/building';
import { buildingToStructuralGeneration, type StructuralGenerationResult } from '@/adapters/canonical/building-to-structural';

export type SlabSystem = 'flat-plate' | 'flat-slab' | 'two-way' | 'one-way' | 'ribbed' | 'waffle' | 'hollow-core' | 'composite-deck';
export type ColumnType = 'square' | 'rectangular' | 'circular';
export type FoundationType = 'isolated-pad' | 'strip' | 'combined' | 'mat' | 'pile-cap';

export interface SlabCandidate {
  system: SlabSystem;
  thicknessMm: number;
  spanM: number;
  reinforcement: string;
  weightKpa: number;
  assumptionTag: string;
}

export interface BeamCandidate {
  id: string;
  startX: number; startY: number;
  endX: number; endY: number;
  widthMm: number;
  depthMm: number;
  spanM: number;
  material: 'concrete' | 'steel' | 'timber';
  assumptionTag: string;
}

export interface ColumnCandidate {
  id: string;
  x: number; y: number;
  type: ColumnType;
  widthMm: number;
  depthMm: number;
  heightM: number;
  loadEstimateKn: number;
  reinforcement: string;
  material: 'concrete' | 'steel' | 'timber';
  assumptionTag: string;
}

export interface FootingCandidate {
  id: string;
  x: number; y: number;
  type: FoundationType;
  widthM: number;
  depthM: number;
  thicknessMm: number;
  bearingKpa: number;
  loadKn: number;
  assumptionTag: string;
}

export interface StructuralPreDesignOutput {
  slabSystem: SlabCandidate;
  beams: BeamCandidate[];
  columns: ColumnCandidate[];
  footings: FootingCandidate[];
  schedules: {
    slabSchedule: string;
    beamSchedule: string;
    columnSchedule: string;
    footingSchedule: string;
  };
  drawings: {
    foundationSvg: string;
    columnLayoutSvg: string;
    loadPathSvg: string;
  };
  boq: {
    concreteM3: number;
    reinforcementKg: number;
    formworkM2: number;
    notes: string[];
  };
  reviewRequiredLabel: string;
}

const SLAB_SYSTEMS: Record<string, { system: SlabSystem; minSpan: number; maxSpan: number; minThick: number; maxThick: number; weight: number }> = {
  residential: { system: 'flat-plate', minSpan: 3, maxSpan: 6, minThick: 150, maxThick: 200, weight: 4.8 },
  commercial: { system: 'two-way', minSpan: 5, maxSpan: 9, minThick: 200, maxThick: 350, weight: 6.0 },
  industrial: { system: 'ribbed', minSpan: 6, maxSpan: 12, minThick: 250, maxThick: 400, weight: 5.5 },
};

function inferBuildingType(graph: BuildingGraph): string {
  const types = new Set(graph.spaces.map(s => s.programme));
  if (types.has('office') || types.has('retail')) return 'commercial';
  if (types.has('storage')) return 'industrial';
  return 'residential';
}

function estimateColumnLoad(floorCount: number, tributaryM2: number, weightKpa: number): number {
  return floorCount * tributaryM2 * weightKpa * 1.2;
}

function computeSlabSystem(graph: BuildingGraph): SlabCandidate {
  const bldgType = inferBuildingType(graph);
  const config = SLAB_SYSTEMS[bldgType] ?? SLAB_SYSTEMS.residential;
  const maxSpan = graph.spaces.reduce((max, s) => Math.max(max, Math.sqrt(s.areaM2)), 0);
  const span = Math.max(config.minSpan, Math.min(config.maxSpan, Math.round(maxSpan * 10) / 10));
  const thickness = Math.round(
    config.minThick + (config.maxThick - config.minThick) * ((span - config.minSpan) / (config.maxSpan - config.minSpan))
  );

  return {
    system: config.system,
    thicknessMm: thickness,
    spanM: span,
    reinforcement: 'Y12 @ 200 B1 / Y10 @ 250 T1',
    weightKpa: config.weight,
    assumptionTag: `Pre-design: ${config.system} slab inferred for ${bldgType} typology. Engineer to verify spans and reinforcement.`,
  };
}

function computeBeamCandidates(_graph: BuildingGraph, slab: SlabCandidate, structural: StructuralGenerationResult): BeamCandidate[] {
  return structural.beams.map((b, i) => ({
    id: `beam-${i + 1}`,
    startX: b.start.x,
    startY: b.start.y,
    endX: b.end.x,
    endY: b.end.y,
    widthMm: Math.round(slab.thicknessMm * 0.4),
    depthMm: Math.round(slab.spanM * 1000 / 12),
    spanM: Math.round(Math.hypot(b.end.x - b.start.x, b.end.y - b.start.y) * 10) / 10,
    material: 'concrete' as const,
    assumptionTag: `Pre-design: beam depth = span/12. Width = 0.4× slab. Verify with structural engineer.`,
  }));
}

function computeColumnCandidates(graph: BuildingGraph, slab: SlabCandidate, structural: StructuralGenerationResult): ColumnCandidate[] {
  const floorCount = graph.levels.length;
  const weightKpa = slab.weightKpa;
  return structural.columns.map((c, i) => {
    const tributary = 20;
    const load = estimateColumnLoad(floorCount, tributary, weightKpa);
    const size = Math.max(230, Math.round(Math.sqrt(load * 1000 / (0.25 * 20 * 1e6)) * 1000));
    return {
      id: `col-${i + 1}`,
      x: c.position.x,
      y: c.position.y,
      type: 'square' as ColumnType,
      widthMm: size,
      depthMm: size,
      heightM: floorCount * 3,
      loadEstimateKn: Math.round(load * 10) / 10,
      reinforcement: '4Y16 + 4Y12 links',
      material: 'concrete' as const,
      assumptionTag: `Pre-design: ${size}×${size} column. Load estimated from tributary area. Engineer to verify.`,
    };
  });
}

function computeFootingCandidates(_graph: BuildingGraph, columns: ColumnCandidate[]): FootingCandidate[] {
  return columns.map((c, i) => {
    const bearingKpa = 150;
    const loadKn = c.loadEstimateKn;
    const areaM2 = loadKn / bearingKpa;
    const sideM = Math.max(0.6, Math.round(Math.sqrt(areaM2) * 10) / 10);
    return {
      id: `ftg-${i + 1}`,
      x: c.x,
      y: c.y,
      type: 'isolated-pad' as FoundationType,
      widthM: sideM,
      depthM: sideM,
      thicknessMm: Math.max(200, Math.round(sideM * 200)),
      bearingKpa,
      loadKn: Math.round(loadKn * 10) / 10,
      assumptionTag: `Pre-design: ${sideM}m × ${sideM}m pad footing on ${bearingKpa}kPa soil. Engineer to verify geotechnical capacity.`,
    };
  });
}

function generateSchedules(output: StructuralPreDesignOutput): StructuralPreDesignOutput['schedules'] {
  const slab = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600"><th style="padding:4px;border:1px solid #ddd;text-align:left">Item</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Value</th></tr></thead><tbody>
<tr><td style="padding:3px;border:1px solid #ddd">System</td><td style="padding:3px;border:1px solid #ddd">${output.slabSystem.system}</td></tr>
<tr><td style="padding:3px;border:1px solid #ddd">Thickness</td><td style="padding:3px;border:1px solid #ddd">${output.slabSystem.thicknessMm}mm</td></tr>
<tr><td style="padding:3px;border:1px solid #ddd">Max Span</td><td style="padding:3px;border:1px solid #ddd">${output.slabSystem.spanM}m</td></tr>
<tr><td style="padding:3px;border:1px solid #ddd">Reinforcement</td><td style="padding:3px;border:1px solid #ddd">${output.slabSystem.reinforcement}</td></tr>
<tr><td style="padding:3px;border:1px solid #ddd">Self Weight</td><td style="padding:3px;border:1px solid #ddd">${output.slabSystem.weightKpa} kPa</td></tr>
</tbody></table>`;

  let beam = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600"><th style="padding:4px;border:1px solid #ddd;text-align:left">ID</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Width</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Depth</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Span</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Material</th></tr></thead><tbody>`;
  for (const b of output.beams) {
    beam += `<tr><td style="padding:3px;border:1px solid #ddd">${b.id}</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${b.widthMm}</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${b.depthMm}</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${b.spanM}</td><td style="padding:3px;border:1px solid #ddd">${b.material}</td></tr>`;
  }
  beam += '</tbody></table>';

  let col = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600"><th style="padding:4px;border:1px solid #ddd;text-align:left">ID</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Size</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Height</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Load (kN)</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Reinforcement</th></tr></thead><tbody>`;
  for (const c of output.columns) {
    col += `<tr><td style="padding:3px;border:1px solid #ddd">${c.id}</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${c.widthMm}×${c.depthMm}</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${c.heightM}m</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${c.loadEstimateKn}</td><td style="padding:3px;border:1px solid #ddd">${c.reinforcement}</td></tr>`;
  }
  col += '</tbody></table>';

  let ftg = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600"><th style="padding:4px;border:1px solid #ddd;text-align:left">ID</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Type</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Size</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Thick</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Load (kN)</th></tr></thead><tbody>`;
  for (const f of output.footings) {
    ftg += `<tr><td style="padding:3px;border:1px solid #ddd">${f.id}</td><td style="padding:3px;border:1px solid #ddd">${f.type}</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${f.widthM}m × ${f.depthM}m</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${f.thicknessMm}mm</td><td style="padding:3px;border:1px solid #ddd;text-align:right">${f.loadKn}</td></tr>`;
  }
  ftg += '</tbody></table>';

  return { slabSchedule: slab, beamSchedule: beam, columnSchedule: col, footingSchedule: ftg };
}

function computeBoq(output: StructuralPreDesignOutput): StructuralPreDesignOutput['boq'] {
  let concreteVol = 0;
  let rebarWt = 0;
  let formwork = 0;

  for (const f of output.footings) {
    const vol = f.widthM * f.depthM * (f.thicknessMm / 1000);
    concreteVol += vol;
    rebarWt += vol * 80;
    formwork += 2 * (f.widthM + f.depthM) * (f.thicknessMm / 1000);
  }

  for (const c of output.columns) {
    const vol = (c.widthMm / 1000) * (c.depthMm / 1000) * c.heightM;
    concreteVol += vol;
    rebarWt += vol * 120;
    formwork += 2 * ((c.widthMm / 1000) + (c.depthMm / 1000)) * c.heightM;
  }

  for (const b of output.beams) {
    const vol = (b.widthMm / 1000) * (b.depthMm / 1000) * b.spanM;
    concreteVol += vol;
    rebarWt += vol * 100;
    formwork += (b.widthMm / 1000 + 2 * b.depthMm / 1000) * b.spanM;
  }

  return {
    concreteM3: Math.round(concreteVol * 100) / 100,
    reinforcementKg: Math.round(rebarWt * 10) / 10,
    formworkM2: Math.round(formwork * 100) / 100,
    notes: [
      'All quantities are pre-design estimates. Final design by qualified structural engineer.',
      'Reinforcement assumed at 80-120 kg/m³ depending on member type.',
      'Concrete grade assumed C25/30 unless specified otherwise.',
    ],
  };
}

function generateDrawingSvg(output: StructuralPreDesignOutput): StructuralPreDesignOutput['drawings'] {
  const w = 400, h = 300;
  const scale = 12;
  const ox = 40, oy = 40;

  const foundationSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#fafafa" rx="4"/>
<text x="${w/2}" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">Foundation Layout (Pre-Design)</text>
${output.footings.map(f => {
  const cx = ox + f.x * scale;
  const cy = oy + f.y * scale;
  const s = Math.max(4, f.widthM * scale);
  return `<rect x="${cx - s/2}" y="${cy - s/2}" width="${s}" height="${s}" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" stroke-width="1.5" rx="1"/><text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="5" fill="#6d28d9" font-family="sans-serif">${f.id}</text>`;
}).join('')}
<text x="${w/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#999" font-family="sans-serif">Pre-design only · Engineer review required</text>
</svg>`;

  const columnLayoutSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#fafafa" rx="4"/>
<text x="${w/2}" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">Column Layout (Pre-Design)</text>
${output.columns.map(c => {
  const cx = ox + c.x * scale;
  const cy = oy + c.y * scale;
  const s = Math.max(6, c.widthMm / 80);
  return `<rect x="${cx - s/2}" y="${cy - s/2}" width="${s}" height="${s}" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="1.5"/><text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="5" fill="#1d4ed8" font-family="sans-serif">${c.id}</text>`;
}).join('')}
${output.beams.map(b => {
  const x1 = ox + b.startX * scale;
  const y1 = oy + b.startY * scale;
  const x2 = ox + b.endX * scale;
  const y2 = oy + b.endY * scale;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,2"/>`;
}).join('')}
<text x="${w/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#999" font-family="sans-serif">Columns shown to scale · Dashed = beam candidates</text>
</svg>`;

  const loadPathSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#fafafa" rx="4"/>
<text x="${w/2}" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">Load Path Diagram</text>
<rect x="160" y="30" width="80" height="30" fill="rgba(34,197,94,0.2)" stroke="#22c55e" stroke-width="1" rx="2"/>
<text x="200" y="49" text-anchor="middle" font-size="8" fill="#15803d" font-family="sans-serif">Roof Slab</text>
<line x1="200" y1="60" x2="200" y2="90" stroke="#666" stroke-width="1" stroke-dasharray="3,3"/>
<polygon points="195,85 200,95 205,85" fill="#666"/>
<rect x="160" y="95" width="80" height="30" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="1" rx="2"/>
<text x="200" y="114" text-anchor="middle" font-size="8" fill="#1d4ed8" font-family="sans-serif">Floor Slab</text>
<line x1="200" y1="125" x2="200" y2="155" stroke="#666" stroke-width="1" stroke-dasharray="3,3"/>
<polygon points="195,150 200,160 205,150" fill="#666"/>
<rect x="160" y="160" width="80" height="30" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" stroke-width="1" rx="2"/>
<text x="200" y="179" text-anchor="middle" font-size="8" fill="#b45309" font-family="sans-serif">Beams</text>
<line x1="200" y1="190" x2="200" y2="220" stroke="#666" stroke-width="1" stroke-dasharray="3,3"/>
<polygon points="195,215 200,225 205,215" fill="#666"/>
<rect x="160" y="225" width="80" height="30" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" stroke-width="1" rx="2"/>
<text x="200" y="244" text-anchor="middle" font-size="8" fill="#6d28d9" font-family="sans-serif">Footings</text>
<text x="${w/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#999" font-family="sans-serif">Load path: Roof → Floor → Beams → Columns → Footings</text>
</svg>`;

  return { foundationSvg, columnLayoutSvg, loadPathSvg };
}

export function computeStructuralPreDesign(graph: BuildingGraph): StructuralPreDesignOutput {
  const structural = buildingToStructuralGeneration(graph);
  const slabSystem = computeSlabSystem(graph);
  const beams = computeBeamCandidates(graph, slabSystem, structural);
  const columns = computeColumnCandidates(graph, slabSystem, structural);
  const footings = computeFootingCandidates(graph, columns);

  const output: StructuralPreDesignOutput = {
    slabSystem,
    beams,
    columns,
    footings,
    schedules: { slabSchedule: '', beamSchedule: '', columnSchedule: '', footingSchedule: '' },
    drawings: { foundationSvg: '', columnLayoutSvg: '', loadPathSvg: '' },
    boq: { concreteM3: 0, reinforcementKg: 0, formworkM2: 0, notes: [] },
    reviewRequiredLabel: '⚠ PRE-DESIGN ONLY — All member sizes are candidates. Review by qualified structural engineer required before construction.',
  };

  output.schedules = generateSchedules(output);
  output.drawings = generateDrawingSvg(output);
  output.boq = computeBoq(output);

  return output;
}
