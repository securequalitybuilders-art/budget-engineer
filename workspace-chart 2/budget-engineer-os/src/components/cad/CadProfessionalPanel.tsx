interface CadProfessionalPanelProps {
  selectedWallId: string | null
  selectedAnnotationId: string | null
  onOffsetWall: () => void
  onTrimWall: () => void
  onEditAnnotation: () => void
  onApplyDxfSemantics: () => void
}

export function CadProfessionalPanel({
  selectedWallId,
  selectedAnnotationId,
  onOffsetWall,
  onTrimWall,
  onEditAnnotation,
  onApplyDxfSemantics,
}: CadProfessionalPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Professional Authoring</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button onClick={onOffsetWall} disabled={!selectedWallId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Offset Wall</button>
        <button onClick={onTrimWall} disabled={!selectedWallId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Trim Wall to Bounds</button>
        <button onClick={onEditAnnotation} disabled={!selectedAnnotationId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Edit Annotation Text</button>
        <button onClick={onApplyDxfSemantics} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Apply DXF Layer Semantics</button>
      </div>
    </section>
  )
}
