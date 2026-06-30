// Source: WS5 (engine/boqGenerator.ts — computeRebarTonnes)
// Purpose: Slab reinforcement tonnage calculation from slab area and rebar specification
// Status: Staged for future integration — not wired into any store or UI
// How to wire: Pass slab area (m²) and optional rebar spec to computeRebarTonnes()

import type { RebarSpec } from './structural-types';

/**
 * Mass per metre for standard rebar sizes (kg/m).
 */
export const barMass: Record<string, number> = {
  Y10: 0.617,
  Y12: 0.888,
  Y16: 1.579,
};

/**
 * Compute total rebar tonnage for a slab.
 * @param slabArea - Slab area in square metres (m²)
 * @param spec - Optional rebar specification (barSize, spacing, layers)
 * @returns Tonnes of rebar (rounded to 2 decimal places)
 */
export function computeRebarTonnes(slabArea: number, spec?: RebarSpec): number {
  if (slabArea <= 0) return 0;
  if (!spec) {
    // Fallback: 18 kg/m² hardcoded density
    return Math.round(slabArea * 18 / 1000 * 100) / 100;
  }
  const mass = barMass[spec.barSize] || 0.888;
  const barsPerM = 1000 / spec.spacing;
  const kgPerM2 = barsPerM * mass * 2 * spec.layers; // 2 directions (x and y)
  return Math.round(slabArea * kgPerM2 / 1000 * 100) / 100;
}

/**
 * Estimate rebar cost in USD based on tonnage and a rate per tonne.
 */
export function estimateRebarCost(tonnes: number, ratePerTonne = 1200): number {
  return Math.round(tonnes * ratePerTonne * 100) / 100;
}
