import { useState } from 'react'
import type { ConstructionPhase, WorkItem } from '@/domain/construction'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface ConstructionPhaseViewProps {
  phase: ConstructionPhase
}

type Tab = 'work' | 'materials' | 'bom'

export function ConstructionPhaseView({ phase }: ConstructionPhaseViewProps) {
  const [tab, setTab] = useState<Tab>('work')
  const [workItems, setWorkItems] = useState<WorkItem[]>(phase.workItems)

  const toggleStatus = (id: string) => {
    setWorkItems(prev => prev.map(w => {
      if (w.id !== id) return w
      const next = w.status === 'pending' ? 'in-progress' : w.status === 'in-progress' ? 'completed' : 'pending'
      return { ...w, status: next }
    }))
  }

  const completed = workItems.filter(w => w.status === 'completed').length
  const inProgress = workItems.filter(w => w.status === 'in-progress').length
  const pending = workItems.filter(w => w.status === 'pending').length
  const progressPct = workItems.length > 0 ? Math.round((completed / workItems.length) * 100) : 0

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{phase.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{phase.description}</p>
          <div className="mt-2 flex gap-3 text-[11px] text-[var(--text-muted)]">
            <span>Trade: {phase.trade}</span>
            <span>Est. {phase.estimatedDays} days</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="font-medium text-[var(--text-primary)]">Progress</span>
          <span className="text-[var(--text-muted)]">{completed}/{workItems.length} items · {progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mt-1 flex gap-4 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><Circle size={8} className="text-stone-400" /> {pending} pending</span>
          <span className="flex items-center gap-1"><Clock size={8} className="text-amber-400" /> {inProgress} in progress</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={8} className="text-green-400" /> {completed} done</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1">
        {([['work', 'Work Items'], ['materials', 'Materials'], ['bom', 'BOQ']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${tab === k ? 'bg-cyan-600/20 text-cyan-300' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]'}`}
          >{label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'work' && (
        <div className="space-y-1.5">
          {workItems.map(w => (
            <button key={w.id} onClick={() => toggleStatus(w.id)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                w.status === 'completed' ? 'border-green-700/30 bg-green-900/10' :
                w.status === 'in-progress' ? 'border-amber-700/30 bg-amber-900/10' :
                'border-[var(--border-default)] bg-[var(--bg-secondary)]'
              }`}
            >
              {w.status === 'completed' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-400" /> :
               w.status === 'in-progress' ? <Clock size={16} className="mt-0.5 shrink-0 text-amber-400" /> :
               <Circle size={16} className="mt-0.5 shrink-0 text-stone-500" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${w.status === 'completed' ? 'text-green-300 line-through' : 'text-[var(--text-primary)]'}`}>{w.label}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">({w.quantity} {w.unit})</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{w.description}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[var(--text-muted)]">{w.material}</span>
                  <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-cyan-400">{w.spec}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === 'materials' && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-secondary)]">
              <tr className="text-left text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Specification</th>
                <th className="px-3 py-2 font-medium">Application</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {phase.materials.map((m, i) => (
                <tr key={i} className="bg-[var(--bg-primary)]">
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{m.name}</td>
                  <td className="px-3 py-2 text-cyan-400">{m.spec}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{m.application}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bom' && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-secondary)]">
              <tr className="text-left text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Specification</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium text-right">Qty</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {phase.bom.map((b, i) => (
                <tr key={i} className="bg-[var(--bg-primary)]">
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{b.item}</td>
                  <td className="px-3 py-2 text-cyan-400">{b.spec}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{b.unit}</td>
                  <td className="px-3 py-2 text-right text-[var(--text-primary)]">{b.qty}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{b.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
