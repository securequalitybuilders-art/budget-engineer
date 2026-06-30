import { useEffect } from 'react'
import type { CadDocument } from '../domain/cad'
import type { PlanModel } from '../domain/plan'
import { seedCadDocument } from '../lib/cad/cad-seed'
import { useCadHistory } from './useCadHistory'

export function useCadDocument(initialDoc: CadDocument | null, projectId: string | null, designId: string | null, plan: PlanModel | null) {
  const history = useCadHistory(initialDoc)

  useEffect(() => {
    if (initialDoc) {
      history.resetTo(initialDoc)
      return
    }
    if (!projectId || !designId || !plan) {
      history.resetTo(null)
      return
    }
    history.resetTo(seedCadDocument(projectId, designId, plan))
  }, [initialDoc, projectId, designId, plan?.id])

  return {
    doc: history.present,
    setDoc: history.commit,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
}
