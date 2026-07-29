import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { MILLWORK_PHASE } from '@/engine/construction/constructionPhases'

export function MillworkStage() {
  return <ConstructionPhaseView phase={MILLWORK_PHASE} />
}
