export type DetailCategory =
  | 'wall-sections'
  | 'foundations'
  | 'roof-details'
  | 'openings'
  | 'stairs'
  | 'waterproofing'

export interface DetailDimension {
  label: string
  value: string
}

export interface ConstructionDetail {
  id: string
  category: DetailCategory
  title: string
  description: string
  scale: string
  dimensions: DetailDimension[]
  constructionNotes: string[]
}

const WALL_SECTIONS: ConstructionDetail[] = [
  {
    id: 'cavity-wall',
    category: 'wall-sections',
    title: 'Cavity Wall — External',
    description: 'Standard SADC external cavity wall: 90mm face brick outer leaf, 50mm air gap with cavity insulation, 140mm concrete block inner leaf, 15mm internal plaster.',
    scale: '1:10',
    dimensions: [
      { label: 'Total thickness', value: '295 mm' },
      { label: 'Face brick outer leaf', value: '90 mm' },
      { label: 'Cavity + insulation', value: '50 mm' },
      { label: 'Concrete block inner', value: '140 mm' },
      { label: 'Internal plaster', value: '15 mm' },
      { label: 'Max unsupported height', value: '3.6 m' },
    ],
    constructionNotes: [
      'Galvanised wall ties at 450mm centres vertically, 900mm horizontally.',
      'Weep holes every 900mm at lintel level with damp-proof course.',
      'Cavity insulation: 50mm rigid fibreglass or EPS board.',
      'Reinforced concrete lintels over all openings with 150mm bearing each side.',
    ],
  },
  {
    id: 'solid-masonry',
    category: 'wall-sections',
    title: 'Solid Masonry — Internal / Boundary',
    description: 'SADC 230mm solid masonry wall in cement mortar, suitable for internal load-bearing or boundary walls up to 3.0m height.',
    scale: '1:10',
    dimensions: [
      { label: 'Wall thickness', value: '230 mm' },
      { label: 'Brick size (SADC standard)', value: '222 × 106 × 73 mm' },
      { label: 'Mortar joint', value: '10 mm' },
      { label: 'Both faces plaster', value: '15 mm each' },
      { label: 'Max height (unreinforced)', value: '3.0 m' },
    ],
    constructionNotes: [
      'Use 1:6 cement–sand mortar for general work; 1:3 for below DPC.',
      'Reinforced concrete ring beam at floor and roof levels.',
      'Quoin reinforcement in corners and at openings greater than 1.8m.',
      'Damp-proof course at 150mm above finished ground level.',
    ],
  },
  {
    id: 'timber-frame',
    category: 'wall-sections',
    title: 'Timber Frame — External',
    description: 'Light timber frame wall with weatherboard cladding, breathable membrane, 140mm insulation between studs, vapour barrier, and 13mm fire-rated plasterboard.',
    scale: '1:10',
    dimensions: [
      { label: 'Total thickness', value: '270 mm' },
      { label: 'Weatherboard cladding', value: '20 mm' },
      { label: 'Cavity batten + membrane', value: '25 mm' },
      { label: 'Timber stud (insulated)', value: '140 mm' },
      { label: 'Vapour barrier', value: '0.2 mm' },
      { label: 'Fire-rated plasterboard', value: '13 mm' },
      { label: 'Stud spacing', value: '600 mm centres' },
    ],
    constructionNotes: [
      'Timber studs: SADC S5 structural pine, 38×140mm, treated H3.1.',
      'Nogging at mid-height for lateral restraint.',
      'Breathable membrane on outer face; vapour barrier on warm side.',
      'Nogs at opening jambs for architrave fixing.',
    ],
  },
]

const FOUNDATIONS: ConstructionDetail[] = [
  {
    id: 'strip-footing',
    category: 'foundations',
    title: 'Strip Footing — Single Storey',
    description: 'Reinforced concrete strip footing for load-bearing masonry walls on firm soil (bearing capacity ≥ 150 kPa). Typical for single-storey SADC residential.',
    scale: '1:20',
    dimensions: [
      { label: 'Footing width', value: '600 mm' },
      { label: 'Footing depth', value: '250 mm' },
      { label: 'Concrete strength', value: '25 MPa' },
      { label: 'Main reinforcement', value: 'Y12 @ 200 c/c' },
      { label: 'Distribution steel', value: 'Y10 @ 300 c/c' },
      { label: 'Cover to reinforcement', value: '50 mm' },
    ],
    constructionNotes: [
      'Excavate to undisturbed soil, minimum 500mm below finished ground level.',
      'Blinding layer: 75mm lean mix concrete (7 MPa).',
      'Start masonry 150mm above finished ground level on 2 courses of engineering brick.',
      'Weep holes in first brick course at 1.2m centres above DPC.',
    ],
  },
  {
    id: 'raft-slab',
    category: 'foundations',
    title: 'Raft Foundation — Slab on Grade',
    description: 'Reinforced concrete raft slab for poor soil conditions or where differential settlement must be minimised. Edge beam with mesh-reinforced slab.',
    scale: '1:20',
    dimensions: [
      { label: 'Slab thickness', value: '150 mm' },
      { label: 'Edge beam depth', value: '400 mm' },
      { label: 'Edge beam width', value: '300 mm' },
      { label: 'Concrete strength', value: '30 MPa' },
      { label: 'Slab reinforcement', value: 'Y10 @ 200 c/c both ways' },
      { label: 'Edge beam reinforcement', value: '4 × Y12 + stirrups R8 @ 250' },
      { label: 'Polystyrene void former', value: '50 mm' },
    ],
    constructionNotes: [
      'Compact sub-grade to 93% Mod AASHTO density.',
      '150mm well-graded crushed stone base layer beneath slab.',
      '0.2mm DPM beneath slab with taped laps.',
      'Edge beam projects 150mm above finished slab level for brickwork start.',
      'Polystyrene void former around perimeter for differential movement.',
    ],
  },
]

const ROOF_DETAILS: ConstructionDetail[] = [
  {
    id: 'tiled-roof',
    category: 'roof-details',
    title: 'Clay / Concrete Tiled Roof — Pitched',
    description: 'Tiled roof on timber trusses at 25°–30° pitch with sarking, battens, and ridge/hip capping. Suitable for SADC Class A (moderate) exposure.',
    scale: '1:20',
    dimensions: [
      { label: 'Truss spacing', value: '600–900 mm c/c' },
      { label: 'Roof pitch', value: '25°–30°' },
      { label: 'Tile size (concrete)', value: '420 × 330 mm' },
      { label: 'Tile batten', value: '38 × 38 mm @ 300 mm centres' },
      { label: 'Sarking / underlay', value: 'Reflective foil + breather' },
      { label: 'Overhang (eaves)', value: '450 mm' },
      { label: 'Ridge capping', value: 'Preformed concrete / clay' },
    ],
    constructionNotes: [
      'Trusses: SADC S5 pine, treated H3.2, stress grade F5.',
      'Ceiling tie-off with 90mm round wire nails (galvanised).',
      'Tile lap: 75mm minimum head lap (100mm for exposure > Class A).',
      'Ridge and hip capping bedded in 1:3 cement mortar with wire tie at every second course.',
      'Eaves gutter: 150mm half-round PVC with downpipe at every 12m.',
    ],
  },
  {
    id: 'metal-roof',
    category: 'roof-details',
    title: 'Metal Sheet Roof — IBR / Corrugated',
    description: 'IBR profiled metal sheeting on cold-formed purlins over steel portal frame or timber trusses. Minimal pitch 5°, standard 10° for residential.',
    scale: '1:20',
    dimensions: [
      { label: 'Purlin spacing', value: '1.2–1.5 m c/c' },
      { label: 'Minimum roof pitch', value: '5° (IBR); 10° (corrugated)' },
      { label: 'Sheet gauge', value: '0.47 mm (0.5 mm BMT)' },
      { label: 'Side lap', value: '1½ ribs (IBR); 2 corrugations' },
      { label: 'End lap', value: '150 mm' },
      { label: 'Screw fixing spacing', value: 'Every 2nd rib @ eaves/ridge; 4th rib mid' },
    ],
    constructionNotes: [
      'Screws with EPDM washers at every second rib at eaves and ridge; every fourth rib elsewhere.',
      'All screw fixings into purlin centre line; never into bridging or nogging.',
      'Flashings at ridge, valley, hip, and abutments: 0.6mm galvanised steel.',
      'Insulation: 100mm glasswool blanket between purlins with reflective foil facing down.',
      'No sarking required for metal roof; a vapour-permeable membrane is recommended above heated spaces.',
    ],
  },
  {
    id: 'flat-roof',
    category: 'roof-details',
    title: 'Flat Roof — Warm Deck',
    description: 'Warm deck flat roof on reinforced concrete slab with tapered insulation, high-performance waterproof membrane, and gravel ballast / protective screed.',
    scale: '1:20',
    dimensions: [
      { label: 'Concrete slab', value: '150 mm reinforced' },
      { label: 'Vapour control layer', value: '0.2 mm' },
      { label: 'Tapered PIR insulation', value: '120 mm (min) – 200 mm (max)' },
      { label: 'Waterproof membrane', value: 'PVC / TPO 1.5 mm' },
      { label: 'Protective screed / gravel', value: '50 mm' },
      { label: 'Minimum fall', value: '1:60 (1.67%)' },
    ],
    constructionNotes: [
      'Parapet upstand: membrane turned up 150mm minimum above finished roof level.',
      'DPC to all upstands; sealant bead at change of direction.',
      'Rainwater outlets at low points with 100mm diameter downpipes.',
      'Insulation board fixed with polyurethane adhesive; boards staggered.',
      'Expansion joints at maximum 15m intervals in both directions.',
    ],
  },
]

const OPENINGS: ConstructionDetail[] = [
  {
    id: 'window-head-sill',
    category: 'openings',
    title: 'Window Head and Sill Detail',
    description: 'Standard window opening in cavity masonry with reinforced concrete lintel at head, pre-cast sill, and DPC cavity tray. Suitable for SADC residential.',
    scale: '1:10',
    dimensions: [
      { label: 'Lintel bearing each side', value: '150 mm min' },
      { label: 'Lintel depth', value: '150 mm (4 × Y12 + R8 stirrups)' },
      { label: 'Cavity tray width', value: 'Equal to cavity + 50 mm' },
      { label: 'Sill projection', value: '30 mm beyond face brick' },
      { label: 'Sill thickness', value: '40 mm pre-cast concrete' },
      { label: 'Weep hole spacing above lintel', value: '450 mm c/c' },
    ],
    constructionNotes: [
      'Cavity tray installed 2 courses above lintel; turned up 150mm in cavity.',
      'Weep holes at 450mm centres above cavity tray on outer leaf.',
      'Window frame fixed with galvanised masonry anchors at 600mm centres.',
      'Sealant between frame and masonry on all sides; backer rod for deep joints.',
      'Sill to have 15° drip groove underside to prevent water tracking.',
    ],
  },
  {
    id: 'door-opening',
    category: 'openings',
    title: 'Door Opening in Masonry Wall',
    description: 'Standard door opening in internal/external masonry with reinforced concrete lintel, door frame anchors, and DPC at threshold.',
    scale: '1:10',
    dimensions: [
      { label: 'Lintel bearing', value: '150 mm each side' },
      { label: 'Lintel depth', value: '100 mm (2 × Y12 + Y6 stirrups)' },
      { label: 'Door frame size (typical)', value: '813 × 2032 mm or 926 × 2134 mm' },
      { label: 'Frame anchor spacing', value: '600 mm c/c vertical' },
      { label: 'Threshold upstand', value: '25 mm (external); flush (internal)' },
    ],
    constructionNotes: [
      'Frame anchors: galvanised steel crimped anchors cast into mortar joints.',
      'Jamb reinforcement at each side of opening — 2 × Y12 starter bars.',
      'Threshold DPC under door frame for external openings; turned up 50mm.',
      'Architrave: 19 × 65 mm S5 pine fixed to frame, not to wall.',
      'Fire doors require intumescent seals and self-closing devices.',
    ],
  },
]

const STAIRS: ConstructionDetail[] = [
  {
    id: 'rc-stair',
    category: 'stairs',
    title: 'Reinforced Concrete Staircase',
    description: 'Cast in-situ reinforced concrete stair with waist slab, landing, and handrails. Designed for SADC residential with standard rise/going ratio.',
    scale: '1:25',
    dimensions: [
      { label: 'Riser height', value: '175 mm' },
      { label: 'Going (tread depth)', value: '250 mm' },
      { label: 'Waist slab thickness', value: '150 mm' },
      { label: 'Flight width (clear)', value: '900 mm' },
      { label: 'Main reinforcement', value: 'Y12 @ 150 c/c' },
      { label: 'Distribution steel', value: 'Y10 @ 250 c/c' },
      { label: 'Landing thickness', value: '150 mm' },
      { label: 'Handrail height', value: '900 mm above pitch line' },
    ],
    constructionNotes: [
      'Maximum 16 risers per flight before intermediate landing.',
      'Rise × going formula: 2R + G = 600 ± 20 mm.',
      'Slip-resistant nosing to all treads (non-slip insert or groove).',
      'Handrail continuous through landing; graspable diameter 40–50 mm.',
      'Kerb reinforcement at outer edge of waist slab for lateral restraint.',
    ],
  },
  {
    id: 'timber-stair',
    category: 'stairs',
    title: 'Timber Staircase — Cut String',
    description: 'Timber cut-string stair with pine treads and risers, housed into stringers, with balustrade and handrail. Suitable for SADC residential interiors.',
    scale: '1:25',
    dimensions: [
      { label: 'Riser height', value: '180 mm' },
      { label: 'Going (tread depth)', value: '240 mm' },
      { label: 'Stringer size', value: '50 × 250 mm S5 pine' },
      { label: 'Tread thickness', value: '38 mm' },
      { label: 'Riser thickness', value: '19 mm' },
      { label: 'Flight width (clear)', value: '860 mm' },
      { label: 'Handrail height', value: '900 mm' },
      { label: 'Newel post size', value: '75 × 75 mm' },
    ],
    constructionNotes: [
      'Riser housed into stringer with wedge fixing; glued and screwed from underside.',
      'Tread glued to riser and screwed through riser into underside of tread (pocket holes).',
      'Balusters: 19 × 19 mm square section at 100mm maximum centres.',
      'Open risers: gap not to exceed 100mm for safety compliance.',
      'Timber treatment: H3.1 for interior; H4 for exterior stairs.',
    ],
  },
]

const WATERPROOFING: ConstructionDetail[] = [
  {
    id: 'basement-tanking',
    category: 'waterproofing',
    title: 'Basement Tanking — Type A (Barrier)',
    description: 'External waterproofing of below-grade concrete retaining walls using liquid-applied membrane, protection board, and drainage composite. Type A (barrier) system per SADC standards.',
    scale: '1:20',
    dimensions: [
      { label: 'RC retaining wall thickness', value: '300 mm' },
      { label: 'Liquid membrane (min DFT)', value: '2.0 mm' },
      { label: 'Protection board', value: '6 mm fibre-cement' },
      { label: 'Drainage composite', value: '20 mm dimpled sheet' },
      { label: 'Granular backfill', value: '300 mm free-draining' },
      { label: 'Perimeter drain pipe', value: '100 mm perforated' },
    ],
    constructionNotes: [
      'Wall construction joint: 200 × 3 mm PVC waterstop at all construction joints.',
      'Membrane applied in 2 coats (1.0 mm DFT each) with staggered laps.',
      'Protection board fixed with membrane-compatible adhesive; joints taped.',
      'Drainage composite wrapped in geotextile to prevent silt ingress.',
      'Perimeter drain falls to sump at 1:100 minimum; sump pump duty 2 L/s.',
      'All penetrations through membrane must have flanged puddle flanges cast into concrete.',
    ],
  },
]

export const CONSTRUCTION_DETAILS: ConstructionDetail[] = [
  ...WALL_SECTIONS,
  ...FOUNDATIONS,
  ...ROOF_DETAILS,
  ...OPENINGS,
  ...STAIRS,
  ...WATERPROOFING,
]

export const DETAIL_CATEGORIES: { key: DetailCategory; label: string }[] = [
  { key: 'wall-sections', label: 'Wall Sections' },
  { key: 'foundations', label: 'Foundations' },
  { key: 'roof-details', label: 'Roof Details' },
  { key: 'openings', label: 'Openings' },
  { key: 'stairs', label: 'Stairs' },
  { key: 'waterproofing', label: 'Waterproofing' },
]

export function getDetailsByCategory(category: DetailCategory): ConstructionDetail[] {
  return CONSTRUCTION_DETAILS.filter((d) => d.category === category)
}

export function getDetailById(id: string): ConstructionDetail | undefined {
  return CONSTRUCTION_DETAILS.find((d) => d.id === id)
}
