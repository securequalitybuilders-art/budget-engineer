import { db } from '@/db/db';
import type { BuildingElement, BOQ, BOQSection, BOQItem, Rate } from '@/types';
import { uuid } from '@/lib/utils';

/**
 * BOQ Engine — turns BuildingElement quantities into priced line items.
 * Uses the seeded Zimbabwe/CWICR-style rate catalogue in IndexedDB.
 *
 * Rules are intentionally simple for the thin slice:
 * 1. Map each element category to one or more rate items.
 * 2. Multiply the element quantity by a category-specific factor (e.g., 50 bricks/m²).
 * 3. Look up the unit rate from the local DB.
 * 4. Group into sections, add 10% contingency, and return a validated BOQ.
 */

interface RateMapping {
  code: string;
  qtyMultiplier: number;
  materialIncludes?: string;
  description?: string;
}

const SECTIONS: Record<string, { code: string; title: string }> = {
  substructure: { code: 'SUB', title: 'Substructure' },
  superstructure: { code: 'SUP', title: 'Superstructure' },
  openings: { code: 'OPN', title: 'Openings' },
  fixtures: { code: 'FIX', title: 'Fixtures & Special Construction' },
};

const ELEMENT_RATE_MAP: Record<BuildingElement['category'], { section: keyof typeof SECTIONS; mappings: RateMapping[] }> = {
  foundation: {
    section: 'substructure',
    mappings: [{ code: 'MAT-CON-SLAB', qtyMultiplier: 1, description: 'Reinforced concrete slab' }],
  },
  slab: {
    section: 'substructure',
    mappings: [{ code: 'MAT-CON-SLAB', qtyMultiplier: 1, description: 'Reinforced concrete floor/roof slab' }],
  },
  wall: {
    section: 'superstructure',
    mappings: [
      { code: 'MAT-BRK-001', qtyMultiplier: 50, description: 'Common clay bricks' }, // 50 bricks/m²
      { code: 'LAB-BRK-001', qtyMultiplier: 1.2, description: 'Bricklaying labour' }, // 1.2 hr/m²
    ],
  },
  roof: {
    section: 'superstructure',
    mappings: [{ code: 'MAT-Roof-001', qtyMultiplier: 1, description: 'Corrugated roof sheet' }],
  },
  opening: {
    section: 'openings',
    mappings: [
      { code: 'MAT-WIN-001', qtyMultiplier: 1, materialIncludes: 'aluminium', description: 'Aluminium window' },
      { code: 'MAT-DOR-001', qtyMultiplier: 1, materialIncludes: 'timber', description: 'Timber door' },
    ],
  },
  fixture: {
    section: 'fixtures',
    mappings: [{ code: 'MAT-SOL-001', qtyMultiplier: 1, materialIncludes: 'solar', description: 'Solar PV panel system' }],
  },
  beam: {
    section: 'superstructure',
    mappings: [{ code: 'MAT-CON-SLAB', qtyMultiplier: 1, description: 'Reinforced concrete beam' }],
  },
  column: {
    section: 'superstructure',
    mappings: [{ code: 'MAT-CON-SLAB', qtyMultiplier: 1, description: 'Reinforced concrete column' }],
  },
};

const DEFAULT_CONTINGENCY_PERCENT = 10;

function ensureSection(map: Map<string, BOQSection>, sectionKey: keyof typeof SECTIONS): BOQSection {
  const key = sectionKey as string;
  if (!map.has(key)) {
    const meta = SECTIONS[key];
    map.set(key, {
      id: uuid(),
      code: meta.code,
      title: meta.title,
      items: [],
      subtotalCents: 0,
    });
  }
  return map.get(key)!;
}

function matchesMaterial(element: BuildingElement, mapping: RateMapping): boolean {
  if (!mapping.materialIncludes) return true;
  return element.material.toLowerCase().includes(mapping.materialIncludes.toLowerCase());
}

function computeLineQuantity(element: BuildingElement, mapping: RateMapping): number {
  const baseQty = element.quantity.value;
  // For windows, the element quantity is already m²; for doors it's a count.
  // For bricks, the multiplier converts wall m² into brick count.
  // For labour, the multiplier converts wall m² into labour hours.
  return Math.round(baseQty * mapping.qtyMultiplier * 100) / 100;
}

/**
 * Generate a BOQ from a design's BuildingElements.
 */
export async function generateBOQ(
  projectId: string,
  designId: string,
  region: string = 'zimbabwe',
  contingencyPercent: number = DEFAULT_CONTINGENCY_PERCENT
): Promise<BOQ> {
  const design = await db.designs.get(designId);
  if (!design) throw new Error('Design not found');
  if (!design.elements.length) throw new Error('Design has no elements');

  const rates = await db.rates.where({ region }).toArray();
  const rateMap = new Map<string, Rate>(rates.map((r) => [r.code, r]));

  const sectionMap = new Map<string, BOQSection>();

  for (const element of design.elements) {
    const config = ELEMENT_RATE_MAP[element.category];
    if (!config) continue;

    const section = ensureSection(sectionMap, config.section);

    for (const mapping of config.mappings) {
      if (!matchesMaterial(element, mapping)) continue;

      const rate = rateMap.get(mapping.code);
      if (!rate) continue;

      const quantity = computeLineQuantity(element, mapping);
      const totalCents = Math.round(quantity * rate.baseRateCents);

      const line: BOQItem = {
        id: uuid(),
        description: `${mapping.description || rate.description} — ${element.quantity.formula}`,
        quantity,
        unit: rate.unit,
        rateCents: rate.baseRateCents,
        totalCents,
        elementIds: [element.id],
        source: 'auto',
        aiConfidence: 85,
      };

      section.items.push(line);
      section.subtotalCents += totalCents;
    }
  }

  const sections = Array.from(sectionMap.values());
  if (sections.length === 0) throw new Error('No BOQ items could be generated');

  const subtotalCents = sections.reduce((sum, s) => sum + s.subtotalCents, 0);
  const contingencyCents = Math.round((subtotalCents * contingencyPercent) / 100);
  const totalCents = subtotalCents + contingencyCents;

  const boq: BOQ = {
    id: uuid(),
    projectId,
    designId,
    sections,
    totalCents,
    contingencyCents,
    currency: 'USD',
    generatedAt: new Date().toISOString(),
  };

  return boq;
}
