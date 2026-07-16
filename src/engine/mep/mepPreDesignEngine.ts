import type { BuildingGraph, Space } from '@/domain/building';

export type PlumbingFixtureType = 'wc' | 'basin' | 'shower' | 'bath' | 'bidet' | 'urinal' | 'sink' | 'washing-machine' | 'dishwasher' | 'geyser';
export type ElectricalPointType = 'light' | 'switch' | 'socket' | 'data' | 'tv' | 'smoke' | 'heat' | 'extractor' | 'db' | 'isolator';
export type HvacType = 'split-unit' | 'ducted' | 'extract-fan' | 'heat-pump' | 'ventilator' | 'grille' | 'diffuser';

export interface PlumbingFixture {
  id: string;
  type: PlumbingFixtureType;
  roomId: string;
  x: number; y: number;
  supply: 'hot' | 'cold' | 'both';
  waste: boolean;
  vent: boolean;
  stacked: boolean;
  levelNumber: number;
}

export interface PlumbingStack {
  id: string;
  type: 'waste' | 'vent' | 'stormwater';
  x: number; y: number;
  connectedFixtures: string[];
  levelsServed: number[];
}

export interface PlumbingZone {
  id: string;
  label: string;
  fixtures: PlumbingFixture[];
  stacks: PlumbingStack[];
  waterDemandLmin: number;
  isWetCore: boolean;
}

export interface ElectricalPoint {
  id: string;
  type: ElectricalPointType;
  roomId: string;
  x: number; y: number;
  circuitId: string;
  wattage: number;
  heightMm: number;
  switchingLocation?: string;
}

export interface ElectricalCircuit {
  id: string;
  name: string;
  type: 'lighting' | 'socket' | 'appliance' | 'hvac' | 'dedicated';
  breakerA: number;
  points: string[];
  totalWattage: number;
  estimatedLoadA: number;
}

export interface DBStarter {
  id: string;
  location: string;
  circuits: ElectricalCircuit[];
  totalLoadKva: number;
  mainBreakerA: number;
  spareWays: number;
}

export interface HvacUnit {
  id: string;
  type: HvacType;
  roomId: string;
  x: number; y: number;
  capacityKw: number;
  servedAreaM2: number;
  supplyAir: boolean;
  returnAir: boolean;
  shaftId?: string;
}

export interface ServiceShaft {
  id: string;
  label: string;
  x: number; y: number;
  widthM: number; depthM: number;
  services: ('plumbing' | 'electrical' | 'hvac' | 'data')[];
  levelsServed: number[];
}

export interface MepPreDesignOutput {
  plumbing: {
    fixtures: PlumbingFixture[];
    stacks: PlumbingStack[];
    zones: PlumbingZone[];
    scheduleHtml: string;
  };
  electrical: {
    points: ElectricalPoint[];
    circuits: ElectricalCircuit[];
    db: DBStarter;
    scheduleHtml: string;
  };
  hvac: {
    units: HvacUnit[];
    shafts: ServiceShaft[];
    scheduleHtml: string;
  };
  drawings: {
    plumbingSvg: string;
    electricalSvg: string;
    hvacSvg: string;
    shaftCoordinationSvg: string;
  };
  boq: {
    fixtureCounts: Record<string, number>;
    pointCounts: Record<string, number>;
    hvacUnits: number;
    shaftServices: number;
    estimatedCostCents: number;
    notes: string[];
  };
  reviewLabel: string;
}

const PLUMBING_FIXTURE_DEMAND: Record<PlumbingFixtureType, number> = {
  wc: 6, basin: 3, shower: 10, bath: 15, bidet: 3, urinal: 3,
  sink: 5, 'washing-machine': 12, dishwasher: 8, geyser: 0,
};

const ELEC_POINT_WATTAGE: Record<ElectricalPointType, number> = {
  light: 30, switch: 0, socket: 150, data: 5, tv: 50,
  smoke: 5, heat: 2000, extractor: 50, db: 0, isolator: 0,
};

function computeServedArea(room: Space): number {
  return room.boundary ? Math.abs(
    room.boundary.vertices.reduce((area, v, i, arr) => {
      const j = (i + 1) % arr.length;
      return area + v.x * arr[j].y - arr[j].x * v.y;
    }, 0) / 2
  ) : room.areaM2 || 20;
}

function isWetRoom(programme: string): boolean {
  return ['bathroom', 'ensuite', 'kitchen', 'laundry', 'pantry', 'toilet'].includes(programme);
}

function isHabitableRoom(programme: string): boolean {
  return ['living', 'dining', 'bedroom', 'office', 'study', 'lounge', 'playroom', 'gym', 'cinema'].includes(programme);
}

function computePlumbing(graph: BuildingGraph): MepPreDesignOutput['plumbing'] {
  const fixtures: PlumbingFixture[] = [];
  const wetSpaces = graph.spaces.filter(s => isWetRoom(s.programme));
  const zones: PlumbingZone[] = [];

  let fixtureIdx = 0;
  for (const space of wetSpaces) {
    const level = graph.levels.find(l => l.id === space.levelId);
    const levelNum = level?.number ?? 1;
    const types: PlumbingFixtureType[] = [];
    if (['bathroom', 'ensuite'].includes(space.programme)) types.push('wc', 'basin', 'shower');
    else if (space.programme === 'kitchen') types.push('sink', 'dishwasher');
    else if (space.programme === 'laundry') types.push('washing-machine', 'sink');

    const roomFixtures = types.map((t, i) => ({
      id: `plumb-${fixtureIdx++}`,
      type: t,
      roomId: space.id,
      x: i * 0.8,
      y: 0.5,
      supply: t === 'wc' ? 'cold' as const : 'both' as const,
      waste: true,
      vent: t !== 'sink' && t !== 'washing-machine' && t !== 'dishwasher',
      stacked: levelNum > 1,
      levelNumber: levelNum,
    }));
    fixtures.push(...roomFixtures);

    zones.push({
      id: `zone-${space.id}`,
      label: `${space.programme} (L${levelNum})`,
      fixtures: roomFixtures,
      stacks: [],
      waterDemandLmin: roomFixtures.reduce((s, f) => s + (PLUMBING_FIXTURE_DEMAND[f.type] ?? 0), 0),
      isWetCore: true,
    });
  }

  const stacks: PlumbingStack[] = [];
  const stackPositions = new Set<string>();
  for (const fixture of fixtures) {
    if (fixture.stacked && fixture.waste) {
      const key = `${Math.round(fixture.x * 10)},${Math.round(fixture.y * 10)}`;
      if (!stackPositions.has(key)) {
        stackPositions.add(key);
        stacks.push({
          id: `stack-${stacks.length + 1}`,
          type: 'waste',
          x: fixture.x,
          y: fixture.y,
          connectedFixtures: [fixture.id],
          levelsServed: [fixture.levelNumber],
        });
      } else {
        const existing = stacks.find(s => s.connectedFixtures.includes(fixture.id));
        if (existing) {
          if (!existing.levelsServed.includes(fixture.levelNumber))
            existing.levelsServed.push(fixture.levelNumber);
            existing.connectedFixtures.push(fixture.id);
        }
      }
    }
  }

  const scheduleHtml = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px;border:1px solid #ddd;text-align:left">Fixture</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Type</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Room</th>
<th style="padding:4px;border:1px solid #ddd;text-align:left">Supply</th><th style="padding:4px;border:1px solid #ddd;text-align:center">Waste</th><th style="padding:4px;border:1px solid #ddd;text-align:center">Stacked</th>
</tr></thead><tbody>${fixtures.map(f => `<tr>
<td style="padding:3px;border:1px solid #ddd">${f.id}</td>
<td style="padding:3px;border:1px solid #ddd">${f.type}</td>
<td style="padding:3px;border:1px solid #ddd">${f.roomId.substring(0, 8)}</td>
<td style="padding:3px;border:1px solid #ddd">${f.supply}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:center">${f.waste ? '✓' : '-'}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:center">${f.stacked ? '✓' : '-'}</td>
</tr>`).join('')}</tbody></table>`;

  return { fixtures, stacks, zones, scheduleHtml };
}

function computeElectrical(graph: BuildingGraph): MepPreDesignOutput['electrical'] {
  const points: ElectricalPoint[] = [];
  const circuits: ElectricalCircuit[] = [];
  let pointIdx = 0;

  for (const space of graph.spaces) {
    const area = computeServedArea(space);

    const light = { id: `elec-${pointIdx++}`, type: 'light' as const, roomId: space.id, x: area / 4, y: area / 4, circuitId: `circ-1`, wattage: ELEC_POINT_WATTAGE.light, heightMm: 2400 };
    const sw = { id: `elec-${pointIdx++}`, type: 'switch' as const, roomId: space.id, x: 0.1, y: 0.1, circuitId: `circ-1`, wattage: 0, heightMm: 1200, switchingLocation: light.id };
    const socket = { id: `elec-${pointIdx++}`, type: 'socket' as const, roomId: space.id, x: area / 2, y: area / 2, circuitId: `circ-2`, wattage: ELEC_POINT_WATTAGE.socket, heightMm: 300 };

    points.push(light, sw, socket);

    if (isWetRoom(space.programme)) {
      points.push({ id: `elec-${pointIdx++}`, type: 'extractor' as const, roomId: space.id, x: 0.5, y: 0.8, circuitId: 'circ-3', wattage: ELEC_POINT_WATTAGE.extractor, heightMm: 2400 });
    }
    if (isHabitableRoom(space.programme)) {
      points.push({ id: `elec-${pointIdx++}`, type: 'data' as const, roomId: space.id, x: area / 3, y: area / 2, circuitId: 'circ-4', wattage: 5, heightMm: 300 });
    }
  }

  const circuitPoints = new Map<string, ElectricalPoint[]>();
  for (const p of points) {
    const arr = circuitPoints.get(p.circuitId) ?? [];
    arr.push(p);
    circuitPoints.set(p.circuitId, arr);
  }

  const circuitNames: Record<string, string> = { 'circ-1': 'Lighting', 'circ-2': 'Socket Outlets', 'circ-3': 'Appliances', 'circ-4': 'Data/LV' };
  for (const [cid, pts] of circuitPoints) {
    const totalW = pts.reduce((s, p) => s + p.wattage, 0);
    circuits.push({
      id: cid,
      name: circuitNames[cid] ?? cid,
      type: cid === 'circ-1' ? 'lighting' : cid === 'circ-3' ? 'appliance' : cid === 'circ-4' ? 'dedicated' : 'socket',
      breakerA: Math.max(6, Math.ceil(totalW / 230 / 0.8) * 2),
      points: pts.map(p => p.id),
      totalWattage: totalW,
      estimatedLoadA: Math.round(totalW / 230 * 10) / 10,
    });
  }

  const totalKva = Math.round(circuits.reduce((s, c) => s + c.estimatedLoadA, 0) * 0.23 * 10) / 10;
  const db: DBStarter = {
    id: 'db-main',
    location: 'Main distribution board',
    circuits,
    totalLoadKva: totalKva,
    mainBreakerA: Math.max(30, Math.ceil(totalKva / 0.23 / 0.8) * 5),
    spareWays: Math.max(2, 6 - circuits.length),
  };

  const scheduleHtml = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px;border:1px solid #ddd;text-align:left">Circuit</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Type</th>
<th style="padding:4px;border:1px solid #ddd;text-align:right">Points</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Watts</th>
<th style="padding:4px;border:1px solid #ddd;text-align:right">Load(A)</th><th style="padding:4px;border:1px solid #ddd;text-align:right">Breaker</th>
</tr></thead><tbody>${circuits.map(c => `<tr>
<td style="padding:3px;border:1px solid #ddd">${c.name}</td>
<td style="padding:3px;border:1px solid #ddd">${c.type}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${c.points.length}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${c.totalWattage}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${c.estimatedLoadA}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${c.breakerA}A</td>
</tr>`).join('')}</tbody></table>`;

  return { points, circuits, db, scheduleHtml };
}

function computeHvac(graph: BuildingGraph): MepPreDesignOutput['hvac'] {
  const units: HvacUnit[] = [];
  const shafts: ServiceShaft[] = [];
  let unitIdx = 0;

  for (const space of graph.spaces) {
    if (!isHabitableRoom(space.programme) && !isWetRoom(space.programme)) continue;
    const area = computeServedArea(space);
    const capacityKw = Math.round(area * 0.15 * 10) / 10;

    units.push({
      id: `hvac-${unitIdx++}`,
      type: isWetRoom(space.programme) ? 'extract-fan' : 'split-unit',
      roomId: space.id,
      x: area / 2,
      y: area / 2,
      capacityKw,
      servedAreaM2: Math.round(area * 100) / 100,
      supplyAir: !isWetRoom(space.programme),
      returnAir: !isWetRoom(space.programme),
    });
  }

  if (graph.levels.length > 1 && units.length > 0) {
    shafts.push({
      id: 'shaft-mep-1',
      label: 'Main MEP Shaft',
      x: 0.5, y: 0.5,
      widthM: 0.8, depthM: 0.6,
      services: ['plumbing', 'electrical', 'hvac'],
      levelsServed: graph.levels.map(l => l.number),
    });
  }

  const scheduleHtml = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px;border:1px solid #ddd;text-align:left">Unit</th><th style="padding:4px;border:1px solid #ddd;text-align:left">Type</th>
<th style="padding:4px;border:1px solid #ddd;text-align:right">Area m²</th><th style="padding:4px;border:1px solid #ddd;text-align:right">kW</th>
<th style="padding:4px;border:1px solid #ddd;text-align:center">Supply</th><th style="padding:4px;border:1px solid #ddd;text-align:center">Return</th>
</tr></thead><tbody>${units.map(u => `<tr>
<td style="padding:3px;border:1px solid #ddd">${u.id}</td>
<td style="padding:3px;border:1px solid #ddd">${u.type}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${u.servedAreaM2}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${u.capacityKw}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:center">${u.supplyAir ? '✓' : '-'}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:center">${u.returnAir ? '✓' : '-'}</td>
</tr>`).join('')}</tbody></table>`;

  return { units, shafts, scheduleHtml };
}

function generateMepDrawingSvg(output: MepPreDesignOutput): MepPreDesignOutput['drawings'] {
  const w = 400, h = 280;
  const plumbingSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#fafafa" rx="4"/>
<text x="${w/2}" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">Plumbing Schematic (Pre-Design)</text>
${output.plumbing.fixtures.map((f, i) => {
  const cx = 30 + (i % 8) * 42;
  const cy = 40 + Math.floor(i / 8) * 50;
  const colorMap: Record<string, string> = { wc: '#3b82f6', basin: '#22c55e', shower: '#f59e0b', sink: '#8b5cf6', 'washing-machine': '#ef4444', dishwasher: '#ec4899' };
  return `<circle cx="${cx}" cy="${cy}" r="8" fill="${colorMap[f.type] ?? '#999'}" opacity="0.4"/><text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="5" fill="#333" font-family="sans-serif">${f.type.substring(0, 4)}</text>`;
}).join('')}
<text x="${w/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#999" font-family="sans-serif">Fixture types shown · Pre-design only</text>
</svg>`;

  const electricalSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#fafafa" rx="4"/>
<text x="${w/2}" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">Electrical Schematic (Pre-Design)</text>
${output.electrical.points.filter(p => p.type !== 'switch').map((p, i) => {
  const cx = 20 + (i % 12) * 30;
  const cy = 40 + Math.floor(i / 12) * 40;
  const colorMap: Record<string, string> = { light: '#f59e0b', socket: '#22c55e', data: '#3b82f6', extractor: '#8b5cf6', smoke: '#ef4444' };
  return `<circle cx="${cx}" cy="${cy}" r="4" fill="${colorMap[p.type] ?? '#999'}"/><text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="4" fill="#666" font-family="sans-serif">${p.type.substring(0, 3)}</text>`;
}).join('')}
<text x="${w/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#999" font-family="sans-serif">${output.electrical.points.length} points · ${output.electrical.circuits.length} circuits · DB: ${output.electrical.db.totalLoadKva}kVA</text>
</svg>`;

  const hvacSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#fafafa" rx="4"/>
<text x="${w/2}" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">HVAC Schematic (Pre-Design)</text>
${output.hvac.units.map((u, i) => {
  const cx = 40 + (i % 6) * 55;
  const cy = 45 + Math.floor(i / 6) * 60;
  const isSplit = u.type === 'split-unit';
  const color = isSplit ? '#3b82f6' : '#f59e0b';
  const bg = isSplit ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)';
  return `<rect x="${cx - 12}" y="${cy - 8}" width="24" height="16" fill="${bg}" stroke="${color}" stroke-width="1" rx="2"/><text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="5" fill="#333" font-family="sans-serif">${u.capacityKw}kW</text><text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="4" fill="#666" font-family="sans-serif">${u.servedAreaM2}m²</text>`;
}).join('')}
<text x="${w/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#999" font-family="sans-serif">${output.hvac.units.length} units · Pre-design only</text>
</svg>`;

  const shaftCoordinationSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
<rect width="${w}" height="${h}" fill="#fafafa" rx="4"/>
<text x="${w/2}" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">Shaft Coordination (Pre-Design)</text>
${output.hvac.shafts.map((s, i) => {
  const cx = 60 + i * 120;
  const cy = 80;
  const sw = Math.max(30, s.widthM * 40);
  const sh = Math.max(20, s.depthM * 40);
  return `<rect x="${cx}" y="${cy}" width="${sw}" height="${sh}" fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" stroke-width="1.5" rx="2"/><text x="${cx + sw/2}" y="${cy + sh/2 + 3}" text-anchor="middle" font-size="7" fill="#6d28d9" font-family="sans-serif">${s.label}</text><text x="${cx + sw/2}" y="${cy + sh/2 + 16}" text-anchor="middle" font-size="5" fill="#666" font-family="sans-serif">${s.services.join(', ')}</text>`;
}).join('')}
${output.plumbing.stacks.map((_s, i) => {
  const cx = 200 + i * 30;
  const cy = 160;
  return `<circle cx="${cx}" cy="${cy}" r="6" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" stroke-width="1"/><text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="4" fill="#333" font-family="sans-serif">S</text>`;
}).join('')}
<text x="${w/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#999" font-family="sans-serif">Shaft continuity check · Pre-design coordination</text>
</svg>`;

  return { plumbingSvg, electricalSvg, hvacSvg, shaftCoordinationSvg };
}

function computeMepBoq(output: MepPreDesignOutput): MepPreDesignOutput['boq'] {
  const fixtureCounts: Record<string, number> = {};
  for (const f of output.plumbing.fixtures) {
    fixtureCounts[f.type] = (fixtureCounts[f.type] ?? 0) + 1;
  }
  const pointCounts: Record<string, number> = {};
  for (const p of output.electrical.points) {
    pointCounts[p.type] = (pointCounts[p.type] ?? 0) + 1;
  }

  const totalCostCents = Object.entries(fixtureCounts).reduce((s, [t, c]) => {
    const costs: Record<string, number> = { wc: 50000, basin: 30000, shower: 80000, bath: 150000, sink: 40000, 'washing-machine': 10000, dishwasher: 10000 };
    return s + (costs[t] ?? 20000) * c;
  }, 0) + Object.entries(pointCounts).reduce((s, [t, c]) => {
    const costs: Record<string, number> = { light: 15000, socket: 12000, data: 8000, extractor: 25000 };
    return s + (costs[t] ?? 5000) * c;
  }, 0) + output.hvac.units.length * 250000;

  return {
    fixtureCounts,
    pointCounts,
    hvacUnits: output.hvac.units.length,
    shaftServices: output.hvac.shafts.length + output.plumbing.stacks.length,
    estimatedCostCents: totalCostCents,
    notes: [
      'All MEP quantities are pre-design estimates. Final design by qualified engineer.',
      'Plumbing fixture counts based on room type inference.',
      'Electrical point placement is schematic. Final layout TBD.',
      'HVAC sizing at 150W/m² cooling load. Confirm with load calculation.',
      'Shaft positions are indicative. Coordinate with structure and architecture.',
    ],
  };
}

export function computeMepPreDesign(graph: BuildingGraph): MepPreDesignOutput {
  const plumbing = computePlumbing(graph);
  const electrical = computeElectrical(graph);
  const hvacOutput = computeHvac(graph);

  const output: MepPreDesignOutput = {
    plumbing,
    electrical,
    hvac: hvacOutput,
    drawings: { plumbingSvg: '', electricalSvg: '', hvacSvg: '', shaftCoordinationSvg: '' },
    boq: { fixtureCounts: {}, pointCounts: {}, hvacUnits: 0, shaftServices: 0, estimatedCostCents: 0, notes: [] },
    reviewLabel: '⚠ PRE-DESIGN ONLY — All MEP layouts are schematic. Review by qualified engineer required before construction.',
  };

  output.drawings = generateMepDrawingSvg(output);
  output.boq = computeMepBoq(output);

  return output;
}
