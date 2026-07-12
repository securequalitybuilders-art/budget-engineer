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
}
