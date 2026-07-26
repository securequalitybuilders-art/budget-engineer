import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const areas = [80, 100, 140]

for (const area of areas) {
  const svg = readFileSync(join(dir, `${area}m2-front.svg`), 'utf-8')
  console.log(`\n${area}m² front:`)
  console.log('  ENTRY:', svg.includes('ENTRY'))
  console.log('  canopy:', /canopy/i.test(svg))
  console.log('  entrance label:', /Entrance/i.test(svg))
  // Count glass rects
  const glass = svg.match(/fill="url\(#glass-gradient\)"/g)?.length ?? 0
  console.log('  glass fills:', glass)
  // Opening frame count
  const frames = svg.match(/stroke-width="1\.5"/g)?.length ?? 0
  console.log('  stroke-1.5 frames:', frames)
  console.log('  size:', svg.length)
}
