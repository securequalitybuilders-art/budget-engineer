import { ParsedBrief } from './ai-types';
import { citeByLaws } from './prompts/ziqs_smm_prompt';

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

  const residential = buildingType === 'house' || buildingType === 'apartment';
  const regulatoryNotes: string[] = [];
  regulatoryNotes.push(`${citeByLaws({ chapter: '1', clause: '1.1' })} Habitable rooms require a minimum ceiling height of 2.4m measured finished floor to finished ceiling.`);
  regulatoryNotes.push(`${citeByLaws({ chapter: '1', clause: '1.2' })} Every habitable room requires natural ventilation through openable windows totalling at least 5% of the floor area.`);
  if (residential) {
    regulatoryNotes.push(`${citeByLaws({ chapter: '2', clause: '2.1' })} Travel distance from any point in a room to the nearest exit must not exceed 18m in a residential occupancy.`);
  }
  if (floors >= 2) {
    regulatoryNotes.push(`${citeByLaws({ chapter: '2', clause: '2.4' })} Party walls between attached dwellings require a fire resistance of at least 60 minutes.`);
    regulatoryNotes.push(`${citeByLaws({ chapter: '6', clause: '6.1' })} Staircases serving a habitable building require a minimum clear width of 900mm.`);
  }
  if (bathrooms >= 1) {
    regulatoryNotes.push(`${citeByLaws({ chapter: '7', clause: '7.1' })} Every dwelling must be provided with at least one water closet, a wash basin, and a bath or shower.`);
  }

  return { buildingType, bedrooms, bathrooms, floors, approxAreaM2, budget, features, raw: text, regulatoryNotes };
}

export async function parseBriefAsync(text: string): Promise<ParsedBrief> {
  return parseBrief(text);
}
