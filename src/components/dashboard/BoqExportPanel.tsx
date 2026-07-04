import { useMemo, useState, Fragment, useCallback } from 'react'
import type { DesignOption } from '@/domain/boq'
import { buildBoqFromDesignOption, buildExportCsv, buildExportHtml, getCostPerM2, downloadTextFile } from '@/adapters/designToBoq'
import type { BoqResult } from '@/adapters/designToBoq'
import { getSupportedRegions, getDefaultRegionId } from '@/adapters/rateCardAdapter'
import { Calculator, FileDown, FileText, FilePieChart, Printer, Info, Shield } from 'lucide-react'
import { makeMoney } from '@/lib/utils/currency'
import { captureSnapshot, isValidPngDataUrl } from '@/lib/3d-snapshot'

interface BoqExportPanelProps {
  selectedDesign: DesignOption | null
  boq?: BoqResult | null
  onExport?: (type: 'csv' | 'html' | 'print') => void
}

const regions = getSupportedRegions()

export function BoqExportPanel({ selectedDesign, boq: externalBoq, onExport }: BoqExportPanelProps) {
  const [exported, setExported] = useState(false)
  const [regionId, setRegionId] = useState(getDefaultRegionId())
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [showSource, setShowSource] = useState(false)

  const computedBoq = useMemo(
    () => externalBoq !== undefined ? externalBoq : buildBoqFromDesignOption(selectedDesign, regionId),
    [selectedDesign, regionId, externalBoq],
  )

  const boq = computedBoq

  const sourceMeta = boq?.sourceMetadata

  const areaM2 = selectedDesign?.grossFloorArea ?? 0
  const floors = selectedDesign?.floors ?? 0
  const costPerM2 = useMemo(() => (boq ? getCostPerM2(boq, areaM2) : 0), [boq, areaM2])
  const currency = boq?.currency ?? 'USD'
  const money = useMemo(() => makeMoney(currency), [currency])

  const currentRegion = regions.find((r) => r.id === regionId)

  interface CategoryGroup {
    name: string
    items: { id: string; description: string; quantity: number; rate: number; total: number; unit?: string; category?: string }[]
    subtotal: number
  }

  const groups = useMemo((): CategoryGroup[] => {
    const CATEGORY_DISPLAY: Record<string, string> = {
      Walls: 'Walling',
      Slabs: 'Substructure',
      Roof: 'Roofing',
      Openings: 'Openings',
      Finishes: 'Finishes',
      MEP: 'Services',
      Objects: 'Fittings',
    }
    const CATEGORY_ORDER = ['Slabs', 'Walls', 'Roof', 'Openings', 'Finishes', 'MEP', 'Objects']

    if (!boq) return []
    const grouped = new Map<string, CategoryGroup['items']>()
    for (const item of boq.items) {
      const cat = item.category || 'Other'
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat)!.push({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        total: item.total,
        unit: item.unit,
        category: item.category,
      })
    }
    const result: CategoryGroup[] = []
    for (const cat of CATEGORY_ORDER) {
      const items = grouped.get(cat)
      if (!items || items.length === 0) continue
      result.push({
        name: CATEGORY_DISPLAY[cat] ?? cat,
        items,
        subtotal: Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100,
      })
    }
    for (const [cat, items] of grouped) {
      if (!CATEGORY_ORDER.includes(cat)) {
        result.push({ name: CATEGORY_DISPLAY[cat] ?? cat, items, subtotal: Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100 })
      }
    }
    return result
  }, [boq])

  const handleExportCsv = () => {
    if (!boq || !selectedDesign) return
    const csv = buildExportCsv(boq, currentRegion?.label, boq.quantities, boq.sourceMetadata)
    const slug = selectedDesign.name.toLowerCase().replace(/\s+/g, '-')
    downloadTextFile(`boq-${slug}.csv`, csv, 'text/csv')
    setExported(true)
    onExport?.('csv')
    setTimeout(() => setExported(false), 3000)
  }

  const handleExportHtml = () => {
    if (!boq || !selectedDesign) return
    const html = buildExportHtml(selectedDesign.name, boq, areaM2, floors, currentRegion?.label, boq.assumptions, boq.sourceMetadata)
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

  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const handleExportPdf = useCallback(async () => {
    if (!boq || !selectedDesign) return
    setPdfExporting(true)
    setPdfError(null)

    // Isolate snapshot capture — never block PDF generation
    let snapshot: string | undefined
    try {
      const result = captureSnapshot()
      snapshot = result ?? undefined
      if (snapshot && !isValidPngDataUrl(snapshot)) {
        snapshot = undefined
      }
    } catch (e) {
      console.warn('3D snapshot capture failed, generating PDF without it', e)
      snapshot = undefined
    }

    try {
      const { generatePdfReport } = await import('@/adapters/boqToPdf')
      await generatePdfReport(selectedDesign, boq, snapshot)
      setExported(true)
      onExport?.('print')
    } catch (err) {
      console.error('PDF export failed:', err)
      setPdfError('Failed to generate PDF. Please try again.')
    } finally {
      setPdfExporting(false)
      setTimeout(() => setExported(false), 3000)
      setTimeout(() => setPdfError(null), 6000)
    }
  }, [boq, selectedDesign, onExport])

  if (!selectedDesign) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 border-l border-stone-700/60 bg-stone-950/80 p-4 text-center text-xs text-stone-500">
        <Calculator size={18} className="text-stone-600" />
        <p>Describe your project in the AI Brief first. Once a design is ready, this panel shows your cost estimate and lets you export a report.</p>
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
          <label htmlFor="pricing-region" className="mb-1 block text-xs font-medium text-stone-400">Pricing Region</label>
          <select
            id="pricing-region"
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

        {/* Geometry source badge */}
        {sourceMeta && (
          <div className="mb-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-2.5">
            <button
              onClick={() => setShowSource(!showSource)}
              aria-expanded={showSource}
              className="flex w-full items-center gap-2 text-[10px]"
            >
              <Shield size={12} className="text-cyan-400" />
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                sourceMeta.geometrySource === 'persisted-cad'
                  ? 'bg-amber-500/20 text-amber-300'
                  : sourceMeta.geometrySource === 'fallback-generated'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {sourceMeta.geometrySource === 'persisted-cad' ? 'Edited CAD' :
                 sourceMeta.geometrySource === 'fallback-generated' ? 'Fallback' : 'Generated'}
              </span>
              <span className="text-stone-400">{sourceMeta.quantitySourceLabel}</span>
              <span className="ml-auto">{showSource ? '▲' : '▼'}</span>
            </button>
            {showSource && (
              <div className="mt-1 space-y-1 border-t border-stone-700/60 pt-2 text-[9px] text-stone-400">
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="text-stone-300">{sourceMeta.geometrySource}</span>
                </div>
                <div className="flex justify-between">
                  <span>Computed</span>
                  <span className="text-stone-300">{new Date(sourceMeta.computedAt).toLocaleString()}</span>
                </div>
                {sourceMeta.designId && (
                  <div className="flex justify-between">
                    <span>Design ID</span>
                    <span className="text-stone-300 font-mono">{sourceMeta.designId.slice(0, 12)}...</span>
                  </div>
                )}
                {sourceMeta.cadDocumentId && (
                  <div className="flex justify-between">
                    <span>CAD ID</span>
                    <span className="text-stone-300 font-mono">{sourceMeta.cadDocumentId.slice(0, 12)}...</span>
                  </div>
                )}
                {sourceMeta.sourceWarnings && sourceMeta.sourceWarnings.length > 0 && (
                  <div className="mt-1 space-y-0.5 rounded bg-red-500/10 p-1.5">
                    {sourceMeta.sourceWarnings.map((w, i) => (
                      <p key={i} className="text-red-400">⚠ {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {boq?.quantities && (
          <div className="mb-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-2.5 text-[10px]">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-400">Quantity Basis</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span className="text-stone-500">GFA</span>
              <span className="text-right text-stone-200 tabular-nums">{boq.quantities.grossFloorArea.toFixed(0)} m²</span>
              <span className="text-stone-500">External walls</span>
              <span className="text-right text-stone-200 tabular-nums">{boq.quantities.externalWallArea.toFixed(0)} m²</span>
              <span className="text-stone-500">Partitions</span>
              <span className="text-right text-stone-200 tabular-nums">{boq.quantities.partitionArea.toFixed(0)} m²</span>
              <span className="text-stone-500">Doors / Windows</span>
              <span className="text-right text-stone-200 tabular-nums">{boq.quantities.doorCount} / {boq.quantities.windowCount}</span>
              <span className="text-stone-500">Finish area</span>
              <span className="text-right text-stone-200 tabular-nums">{boq.quantities.finishFloorArea.toFixed(0)} m²</span>
              <span className="text-stone-500">Rooms (wet)</span>
              <span className="text-right text-stone-200 tabular-nums">{boq.quantities.roomCount} ({boq.quantities.wetRoomCount})</span>
            </div>
          </div>
        )}

        {/* BOQ grouped table */}
        {boq ? (
          <div className="mb-3 max-h-80 overflow-x-auto rounded-lg border border-stone-700/60">
            <table className="w-full text-left text-[10px] min-w-[420px]">
              <thead className="sticky top-0 bg-stone-800 text-stone-400 uppercase">
                <tr>
                  <th className="px-2 py-1.5">Item</th>
                  <th className="px-2 py-1.5 text-right">Qty</th>
                  <th className="px-2 py-1.5 text-right">Rate</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {groups.map((group) => (
                  <Fragment key={group.name}>
                    {/* Group header */}
                    <tr className="bg-stone-800/60">
                      <td
                        colSpan={4}
                        className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400"
                      >
                        {group.name}
                      </td>
                    </tr>
                    {/* Group items */}
                    {group.items.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-800/40">
                        <td className="px-2 py-1 pl-4 text-stone-400">
                          {item.description}
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
                    {/* Group subtotal */}
                    <tr className="bg-stone-800/20">
                      <td className="px-2 py-1 pl-4 text-[10px] font-medium text-stone-300">
                        {group.name} subtotal
                      </td>
                      <td colSpan={2} />
                      <td className="px-2 py-1 text-right font-mono tabular-nums font-medium text-stone-200">
                        {money(group.subtotal)}
                      </td>
                    </tr>
                  </Fragment>
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
            <div className="flex justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2">
              <span className="text-sm font-bold text-emerald-300">Grand Total</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{money(boq.summary.grandTotal)}</span>
            </div>
          </div>
        )}

        {/* Rate assumptions toggle */}
        {boq && boq.assumptions && boq.assumptions.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              aria-expanded={showAssumptions}
              aria-controls="rate-assumptions-content"
              className="flex w-full items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 text-xs text-stone-400 transition-colors hover:border-stone-600/60 hover:text-stone-200"
            >
              <Info size={12} />
              Rate Assumptions &nbsp;
              <span className="text-stone-500">({boq.assumptions.filter((a) => a.source === 'fallback').length} fallback)</span>
              <span className="ml-auto">{showAssumptions ? '▲' : '▼'}</span>
            </button>
            {showAssumptions && (
              <div id="rate-assumptions-content" className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-stone-700/60 bg-stone-900/80 p-2 text-[10px]">
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
            onClick={handleExportPdf}
            disabled={!boq || pdfExporting}
            className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/80 px-3 py-2 text-xs text-stone-300 transition-colors hover:border-cyan-600/40 hover:bg-cyan-500/5 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FilePieChart size={14} />
            {pdfExporting ? 'Preparing PDF\u2026' : 'Download PDF Report'}
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

        {pdfError && (
          <p className="mt-2 text-center text-xs text-red-400" role="alert">
            {pdfError}
          </p>
        )}
        {exported && !pdfError && (
          <p className="mt-2 text-center text-xs text-emerald-400">
            BOQ exported locally.
          </p>
        )}
      </div>
    </div>
  )
}
