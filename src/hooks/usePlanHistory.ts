import { useMemo, useState } from 'react'
import type { PlanModel } from '../domain/plan'

export function usePlanHistory(initial: PlanModel | null) {
  const [past, setPast] = useState<PlanModel[]>([])
  const [present, setPresent] = useState<PlanModel | null>(initial)
  const [future, setFuture] = useState<PlanModel[]>([])

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const set = (next: PlanModel) => {
    setPast((items) => (present ? [...items, present].slice(-50) : items))
    setPresent(next)
    setFuture([])
  }

  const undo = () => {
    if (!canUndo || !present) return
    const previous = past[past.length - 1]
    setPast((items) => items.slice(0, -1))
    setFuture((items) => [present, ...items].slice(0, 50))
    setPresent(previous)
  }

  const redo = () => {
    if (!canRedo || !future[0] || !present) return
    const next = future[0]
    setPast((items) => [...items, present].slice(-50))
    setFuture((items) => items.slice(1))
    setPresent(next)
  }

  const resetTo = (next: PlanModel | null) => {
    setPast([])
    setFuture([])
    setPresent(next)
  }

  return useMemo(() => ({ past, present, future, set, undo, redo, canUndo, canRedo, resetTo }), [past, present, future, canUndo, canRedo])
}
