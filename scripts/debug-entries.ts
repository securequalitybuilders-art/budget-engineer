import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Find all ENTRY occurrences
let idx = 0
let count = 0
while ((idx = svg.indexOf('ENTRY', idx)) >= 0 && count < 5) {
  count++
  const start = Math.max(0, idx - 60)
  const end = Math.min(svg.length, idx + 80)
  console.log(`Occurrence ${count} at ${idx}:`)
  console.log(svg.slice(start, end))
  console.log()
  idx++
}

// Also search for canopy rect
const canopyRect = svg.match(/<rect[^>]*x="16[0-9]\.[^"]*"[^>]*y="12[0-9]\.[^"]*"[^>]*>/g)
console.log('Rects near canopy position:', canopyRect?.length ?? 0)
if (canopyRect) {
  for (const r of canopyRect) {
    console.log('  ', r.slice(0, 150))
  }
}
