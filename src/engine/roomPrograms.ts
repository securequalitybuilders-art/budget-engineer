export interface RoomDef {
  name: string
  ratio: number
}

/**
 * Room programs keyed by building type.
 * Each program is a list of spaces with area ratios summing to ~1.0.
 * Programs are kept intentionally distinct so a clinic does not look like a house.
 */
export const ROOM_PROGRAMS: Record<string, RoomDef[]> = {
  house: [
    { name: 'Lounge / Dining', ratio: 0.22 },
    { name: 'Kitchen', ratio: 0.1 },
    { name: 'Master Bedroom', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bedroom 3', ratio: 0.11 },
    { name: 'Bathroom 1', ratio: 0.07 },
    { name: 'Bathroom 2', ratio: 0.06 },
    { name: 'Circulation', ratio: 0.1 },
    { name: 'Veranda', ratio: 0.08 },
  ],
  apartment: [
    { name: 'Lounge / Dining', ratio: 0.22 },
    { name: 'Kitchen', ratio: 0.1 },
    { name: 'Master Bedroom', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bedroom 3', ratio: 0.11 },
    { name: 'Bathroom 1', ratio: 0.07 },
    { name: 'Bathroom 2', ratio: 0.06 },
    { name: 'Circulation', ratio: 0.1 },
    { name: 'Balcony', ratio: 0.08 },
  ],
  townhouse: [
    { name: 'Lounge / Dining', ratio: 0.2 },
    { name: 'Kitchen', ratio: 0.1 },
    { name: 'Master Bedroom', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bathroom', ratio: 0.08 },
    { name: 'Guest WC', ratio: 0.04 },
    { name: 'Circulation', ratio: 0.12 },
    { name: 'Courtyard', ratio: 0.2 },
  ],
  clinic: [
    { name: 'Reception / Waiting', ratio: 0.18 },
    { name: 'Consultation Room 1', ratio: 0.13 },
    { name: 'Consultation Room 2', ratio: 0.13 },
    { name: 'Treatment Room', ratio: 0.14 },
    { name: 'Nurse Station', ratio: 0.07 },
    { name: 'Pharmacy / Store', ratio: 0.1 },
    { name: 'Office', ratio: 0.08 },
    { name: 'Patient WC', ratio: 0.04 },
    { name: 'Staff WC', ratio: 0.04 },
    { name: 'Circulation', ratio: 0.09 },
  ],
  school: [
    { name: 'Classroom 1', ratio: 0.18 },
    { name: 'Classroom 2', ratio: 0.18 },
    { name: 'Classroom 3', ratio: 0.18 },
    { name: 'Staff Room', ratio: 0.12 },
    { name: 'Office', ratio: 0.08 },
    { name: 'Ablution Block', ratio: 0.08 },
    { name: 'Ablution Block', ratio: 0.08 },
    { name: 'Circulation', ratio: 0.1 },
  ],
  commercial: [
    { name: 'Retail Floor', ratio: 0.35 },
    { name: 'Store Room', ratio: 0.12 },
    { name: 'Office', ratio: 0.15 },
    { name: 'Staff Room', ratio: 0.1 },
    { name: 'Customer WC', ratio: 0.06 },
    { name: 'Staff WC', ratio: 0.05 },
    { name: 'Circulation', ratio: 0.17 },
  ],
  office: [
    { name: 'Open Plan Office', ratio: 0.35 },
    { name: 'Private Office 1', ratio: 0.1 },
    { name: 'Private Office 2', ratio: 0.1 },
    { name: 'Meeting Room', ratio: 0.12 },
    { name: 'Kitchenette', ratio: 0.04 },
    { name: 'WC', ratio: 0.06 },
    { name: 'Reception', ratio: 0.06 },
    { name: 'Circulation', ratio: 0.17 },
  ],
  other: [
    { name: 'Main Hall', ratio: 0.3 },
    { name: 'Office', ratio: 0.12 },
    { name: 'Store Room', ratio: 0.1 },
    { name: 'Kitchenette', ratio: 0.06 },
    { name: 'WC', ratio: 0.06 },
    { name: 'Circulation', ratio: 0.16 },
    { name: 'Flex Space', ratio: 0.2 },
  ],
}

/**
 * Return the room program for a given building type.
 * Falls back to 'house' for unknown/empty types.
 */
export function getRoomProgram(type: string | undefined | null): RoomDef[] {
  if (type && ROOM_PROGRAMS[type]) {
    // TEMPORARY DEBUG — Sprint 39B
    console.log('[BT-DEBUG] getRoomProgram key =', type, 'FOUND in ROOM_PROGRAMS')
    return ROOM_PROGRAMS[type]
  }
  // TEMPORARY DEBUG — Sprint 39B
  console.log('[BT-DEBUG] getRoomProgram key =', type, 'NOT FOUND — falling back to house')
  return ROOM_PROGRAMS.house
}
