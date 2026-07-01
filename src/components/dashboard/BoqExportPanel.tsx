import { useMemo, useState } from 'react'
import type { DesignOption } from '@/domain/boq'
import { buildBoqFromDesignOption, buildExportCsv, buildExportHtml, getCostPerM2, downloadTextFile } from '@/adapters/designToBoq'
import { getSupportedRegions, getDefaultRegionId } from '@/adapters/rateCardAdapter'
import { Calculator, FileDown, FileText, Printer, Info } from 'lucide-react'

interface BoqExportPanelProps {
  selectedDesign: DesignOption | null
  onExport?: (type: 'csv' | 'html' | 'print') => void
}

const regions = getSupportedRegions()

export function BoqExportPanel({ selectedDesign, onExport }: BoqExportPanelProps) {
  const [exported, setExported] = useState(false)
  const [regionId, setRegionId] = useState(getDefaultRegionId())
  const [showAssumptions, setShowAssumptions] = useState(false)

  const boq = useMemo(
    () => buildBoqFromDesignOption(selectedDesign, regionId),
    [selectedDesign, regionId],
  )

  const areaM2 = selectedDesign?.grossFloorArea ?? 0
  const floors = selectedDesign?.floors ?? 0
  const costPerM2 = useMemo(() => (boq ? getCostPerM2(boq, areaM2) : 0), [boq, areaM2])
  const currency = boq?.currency ?? 'USD'
  const sym = currency === 'USD' ? '$' : currency === 'ZAR' ? 'R' : currency === 'KES' ? 'KSh' : '$'

  const currentRegion = regions.find((r) => r.id === regionId)

  const handleExportCsv = () => {
    if (!boq || !selectedDesign) return
    const csv = buildExportCsv(boq, currentRegion?.label)
    const slug = selectedDesign.name.toLowerCase().replace(/\s+/g, '-')
    downloadTextFile(`boq-${slug}.csv`, csv, 'text/csv')
    setExported(true)
    onExport?.('csv')
    setTimeout(() => setExported(false), 3000)
  }

  const handleExportHtml = () => {
    if (!boq || !selectedDesign) return
    const html = buildExportHtml(selectedDesign.name, boq, areaM2, floors, currentRegion?.label, boq.assumptions)
    const slug = selectedDesign.name.toLowerCase().replace(/\s+/g, '-')
    downloadTextFile(`boq-${slug}.html`, html, 'text/html')
    setExported(true)
    onExport?.('html')
    setTimeout(() => setExported(false), 3000)
  }

  const handlePrint = () => {
    if (!boq || !selectedDesign) return
    const html = buildExportHtml(selectedDesign.name, boq, areaM2, floors, currentRegion?.label, boq.assumptions)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
    onExport?.('print')
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

  return (
    <div className="flex flex-col border-l border-stone-700/60 bg-stone-950/80">
      <div className="flex items-center gap-1 border-b border-stone-700/60 px-2 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">BOQ & Export</span>
      </div>

      <div className="overflow-y-auto p-3">
        {/* Region selector */}
        <div className="mb-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
          <label className="mb-1 block text-xs font-medium text-stone-400">Pricing Region</label>
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

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
            <span className="text-stone-500">Currency</span>
            <span className="text-stone-200">{currency}</span>
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

        {/* Rate assumptions toggle */}
        {boq && boq.assumptions && boq.assumptions.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="flex w-full items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 text-xs text-stone-400 transition-colors hover:border-stone-600/60 hover:text-stone-200"
            >
              <Info size={12} />
              Rate Assumptions &nbsp;
              <span className="text-stone-500">({boq.assumptions.filter((a) => a.source === 'fallback').length} fallback)</span>
              <span className="ml-auto">{showAssumptions ? '▲' : '▼'}</span>
            </button>
            {showAssumptions && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-stone-700/60 bg-stone-900/80 p-2 text-[10px]">
                {boq.assumptions.map((a) => (
                  <div key={a.itemKey} className="flex items-start gap-2 border-b border-stone-800/60 py-1.5 last:border-0">
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${a.source === 'rate-card' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-stone-300">{a.label}</span>
                        <span className="font-mono text-stone-400">{money(a.rate)}/{a.currency}</span>
                      </div>
                      {a.warning && <p className="mt-0.5 text-amber-400/80">{a.warning}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
