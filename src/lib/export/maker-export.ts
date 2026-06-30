import type { PlanModel } from '../../domain/plan'
import type { CadDocument } from '../../domain/cad'
import * as makerjs from 'makerjs'

export function exportPlanToMakerModel(plan: PlanModel): makerjs.IModel {
  const paths: Record<string, makerjs.IPath> = {}

  plan.walls.forEach((wall, index) => {
    paths[`wall_${index + 1}`] = new makerjs.paths.Line(
      [wall.start.x, wall.start.y],
      [wall.end.x, wall.end.y],
    )
  })

  return {
    units: makerjs.unitType.Meter,
    paths,
  }
}

export function exportPlanToMakerJson(plan: PlanModel): string {
  return JSON.stringify(exportPlanToMakerModel(plan), null, 2)
}

export function exportPlanToDxf(plan: PlanModel): string {
  const model = exportPlanToMakerModel(plan)
  return makerjs.exporter.toDXF(model)
}

export function exportCadDocumentToSemanticJson(doc: CadDocument): string {
  return JSON.stringify({
    floors: doc.floors,
    layers: doc.layers,
    walls: doc.walls,
    openings: doc.openings,
    annotations: doc.annotations,
  }, null, 2)
}
