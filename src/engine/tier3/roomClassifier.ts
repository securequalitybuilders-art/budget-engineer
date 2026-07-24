export type RoomZone = 'public' | 'private' | 'service' | 'circulation'

export interface RoomClass {
  zone: RoomZone
  isWetCore: boolean
  minWidth: number
  minDepth: number
}

const ROOM_CLASSES: Record<string, RoomClass> = {
  // ── Residential ──
  'Master Bedroom':        { zone: 'private', isWetCore: false, minWidth: 3.5, minDepth: 4.0 },
  'Guest Bedroom':         { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Bedroom':               { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'En-suite':              { zone: 'service', isWetCore: true,  minWidth: 1.8, minDepth: 2.2 },
  'Guest WC':              { zone: 'service', isWetCore: true,  minWidth: 1.5, minDepth: 1.8 },
  'Bathroom':              { zone: 'service', isWetCore: true,  minWidth: 1.8, minDepth: 2.2 },
  'Kitchen':               { zone: 'service', isWetCore: true,  minWidth: 2.5, minDepth: 3.0 },
  'Laundry':               { zone: 'service', isWetCore: true,  minWidth: 1.8, minDepth: 2.0 },
  'Pantry':                { zone: 'service', isWetCore: true,  minWidth: 1.5, minDepth: 2.0 },
  'Living Room':           { zone: 'public',  isWetCore: false, minWidth: 3.5, minDepth: 4.0 },
  'Living / Dining':       { zone: 'public',  isWetCore: false, minWidth: 3.5, minDepth: 4.5 },
  'Dining Room':           { zone: 'public',  isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Lounge':                { zone: 'public',  isWetCore: false, minWidth: 3.5, minDepth: 4.0 },
  'Study':                 { zone: 'private', isWetCore: false, minWidth: 2.5, minDepth: 3.0 },
  'Playroom':              { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Verandah':              { zone: 'public',  isWetCore: false, minWidth: 1.8, minDepth: 3.0 },
  'Porch':                 { zone: 'public',  isWetCore: false, minWidth: 1.5, minDepth: 2.0 },
  'Garage':                { zone: 'service', isWetCore: false, minWidth: 3.0, minDepth: 5.5 },

  // ── Apartment / Multi-Unit ──
  'Studio Unit':           { zone: 'private', isWetCore: false, minWidth: 4.0, minDepth: 6.0 },
  'One-Bedroom Unit':      { zone: 'private', isWetCore: false, minWidth: 5.0, minDepth: 8.0 },
  'Two-Bedroom Unit':      { zone: 'private', isWetCore: false, minWidth: 6.0, minDepth: 10.0 },
  'Staircase / Lift Core': { zone: 'circulation', isWetCore: false, minWidth: 3.0, minDepth: 5.0 },
  'Common Corridor':       { zone: 'circulation', isWetCore: false, minWidth: 1.5, minDepth: 3.0 },

  // ── Clinic / Health ──
  'Consultation Room':     { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Treatment Room':        { zone: 'private', isWetCore: false, minWidth: 3.5, minDepth: 4.0 },
  'Reception':             { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Reception / Waiting':   { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Reception / Lobby':     { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Pharmacy / Dispensary': { zone: 'service', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Ward':                  { zone: 'private', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  'Operating Theatre':     { zone: 'private', isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Nurse Station':         { zone: 'service', isWetCore: false, minWidth: 2.5, minDepth: 3.0 },
  'Staff Room':            { zone: 'service', isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Laboratory':            { zone: 'service', isWetCore: false, minWidth: 3.5, minDepth: 4.5 },

  // ── School / Education ──
  'Classroom':             { zone: 'public',  isWetCore: false, minWidth: 6.0, minDepth: 7.5 },
  "Head's Office":         { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Library':               { zone: 'public',  isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Computer Lab':          { zone: 'public',  isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Science Lab':           { zone: 'public',  isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Assembly Hall':         { zone: 'public',  isWetCore: false, minWidth: 8.0, minDepth: 12.0 },
  'Toilet Block':          { zone: 'service', isWetCore: true,  minWidth: 3.0, minDepth: 4.0 },

  // ── Hotel / Hospitality ──
  'Guest Room':            { zone: 'private', isWetCore: false, minWidth: 3.5, minDepth: 5.5 },
  'Restaurant':            { zone: 'public',  isWetCore: false, minWidth: 6.0, minDepth: 8.0 },
  'Bar':                   { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  'Swimming Pool':         { zone: 'public',  isWetCore: false, minWidth: 6.0, minDepth: 12.0 },
  'Conference Room':       { zone: 'public',  isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Kitchen (Commercial)':  { zone: 'service', isWetCore: true,  minWidth: 4.0, minDepth: 5.0 },
  'Admin Office':          { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },

  // ── Office / Commercial ──
  'Open-Plan Office':      { zone: 'public',  isWetCore: false, minWidth: 6.0, minDepth: 8.0 },
  'Private Office':        { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Meeting Room':          { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Office':                { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Kitchenette':           { zone: 'service', isWetCore: true,  minWidth: 1.8, minDepth: 2.0 },

  // ── Retail / Shop ──
  'Sales Floor':           { zone: 'public',  isWetCore: false, minWidth: 5.0, minDepth: 8.0 },
  'Stock Room':            { zone: 'service', isWetCore: false, minWidth: 3.0, minDepth: 4.0 },
  'Display Area':          { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 5.0 },

  // ── Restaurant ──
  'Dining Area':           { zone: 'public',  isWetCore: false, minWidth: 5.0, minDepth: 7.0 },
  'Counter / Bar':         { zone: 'public',  isWetCore: false, minWidth: 2.0, minDepth: 4.0 },

  // ── Church / Worship ──
  'Main Hall / Sanctuary': { zone: 'public',  isWetCore: false, minWidth: 10.0, minDepth: 12.0 },
  'Main Hall':             { zone: 'public',  isWetCore: false, minWidth: 8.0, minDepth: 12.0 },
  'Sunday School Room':    { zone: 'private', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  "Pastor's Office":       { zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },

  // ── Warehouse / Industrial ──
  'Warehouse Floor':       { zone: 'public',  isWetCore: false, minWidth: 12.0, minDepth: 20.0 },
  'Loading Bay':           { zone: 'service', isWetCore: false, minWidth: 4.0, minDepth: 8.0 },

  // ── Community Hall ──
  'Stage / Platform':      { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 5.0 },

  // ── Market ──
  'Vendor Stall':          { zone: 'public',  isWetCore: false, minWidth: 2.0, minDepth: 3.0 },
  'Aisle / Corridor':      { zone: 'circulation', isWetCore: false, minWidth: 1.5, minDepth: 2.0 },

  // ── Petrol Station ──
  'Shop / Convenience':    { zone: 'public',  isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  'Fuel Bay (canopy)':     { zone: 'service', isWetCore: false, minWidth: 6.0, minDepth: 10.0 },
  'Car Wash':              { zone: 'service', isWetCore: true,  minWidth: 4.0, minDepth: 8.0 },

  // ── Mixed-Use ──
  'Ground Floor Shop':     { zone: 'public',  isWetCore: false, minWidth: 5.0, minDepth: 8.0 },
  'Upper Apartment':       { zone: 'private', isWetCore: false, minWidth: 5.0, minDepth: 8.0 },

  // ── Duplex ──
  'Stair Hall':            { zone: 'circulation', isWetCore: false, minWidth: 1.8, minDepth: 2.5 },

  // ── General ──
  'Store':                 { zone: 'service', isWetCore: false, minWidth: 2.0, minDepth: 2.5 },
  'Toilet':                { zone: 'service', isWetCore: true,  minWidth: 1.5, minDepth: 1.8 },
  'Toilet (Public)':       { zone: 'service', isWetCore: true,  minWidth: 2.0, minDepth: 2.5 },
  'Customer Toilet':       { zone: 'service', isWetCore: true,  minWidth: 1.8, minDepth: 2.2 },
  'Corridor':              { zone: 'circulation', isWetCore: false, minWidth: 1.2, minDepth: 2.0 },
  'Staircase':             { zone: 'circulation', isWetCore: false, minWidth: 2.5, minDepth: 4.0 },
}

const PREFIX_OVERRIDES: [string, string][] = [
  ['Reception / Waiting', 'Reception / Waiting'],
  ['Reception / Lobby', 'Reception / Lobby'],
  ['Reception', 'Reception'],
  ['Main Hall / Sanctuary', 'Main Hall / Sanctuary'],
  ['Main Hall', 'Main Hall'],
  ['Living / Dining', 'Living / Dining'],
  ['Living Room', 'Living Room'],
  ['Living', 'Living Room'],
  ['Master Bedroom', 'Master Bedroom'],
  ['Guest Bedroom', 'Guest Bedroom'],
  ['Guest Room', 'Guest Room'],
  ['Open-Plan Office', 'Open-Plan Office'],
  ['Open Plan Office', 'Open-Plan Office'],
  ['Private Office', 'Private Office'],
  ['Meeting Room', 'Meeting Room'],
  ['Consultation Room', 'Consultation Room'],
  ['Treatment Room', 'Treatment Room'],
  ['Sales Floor', 'Sales Floor'],
  ['Dining Area', 'Dining Area'],
  ['Dining Room', 'Dining Room'],
  ['Classroom', 'Classroom'],
  ['Staircase / Lift Core', 'Staircase / Lift Core'],
  ['Commercial Kitchen', 'Kitchen (Commercial)'],
  ['Kitchen (Commercial)', 'Kitchen (Commercial)'],
  ['Pharmacy / Dispensary', 'Pharmacy / Dispensary'],
  ['Sunday School Room', 'Sunday School Room'],
  ["Head's Office", "Head's Office"],
  ["Pastor's Office", "Pastor's Office"],
  ['Stage / Platform', 'Stage / Platform'],
  ['Shop / Convenience', 'Shop / Convenience'],
  ['Fuel Bay (canopy)', 'Fuel Bay (canopy)'],
  ['Fuel Bay', 'Fuel Bay (canopy)'],
  ['Car Wash', 'Car Wash'],
  ['Ground Floor Shop', 'Ground Floor Shop'],
  ['Upper Apartment', 'Upper Apartment'],
  ['Warehouse Floor', 'Warehouse Floor'],
  ['Loading Bay', 'Loading Bay'],
  ['Aisle / Corridor', 'Aisle / Corridor'],
  ['Vendor Stall', 'Vendor Stall'],
  ['Stair Hall', 'Stair Hall'],
  ['Common Corridor', 'Common Corridor'],
  ['One-Bedroom Unit', 'One-Bedroom Unit'],
  ['Two-Bedroom Unit', 'Two-Bedroom Unit'],
  ['Studio Unit', 'Studio Unit'],
  ['Toilet Block', 'Toilet Block'],
  ['Toilet (Public)', 'Toilet (Public)'],
  ['Customer Toilet', 'Customer Toilet'],
  ['Kitchenette', 'Kitchenette'],
  ['Kitchen', 'Kitchen'],
  ['Bathroom', 'Bathroom'],
  ['Bedroom', 'Bedroom'],
  ['Office', 'Office'],
  ['Store', 'Store'],
  ['Garage', 'Garage'],
  ['Toilet', 'Toilet'],
  ['Corridor', 'Corridor'],
  ['Staircase', 'Staircase'],
  ['Lounge', 'Lounge'],
  ['Laundry', 'Laundry'],
  ['Pantry', 'Pantry'],
  ['Verandah', 'Verandah'],
  ['Porch', 'Porch'],
  ['Study', 'Study'],
  ['Playroom', 'Playroom'],
  ['Lobby', 'Reception / Lobby'],
  ['Waiting', 'Reception / Waiting'],
  ['Dispensary', 'Pharmacy / Dispensary'],
  ['Admin', 'Admin Office'],
]

export function classifyRoom(name: string): RoomClass {
  const lookup = name.replace(/\s+\d+$/, '').trim()
  for (const [prefix, mapped] of PREFIX_OVERRIDES) {
    if (lookup === prefix) return ROOM_CLASSES[mapped]
  }
  for (const [prefix, mapped] of PREFIX_OVERRIDES) {
    if (lookup.startsWith(prefix)) return ROOM_CLASSES[mapped]
  }
  if (ROOM_CLASSES[lookup]) return ROOM_CLASSES[lookup]
  if (lookup.includes('Bedroom')) return ROOM_CLASSES['Bedroom']
  if (lookup.includes('Bathroom')) return ROOM_CLASSES['Bathroom']
  if (lookup.includes('Kitchen')) return ROOM_CLASSES['Kitchen']
  if (lookup.includes('Office')) return ROOM_CLASSES['Office']
  if (lookup.includes('Store')) return ROOM_CLASSES['Store']
  if (lookup.includes('Toilet')) return ROOM_CLASSES['Toilet']
  if (lookup.includes('Corridor') || lookup.includes('Hall') || lookup.includes('Aisle')) return ROOM_CLASSES['Corridor']
  if (lookup.includes('Classroom')) return ROOM_CLASSES['Classroom']
  if (lookup.includes('Reception')) return ROOM_CLASSES['Reception']
  return { zone: 'private', isWetCore: false, minWidth: 2.0, minDepth: 2.0 }
}
