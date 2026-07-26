import type { BimElement } from '../../domain/bim'

interface BimInspectorProps {
  element: BimElement | null
}

export function BimInspector({ element }: BimInspectorProps) {
  if (!element) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
        <p className="text-xs text-slate-400">Select a BIM element to inspect its properties.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-sm font-medium text-white">Element Inspector</h3>
      <div className="space-y-2 text-xs text-slate-300">
        <Row label="Name" value={element.name} />
        <Row label="Type" value={element.type} />
        <Row label="IFC Class" value={element.ifcClass} />
        <Row label="Material" value={element.material} />
        <Row label="Floor" value={element.floorId} />
        <Row label="Source CAD" value={element.sourceCadId ?? '—'} />
        <div>
          <span className="text-slate-400">Properties:</span>
          <pre className="mt-1 rounded bg-slate-950 p-2 text-[10px] text-slate-400">
            {JSON.stringify(element.properties, null, 2)}
          </pre>
        </div>
        {element.quantityRefs && element.quantityRefs.length > 0 && (
          <Row label="Quantity Refs" value={element.quantityRefs.join(', ')} />
        )}
        {'width' in element && <Row label="Width" value={`${Number((element as Record<string, unknown>).width ?? 0).toFixed(2)} m`} />}
        {'height' in element && <Row label="Height" value={`${Number((element as Record<string, unknown>).height ?? 0).toFixed(2)} m`} />}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}
