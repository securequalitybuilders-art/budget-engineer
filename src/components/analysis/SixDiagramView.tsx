import type { SiteDiagram, DiagramType } from '@/domain/site';

const DIAGRAM_INFO: Record<DiagramType, { description: string; boardUse: string }> = {
  'sun-wind-path': {
    description: 'Solar access and prevailing wind analysis for orientation decisions.',
    boardUse: 'Use on concept design and site analysis boards to justify orientation.',
  },
  'access-noise': {
    description: 'Site access points and noise source mapping.',
    boardUse: 'Use on planning and site analysis boards for transport and acoustic strategy.',
  },
  'figure-ground': {
    description: 'Building footprint versus site area with context.',
    boardUse: 'Use on urban context and massing boards.',
  },
  'natural-features': {
    description: 'Topography, contours, and natural site features.',
    boardUse: 'Use on site analysis boards for earthworks and landscape strategy.',
  },
  'permeability-transport': {
    description: 'Permeable vs impermeable surfaces and transport connections.',
    boardUse: 'Use on sustainability and stormwater management boards.',
  },
  'concept-urban-context': {
    description: 'Urban grain, density context, and design concept drivers.',
    boardUse: 'Use on concept and urban design boards.',
  },
};

interface SixDiagramViewProps {
  diagrams: SiteDiagram[];
  className?: string;
}

export function SixDiagramView({ diagrams, className = '' }: SixDiagramViewProps) {
  if (!diagrams || diagrams.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-sm text-[var(--text-muted)]">
        No site analysis diagrams available. Configure the site context first.
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {diagrams.map((diagram) => {
          const info = DIAGRAM_INFO[diagram.type] ?? { description: '', boardUse: '' };
          return (
            <div
              key={diagram.type}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden"
            >
              <div className="p-3 border-b border-[var(--border-default)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{diagram.label}</h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{info.description}</p>
              </div>
              <div
                className="flex items-center justify-center p-3 bg-white"
                dangerouslySetInnerHTML={{ __html: diagram.svgContent }}
              />
              <div className="px-3 py-2 bg-[var(--bg-tertiary)]">
                <p className="text-[9px] text-[var(--text-muted)]">{info.boardUse}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
