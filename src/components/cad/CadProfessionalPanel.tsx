interface CadProfessionalPanelProps {
  selectedWallId: string | null
  selectedAnnotationId: string | null
  onOffsetWall: () => void
  onTrimWall: () => void
  onEditAnnotation: () => void
  onApplyDxfSemantics: () => void
}

export function CadProfessionalPanel({ selectedWallId, selectedAnnotationId, onOffsetWall, onTrimWall, onEditAnnotation, onApplyDxfSemantics }: CadProfessionalPanelProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        onClick={onOffsetWall}
        disabled={!selectedWallId}
        className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-30"
      >
        Offset
      </button>
      <button
        onClick={onTrimWall}
        disabled={!selectedWallId}
        className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-200 disabled:opacity-30"
      >
        Trim to Bounds
      </button>
      <button
        onClick={onEditAnnotation}
        disabled={!selectedAnnotationId}
        className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200 disabled:opacity-30"
      >
        Edit Annotation
      </button>
      <button
        onClick={onApplyDxfSemantics}
        className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200"
      >
        Apply DXF Semantics
      </button>
    </div>
  )
}
