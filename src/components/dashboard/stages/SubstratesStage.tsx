import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { SUBSTRATES_PHASE } from '@/engine/construction/constructionPhases'

export function SubstratesStage() {
  return <ConstructionPhaseView phase={SUBSTRATES_PHASE} />
}
