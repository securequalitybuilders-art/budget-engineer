import type { CadDocument } from '../../domain/cad'

interface VerticalCoordinationPanelProps {
  doc: CadDocument | null
}

export function VerticalCoordinationPanel({ doc }: VerticalCoordinationPanelProps) {
  if (!doc) return null
  const stairs = doc.blocks.filter((block) => block.blockType === 'stair')
  const cores = doc.blocks.filter((block) => block.blockType === 'core')

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Vertical Coordination</h2>
      <div className="mt-4 space-y-2 text-sm text-white">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2">Stairs: {stairs.length}</div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2">Cores: {cores.length}</div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-300">Use inserted stair/core blocks to coordinate vertical circulation between floors.</div>
      </div>
    </section>
  )
}
