export const BUILDING_TYPES = [
  'house',
  'apartment',
  'townhouse',
  'clinic',
  'school',
  'commercial',
  'office',
  'other',
] as const

export type BuildingType = typeof BUILDING_TYPES[number]

export const RESIDENTIAL_TYPES: BuildingType[] = ['house', 'apartment', 'townhouse']

export function isResidential(t: string): boolean {
  return (RESIDENTIAL_TYPES as readonly string[]).includes(t)
}
