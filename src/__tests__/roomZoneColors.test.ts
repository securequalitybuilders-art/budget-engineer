import { describe, it, expect } from 'vitest'
import { ROOM_ZONE_COLORS, zoneColorsForRoom, zoneLabel } from '@/lib/drawings/roomZoneColors'

describe('Brand guidelines §2.6 — Room Zone Colors', () => {
  it('defines the four zones with exact §2.6 fill/stroke/text values', () => {
    expect(ROOM_ZONE_COLORS.public).toEqual({ fill: '#E6F1FB', stroke: '#378ADD', text: '#042C53' })
    expect(ROOM_ZONE_COLORS.private).toEqual({ fill: '#EAF3DE', stroke: '#639922', text: '#173404' })
    expect(ROOM_ZONE_COLORS.service).toEqual({ fill: '#FAEEDA', stroke: '#BA7517', text: '#412402' })
    expect(ROOM_ZONE_COLORS.circulation).toEqual({ fill: '#F1EFE8', stroke: '#888780', text: '#2C2C2A' })
  })

  it('classifies living spaces as public', () => {
    const c = zoneColorsForRoom('Living Room')
    expect(c).toEqual(ROOM_ZONE_COLORS.public)
  })

  it('classifies bedrooms and offices as private', () => {
    expect(zoneColorsForRoom('Bedroom')).toEqual(ROOM_ZONE_COLORS.private)
    expect(zoneColorsForRoom('Master Bedroom')).toEqual(ROOM_ZONE_COLORS.private)
    expect(zoneColorsForRoom('Office')).toEqual(ROOM_ZONE_COLORS.private)
  })

  it('classifies kitchens, bathrooms and stores as service', () => {
    expect(zoneColorsForRoom('Kitchen')).toEqual(ROOM_ZONE_COLORS.service)
    expect(zoneColorsForRoom('Bathroom')).toEqual(ROOM_ZONE_COLORS.service)
    expect(zoneColorsForRoom('Store')).toEqual(ROOM_ZONE_COLORS.service)
  })

  it('classifies corridors and staircases as circulation', () => {
    expect(zoneColorsForRoom('Corridor')).toEqual(ROOM_ZONE_COLORS.circulation)
    expect(zoneColorsForRoom('Staircase')).toEqual(ROOM_ZONE_COLORS.circulation)
  })

  it('falls back to the private default for unknown rooms', () => {
    expect(zoneColorsForRoom('Totally Unknown Room')).toEqual(ROOM_ZONE_COLORS.private)
  })

  it('zoneLabel capitalises the zone name', () => {
    expect(zoneLabel('public')).toBe('Public')
    expect(zoneLabel('circulation')).toBe('Circulation')
  })
})
