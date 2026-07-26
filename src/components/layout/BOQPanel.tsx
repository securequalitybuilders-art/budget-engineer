import { Fragment } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fmtCents } from '@/lib/utils';
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
import { Table, ChevronDown, Calculator, Loader2, Layers } from 'lucide-react';
import { useState } from 'react';

export function BOQPanel() {
  const { currentBOQ, currentDesigns, generateBOQ, boqStale, currentProject } = useProjectStore();
  const { boqPanelOpen, toggleBoqPanel } = useUIStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateBOQ = async () => {
    if (currentDesigns.length === 0) return;
    setIsGenerating(true);
    try {
      await generateBOQ(currentDesigns[0].projectId, currentDesigns[0].id);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!boqPanelOpen) {
    return (
      <button
        onClick={toggleBoqPanel}
        className="absolute bottom-4 left-1/2 z-10 flex h-8 items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
        aria-label="Open BOQ panel"
      >
        <Table size={14} />
        BOQ
      </button>
    );
  }

  return (
    <div className="h-80 flex-shrink-0 overflow-hidden border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="font-display font-semibold">Bill of Quantities</h3>
          {currentBOQ ? (
            <>
              <Badge variant="success">
                {fmtCents(currentBOQ.totalCents, currentBOQ.currency)}
              </Badge>
              {currentBOQ.estimateDepth && (
                <Badge variant={currentBOQ.estimateDepth === 'detailed' ? 'success' : currentBOQ.estimateDepth === 'shell-with-allowances' ? 'secondary' : 'warning'} className="gap-1">
                  <Layers size={12} />
                  {currentBOQ.estimateDepth === 'detailed' ? 'Detailed' : currentBOQ.estimateDepth === 'shell-with-allowances' ? 'Shell + Allowances' : 'Shell'}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="secondary">No BOQ yet</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentDesigns.length > 0 && (
            <Button
              variant="brand"
              size="sm"
              className="h-8 gap-2"
              onClick={handleGenerateBOQ}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
              {isGenerating ? 'Costing...' : currentBOQ ? 'Recalculate' : 'Generate'}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleBoqPanel} aria-label="Close BOQ panel">
            <ChevronDown size={18} />
          </Button>
        </div>
      </div>

      {boqStale && currentBOQ && currentProject && (
        <div className="flex items-center gap-2 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-400 border-b border-amber-500/20">
          <span className="font-medium">Rates changed</span>
          <span>
            — BOQ was generated for <strong>{currentBOQ.pricingRegion ?? currentProject.region}</strong> but
            project is now set to <strong>{currentProject.region}</strong>.
          </span>
        </div>
      )}

      <div className="h-[calc(100%-3rem)] overflow-auto">
        {currentBOQ ? (
          <div className="grid h-full grid-cols-1 lg:grid-cols-3">
            <div className="col-span-2 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--bg-secondary)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-2">Section</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Qty</th>
                    <th className="px-4 py-2">Unit</th>
                    <th className="px-4 py-2">Rate</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {currentBOQ.sections.map((section) => (
                    <Fragment key={section.id}>
                      <tr className="bg-[var(--bg-tertiary)]/50">
                        <td colSpan={6} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--brand-accent)]">
                          {section.code} — {section.title}
                        </td>
                      </tr>
                      {section.items.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--bg-tertiary)]/30">
                          <td className="px-4 py-2 font-mono text-[var(--text-muted)]">{section.code}</td>
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2 font-mono tabular-nums">{item.quantity}</td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{item.unit}</td>
                          <td className="px-4 py-2 font-mono tabular-nums">{fmtCents(item.rateCents, currentBOQ.currency)}</td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--brand-accent)]">
                            {fmtCents(item.totalCents, currentBOQ.currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[var(--bg-tertiary)]/20">
                        <td colSpan={5} className="px-4 py-1.5 text-right text-xs font-medium text-[var(--text-secondary)]">
                          {section.title} subtotal
                        </td>
                        <td className="px-4 py-1.5 text-right font-mono text-sm font-medium text-[var(--text-primary)]">
                          {fmtCents(section.subtotalCents, currentBOQ.currency)}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hidden border-l border-[var(--border-default)] bg-[var(--bg-tertiary)]/30 p-4 lg:block">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Summary</h4>
              <div className="mb-3 space-y-1 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {fmtCents(currentBOQ.totalCents - currentBOQ.contingencyCents, currentBOQ.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Contingency</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {fmtCents(currentBOQ.contingencyCents, currentBOQ.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[var(--border-default)] pt-1">
                  <span className="font-semibold text-[var(--text-primary)]">Total</span>
                  <span className="font-mono font-semibold text-[var(--brand-accent)]">
                    {fmtCents(currentBOQ.totalCents, currentBOQ.currency)}
                  </span>
                </div>
              </div>
              <CostBreakdownChart sections={currentBOQ.sections} currency={currentBOQ.currency} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-[var(--text-muted)]">
            <Table size={32} className="mb-2 opacity-30" />
            <p className="mb-3">Generate a design first, then create a BOQ.</p>
            {currentDesigns.length > 0 && (
              <Button variant="brand" size="sm" className="gap-2" onClick={handleGenerateBOQ} disabled={isGenerating}>
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                Generate BOQ from design
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
