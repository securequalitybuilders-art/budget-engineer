import type { BOQ } from '../../domain/boq'
import { formatCurrency } from '../../lib/money'

interface BOQPanelProps {
  boq: BOQ | null
}

const sectionLabel: Record<string, string> = {
  general: 'General',
  substructure: 'Substructure',
  superstructure: 'Superstructure',
  finishes: 'Finishes',
  services: 'Services',
  external: 'External',
}

export function BOQPanel({ boq }: BOQPanelProps) {
  if (!boq) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No BOQ generated yet. Select a design option and click <span className="font-semibold text-white">Generate BOQ</span>.
      </div>
    )
  }

  const grouped = boq.lineItems.reduce<Record<string, typeof boq.lineItems>>((acc, item) => {
    acc[item.section] ??= []
    acc[item.section].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Subtotal" value={formatCurrency(boq.totals.subtotalCents, boq.currency)} />
        <SummaryCard label="Contingency" value={formatCurrency(boq.totals.contingencyCents, boq.currency)} />
        <SummaryCard label="Prof. Fees" value={formatCurrency(boq.totals.professionalFeesCents, boq.currency)} />
        <SummaryCard label="VAT" value={formatCurrency(boq.totals.vatCents, boq.currency)} />
        <SummaryCard label="Grand Total" value={formatCurrency(boq.totals.grandTotalCents, boq.currency)} emphasis />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-slate-300 backdrop-blur">
              <tr>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([section, items]) => (
                items.map((item, index) => (
                  <tr key={item.id} className="border-t border-white/5 text-slate-100">
                    <td className="px-4 py-3 align-top text-slate-400">{index === 0 ? sectionLabel[section] ?? section : ''}</td>
                    <td className="px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3">{item.quantity.toFixed(2)}</td>
                    <td className="px-4 py-3 uppercase text-slate-400">{item.unit}</td>
                    <td className="px-4 py-3">{formatCurrency(item.unitRateCents, boq.currency)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(item.amountCents, boq.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs ${item.estimated ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                        {item.estimated ? 'Estimated' : 'Matched'}
                      </span>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'border-cyan-400/30 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${emphasis ? 'text-cyan-200' : 'text-white'}`}>{value}</div>
    </div>
  )
}
