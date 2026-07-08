import type { RateCardItem } from '../domain/boq'
import { cents } from '../lib/money'

export const seedRates: RateCardItem[] = [
  { code: 'GEN-001', title: 'Preliminaries and setup', unit: 'item', rateCents: cents(1500), section: 'general', category: 'preliminaries' },
  { code: 'SUB-001', title: 'Strip foundations concrete', unit: 'm3', rateCents: cents(185), section: 'substructure', category: 'foundation' },
  { code: 'SUB-002', title: 'Foundation wall masonry', unit: 'm2', rateCents: cents(42), section: 'substructure', category: 'foundation_wall' },
  { code: 'SUP-001', title: 'Load-bearing wall masonry', unit: 'm2', rateCents: cents(38), section: 'superstructure', category: 'wall' },
  { code: 'SUP-002', title: 'Reinforced columns', unit: 'm3', rateCents: cents(260), section: 'superstructure', category: 'column' },
  { code: 'SUP-003', title: 'Roof structure and covering', unit: 'm2', rateCents: cents(72), section: 'superstructure', category: 'roof' },
  { code: 'FIN-001', title: 'Internal floor finishes', unit: 'm2', rateCents: cents(24), section: 'finishes', category: 'floor_finish' },
  { code: 'FIN-002', title: 'Wall plaster and paint', unit: 'm2', rateCents: cents(16), section: 'finishes', category: 'wall_finish' },
  { code: 'SER-001', title: 'Electrical installation', unit: 'point', rateCents: cents(48), section: 'services', category: 'electrical_point' },
  { code: 'SER-002', title: 'Plumbing installation', unit: 'point', rateCents: cents(66), section: 'services', category: 'plumbing_point' },
  { code: 'EXT-001', title: 'External works allowance', unit: 'm2', rateCents: cents(12), section: 'external', category: 'external_works' },
]

export const rateLookup = new Map(seedRates.map((rate) => [rate.category, rate]))
