import type { BackdropState } from '@/lib/import/backdropUtils'

interface TraceBackdropProps {
  backdrop: BackdropState
  planWidth: number
  planHeight: number
}

export function TraceBackdrop({ backdrop, planWidth, planHeight }: TraceBackdropProps) {
  if (!backdrop.imageDataUrl || !backdrop.visible) return null

  const displayW = backdrop.pxPerMetre && backdrop.pxPerMetre > 0
    ? backdrop.naturalWidth / backdrop.pxPerMetre
    : planWidth
  const displayH = backdrop.pxPerMetre && backdrop.pxPerMetre > 0
    ? backdrop.naturalHeight / backdrop.pxPerMetre
    : planHeight

  const offsetX = (planWidth - displayW) / 2
  const offsetY = (planHeight - displayH) / 2

  return (
    <image
      href={backdrop.imageDataUrl}
      x={offsetX}
      y={offsetY}
      width={displayW}
      height={displayH}
      opacity={backdrop.opacity}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    />
  )
}

interface BackdropControlsProps {
  backdrop: BackdropState
  onUpdate: (update: Partial<BackdropState>) => void
  onSetScale: (knownWidth: number, knownHeight: number) => void
  onClear: () => void
}

export function BackdropControls({ backdrop, onUpdate, onSetScale, onClear }: BackdropControlsProps) {
  if (!backdrop.imageDataUrl) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs">
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={backdrop.visible}
          onChange={(e) => onUpdate({ visible: e.target.checked })}
          className="h-3 w-3"
          aria-label="Toggle backdrop visibility"
        />
        <span className="text-slate-300">Backdrop</span>
      </label>

      <label className="flex items-center gap-1">
        <span className="text-slate-400">Opacity</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={backdrop.opacity}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="h-1.5 w-16 accent-cyan-400"
          aria-label="Backdrop opacity"
        />
      </label>

      <div className="flex items-center gap-1">
        <span className="text-slate-400">Scale:</span>
        <input
          type="number"
          placeholder="Width m"
          min="0.1"
          step="0.5"
          className="w-16 rounded border border-white/10 bg-slate-800 px-1 py-0.5 text-xs text-white"
          aria-label="Known width in metres"
          id="cal-width"
        />
        <span className="text-slate-400">×</span>
        <input
          type="number"
          placeholder="Height m"
          min="0.1"
          step="0.5"
          className="w-16 rounded border border-white/10 bg-slate-800 px-1 py-0.5 text-xs text-white"
          aria-label="Known height in metres"
          id="cal-height"
        />
        <button
          onClick={() => {
            const w = parseFloat((document.getElementById('cal-width') as HTMLInputElement)?.value)
            const h = parseFloat((document.getElementById('cal-height') as HTMLInputElement)?.value)
            if (w > 0 && h > 0) onSetScale(w, h)
          }}
          className="rounded bg-cyan-600/30 px-2 py-0.5 text-cyan-300 hover:bg-cyan-600/50"
          aria-label="Set backdrop scale"
        >
          Set
        </button>
      </div>

      <button
        onClick={onClear}
        className="rounded bg-red-600/20 px-2 py-0.5 text-red-300 hover:bg-red-600/40"
        aria-label="Remove backdrop image"
      >
        Remove
      </button>
    </div>
  )
}
