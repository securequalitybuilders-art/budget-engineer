import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { FINISHES_PHASE } from '@/engine/construction/constructionPhases'

export function FinishesStage() {
  return <ConstructionPhaseView phase={FINISHES_PHASE} />
}
