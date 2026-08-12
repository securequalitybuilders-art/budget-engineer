// WS6 AI type definitions — ParsedBrief for the deterministic brief parser.

export type AiRemoteProvider = 'gemini' | 'groq' | 'github-models' | 'openrouter';
export type AiEngine = 'local-rules' | 'webllm' | AiRemoteProvider;

export interface ParsedBrief {
  buildingType: string;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  approxAreaM2: number;
  budget?: number;
  features: string[];
  regulatoryNotes?: string[];
  raw: string;
}
