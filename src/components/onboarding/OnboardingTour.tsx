import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { JOURNEY_STEPS } from '@/components/dashboard/journeySteps'

const COLOR_MAP = ['#06B6D4', '#8B5CF6', '#1a365d', '#06B6D4', '#8B5CF6', '#1a365d']

export interface OnboardingTourProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export function OnboardingTour({ open, onClose, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      setStep(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    requestAnimationFrame(() => {
      focusable?.focus()
    })
  }, [open, step])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Tab') {
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  const handleClose = useCallback(() => {
    onClose()
    requestAnimationFrame(() => {
      triggerRef.current?.focus()
    })
  }, [onClose])

  const handleComplete = useCallback(() => {
    onComplete()
    handleClose()
  }, [onComplete, handleClose])

  const isLast = step === JOURNEY_STEPS.length - 1
  const current = JOURNEY_STEPS[step]
  if (!current) return null

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            aria-describedby="onboarding-desc"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'mx-4 w-full max-w-lg rounded-2xl border border-stone-700/60 p-6 shadow-2xl',
              'bg-stone-950/95 backdrop-blur-xl'
            )}
          >
            <div className="flex items-start justify-between">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${COLOR_MAP[step]}20` }}
              >
                <current.icon size={24} style={{ color: COLOR_MAP[step] }} aria-hidden="true" />
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors"
                aria-label="Skip tour"
              >
                <X size={18} />
              </button>
            </div>

            <h2 id="onboarding-title" className="mt-3 text-xl font-bold text-white">
              {current.label}
            </h2>
            <p id="onboarding-desc" className="mt-2 text-sm leading-relaxed text-stone-300">
              {current.description}
            </p>

            {/* Progress dots */}
            <div className="mt-6 flex items-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={JOURNEY_STEPS.length}>
              {JOURNEY_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === step ? 'w-8' : 'w-1.5',
                    i <= step ? 'bg-cyan-400' : 'bg-stone-700'
                  )}
                  aria-hidden="true"
                />
              ))}
              <span className="ml-auto text-[10px] text-stone-400">
                {step + 1} / {JOURNEY_STEPS.length}
              </span>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => Math.max(s - 1, 0))}
                    className="flex items-center gap-1 rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 transition-colors"
                    aria-label="Previous step"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isLast && (
                  <button
                    onClick={handleClose}
                    className="rounded-lg px-3 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
                    aria-label="Skip tour"
                  >
                    Skip tour
                  </button>
                )}
                <button
                  onClick={isLast ? handleComplete : () => setStep((s) => Math.min(s + 1, JOURNEY_STEPS.length - 1))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    isLast
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                      : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700'
                  )}
                  aria-label={isLast ? 'Get started' : 'Next step'}
                >
                  {isLast ? 'Get started' : 'Next'}
                  {!isLast && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
