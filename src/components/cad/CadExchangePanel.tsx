interface CadExchangePanelProps {
  onExportIfc: () => void
  onExportCobie: () => void
}

export function CadExchangePanel({ onExportIfc, onExportCobie }: CadExchangePanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <h3 className="mb-2 text-sm font-medium text-white">Exchange / Export</h3>
      <div className="flex gap-2">
        <button onClick={onExportIfc} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white">
          IFC-like JSON
        </button>
        <button onClick={onExportCobie} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white">
          COBie-like JSON
        </button>
      </div>
    </div>
  )
}
