import { ParsedBrief } from './ai-types';
import { parseBrief } from './brief-parser';
import { ziqsSmmSystem, citeByLaws } from './prompts/ziqs_smm_prompt';

export function coerceBrief(obj: unknown, raw: string): ParsedBrief {
  const o = (obj ?? {}) as Record<string, unknown>;
  const int = (v: unknown, def: number, min: number, max: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def;
  };
  const str = (v: unknown, def: string) => (typeof v === 'string' && v.trim() ? v.trim() : def);
  const fallback = parseBrief(raw);
  return {
    buildingType: str(o.buildingType, fallback.buildingType),
    bedrooms: int(o.bedrooms, fallback.bedrooms, 0, 20),
    bathrooms: int(o.bathrooms, fallback.bathrooms, 0, 20),
    floors: int(o.floors, fallback.floors, 1, 6),
    approxAreaM2: int(o.approxAreaM2, fallback.approxAreaM2, 20, 5000),
    budget: o.budget != null && Number.isFinite(Number(o.budget)) ? Number(o.budget) : fallback.budget,
    features: Array.isArray(o.features) ? o.features.map(String).slice(0, 20) : fallback.features,
    regulatoryNotes: Array.isArray(o.regulatoryNotes) ? o.regulatoryNotes.map(String).slice(0, 10) : undefined,
    raw,
  };
}

export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('no JSON object in model output');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
  }
  throw new Error('unbalanced JSON in model output');
}

export const BRIEF_PROMPT = (brief: string) =>
  `${ziqsSmmSystem()}
You are an architectural brief parser. Read the brief and reply with ONLY a JSON object, no prose.
Schema: {"buildingType":string,"bedrooms":int,"bathrooms":int,"floors":int,"approxAreaM2":int,"budget":int|null,"features":string[],"regulatoryNotes":string[]}
regulatoryNotes: for every item in the brief that touches a regulated matter (fire resistance, boundary separation, party wall, brick strength, concrete mix, excavation, scaffolding, masonry), add a citation string in the format ${citeByLaws({ chapter: '4', clause: '12(a)', grade: 'A', rating: '2hrs' })} or a ZIQS SMM measurement note (example: "net volume = length × width × depth — ZIQS SMM excavation, net, m³"). Never invent a clause that is not in the regulations; when a requirement is not found, omit it.
Brief: "${brief}"
JSON:`;
