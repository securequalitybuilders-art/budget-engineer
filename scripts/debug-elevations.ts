import { generatePlanModel } from '../src/engine/plan-generator'
import { convertPlanModelToWs6Cad } from '../src/adapters/planModelToWs6Cad'
import { buildElevationSvg } from '../src/lib/drawings/elevation-svg'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = join(fileURLToPath(import.meta.url), '..')
const outDir = join(__dirname, '..', 'temp-elevations')
mkdirSync(outDir, { recursive: true })

const AREAS = [80, 100, 140]
const ORIENTATIONS = ['front', 'rear', 'left', 'right'] as const

for (const area of AREAS) {
  const plan = generatePlanModel({
    id: 'debug',
    name: 'Debug',
    buildingType: 'house',
    grossFloorArea: area,
    floors: 1,
    elements: [],
  })

  const cadDoc = convertPlanModelToWs6Cad(plan, 1, 3)
  if (!cadDoc) {
    console.log(`No CadDocument for ${area}m²`)
    continue
  }

  for (const orient of ORIENTATIONS) {
    const svg = buildElevationSvg(cadDoc, orient)
    const filename = `${area}m2-${orient}.svg`
    writeFileSync(join(outDir, filename), svg)
    console.log(`Wrote ${filename} (${svg.length} chars)`)
  }
}
