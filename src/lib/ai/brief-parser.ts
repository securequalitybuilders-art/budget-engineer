import { ParsedBrief } from './ai-types';

const num = (s: string, re: RegExp): number | undefined => {
  const m = s.match(re);
  return m ? Number(m[1]) : undefined;
};

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  single: 1, double: 2, triple: 3,
};

const count = (s: string, keyword: string): number | undefined => {
  const words = Object.keys(WORD_NUM).join('|');
  const re = new RegExp(`(\\d+|${words})\\s*(?:${keyword})`);
  const m = s.match(re);
  if (!m) return undefined;
  const tok = m[1];
  return /^\d+$/.test(tok) ? Number(tok) : WORD_NUM[tok];
};

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

export async function parseBriefAsync(text: string): Promise<ParsedBrief> {
  return parseBrief(text);
}
