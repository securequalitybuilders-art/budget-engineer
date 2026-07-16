import type { StructuralPreDesignOutput } from '@/engine/structural/structuralPreDesignEngine';
import type { MepPreDesignOutput } from '@/engine/mep/mepPreDesignEngine';
import type { BOQ, BOQLineItem, BOQSummary } from '@/lib/boq/boq-types';
import { resolveBoqRate, getContingencyRate, getFeesRate, getVatRate, getRegionRateCard } from '@/adapters/rateCardAdapter';

let _uid = 0;
function uid(): string {
  return `boq-${++_uid}-${Date.now().toString(36)}`;
}

const FIXTURE_DESCRIPTIONS: Record<string, string> = {
  wc: 'WC pan (close-coupled)',
  basin: 'Wash hand basin',
  shower: 'Shower tray & fittings',
  bath: 'Bath (standard)',
  bidet: 'Bidet',
  urinal: 'Urinal',
  sink: 'Kitchen sink (single bowl)',
  'washing-machine': 'Washing machine supply',
  dishwasher: 'Dishwasher supply',
  geyser: 'Geyser (150L)',
};

const POINT_DESCRIPTIONS: Record<string, string> = {
  light: 'Light point',
  switch: 'Switch (1-gang)',
  socket: 'Socket outlet (13A)',
  data: 'Data outlet (Cat6)',
  tv: 'TV outlet',
  smoke: 'Smoke detector',
  heat: 'Heat detector',
  extractor: 'Extractor fan',
  db: 'Distribution board',
  isolator: 'Isolator switch',
};

function computeConcreteSplit(structural: StructuralPreDesignOutput): { footingsM3: number; columnsM3: number; beamsM3: number } {
  let footingsM3 = 0;
  for (const f of structural.footings) {
    footingsM3 += f.widthM * f.depthM * (f.thicknessMm / 1000);
  }
  let columnsM3 = 0;
  for (const c of structural.columns) {
    columnsM3 += (c.widthMm / 1000) * (c.depthMm / 1000) * c.heightM;
  }
  let beamsM3 = 0;
  for (const b of structural.beams) {
    beamsM3 += (b.widthMm / 1000) * (b.depthMm / 1000) * b.spanM;
  }
  return {
    footingsM3: Math.round(footingsM3 * 100) / 100,
    columnsM3: Math.round(columnsM3 * 100) / 100,
    beamsM3: Math.round(beamsM3 * 100) / 100,
  };
}

export function structuralBoqToLineItems(
  structural: StructuralPreDesignOutput,
  region: string
): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const boq = structural.boq;
  const card = getRegionRateCard(region);
  const split = computeConcreteSplit(structural);

  const totalComputed = split.footingsM3 + split.columnsM3 + split.beamsM3;
  const totalReported = boq.concreteM3;

  if (totalReported > 0 && totalComputed > 0) {
    const scale = totalReported / totalComputed;

    if (split.footingsM3 > 0) {
      const qty = Math.round(split.footingsM3 * scale * 100) / 100;
      const rate = card.concrete.stripFootingM3;
      items.push({
        id: uid(), quantityRef: 'structural-concrete-footings',
        category: 'Substructure',
        description: `Concrete in foundations (strip footings) — ${qty} m³`,
        unit: 'm³', quantity: qty, rate,
        total: Math.round(qty * rate * 100) / 100,
      });
    }

    if (split.columnsM3 > 0) {
      const qty = Math.round(split.columnsM3 * scale * 100) / 100;
      const rate = card.concrete.reinforcedColumnM3;
      items.push({
        id: uid(), quantityRef: 'structural-concrete-columns',
        category: 'Superstructure',
        description: `Concrete in columns — ${qty} m³`,
        unit: 'm³', quantity: qty, rate,
        total: Math.round(qty * rate * 100) / 100,
      });
    }

    if (split.beamsM3 > 0) {
      const qty = Math.round(split.beamsM3 * scale * 100) / 100;
      const rate = card.concrete.reinforcedBeamM3;
      items.push({
        id: uid(), quantityRef: 'structural-concrete-beams',
        category: 'Superstructure',
        description: `Concrete in beams — ${qty} m³`,
        unit: 'm³', quantity: qty, rate,
        total: Math.round(qty * rate * 100) / 100,
      });
    }

    {
      const labourRate = card.concrete.concreteLabourM3;
      const totalVol = Math.round(totalComputed * scale * 100) / 100;
      items.push({
        id: uid(), quantityRef: 'structural-concrete-labour',
        category: 'Substructure',
        description: `Concrete labour (place & finish) — ${totalVol} m³`,
        unit: 'm³', quantity: totalVol,
        rate: labourRate,
        total: Math.round(totalVol * labourRate * 100) / 100,
      });
    }
  }

  if (boq.reinforcementKg > 0) {
    const r = resolveBoqRate(region, 'rebar', 1200);
    const tonnes = boq.reinforcementKg / 1000;
    items.push({
      id: uid(), quantityRef: 'structural-rebar',
      category: 'Superstructure',
      description: `Steel reinforcement (all members) — ${boq.reinforcementKg} kg`,
      unit: 'tonne', quantity: Math.round(tonnes * 100) / 100,
      rate: r.rate,
      total: Math.round(tonnes * r.rate * 100) / 100,
    });
  }

  if (boq.formworkM2 > 0) {
    const r = resolveBoqRate(region, 'formwork', 32);
    items.push({
      id: uid(), quantityRef: 'structural-formwork',
      category: 'Superstructure',
      description: `Formwork to soffits and sides — ${boq.formworkM2} m²`,
      unit: 'm²', quantity: Math.round(boq.formworkM2 * 100) / 100,
      rate: r.rate,
      total: Math.round(boq.formworkM2 * r.rate * 100) / 100,
    });
  }

  return items;
}

function totalFixtureCount(mep: MepPreDesignOutput): number {
  return Object.values(mep.boq.fixtureCounts).reduce((s, c) => s + c, 0);
}

function totalPointCount(mep: MepPreDesignOutput): number {
  return Object.values(mep.boq.pointCounts).reduce((s, c) => s + c, 0);
}

export function mepBoqToLineItems(
  mep: MepPreDesignOutput,
  region: string
): BOQLineItem[] {
  const items: BOQLineItem[] = [];
  const card = getRegionRateCard(region);

  const fixtureTot = totalFixtureCount(mep);
  const pointTot = totalPointCount(mep);

  for (const [type, count] of Object.entries(mep.boq.fixtureCounts)) {
    const desc = FIXTURE_DESCRIPTIONS[type] ?? `Plumbing fitting (${type})`;
    const rate = rateForFixture(card, type);
    items.push({
      id: uid(),
      quantityRef: `mep-plumbing-${type}`,
      category: 'Plumbing',
      description: `${desc} × ${count}`,
      unit: 'each',
      quantity: count,
      rate,
      total: Math.round(count * rate * 100) / 100,
    });
    const pipeAllowance = count * estimatePipeLength(type);
    if (pipeAllowance > 0) {
      const pipeRate = type === 'geyser' ? card.plumbing.hotWaterPipeM : card.plumbing.coldWaterPipeM;
      items.push({
        id: uid(),
        quantityRef: `mep-plumbing-pipe-${type}`,
        category: 'Plumbing',
        description: `Pipework for ${desc}`,
        unit: 'm',
        quantity: pipeAllowance,
        rate: pipeRate,
        total: Math.round(pipeAllowance * pipeRate * 100) / 100,
      });
    }
  }

  if (fixtureTot > 0) {
    items.push({
      id: uid(), quantityRef: 'mep-plumbing-labour',
      category: 'Plumbing',
      description: `Plumbing labour — all fixture installations`,
      unit: 'point',
      quantity: fixtureTot,
      rate: card.plumbing.labourPerPoint,
      total: Math.round(fixtureTot * card.plumbing.labourPerPoint * 100) / 100,
    });
  }

  for (const [type, count] of Object.entries(mep.boq.pointCounts)) {
    const desc = POINT_DESCRIPTIONS[type] ?? `Electrical point (${type})`;
    const rate = rateForPoint(card, type);
    items.push({
      id: uid(),
      quantityRef: `mep-electrical-${type}`,
      category: 'Electrical',
      description: `${desc} × ${count}`,
      unit: 'each',
      quantity: count,
      rate,
      total: Math.round(count * rate * 100) / 100,
    });
    if (type !== 'db' && type !== 'isolator') {
      const conduitAllowance = estimateConduitLength(type) * count;
      if (conduitAllowance > 0) {
        items.push({
          id: uid(),
          quantityRef: `mep-electrical-conduit-${type}`,
          category: 'Electrical',
          description: `Conduit & wiring for ${desc}`,
          unit: 'm',
          quantity: conduitAllowance,
          rate: card.electrical.conduitM + card.electrical.wiringM,
          total: Math.round(conduitAllowance * (card.electrical.conduitM + card.electrical.wiringM) * 100) / 100,
        });
      }
    }
  }

  if (pointTot > 0) {
    items.push({
      id: uid(), quantityRef: 'mep-electrical-labour',
      category: 'Electrical',
      description: `Electrical labour — all point installations`,
      unit: 'point',
      quantity: pointTot,
      rate: card.electrical.labourPerPoint,
      total: Math.round(pointTot * card.electrical.labourPerPoint * 100) / 100,
    });
  }

  if (mep.electrical.db.circuits.length > 0) {
    const dbCount = mep.boq.pointCounts['db'] ?? 1;
    const rate = card.electrical.dbBoardEach;
    items.push({
      id: uid(), quantityRef: 'mep-electrical-db',
      category: 'Electrical',
      description: `Distribution board (${mep.electrical.db.totalLoadKva}kVA, ${mep.electrical.db.spareWays} spare ways)`,
      unit: 'each',
      quantity: Math.max(1, dbCount),
      rate,
      total: Math.round(Math.max(1, dbCount) * rate * 100) / 100,
    });
    items.push({
      id: uid(), quantityRef: 'mep-electrical-earthing',
      category: 'Electrical',
      description: `Earthing system (rod & bonding)`,
      unit: 'each',
      quantity: 1,
      rate: card.electrical.earthingEach,
      total: card.electrical.earthingEach,
    });
  }

  const hvacCount = mep.boq.hvacUnits;
  if (hvacCount > 0) {
    const splitCount = mep.hvac.units.filter(u => u.type === 'split-unit').length;
    const extractCount = mep.hvac.units.filter(u => u.type === 'extract-fan').length;
    if (splitCount > 0) {
      items.push({
        id: uid(),
        quantityRef: 'mep-hvac-split',
        category: 'HVAC',
        description: `Split air conditioning unit (cooling only) × ${splitCount}`,
        unit: 'each',
        quantity: splitCount,
        rate: card.hvac.splitUnitEach + card.hvac.bracketEach,
        total: Math.round(splitCount * (card.hvac.splitUnitEach + card.hvac.bracketEach) * 100) / 100,
      });
      items.push({
        id: uid(), quantityRef: 'mep-hvac-split-labour',
        category: 'HVAC',
        description: `HVAC labour — split unit installations × ${splitCount}`,
        unit: 'each',
        quantity: splitCount,
        rate: card.hvac.labourPerUnit,
        total: Math.round(splitCount * card.hvac.labourPerUnit * 100) / 100,
      });
    }
    if (extractCount > 0) {
      items.push({
        id: uid(),
        quantityRef: 'mep-hvac-extract',
        category: 'HVAC',
        description: `Extract fan × ${extractCount}`,
        unit: 'each',
        quantity: extractCount,
        rate: card.hvac.extractFanEach,
        total: Math.round(extractCount * card.hvac.extractFanEach * 100) / 100,
      });
    }
    const totalPipe = hvacCount * 8;
    items.push({
      id: uid(),
      quantityRef: 'mep-hvac-pipe',
      category: 'HVAC',
      description: `Refrigerant & condensate pipework`,
      unit: 'm',
      quantity: totalPipe,
      rate: card.hvac.refrigerantLineM + card.hvac.condensateDrainM,
      total: Math.round(totalPipe * (card.hvac.refrigerantLineM + card.hvac.condensateDrainM) * 100) / 100,
    });
  }

  if (hvacCount > 0 || fixtureTot > 0) {
    items.push({
      id: uid(), quantityRef: 'mep-testing-commissioning',
      category: 'Services',
      description: `Testing & commissioning (plumbing + HVAC)`,
      unit: 'lump',
      quantity: 1,
      rate: card.plumbing.testingCommission + card.hvac.commissioning,
      total: card.plumbing.testingCommission + card.hvac.commissioning,
    });
  }

  if (mep.boq.pointCounts['smoke'] && (mep.boq.pointCounts['smoke'] ?? 0) > 0) {
    items.push({
      id: uid(), quantityRef: 'mep-fire-detection',
      category: 'Services',
      description: `Fire detection system (smoke/heat detectors) × ${(mep.boq.pointCounts['smoke'] ?? 0) + (mep.boq.pointCounts['heat'] ?? 0)}`,
      unit: 'each',
      quantity: (mep.boq.pointCounts['smoke'] ?? 0) + (mep.boq.pointCounts['heat'] ?? 0),
      rate: card.finishes.externalPaintM2 * 5,
      total: Math.round(((mep.boq.pointCounts['smoke'] ?? 0) + (mep.boq.pointCounts['heat'] ?? 0)) * card.finishes.externalPaintM2 * 5 * 100) / 100,
    });
  }

  return items;
}

function nearestKnownRate(rates: Record<string, number>, _type: string): number {
  const known = Object.values(rates).filter(v => v > 0);
  if (known.length === 0) return 20000;
  return Math.round(known.reduce((s, v) => s + v, 0) / known.length);
}

function rateForFixture(card: ReturnType<typeof getRegionRateCard>, type: string): number {
  const plumbing = card.plumbing as unknown as Record<string, number>;
  const key = plumbingMapKey(type);
  if (key && plumbing[key] !== undefined) return plumbing[key];
  if (type === 'bath') return plumbing['showerEach'] ?? 25000;
  if (type === 'bidet') return plumbing['basinEach'] ?? 15000;
  if (type === 'urinal') return plumbing['wcPanEach'] ?? 18000;
  if (type === 'washing-machine' || type === 'dishwasher') {
    return Math.round((plumbing['sinkEach'] ?? 20000) * 0.5);
  }
  return nearestKnownRate(plumbing, type);
}

function plumbingMapKey(type: string): string {
  const map: Record<string, string> = {
    wc: 'wcPanEach',
    basin: 'basinEach',
    shower: 'showerEach',
    sink: 'sinkEach',
    geyser: 'geyserEach',
  };
  return map[type] ?? '';
}

function rateForPoint(card: ReturnType<typeof getRegionRateCard>, type: string): number {
  const electrical = card.electrical as unknown as Record<string, number>;
  const key = electricalMapKey(type);
  if (key && electrical[key] !== undefined) return electrical[key];
  if (type === 'tv') return electrical['specialOutletEach'] ?? 6500;
  if (type === 'smoke' || type === 'heat') return electrical['specialOutletEach'] ?? 6500;
  if (type === 'extractor') return electrical['specialOutletEach'] ?? 6500;
  if (type === 'db') return electrical['dbBoardEach'] ?? 28000;
  if (type === 'isolator') return electrical['specialOutletEach'] ?? 6500;
  return nearestKnownRate(electrical, type);
}

function electricalMapKey(type: string): string {
  const map: Record<string, string> = {
    light: 'lightPointEach',
    switch: 'switchEach',
    socket: 'socketEach',
    data: 'specialOutletEach',
    tv: 'specialOutletEach',
    smoke: 'specialOutletEach',
    heat: 'specialOutletEach',
    extractor: 'specialOutletEach',
  };
  return map[type] ?? '';
}

function estimatePipeLength(fixtureType: string): number {
  const lengths: Record<string, number> = {
    wc: 3, basin: 4, shower: 5, bath: 5, sink: 4,
    'washing-machine': 3, dishwasher: 3, geyser: 6,
  };
  return lengths[fixtureType] ?? 3;
}

function estimateConduitLength(pointType: string): number {
  const lengths: Record<string, number> = {
    light: 8, switch: 5, socket: 6, data: 8, tv: 8,
    smoke: 6, heat: 6, extractor: 6,
  };
  return lengths[pointType] ?? 5;
}

export function computeAdditionalSummary(
  items: BOQLineItem[],
  region: string
): BOQSummary {
  const subtotal = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const contingencyPct = getContingencyRate(region);
  const feesPct = getFeesRate(region);
  const vatPct = getVatRate(region);
  const contingency = Math.round(subtotal * contingencyPct * 100) / 100;
  const professionalFees = Math.round(subtotal * feesPct * 100) / 100;
  const vat = Math.round((subtotal + contingency + professionalFees) * vatPct * 100) / 100;
  const grandTotal = Math.round((subtotal + contingency + professionalFees + vat) * 100) / 100;
  return { subtotal, contingency, professionalFees, vat, grandTotal };
}

export function mergeWithCentralBoq(
  baseBoq: BOQ,
  additionalItems: BOQLineItem[],
  region: string
): BOQ {
  const mergedItems = [...baseBoq.items, ...additionalItems];
  const mergedSubtotal = Math.round(mergedItems.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const contingencyPct = getContingencyRate(region);
  const feesPct = getFeesRate(region);
  const vatPct = getVatRate(region);
  const contingency = Math.round(mergedSubtotal * contingencyPct * 100) / 100;
  const professionalFees = Math.round(mergedSubtotal * feesPct * 100) / 100;
  const vat = Math.round((mergedSubtotal + contingency + professionalFees) * vatPct * 100) / 100;
  const grandTotal = Math.round((mergedSubtotal + contingency + professionalFees + vat) * 100) / 100;

  return {
    ...baseBoq,
    items: mergedItems,
    summary: { subtotal: mergedSubtotal, contingency, professionalFees, vat, grandTotal },
  };
}

export function buildStructuralMepBoq(
  structural: StructuralPreDesignOutput,
  mep: MepPreDesignOutput,
  region: string,
  projectId: string
): BOQ {
  const card = getRegionRateCard(region);
  const structItems = structuralBoqToLineItems(structural, region);
  const mepItems = mepBoqToLineItems(mep, region);
  const allItems = [...structItems, ...mepItems];
  const summary = computeAdditionalSummary(allItems, region);
  return {
    id: `boq-struct-mep-${projectId}-${Date.now().toString(36)}`,
    projectId,
    currency: card.currency,
    items: allItems,
    summary,
    estimateDepth: 'detailed',
  };
}
