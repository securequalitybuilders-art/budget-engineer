import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { JOURNEY_STEPS } from './journeySteps'
import { useUIStore } from '@/stores/uiStore'

interface BuilderJourneyGuideProps {
  hasDesignOptions: boolean
  selectedDesignName?: string
  activeCanvasView?: 'plan' | 'bim' | 'drawings'
  hasBoq?: boolean
  hasAnalysis?: boolean
}

type StepStatus = 'done' | 'active' | 'upcoming'

const TEMPLATES = [
  {
    label: 'Affordable family house',
    brief: '3-bedroom, 2-bathroom house with open-plan living, kitchen, and a small veranda. Total budget around $45,000. Flat site in a suburban area.',
  },
  {
    label: 'Duplex / rental units',
    brief: '2-unit duplex with 2 bedrooms each, shared parking, simple finishes. Budget $80,000. Level urban plot.',
  },
  {
    label: 'Rural clinic / NGO facility',
    brief: 'Small rural clinic with 4 consultation rooms, waiting area, pharmacy, 2 toilets. Solar power, rainwater harvesting. Budget $120,000.',
  },
  {
    label: 'Small shop / commercial space',
    brief: 'Ground-floor shop with storage room and customer WC. Open frontage, simple finishes. Budget $30,000. High-street location.',
  },
]

function getStepStatus(stepId: number, currentStep: number): StepStatus {
  if (stepId < currentStep) return 'done'
  if (stepId === currentStep) return 'active'
  return 'upcoming'
}

function getNextAction(currentStep: number): string {
  const actions: Record<number, string> = {
    1: 'Go to the Brief panel to describe your project in plain English.',
    2: 'Review the design options and select one to explore.',
    3: 'Edit your design in the 2D canvas or switch to 3D view.',
    4: 'Run compliance checks and structural analysis on your design.',
    5: 'Generate drawings and BIM model exports.',
    6: 'All done! View your BOQ and export a report.',
  }
  return actions[currentStep] ?? ''
}

const STEPS = JOURNEY_STEPS

export function BuilderJourneyGuide({
  hasDesignOptions: _hasDesignOptions,
  selectedDesignName: _selectedDesignName,
  activeCanvasView: _activeCanvasView,
  hasBoq: _hasBoq,
  hasAnalysis: _hasAnalysis,
}: BuilderJourneyGuideProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const navigate = useNavigate()
  const { activeStage } = useUIStore()

  const currentStep = activeStage
  const nextAction = getNextAction(currentStep)
  const currentStepLabel = STEPS.find((s) => s.id === currentStep)?.label ?? ''

  return (
    <div
      className="flex w-72 min-w-[200px] flex-shrink-0 flex-col border-l border-stone-700/60 bg-stone-950/80"
      role="region"
      aria-label="Builder journey guide"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between border-b border-stone-700/60 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-cyan-400 hover:bg-stone-900/50"
        aria-expanded={isOpen}
        aria-controls="journey-guide-content"
      >
        <span className="flex items-center gap-1.5">
          <Calculator size={13} />
          Builder Guide
        </span>
        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {isOpen && (
        <div id="journey-guide-content" className="flex flex-col overflow-y-auto">
          <div className="space-y-2 px-3 py-2.5">
            <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/15 px-2.5 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-300">Current step</p>
              <p className="mt-0.5 text-sm font-medium text-white">{currentStepLabel || 'Start your project'}</p>
              {nextAction && (
                <>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">Next</p>
                  <p className="text-[11px] leading-relaxed text-stone-300">{nextAction}</p>
                </>
              )}
            </div>
          </div>

          <nav aria-label="Journey steps" className="px-3 pb-1">
            <ol className="space-y-0">
              {STEPS.map((step) => {
                const status = getStepStatus(step.id, currentStep)
                return (
                  <li key={step.id} className="flex items-start gap-2 py-1.5">
                    <div
                      className={cn(
                        'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                        status === 'done' && 'bg-cyan-500/20 text-cyan-300',
                        status === 'active' && 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
                        status === 'upcoming' && 'bg-stone-800 text-stone-400',
                      )}
                      aria-hidden="true"
                    >
                      {status === 'done' ? '✓' : step.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-[11px] leading-tight',
                          status === 'done' && 'text-stone-400 line-through',
                          status === 'active' && 'font-medium text-white',
                          status === 'upcoming' && 'text-stone-400',
                        )}
                      >
                        {step.label}
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 text-[10px] leading-tight',
                          status === 'active' ? 'text-stone-400' : 'text-stone-400',
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </nav>

          {currentStep === 1 && (
            <div className="border-t border-stone-700/60 px-3 py-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex w-full items-center justify-between text-[10px] font-medium uppercase tracking-wider text-cyan-400 hover:text-cyan-300"
                aria-expanded={showTemplates}
              >
                Try an example brief
                {showTemplates ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {showTemplates && (
                <div className="mt-1.5 space-y-1">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => navigate('/new')}
                      className="block w-full rounded-md border border-stone-700/50 px-3 py-2 text-left text-[11px] text-stone-300 hover:border-cyan-600/40 hover:bg-cyan-500/5 hover:text-white"
                    >
                      <span className="text-[10px] font-medium text-cyan-400">{t.label}</span>
                      <p className="mt-0.5 text-[10px] text-stone-400 line-clamp-2">{t.brief}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-auto border-t border-stone-700/60 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-amber-500/80">
              For final construction, consult a registered architect, engineer, and quantity surveyor.
            </p>
            <p className="mt-1 text-[9px] text-stone-400">
              No CAD experience needed. Works in your browser. No paid AI required. Early estimate — not professional sign-off.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
