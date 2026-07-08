// ============================================================================
// Local AI brief → structured design schema.
// No paid API. Runs offline. The interface (parseBrief) is the same one a
// WebLLM / transformers.js backend would implement, so a real local model can
// be dropped in later without changing callers.
// ============================================================================

export interface ParsedBrief {
  buildingType: string;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  approxAreaM2: number;
  budget?: number;
  features: string[];
  raw: string;
}

const num = (s: string, re: RegExp): number | undefined => {
  const m = s.match(re);
  return m ? Number(m[1]) : undefined;
};

// written numbers one..ten for "two storey", "three bedroom", etc.
const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  single: 1, double: 2, triple: 3,
};

/** Match a count expressed as a digit OR a written word before a keyword. */
const count = (s: string, keyword: string): number | undefined => {
  const words = Object.keys(WORD_NUM).join('|');
  const re = new RegExp(`(\\d+|${words})\\s*(?:${keyword})`);
  const m = s.match(re);
  if (!m) return undefined;
  const tok = m[1];
  return /^\d+$/.test(tok) ? Number(tok) : WORD_NUM[tok];
};

/**
 * Deterministic local parser. Extracts structured fields from a natural
 * language brief using robust regex heuristics.
 */
export function parseBrief(text: string): ParsedBrief {
  const t = text.toLowerCase();

  const bedrooms = count(t, 'bed(?:room)?s?') ?? 2;
  const bathrooms = count(t, 'bath(?:room)?s?') ?? 1;
  const floors = count(t, 'storey|storeys|story|stories|floors?|levels?') ?? 1;
  const approxAreaM2 = num(t, /(\d+)\s*(?:m2|m²|sqm|square\s*met)/) ?? (bedrooms * 35 + 60);
  const budget = num(t, /\$?\s*([\d,]{4,})/)
    ? Number((t.match(/\$?\s*([\d,]{4,})/)![1]).replace(/,/g, ''))
    : undefined;

  let buildingType = 'house';
  if (/office|commercial/.test(t)) buildingType = 'office';
  else if (/apartment|flat|unit/.test(t)) buildingType = 'apartment';
  else if (/school|classroom/.test(t)) buildingType = 'school';
  else if (/clinic|hospital|health/.test(t)) buildingType = 'clinic';

  const features: string[] = [];
  for (const [kw, label] of [
    ['garage', 'garage'], ['solar', 'solar'], ['veranda', 'veranda'],
    ['balcony', 'balcony'], ['pool', 'pool'], ['open plan', 'open-plan'],
    ['kitchen', 'kitchen'], ['lounge', 'lounge'], ['study', 'study'],
  ] as const) {
    if (t.includes(kw)) features.push(label);
  }

  return { buildingType, bedrooms, bathrooms, floors, approxAreaM2, budget, features, raw: text };
}

/** Async wrapper matching a future LLM backend signature. */
export async function parseBriefAsync(text: string): Promise<ParsedBrief> {
  // A WebLLM backend would await model.generate(...) here and JSON.parse it.
  return parseBrief(text);
}
