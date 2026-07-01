import { useMemo, useState } from 'react'
import type { DesignOption } from '@/domain/boq'
import type { BOQ } from '@/lib/boq/boq-types'
import { buildBoqFromDesignOption, buildExportCsv, buildExportHtml, getCostPerM2, downloadTextFile } from '@/adapters/designToBoq'
import { Calculator, FileDown, FileText, Printer } from 'lucide-react'

interface BoqExportPanelProps {
  selectedDesign: DesignOption | null
}

export function BoqExportPanel({ selectedDesign }: BoqExportPanelProps) {
  const [exported, setExported] = useState(false)

  const boq = useMemo<BOQ | null>(
    () => buildBoqFromDesignOption(selectedDesign),
    [selectedDesign],
  )

  const areaM2 = selectedDesign?.grossFloorArea ?? 0
  const floors = selectedDesign?.floors ?? 0
  const costPerM2 = useMemo(() => (boq ? getCostPerM2(boq, areaM2) : 0), [boq, areaM2])
  const currency = boq?.currency ?? 'USD'
  const sym = currency === 'USD' ? '$' : currency === 'ZAR' ? 'R' : currency === 'KES' ? 'KSh' : '$'

  const handleExportCsv = () => {
    if (!boq || !selectedDesign) return
    const csv = buildExportCsv(boq)
    const slug = selectedDesign.name.toLowerCase().replace(/\s+/g, '-')
    downloadTextFile(`boq-${slug}.csv`, csv, 'text/csv')
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  const handleExportHtml = () => {
    if (!boq || !selectedDesign) return
    const html = buildExportHtml(selectedDesign.name, boq, areaM2, floors)
    const slug = selectedDesign.name.toLowerCase().replace(/\s+/g, '-')
    downloadTextFile(`boq-${slug}.html`, html, 'text/html')
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  const handlePrint = () => {
    if (!boq || !selectedDesign) return
    const html = buildExportHtml(selectedDesign.name, boq, areaM2, floors)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  const money = (n: number) =>
    `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (!selectedDesign) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 border-l border-stone-700/60 bg-stone-950/80 p-4 text-center text-xs text-stone-500">
        <Calculator size={18} className="text-stone-600" />
        <p>Generate or select a design option to create a BOQ.</p>
      </div>
    )
  }

  const wallCount = floors * 4

  return (
    <div className="flex flex-col border-l border-stone-700/60 bg-stone-950/80">
      <div className="flex items-center gap-1 border-b border-stone-700/60 px-2 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">BOQ & Export</span>
      </div>

      <div className="overflow-y-auto p-3">
        {/* Design summary */}
        <div className="mb-3 space-y-1 rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-stone-500">Design</span>
            <span className="text-stone-200 font-medium">{selectedDesign.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Area</span>
            <span className="text-stone-200">{areaM2.toFixed(0)} m²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Floors</span>
            <span className="text-stone-200">{floors}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Walls</span>
            <span className="text-stone-200">{wallCount} perimeter</span>
          </div>
          {costPerM2 > 0 && (
            <div className="flex justify-between border-t border-stone-700/60 pt-1">
              <span className="text-stone-500">Cost / m²</span>
              <span className="text-cyan-300 font-mono font-semibold">{money(costPerM2)}</span>
            </div>
          )}
        </div>

        {/* BOQ table */}
        {boq ? (
          <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border border-stone-700/60">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 bg-stone-800 text-stone-400 uppercase">
                <tr>
                  <th className="px-2 py-1.5">Item</th>
                  <th className="px-2 py-1.5 text-right">Qty</th>
                  <th className="px-2 py-1.5 text-right">Rate</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {boq.items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-800/40">
                    <td className="px-2 py-1">
                      <span className="text-stone-500">{item.category}</span>
                      <span className="ml-1 text-stone-400">· {item.description}</span>
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-stone-400">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-stone-400">
                      {money(item.rate)}
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-cyan-300">
                      {money(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mb-3 flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-900/80 p-4 text-xs text-stone-500">
            Computing BOQ...
          </div>
        )}

        {/* Totals */}
        {boq && (
          <div className="mb-3 space-y-1 rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal</span>
              <span className="text-stone-200 font-mono">{money(boq.summary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Contingency</span>
              <span className="text-stone-200 font-mono">{money(boq.summary.contingency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Prof. Fees</span>
              <span className="text-stone-200 font-mono">{money(boq.summary.professionalFees)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">VAT</span>
              <span className="text-stone-200 font-mono">{money(boq.summary.vat)}</span>
            </div>
            <div className="flex justify-between border-t border-stone-700/60 pt-1">
              <span className="text-stone-200 font-semibold">Grand Total</span>
              <span className="text-emerald-400 font-mono font-bold">{money(boq.summary.grandTotal)}</span>
            </div>
          </div>
        )}

        {/* Export buttons */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleExportCsv}
            disabled={!boq}
            className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 text-xs text-stone-300 transition-colors hover:border-cyan-600/40 hover:bg-cyan-500/5 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown size={14} />
            Export BOQ CSV
          </button>
          <button
            onClick={handleExportHtml}
            disabled={!boq}
            className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 text-xs text-stone-300 transition-colors hover:border-cyan-600/40 hover:bg-cyan-500/5 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText size={14} />
            Export HTML Dossier
          </button>
          <button
            onClick={handlePrint}
            disabled={!boq}
            className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 text-xs text-stone-300 transition-colors hover:border-cyan-600/40 hover:bg-cyan-500/5 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={14} />
            Print / Save as PDF
          </button>
        </div>

        {exported && (
          <p className="mt-2 text-center text-xs text-emerald-400">
            BOQ exported locally.
          </p>
        )}
      </div>
    </div>
  )
}
