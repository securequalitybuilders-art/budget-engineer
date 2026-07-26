import type { InteriorRoomType } from '@/domain/interior';

export interface RoomTemplate {
  id: string;
  name: string;
  roomType: InteriorRoomType;
  minWidth: number;
  minDepth: number;
  defaultWidth: number;
  defaultDepth: number;
  description: string;
  suggestedFixtures: string[];
  suggestedMaterials: {
    wall: string;
    floor: string;
    ceiling: string;
  };
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'BATH-FULL',
    name: 'Full Bathroom',
    roomType: 'bathroom',
    minWidth: 1800,
    minDepth: 2400,
    defaultWidth: 2400,
    defaultDepth: 3000,
    description: 'Full bathroom with WC, basin, shower, and bath',
    suggestedFixtures: ['WC-CLOSET', 'BASIN-WALL', 'SHOWER-TRAY', 'BATH-STANDARD', 'MIRROR-WALL', 'TOWEL-RAIL', 'TOILET-ROLL', 'LIGHT-CEILING'],
    suggestedMaterials: { wall: 'TILE-CERAMIC', floor: 'TILE-PORCELAIN', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'BATH-HALF',
    name: 'Half Bath / Powder Room',
    roomType: 'bathroom',
    minWidth: 1200,
    minDepth: 1500,
    defaultWidth: 1500,
    defaultDepth: 1800,
    description: 'WC and basin only',
    suggestedFixtures: ['WC-CLOSET', 'BASIN-WALL', 'MIRROR-WALL', 'TOILET-ROLL', 'LIGHT-CEILING'],
    suggestedMaterials: { wall: 'PAINT-SEMIGLOSS', floor: 'TILE-CERAMIC', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'ENSUITE',
    name: 'Ensuite Bathroom',
    roomType: 'ensuite',
    minWidth: 1500,
    minDepth: 2000,
    defaultWidth: 2000,
    defaultDepth: 2500,
    description: 'Compact ensuite with WC, basin, shower',
    suggestedFixtures: ['WC-WALLHUNG', 'BASIN-VANITY', 'SHOWER-TRAY', 'MIRROR-WALL', 'TOWEL-RAIL', 'TOILET-ROLL', 'LIGHT-RECESSED'],
    suggestedMaterials: { wall: 'TILE-CERAMIC', floor: 'TILE-PORCELAIN', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'KITCHEN-L',
    name: 'L-Shape Kitchen',
    roomType: 'kitchen',
    minWidth: 2500,
    minDepth: 3000,
    defaultWidth: 3500,
    defaultDepth: 4000,
    description: 'L-shaped kitchen with full appliance set',
    suggestedFixtures: ['SINK-KITCHEN', 'COOKTOP-4', 'OVEN-SINGLE', 'FRIDGE', 'DISHWASHER', 'EXTRACTOR', 'LIGHT-RECESSED'],
    suggestedMaterials: { wall: 'TILE-CERAMIC', floor: 'TILE-PORCELAIN', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'KITCHEN-GALLEY',
    name: 'Galley Kitchen',
    roomType: 'kitchen',
    minWidth: 1800,
    minDepth: 3000,
    defaultWidth: 2000,
    defaultDepth: 4000,
    description: 'Galley-style kitchen with parallel counters',
    suggestedFixtures: ['SINK-KITCHEN', 'COOKTOP-4', 'FRIDGE', 'DISHWASHER', 'LIGHT-CEILING'],
    suggestedMaterials: { wall: 'TILE-CERAMIC', floor: 'VINYL', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'KITCHEN-ISLAND',
    name: 'Kitchen with Island',
    roomType: 'kitchen',
    minWidth: 3500,
    minDepth: 4000,
    defaultWidth: 4500,
    defaultDepth: 5000,
    description: 'Spacious kitchen with central island',
    suggestedFixtures: ['KITCHEN-ISLAND', 'SINK-KITCHEN', 'COOKTOP-6', 'OVEN-DBL', 'FRIDGE-AMERICN', 'DISHWASHER', 'EXTRACTOR', 'LIGHT-PENDANT', 'LIGHT-RECESSED'],
    suggestedMaterials: { wall: 'TILE-CERAMIC', floor: 'TIMBER-ENGINEERED', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'BED-MASTER',
    name: 'Master Bedroom',
    roomType: 'bedroom',
    minWidth: 3500,
    minDepth: 4000,
    defaultWidth: 4000,
    defaultDepth: 5000,
    description: 'Master bedroom with king bed and sitting area',
    suggestedFixtures: ['BED-KING', 'WARDROBE-3DR', 'NIGHTSTAND', 'NIGHTSTAND', 'LIGHT-CEILING', 'CHAIR-ARM', 'TV-UNIT'],
    suggestedMaterials: { wall: 'PAINT-MATT', floor: 'TIMBER-ENGINEERED', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'BED-STANDARD',
    name: 'Standard Bedroom',
    roomType: 'bedroom',
    minWidth: 2800,
    minDepth: 3200,
    defaultWidth: 3200,
    defaultDepth: 4000,
    description: 'Standard double bedroom',
    suggestedFixtures: ['BED-DBL', 'WARDROBE-2DR', 'NIGHTSTAND', 'LIGHT-CEILING', 'DESK', 'CHAIR-DESK'],
    suggestedMaterials: { wall: 'PAINT-MATT', floor: 'LAMINATE', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'LIVING-STANDARD',
    name: 'Living Room',
    roomType: 'living',
    minWidth: 4000,
    minDepth: 5000,
    defaultWidth: 5000,
    defaultDepth: 6000,
    description: 'Standard living room with seating and entertainment',
    suggestedFixtures: ['SOFA-3SEAT', 'SOFA-2SEAT', 'COFFEE-TABLE', 'TV-UNIT', 'BOOKSHELF', 'LIGHT-CEILING', 'LIGHT-WALL'],
    suggestedMaterials: { wall: 'PAINT-MATT', floor: 'TIMBER-ENGINEERED', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'LIVING-OPEN',
    name: 'Open Plan Living',
    roomType: 'living',
    minWidth: 6000,
    minDepth: 7000,
    defaultWidth: 7500,
    defaultDepth: 8000,
    description: 'Open plan living / dining / kitchen',
    suggestedFixtures: ['SOFA-CORNER', 'DINING-TABLE-6', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'COFFEE-TABLE', 'TV-UNIT', 'LIGHT-PENDANT', 'LIGHT-RECESSED', 'LIGHT-CEILING'],
    suggestedMaterials: { wall: 'PAINT-MATT', floor: 'TIMBER-ENGINEERED', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'DINING-FORMAL',
    name: 'Formal Dining Room',
    roomType: 'dining',
    minWidth: 3000,
    minDepth: 3500,
    defaultWidth: 4000,
    defaultDepth: 5000,
    description: 'Formal dining room',
    suggestedFixtures: ['DINING-TABLE-8', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'CHAIR-DINING', 'LIGHT-PENDANT'],
    suggestedMaterials: { wall: 'PAINT-MATT', floor: 'TIMBER-ENGINEERED', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'HOME-OFFICE',
    name: 'Home Office',
    roomType: 'office',
    minWidth: 2500,
    minDepth: 3000,
    defaultWidth: 3000,
    defaultDepth: 4000,
    description: 'Home office / study',
    suggestedFixtures: ['DESK', 'CHAIR-DESK', 'BOOKSHELF', 'LIGHT-CEILING'],
    suggestedMaterials: { wall: 'PAINT-MATT', floor: 'LAMINATE', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'LAUNDRY',
    name: 'Laundry Room',
    roomType: 'laundry',
    minWidth: 1500,
    minDepth: 2000,
    defaultWidth: 2000,
    defaultDepth: 2500,
    description: 'Laundry with tub and appliance space',
    suggestedFixtures: ['LAUNDRY-TUB', 'LIGHT-CEILING'],
    suggestedMaterials: { wall: 'TILE-CERAMIC', floor: 'TILE-CERAMIC', ceiling: 'PAINT-WHITE' },
  },
  {
    id: 'ENTRY-FOYER',
    name: 'Entry / Foyer',
    roomType: 'entry',
    minWidth: 1500,
    minDepth: 2000,
    defaultWidth: 2000,
    defaultDepth: 3000,
    description: 'Entry foyer',
    suggestedFixtures: ['LIGHT-CEILING', 'MIRROR-WALL'],
    suggestedMaterials: { wall: 'PAINT-MATT', floor: 'TILE-PORCELAIN', ceiling: 'PAINT-WHITE' },
  },
];

export function getRoomTemplate(id: string): RoomTemplate | undefined {
  return ROOM_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByType(roomType: InteriorRoomType): RoomTemplate[] {
  return ROOM_TEMPLATES.filter((t) => t.roomType === roomType);
}

export function searchRoomTemplates(query: string): RoomTemplate[] {
  const q = query.toLowerCase();
  return ROOM_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.roomType.toLowerCase().includes(q)
  );
}
