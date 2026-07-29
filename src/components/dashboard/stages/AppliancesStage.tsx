import { ConstructionPhaseView } from '@/components/construction/ConstructionPhaseView'
import { APPLIANCES_PHASE } from '@/engine/construction/constructionPhases'

export function AppliancesStage() {
  return <ConstructionPhaseView phase={APPLIANCES_PHASE} />
}
