import { getTypology } from '@/engine/typology-kb';

export type DreamPhase = 'dream' | 'plan' | 'pick' | 'build' | 'move-in';

export interface JourneyStepDef {
  id: string;
  phase: DreamPhase;
  title: string;
  description: string;
}

export const DREAM_PHASES: { id: DreamPhase; label: string }[] = [
  { id: 'dream', label: 'Dream' },
  { id: 'plan', label: 'Plan' },
  { id: 'pick', label: 'Pick' },
  { id: 'build', label: 'Build' },
  { id: 'move-in', label: 'Move In' },
];

export const JOURNEY_STEPS: JourneyStepDef[] = [
  { id: 'dream-welcome', phase: 'dream', title: 'Who is building?', description: 'Tell us who you are so we can tailor the experience.' },
  { id: 'dream-brief', phase: 'dream', title: 'Dream Brief', description: 'Describe your building in plain English — no jargon needed.' },
  { id: 'dream-funding', phase: 'dream', title: 'Funding Check', description: 'A quick look at how your build will be funded.' },
  { id: 'dream-feasibility', phase: 'dream', title: 'Feasibility Go / No-Go', description: 'An early ROM check of your budget against the build.' },
  { id: 'dream-activate', phase: 'dream', title: 'Activate', description: 'Pick your plan — Red Pen or Guardian.' },
  { id: 'plan-sketches', phase: 'plan', title: 'Review 3 AI sketches', description: 'Choose the concept that feels like home.' },
  { id: 'plan-finishes', phase: 'plan', title: 'Pick finishes', description: 'Choose finishes with clear price tags.' },
  { id: 'plan-lock', phase: 'plan', title: 'Approve Build Plan', description: 'Lock the total, contingency, and milestones in one click.' },
  { id: 'pick-contractor', phase: 'pick', title: 'Your matched contractor', description: 'Why this contractor? The match rationale is shown, not just a profile.' },
  { id: 'pick-materials', phase: 'pick', title: 'Materials & team', description: 'Full transparency on materials, locked for 30 days.' },
  { id: 'build-milestones', phase: 'build', title: 'Your 3 milestones', description: 'Foundation & Bones, Wall Plate & Shell, Finishes & Keys.' },
  { id: 'move-in-handover', phase: 'move-in', title: 'Move In', description: 'Contingency spend-down, handover sign-off, and your review.' },
];

export const FUNDING_SOURCES = [
  { value: 'personal-savings', label: 'Personal savings' },
  { value: 'bank-loan', label: 'Bank construction loan' },
  { value: 'diaspora', label: 'Diaspora remittances' },
  { value: 'employer', label: 'Employer / salary advance' },
  { value: 'ngo', label: 'Institution / NGO grant' },
] as const;

export type FundingSource = (typeof FUNDING_SOURCES)[number]['value'];

const ROM_PER_M2_CENTS: Record<string, number> = {
  zimbabwe: 75_000,
  'south-africa': 95_000,
  zambia: 72_000,
  botswana: 88_000,
  other: 80_000,
};

function typologyFor(buildingType: string) {
  return getTypology(buildingType) ?? getTypology('house-residential');
}

export function estimateGrossAreaM2(buildingType: string): number {
  const t = typologyFor(buildingType);
  const floorArea = (t?.defaultProgram ?? []).reduce((sum, p) => sum + p.areaM2 * p.count, 0);
  return Math.round(floorArea * 1.12);
}

export function romPerM2Cents(region: string): number {
  return ROM_PER_M2_CENTS[region] ?? ROM_PER_M2_CENTS.other;
}

export function romEstimateForType(buildingType: string, region: string): {
  grossAreaM2: number;
  romBestCents: number;
  romLowCents: number;
  romHighCents: number;
  perM2Cents: number;
} {
  const grossAreaM2 = estimateGrossAreaM2(buildingType);
  const perM2Cents = romPerM2Cents(region);
  const romBestCents = Math.round(grossAreaM2 * perM2Cents);
  return {
    grossAreaM2,
    romBestCents,
    romLowCents: Math.round(romBestCents * 0.8),
    romHighCents: Math.round(romBestCents * 1.2),
    perM2Cents,
  };
}

export interface FeasibilityVerdict {
  verdict: 'go' | 'cautious' | 'no-go';
  romBestCents: number;
  romLowCents: number;
  romHighCents: number;
  budgetCents: number;
  gapCents: number;
  coveragePct: number;
  reason: string;
}

export function feasibilityVerdict(input: {
  buildingType: string;
  budgetCents: number;
  region: string;
}): FeasibilityVerdict {
  const rom = romEstimateForType(input.buildingType, input.region);
  const coveragePct = input.budgetCents > 0 ? Math.round((input.budgetCents / rom.romBestCents) * 100) : 0;
  const gapCents = Math.max(0, rom.romBestCents - input.budgetCents);
  let verdict: FeasibilityVerdict['verdict'];
  let reason: string;
  if (input.budgetCents <= 0) {
    verdict = 'cautious';
    reason = 'Add a budget to unlock the ROM check.';
  } else if (coveragePct >= 110) {
    verdict = 'go';
    reason = `Your budget covers ${coveragePct}% of the early ROM estimate — comfortably in range.`;
  } else if (coveragePct >= 85) {
    verdict = 'cautious';
    reason = `Your budget covers ${coveragePct}% of the ROM estimate (${formatMoney(rom.romBestCents)}). A small funding top-up may be needed.`;
  } else {
    verdict = 'no-go';
    reason = `Your budget covers only ${coveragePct}% of the ROM estimate (${formatMoney(rom.romBestCents)}). ${formatMoney(gapCents)} gap.`;
  }
  return { verdict, romBestCents: rom.romBestCents, romLowCents: rom.romLowCents, romHighCents: rom.romHighCents, budgetCents: input.budgetCents, gapCents, coveragePct, reason };
}

export interface ConceptOption {
  id: string;
  name: string;
  storeys: number;
  grossAreaM2: number;
  programmeSummary: string[];
  highlights: string[];
  budgetFitLabel: string;
}

function programmeSummary(buildingType: string): string[] {
  const t = typologyFor(buildingType);
  const names = new Map<string, number>();
  for (const p of t?.defaultProgram ?? []) {
    names.set(p.name, (names.get(p.name) ?? 0) + p.count);
  }
  return [...names.entries()].slice(0, 6).map(([name, count]) => `${count > 1 ? count + '× ' : ''}${name}`);
}

function highlightsFor(buildingType: string): string[] {
  const t = typologyFor(buildingType);
  const out: string[] = [];
  if (t?.structure?.wallSystem) out.push(`${t.structure.wallSystem} walls`);
  if (t?.structure?.roofSystem) out.push(`${t.structure.roofSystem} roof`);
  if (t?.structure?.foundation) out.push(`${t.structure.foundation} foundation`);
  if (t?.fireResistanceMin) out.push(`${t.fireResistanceMin}-min fire rating`);
  if (t?.defaultStoreys && t.defaultStoreys > 1) out.push(`${t.defaultStoreys} storeys`);
  return out;
}

export function buildConceptOptions(buildingType: string): ConceptOption[] {
  const t = typologyFor(buildingType);
  const base = estimateGrossAreaM2(buildingType);
  const sizes = [
    { id: 'compact', name: 'Compact', factor: 0.85, label: 'Tight budget fit' },
    { id: 'core', name: 'Core', factor: 1.0, label: 'Best value' },
    { id: 'extended', name: 'Extended', factor: 1.2, label: 'Room to grow' },
  ];
  return sizes.map((s) => ({
    id: s.id,
    name: s.name,
    storeys: t?.defaultStoreys ?? 1,
    grossAreaM2: Math.round(base * s.factor),
    programmeSummary: programmeSummary(buildingType),
    highlights: highlightsFor(buildingType),
    budgetFitLabel: s.label,
  }));
}

export interface FinishOption {
  id: string;
  name: string;
  detail: string;
  priceCents: number;
  unit: string;
}

export const FINISH_CATALOG: Record<'floor' | 'walls' | 'roof' | 'paint', FinishOption[]> = {
  floor: [
    { id: 'tile-600', name: 'Porcelain tile 600×600', detail: 'Durable, easy to clean', priceCents: 18_00, unit: '/ m²' },
    { id: 'tile-300', name: 'Vitrified tile 300×300', detail: 'Budget-friendly classic', priceCents: 12_00, unit: '/ m²' },
    { id: 'wood-laminate', name: 'Laminate wood', detail: 'Warm, modern feel', priceCents: 24_00, unit: '/ m²' },
    { id: 'polished-concrete', name: 'Polished concrete', detail: 'Industrial finish', priceCents: 15_00, unit: '/ m²' },
  ],
  walls: [
    { id: 'plaster-paint', name: 'Plaster & paint', detail: 'Standard interior finish', priceCents: 9_00, unit: '/ m²' },
    { id: 'textured', name: 'Textured plaster', detail: 'Stone-cladding effect', priceCents: 14_00, unit: '/ m²' },
    { id: 'exposed-brick', name: 'Exposed brick', detail: 'Modern accent walls', priceCents: 6_00, unit: '/ m²' },
    { id: 'tiled-walls', name: 'Tiled walls', detail: 'Bathrooms & kitchens', priceCents: 16_00, unit: '/ m²' },
  ],
  roof: [
    { id: 'clay-tile', name: 'Clay tile', detail: 'Classic Zimbabwean look', priceCents: 32_00, unit: '/ m²' },
    { id: 'ibc', name: 'IBS sheet', detail: 'Lightweight, low-maintenance', priceCents: 14_00, unit: '/ m²' },
    { id: 'colorbond', name: 'Colorbond steel', detail: 'Sleek, long-lasting', priceCents: 22_00, unit: '/ m²' },
  ],
  paint: [
    { id: 'matt-emulsion', name: 'Matt emulsion', detail: 'Soft, even finish', priceCents: 5_00, unit: '/ m²' },
    { id: 'satin', name: 'Satin sheen', detail: 'Wipeable, hard-wearing', priceCents: 7_00, unit: '/ m²' },
    { id: 'feature', name: 'Feature wall accent', detail: 'Statement colour', priceCents: 8_00, unit: '/ m²' },
  ],
};

export function finishLinePrice(finish: FinishOption, areaM2: number): number {
  return Math.round(finish.priceCents * areaM2);
}

export interface MilestoneSplit {
  id: string;
  label: string;
  pct: number;
  amountCents: number;
  scope: string;
}

export interface BuildPlan {
  baseTotalCents: number;
  contingencyPct: number;
  contingencyCents: number;
  grandTotalCents: number;
  milestones: MilestoneSplit[];
}

export function buildMilestoneSplit(totalCents: number): MilestoneSplit[] {
  const defs = [
    { id: 'm1', label: 'M1 — Foundation & Bones', pct: 0.35, scope: 'Foundation, slab, walls to wall-plate level' },
    { id: 'm2', label: 'M2 — Wall Plate & Shell', pct: 0.4, scope: 'Ring beam, roof, windows/doors, M&E rough-in' },
    { id: 'm3', label: 'M3 — Finishes & Keys', pct: 0.25, scope: 'Plaster, tile, paint, fittings, snagging' },
  ];
  let running = 0;
  return defs.map((d, i) => {
    const amountCents = i === defs.length - 1 ? totalCents - running : Math.round(totalCents * d.pct);
    running += amountCents;
    return { id: d.id, label: d.label, pct: Math.round(d.pct * 100), amountCents, scope: d.scope };
  });
}

export function buildBuildPlan(baseTotalCents: number, contingencyPct = 0.09): BuildPlan {
  const contingencyCents = Math.round(baseTotalCents * contingencyPct);
  return {
    baseTotalCents,
    contingencyPct: Math.round(contingencyPct * 100),
    contingencyCents,
    grandTotalCents: baseTotalCents + contingencyCents,
    milestones: buildMilestoneSplit(baseTotalCents),
  };
}

export interface ContractorMatch {
  id: string;
  name: string;
  role: string;
  proximityKm: number;
  specialization: string;
  availability: string;
  wipaaHealth: number;
  why: string[];
  isRecommended?: boolean;
}

export function contractorMatch(buildingType: string): ContractorMatch[] {
  const specialisation = buildingType === 'house' ? 'Residential construction' : 'General building works';
  return [
    {
      id: 'kudakwashe',
      name: 'Kudakwashe Chirinda',
      role: 'Registered builder · ACZ',
      proximityKm: 8,
      specialization: specialisation,
      availability: 'Starts next month',
      wipaaHealth: 94,
      why: [
        `Only 8km from your site — lower transport cost and faster daily visits.`,
        `Specialises in ${specialisation.toLowerCase()} — ${12} similar completed builds.`,
        `Healthy pipeline (WIPAA health 94%) — on-time, on-budget on current jobs.`,
      ],
      isRecommended: true,
    },
    {
      id: 'tendai',
      name: 'Tendai Moyo',
      role: 'Registered builder · ACZ',
      proximityKm: 14,
      specialization: specialisation,
      availability: 'Starts in 2 months',
      wipaaHealth: 88,
      why: ['Great finishes reputation.', 'Available from next quarter.'],
    },
    {
      id: 'ruvarashe',
      name: 'Ruvimbo Marufu',
      role: 'Registered builder · ACZ',
      proximityKm: 21,
      specialization: specialisation,
      availability: 'Starts in 3 months',
      wipaaHealth: 91,
      why: ['Strong structural track record.', 'Slightly further from site (21km).'],
    },
  ];
}

export interface MaterialLine {
  id: string;
  name: string;
  supplier: string;
  amountCents: number;
  note: string;
}

export const MATERIALS_LINES: MaterialLine[] = [
  { id: 'bricks', name: 'Bricks (pallet)', supplier: 'Willdale', amountCents: 420_000, note: 'Locked for 30 days' },
  { id: 'cement', name: 'Cement (bulk)', supplier: 'Sino Zimbabwe', amountCents: 380_000, note: 'Locked for 30 days' },
  { id: 'steel', name: 'Steel rebar 12mm', supplier: 'Zimbabwe Steel', amountCents: 240_000, note: 'Price match at dispatch' },
  { id: 'roof', name: 'Roof sheeting', supplier: 'BSR Roofing', amountCents: 190_000, note: 'Including trusses' },
  { id: 'paint', name: 'Interior paint', supplier: 'Plascon', amountCents: 85_000, note: 'Full house spec' },
  { id: 'fittings', name: 'Doors, windows & fittings', supplier: 'Mega Fenestration', amountCents: 130_000, note: 'Standard SADC sizes' },
];

export interface SpendDownOption {
  id: string;
  name: string;
  priceCents: number;
  tag: string;
  source: 'ai' | 'ops';
}

export const SPEND_DOWN_OPTIONS: SpendDownOption[] = [
  { id: 'solar-geyser', name: 'Solar geyser', priceCents: 280_000, tag: 'AI: roof orientation optimal', source: 'ai' },
  { id: 'borehole', name: 'Borehole', priceCents: 300_000, tag: "Tafadzwa's Pick · Gweru rationing 2027", source: 'ops' },
  { id: 'premium-floor', name: 'Premium floor upgrade', priceCents: 150_000, tag: 'Popular upgrade', source: 'ops' },
  { id: 'refund', name: 'Refund the rest', priceCents: 0, tag: 'Keep it simple', source: 'ops' },
];

export function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export function rateBand(rating: number): { label: string; color: string } {
  if (rating >= 5) return { label: 'Excellent', color: 'text-green-400' };
  if (rating >= 4) return { label: 'Good', color: 'text-emerald-400' };
  if (rating >= 3) return { label: 'Fair', color: 'text-amber-400' };
  return { label: 'Poor', color: 'text-red-400' };
}
