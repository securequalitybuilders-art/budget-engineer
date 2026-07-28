import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { ROUGH_IN_PHASE } from '@/engine/construction/constructionPhases'

export function RoughInStage() {
  return <ConstructionPhaseView phase={ROUGH_IN_PHASE} />
}
