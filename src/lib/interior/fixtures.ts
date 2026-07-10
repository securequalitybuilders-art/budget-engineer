import type { FixtureDef } from '@/domain/interior';

/**
 * 42 fixture definitions across 7 categories.
 * Dimensions in mm. Symbol field is a short SVG path or shape name
 * for the canvas renderer.
 */

export const FIXTURES: FixtureDef[] = [
  // ── Sanitary ──────────────────────────────────────────────
  { id: 'WC-CLOSET',    name: 'WC / Closet',        category: 'sanitary',   width: 400,  depth: 650,  height: 750,  symbol: 'wc',     mounting: 'floor' },
  { id: 'WC-WALLHUNG',  name: 'WC Wall-Hung',       category: 'sanitary',   width: 370,  depth: 550,  height: 450,  symbol: 'wc',     mounting: 'wall' },
  { id: 'BIDET',        name: 'Bidet',               category: 'sanitary',   width: 370,  depth: 550,  height: 450,  symbol: 'bidet',  mounting: 'floor' },
  { id: 'URINAL',       name: 'Urinal',              category: 'sanitary',   width: 380,  depth: 330,  height: 650,  symbol: 'urinal', mounting: 'wall' },
  { id: 'BASIN-WALL',   name: 'Washbasin Wall',      category: 'sanitary',   width: 550,  depth: 450,  height: 200,  symbol: 'basin',  mounting: 'wall' },
  { id: 'BASIN-PED',    name: 'Washbasin Pedestal',  category: 'sanitary',   width: 600,  depth: 500,  height: 850,  symbol: 'basin',  mounting: 'floor' },
  { id: 'BASIN-VANITY', name: 'Vanity Basin',        category: 'sanitary',   width: 900,  depth: 500,  height: 200,  symbol: 'vanity', mounting: 'counter' },
  { id: 'SHOWER-TRAY',  name: 'Shower Tray',         category: 'sanitary',   width: 900,  depth: 900,  height: 50,   symbol: 'shower', mounting: 'floor' },
  { id: 'SHOWER-LINEAR',name: 'Linear Shower',       category: 'sanitary',   width: 1200, depth: 800,  height: 50,   symbol: 'shower-linear', mounting: 'floor' },
  { id: 'BATH-STANDARD',name: 'Bathtub Standard',    category: 'sanitary',   width: 1700, depth: 750,  height: 500,  symbol: 'bath',   mounting: 'floor' },
  { id: 'BATH-CORNER',  name: 'Corner Bathtub',      category: 'sanitary',   width: 1400, depth: 1400, height: 500,  symbol: 'bath-corner', mounting: 'floor' },
  { id: 'BATH-FREESTD', name: 'Freestanding Tub',    category: 'sanitary',   width: 1600, depth: 750,  height: 550,  symbol: 'bath-oval', mounting: 'floor' },
  { id: 'SINK-KITCHEN', name: 'Kitchen Sink',        category: 'sanitary',   width: 1000, depth: 500,  height: 200,  symbol: 'sink',   mounting: 'counter' },
  { id: 'SINK-DBL',     name: 'Double Sink',         category: 'sanitary',   width: 1200, depth: 500,  height: 200,  symbol: 'sink-double', mounting: 'counter' },
  { id: 'LAUNDRY-TUB',  name: 'Laundry Tub',         category: 'sanitary',   width: 600,  depth: 550,  height: 900,  symbol: 'laundry-tub', mounting: 'floor' },

  // ── Kitchen ───────────────────────────────────────────────
  { id: 'COOKTOP-4',    name: '4-Burner Cooktop',    category: 'kitchen',    width: 600,  depth: 520,  height: 50,   symbol: 'cooktop-4', mounting: 'counter' },
  { id: 'COOKTOP-6',    name: '6-Burner Cooktop',    category: 'kitchen',    width: 900,  depth: 520,  height: 50,   symbol: 'cooktop-6', mounting: 'counter' },
  { id: 'OVEN-SINGLE',  name: 'Single Oven',         category: 'kitchen',    width: 600,  depth: 550,  height: 600,  symbol: 'oven',   mounting: 'floor' },
  { id: 'OVEN-DBL',     name: 'Double Oven',         category: 'kitchen',    width: 600,  depth: 550,  height: 900,  symbol: 'oven-double', mounting: 'floor' },
  { id: 'EXTRACTOR',    name: 'Extractor Hood',      category: 'kitchen',    width: 900,  depth: 500,  height: 150,  symbol: 'extractor', mounting: 'ceiling' },
  { id: 'FRIDGE',       name: 'Refrigerator',        category: 'kitchen',    width: 700,  depth: 700,  height: 1800, symbol: 'fridge', mounting: 'floor' },
  { id: 'FRIDGE-AMERICN',name: 'American Fridge',    category: 'kitchen',    width: 900,  depth: 750,  height: 1800, symbol: 'fridge-american', mounting: 'floor' },
  { id: 'DISHWASHER',   name: 'Dishwasher',          category: 'kitchen',    width: 600,  depth: 600,  height: 850,  symbol: 'dishwasher', mounting: 'floor' },
  { id: 'KITCHEN-ISLAND',name: 'Kitchen Island',     category: 'kitchen',    width: 1800, depth: 900,  height: 900,  symbol: 'island', mounting: 'floor' },

  // ── Lighting ──────────────────────────────────────────────
  { id: 'LIGHT-CEILING',  name: 'Ceiling Light',     category: 'lighting',   width: 300,  depth: 300,  height: 100,  symbol: 'light-ceiling', mounting: 'ceiling' },
  { id: 'LIGHT-RECESSED', name: 'Recessed Downlight', category: 'lighting',  width: 100,  depth: 100,  height: 50,   symbol: 'light-recessed', mounting: 'ceiling' },
  { id: 'LIGHT-PENDANT',  name: 'Pendant Light',     category: 'lighting',   width: 400,  depth: 400,  height: 500,  symbol: 'light-pendant', mounting: 'ceiling' },
  { id: 'LIGHT-WALL',     name: 'Wall Light',        category: 'lighting',   width: 200,  depth: 150,  height: 300,  symbol: 'light-wall', mounting: 'wall' },
  { id: 'LIGHT-TRACK',    name: 'Track Light',       category: 'lighting',   width: 1200, depth: 80,   height: 100,  symbol: 'light-track', mounting: 'ceiling' },
  { id: 'EXIT-SIGN',      name: 'Exit Sign',         category: 'lighting',   width: 350,  depth: 100,  height: 200,  symbol: 'exit-sign', mounting: 'ceiling' },

  // ── Furniture ─────────────────────────────────────────────
  { id: 'BED-SINGLE',   name: 'Single Bed',          category: 'furniture',  width: 1000, depth: 2000, height: 400,  symbol: 'bed',    mounting: 'floor' },
  { id: 'BED-DBL',      name: 'Double Bed',          category: 'furniture',  width: 1400, depth: 2000, height: 400,  symbol: 'bed',    mounting: 'floor' },
  { id: 'BED-KING',     name: 'King Bed',            category: 'furniture',  width: 1800, depth: 2100, height: 400,  symbol: 'bed',    mounting: 'floor' },
  { id: 'SOFA-2SEAT',   name: '2-Seat Sofa',         category: 'furniture',  width: 1500, depth: 850,  height: 800,  symbol: 'sofa',   mounting: 'floor' },
  { id: 'SOFA-3SEAT',   name: '3-Seat Sofa',         category: 'furniture',  width: 2100, depth: 850,  height: 800,  symbol: 'sofa',   mounting: 'floor' },
  { id: 'SOFA-CORNER',  name: 'Corner Sofa',         category: 'furniture',  width: 2600, depth: 1500, height: 800,  symbol: 'sofa-corner', mounting: 'floor' },
  { id: 'DINING-TABLE-4',name: 'Dining Table 4-Seat', category: 'furniture', width: 1200, depth: 800,  height: 750,  symbol: 'table',  mounting: 'floor' },
  { id: 'DINING-TABLE-6',name: 'Dining Table 6-Seat', category: 'furniture', width: 1600, depth: 900,  height: 750,  symbol: 'table',  mounting: 'floor' },
  { id: 'DINING-TABLE-8',name: 'Dining Table 8-Seat', category: 'furniture', width: 2000, depth: 1000, height: 750,  symbol: 'table',  mounting: 'floor' },
  { id: 'CHAIR-DINING', name: 'Dining Chair',        category: 'furniture',  width: 450,  depth: 500,  height: 850,  symbol: 'chair',  mounting: 'floor' },
  { id: 'CHAIR-DESK',   name: 'Desk Chair',          category: 'furniture',  width: 500,  depth: 500,  height: 900,  symbol: 'chair',  mounting: 'floor' },
  { id: 'CHAIR-ARM',    name: 'Armchair',            category: 'furniture',  width: 700,  depth: 750,  height: 900,  symbol: 'chair',  mounting: 'floor' },
  { id: 'DESK',         name: 'Desk',                category: 'furniture',  width: 1200, depth: 600,  height: 750,  symbol: 'desk',   mounting: 'floor' },
  { id: 'DESK-CORNER',  name: 'Corner Desk',         category: 'furniture',  width: 1400, depth: 1400, height: 750,  symbol: 'desk-corner', mounting: 'floor' },
  { id: 'BOOKSHELF',    name: 'Bookshelf',           category: 'furniture',  width: 800,  depth: 350,  height: 1800, symbol: 'bookshelf', mounting: 'floor' },
  { id: 'WARDROBE-2DR', name: '2-Door Wardrobe',     category: 'furniture',  width: 1000, depth: 600,  height: 2100, symbol: 'wardrobe', mounting: 'floor' },
  { id: 'WARDROBE-3DR', name: '3-Door Wardrobe',     category: 'furniture',  width: 1500, depth: 600,  height: 2100, symbol: 'wardrobe', mounting: 'floor' },
  { id: 'NIGHTSTAND',   name: 'Nightstand',          category: 'furniture',  width: 500,  depth: 400,  height: 600,  symbol: 'nightstand', mounting: 'floor' },
  { id: 'COFFEE-TABLE', name: 'Coffee Table',        category: 'furniture',  width: 900,  depth: 500,  height: 450,  symbol: 'table',  mounting: 'floor' },
  { id: 'TV-UNIT',      name: 'TV Unit',             category: 'furniture',  width: 1800, depth: 450,  height: 500,  symbol: 'tv-unit', mounting: 'floor' },

  // ── Accessories ───────────────────────────────────────────
  { id: 'MIRROR-WALL',    name: 'Wall Mirror',       category: 'accessory',  width: 600,  depth: 30,   height: 800,  symbol: 'mirror', mounting: 'wall' },
  { id: 'TOWEL-RAIL',     name: 'Towel Rail',        category: 'accessory',  width: 600,  depth: 80,   height: 120,  symbol: 'towel-rail', mounting: 'wall' },
  { id: 'TOWEL-RING',     name: 'Towel Ring',        category: 'accessory',  width: 80,   depth: 80,   height: 200,  symbol: 'towel-ring', mounting: 'wall' },
  { id: 'TOILET-ROLL',    name: 'Toilet Roll Holder',category: 'accessory',  width: 150,  depth: 80,   height: 120,  symbol: 'toilet-roll', mounting: 'wall' },
  { id: 'SOAP-DISP',      name: 'Soap Dispenser',    category: 'accessory',  width: 100,  depth: 100,  height: 200,  symbol: 'soap-disp', mounting: 'wall' },
  { id: 'CURTAIN-ROD',    name: 'Curtain Rod',       category: 'accessory',  width: 2000, depth: 40,   height: 40,   symbol: 'curtain-rod', mounting: 'ceiling' },
  { id: 'BLINDS',         name: 'Window Blinds',     category: 'accessory',  width: 1500, depth: 40,   height: 40,   symbol: 'blinds', mounting: 'ceiling' },

  // ── Mechanical ────────────────────────────────────────────
  { id: 'RADIATOR',        name: 'Radiator',          category: 'mechanical', width: 1000, depth: 100,  height: 600,  symbol: 'radiator', mounting: 'wall' },
  { id: 'TOWEL-RADIATOR',  name: 'Towel Radiator',   category: 'mechanical', width: 500,  depth: 100,  height: 800,  symbol: 'radiator', mounting: 'wall' },
  { id: 'FAN-CEILING',     name: 'Ceiling Fan',      category: 'mechanical', width: 1200, depth: 1200, height: 200,  symbol: 'fan-ceiling', mounting: 'ceiling' },
  { id: 'AC-UNIT',         name: 'AC Unit',           category: 'mechanical', width: 800,  depth: 200,  height: 300,  symbol: 'ac-unit', mounting: 'wall' },
];

export function getFixtureById(id: string): FixtureDef | undefined {
  return FIXTURES.find((f) => f.id === id);
}

export function getFixturesByCategory(category: FixtureDef['category']): FixtureDef[] {
  return FIXTURES.filter((f) => f.category === category);
}

export function searchFixtures(query: string): FixtureDef[] {
  const q = query.toLowerCase();
  return FIXTURES.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
  );
}
