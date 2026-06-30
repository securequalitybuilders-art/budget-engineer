import { useMemo, useState } from 'react'
import type { CadDocument } from '../domain/cad'

export function useCadHistory(initial: CadDocument | null) {
  const [past, setPast] = useState<CadDocument[]>([])
  const [present, setPresent] = useState<CadDocument | null>(initial)
  const [future, setFuture] = useState<CadDocument[]>([])

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const commit = (next: CadDocument) => {
    setPast((items) => (present ? [...items, present].slice(-60) : items))
    setPresent(next)
    setFuture([])
  }

  const undo = () => {
    if (!present || !past.length) return
    const previous = past[past.length - 1]
    setPast((items) => items.slice(0, -1))
    setFuture((items) => [present, ...items].slice(0, 60))
    setPresent(previous)
  }

  const redo = () => {
    if (!present || !future.length) return
    const next = future[0]
    setPast((items) => [...items, present].slice(-60))
    setFuture((items) => items.slice(1))
    setPresent(next)
  }

  const resetTo = (next: CadDocument | null) => {
    setPast([])
    setFuture([])
    setPresent(next)
  }

  return useMemo(() => ({ present, commit, undo, redo, canUndo, canRedo, resetTo }), [present, canUndo, canRedo])
}
