import type { ConstructionPhase } from '@/domain/construction'

export const ROUGH_IN_PHASE: ConstructionPhase = {
  id: 'rough-in',
  title: 'Rough-in & Infrastructure',
  description: 'First-fix of all mechanical, electrical, and plumbing services before wall and floor finishes are applied.',
  trade: 'MEP / Plumbing / Electrical',
  estimatedDays: 14,
  workItems: [
    { id: 'ri-water-supply', label: 'Water supply pipework', description: 'Run copper/PEX pipes from mains to all fixtures', unit: 'point', quantity: 8, material: 'Copper 15mm / PEX 16mm', spec: 'BS EN 1057 / ASTM F876', status: 'pending' },
    { id: 'ri-drain-waste', label: 'DWV pipework', description: 'Soil, waste, and vent stacks to all WCs, basins, showers', unit: 'point', quantity: 6, material: 'PVC-U 110mm / 50mm', spec: 'BS EN 1329 / SANS 1091', status: 'pending' },
    { id: 'ri-electrical-conduit', label: 'Electrical conduits', description: 'Conduits for power, lighting, data, and TV points', unit: 'point', quantity: 34, material: 'PVC 20mm / 25mm conduit', spec: 'SANS 10142 / IEC 60364', status: 'pending' },
    { id: 'ri-hvac-duct', label: 'HVAC ductwork', description: 'Supply and return air ducts, insulation, and registers', unit: 'run', quantity: 7, material: 'Galvanised steel duct / flexible duct', spec: 'SANS 10400-O / ASHRAE', status: 'pending' },
    { id: 'ri-gas-line', label: 'Gas supply line', description: 'Gas pipe from bottle/mains to hob and geyser', unit: 'run', quantity: 1, material: 'Copper 22mm / flexible gas hose', spec: 'SANS 10087 / BS 6891', status: 'pending' },
    { id: 'ri-stormwater', label: 'Stormwater drainage', description: 'Downpipes, gullys, and stormwater connections', unit: 'point', quantity: 4, material: 'PVC-U 160mm', spec: 'BS EN 12056 / SANS 10400-P', status: 'pending' },
    { id: 'ri-water-heater', label: 'Water heater rough-in', description: 'Hot and cold connections, T&P relief, drip tray', unit: 'each', quantity: 1, material: 'Copper 15mm, T&P valve', spec: 'SANS 10106 / AS/NZS 3500', status: 'pending' },
  ],
  materials: [
    { name: 'Copper pipe 15mm', spec: 'BS EN 1057 R250 half-hard', application: 'Hot and cold water supply' },
    { name: 'PVC-U pipe 110mm', spec: 'BS EN 1329 class S25', application: 'Soil and waste drainage' },
    { name: 'PVC conduit 20mm', spec: 'SANS 10142 heavy duty', application: 'Electrical wiring' },
    { name: 'Galvanised steel duct', spec: 'SMACNA class A, 0.6mm', application: 'HVAC supply/return air' },
  ],
  bom: [
    { item: 'Copper pipe 15mm', spec: 'BS EN 1057', unit: 'lm', qty: 60, notes: 'Includes fittings and lagging' },
    { item: 'PVC-U pipe 110mm', spec: 'BS EN 1329', unit: 'lm', qty: 24, notes: 'Includes couplings and bends' },
    { item: 'PVC conduit 20mm', spec: 'SANS 10142', unit: 'lm', qty: 120, notes: 'With junction boxes' },
    { item: 'Galvanised duct 600x300', spec: 'SMACNA A', unit: 'lm', qty: 18, notes: 'Insulated, with diffusers' },
    { item: 'T&P relief valve', spec: 'SANS 10106', unit: 'each', qty: 1, notes: 'For water heater' },
    { item: 'Gas flex hose 22mm', spec: 'SANS 10087', unit: 'lm', qty: 6, notes: 'Includes regulator' },
  ],
}

export const SUBSTRATES_PHASE: ConstructionPhase = {
  id: 'substrates',
  title: 'Substrates & Enclosures',
  description: 'Wall plastering, waterproofing, tile backing, and ceiling substrates. All services are chased into walls and made good.',
  trade: 'Plastering / Waterproofing / Ceilings',
  estimatedDays: 10,
  workItems: [
    { id: 'su-wall-plaster', label: 'Wall plastering', description: 'Cement:sand render on all internal masonry walls', unit: 'm²', quantity: 180, material: '1:4 cement:sand + SBR bond', spec: 'SANS 2001-CM1 / BS EN 998-1', status: 'pending' },
    { id: 'su-ceiling-board', label: 'Ceiling boarding', description: 'Fix ceiling boards to joists or furring channels', unit: 'm²', quantity: 80, material: '6mm cement board / 12mm plasterboard', spec: 'SANS 2001-CB1 / BS EN 520', status: 'pending' },
    { id: 'su-waterproof-wet', label: 'Wet area waterproofing', description: 'Liquid membrane to shower, bathroom, and laundry floors', unit: 'm²', quantity: 35, material: 'Acrylic liquid membrane 1.5mm DFT', spec: 'SANS 10024 / AS 3740', status: 'pending' },
    { id: 'su-tile-backing', label: 'Tile backer board', description: 'Cement board to shower walls before tiling', unit: 'm²', quantity: 18, material: '6mm cement tile backer', spec: 'BS EN 13279 / ASTM C1288', status: 'pending' },
    { id: 'su-chase-making', label: 'Service chase making-good', description: 'Fill and finish chases for pipes, conduits, and ducts', unit: 'lm', quantity: 45, material: '1:3 cement:sand + acrylic', spec: 'As per wall plaster spec', status: 'pending' },
    { id: 'su-beads-angles', label: 'Corner beads and stop beads', description: 'Galvanised beads to all external corners and stop ends', unit: 'lm', quantity: 60, material: 'Galvanised steel 25mm', spec: 'BS EN 13658-1', status: 'pending' },
    { id: 'su-screed', label: 'Floor screeding', description: 'Sand-cement screed to receive floor finishes', unit: 'm²', quantity: 80, material: '1:4 cement:sand, 50mm thick', spec: 'SANS 2001-SC1 / BS EN 13813', status: 'pending' },
  ],
  materials: [
    { name: 'Cement plaster 1:4', spec: 'SANS 2001-CM1 class II', application: 'Internal wall rendering' },
    { name: 'Cement board 6mm', spec: 'BS EN 13279, fire-rated A1', application: 'Ceilings and tile backing' },
    { name: 'Acrylic liquid membrane', spec: 'SANS 10024, 1.5mm DFT', application: 'Wet area waterproofing' },
    { name: 'Galvanised bead 25mm', spec: 'BS EN 13658-1', application: 'Corner and stop beads' },
  ],
  bom: [
    { item: 'Cement plaster 1:4', spec: 'SANS 2001-CM1', unit: 'm²', qty: 180, notes: '18mm thick average' },
    { item: 'Cement board 6mm', spec: 'BS EN 13279', unit: 'm²', qty: 98, notes: 'Ceilings + backer' },
    { item: 'Acrylic membrane', spec: 'SANS 10024', unit: 'm²', qty: 35, notes: '1.5mm DFT, 2 coats' },
    { item: 'Galvanised bead', spec: 'BS EN 13658', unit: 'lm', qty: 60, notes: '25mm stop/corner' },
    { item: 'Floor screed 1:4', spec: 'SANS 2001-SC1', unit: 'm²', qty: 80, notes: '50mm thick' },
  ],
}

export const MILLWORK_PHASE: ConstructionPhase = {
  id: 'millwork',
  title: 'Primary Millwork & Fixtures',
  description: 'Base and wall cabinet installation, countertops, sink fitting, and tile backsplash in kitchen and wet areas.',
  trade: 'Joinery / Kitchen / Plumbing',
  estimatedDays: 8,
  workItems: [
    { id: 'mw-base-cabs', label: 'Base cabinet installation', description: 'Install kitchen base cabinets, level and fix to wall', unit: 'lm', quantity: 6, material: 'Marine ply 18mm + melamine finish', spec: 'SANS 10160 / NIBO standard', status: 'pending' },
    { id: 'mw-wall-cabs', label: 'Wall cabinet installation', description: 'Install wall cabinets at datum height', unit: 'lm', quantity: 4, material: 'Marine ply 18mm + melamine', spec: 'SANS 10160 / NIBO standard', status: 'pending' },
    { id: 'mw-countertop', label: 'Countertop fitting', description: 'Measure, cut, and fit countertop with sink cutout', unit: 'lm', quantity: 6, material: 'Granite 20mm / Quartz 20mm', spec: 'SANS 10160 / BS 5385', status: 'pending' },
    { id: 'mw-sink-fix', label: 'Sink and tap fitting', description: 'Mount sink, connect waste and water supply', unit: 'each', quantity: 1, material: 'Under-mount stainless steel sink 1.5mm', spec: 'BS EN 13310 / SANS 10252', status: 'pending' },
    { id: 'mw-backsplash', label: 'Tile backsplash', description: 'Ceramic tile backsplash behind countertop', unit: 'm²', quantity: 4, material: 'Ceramic tile 300x600mm, white', spec: 'BS EN 14411 / SANS 10252', status: 'pending' },
    { id: 'mw-drawer-slide', label: 'Drawer and door adjustment', description: 'Fit soft-close slides, hinges, and adjust alignment', unit: 'each', quantity: 12, material: 'Soft-close runners, concealed hinges', spec: 'BS EN 15570 / DIN 68857', status: 'pending' },
    { id: 'mw-cabinet-trim', label: 'Coving and trim', description: 'Fix scribe strips, cornice, plinth, and light valance', unit: 'lm', quantity: 12, material: 'MDF primed / PVC trim', spec: 'As per cabinet finish', status: 'pending' },
  ],
  materials: [
    { name: 'Marine ply 18mm', spec: 'SANS 10160, WBP bond, B/BB grade', application: 'Cabinet carcasses' },
    { name: 'Granite slab 20mm', spec: 'SANS 10160, polished finish', application: 'Kitchen countertops' },
    { name: 'Stainless steel sink', spec: 'BS EN 13310, grade 304, 1.5mm', application: 'Kitchen sink' },
    { name: 'Ceramic tile 300x600', spec: 'BS EN 14411 group BIII', application: 'Backsplash' },
  ],
  bom: [
    { item: 'Marine ply 18mm', spec: 'SANS 10160', unit: 'sheet', qty: 6, notes: 'Melamine faced both sides' },
    { item: 'Granite countertop', spec: 'SANS 10160', unit: 'lm', qty: 6, notes: 'Polished, 20mm, with edge profile' },
    { item: 'Under-mount sink', spec: 'BS EN 13310', unit: 'each', qty: 1, notes: '1.5mm 304 stainless' },
    { item: 'Ceramic tile 300x600', spec: 'BS EN 14411', unit: 'm²', qty: 4, notes: 'White gloss, backsplash' },
    { item: 'Soft-close hinges', spec: 'BS EN 15570', unit: 'pair', qty: 10, notes: 'Concealed, 110° opening' },
    { item: 'Drawer slides', spec: 'DIN 68857', unit: 'pair', qty: 6, notes: 'Soft-close, 450mm' },
  ],
}

export const FINISHES_PHASE: ConstructionPhase = {
  id: 'finishes',
  title: 'Finishes',
  description: 'Floor tiling, wooden flooring, painting, skirting, architraves. Done after millwork and heavy cabinet installation to protect finishes.',
  trade: 'Tiling / Flooring / Painting',
  estimatedDays: 12,
  workItems: [
    { id: 'fn-floor-tile', label: 'Floor tiling (wet areas)', description: 'Porcelain tile to bathrooms, kitchen, and laundry', unit: 'm²', quantity: 45, material: 'Porcelain tile 600x600mm, rectified', spec: 'BS EN 14411 group BIa / SANS 10252', status: 'pending' },
    { id: 'fn-floor-wood', label: 'Wooden floor laying', description: 'Engineered wood floor to living, dining, and bedrooms', unit: 'm²', quantity: 55, material: 'Engineered oak 14mm, brushed + lacquered', spec: 'BS EN 14342 / SANS 10007', status: 'pending' },
    { id: 'fn-painting', label: 'Wall and ceiling painting', description: 'Prime, fill, and two coats of emulsion to all walls and ceilings', unit: 'm²', quantity: 340, material: 'Matt emulsion / satinwood trim', spec: 'SANS 10023 / BS 4800', status: 'pending' },
    { id: 'fn-skirting', label: 'Skirting installation', description: 'Fix MDF skirting to all walls, mitred at corners', unit: 'lm', quantity: 85, material: 'MDF primed 100x12mm', spec: 'SANS 10007 / as per arch detail', status: 'pending' },
    { id: 'fn-architrave', label: 'Architrave and door casing', description: 'Fix architraves around all door openings', unit: 'each', quantity: 12, material: 'MDF primed 70x12mm', spec: 'SANS 10007 / as per arch detail', status: 'pending' },
    { id: 'fn-tile-grout', label: 'Grouting and sealant', description: 'Epoxy grout to all tiled areas, silicone sealant at movement joints', unit: 'm²', quantity: 50, material: 'Epoxy grout / neutral-cure silicone', spec: 'BS EN 13888 / BS 6213', status: 'pending' },
    { id: 'fn-feature-wall', label: 'Feature wall / accent', description: 'Paint feature wall in accent colour or apply wallpaper', unit: 'each', quantity: 2, material: 'Accent emulsion / non-woven wallpaper', spec: 'As per interior design spec', status: 'pending' },
  ],
  materials: [
    { name: 'Porcelain tile 600x600', spec: 'BS EN 14411 BIa, rectified, PEI 4', application: 'Wet area floors' },
    { name: 'Engineered oak 14mm', spec: 'BS EN 14342, 3-ply, UV lacquered', application: 'Living / bedroom floors' },
    { name: 'Matt emulsion', spec: 'SANS 10023, Class 1 scrub', application: 'Walls and ceilings' },
    { name: 'MDF skirting 100x12', spec: 'SANS 10007, primed', application: 'Perimeter skirting' },
  ],
  bom: [
    { item: 'Porcelain tile 600x600', spec: 'BS EN 14411 BIa', unit: 'm²', qty: 50, notes: 'Includes 10% wastage' },
    { item: 'Engineered oak 14mm', spec: 'BS EN 14342', unit: 'm²', qty: 60, notes: 'Includes underlay + wastage' },
    { item: 'Matt emulsion paint', spec: 'SANS 10023', unit: 'ltr', qty: 30, notes: '2 coats, Class 1' },
    { item: 'MDF skirting 100x12', spec: 'SANS 10007', unit: 'lm', qty: 90, notes: 'Primed, primed nails' },
    { item: 'Epoxy grout', spec: 'BS EN 13888', unit: 'kg', qty: 10, notes: 'Wide joint 3-10mm' },
    { item: 'MDF architrave 70x12', spec: 'SANS 10007', unit: 'lm', qty: 36, notes: 'Primed, for 12 doors' },
  ],
}

export const APPLIANCES_PHASE: ConstructionPhase = {
  id: 'appliances',
  title: 'Appliances & Staging',
  description: 'Installation of all kitchen and laundry appliances, final electrical connections, and home staging accessories.',
  trade: 'Electrical / Kitchen / Home Staging',
  estimatedDays: 5,
  workItems: [
    { id: 'ap-oven', label: 'Oven installation', description: 'Built-in electric oven, connect to power, test', unit: 'each', quantity: 1, material: 'Built-in electric oven 600mm', spec: 'IEC 60335 / SANS 10142, 2.5kW', status: 'pending' },
    { id: 'ap-hob', label: 'Hob installation', description: 'Gas hob with flexible connection and flame safety', unit: 'each', quantity: 1, material: 'Gas hob 4-burner stainless', spec: 'SANS 10087 / BS 5440, 8kW', status: 'pending' },
    { id: 'ap-extractor', label: 'Extractor hood installation', description: 'Canopy extractor with duct to exterior or recirculation', unit: 'each', quantity: 1, material: 'Canopy extractor 600mm, 650m³/h', spec: 'BS EN 13141 / SANS 10400-O', status: 'pending' },
    { id: 'ap-fridge', label: 'Fridge / freezer', description: 'Position and connect water/ice supply if applicable', unit: 'each', quantity: 1, material: 'Built-in fridge/freezer 1770mm', spec: 'IEC 60335 / energy rating A++', status: 'pending' },
    { id: 'ap-dishwasher', label: 'Dishwasher connection', description: 'Slide under counter, connect water supply and drain', unit: 'each', quantity: 1, material: 'Built-in dishwasher 600mm', spec: 'SANS 10252 / IEC 60335, 1.8kW', status: 'pending' },
    { id: 'ap-washing', label: 'Washing machine connection', description: 'Connect hot/cold supply, drain hose, and power', unit: 'each', quantity: 1, material: 'Front-loader 8kg', spec: 'SANS 10252 / IEC 60335, 2.0kW', status: 'pending' },
    { id: 'ap-lighting-fin', label: 'Final lighting and accessories', description: 'Install light fittings, dimmers, smart switches, doorbells', unit: 'point', quantity: 8, material: 'LED downlights / smart switches', spec: 'SANS 10142 / IEC 60598', status: 'pending' },
  ],
  materials: [
    { name: 'Built-in electric oven', spec: 'IEC 60335, 2.5kW, A+ energy', application: 'Kitchen cooking' },
    { name: 'Gas hob 4-burner', spec: 'SANS 10087, BS 5440, 8kW total', application: 'Kitchen cooking' },
    { name: 'Canopy extractor 600mm', spec: 'BS EN 13141, 650m³/h, 48dB', application: 'Kitchen ventilation' },
    { name: 'Built-in dishwasher 600mm', spec: 'IEC 60335, 1.8kW, A++', application: 'Kitchen cleaning' },
  ],
  bom: [
    { item: 'Built-in oven', spec: 'IEC 60335', unit: 'each', qty: 1, notes: '600mm, electric, 2.5kW' },
    { item: 'Gas hob', spec: 'SANS 10087', unit: 'each', qty: 1, notes: '4-burner, stainless, 8kW' },
    { item: 'Canopy extractor', spec: 'BS EN 13141', unit: 'each', qty: 1, notes: '600mm, 650m³/h' },
    { item: 'Built-in fridge/', spec: 'IEC 60335', unit: 'each', qty: 1, notes: '1770mm, A++' },
    { item: 'Built-in dishwasher', spec: 'IEC 60335', unit: 'each', qty: 1, notes: '600mm, 1.8kW' },
    { item: 'Washing machine', spec: 'IEC 60335', unit: 'each', qty: 1, notes: '8kg front-loader' },
    { item: 'LED downlight', spec: 'IEC 60598', unit: 'each', qty: 8, notes: '6W, 4000K, dimmable' },
  ],
}

export const PHASES: Record<string, ConstructionPhase> = {
  'rough-in': ROUGH_IN_PHASE,
  substrates: SUBSTRATES_PHASE,
  millwork: MILLWORK_PHASE,
  finishes: FINISHES_PHASE,
  appliances: APPLIANCES_PHASE,
}
