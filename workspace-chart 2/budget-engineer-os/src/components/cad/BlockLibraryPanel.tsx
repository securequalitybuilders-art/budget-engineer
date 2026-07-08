interface BlockLibraryPanelProps {
  onInsert: (type: 'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core') => void
}

const blockTypes: Array<'sofa' | 'bed' | 'table' | 'wc' | 'stair' | 'core'> = ['sofa', 'bed', 'table', 'wc', 'stair', 'core']

export function BlockLibraryPanel({ onInsert }: BlockLibraryPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Object / Block Library</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {blockTypes.map((type) => (
          <button key={type} onClick={() => onInsert(type)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
            Insert {type}
          </button>
        ))}
      </div>
    </section>
  )
}
