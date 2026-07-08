import type { CadDocument } from '../../domain/cad'

interface LayerPanelProps {
  doc: CadDocument | null
  onToggleLayer: (layerId: string) => void
}

export function LayerPanel({ doc, onToggleLayer }: LayerPanelProps) {
  if (!doc) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Layers</h2>
      <div className="mt-4 space-y-2">
        {doc.layers.map((layer) => (
          <label key={layer.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-white">
            <span>{layer.name}</span>
            <input type="checkbox" checked={layer.visible} onChange={() => onToggleLayer(layer.id)} />
          </label>
        ))}
      </div>
    </section>
  )
}
