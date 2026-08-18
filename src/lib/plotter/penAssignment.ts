// ── Pen Assignment ────────────────────────────────────────────
// Maps drawing layers to physical pen slots and line weights.
// Uses the existing PEN_TABLE from lib/draft/pen-table.ts as the source of truth.

import type { PenTipMm, PenSpec } from './types'
import { ARCH_PEN_SET, penSlotForWeight } from './types'
import { getPenAssignment, type LineWeight } from '@/lib/draft/pen-table'

// ── Layer → Pen mapping ───────────────────────────────────────

/** Get the pen slot number for a given layer code. */
export function penSlotForLayer(layerCode: string): number {
  const assignment = getPenAssignment(layerCode)
  return penSlotForWeight(assignment.lineWeight)
}

/** Get the physical pen spec for a given layer code. */
export function penSpecForLayer(layerCode: string): PenSpec {
  const slot = penSlotForLayer(layerCode)
  return ARCH_PEN_SET.find(p => p.slot === slot) ?? ARCH_PEN_SET[0]
}

/** Get the pen tip diameter for a given layer code. */
export function penTipForLayer(layerCode: string): PenTipMm {
  return penSpecForLayer(layerCode).tipMm
}

// ── Layer classification ──────────────────────────────────────

/** Classify a layer code into a semantic drawing category. */
export type DrawingCategory =
  | 'structure'
  | 'architecture'
  | 'openings'
  | 'annotations'
  | 'dimensions'
  | 'grid'
  | 'electrical'
  | 'plumbing'
  | 'mechanical'
  | 'interiors'
  | 'title'
  | 'other'

const CATEGORY_PREFIXES: Record<string, DrawingCategory> = {
  'S-': 'structure',
  'A-WALL': 'architecture',
  'A-ROOF': 'architecture',
  'A-FLOR': 'architecture',
  'A-ELEV': 'architecture',
  'A-SECT': 'architecture',
  'A-DOOR': 'openings',
  'A-GLAZ': 'openings',
  'A-GRID': 'grid',
  'A-ANNO-DIMS': 'dimensions',
  'A-ANNO-TEXT': 'annotations',
  'A-ANNO-LEAD': 'annotations',
  'A-ANNO-SYMB': 'annotations',
  'A-ANNO': 'annotations',
  'A-FURN': 'interiors',
  'A-TTLB': 'title',
  'E-': 'electrical',
  'P-': 'plumbing',
  'M-': 'mechanical',
  'I-': 'interiors',
}

export function classifyLayer(layerCode: string): DrawingCategory {
  // Longest prefix match
  const sorted = Object.keys(CATEGORY_PREFIXES).sort((a, b) => b.length - a.length)
  for (const prefix of sorted) {
    if (layerCode.startsWith(prefix)) {
      return CATEGORY_PREFIXES[prefix]
    }
  }
  return 'other'
}

// ── Layer → Pen slot defaults (for unknown layers) ────────────

/** Map a drawing category to a default pen slot. */
const CATEGORY_PEN_DEFAULTS: Record<DrawingCategory, number> = {
  structure: 4,     // 0.50mm heavy
  architecture: 4,  // 0.50mm heavy
  openings: 2,      // 0.25mm thin
  dimensions: 3,    // 0.35mm medium
  annotations: 1,   // 0.18mm fine
  grid: 1,          // 0.18mm fine
  electrical: 2,    // 0.25mm thin
  plumbing: 2,      // 0.25mm thin
  mechanical: 2,    // 0.25mm thin
  interiors: 2,     // 0.25mm thin
  title: 4,         // 0.50mm heavy
  other: 1,         // 0.18mm fine
}

/** Get the pen slot for a category (used when PEN_TABLE has no match). */
export function penSlotForCategory(category: DrawingCategory): number {
  return CATEGORY_PEN_DEFAULTS[category]
}

// ── Drawing sheet → pen set ───────────────────────────────────

/** Determine which pen slots are needed for a given set of layer codes. */
export function requiredPens(layers: string[]): number[] {
  const slots = new Set<number>()
  for (const layer of layers) {
    slots.add(penSlotForLayer(layer))
  }
  return [...slots].sort((a, b) => a - b)
}

/** Get the pen change count for an ordered list of pen assignments. */
export function countPenChanges(orderedPenSlots: number[]): number {
  if (orderedPenSlots.length === 0) return 0
  let changes = 0
  let current = orderedPenSlots[0]
  for (let i = 1; i < orderedPenSlots.length; i++) {
    if (orderedPenSlots[i] !== current) {
      changes++
      current = orderedPenSlots[i]
    }
  }
  return changes
}

// ── Pen weight lookup ─────────────────────────────────────────

/** Convert a LineWeight to PenTipMm. */
export function lineWeightToPenTip(lw: LineWeight): PenTipMm {
  return lw as PenTipMm
}

/** Get all unique pen weights needed for a layer set. */
export function uniquePenWeights(layers: string[]): PenTipMm[] {
  const weights = new Set<PenTipMm>()
  for (const layer of layers) {
    const assignment = getPenAssignment(layer)
    weights.add(assignment.lineWeight as PenTipMm)
  }
  return [...weights].sort((a, b) => a - b)
}
