interface CadExchangePanelProps {
  onExportIfc: () => void
  onExportCobie: () => void
}

export function CadExchangePanel({ onExportIfc, onExportCobie }: CadExchangePanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">IFC / COBie Exchange</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button onClick={onExportIfc} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Export IFC-like JSON</button>
        <button onClick={onExportCobie} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Export COBie-like JSON</button>
      </div>
    </section>
  )
}
