export type PenRole =
  | 'CUT'
  | 'MAJOR'
  | 'PROFILE'
  | 'PARTITION'
  | 'PROJECTION'
  | 'FIXTURE'
  | 'DIMENSION'
  | 'HIDDEN'
  | 'HATCH'
  | 'ANNOTATION'
  | 'GRID'
  | 'REFERENCE';

export interface PenDef {
  role: PenRole;
  weight: number;
  dash?: string;
  description: string;
}

export interface HatchDef {
  id: string;
  svg: string;
  description: string;
}

export interface DraftingTheme {
  name: string;
  description: string;
  font: {
    label: string;
    value: string;
    title: string;
    mono: string;
  };
  pens: Record<PenRole, PenDef>;
  colors: {
    background: string;
    grid: string;
    cutFill: string;
    cutStroke: string;
    majorStroke: string;
    partitionStroke: string;
    dimension: string;
    dimensionText: string;
    annotation: string;
    titleText: string;
    subtitleText: string;
    hatchStroke: string;
    hidden: string;
    technicalAccent: string;
    presentationAccent: string;
    entourage: string;
  };
  hatches: HatchDef[];
  titleBlock: {
    bg: string;
    border: string;
    divider: string;
    labelFill: string;
    valueFill: string;
  };
  scale: {
    defaultSheet: string;
    defaultView: string;
  };
}

export const TECHNICAL_THEME: DraftingTheme = {
  name: 'Technical',
  description: 'Professional architectural technical drawing mode',
  font: {
    label: 'Arial',
    value: 'Arial, Helvetica, sans-serif',
    title: 'Arial, Helvetica, sans-serif',
    mono: 'Consolas, Courier New, monospace',
  },
  pens: {
    CUT:           { role: 'CUT', weight: 4,    description: 'Elements cut by section plane' },
    MAJOR:         { role: 'MAJOR', weight: 2.5, description: 'Major outlines, building silhouette' },
    PROFILE:       { role: 'PROFILE', weight: 2, description: 'Secondary profiles, elevation silhouette' },
    PARTITION:     { role: 'PARTITION', weight: 1.5, description: 'Internal partitions' },
    PROJECTION:    { role: 'PROJECTION', weight: 1, description: 'Projected / beyond elements' },
    FIXTURE:       { role: 'FIXTURE', weight: 1, description: 'Furniture, fixtures, equipment' },
    DIMENSION:     { role: 'DIMENSION', weight: 0.5, description: 'Dimension lines, witness lines' },
    HIDDEN:        { role: 'HIDDEN', weight: 0.75, dash: '6 3', description: 'Hidden elements' },
    HATCH:         { role: 'HATCH', weight: 0.35, description: 'Hatch pattern lines' },
    ANNOTATION:    { role: 'ANNOTATION', weight: 0.5, description: 'Text, labels, tags' },
    GRID:          { role: 'GRID', weight: 0.35, description: 'Background grid' },
    REFERENCE:     { role: 'REFERENCE', weight: 0.5, dash: '12 4 2 4', description: 'Reference / match lines' },
  },
  colors: {
    background: '#ffffff',
    grid: '#e2e8f0',
    cutFill: '#1e293b',
    cutStroke: '#0f172a',
    majorStroke: '#1e293b',
    partitionStroke: '#475569',
    dimension: '#64748b',
    dimensionText: '#1e293b',
    annotation: '#334155',
    titleText: '#0f172a',
    subtitleText: '#475569',
    hatchStroke: '#94a3b8',
    hidden: '#94a3b8',
    technicalAccent: '#334155',
    presentationAccent: '#d4a574',
    entourage: '#cbd5e1',
  },
  hatches: [
    {
      id: 'earth-hatch',
      svg: `<pattern id="earth-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 0,12 l 12,-12 M -3,3 l 6,-6 M 9,15 l 6,-6" fill="none" stroke="#94a3b8" stroke-width="0.35"/><circle cx="8" cy="4" r="0.6" fill="#94a3b8"/><circle cx="2" cy="10" r="0.8" fill="#94a3b8"/></pattern>`,
      description: 'Earth / ground in section',
    },
    {
      id: 'concrete-hatch',
      svg: `<pattern id="concrete-hatch" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.5" fill="#64748b"/><circle cx="7" cy="6" r="0.7" fill="#64748b"/><path d="M0 10L10 0" stroke="#94a3b8" stroke-width="0.35"/></pattern>`,
      description: 'Concrete cast-in-situ',
    },
    {
      id: 'brick-hatch',
      svg: `<pattern id="brick-hatch" width="12" height="6" patternUnits="userSpaceOnUse"><path d="M0 3h12 M0 0h5 M7 0h5 M0 6h12" fill="none" stroke="#94a3b8" stroke-width="0.35"/></pattern>`,
      description: 'Brick / blockwork',
    },
    {
      id: 'insulation-hatch',
      svg: `<pattern id="insulation-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0h8 M0 3h8 M0 6h8" fill="none" stroke="#94a3b8" stroke-width="0.35" stroke-dasharray="2 1"/></pattern>`,
      description: 'Thermal insulation',
    },
    {
      id: 'hardcore-hatch',
      svg: `<pattern id="hardcore-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="none" stroke="#94a3b8" stroke-width="0.35"/><circle cx="6" cy="6" r="1" fill="none" stroke="#94a3b8" stroke-width="0.35"/><circle cx="2" cy="6" r="0.8" fill="none" stroke="#94a3b8" stroke-width="0.35"/></pattern>`,
      description: 'Compacted hardcore',
    },
    {
      id: 'glazing-hatch',
      svg: `<pattern id="glazing-hatch" width="6" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="3" x2="6" y2="3" stroke="#94a3b8" stroke-width="0.35" stroke-dasharray="3 3"/></pattern>`,
      description: 'Glass / glazing',
    },
    {
      id: 'timber-hatch',
      svg: `<pattern id="timber-hatch" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 1h10 M0 4h8 M0 7h6 M0 10h10" fill="none" stroke="#94a3b8" stroke-width="0.35"/></pattern>`,
      description: 'Timber grain',
    },
    {
      id: 'screed-hatch',
      svg: `<pattern id="screed-hatch" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 2h6 M0 5h6" fill="none" stroke="#94a3b8" stroke-width="0.35" stroke-dasharray="1 2"/></pattern>`,
      description: 'Screed / finish base',
    },
  ],
  titleBlock: {
    bg: '#f8fafc',
    border: '#cbd5e1',
    divider: '#94a3b8',
    labelFill: '#64748b',
    valueFill: '#0f172a',
  },
  scale: {
    defaultSheet: 'A3',
    defaultView: '1:100',
  },
};

export const PRESENTATION_THEME: DraftingTheme = {
  ...TECHNICAL_THEME,
  name: 'Presentation',
  description: 'Client-facing presentation mode',
  font: {
    label: 'Inter',
    value: 'Inter, Arial, sans-serif',
    title: "'Space Grotesk', Inter, Arial, sans-serif",
    mono: 'Consolas, Courier New, monospace',
  },
  colors: {
    ...TECHNICAL_THEME.colors,
    background: '#0b1220',
    grid: '#1a2540',
    cutFill: '#0e1830',
    cutStroke: '#e2e8f0',
    majorStroke: '#e2e8f0',
    partitionStroke: '#475569',
    dimension: '#94a3b8',
    dimensionText: '#cbd5e1',
    annotation: '#94a3b8',
    titleText: '#e2e8f0',
    subtitleText: '#64748b',
    technicalAccent: '#d4a574',
    presentationAccent: '#d4a574',
    entourage: '#1e293b',
  },
  titleBlock: {
    bg: '#0e1830',
    border: '#24324b',
    divider: '#d4a574',
    labelFill: '#64748b',
    valueFill: '#e2e8f0',
  },
};

export function resolveTheme(printMode: boolean): DraftingTheme {
  return printMode ? TECHNICAL_THEME : PRESENTATION_THEME;
}

export function penWeight(theme: DraftingTheme, role: PenRole): number {
  return theme.pens[role].weight;
}

export function penDash(theme: DraftingTheme, role: PenRole): string {
  return theme.pens[role].dash ?? '';
}

export function hatchDefs(theme: DraftingTheme): string {
  return theme.hatches.map(h => h.svg).join('');
}

export function fontStack(theme: DraftingTheme): string {
  return theme.font.value;
}

export const LW = {
  CUT: 4,
  MAJOR: 2.5,
  PROFILE: 2,
  PARTITION: 1.5,
  PROJECTION: 1,
  FIXTURE: 1,
  DIMENSION: 0.5,
  HIDDEN: 0.75,
  HATCH: 0.35,
  ANNOTATION: 0.5,
  GRID: 0.35,
  REFERENCE: 0.5,
} as const;
