import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fmtCents } from '@/lib/utils';
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
import { Table, ChevronDown, FileDown, Loader2, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BOQPanel() {
  const { currentBOQ, currentDesigns, generateBOQ } = useProjectStore();
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
            <Badge variant="success">
              {fmtCents(currentBOQ.totalCents, currentBOQ.currency)}
            </Badge>
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
              {isGenerating ? 'Costing...' : currentBOQ ? 'Recalculate BOQ' : 'Generate BOQ'}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 gap-2" disabled={!currentBOQ}>
            <FileDown size={14} />
            Export CSV
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleBoqPanel} aria-label="Close BOQ panel">
            <ChevronDown size={18} />
          </Button>
        </div>
      </div>

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
                    <th className="px-4 py-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {currentBOQ.sections.flatMap((section) =>
                    section.items.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--bg-tertiary)]/50">
                        <td className="px-4 py-2 font-mono text-[var(--text-muted)]">{section.code}</td>
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2 font-mono tabular-nums">{item.quantity}</td>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">{item.unit}</td>
                        <td className="px-4 py-2 font-mono tabular-nums">{fmtCents(item.rateCents, currentBOQ.currency)}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--brand-accent)]">
                          {fmtCents(item.totalCents, currentBOQ.currency)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs', item.source === 'auto' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>
                            {item.source}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="hidden border-l border-[var(--border-default)] bg-[var(--bg-tertiary)]/30 p-4 lg:block">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Cost Breakdown</h4>
              <CostBreakdownChart sections={currentBOQ.sections} currency={currentBOQ.currency} />
              <div className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {fmtCents(currentBOQ.totalCents - currentBOQ.contingencyCents, currentBOQ.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Contingency (10%)</span>
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
