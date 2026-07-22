import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Look for rect with width="36"
const w36 = svg.match(/width="36"/g)
console.log('width="36":', w36?.length ?? 0)

// Look for canopy context (ENTRY text is at x=183.6, so canopy should be around x=165.6, width=36)
// Let's search for elements near x=165
const xsections = svg.match(/x="16[4-6]\./g)
console.log('x~165 elements:', xsections?.length ?? 0)

// Find text at specific y
const textEntries = svg.match(/ENTRY/g)
console.log('ENTRY count:', textEntries?.length ?? 0)

// Look for rect near canopy position
const rects = [...svg.matchAll(/<rect\s+x="([\d.]+)"\s+y="([\d.]+)"\s+width="([\d.]+)"\s+height="([\d.]+)"[^>]*>/g)]
const entryX = 183.6
const canopyY = 121.2
for (const r of rects) {
  const x = parseFloat(r[1]), y = parseFloat(r[2]), w = parseFloat(r[3]), h = parseFloat(r[4])
  if (Math.abs(y - canopyY) < 2 || Math.abs(x - entryX) < 30) {
    console.log(`nearby rect: x=${r[1]} y=${r[2]} w=${r[3]} h=${r[4]}`)
  }
}

// Check total number of rect elements
console.log('Total rects:', rects.length)
