type FaçadeOrientation = 'front' | 'rear' | 'left' | 'right';

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) || 1;
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, s | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(context: string): () => number {
  const seed = hashString(context);
  return mulberry32(seed);
}

export function shouldFeatureTrigger(
  likelihood: number,
  context: string,
): boolean {
  if (likelihood <= 0) return false;
  if (likelihood >= 1) return true;
  return createSeededRandom(context)() < likelihood;
}

export function deterministicFloorVariant(
  floorIndex: number,
  totalFloors: number,
  baseLikelihood: number,
  contextSeed: string,
): boolean {
  const t = totalFloors > 1 ? floorIndex / (totalFloors - 1) : 0;
  const floorFactor = 1 - t * 0.4;
  const adjusted = baseLikelihood * floorFactor;
  return shouldFeatureTrigger(adjusted, contextSeed + '-floor-' + floorIndex);
}

export function deterministicBaySelector(
  bayIndex: number,
  totalBays: number,
  likelihood: number,
  contextSeed: string,
): boolean {
  return shouldFeatureTrigger(likelihood, contextSeed + '-bay-' + bayIndex + '-of-' + totalBays);
}

export function buildDeterministicSeed(
  designId: string,
  planId: string,
  optionSeed: number | string,
  orientation: FaçadeOrientation,
  typology: string,
  floorRole: string,
): string {
  return [designId, planId, String(optionSeed), orientation, typology, floorRole].join('::');
}
