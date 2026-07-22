import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Find all rects near the canopy area (y between 125 and 130)
const rects = [...svg.matchAll(/<rect\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"[^>]*>/g)]
console.log('Rects near canopy area (y=125-135):')
for (const r of rects) {
  const y = parseFloat(r[2])
  if (y >= 120 && y <= 135) {
    console.log(`  x=${r[1]} y=${r[2]} w=${r[3]} h=${r[4]} fill=${r[0].includes('fill=') ? r[0].match(/fill="([^"]+)"/)?.[1] ?? '?' : '?'}`)
  }
}

// Print all text elements with their positions
const texts = [...svg.matchAll(/<text\s+x="([^"]+)"\s+y="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
console.log('\nText elements near canopy area (y=100-130):')
for (const t of texts) {
  const y = parseFloat(t[2])
  if (y >= 100 && y <= 130) {
    console.log(`  x=${t[1]} y=${t[2]} >${t[3]}<`)
  }
}
