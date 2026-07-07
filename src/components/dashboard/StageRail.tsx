import { cn } from '@/lib/utils'
import { STAGES, type WorkflowStage } from './stages'
import { Check, History, Shield, Camera, FileText } from 'lucide-react'

interface StageRailProps {
  activeStage: number
  onStageChange: (stage: number) => void
  stageStatus?: Record<number, 'done' | 'active' | 'upcoming' | 'blocked'>
  activeTool?: string | null
  onToolChange?: (tool: 'history' | 'governance' | 'snapshots' | 'properties') => void
}

const STATUS_DOT: Record<string, string> = {
  done: 'bg-emerald-500',
  active: 'bg-amber-400 ring-1 ring-amber-400/50',
  upcoming: 'bg-stone-700',
  blocked: 'bg-red-500/50',
}

const PROJECT_TOOLS = [
  { key: 'history' as const, label: 'History', icon: History },
  { key: 'governance' as const, label: 'Governance', icon: Shield },
  { key: 'snapshots' as const, label: 'Snapshots', icon: Camera },
  { key: 'properties' as const, label: 'Properties', icon: FileText },
]

export function StageRail({ activeStage, onStageChange, stageStatus, activeTool, onToolChange }: StageRailProps) {
  return (
    <nav
      className="flex w-56 flex-shrink-0 flex-col border-r border-stone-700/60 bg-stone-950/90"
      aria-label="Dashboard navigation"
    >
      {/* Workflow */}
      <div className="border-b border-stone-700/60 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Workflow</p>
      </div>
      <ol className="space-y-0.5 overflow-y-auto px-2 py-3">
        {STAGES.map((stage: WorkflowStage) => {
          const isActive = stage.id === activeStage
          const status = stageStatus?.[stage.id] ?? (isActive ? 'active' : stage.id < activeStage ? 'done' : 'upcoming')

          return (
            <li key={stage.id}>
              <button
                onClick={() => onStageChange(stage.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-200'
                    : 'text-stone-400 hover:bg-stone-800/60 hover:text-stone-300',
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-800/80">
                  {status === 'done' ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <stage.icon size={12} className="text-current" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-xs font-medium', isActive && 'font-semibold')}>{stage.label}</p>
                  <p className="truncate text-[9px] text-stone-400 leading-tight">{stage.description}</p>
                </div>
                <div className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[status])} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ol>

      {/* Project Tools */}
      <div className="border-b border-t border-stone-700/60 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Project Tools</p>
      </div>
      <ol className="space-y-0.5 overflow-y-auto px-2 py-3">
        {PROJECT_TOOLS.map((tool) => {
          const isActiveTool = activeTool === tool.key
          const Icon = tool.icon
          return (
            <li key={tool.key}>
              <button
                onClick={() => onToolChange?.(tool.key)}
                aria-current={isActiveTool ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  isActiveTool
                    ? 'bg-cyan-500/10 text-cyan-200'
                    : 'text-stone-400 hover:bg-stone-800/60 hover:text-stone-300',
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-800/80">
                  <Icon size={12} className="text-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-xs font-medium', isActiveTool && 'font-semibold')}>{tool.label}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
