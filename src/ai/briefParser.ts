import { parsedBriefSchema, type ParsedBrief } from './schema';
import { toCents } from '@/lib/utils';

/**
 * Local, deterministic brief parser.
 * Extracts structured design parameters from a plain-language brief.
 * This is the offline-first core; a larger local LLM can be layered on top
 * for richer reasoning without changing the interface.
 */

type Region = 'zimbabwe' | 'south-africa' | 'zambia' | 'botswana' | 'other';

const CITY_TO_REGION: [string, Region][] = [
  ['harare', 'zimbabwe'],
  ['bulawayo', 'zimbabwe'],
  ['chitungwiza', 'zimbabwe'],
  ['mutare', 'zimbabwe'],
  ['gweru', 'zimbabwe'],
  ['kwekwe', 'zimbabwe'],
  ['kadoma', 'zimbabwe'],
  ['masvingo', 'zimbabwe'],
  ['bindura', 'zimbabwe'],
  ['chinhoyi', 'zimbabwe'],
  ['marondera', 'zimbabwe'],
  ['chegutu', 'zimbabwe'],
  ['karoi', 'zimbabwe'],
  ['kariba', 'zimbabwe'],
  ['hwange', 'zimbabwe'],
  ['victoria falls', 'zimbabwe'],
  ['rusape', 'zimbabwe'],
  ['chiredzi', 'zimbabwe'],
  ['chipinge', 'zimbabwe'],
  ['zvishavane', 'zimbabwe'],
  ['shurugwi', 'zimbabwe'],
  ['gwanda', 'zimbabwe'],
  ['plumtree', 'zimbabwe'],
  ['beitbridge', 'zimbabwe'],
  ['chirundu', 'zimbabwe'],
  ['cape town', 'south-africa'],
  ['johannesburg', 'south-africa'],
  ['pretoria', 'south-africa'],
  ['durban', 'south-africa'],
  ['port elizabeth', 'south-africa'],
  ['bloemfontein', 'south-africa'],
  ['east london', 'south-africa'],
  ['nelspruit', 'south-africa'],
  ['polokwane', 'south-africa'],
  ['rustenburg', 'south-africa'],
  ['kimberley', 'south-africa'],
  ['richards bay', 'south-africa'],
  ['pietermaritzburg', 'south-africa'],
  ['vereeniging', 'south-africa'],
  ['welkom', 'south-africa'],
  ['upington', 'south-africa'],
  ['george', 'south-africa'],
  ['stellenbosch', 'south-africa'],
  ['soweto', 'south-africa'],
  ['lusaka', 'zambia'],
  ['kitwe', 'zambia'],
  ['ndola', 'zambia'],
  ['livingstone', 'zambia'],
  ['mufulira', 'zambia'],
  ['chingola', 'zambia'],
  ['kabwe', 'zambia'],
  ['chipata', 'zambia'],
  ['kasama', 'zambia'],
  ['solwezi', 'zambia'],
  ['mongu', 'zambia'],
  ['mansa', 'zambia'],
  ['choma', 'zambia'],
  ['mazabuka', 'zambia'],
  ['kafue', 'zambia'],
  ['luanshya', 'zambia'],
  ['gaborone', 'botswana'],
  ['francistown', 'botswana'],
  ['molepolole', 'botswana'],
  ['maun', 'botswana'],
  ['serowe', 'botswana'],
  ['kanye', 'botswana'],
  ['selibe phikwe', 'botswana'],
  ['kasane', 'botswana'],
  ['ghantsi', 'botswana'],
  ['tshabong', 'botswana'],
  ['lentsweletau', 'botswana'],
  ['ramotswa', 'botswana'],
  ['mochudi', 'botswana'],
  ['palapye', 'botswana'],
]

const COUNTRY_TO_REGION: [string, Region][] = [
  ['zimbabwe', 'zimbabwe'],
  ['zw', 'zimbabwe'],
  ['zim', 'zimbabwe'],
  ['south africa', 'south-africa'],
  ['za', 'south-africa'],
  ['rsa', 'south-africa'],
  ['zambia', 'zambia'],
  ['zm', 'zambia'],
  ['botswana', 'botswana'],
  ['bw', 'botswana'],
  ['bot', 'botswana'],
]

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9.,\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractNumber(text: string, regex: RegExp): number | undefined {
  const match = text.match(regex);
  if (!match) return undefined;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

function extractBuildingType(text: string): ParsedBrief['buildingType'] {
  if (/\b(commercial|shop|retail|store|office\s+building)\b/.test(text)) return 'commercial';
  if (/\b(apartment|flat|unit|condo)\b/.test(text)) return 'apartment';
  if (/\b(townhouse|town\s+house|row\s+house)\b/.test(text)) return 'townhouse';
  if (/\b(school|classroom|education|university)\b/.test(text)) return 'school';
  if (/\b(clinic|hospital|health\s+centre|health\s+center)\b/.test(text)) return 'clinic';
  if (/\b(office|workplace)\b/.test(text)) return 'office';
  return 'house';
}

function extractBudget(text: string): number | undefined {
  // Match $45,000 or 45 000 USD or $45000
  const match = text.match(/\$?\s*([\d,\s]+(?:\.\d{1,2})?)\s*(?:USD|ZWG|\$)?/);
  if (!match) return undefined;
  const value = parseFloat(match[1].replace(/[,\s]/g, ''));
  if (!Number.isFinite(value)) return undefined;
  return toCents(value);
}

function extractLocation(text: string, fallback: string): string {
  const sorted = [...CITY_TO_REGION].sort((a, b) => b[0].length - a[0].length)
  for (const [city, region] of sorted) {
    if (text.includes(city)) return region
  }
  const sortedCountry = [...COUNTRY_TO_REGION].sort((a, b) => b[0].length - a[0].length)
  for (const [country, region] of sortedCountry) {
    if (text.includes(country)) return region
  }
  return fallback
}

function extractFeatures(text: string): string[] {
  const features: string[] = [];
  const featureMap: Record<string, string> = {
    veranda: 'veranda',
    porch: 'porch',
    balcony: 'balcony',
    garage: 'garage',
    carport: 'carport',
    garden: 'garden',
    'open plan': 'open-plan',
    'open-plan': 'open-plan',
    ensuite: 'ensuite',
    'en-suite': 'ensuite',
    kitchen: 'kitchen',
    store: 'store room',
    'store room': 'store room',
    solar: 'solar panels',
    'solar panel': 'solar panels',
  };
  for (const [keyword, feature] of Object.entries(featureMap)) {
    if (text.includes(keyword)) features.push(feature);
  }
  return [...new Set(features)];
}

function inferAreaM2(bedrooms: number, floors: number): number {
  // Standard Zimbabwe/SADC rule of thumb: 20–30 m² per bedroom + common area
  const base = Math.max(bedrooms, 2) * 22;
  const common = 40;
  return Math.round((base + common) * floors);
}

function inferBedrooms(text: string): number | undefined {
  const fromBed = extractNumber(text, /(\d+(?:\.\d+)?)\s*(?:-bedroom|bedroom|bed\b)/);
  if (fromBed !== undefined) return Math.round(fromBed);

  const fromRooms = extractNumber(text, /(\d+(?:\.\d+)?)\s*(?:-room|room\b)/);
  if (fromRooms !== undefined) return Math.max(1, Math.round(fromRooms) - 1);

  return undefined;
}

function inferBathrooms(bedrooms: number | undefined, text: string): number | undefined {
  const fromBath = extractNumber(text, /(\d+(?:\.\d+)?)\s*(?:bathroom|bath\b)/);
  if (fromBath !== undefined) return Math.round(fromBath);
  if (bedrooms !== undefined) return Math.max(1, Math.round(bedrooms * 0.75));
  return undefined;
}

function inferFloors(text: string): number {
  const fromStorey = extractNumber(text, /(\d+(?:\.\d+)?)\s*(?:-storey|storey|story|stories|floor\b)/);
  if (fromStorey !== undefined) return Math.max(1, Math.round(fromStorey));
  if (/\b(double\s+storey|two\s+storey|two\s+story|2\s+storey|2\s+story)\b/.test(text)) return 2;
  if (/\b(triple\s+storey|three\s+storey|three\s+story|3\s+storey|3\s+story)\b/.test(text)) return 3;
  return 1;
}

/**
 * Parse a user-written brief into a structured, validated schema.
 * Runs entirely in the browser; no network required.
 */
export function parseBrief(rawText: string, baseRegion = 'zimbabwe'): ParsedBrief {
  const text = normalize(rawText);

  const bedrooms = inferBedrooms(text);
  const floors = inferFloors(text);
  const areaM2 = extractNumber(text, /(\d+(?:\.\d+)?)\s*(?:sqm|m2|m²|square\s*m)/) ??
    (bedrooms ? inferAreaM2(bedrooms, floors) : undefined);
  const budgetCents = extractBudget(text);

  const result = {
    buildingType: extractBuildingType(text),
    floors,
    bedrooms,
    bathrooms: inferBathrooms(bedrooms, text),
    areaM2,
    budgetCents,
    location: extractLocation(text, baseRegion),
    standards: ['ZBC 1996'],
    features: extractFeatures(text),
    summary: `${rawText.slice(0, 80)}${rawText.length > 80 ? '...' : ''}`,
  };

  return parsedBriefSchema.parse(result);
}

