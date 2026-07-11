import { useEffect, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useDisciplineStore } from '@/stores/disciplineStore'
import { getStagesForDiscipline, type StageId } from '@/lib/studio/stageRegistry'
import { Check, History, Shield, Camera, FileText, Menu, X } from 'lucide-react'

interface MobileNavDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeStageId: StageId
  onStageChange: (stageId: StageId) => void
  stageStatus?: Partial<Record<StageId, 'done' | 'active' | 'upcoming' | 'blocked'>>
  activeTool?: string | null
  onToolChange?: (tool: 'history' | 'governance' | 'snapshots' | 'properties') => void
  currentStageLabel: string
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

export function MobileNavDrawer({
  open,
  onOpenChange,
  activeStageId,
  onStageChange,
  stageStatus,
  activeTool,
  onToolChange,
  currentStageLabel,
}: MobileNavDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const previousActiveRef = useRef<Element | null>(null)
  const currentDiscipline = useDisciplineStore((s) => s.currentDiscipline)
  const stages = useMemo(() => getStagesForDiscipline(currentDiscipline), [currentDiscipline])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    previousActiveRef.current = document.activeElement
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
        return
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    setTimeout(() => {
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>('button')
      firstFocusable?.focus()
    }, 50)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousActiveRef.current instanceof HTMLElement) {
        previousActiveRef.current.focus()
      }
    }
  }, [open, handleClose])

  function handleStageClick(stageId: StageId) {
    onStageChange(stageId)
    handleClose()
  }

  function handleToolClick(tool: 'history' | 'governance' | 'snapshots' | 'properties') {
    onToolChange?.(tool)
    handleClose()
  }

  return (
    <>
      <button
        ref={toggleRef}
        onClick={() => onOpenChange(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal={open}
        aria-label="Dashboard navigation menu"
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-stone-950 border-r border-stone-700/60 shadow-2xl transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-stone-700/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Menu</p>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
            aria-label="Close navigation menu"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-stone-700/60 px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Workflow</p>
        </div>
        <ol className="space-y-0.5 overflow-y-auto px-2 py-3">
          {stages.map((stage) => {
            const isActive = stage.id === activeStageId
            const status = stageStatus?.[stage.id] ?? (isActive ? 'active' : 'upcoming')
            return (
              <li key={stage.id}>
                <button
                  onClick={() => handleStageClick(stage.id)}
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
                  onClick={() => handleToolClick(tool.key)}
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
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <span className="text-xs font-medium text-stone-300 truncate max-w-[140px]">{currentStageLabel}</span>
      </div>
    </>
  )
}
