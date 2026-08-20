/**
 * P3 Computer Vision engine.
 * Deterministic photo-to-working-drawing match using keyword/feature
 * extraction (no paid API — local-first constitution).
 */
import type { CvMatchResult } from '@/domain/sitehawk';

const FEATURE_KEYWORDS: Record<string, string[]> = {
  foundation: ['footing', 'trench', 'concrete', 'blinding', 'rebar', 'reinforcement', 'excavation'],
  walls: ['blockwork', 'masonry', 'brick', 'mortar', 'cavity', 'wall plate', 'ring beam'],
  roof: ['truss', 'purlin', 'rafters', 'roofing sheet', 'IBR', 'tile', 'ridge cap', 'flashing'],
  mep: ['conduit', 'pipe', 'wiring', 'db board', 'geyser', 'cistern', 'drain', 'sewer'],
  finishes: ['plaster', 'paint', 'tiles', 'ceiling', 'skirting', 'grouting'],
  openings: ['door', 'window', 'frame', 'glazing', 'lintel', 'sill', 'handle'],
};

/** Extract feature tags from a text note (lowercase, trimmed). */
export function extractFeatures(note: string): string[] {
  const lower = note.toLowerCase();
  const features: string[] = [];
  for (const [category, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        features.push(`${category}:${kw}`);
      }
    }
  }
  return features;
}

/** Deterministic hash for a string (FNV-1a 32-bit). */
export function fnvHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

export interface CvMatchInput {
  photoNote: string;
  workingDrawingRef: string;
  workingDrawingDescription: string;
  thresholdPct?: number;
}

/**
 * Match a site photo note against a working drawing description.
 * Returns a deterministic confidence score from feature overlap.
 */
export function matchPhotoToPlan(input: CvMatchInput): CvMatchResult {
  const photoFeatures = extractFeatures(input.photoNote);
  const planFeatures = extractFeatures(input.workingDrawingDescription);
  const threshold = input.thresholdPct ?? 50;

  const photoSet = new Set(photoFeatures);
  const planSet = new Set(planFeatures);

  const matched: string[] = [];
  const mismatched: string[] = [];

  for (const f of photoSet) {
    if (planSet.has(f)) matched.push(f);
    else mismatched.push(f);
  }

  const totalPlanFeatures = planSet.size;
  const confidence = totalPlanFeatures > 0
    ? Math.round((matched.length / totalPlanFeatures) * 100)
    : 0;

  return {
    matched: confidence >= threshold,
    confidence,
    matchedFeatures: matched,
    mismatchedFeatures: mismatched,
    photoNote: input.photoNote,
    workingDrawingRef: input.workingDrawingRef,
  };
}

/** Checklist templates per inspection category. */
export const INSPECTION_TEMPLATES: Record<string, string[]> = {
  structural: [
    'Foundation dimensions match working drawings',
    'Reinforcement bar size and spacing correct',
    'Ring beam reinforcement continuous',
    'Concrete cover maintained',
    'Wall thickness 230mm (double skin) verified',
    'DPC installed at correct height',
    'Lintel bearing adequate (≥200mm)',
    'Roof truss connections secure',
  ],
  mep: [
    'Conduit routing matches electrical layout',
    'Pipe sizing matches plumbing schedule',
    'DB board positioned per drawings',
    'Pressure test passed (60 min / 1.5 bar)',
    'Earthing system installed',
    'Hot water geyser location correct',
    'Drain falls meet SANS 10400-P',
    'Ventilation openings per SANS 10400-O',
  ],
  roof: [
    'Truss spacing per structural drawings',
    'Purlin gauge matches specification',
    'Roof sheet fixing pattern correct',
    'Ridge cap and flashings installed',
    'Gutter and downpipe connected',
    'Roof structure load capacity verified',
    'Timber treatment certificate available',
    'Waterproofing membrane intact',
  ],
  final: [
    'All snag items rectified',
    'Waste removed from site',
    'Lien waivers collected from all trades',
    'Warranty certificates received',
    'As-built drawings prepared',
    'Final account prepared',
    'Keys and access devices handed over',
    'Client walkthrough completed',
  ],
};

export function checklistTemplateFor(category: string): string[] {
  return INSPECTION_TEMPLATES[category] ?? INSPECTION_TEMPLATES.structural;
}
