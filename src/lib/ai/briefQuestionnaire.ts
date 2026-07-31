export interface BriefQuestionnaire {
  buildingType: string
  lat: number
  lng: number
  siteWidth: number
  siteDepth: number
  budgetUsd: number
  bedrooms: number
  bathrooms: number
  livingAreas: number
  kitchen: boolean
  garage: boolean
  verandah: boolean
  store: boolean
  style: string
  roof: string
  floors: number
  solar: boolean
  rainwater: boolean
  borehole: boolean
  notes: string
}

const TYPOLOGY_ROOMS: Record<string, string[]> = {
  'house-residential': ['bedrooms', 'bathrooms', 'living room', 'dining room', 'kitchen', 'garage', 'verandah', 'study', 'laundry'],
  'apartment-multi': ['studio units', 'one-bedroom units', 'two-bedroom units', 'staircase lift core', 'common corridor', 'lobby'],
  'clinic-health': ['consultation rooms', 'treatment room', 'reception waiting', 'pharmacy', 'ward', 'operating theatre', 'nurse station', 'staff room', 'laboratory'],
  'school-classroom': ['classrooms', 'staff room', "head's office", 'library', 'computer lab', 'science lab', 'assembly hall', 'toilet block'],
  'hotel-fullservice': ['guest rooms', 'reception lobby', 'restaurant', 'bar', 'conference room', 'commercial kitchen', 'laundry', 'swimming pool'],
  'office-commercial': ['open-plan office', 'private offices', 'meeting rooms', 'reception', 'kitchenette'],
  'retail-shop': ['sales floor', 'stock room', 'display area', 'staff room', 'office', 'customer toilet'],
  'restaurant': ['dining area', 'commercial kitchen', 'counter bar', 'store pantry', 'customer toilet', 'office'],
  'church-worship': ['main hall sanctuary', 'sunday school rooms', "pastor's office", 'kitchen', 'toilet block'],
  'warehouse-industrial': ['warehouse floor', 'office admin', 'staff room', 'loading bay'],
  'community-hall': ['main hall', 'kitchen', 'store', 'stage platform', 'toilet block'],
  'market': ['vendor stalls', 'aisle corridor', 'storage', 'public toilet', 'admin office'],
  'petrol-station': ['shop convenience', 'fuel bay canopy', 'car wash', 'office', 'toilet'],
  'mixed-use': ['ground floor shop', 'upper apartments', 'shared stair lobby', 'store room'],
}

export function generateBriefText(q: BriefQuestionnaire): string {
  const typeLabel = q.buildingType.replace('-', ' ')
  const typologyRooms = TYPOLOGY_ROOMS[q.buildingType] || TYPOLOGY_ROOMS['house-residential']
  const parts: string[] = [
    `${q.floors}-storey ${typeLabel}`,
    `site ${q.siteWidth}×${q.siteDepth} m`,
  ]
  if (q.bedrooms > 0) parts.push(`${q.bedrooms} bedrooms`)
  if (q.bathrooms > 0) parts.push(`${q.bathrooms} bathrooms`)
  if (q.livingAreas > 0) parts.push(`${q.livingAreas} living areas`)
  if (q.kitchen) parts.push('kitchen')
  if (q.garage) parts.push('garage')
  if (q.verandah) parts.push('verandah')
  if (q.store) parts.push('store room')
  parts.push(`with ${typologyRooms.join(', ')}`)
  parts.push(q.style)
  if (q.roof) parts.push(`${q.roof} roof`)
  if (q.solar) parts.push('solar ready')
  if (q.rainwater) parts.push('rainwater harvesting')
  if (q.borehole) parts.push('borehole')
  parts.push(`budget $${q.budgetUsd}`)
  if (q.notes) parts.push(q.notes)
  return parts.join(', ')
}
