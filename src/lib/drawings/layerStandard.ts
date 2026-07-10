export type DisciplineCode = 'A' | 'S' | 'M' | 'E' | 'P' | 'I' | 'L' | 'C';

export interface AiaLayerDef {
  code: string;
  name: string;
  discipline: DisciplineCode;
  description: string;
}

const AIA_LAYERS: AiaLayerDef[] = [
  { code: 'A-WALL', name: 'Walls', discipline: 'A', description: 'Architectural walls' },
  { code: 'A-WALL-FULL', name: 'Walls (full height)', discipline: 'A', description: 'Full-height architectural walls' },
  { code: 'A-WALL-PART', name: 'Walls (partial)', discipline: 'A', description: 'Partial-height walls' },
  { code: 'A-DOOR', name: 'Doors', discipline: 'A', description: 'Doors, door swings, door numbers' },
  { code: 'A-DOOR-FULL', name: 'Doors (full height)', discipline: 'A', description: 'Full-height door assemblies' },
  { code: 'A-GLAZ', name: 'Glazing', discipline: 'A', description: 'Windows, curtain wall, glazed panels' },
  { code: 'A-GLAZ-SILL', name: 'Window sills', discipline: 'A', description: 'Window sill lines' },
  { code: 'A-ANNO', name: 'Annotations', discipline: 'A', description: 'General annotations, notes, keynotes' },
  { code: 'A-ANNO-DIMS', name: 'Dimensions', discipline: 'A', description: 'Dimension strings' },
  { code: 'A-ANNO-TEXT', name: 'Text', discipline: 'A', description: 'General text labels' },
  { code: 'A-ANNO-LEAD', name: 'Leaders', discipline: 'A', description: 'Leader lines with arrows' },
  { code: 'A-ANNO-SYMB', name: 'Symbols', discipline: 'A', description: 'Reference symbols, section/elevation marks' },
  { code: 'A-FLOR', name: 'Floor', discipline: 'A', description: 'Floor slabs, floor finishes, floor patterns' },
  { code: 'A-FLOR-OVHD', name: 'Floor (overhead)', discipline: 'A', description: 'Overhead floor outlines (reflected)' },
  { code: 'A-ROOF', name: 'Roof', discipline: 'A', description: 'Roof outlines, roof slopes' },
  { code: 'A-ROOF-ANNO', name: 'Roof annotations', discipline: 'A', description: 'Roof notes, falls, scupper locations' },
  { code: 'A-SECT', name: 'Sections', discipline: 'A', description: 'Section cut lines, section references' },
  { code: 'A-ELEV', name: 'Elevations', discipline: 'A', description: 'Elevation drawings' },
  { code: 'A-ELEV-TEXT', name: 'Elevation text', discipline: 'A', description: 'Elevation labels and tags' },
  { code: 'A-FURN', name: 'Furniture', discipline: 'A', description: 'Furniture and equipment' },
  { code: 'A-FURN-FIXD', name: 'Fixed furniture', discipline: 'A', description: 'Built-in joinery, cabinets' },
  { code: 'A-FLOR-PATT', name: 'Floor patterns', discipline: 'A', description: 'Floor finish patterns, tile layouts' },
  { code: 'A-EXST', name: 'Existing', discipline: 'A', description: 'Existing building elements to remain' },
  { code: 'A-EXST-DEMO', name: 'Demolition', discipline: 'A', description: 'Elements to be demolished' },
  { code: 'A-GRID', name: 'Grid', discipline: 'A', description: 'Column grid lines, structural grid' },
  { code: 'A-GRID-DIMS', name: 'Grid dimensions', discipline: 'A', description: 'Grid bubble and dimension strings' },
  { code: 'A-TTLB', name: 'Title block', discipline: 'A', description: 'Title block, borders, sheet information' },
  { code: 'S-WALL', name: 'Structural walls', discipline: 'S', description: 'Structural/load-bearing walls' },
  { code: 'S-WALL-EXST', name: 'Existing structural walls', discipline: 'S', description: 'Existing structural walls' },
  { code: 'S-COLS', name: 'Columns', discipline: 'S', description: 'Structural columns' },
  { code: 'S-COLS-EXST', name: 'Existing columns', discipline: 'S', description: 'Existing structural columns' },
  { code: 'S-BEAM', name: 'Beams', discipline: 'S', description: 'Structural beams' },
  { code: 'S-BEAM-OVHD', name: 'Beams (overhead)', discipline: 'S', description: 'Overhead beam outlines' },
  { code: 'S-FOOT', name: 'Footings', discipline: 'S', description: 'Foundation footings' },
  { code: 'S-FOOT-EXST', name: 'Existing footings', discipline: 'S', description: 'Existing footings' },
  { code: 'S-SLAB', name: 'Slabs', discipline: 'S', description: 'Structural slabs' },
  { code: 'S-SLAB-EXST', name: 'Existing slabs', discipline: 'S', description: 'Existing slabs' },
  { code: 'S-FNDN', name: 'Foundations', discipline: 'S', description: 'Foundation plans' },
  { code: 'S-ANNO', name: 'Structural annotations', discipline: 'S', description: 'Structural notes, callouts' },
  { code: 'S-ANNO-DIMS', name: 'Structural dimensions', discipline: 'S', description: 'Structural dimension strings' },
  { code: 'M-HVAC', name: 'HVAC', discipline: 'M', description: 'Heating, ventilation, air conditioning' },
  { code: 'M-HVAC-DUCT', name: 'HVAC ductwork', discipline: 'M', description: 'Ductwork, diffusers, grilles' },
  { code: 'M-HVAC-EQUP', name: 'HVAC equipment', discipline: 'M', description: 'Mechanical equipment' },
  { code: 'E-POWR', name: 'Power', discipline: 'E', description: 'Electrical power, outlets, panels' },
  { code: 'E-LITE', name: 'Lighting', discipline: 'E', description: 'Lighting fixtures, switches' },
  { code: 'E-LITE-ANNO', name: 'Lighting annotations', discipline: 'E', description: 'Lighting notes, fixture schedules' },
  { code: 'E-COMM', name: 'Communications', discipline: 'E', description: 'Data, voice, communication' },
  { code: 'E-ANNO', name: 'Electrical annotations', discipline: 'E', description: 'Electrical general notes' },
  { code: 'P-PIPE', name: 'Piping', discipline: 'P', description: 'Plumbing piping' },
  { code: 'P-PIPE-HOT', name: 'Hot water', discipline: 'P', description: 'Hot water piping' },
  { code: 'P-PIPE-COLD', name: 'Cold water', discipline: 'P', description: 'Cold water piping' },
  { code: 'P-PIPE-SAN', name: 'Sanitary', discipline: 'P', description: 'Sanitary/soil/waste piping' },
  { code: 'P-PIPE-STORM', name: 'Stormwater', discipline: 'P', description: 'Stormwater piping' },
  { code: 'P-FIXT', name: 'Plumbing fixtures', discipline: 'P', description: 'Fixtures: WC, basin, shower, sink' },
  { code: 'P-ANNO', name: 'Plumbing annotations', discipline: 'P', description: 'Plumbing notes and labels' },
  { code: 'I-WALL', name: 'Interior walls', discipline: 'I', description: 'Interior design walls' },
  { code: 'I-FURN', name: 'Interior furniture', discipline: 'I', description: 'Interior furniture layout' },
  { code: 'I-FURN-FIXD', name: 'Interior fixed furniture', discipline: 'I', description: 'Interior fixed joinery' },
  { code: 'I-ELEV', name: 'Interior elevations', discipline: 'I', description: 'Interior elevation drawings' },
  { code: 'I-FLOR', name: 'Interior floor', discipline: 'I', description: 'Interior floor finish plans' },
  { code: 'I-CLNG', name: 'Interior ceiling', discipline: 'I', description: 'Reflected ceiling plans' },
  { code: 'L-SITE', name: 'Site', discipline: 'L', description: 'Site plan' },
  { code: 'L-SITE-TOPO', name: 'Site topography', discipline: 'L', description: 'Contours, spot levels' },
  { code: 'L-SITE-HARD', name: 'Site hardscape', discipline: 'L', description: 'Paving, roads, parking' },
  { code: 'L-SITE-SOFT', name: 'Site softscape', discipline: 'L', description: 'Planting, trees, grass' },
  { code: 'L-SITE-ANNO', name: 'Site annotations', discipline: 'L', description: 'Site notes, dimensions' },
  { code: 'C-EXST', name: 'Civil existing', discipline: 'C', description: 'Existing civil/survey data' },
  { code: 'C-EXST-TOPO', name: 'Civil existing topography', discipline: 'C', description: 'Existing contours' },
];

export function getAiaLayer(code: string): AiaLayerDef | undefined {
  return AIA_LAYERS.find(l => l.code === code);
}

export function getAiaLayersByDiscipline(discipline: DisciplineCode): AiaLayerDef[] {
  return AIA_LAYERS.filter(l => l.discipline === discipline);
}

export function searchAiaLayers(query: string): AiaLayerDef[] {
  const q = query.toLowerCase();
  return AIA_LAYERS.filter(l =>
    l.code.toLowerCase().includes(q) ||
    l.name.toLowerCase().includes(q) ||
    l.description.toLowerCase().includes(q)
  );
}

export function getDisciplinePrefix(discipline: DisciplineCode): string {
  const map: Record<DisciplineCode, string> = {
    A: 'Architecture', S: 'Structure', M: 'Mechanical',
    E: 'Electrical', P: 'Plumbing', I: 'Interior', L: 'Landscape', C: 'Civil'
  };
  return map[discipline] ?? 'General';
}

export function aiaLayerColor(code: string): string {
  const colorMap: Record<string, string> = {
    'A-WALL': '#4a5568', 'A-WALL-FULL': '#4a5568', 'A-WALL-PART': '#718096',
    'A-DOOR': '#d4a574', 'A-DOOR-FULL': '#d4a574',
    'A-GLAZ': '#06B6D4', 'A-GLAZ-SILL': '#06B6D4',
    'A-ANNO': '#94a3b8', 'A-ANNO-DIMS': '#64748b', 'A-ANNO-TEXT': '#cbd5e1',
    'A-FLOR': '#8B5CF6', 'A-ROOF': '#8B5CF6',
    'A-FURN': '#22c55e', 'A-FURN-FIXD': '#22c55e',
    'A-GRID': '#1a365d', 'A-TTLB': '#0f172a',
    'S-COLS': '#ef4444', 'S-BEAM': '#ef4444', 'S-FOOT': '#dc2626',
    'E-POWR': '#f59e0b', 'E-LITE': '#fbbf24',
    'P-PIPE': '#3b82f6', 'P-FIXT': '#60a5fa',
  };
  return colorMap[code] ?? '#94a3b8';
}

export { AIA_LAYERS };
