import type { FurnitureDef } from '@/domain/furniture'

export const FURNITURE_LIBRARY: FurnitureDef[] = [
  // ── Furniture ──────────────────────────────────────────
  { id: 'BED-SINGLE',  name: 'Single Bed',     category: 'furniture',  width: 1.0, depth: 2.0, height: 0.8, symbol: '🛏', mounting: 'floor', tags: ['bedroom', 'bed'] },
  { id: 'BED-DOUBLE',  name: 'Double Bed',     category: 'furniture',  width: 1.4, depth: 2.0, height: 0.8, symbol: '🛏', mounting: 'floor', tags: ['bedroom', 'bed'] },
  { id: 'BED-KING',    name: 'King Bed',        category: 'furniture',  width: 1.8, depth: 2.1, height: 0.8, symbol: '🛏', mounting: 'floor', tags: ['bedroom', 'bed'] },
  { id: 'SOFA-2SEAT',  name: '2-Seat Sofa',     category: 'furniture',  width: 1.5, depth: 0.85, height: 0.85, symbol: '🛋', mounting: 'floor', tags: ['living', 'seating'] },
  { id: 'SOFA-3SEAT',  name: '3-Seat Sofa',     category: 'furniture',  width: 2.1, depth: 0.85, height: 0.85, symbol: '🛋', mounting: 'floor', tags: ['living', 'seating'] },
  { id: 'SOFA-CORNER', name: 'Corner Sofa',     category: 'furniture',  width: 2.6, depth: 1.5, height: 0.85, symbol: '🛋', mounting: 'floor', tags: ['living', 'seating'] },
  { id: 'DINING-TBL-4',name: 'Dining Table 4-Seat', category: 'furniture', width: 1.2, depth: 0.8, height: 0.75, symbol: '🪑', mounting: 'floor', tags: ['dining', 'table'] },
  { id: 'DINING-TBL-6',name: 'Dining Table 6-Seat', category: 'furniture', width: 1.6, depth: 0.9, height: 0.75, symbol: '🪑', mounting: 'floor', tags: ['dining', 'table'] },
  { id: 'DESK',        name: 'Desk',            category: 'furniture',  width: 1.2, depth: 0.6, height: 0.75, symbol: '🖥', mounting: 'floor', tags: ['office', 'work'] },
  { id: 'DESK-CORNER', name: 'Corner Desk',     category: 'furniture',  width: 1.4, depth: 1.4, height: 0.75, symbol: '🖥', mounting: 'floor', tags: ['office', 'work'] },
  { id: 'BOOKSHELF',   name: 'Bookshelf',        category: 'furniture',  width: 0.8, depth: 0.35, height: 1.8, symbol: '📚', mounting: 'floor', tags: ['storage', 'living'] },
  { id: 'WARDROBE-2DR',name: '2-Door Wardrobe',  category: 'furniture',  width: 1.0, depth: 0.6, height: 2.0, symbol: '🗄', mounting: 'floor', tags: ['storage', 'bedroom'] },
  { id: 'WARDROBE-3DR',name: '3-Door Wardrobe',  category: 'furniture',  width: 1.5, depth: 0.6, height: 2.0, symbol: '🗄', mounting: 'floor', tags: ['storage', 'bedroom'] },
  { id: 'NIGHTSTAND',  name: 'Nightstand',       category: 'furniture',  width: 0.5, depth: 0.4, height: 0.6, symbol: '🔲', mounting: 'floor', tags: ['bedroom'] },
  { id: 'COFFEE-TBL',  name: 'Coffee Table',     category: 'furniture',  width: 0.9, depth: 0.5, height: 0.45, symbol: '🟫', mounting: 'floor', tags: ['living'] },
  { id: 'TV-UNIT',     name: 'TV Unit',          category: 'furniture',  width: 1.8, depth: 0.45, height: 0.5, symbol: '📺', mounting: 'floor', tags: ['living', 'entertainment'] },
  { id: 'CHAIR-DINING',name: 'Dining Chair',     category: 'furniture',  width: 0.45, depth: 0.5, height: 0.85, symbol: '💺', mounting: 'floor', tags: ['dining', 'seating'] },
  { id: 'CHAIR-DESK',  name: 'Desk Chair',       category: 'furniture',  width: 0.5, depth: 0.5, height: 0.85, symbol: '💺', mounting: 'floor', tags: ['office', 'seating'] },
  { id: 'CHAIR-ARM',   name: 'Armchair',         category: 'furniture',  width: 0.7, depth: 0.75, height: 0.85, symbol: '🪑', mounting: 'floor', tags: ['living', 'seating'] },

  // ── Sanitary ───────────────────────────────────────────
  { id: 'WC',          name: 'WC',               category: 'sanitary',  width: 0.4, depth: 0.65, height: 0.75, symbol: '🚽', mounting: 'floor', tags: ['bathroom', 'toilet'] },
  { id: 'WC-WALLHUNG', name: 'WC Wall-Hung',     category: 'sanitary',  width: 0.37, depth: 0.55, height: 0.45, symbol: '🚽', mounting: 'wall', tags: ['bathroom', 'toilet'] },
  { id: 'BASIN',       name: 'Washbasin',         category: 'sanitary',  width: 0.55, depth: 0.45, height: 0.2, symbol: '🚿', mounting: 'wall', tags: ['bathroom'] },
  { id: 'BASIN-VANITY',name: 'Vanity Basin',      category: 'sanitary',  width: 0.9, depth: 0.5, height: 0.2, symbol: '🚿', mounting: 'counter', tags: ['bathroom'] },
  { id: 'SHOWER',      name: 'Shower Tray',       category: 'sanitary',  width: 0.9, depth: 0.9, height: 0.05, symbol: '🚿', mounting: 'floor', tags: ['bathroom', 'shower'] },
  { id: 'BATH-STD',    name: 'Bathtub Standard',  category: 'sanitary',  width: 1.7, depth: 0.75, height: 0.5, symbol: '🛁', mounting: 'floor', tags: ['bathroom', 'bath'] },
  { id: 'BIDET',       name: 'Bidet',             category: 'sanitary',  width: 0.37, depth: 0.55, height: 0.45, symbol: '🚽', mounting: 'floor', tags: ['bathroom'] },
  { id: 'URINAL',      name: 'Urinal',            category: 'sanitary',  width: 0.38, depth: 0.33, height: 0.65, symbol: '🚻', mounting: 'wall', tags: ['bathroom', 'toilet'] },
  { id: 'SINK-KITCHEN',name: 'Kitchen Sink',      category: 'sanitary',  width: 1.0, depth: 0.5, height: 0.2, symbol: '🍴', mounting: 'counter', tags: ['kitchen', 'sink'] },

  // ── Kitchen ────────────────────────────────────────────
  { id: 'COOKTOP-4',   name: '4-Burner Cooktop',  category: 'kitchen',   width: 0.6, depth: 0.52, height: 0.05, symbol: '🔥', mounting: 'counter', tags: ['kitchen', 'cooking'] },
  { id: 'COOKTOP-6',   name: '6-Burner Cooktop',  category: 'kitchen',   width: 0.9, depth: 0.52, height: 0.05, symbol: '🔥', mounting: 'counter', tags: ['kitchen', 'cooking'] },
  { id: 'OVEN',        name: 'Oven',              category: 'kitchen',   width: 0.6, depth: 0.55, height: 0.6, symbol: '🍳', mounting: 'floor', tags: ['kitchen', 'cooking'] },
  { id: 'FRIDGE',      name: 'Refrigerator',       category: 'kitchen',   width: 0.7, depth: 0.7, height: 1.8, symbol: '🧊', mounting: 'floor', tags: ['kitchen', 'appliance'] },
  { id: 'DISHWASHER',  name: 'Dishwasher',         category: 'kitchen',   width: 0.6, depth: 0.6, height: 0.85, symbol: '🍽', mounting: 'floor', tags: ['kitchen', 'appliance'] },
  { id: 'KITCHEN-ISLAND',name: 'Kitchen Island',  category: 'kitchen',   width: 1.8, depth: 0.9, height: 0.9, symbol: '⬜', mounting: 'floor', tags: ['kitchen'] },

  // ── Lighting ───────────────────────────────────────────
  { id: 'LIGHT-CEIL',  name: 'Ceiling Light',     category: 'lighting',  width: 0.3, depth: 0.3, height: 0.1, symbol: '💡', mounting: 'ceiling', tags: ['lighting'] },
  { id: 'LIGHT-RECESS',name: 'Recessed Downlight', category: 'lighting', width: 0.1, depth: 0.1, height: 0.05, symbol: '⭕', mounting: 'ceiling', tags: ['lighting'] },

  // ── Stairs & Core ──────────────────────────────────────
  { id: 'STAIR-STRAIGHT', name: 'Straight Stair',   category: 'stair', width: 2.4, depth: 4.0, height: 3.0, symbol: '📐', mounting: 'floor', tags: ['circulation', 'stair'] },
  { id: 'STAIR-L',     name: 'L-Shape Stair',      category: 'stair',    width: 2.4, depth: 2.4, height: 3.0, symbol: '📐', mounting: 'floor', tags: ['circulation', 'stair'] },
  { id: 'ELEVATOR',    name: 'Elevator / Lift',    category: 'stair',    width: 1.6, depth: 1.6, height: 3.0, symbol: '🛗', mounting: 'floor', tags: ['circulation', 'lift'] },

  // ── Structural ─────────────────────────────────────────
  { id: 'COLUMN-RECT', name: 'Rectangular Column', category: 'structural', width: 0.3, depth: 0.3, height: 3.0, symbol: '⬛', mounting: 'floor', tags: ['structure', 'column'] },
  { id: 'COLUMN-RND',  name: 'Circular Column',    category: 'structural', width: 0.3, depth: 0.3, height: 3.0, symbol: '⚫', mounting: 'floor', tags: ['structure', 'column'] },
  { id: 'BEAM',        name: 'Beam',               category: 'structural', width: 0.3, depth: 0.4, height: 0.4, symbol: '━', mounting: 'ceiling', tags: ['structure', 'beam'] },
]

export function getFurnitureDef(id: string): FurnitureDef | undefined {
  return FURNITURE_LIBRARY.find((f) => f.id === id)
}

export function getFurnitureByCategory(cat: BlockCategory): FurnitureDef[] {
  return FURNITURE_LIBRARY.filter((f) => f.category === cat)
}

export const BLOCK_CATEGORIES: { key: BlockCategory; label: string }[] = [
  { key: 'furniture',  label: 'Furniture' },
  { key: 'sanitary',   label: 'Sanitary' },
  { key: 'kitchen',    label: 'Kitchen' },
  { key: 'lighting',   label: 'Lighting' },
  { key: 'stair',      label: 'Stairs & Core' },
  { key: 'structural', label: 'Structural' },
]
