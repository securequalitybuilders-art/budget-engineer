/**
 * C1 Resource Hub Discovery engine.
 * Builds the Resource Hub List from the Budget Engineered BOQ + rate catalogue,
 * derives the Demand Radar (deterministic regional demand), and locks the
 * SADC Market Price Index for 30 days. Local-first, no network.
 */
import type {
  ResourceRecord,
  DemandRadarReport,
  DemandRadarEntry,
} from '@/domain/greenflag';
import type { BoqResult } from '@/adapters/designToBoq';
import type { Rate } from '@/types';

export const RESOURCE_LOCK_DAYS = 30;

export interface HubBuildOptions {
  projectId?: string;
  region?: string;
  lockedDays?: number;
  now?: Date;
}

export interface HubBuildResult {
  resources: ResourceRecord[];
  demandRadar: DemandRadarReport;
  lockedUntil: string;
}

const TRADE_BY_MATERIAL: Array<[RegExp, string]> = [
  [/cement|concrete/i, 'Cement & Concrete'],
  [/brick|block|masonry/i, 'Brick & Block'],
  [/steel|rebar|reinforc/i, 'Steel & Reinforcement'],
  [/timber|roof|truss/i, 'Timber & Roofing'],
  [/paint|plaster|tile/i, 'Finishes'],
  [/window|glass/i, 'Fenestration'],
  [/door/i, 'Doors & Ironmongery'],
  [/solar|electrical/i, 'Electrical & Solar'],
  [/plumb|pipe|sanitary/i, 'Plumbing & Sanitary'],
];

export function tradeForDescription(description: string): string {
  for (const [pattern, trade] of TRADE_BY_MATERIAL) {
    if (pattern.test(description)) return trade;
  }
  return 'General Materials';
}

/** Deterministic FNV-1a hash (same algorithm as priceIndex.ts) */
export function hashStr(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Build the C1 hub: resource records derived from the BOQ material lines +
 * rate catalogue, a deterministic demand radar, and the 30-day market lock.
 */
export function buildResourceHub(
  boq: BoqResult | null,
  rates: Rate[],
  opts: HubBuildOptions = {},
): HubBuildResult {
  const now = opts.now ?? new Date();
  const lockedUntil = new Date(now.getTime() + (opts.lockedDays ?? RESOURCE_LOCK_DAYS) * 86400000)
    .toISOString()
    .slice(0, 10);
  const region = opts.region ?? 'zimbabwe';
  const projectId = opts.projectId ?? 'local';
  const resources: ResourceRecord[] = [];

  if (boq) {
    boq.items.forEach((item, idx) => {
      const desc = item.description ?? `Material ${idx + 1}`;
      const rateCents = Math.round(item.rate * 100);
      if (!desc || rateCents <= 0) return;
      resources.push({
        id: `res-${projectId}-${idx}`,
        projectId,
        name: desc,
        category: 'material',
        trade: tradeForDescription(desc),
        verified: (hashStr(`${projectId}:${desc}`) % 10) < 7,
        rating: 4.0 + (hashStr(desc) % 10) / 10,
        distanceKm: 2 + (hashStr(desc) % 30),
        baseRateCents: rateCents,
        unit: item.unit ?? 'each',
        region,
        source: 'rag',
        lockedUntil,
        createdAt: now.toISOString(),
      });
    });
  }

  for (const rate of rates.slice(0, 12)) {
    resources.push({
      id: `res-${projectId}-rate-${rate.id}`,
      projectId,
      name: rate.description,
      category: 'material',
      trade: tradeForDescription(rate.description),
      verified: true,
      rating: 4.5,
      distanceKm: 5 + (hashStr(rate.id) % 25),
      baseRateCents: rate.baseRateCents,
      unit: rate.unit,
      region: rate.region ?? region,
      source: 'market-index',
      lockedUntil,
      createdAt: now.toISOString(),
    });
  }

  const demandRadar = buildDemandRadar(now, region, lockedUntil);
  return { resources, demandRadar, lockedUntil };
}

/**
 * Deterministic Demand Radar: regional forward demand by material for the
 * current + next quarter. Locked prices match the market index for 30 days.
 */
export function buildDemandRadar(now: Date, region: string, lockedUntil?: string): DemandRadarReport {
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  const nextQuarter = `Q${((Math.floor(now.getMonth() / 3) + 1) % 4) + 1} ${now.getFullYear() + (Math.floor(now.getMonth() / 3) === 3 ? 1 : 0)}`;
  const base = hashStr(`${region}:${quarter}`);
  const entries: DemandRadarEntry[] = [
    {
      region: region === 'zimbabwe' ? 'Gweru Region' : 'Gauteng',
      quarter,
      material: 'Bricks',
      unit: 'units',
      demandUnits: 400000 + (base % 200000),
      activeProjects: 10 + (base % 5),
      indexPriceCents: 25 + (base % 5),
    },
    {
      region: region === 'zimbabwe' ? 'Gweru Region' : 'Gauteng',
      quarter: nextQuarter,
      material: 'Bricks',
      unit: 'units',
      demandUnits: 500000 + (base % 100000),
      activeProjects: 12 + (base % 4),
      indexPriceCents: 25 + (base % 5),
    },
    {
      region: region === 'zimbabwe' ? 'Harare Metro' : 'Cape Town',
      quarter,
      material: 'Cement 50kg',
      unit: 'bags',
      demandUnits: 8000 + (base % 4000),
      activeProjects: 15 + (base % 6),
      indexPriceCents: 1850 + (base % 100),
    },
    {
      region: region === 'zimbabwe' ? 'Bulawayo' : 'Durban',
      quarter,
      material: 'Roof Sheets',
      unit: 'm2',
      demandUnits: 15000 + (base % 5000),
      activeProjects: 9 + (base % 3),
      indexPriceCents: 1200 + (base % 60),
    },
  ];
  return { entries, generatedAt: now.toISOString(), lockedUntil: lockedUntil ?? '' };
}

/** 30-day lock helpers used by the stage components. */
export function lockedUntilFor(now: Date = new Date()): string {
  return new Date(now.getTime() + RESOURCE_LOCK_DAYS * 86400000).toISOString().slice(0, 10);
}

export function isLocked(lockedUntil: string, now: Date = new Date()): boolean {
  return now.toISOString().slice(0, 10) <= lockedUntil;
}