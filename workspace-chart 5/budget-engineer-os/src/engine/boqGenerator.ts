import type { BimModel } from '../domain/bim';
import type { BOQ, BOQLineItem } from '../domain/boq';

const materialRates: Record<string, { wall_m2: number; slab_m2: number; roof_m2: number; opening_each: number; object_each: number; column_each: number; beam_m: number; footing_m3: number; mep_elec: number; mep_plumb: number; rebar_tonne: number }> = {
  concrete: { wall_m2: 85, slab_m2: 110, roof_m2: 75, opening_each: 250, object_each: 120, column_each: 450, beam_m: 220, footing_m3: 380, mep_elec: 65, mep_plumb: 180, rebar_tonne: 1200 },
  steel: { wall_m2: 120, slab_m2: 140, roof_m2: 95, opening_each: 250, object_each: 120, column_each: 680, beam_m: 350, footing_m3: 280, mep_elec: 65, mep_plumb: 180, rebar_tonne: 1200 },
  timber: { wall_m2: 65, slab_m2: 85, roof_m2: 55, opening_each: 250, object_each: 120, column_each: 320, beam_m: 180, footing_m3: 450, mep_elec: 65, mep_plumb: 180, rebar_tonne: 1200 },
};

import type { RebarSpec } from '../domain/cad';

const barMass: Record<string, number> = { Y10: 0.617, Y12: 0.888, Y16: 1.579 };

function computeRebarTonnes(slabArea: number, spec?: RebarSpec): number {
  if (!spec) return Math.round(slabArea * 18 / 1000 * 100) / 100; // fallback to old hardcoded
  const mass = barMass[spec.barSize] || 0.888;
  const barsPerM = 1000 / spec.spacing;
  const kgPerM2 = barsPerM * mass * 2 * spec.layers; // 2 directions
  return Math.round(slabArea * kgPerM2 / 1000 * 100) / 100;
}

export function generateBoqFromBim(bim: BimModel, rebarSpec?: RebarSpec): BOQ {
  const items: BOQLineItem[] = [];
  const projectId = bim.projectId;
  let openingCount = 0, objectCount = 0, mepElec = 0, mepPlumb = 0;
  const materialQuantities: Record<string, { wallArea: number; slabArea: number; roofArea: number; beamM: number; columnCount: number; footingVol: number }> = {};

  for (const el of bim.elements) {
    const mat = (el.metadata?.material as string) || 'concrete';
    if (!materialQuantities[mat]) materialQuantities[mat] = { wallArea: 0, slabArea: 0, roofArea: 0, beamM: 0, columnCount: 0, footingVol: 0 };
    const q = materialQuantities[mat];
    if (el.type === 'wall') { q.wallArea += (el.scale[0] || 0) * (el.scale[2] || 0); }
    if (el.type === 'slab') { q.slabArea += (el.scale[0] || 0) * (el.scale[1] || 0); }
    if (el.type === 'roof') { q.roofArea += (el.scale[0] || 0) * (el.scale[1] || 0); }
    if (el.type === 'opening') { openingCount++; }
    if (el.type === 'block') { objectCount++; }
    if (el.type === 'column') { q.columnCount++; }
    if (el.type === 'beam') { q.beamM += el.scale[0] || 0; }
    if (el.type === 'block' && el.metadata?.category === 'Footing') { q.footingVol += (el.scale[0] || 0) * (el.scale[1] || 0) * (el.scale[2] || 0); }
  }

  for (const [mat, q] of Object.entries(materialQuantities)) {
    const r = materialRates[mat] || materialRates.concrete;
    if (q.wallArea > 0) items.push({ id: `boq-item-walls-${mat}`, projectId, category: 'Walls', description: `${mat} walling`, quantity: Math.round(q.wallArea * 100) / 100, unit: 'm2', unitRate: r.wall_m2, total: Math.round(q.wallArea * r.wall_m2 * 100) / 100 });
    if (q.beamM > 0) items.push({ id: `boq-item-beams-${mat}`, projectId, category: 'Beams', description: `${mat} beam grid`, quantity: Math.round(q.beamM * 100) / 100, unit: 'm', unitRate: r.beam_m, total: Math.round(q.beamM * r.beam_m * 100) / 100 });
    if (q.columnCount > 0) items.push({ id: `boq-item-columns-${mat}`, projectId, category: 'Structural', description: `${mat} columns & pilasters`, quantity: q.columnCount, unit: 'each', unitRate: r.column_each, total: Math.round(q.columnCount * r.column_each * 100) / 100 });
    if (q.footingVol > 0) items.push({ id: `boq-item-footings-${mat}`, projectId, category: 'Footings', description: `${mat} pad footings`, quantity: Math.round(q.footingVol * 100) / 100, unit: 'm3', unitRate: r.footing_m3, total: Math.round(q.footingVol * r.footing_m3 * 100) / 100 });
  }

  // Slab and roof use dominant material (most structural material by wall area)
  const dominantMat = Object.entries(materialQuantities).sort((a, b) => b[1].wallArea - a[1].wallArea)[0]?.[0] || 'concrete';
  const dominantQ = materialQuantities[dominantMat] || { wallArea: 0, slabArea: 0, roofArea: 0, beamM: 0, columnCount: 0, footingVol: 0 };
  const dominantR = materialRates[dominantMat] || materialRates.concrete;

  let totalSlabArea = 0, totalRoofArea = 0, totalRebarTonnes = 0;
  for (const q of Object.values(materialQuantities)) {
    totalSlabArea += q.slabArea;
    totalRoofArea += q.roofArea;
  }

  if (totalSlabArea > 0) {
    items.push({ id: 'boq-item-slabs', projectId, category: 'Slabs', description: `${dominantMat} floor slabs`, quantity: Math.round(totalSlabArea * 100) / 100, unit: 'm2', unitRate: dominantR.slab_m2, total: Math.round(totalSlabArea * dominantR.slab_m2 * 100) / 100 });
    totalRebarTonnes = computeRebarTonnes(totalSlabArea, rebarSpec);
  }
  if (totalRoofArea > 0) items.push({ id: 'boq-item-roof', projectId, category: 'Roof', description: `${dominantMat} roof covering`, quantity: Math.round(totalRoofArea * 100) / 100, unit: 'm2', unitRate: dominantR.roof_m2, total: Math.round(totalRoofArea * dominantR.roof_m2 * 100) / 100 });
  if (totalRebarTonnes > 0) {
    const desc = rebarSpec
      ? `${rebarSpec.barSize} @ ${rebarSpec.spacing} c/c ${rebarSpec.layers === 2 ? 'double' : 'single'}-layer reinforcement mesh`
      : 'Y12 @ 200 c/c double-layer reinforcement mesh';
    items.push({ id: 'boq-item-rebar', projectId, category: 'Rebar', description: desc, quantity: totalRebarTonnes, unit: 'tonne', unitRate: materialRates.concrete.rebar_tonne, total: Math.round(totalRebarTonnes * materialRates.concrete.rebar_tonne * 100) / 100 });
  }
  if (openingCount > 0) items.push({ id: 'boq-item-openings', projectId, category: 'Openings', description: 'Doors, windows, and glazing', quantity: openingCount, unit: 'each', unitRate: materialRates.concrete.opening_each, total: Math.round(openingCount * materialRates.concrete.opening_each * 100) / 100 });
  if (objectCount > 0) items.push({ id: 'boq-item-objects', projectId, category: 'Objects', description: 'Furniture, fixtures, and loose assets', quantity: objectCount, unit: 'each', unitRate: materialRates.concrete.object_each, total: Math.round(objectCount * materialRates.concrete.object_each * 100) / 100 });
  if (mepElec > 0) items.push({ id: 'boq-item-mep-elec', projectId, category: 'MEP', description: 'Electrical outlets & LED lighting', quantity: mepElec, unit: 'pt', unitRate: materialRates.concrete.mep_elec, total: Math.round(mepElec * materialRates.concrete.mep_elec * 100) / 100 });
  if (mepPlumb > 0) items.push({ id: 'boq-item-mep-plumb', projectId, category: 'MEP', description: 'Plumbing supply & drainage points', quantity: mepPlumb, unit: 'pt', unitRate: materialRates.concrete.mep_plumb, total: Math.round(mepPlumb * materialRates.concrete.mep_plumb * 100) / 100 });
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const contingency = Math.round(subtotal * 0.05 * 100) / 100;
  const professionalFees = Math.round(subtotal * 0.07 * 100) / 100;
  const vat = Math.round((subtotal + contingency + professionalFees) * 0.15 * 100) / 100;
  const grandTotal = Math.round((subtotal + contingency + professionalFees + vat) * 100) / 100;
  return { id: `boq-${bim.id}`, projectId, currency: 'USD', items, summary: { subtotal, contingency, professionalFees, vat, grandTotal } };
}