import type { ReferenceCase, ReferenceCaseSummary } from './referenceCaseModel';
import type { ValidationDomain } from '@/lib/validation/validationEngine';

const CASES: ReferenceCase[] = [
  {
    id: 'ref-single-house',
    name: 'Single-Storey Residential (3BR House)',
    typology: 'house',
    storeyProfile: 'single-storey',
    workflowScope: ['brief-to-plan', 'drawing-pack', 'boq-cost-estimation', 'code-compliance-check', 'package-export'],
    description: 'A single-storey 3-bedroom house with living, dining, kitchen, bathroom, and covered patio. The simplest and most well-tested typology in the platform.',
    projectIntent: 'Demonstrate core brief-to-plan, drawing generation, and BOQ costing for a basic residential project. This is the baseline reference case for capability assessment.',
    expectedOutputs: [
      { output: 'Floor plan with room labels and dimensions', calibration: 'confirmed-behavior', note: 'Consistently generated across all test variants.' },
      { output: 'Roof plan (flat or pitched)', calibration: 'confirmed-behavior', note: 'Both flat and pitched roof variants tested.' },
      { output: 'Elevations (front, rear, sides)', calibration: 'confirmed-behavior', note: 'Generated from building volume extrusion.' },
      { output: 'Section (main cut)', calibration: 'confirmed-behavior', note: 'Single section through main living area.' },
      { output: 'Foundation / slab plan', calibration: 'heuristic-output', note: 'Generated from wall layout; foundation depth is assumed.' },
      { output: 'Door and window schedule', calibration: 'confirmed-behavior', note: 'Extracted directly from opening data.' },
      { output: 'Site context plot', calibration: 'assumed-value', note: 'Site boundary and building footprint shown; terrain and orientation data are assumed defaults.' },
      { output: 'BOQ with regional rates', calibration: 'heuristic-output', note: 'Quantities from model geometry; rates from regional rate cards; verification against local QS estimates recommended.' },
      { output: 'Room schedule with finishes', calibration: 'confirmed-behavior', note: 'Rooms and assigned finishes from programme data.' },
    ],
    validationLinks: [
      { domain: 'geometry-validity', benchmarkRefs: ['bm-plan-1'], expectedOutcome: 'Pass — validated across 3BR house benchmark', calibration: 'confirmed-behavior' },
      { domain: 'programme-layout-validity', benchmarkRefs: ['bm-plan-1'], expectedOutcome: 'Pass — room adjacency and sizes verified', calibration: 'confirmed-behavior' },
      { domain: 'drawing-documentation-completeness', benchmarkRefs: ['bm-plan-1'], expectedOutcome: 'Pass — all required drawing types generated', calibration: 'confirmed-behavior' },
      { domain: 'boq-procurement-linkage-integrity', benchmarkRefs: ['bm-boq-1'], expectedOutcome: 'Pass — quantities linked to rate card items', calibration: 'heuristic-output' },
      { domain: 'package-completeness', benchmarkRefs: ['bm-plan-1'], expectedOutcome: 'Pass — export package includes model, BOQ, schedule, manifest', calibration: 'confirmed-behavior' },
      { domain: 'human-review-required', benchmarkRefs: ['bm-code-1'], expectedOutcome: 'Warning — code compliance is jurisdiction-aware but requires professional review', calibration: 'confirmed-behavior' },
    ],
    pilotReadiness: {
      expectedTier: 'pilot-deployment',
      supervisionContext: 'Ready for supervised pilot deployment on single-storey residential projects. All outputs should be reviewed by a qualified professional before use.',
      knownRisks: ['BOQ rates may differ from local market', 'Foundation design is heuristic, not engineered', 'Code compliance checks cover only southern African jurisdictions', 'No structural calcs — wall/roof sizing is empirical'],
      supervisionRequirements: ['Registered architect or architectural technologist must review all drawings', 'Quantity surveyor should verify BOQ against local rates', 'Structural engineer must verify foundation and roof structure', 'Code compliance officer must confirm jurisdiction-specific checks'],
    },
    humanReviewAreas: [
      { area: 'Structural adequacy of walls and roof', why: 'Wall and roof sizing is heuristic, not based on structural analysis', severity: 'mandatory' },
      { area: 'Code compliance (zoning, building regulations)', why: 'Compliance checks are jurisdiction-scoped and may miss local by-laws', severity: 'mandatory' },
      { area: 'BOQ rates and quantities', why: 'Rates are from regional cards, not local supplier quotes', severity: 'recommended' },
      { area: 'Site context and orientation', why: 'Site analysis is basic; solar orientation and wind effects not modelled', severity: 'recommended' },
      { area: 'Door and window sizes', why: 'Generated from standards; may not suit specific client needs', severity: 'informational' },
    ],
    knownLimitations: [
      { area: 'Structural design', description: 'No structural engineering analysis. Wall thicknesses and foundation sizes are heuristic defaults.', impact: 'high', status: 'open' },
      { area: 'Code compliance scope', description: 'Compliance checks cover ZBC, SANS 10400, Zambia, Botswana only. Other jurisdictions not supported.', impact: 'high', status: 'open' },
      { area: 'Terrain modelling', description: 'Site terrain detection is basic. Steep slopes or retaining walls are not automatically handled.', impact: 'medium', status: 'open' },
      { area: 'Custom room shapes', description: 'Rooms are generated as rectangular footprints. Non-rectangular rooms require manual CAD editing.', impact: 'medium', status: 'workaround-available' },
    ],
    notes: 'This is the highest-confidence reference case. Single-storey residential is the most tested typology across all pipeline stages.',
  },
  {
    id: 'ref-villa-2-storey',
    name: 'Multi-Storey Residential (4BR Villa, 2-Storey)',
    typology: 'villa',
    storeyProfile: 'two-storey',
    workflowScope: ['brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'structural-pre-design', 'boq-cost-estimation', 'code-compliance-check', 'package-export'],
    description: 'A two-storey 4-bedroom villa with ground-floor living areas, first-floor bedrooms, internal stair, and balcony. Tests multi-storey planning, vertical circulation, and structural bridging.',
    projectIntent: 'Validate multi-storey workflow including stair planning, floor-specific programmes, vertical structural continuity, and storey-differentiated drawing sets.',
    expectedOutputs: [
      { output: 'Ground-floor plan (living, kitchen, dining, guest WC, stair)', calibration: 'confirmed-behavior', note: 'Generated with ground-floor-specific programme.' },
      { output: 'First-floor plan (4 bedrooms, bathrooms, balcony, stair)', calibration: 'confirmed-behavior', note: 'Upper-floor layout distinct from ground.' },
      { output: 'Roof plan', calibration: 'confirmed-behavior', note: 'Roof generated from upper-floor footprint.' },
      { output: 'Elevations (4 sides, multi-storey)', calibration: 'confirmed-behavior', note: 'Volumes stacked with floor-level annotations.' },
      { output: 'Section through stair and floor levels', calibration: 'heuristic-output', note: 'Stair section is schematic; verify headroom and landing dimensions.' },
      { output: 'Structural grid with column layout', calibration: 'assumed-value', note: 'Grid generated from wall intersections; column sizing is assumed, not engineered.' },
      { output: 'Slab edge plan per floor', calibration: 'heuristic-output', note: 'Slab edges derived from wall layout; thickness is assumed.' },
      { output: 'BOQ with multi-storey quantities', calibration: 'heuristic-output', note: 'Quantities aggregated across floors with separate storey take-offs.' },
    ],
    validationLinks: [
      { domain: 'geometry-validity', benchmarkRefs: ['bm-plan-2', 'bm-structural-1'], expectedOutcome: 'Pass — multi-storey geometry validated', calibration: 'confirmed-behavior' },
      { domain: 'programme-layout-validity', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — floor-specific programmes verified', calibration: 'confirmed-behavior' },
      { domain: 'drawing-documentation-completeness', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — floor-differentiated drawing sets generated', calibration: 'confirmed-behavior' },
      { domain: 'boq-procurement-linkage-integrity', benchmarkRefs: ['bm-boq-1'], expectedOutcome: 'Pass — storey-tagged quantities', calibration: 'heuristic-output' },
      { domain: 'lifecycle-workflow-continuity', benchmarkRefs: ['bm-delivery-1'], expectedOutcome: 'Pass — lifecycle stages track across floors', calibration: 'confirmed-behavior' },
      { domain: 'human-review-required', benchmarkRefs: ['bm-review-1', 'bm-code-1'], expectedOutcome: 'Warning — stair and structural assumptions need professional review', calibration: 'confirmed-behavior' },
    ],
    pilotReadiness: {
      expectedTier: 'supervised-professional',
      supervisionContext: 'Suitable for supervised professional use. Stair planning, structural assumptions, and floor-level code compliance require qualified reviewer attention.',
      knownRisks: ['Stair rise/run is heuristic and may not meet local building code', 'Structural column and slab sizing is not engineered', 'Floor-to-floor height is assumed from brief; verify', 'Vertical wet-stack alignment is assumed from room adjacencies'],
      supervisionRequirements: ['Architect or architectural technologist must verify stair dimensions and headroom', 'Structural engineer must verify column layout, slab thickness, and foundation loads', 'Code compliance officer must check storey-specific egress requirements', 'Quantity surveyor should review multi-storey quantities separately per floor'],
    },
    humanReviewAreas: [
      { area: 'Stair design (rise, run, headroom, landing)', why: 'Stair geometry is heuristic and may not comply with local building regulations', severity: 'mandatory' },
      { area: 'Structural column and slab sizing', why: 'No structural analysis; sizes are empirical defaults', severity: 'mandatory' },
      { area: 'Floor-to-floor height and vertical circulation', why: 'Assumed from brief; may need adjustment for services or accessibility', severity: 'recommended' },
      { area: 'Code compliance per storey', why: 'Egress, fire resistance, and accessibility requirements differ by floor', severity: 'mandatory' },
      { area: 'Vertical wet-stack alignment', why: 'Bathroom and WC stacking is inferred from programme, not explicitly designed', severity: 'recommended' },
    ],
    knownLimitations: [
      { area: 'Stair design', description: 'Stair geometry is generated heuristically. Rise/run ratios and landing dimensions must be verified against local building codes.', impact: 'high', status: 'open' },
      { area: 'Structural analysis', description: 'No structural engineering analysis. Column, slab, and foundation sizing is heuristic.', impact: 'high', status: 'open' },
      { area: 'Vertical service coordination', description: 'MEP routing between floors is not modelled. Only wet-stack alignment is inferred.', impact: 'medium', status: 'open' },
      { area: 'Elevation detail', description: 'Multi-storey elevations show basic volumes and openings but lack architectural detailing (cornices, cladding junctions, weatherproofing).', impact: 'medium', status: 'open' },
    ],
    notes: 'Two-storey residential is the second most-tested typology. The multi-storey planning workflow is validated for up to 5 storeys.',
  },
  {
    id: 'ref-duplex',
    name: 'Duplex / Semi-Detached (2 Units)',
    typology: 'duplex',
    storeyProfile: 'two-storey',
    workflowScope: ['brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'boq-cost-estimation', 'code-compliance-check', 'package-export'],
    description: 'A two-storey duplex with mirrored units sharing a party wall. Each unit has ground-floor living and first-floor bedrooms. Tests party wall logic, mirrored layout, and shared-services coordination.',
    projectIntent: 'Demonstrate semi-detached typology support including party wall generation, mirrored unit layouts, shared roof, and unit-separated BOQ.',
    expectedOutputs: [
      { output: 'Unit A and Unit B ground-floor plans (mirrored)', calibration: 'confirmed-behavior', note: 'Mirrored layout with party wall at centre.' },
      { output: 'Unit A and Unit B first-floor plans (mirrored)', calibration: 'confirmed-behavior', note: 'Upper-floor bedrooms mirrored across party wall.' },
      { output: 'Party wall section detail', calibration: 'heuristic-output', note: 'Party wall shown as double-wall construction; fire-rating annotation is assumed.' },
      { output: 'Shared roof plan', calibration: 'confirmed-behavior', note: 'Roof spans both units.' },
      { output: 'Unit-separated BOQ', calibration: 'heuristic-output', note: 'Quantities separated per unit with shared-elements allocation heuristic.' },
      { output: 'Elevations (front duplex facade)', calibration: 'confirmed-behavior', note: 'Combined elevation showing both units.' },
    ],
    validationLinks: [
      { domain: 'geometry-validity', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — duplex geometry validated across test variants', calibration: 'confirmed-behavior' },
      { domain: 'programme-layout-validity', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — mirrored programme layout verified', calibration: 'confirmed-behavior' },
      { domain: 'boq-procurement-linkage-integrity', benchmarkRefs: ['bm-boq-1'], expectedOutcome: 'Marginal — unit separation of shared costs is heuristic', calibration: 'heuristic-output' },
      { domain: 'package-completeness', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — export includes unit-separated data', calibration: 'confirmed-behavior' },
      { domain: 'human-review-required', benchmarkRefs: ['bm-code-1'], expectedOutcome: 'Warning — party wall fire-rating and sound insulation assumptions', calibration: 'confirmed-behavior' },
    ],
    pilotReadiness: {
      expectedTier: 'supervised-professional',
      supervisionContext: 'Suitable for supervised professional use on duplex projects. Party wall design and shared-services allocation need professional review.',
      knownRisks: ['Party wall fire-rating and acoustic performance are assumed, not calculated', 'Shared roof drainage assumptions may need civil engineering input', 'Unit-boundary utility metering is not modelled', 'Mirrored layout may not account for site slope or access differences'],
      supervisionRequirements: ['Architect must verify party wall meets local fire and acoustic regulations', 'Quantity surveyor should adjust shared-cost allocation method', 'Civil/structural engineer must verify shared roof and foundation design', 'Code compliance officer must check semi-detached-specific regulations'],
    },
    humanReviewAreas: [
      { area: 'Party wall fire-rating and acoustic performance', why: 'Fire-rating and sound insulation are assumed defaults, not verified against code', severity: 'mandatory' },
      { area: 'Shared roof drainage and structure', why: 'Roof design assumes symmetrical loading; drainage fall is heuristic', severity: 'recommended' },
      { area: 'Shared services and metering', why: 'Utility separation between units is not modelled', severity: 'recommended' },
      { area: 'Site boundary and access', why: 'Mirrored layout does not account for site-specific access or slope', severity: 'informational' },
    ],
    knownLimitations: [
      { area: 'Party wall design', description: 'Fire-rating, acoustic performance, and structural continuity of party wall are assumed. Must be verified against local codes.', impact: 'high', status: 'open' },
      { area: 'Shared services', description: 'Shared utility infrastructure (water, sewer, electrical) not modelled. Metering strategy is not generated.', impact: 'medium', status: 'open' },
      { area: 'Site-specific adaptation', description: 'Mirrored layout assumes a level, rectangular site. Sloped or irregular sites require manual adjustment.', impact: 'medium', status: 'workaround-available' },
    ],
    notes: 'Duplex support was explicitly added during typology expansion. Party wall logic is unique to this typology.',
  },
  {
    id: 'ref-apartment-5-storey',
    name: 'Apartment (5-Storey, Core+Lift)',
    typology: 'apartment',
    storeyProfile: 'multi-storey-3-5',
    workflowScope: ['brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'structural-pre-design', 'boq-cost-estimation', 'code-compliance-check', 'package-export'],
    description: 'A 5-storey apartment building with central core (lift, stair, services), 4 units per floor, and ground-floor lobby. Tests vertical core planning, repeated floor layouts, and multi-unit coordination.',
    projectIntent: 'Validate high-density multi-storey workflow including core design, repeated floor typologies, vertical service routing, and multi-unit BOQ.',
    expectedOutputs: [
      { output: 'Ground-floor plan (lobby, core, 2 units)', calibration: 'confirmed-behavior', note: 'Ground floor has distinct programme from upper floors.' },
      { output: 'Typical floor plan (4 units, core)', calibration: 'confirmed-behavior', note: 'Repeated floor with mirrored unit pairs around core.' },
      { output: 'Core section (lift, stair, services)', calibration: 'unverified-before-construction', note: 'Core layout is generated; lift, stair, and fire compliance must be independently verified before construction.' },
      { output: 'Structural grid with core shear walls', calibration: 'heuristic-output', note: 'Grid aligned to core and unit partitions; lateral system assumed.' },
      { output: 'Slab edge and party floor plan', calibration: 'heuristic-output', note: 'Slab edges per floor; floor buildup is assumed.' },
      { output: 'Multi-unit BOQ with shared-elements breakdown', calibration: 'heuristic-output', note: 'Unit and common-area quantities separated.' },
    ],
    validationLinks: [
      { domain: 'geometry-validity', benchmarkRefs: ['bm-plan-2', 'bm-structural-1'], expectedOutcome: 'Pass — apartment geometry validated', calibration: 'confirmed-behavior' },
      { domain: 'programme-layout-validity', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — core+unit layout verified', calibration: 'confirmed-behavior' },
      { domain: 'drawing-documentation-completeness', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — floor-differentiated drawings generated', calibration: 'confirmed-behavior' },
      { domain: 'boq-procurement-linkage-integrity', benchmarkRefs: ['bm-boq-1'], expectedOutcome: 'Marginal — shared-element quantity allocation is heuristic', calibration: 'heuristic-output' },
      { domain: 'lifecycle-workflow-continuity', benchmarkRefs: ['bm-delivery-1'], expectedOutcome: 'Pass — lifecycle stages accommodate multi-phase construction', calibration: 'confirmed-behavior' },
      { domain: 'human-review-required', benchmarkRefs: ['bm-review-1', 'bm-code-1'], expectedOutcome: 'Warning — core compliance and structural assumptions need professional review', calibration: 'confirmed-behavior' },
    ],
    pilotReadiness: {
      expectedTier: 'supervised-professional',
      supervisionContext: 'Suitable for supervised professional use on apartment projects up to 5 storeys. Core design, structural system, and multi-unit BOQ require qualified reviewer attention.',
      knownRisks: ['Core design (lift, stair, services shaft) is heuristic', 'Structural lateral system is assumed, not analysed', 'Unit mix and sizes are derived from brief, not market analysis', 'Vertical services coordination is not explicitly modelled', 'Fire compliance (compartmentation, egress) is assumed'],
      supervisionRequirements: ['Architect must verify core dimensions, stair compliance, and lift sizing', 'Structural engineer must verify lateral load system and foundation design', 'Fire engineer must review compartmentation and egress strategy', 'Quantity surveyor should adjust unit-specific and common-area cost allocation', 'Code compliance officer must check multi-storey fire and access requirements'],
    },
    humanReviewAreas: [
      { area: 'Core design (lift, stair, service shaft dimensions)', why: 'Core layout is heuristic; lift car size and stair compliance depend on local codes', severity: 'mandatory' },
      { area: 'Structural lateral system', why: 'Shear wall and core structural role is assumed, not verified by analysis', severity: 'mandatory' },
      { area: 'Fire compliance and egress', why: 'Fire rating, compartment sizes, and escape routes are not explicitly modelled', severity: 'mandatory' },
      { area: 'Vertical service routing', why: 'MEP, water, and waste riser coordination is not generated', severity: 'mandatory' },
      { area: 'Unit mix and accessibility', why: 'Unit distribution is from brief; accessible unit requirements not automatically addressed', severity: 'recommended' },
    ],
    knownLimitations: [
      { area: 'Core design', description: 'Lift, stair, and services core layout is heuristic. Does not guarantee compliance with local building codes for fire, accessibility, or lift standards.', impact: 'high', status: 'open' },
      { area: 'Structural lateral system', description: 'Lateral load path (wind/seismic) is not analysed. Shear wall placement is heuristic.', impact: 'high', status: 'open' },
      { area: 'Vertical services coordination', description: 'MEP risers, wet stacks, and service ducts are not explicitly routed through the core.', impact: 'high', status: 'open' },
      { area: 'Fire engineering', description: 'No fire compartmentation analysis, egress calculation, or smoke control modelling.', impact: 'high', status: 'open' },
      { area: 'Basement / parking', description: 'Below-grade parking or basement levels are not generated.', impact: 'medium', status: 'open' },
    ],
    notes: 'Apartment buildings up to 5 storeys have been benchmark tested. Core planning is the most significant open limitation for this typology.',
  },
  {
    id: 'ref-mixed-use',
    name: 'Mixed-Use (Retail Podium + Residential Upper)',
    typology: 'mixed-use',
    storeyProfile: 'multi-storey-3-5',
    workflowScope: ['brief-to-plan', 'multi-storey-planning', 'drawing-pack', 'structural-pre-design', 'boq-cost-estimation', 'code-compliance-check', 'package-export'],
    description: 'A mixed-use building with ground-floor retail (2-3 tenancies), first-floor office/consulting, and upper-floor residential units. Tests separated circulation, mixed programme coordination, and use-specific code requirements.',
    projectIntent: 'Demonstrate mixed-use typology with distinct ground-floor commercial and upper-floor residential programmes, separated circulation cores, and use-specific drawing and BOQ outputs.',
    expectedOutputs: [
      { output: 'Ground-floor retail plan (tenancy shells, core)', calibration: 'confirmed-behavior', note: 'Retail tenancies with separate entrance and service core.' },
      { output: 'First-floor office/consulting plan', calibration: 'confirmed-behavior', note: 'Commercial programme distinct from retail below.' },
      { output: 'Upper-floor residential plans', calibration: 'confirmed-behavior', note: 'Residential units with separate residential core.' },
      { output: 'Separated circulation diagram', calibration: 'heuristic-output', note: 'Commercial and residential cores shown; compliance is assumed.' },
      { output: 'Ground-floor structural grid (retail spans)', calibration: 'heuristic-output', note: 'Column grid accommodates retail spans; sizing is heuristic.' },
      { output: 'Use-separated BOQ', calibration: 'heuristic-output', note: 'Retail, office, and residential quantities separated.' },
    ],
    validationLinks: [
      { domain: 'geometry-validity', benchmarkRefs: ['bm-plan-2', 'bm-structural-1'], expectedOutcome: 'Pass — mixed-use geometry validated', calibration: 'confirmed-behavior' },
      { domain: 'programme-layout-validity', benchmarkRefs: ['bm-plan-2'], expectedOutcome: 'Pass — mixed programme layout verified', calibration: 'confirmed-behavior' },
      { domain: 'boq-procurement-linkage-integrity', benchmarkRefs: ['bm-boq-1'], expectedOutcome: 'Marginal — use-based quantity separation is heuristic', calibration: 'heuristic-output' },
      { domain: 'human-review-required', benchmarkRefs: ['bm-review-1', 'bm-code-1'], expectedOutcome: 'Warning — mixed-use code compliance (mixed occupancy, fire separation) requires professional review', calibration: 'confirmed-behavior' },
      { domain: 'lifecycle-workflow-continuity', benchmarkRefs: ['bm-delivery-1'], expectedOutcome: 'Pass — lifecycle accommodates phased delivery', calibration: 'confirmed-behavior' },
    ],
    pilotReadiness: {
      expectedTier: 'internal-only',
      supervisionContext: 'Limited to internal evaluation. Mixed-use compliance (mixed occupancy, fire separation, access) requires extensive professional review beyond what the platform can provide.',
      knownRisks: ['Mixed-occupancy fire separation is not modelled', 'Commercial and residential access requirements differ significantly', 'Retail tenancy fit-out is not included', 'Structural grid for retail spans is heuristic', 'Parking requirements not calculated'],
      supervisionRequirements: ['Architect must verify occupancy separation and mixed-use compliance', 'Fire engineer must review compartmentation', 'Structural engineer must verify long-span retail structural grid', 'Quantity surveyor should use-separate cost plans manually', 'Code compliance officer must check mixed-use zoning requirements'],
    },
    humanReviewAreas: [
      { area: 'Mixed-occupancy fire separation', why: 'Fire rating between commercial and residential zones is assumed, not verified', severity: 'mandatory' },
      { area: 'Separated access and circulation', why: 'Commercial and residential access compliance is heuristic', severity: 'mandatory' },
      { area: 'Structural grid for retail spans', why: 'Long-span retail grid sizing is heuristic; no structural verification', severity: 'mandatory' },
      { area: 'Zoning and land-use compliance', why: 'Mixed-use zoning requirements are jurisdiction-specific and not modelled', severity: 'mandatory' },
      { area: 'Parking and service access', why: 'Parking requirements and service vehicle access are not calculated', severity: 'recommended' },
    ],
    knownLimitations: [
      { area: 'Mixed occupancy compliance', description: 'Fire separation, access, and egress for mixed commercial/residential occupancies are not modelled.', impact: 'high', status: 'open' },
      { area: 'Retail tenancy design', description: 'Retail spaces are generated as basic shells. Tenant fit-out, storefront design, and signage are not included.', impact: 'medium', status: 'open' },
      { area: 'Parking design', description: 'Parking requirements and parking layout are not generated.', impact: 'high', status: 'open' },
      { area: 'Commercial structural spans', description: 'Retail and office floor spans are heuristic. Long-span structural requirements are not verified.', impact: 'medium', status: 'open' },
      { area: 'Service vehicle access', description: 'Delivery access, refuse collection, and fire truck access are not modelled.', impact: 'medium', status: 'open' },
    ],
    notes: 'Mixed-use is the most complex currently-supported typology. The separated-circulation workflow exists but compliance gaps are significant. Known weakness: mixed-use ground floor.',
  },
  {
    id: 'ref-clinic',
    name: 'Small Institutional / Commercial (Clinic)',
    typology: 'clinic',
    storeyProfile: 'single-storey',
    workflowScope: ['brief-to-plan', 'drawing-pack', 'boq-cost-estimation', 'code-compliance-check', 'package-export'],
    description: 'A single-storey medical clinic with reception, waiting area, consultation rooms, treatment room, nurse station, pharmacy, and staff areas. Tests non-residential programme with specialised room types.',
    projectIntent: 'Validate non-residential typology support with specialised programme types, accessibility requirements, and institutional-scale drawing outputs.',
    expectedOutputs: [
      { output: 'Floor plan with clinical room labels', calibration: 'confirmed-behavior', note: 'Clinic-specific room types (consultation, treatment, pharmacy) generated.' },
      { output: 'Elevations (clinic facade)', calibration: 'confirmed-behavior', note: 'Institutional-scale elevations with appropriate door/window placement.' },
      { output: 'Section through treatment areas', calibration: 'confirmed-behavior', note: 'Section showing clinical room layout.' },
      { output: 'Accessibility annotation', calibration: 'heuristic-output', note: 'Accessible route shown; compliance details are assumed.' },
      { output: 'BOQ with institutional rates', calibration: 'heuristic-output', note: 'Institutional quantities; rates may not reflect specialised medical fit-out costs.' },
    ],
    validationLinks: [
      { domain: 'geometry-validity', benchmarkRefs: ['bm-plan-1'], expectedOutcome: 'Pass — clinic geometry validated through typology generator', calibration: 'confirmed-behavior' },
      { domain: 'programme-layout-validity', benchmarkRefs: ['bm-plan-1'], expectedOutcome: 'Pass — clinical programme layout verified', calibration: 'confirmed-behavior' },
      { domain: 'boq-procurement-linkage-integrity', benchmarkRefs: ['bm-boq-1'], expectedOutcome: 'Marginal — institutional BOQ may miss specialised medical items', calibration: 'heuristic-output' },
      { domain: 'drawing-documentation-completeness', benchmarkRefs: ['bm-plan-1'], expectedOutcome: 'Pass — clinical drawings generated', calibration: 'confirmed-behavior' },
      { domain: 'human-review-required', benchmarkRefs: ['bm-code-1'], expectedOutcome: 'Warning — healthcare facility compliance (accessibility, infection control) needs professional review', calibration: 'confirmed-behavior' },
    ],
    pilotReadiness: {
      expectedTier: 'internal-only',
      supervisionContext: 'Limited to internal evaluation. Clinic typology generates correct layouts but healthcare compliance, infection control, and specialised fit-out are beyond platform scope.',
      knownRisks: ['Healthcare compliance (infection control, sterile zones) is not modelled', 'Medical fit-out and specialised equipment not included', 'Accessibility requirements for healthcare are jurisdiction-specific', 'Pharmacy and controlled-substance storage not addressed', 'Emergency egress for healthcare occupancy is assumed'],
      supervisionRequirements: ['Healthcare architect must review clinical layout and workflow', 'Infection control specialist must verify zoning and finishes', 'Code compliance officer must check healthcare-specific regulations', 'Quantity surveyor must supplement BOQ with specialised medical items'],
    },
    humanReviewAreas: [
      { area: 'Clinical workflow and room adjacencies', why: 'Medical workflow requirements (sterile vs non-sterile separation) are not modelled', severity: 'mandatory' },
      { area: 'Healthcare compliance', why: 'Infection control, medical gas, and specialised ventilation are not addressed', severity: 'mandatory' },
      { area: 'Accessibility for patients and staff', why: 'Healthcare accessibility requirements exceed basic building code minimums', severity: 'mandatory' },
      { area: 'Specialised fit-out and equipment', why: 'Medical fitting-out (exam lights, sinks, cabinetry) is not generated', severity: 'recommended' },
    ],
    knownLimitations: [
      { area: 'Healthcare compliance', description: 'Infection control, sterile zones, medical gas, and specialised ventilation are not modelled.', impact: 'high', status: 'open' },
      { area: 'Medical fit-out', description: 'Specialised medical equipment, cabinetry, and clinical fitting-out are not included.', impact: 'high', status: 'open' },
      { area: 'Specialised room types', description: 'Some clinical room types (e.g., operating theatre, radiology) require manual CAD configuration.', impact: 'medium', status: 'workaround-available' },
      { area: 'BOQ for medical items', description: 'Medical-specific BOQ items (sinks, scrub stations, medical gas outlets) are not included in rate cards.', impact: 'high', status: 'open' },
    ],
    notes: 'Clinic typology was added during typology expansion. It demonstrates non-residential capability but has significant healthcare-specific compliance gaps. Best used for feasibility-stage layout.',
  },
];

export function getReferenceCases(): ReferenceCase[] {
  return CASES;
}

export function getReferenceCaseById(id: string): ReferenceCase | undefined {
  return CASES.find(c => c.id === id);
}

export function getCasesByTypology(typology: string): ReferenceCase[] {
  return CASES.filter(c => c.typology === typology);
}

export function getCasesByStoreyProfile(profile: string): ReferenceCase[] {
  return CASES.filter(c => c.storeyProfile === profile);
}

export function getCoverageSummary(): ReferenceCaseSummary[] {
  return CASES.map(createCaseSummary);
}

function createCaseSummary(c: ReferenceCase): ReferenceCaseSummary {
  const confirmedCount = c.expectedOutputs.filter(o => o.calibration === 'confirmed-behavior').length;
  const totalOutputs = c.expectedOutputs.length;
  const coverageScore = totalOutputs > 0 ? Math.round((confirmedCount / totalOutputs) * 100) : 0;

  const weakDomains: ValidationDomain[] = [];
  for (const link of c.validationLinks) {
    if (link.expectedOutcome.toLowerCase().includes('warning') || link.expectedOutcome.toLowerCase().includes('marginal')) {
      weakDomains.push(link.domain);
    }
  }

  const mandatoryReview = c.humanReviewAreas.filter(h => h.severity === 'mandatory');

  const hasSignificantRisk = c.knownLimitations.some(l => l.impact === 'high' && l.status === 'open');
  const isCommerciallyReady = coverageScore >= 50 && !hasSignificantRisk;

  const recommendedFor: string[] = [];
  const notRecommendedFor: string[] = [];

  if (isCommerciallyReady || coverageScore >= 60) {
    recommendedFor.push('Feasibility studies and concept design');
    recommendedFor.push('Preliminary cost estimation');
    recommendedFor.push('Design option comparison');
  }
  if (coverageScore >= 50) {
    recommendedFor.push('Drawing documentation (reviewed by professional)');
  }

  if (hasSignificantRisk || coverageScore < 50) {
    notRecommendedFor.push('Construction-ready documentation');
    notRecommendedFor.push('Unsupervised professional use');
    notRecommendedFor.push('Regulatory submission without professional review');
  }

  if (mandatoryReview.length > 3) {
    notRecommendedFor.push('Fast-track projects without dedicated review capacity');
  }

  return {
    caseId: c.id,
    caseName: c.name,
    typology: c.typology,
    storeyProfile: c.storeyProfile,
    coverageScore,
    readinessTier: c.pilotReadiness.expectedTier,
    humanReviewCount: mandatoryReview.length,
    limitationCount: c.knownLimitations.length,
    weakDomains: [...new Set(weakDomains)],
    recommendedFor,
    notRecommendedFor,
  };
}
