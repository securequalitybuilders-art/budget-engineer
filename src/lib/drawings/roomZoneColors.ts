import { getRoomStandard, type RoomZone } from '@/engine/standards/roomStandards'

export interface RoomZoneColors {
  fill: string
  stroke: string
  text: string
}

/**
 * Brand guidelines §2.6 — Room Zone Colors (Floor Plans).
 * Each zone carries a fill, stroke and text colour for plan renderers.
 */
export const ROOM_ZONE_COLORS: Record<RoomZone, RoomZoneColors> = {
  public: { fill: '#E6F1FB', stroke: '#378ADD', text: '#042C53' },
  private: { fill: '#EAF3DE', stroke: '#639922', text: '#173404' },
  service: { fill: '#FAEEDA', stroke: '#BA7517', text: '#412402' },
  circulation: { fill: '#F1EFE8', stroke: '#888780', text: '#2C2C2A' },
}

export function zoneColorsForRoom(roomName: string): RoomZoneColors {
  return ROOM_ZONE_COLORS[getRoomStandard(roomName).zone]
}

export function zoneLabel(zone: RoomZone): string {
  return zone.charAt(0).toUpperCase() + zone.slice(1)
}
