import { lazy, Suspense } from 'react'
import type { BimModel } from '../../domain/bim'

const BimViewerInner = lazy(() => import('./BimViewer').then((m) => ({ default: m.BimViewer })))

interface LazyBimViewerProps {
  model: BimModel | null
  activeFloorId?: string | null
  selectedElementId?: string | null
  onSelectElement?: (id: string | null) => void
  height?: number
}

export function LazyBimViewer(props: LazyBimViewerProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60" style={{ height: props.height ?? 480 }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      }
    >
      <BimViewerInner {...props} />
    </Suspense>
  )
}
