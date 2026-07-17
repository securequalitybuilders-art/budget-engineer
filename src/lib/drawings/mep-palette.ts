/**
 * MEP Palette System
 *
 * Provides disciplined color palettes for Electrical, Plumbing, and HVAC
 * drawings in both technical print mode and coordination review mode.
 *
 * P13.2 — Roof and MEP Technical Palette Discipline
 */
export type MepDiscipline = 'electrical' | 'plumbing' | 'hvac';

export interface MepColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  wire: string;
  fill: string;
  label: string;
  outline: string;
}

/**
 * Technical print palettes — grayscale/muted, suitable for black-and-white
 * or subdued color PDF issue.
 */
export const TECHNICAL_MEP_PALETTES: Record<MepDiscipline, MepColorPalette> = {
  electrical: {
    primary: '#475569',
    secondary: '#64748b',
    accent: '#334155',
    wire: '#475569',
    fill: '#cbd5e1',
    label: '#334155',
    outline: '#1e293b',
  },
  plumbing: {
    primary: '#475569',
    secondary: '#64748b',
    accent: '#475569',
    wire: '#64748b',
    fill: '#cbd5e1',
    label: '#334155',
    outline: '#1e293b',
  },
  hvac: {
    primary: '#475569',
    secondary: '#64748b',
    accent: '#475569',
    wire: '#64748b',
    fill: '#cbd5e1',
    label: '#334155',
    outline: '#1e293b',
  },
};

/**
 * Coordination color palettes — restrained discipline hues for on-screen review.
 * NOT neon / pure bright RGB — muted and professional.
 *   electrical → muted amber/brown
 *   plumbing  → muted blue-grey
 *   HVAC      → muted green-grey
 */
export const COORDINATION_MEP_PALETTES: Record<MepDiscipline, MepColorPalette> = {
  electrical: {
    primary: '#92400e',
    secondary: '#d97706',
    accent: '#78350f',
    wire: '#b45309',
    fill: '#fef3c7',
    label: '#451a03',
    outline: '#78350f',
  },
  plumbing: {
    primary: '#1e3a5f',
    secondary: '#3b82f6',
    accent: '#1e40af',
    wire: '#2563eb',
    fill: '#dbe5f0',
    label: '#0f172a',
    outline: '#1e3a5f',
  },
  hvac: {
    primary: '#1a3a2a',
    secondary: '#2d6a4f',
    accent: '#1b4332',
    wire: '#40916c',
    fill: '#d8edda',
    label: '#0f172a',
    outline: '#1a3a2a',
  },
};

export function resolveMepPalette(
  printMode: boolean,
  coordination = false,
): Record<MepDiscipline, MepColorPalette> {
  if (printMode || !coordination) {
    return TECHNICAL_MEP_PALETTES;
  }
  return COORDINATION_MEP_PALETTES;
}

export function mepColor(
  palette: MepColorPalette,
  role: 'primary' | 'secondary' | 'accent' | 'wire' | 'fill' | 'label' | 'outline',
): string {
  return palette[role];
}
