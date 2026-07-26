interface BlockLibraryPanelProps {
  onInsert: (type: 'stair' | 'core') => void
}

export function BlockLibraryPanel({ onInsert }: BlockLibraryPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <h3 className="mb-2 text-sm font-medium text-white">Block Library</h3>
      <div className="flex gap-2">
        <button onClick={() => onInsert('stair')} className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          Insert Stair
        </button>
        <button onClick={() => onInsert('core')} className="rounded-xl border border-green-400/20 bg-green-500/10 px-3 py-2 text-xs text-green-200">
          Insert Core
        </button>
      </div>
    </div>
  )
}
