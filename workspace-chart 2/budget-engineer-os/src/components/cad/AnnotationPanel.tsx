import type { CadDocument } from '../../domain/cad'

interface AnnotationPanelProps {
  doc: CadDocument | null
}

export function AnnotationPanel({ doc }: AnnotationPanelProps) {
  if (!doc) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Annotations</h2>
      <div className="mt-4 space-y-2">
        {doc.annotations.map((annotation) => (
          <div key={annotation.id} className="rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white">
            {annotation.kind} · {annotation.text}
          </div>
        ))}
      </div>
    </section>
  )
}
