// WS6 AI type definitions — ParsedBrief for the deterministic brief parser.
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
