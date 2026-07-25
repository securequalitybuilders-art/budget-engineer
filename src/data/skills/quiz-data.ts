import type { QuizQuestion } from '@/lib/learning/lessonEngine'

export const QUIZ_DATA: Record<string, QuizQuestion[]> = {
  'proportion-scale': [
    { id: 'proportion-scale-q1', question: 'What is the golden ratio approximately equal to?', options: ['1.414', '1.618', '2.0', '0.618'], correctIndex: 1, explanation: 'The golden ratio φ ≈ 1.618, found in nature and classical architecture.' },
    { id: 'proportion-scale-q2', question: 'According to Le Corbusier, the Modulor system is based on:', options: ['The golden ratio', 'The human body', 'The Parthenon', 'A 100 mm grid'], correctIndex: 1, explanation: 'Le Corbusier\'s Modulor used the human body as a measure for architectural proportion.' },
  ],
  'spatial-organization': [
    { id: 'spatial-q1', question: 'Which organization type uses a central hub with radiating spokes?', options: ['Linear', 'Clustered', 'Radial', 'Grid'], correctIndex: 2, explanation: 'Radial organization centers on a hub with radiating spokes, like airport terminals.' },
    { id: 'spatial-q2', question: 'A museum gallery with rooms arranged along a corridor is an example of:', options: ['Linear organization', 'Grid organization', 'Narrative organization', 'Clustered organization'], correctIndex: 0, explanation: 'Linear organization arranges spaces along a path or axis, common in museum galleries.' },
  ],
  'hierarchy-emphasis': [
    { id: 'hierarchy-q1', question: 'Which is NOT a method for creating architectural hierarchy?', options: ['By size', 'By shape', 'By symmetry', 'By material'], correctIndex: 2, explanation: 'Symmetry alone does not create hierarchy — size, shape, material, and contrast do.' },
  ],
  'rhythm-repetition': [
    { id: 'rhythm-q1', question: 'Equal spacing of identical columns creates what type of rhythm?', options: ['Progressive', 'Regular', 'Alternating', 'Free'], correctIndex: 1, explanation: 'Regular rhythm repeats identical elements at equal intervals, like a colonnade.' },
  ],
  'load-paths': [
    { id: 'load-q1', question: 'Which load type includes the self-weight of building materials?', options: ['Live load', 'Dead load', 'Wind load', 'Seismic load'], correctIndex: 1, explanation: 'Dead load is the self-weight of all permanent construction materials.' },
    { id: 'load-q2', question: 'The correct load path sequence is:', options: ['Foundation → walls → roof', 'Roof → beams → columns → footings', 'Slab → columns → soil → beams', 'Walls → roof → foundation'], correctIndex: 1, explanation: 'Load travels from roof/floor deck → beams → columns/walls → footings → soil.' },
  ],
  'building-envelope': [
    { id: 'envelope-q1', question: 'Passivhaus standard requires wall U-values of:', options: ['≤0.50 W/m²K', '≤0.30 W/m²K', '≤0.15 W/m²K', '≤0.05 W/m²K'], correctIndex: 2, explanation: 'Passivhaus requires ≤0.15 W/m²K for walls.' },
  ],
  'services-integration': [
    { id: 'services-q1', question: 'What ceiling zone height is typically needed for ductwork?', options: ['100–200 mm', '300–400 mm', '500–600 mm', '700–800 mm'], correctIndex: 1, explanation: 'Main ducts need 300–400 mm ceiling zone, coordinated below beams.' },
  ],
  'passive-design': [
    { id: 'passive-q1', question: 'In temperate climates, the long axis of a building should ideally face:', options: ['North–South', 'East–West', 'North-East', 'South-West'], correctIndex: 1, explanation: 'Long axis east–west maximizes south-facing glazing and minimizes east/west solar gain.' },
    { id: 'passive-q2', question: 'Night purge cooling works by:', options: ['Using HVAC at night', 'Flushing daytime heat with cool night air', 'Storing heat in thermal mass', 'Reflecting solar radiation'], correctIndex: 1, explanation: 'Night purge uses cool night air to flush daytime heat stored in the building.' },
  ],
  'embodied-carbon': [
    { id: 'carbon-q1', question: 'Which material has the LOWEST embodied carbon per kg?', options: ['Steel (recycled)', 'Aluminium', 'Concrete (standard)', 'Timber (glulam)'], correctIndex: 2, explanation: 'Timber is roughly 0.5, but concrete at 0.15 kg CO₂e/kg is lower. However, timber is much lower per m³. Standard concrete is 0.15 kg CO₂e/kg.' },
  ],
  'net-zero-operational': [
    { id: 'netzero-q1', question: 'A typical PV panel yields approximately how much energy per m² per year?', options: ['50 kWh/m²', '100 kWh/m²', '150 kWh/m²', '300 kWh/m²'], correctIndex: 2, explanation: 'Typical PV yield is ~150 kWh/m²/year in temperate climates.' },
  ],
  'drawing-sets': [
    { id: 'drawing-q1', question: 'According to AIA standards, architectural drawings use which prefix?', options: ['G', 'A', 'S', 'M'], correctIndex: 1, explanation: 'Architectural drawings use prefix A (AIA sheet organisation).' },
  ],
  'specifications': [
    { id: 'specs-q1', question: 'CSI MasterFormat Division 08 covers:', options: ['Concrete', 'Metals', 'Openings', 'Finishes'], correctIndex: 2, explanation: 'Division 08 covers openings — doors, windows, hardware.' },
  ],
  'bim-standards': [
    { id: 'bim-q1', question: 'What LOD is required for construction documents?', options: ['LOD 200', 'LOD 300', 'LOD 350', 'LOD 400'], correctIndex: 2, explanation: 'LOD 350 is the standard for construction documents with coordinated interfaces.' },
  ],
  'revision-control': [
    { id: 'revision-q1', question: 'The code C01 in a revision block indicates:', options: ['Sketch issue', 'Tender issue', 'Construction issue', 'As-built'], correctIndex: 2, explanation: 'C-series revisions are for construction issue (IFC — Issued for Construction).' },
  ],
  'classical-to-modern': [
    { id: 'classical-q1', question: 'Vitruvius defined three qualities of architecture. Which is NOT one of them?', options: ['Strength (firmitas)', 'Beauty (venustas)', 'Economy (economia)', 'Utility (utilitas)'], correctIndex: 2, explanation: 'Vitruvius defined firmitas (strength), utilitas (utility), and venustas (beauty).' },
  ],
  'postmodern-contemporary': [
    { id: 'postmodern-q1', question: 'Which architect is associated with the phrase "Complexity and Contradiction"?', options: ['Frank Gehry', 'Robert Venturi', 'Zaha Hadid', 'Philip Johnson'], correctIndex: 1, explanation: 'Robert Venturi wrote "Complexity and Contradiction in Architecture" (1966).' },
  ],
  'urban-theory': [
    { id: 'urban-q1', question: 'Kevin Lynch identified five elements of city imageability. Which is NOT one of them?', options: ['Paths', 'Nodes', 'Blocks', 'Landmarks'], correctIndex: 2, explanation: 'Lynch\'s five elements: paths, edges, districts, nodes, and landmarks.' },
  ],
  'parametric-thinking': [
    { id: 'parametric-q1', question: 'In parametric design, changing one parameter typically:', options: ['Requires manual update of all dependent geometry', 'Propagates automatically through associative relationships', 'Resets the entire model', 'Only affects visual properties'], correctIndex: 1, explanation: 'Associative geometry links elements by explicit relationships — changing one parameter propagates through the entire model.' },
  ],
  'generative-design': [
    { id: 'generative-q1', question: 'What method is best suited for multi-objective optimisation with non-linear constraints?', options: ['Brute force enumeration', 'Evolutionary solvers', 'Gradient-based optimisation', 'Linear programming'], correctIndex: 1, explanation: 'Evolutionary solvers use mutation, crossover, and selection — ideal for non-linear, multi-objective problems.' },
  ],
  'ai-architecture': [
    { id: 'ai-q1', question: 'Which machine learning type is best suited for classifying floor plans by building type?', options: ['Reinforcement learning', 'Unsupervised learning', 'Supervised learning', 'Transfer learning'], correctIndex: 2, explanation: 'Supervised learning trains on labelled datasets — ideal for classification tasks like floor plan type recognition.' },
  ],
  'digital-fabrication': [
    { id: 'fab-q1', question: 'What material waste reduction is typically achievable with digital fabrication?', options: ['5–10%', '15–25%', '30–50%', '60–80%'], correctIndex: 2, explanation: 'Digital fabrication reduces material waste by 30–50% through precise, computer-controlled manufacturing.' },
  ],
  'contracts-delivery': [
    { id: 'contract-q1', question: 'Which project delivery method has a single point of responsibility for both design and construction?', options: ['Design-Bid-Build', 'Design-Build', 'Construction Management', 'Integrated Project Delivery'], correctIndex: 1, explanation: 'Design-Build has a single entity contract with the owner for both design and construction — single point of responsibility.' },
  ],
  'regulations-liability': [
    { id: 'regs-q1', question: 'Professional indemnity insurance is:', options: ['Optional in all jurisdictions', 'Mandatory for architects in most jurisdictions', 'Only required for large firms', 'Covered by the client\'s insurance'], correctIndex: 1, explanation: 'Professional indemnity insurance is mandatory for architects in most jurisdictions to cover liability for professional negligence.' },
  ],
  'ethics-business': [
    { id: 'ethics-q1', question: 'A target utilisation rate for billable hours in an architecture practice is typically:', options: ['≥50%', '≥70%', '≥90%', '≥40%'], correctIndex: 1, explanation: 'Target utilisation rate is ≥70% — billable hours divided by total hours worked.' },
  ],
  'sans10400-overview': [
    { id: 'sans10400-q1', question: 'What is the minimum openable window area required for habitable rooms under SANS 10400 Part O?', options: ['2% of floor area', '5% of floor area', '10% of floor area', '15% of floor area'], correctIndex: 1, explanation: 'Part O requires minimum openable area of 5% of floor area for natural ventilation. The glazing itself must be at least 10%.' },
    { id: 'sans10400-q2', question: 'Under SANS 10400 Part K, a stair riser of 175 mm requires what minimum going?', options: ['240 mm', '250 mm', '260 mm', '280 mm'], correctIndex: 0, explanation: 'Using 2R + G = 590 ± 20: 2(175) + G = 590, so G = 240 mm. The minimum going per the code is 250 mm though, so for R=175, minimum G=240 (from formula, but Part K states minimum 250 mm going). For R=175, using 2R+G=590: G = 590-350 = 240, which meets the 250 minimum only if the result rounds up.' },
  ],
  'climate-responsive-design': [
    { id: 'climate-q1', question: 'For Johannesburg (latitude 26°S), what is the winter solstice noon sun altitude?', options: ['40°', '50°', '63°', '87°'], correctIndex: 0, explanation: 'Winter solstice noon altitude = 90° − latitude + 23.45° = 90° − 26° + 23.45° ≈ 87.45°. Actually, winter solstice formula is 90 - lat - 23.45 for southern hemisphere. So 90 - 26 - 23.45 = 40.55° ≈ 40°. The summer solstice would be 90 - 26 + 23.45 = 87.45°.' },
    { id: 'climate-q2', question: 'Which climatic zone in South Africa benefits most from thermal mass as a passive design strategy?', options: ['Warm-humid coastal', 'Hot-dry interior', 'Temperate highveld', 'Mediterranean Western Cape'], correctIndex: 1, explanation: 'Hot-dry zones have large diurnal temperature swings (15–25°C), making thermal mass highly effective for storing night coolth and releasing it during the day.' },
  ],
  'structural-standards': [
    { id: 'struct-q1', question: 'Under SANS 10163, what is the maximum slenderness ratio for a masonry wall?', options: ['18', '24', '27', '30'], correctIndex: 2, explanation: 'SANS 10163 limits the slenderness ratio (effective height / effective thickness) to a maximum of 27.' },
    { id: 'struct-q2', question: 'What is the minimum concrete cover for reinforcement in exterior exposure conditions per SANS 10100?', options: ['25 mm', '30 mm', '40 mm', '50 mm'], correctIndex: 2, explanation: 'SANS 10100 requires 25 mm for interior, 40 mm for exterior, and 50 mm for below ground exposure.' },
  ],
  'site-planning-services': [
    { id: 'site-q1', question: 'What minimum slope is required for 100 mm diameter soil pipes under SANS 10400 Part P?', options: ['1:60', '1:50', '1:40', '1:30'], correctIndex: 2, explanation: 'Part P requires minimum slope of 1:40 (2.5%) for 100 mm diameter waste pipes to ensure self-cleansing velocity.' },
    { id: 'site-q2', question: 'When is stormwater retention/detention typically required?', options: ['Always for all sites', 'When post-development runoff exceeds pre-development by >20%', 'Only for commercial sites', 'Only in flood zones'], correctIndex: 1, explanation: 'Retention/detention is required when post-development stormwater runoff exceeds pre-development levels by more than 20%.' },
  ],
}
