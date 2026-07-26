import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Find ENTRY text and surrounding context
const entryIdx = svg.indexOf('ENTRY')
if (entryIdx >= 0) {
  const start = Math.max(0, entryIdx - 80)
  const end = Math.min(svg.length, entryIdx + 120)
  console.log('Context around ENTRY:')
  console.log(svg.slice(start, end))
  console.log()
}

// Find all canopy-like rects (width="36" or width="60")
const canopyRects = svg.match(/width="3[6-9]"|width="60"/g)
console.log('Canopy width rects:', canopyRects?.length ?? 0)

// Look for the canopy underline pattern
const thresholdLines = svg.match(/stroke-width="3\.5"[^>]*><line/g)
console.log('Threshold or canopy lines:', thresholdLines?.length ?? 0)
