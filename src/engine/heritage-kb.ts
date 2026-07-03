import type { HeritagePattern } from './tier1-types'

const PATTERNS: HeritagePattern[] = [
  {
    id: 'kraal',
    name: 'Kraal / Courtyard Homestead',
    keywords: ['kraal', 'homestead', 'enclosure', 'courtyard', 'cattle', 'rural', 'traditional', 'huts around'],
    culturalContext: 'The traditional Zimbabwean homestead centres around a shared courtyard (musasa/kraal) with circular huts arranged for extended family living. Central space for cooking, gathering, and livestock.',
    designImplications: [
      'Central courtyard as organising element',
      'Circular or semi-circular room arrangement',
      'Defined entry gate / threshold',
      'Outdoor cooking and gathering space',
    ],
  },
  {
    id: 'rondavel',
    name: 'Rondavel / Round Hut',
    keywords: ['rondavel', 'round hut', 'circular', 'thatched', 'cone-on-cylinder', 'traditional round'],
    culturalContext: 'The rondavel (circular hut with conical thatched roof) is the iconic Zimbabwean vernacular form. Historically built in daga (mud) or brick with thatch roofing.',
    designImplications: [
      'Circular plan forms for key rooms (e.g. lounge, main bedroom)',
      'Conical or domed roof profiles',
      'Thick walls for thermal mass (daga or brick)',
      'Deep eaves for shade and rain protection',
    ],
  },
  {
    id: 'veranda',
    name: 'Veranda / Varanda (Colonial-Zimbabwean)',
    keywords: ['veranda', 'varanda', 'porch', 'stoep', 'wraparound', 'eave deep', 'colonial', 'wide verandah', 'gallery'],
    culturalContext: 'The veranda (varanda in chiShona) was adopted during the colonial era and is now a defining feature of Zimbabwean architecture — a deep shaded outdoor room wrapping the house.',
    designImplications: [
      'Deep covered verandas on north and east facades',
      'Veranda as outdoor living room, not just circulation',
      'Columns at 2.0–2.5 m spacing',
      'Veranda depth 1.8–3.0 m for functional outdoor space',
      'Acts as solar shading and rain shelter simultaneously',
    ],
  },
  {
    id: 'courtyard-hearth',
    name: 'Courtyard as Hearth / Imbizo Space',
    keywords: ['courtyard', 'hearth', 'central courtyard', 'patio', 'atrium', 'imbizo', 'dare', 'community gathering'],
    culturalContext: 'The courtyard (dare/imbizo in Shona, inkundla in Ndebele) serves as the social heart of the home — a semi-private space for family meetings, cooking, and community dialogue.',
    designImplications: [
      'Central open courtyard as main organising feature',
      'All rooms open onto courtyard',
      'Courtyard as natural light and ventilation source',
      'Hard landscaped surface with shade tree or pergola',
    ],
  },
  {
    id: 'great-zimbabwe',
    name: 'Great Zimbabwe Enclosure / Dry-Stone',
    keywords: ['great zimbabwe', 'dry stone', 'stone enclosure', 'zimbabwe ruins', 'granite', 'conical tower', 'monumental'],
    culturalContext: 'Great Zimbabwe (11th–15th century) is the architectural ancestor — massive granite dry-stone walls, conical towers, and enclosure planning that defined pre-colonial state power.',
    designImplications: [
      'Screen walls and partial-height stone cladding for privacy',
      'Conical tower forms as sculptural features',
      'Courtyard-within-courtyard spatial hierarchy',
      'Local granite or dry-stack stone cladding details',
      'Monumental gateways / passageways',
    ],
  },
]

function detectHeritage(text: string): HeritagePattern | null {
  const lower = text.toLowerCase()
  let best: HeritagePattern | null = null
  let maxMatches = 0

  for (const p of PATTERNS) {
    let matches = 0
    for (const kw of p.keywords) {
      if (lower.includes(kw)) matches++
    }
    if (matches > 0 && matches > maxMatches) {
      maxMatches = matches
      best = p
    }
  }

  return best ?? null
}

export { PATTERNS, detectHeritage }
