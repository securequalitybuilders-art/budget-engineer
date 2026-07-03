import { parsedBriefSchema, designSchema, type ParsedBrief, type DesignSchema } from './schema';
import type { BuildingElement, Design } from '@/types';
import { uuid } from '@/lib/utils';

/**
 * Generate 3 design options (compact, standard, spacious) from a parsed brief.
 * Each option contains rooms, dimensions, and a list of BuildingElements
 * ready for quantity takeoff and BOQ generation.
 */

const ROOM_SIZES: Record<string, { width: number; depth: number }> = {
  bedroom: { width: 3.2, depth: 3.6 },
  'master bedroom': { width: 4.0, depth: 4.2 },
  bathroom: { width: 2.0, depth: 2.4 },
  kitchen: { width: 3.0, depth: 3.0 },
  lounge: { width: 4.2, depth: 4.5 },
  'living room': { width: 4.2, depth: 4.5 },
  veranda: { width: 3.0, depth: 2.0 },
  corridor: { width: 1.2, depth: 1.0 },
};

const STYLE_MULTIPLIERS: Record<DesignSchema['style'], number> = {
  compact: 0.85,
  standard: 1.0,
  spacious: 1.2,
};

function buildRooms(
  bedrooms: number,
  bathrooms: number,
  features: string[],
  style: DesignSchema['style']
): DesignSchema['rooms'] {
  const multiplier = STYLE_MULTIPLIERS[style];
  const rooms: DesignSchema['rooms'] = [];

  // Master bedroom
  rooms.push({
    name: 'Master Bedroom',
    widthM: round(ROOM_SIZES['master bedroom'].width * multiplier),
    depthM: round(ROOM_SIZES['master bedroom'].depth * multiplier),
    areaM2: round(ROOM_SIZES['master bedroom'].width * ROOM_SIZES['master bedroom'].depth * multiplier ** 2),
  });

  // Other bedrooms
  for (let i = 1; i < bedrooms; i++) {
    rooms.push({
      name: `Bedroom ${i + 1}`,
      widthM: round(ROOM_SIZES.bedroom.width * multiplier),
      depthM: round(ROOM_SIZES.bedroom.depth * multiplier),
      areaM2: round(ROOM_SIZES.bedroom.width * ROOM_SIZES.bedroom.depth * multiplier ** 2),
    });
  }

  // Bathrooms
  const bathCount = Math.max(1, bathrooms || 1);
  for (let i = 0; i < bathCount; i++) {
    rooms.push({
      name: `Bathroom ${i + 1}`,
      widthM: round(ROOM_SIZES.bathroom.width * multiplier),
      depthM: round(ROOM_SIZES.bathroom.depth * multiplier),
      areaM2: round(ROOM_SIZES.bathroom.width * ROOM_SIZES.bathroom.depth * multiplier ** 2),
    });
  }

  // Common rooms
  rooms.push({
    name: 'Kitchen',
    widthM: round(ROOM_SIZES.kitchen.width * multiplier),
    depthM: round(ROOM_SIZES.kitchen.depth * multiplier),
    areaM2: round(ROOM_SIZES.kitchen.width * ROOM_SIZES.kitchen.depth * multiplier ** 2),
  });
  rooms.push({
    name: 'Living Room',
    widthM: round(ROOM_SIZES['living room'].width * multiplier),
    depthM: round(ROOM_SIZES['living room'].depth * multiplier),
    areaM2: round(ROOM_SIZES['living room'].width * ROOM_SIZES['living room'].depth * multiplier ** 2),
  });

  if (features.includes('veranda') || features.includes('porch')) {
    rooms.push({
      name: 'Veranda',
      widthM: round(ROOM_SIZES.veranda.width * multiplier),
      depthM: round(ROOM_SIZES.veranda.depth * multiplier),
      areaM2: round(ROOM_SIZES.veranda.width * ROOM_SIZES.veranda.depth * multiplier ** 2),
    });
  }

  return rooms;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildElements(
  rooms: DesignSchema['rooms'],
  floors: number,
  features: string[]
): BuildingElement[] {
  const totalFloorArea = rooms.reduce((sum, r) => sum + r.areaM2, 0);
  const totalFloorAreaAllLevels = totalFloorArea * floors;
  const averageFloorPerimeter = rooms.reduce((sum, r) => sum + (r.widthM + r.depthM) * 2, 0) * 0.6;
  const wallHeight = 2.7; // standard ceiling height
  const wallArea = averageFloorPerimeter * wallHeight * floors;
  const windowArea = wallArea * 0.12;
  const doorCount = Math.max(1, Math.round(rooms.length / 4));

  const elements: BuildingElement[] = [
    {
      id: uuid(),
      category: 'foundation',
      material: 'Reinforced concrete slab',
      dimensions: { length: 0, width: 0, height: 0.15 },
      quantity: { value: round(totalFloorAreaAllLevels), unit: 'm2', formula: 'floor area × floors' },
    },
    {
      id: uuid(),
      category: 'wall',
      material: 'Common clay brick + mortar',
      dimensions: { length: round(averageFloorPerimeter * floors), width: 0.23, height: wallHeight },
      quantity: { value: round(wallArea), unit: 'm2', formula: 'perimeter × height × floors' },
    },
    {
      id: uuid(),
      category: 'slab',
      material: 'Reinforced concrete floor/roof slab',
      dimensions: { length: 0, width: 0, height: 0.15 },
      quantity: { value: round(totalFloorAreaAllLevels), unit: 'm2', formula: 'floor area × floors' },
    },
    {
      id: uuid(),
      category: 'roof',
      material: 'Corrugated galvanised iron sheet',
      dimensions: { length: 0, width: 0, height: 0 },
      quantity: { value: round(totalFloorArea * 1.25), unit: 'm2', formula: 'footprint × 1.25 pitch factor' },
    },
    {
      id: uuid(),
      category: 'opening',
      material: 'Aluminium window frames + glass',
      dimensions: { length: 1.5, width: 1.2, height: 0, count: 0 },
      quantity: { value: round(windowArea), unit: 'm2', formula: 'wall area × 12% glazing ratio' },
    },
    {
      id: uuid(),
      category: 'opening',
      material: 'Timber flush door',
      dimensions: { length: 0.9, width: 2.1, height: 0, count: doorCount },
      quantity: { value: doorCount, unit: 'each', formula: '1 per 4 rooms' },
    },
  ];

  if (features.includes('solar panels')) {
    elements.push({
      id: uuid(),
      category: 'fixture',
      material: 'Solar PV panel system',
      dimensions: { length: 1.6, width: 1.0, height: 0, count: 4 },
      quantity: { value: round(totalFloorArea * 0.05), unit: 'm2', formula: '5% of roof area' },
    });
  }

  return elements;
}

function buildDesignSchema(brief: ParsedBrief, style: DesignSchema['style'], optionIndex: number): DesignSchema {
  const bedrooms = brief.bedrooms ?? 2;
  const bathrooms = brief.bathrooms ?? 1;
  const rooms = buildRooms(bedrooms, bathrooms, brief.features, style);
  const totalArea = rooms.reduce((sum, r) => sum + r.areaM2, 0);
  const width = Math.sqrt(totalArea * 1.2);
  const depth = totalArea / width;

  return designSchema.parse({
    name: `${style.charAt(0).toUpperCase() + style.slice(1)} Option`,
    optionIndex,
    style,
    totalAreaM2: round(totalArea),
    footprintWidthM: round(width),
    footprintDepthM: round(depth),
    floors: brief.floors,
    rooms,
    features: brief.features,
  });
}

function schemaToDesign(projectId: string, schema: DesignSchema, buildingType: string): Design {
  return {
    id: uuid(),
    projectId,
    name: schema.name,
    optionIndex: schema.optionIndex,
    parameters: {
      widthM: schema.footprintWidthM,
      depthM: schema.footprintDepthM,
      floors: schema.floors,
      totalAreaM2: schema.totalAreaM2,
    },
    elements: buildElements(schema.rooms, schema.floors, schema.features),
    buildingType,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate three design options from a brief.
 * Returns compact, standard, and spacious variants.
 */
export function generateDesignOptions(
  projectId: string,
  brief: ParsedBrief
): Design[] {
  const styles: DesignSchema['style'][] = ['compact', 'standard', 'spacious'];
  return styles.map((style, idx) => {
    const schema = buildDesignSchema(brief, style, idx);
    return schemaToDesign(projectId, schema, brief.buildingType);
  });
}

/**
 * Convenience: parse a raw brief and generate design options in one call.
 */
export function generateDesignOptionsFromBrief(
  projectId: string,
  rawText: string,
  baseRegion = 'zimbabwe',
  buildingType = 'house',
): Design[] {
  const brief = parsedBriefSchema.parse({
    buildingType,
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    location: baseRegion,
    standards: ['ZBC 1996'],
    features: [],
    summary: rawText,
  });
  return generateDesignOptions(projectId, brief);
}
