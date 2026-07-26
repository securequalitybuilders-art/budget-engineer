import type { ComplianceInput, ComplianceResult, ComplianceStatus } from './types'

function r(ruleId: string, title: string, status: ComplianceStatus, actual: string, required: string, note: string): ComplianceResult {
  return { ruleId, category: 'Typology-Specific', title, status, actual, required, note }
}

function getGfa(input: ComplianceInput): number {
  return input.design?.grossFloorArea ?? input.analysis?.areaSchedule?.grossFloorArea ?? 0
}

function getRoomsNamed(input: ComplianceInput, keywords: string[]): number {
  if (!input.plan?.rooms) return 0
  return input.plan.rooms.filter((r) => keywords.some((k) => r.name.toLowerCase().includes(k))).length
}

export function evaluateTypologyRules(input: ComplianceInput, prefix: string, jurisdictionLabel: string): ComplianceResult[] {
  const bt = (input.buildingType || 'house').toLowerCase()
  const gfa = getGfa(input)
  const suffix = `. Approximate — verify with local authority (${jurisdictionLabel}).`
  const results: ComplianceResult[] = []

  // ── Clinics / Hospitals ──
  if (['clinic', 'hospital', 'health-centre', 'surgery'].includes(bt)) {
    const consultationRooms = getRoomsNamed(input, ['consultation', 'exam', 'treatment'])
    results.push(r(
      `${prefix}-typo-clinic-01`, 'Consultation room minimum size',
      'warn', `${consultationRooms > 0 ? `${consultationRooms} consultation room(s)` : 'Not specified'}`, '≥ 12 m²',
      `Consultation/exam rooms should be minimum 12m². Ensure adequate space for examination bed, clinician, and wheelchair manoeuvrability${suffix}`
    ))
    results.push(r(
      `${prefix}-typo-clinic-02`, 'Wheelchair accessibility (clinic)',
      'warn', 'Clinic typology', 'All patient areas wheelchair accessible',
      `Clinic must have full wheelchair accessibility: 850mm doors, 1200mm corridors, accessible WC, and ramp access. Verify with building control${suffix}`
    ))
    results.push(r(
      `${prefix}-typo-clinic-03`, 'Clinical waste storage',
      'warn', 'Clinic typology', 'Dedicated clinical waste storage room',
      `Clinic requires a dedicated ventilated clinical waste storage room, separate from general waste. Verify with health authority${suffix}`
    ))
  }

  // ── Schools ──
  if (['school', 'college', 'creche', 'nursery', 'daycare', 'university'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-school-01`, 'Learner density / classroom size',
      'warn', gfa > 0 ? `${gfa.toFixed(0)} m² total` : 'Not specified', '≥ 1.1 m² per learner',
      `Classroom area should provide minimum 1.1m² per learner. Verify with education department${suffix}`
    ))
    results.push(r(
      `${prefix}-typo-school-02`, 'Classroom minimum width',
      'warn', 'Width data not in plan', '≥ 6.0 m',
      `Classrooms should have minimum 6.0m width to accommodate desks and teaching area. Verify with education department${suffix}`
    ))
  }

  // ── Hotels / Guesthouses ──
  if (['hotel', 'lodge', 'guesthouse', 'motel', 'inn'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-hotel-01`, 'Guest room minimum size',
      'warn', 'Guest room sizes not in plan', '≥ 12 m² (double) / ≥ 9 m² (single)',
      `Minimum guest room sizes: double/twin 12m², single 9m². En-suite bathroom additional. Verify with tourism authority${suffix}`
    ))
    results.push(r(
      `${prefix}-typo-hotel-02`, 'Car parking (hotel)',
      'warn', 'Parking layout not in plan', '≥ 1 bay per guest room',
      `Hotels typically require minimum 1 parking bay per guest room plus bus/coach parking. Verify with local municipality${suffix}`
    ))
  }

  // ── Retail ──
  if (['retail', 'shop', 'store', 'supermarket', 'mall'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-retail-01`, 'Fire exit spacing (retail)',
      'warn', gfa > 0 ? `${gfa.toFixed(0)} m² sales floor` : 'Not specified', 'Exit within 30m travel per 200m²',
      `Retail: fire exits required such that no point on sales floor is more than 30m travel distance from an exit. Verify with fire authority${suffix}`
    ))
  }

  // ── Warehouses / Industrial ──
  if (['warehouse', 'industrial', 'factory', 'workshop', 'storage'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-warehouse-01`, 'Warehouse clear height',
      'warn', gfa > 0 ? `${gfa.toFixed(0)} m² floor area` : 'Not specified', 'Clear height ≥ 6.0 m',
      `Warehouse/industrial: minimum clear height 6.0m (may vary by use). Fire sprinklers may be required above 12m. Verify with building control${suffix}`
    ))
  }

  // ── Places of Worship ──
  if (['church', 'mosque', 'temple', 'worship', 'chapel', 'hall'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-worship-01`, 'Exit width for assembly occupancy',
      'warn', 'Occupant data not in plan', '5 mm exit width per occupant (min 2 exits)',
      `Places of worship: total exit width = 5mm per occupant. Minimum 2 exits. Occupant load based on floor area at 0.5m²/person standing or 0.75m²/person seated. Verify with fire authority${suffix}`
    ))
  }

  // ── Restaurants / Food Service ──
  if (['restaurant', 'cafe', 'café', 'catering', 'food-court', 'bar'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-restaurant-01`, 'Commercial extraction hood',
      'warn', 'Kitchen extraction not in plan', 'Canopy hood with grease filter, ducted to outside',
      `Commercial kitchen requires canopy extraction hood with grease filters, ducted to external discharge. Fire-rated duct if passing through other compartments. Verify with building control${suffix}`
    ))
    results.push(r(
      `${prefix}-typo-restaurant-02`, 'Food preparation area separation',
      'warn', 'Kitchen layout not in plan', 'Separate food prep area from customer seating',
      `Food preparation must be separated from customer seating. Minimum 2-compartment sink, hand-wash basin, and adequate ventilation. Verify with health authority${suffix}`
    ))
  }

  // ── Apartments / Flats ──
  if (['apartment', 'flat', 'condo', 'townhouse'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-apartment-01`, 'Minimum apartment unit sizes',
      'warn', 'Unit sizes not in plan', 'Studio ≥ 25m², 1-bed ≥ 35m², 2-bed ≥ 50m²',
      `Minimum apartment sizes: studio 25m², 1-bedroom 35m², 2-bedroom 50m². Add 5m² for each additional bedroom. Verify with local by-laws${suffix}`
    ))
  }

  // ── Mixed-Use ──
  if (['mixed-use', 'mixed'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-mixed-01`, 'Fire separation between uses',
      'warn', 'Mixed-use building', 'FRL 60/60 fire separation between different uses',
      `Mixed-use buildings require minimum 60/60/60 fire separation (walls and floors) between different use groups (e.g., retail below residential). Verify with fire authority${suffix}`
    ))
  }

  // ── Petrol Stations / Fuel Retail ──
  if (['petrol-station', 'filling-station', 'fuel-retail', 'service-station'].includes(bt)) {
    results.push(r(
      `${prefix}-typo-petrol-01`, 'Road setback (petrol station)',
      'warn', 'Site boundary not in plan', '≥ 10 m from road reserve',
      `Petrol station: minimum 10m setback from road reserve boundary. Fuel tanks minimum 15m from buildings. Verify with petroleum inspectorate${suffix}`
    ))
  }

  // If no typology matched, add a note
  const knownTypes = ['clinic', 'hospital', 'school', 'hotel', 'retail', 'warehouse', 'church', 'restaurant', 'apartment', 'mixed-use', 'petrol-station', 'house', 'office', 'dwelling']
  if (!knownTypes.includes(bt)) {
    results.push(r(
      `${prefix}-typo-general-01`, `Building-specific checks for "${bt}"`,
      'warn', bt, 'Refer to jurisdiction-specific code',
      `Building type "${bt}" may have additional requirements not covered by generic rules. Verify with local authority${suffix}`
    ))
  }

  return results
}
