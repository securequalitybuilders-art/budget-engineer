import type { CadDocument } from '../../domain/cad'

interface BimPropertyPanelProps {
  doc: CadDocument | null
  selectedWallId: string | null
}

export function BimPropertyPanel({ doc, selectedWallId }: BimPropertyPanelProps) {
  if (!doc || !selectedWallId) return null
  const wall = doc.walls.find((item) => item.id === selectedWallId)
  if (!wall) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">BIM Properties</h2>
      <div className="mt-4 space-y-2 text-sm text-white">
        <Prop label="Classification" value={wall.bim.classification} />
        <Prop label="Family" value={wall.bim.family} />
        <Prop label="Type" value={wall.bim.typeName} />
        <Prop label="Material" value={wall.bim.material} />
        <Prop label="Load Bearing" value={String(!!wall.bim.loadBearing)} />
        <Prop label="Level" value={wall.bim.levelName} />
      </div>
    </section>
  )
}

function Prop({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-white">{value ?? '—'}</div>
    </div>
  )
}
