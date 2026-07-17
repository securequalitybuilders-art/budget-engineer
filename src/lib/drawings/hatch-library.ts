export const HATCH_PATTERNS = `
<pattern id="earth-hatch" width="12" height="12" patternUnits="userSpaceOnUse">
<path d="M 0,12 l 12,-12 M -3,3 l 6,-6 M 9,15 l 6,-6" fill="none" stroke="#64748b" stroke-width="0.35"/>
<circle cx="8" cy="4" r="0.6" fill="#64748b"/><circle cx="2" cy="10" r="0.8" fill="#64748b"/>
</pattern>
<pattern id="concrete-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
<circle cx="2" cy="2" r="0.5" fill="#475569"/><circle cx="7" cy="6" r="0.7" fill="#475569"/>
<path d="M0 10L10 0" stroke="#64748b" stroke-width="0.35"/>
</pattern>
<pattern id="brick-hatch" width="12" height="6" patternUnits="userSpaceOnUse">
<path d="M0 3h12 M0 0h5 M7 0h5 M0 6h12" fill="none" stroke="#64748b" stroke-width="0.35"/>
</pattern>
<pattern id="insulation-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
<path d="M0 0h8 M0 3h8 M0 6h8" fill="none" stroke="#64748b" stroke-width="0.35" stroke-dasharray="2 1"/>
</pattern>
<pattern id="hardcore-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
<circle cx="2" cy="2" r="1.2" fill="none" stroke="#64748b" stroke-width="0.35"/>
<circle cx="6" cy="6" r="1" fill="none" stroke="#64748b" stroke-width="0.35"/>
</pattern>
<pattern id="glazing-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
<line x1="0" y1="3" x2="6" y2="3" stroke="#94a3b8" stroke-width="0.35" stroke-dasharray="3 3"/>
</pattern>
<pattern id="timber-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
<path d="M0 1h10 M0 4h8 M0 7h6" fill="none" stroke="#64748b" stroke-width="0.35"/>
</pattern>
<pattern id="screed-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
<path d="M0 2h6 M0 5h6" fill="none" stroke="#64748b" stroke-width="0.35" stroke-dasharray="1 2"/>
</pattern>
<linearGradient id="glass-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#e2e8f0" stop-opacity="0.08"/>
<stop offset="50%" stop-color="#cbd5e1" stop-opacity="0.15"/>
<stop offset="50.1%" stop-color="#94a3b8" stop-opacity="0.08"/>
<stop offset="100%" stop-color="#e2e8f0" stop-opacity="0.12"/>
</linearGradient>
<marker id="slope-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
<path d="M0,0 L8,3 L0,6" fill="#64748b"/>
</marker>
`;

export function hatchIdForMaterial(mat: string): string {
  const map: Record<string, string> = {
    concrete: 'concrete-hatch',
    brick: 'brick-hatch',
    blockwork: 'brick-hatch',
    earth: 'earth-hatch',
    hardcore: 'hardcore-hatch',
    insulation: 'insulation-hatch',
    glazing: 'glazing-hatch',
    glass: 'glazing-hatch',
    timber: 'timber-hatch',
    wood: 'timber-hatch',
    screed: 'screed-hatch',
  };
  return map[mat.toLowerCase()] ?? '';
}
