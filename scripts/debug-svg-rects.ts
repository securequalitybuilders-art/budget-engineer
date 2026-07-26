import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Look for opening frames (stroke-width="1.5")
const stroke15 = svg.match(/stroke-width="1\.5"/g)
console.log('stroke-width="1.5" count:', stroke15?.length ?? 0)

// Look for window glass rects
const glassRects = svg.match(/fill="url\(#glass-gradient\)"/g)
console.log('glass-gradient count:', glassRects?.length ?? 0)

// Look for any rect with width >= 20 and height >= 20 (opening-like)
const rects = [...svg.matchAll(/<rect\s+x="([\d.-]+)"\s+y="([\d.-]+)"\s+width="([\d.-]+)"\s+height="([\d.-]+)"[^>]*>/g)]
console.log('\nAll rect elements:')
for (const r of rects) {
  const x = parseFloat(r[1]), y = parseFloat(r[2]), w = parseFloat(r[3]), h = parseFloat(r[4])
  // Only show rects on the wall face (y between 50 and 240)
  if (y > 50 && y < 240 && w > 10) {
    console.log(`  rect x=${r[1]} y=${r[2]} w=${r[3]} h=${r[4]}${r[0].includes('glass') ? ' [GLASS]' : ''}${r[0].includes('opening') ? ' [OPENING]' : ''}`)
  }
}

// Count total openings in cad openings section references
const totalOpeningRefs = (svg.match(/opening-profile/g) || []).length
console.log('\nopening-profile refs:', totalOpeningRefs)

// Check if the actual opening data includes opening profiles
const profileSection = svg.match(/profile[^}]*opening[s]?[^}]*/g)
console.log('profile sections:', profileSection?.length ?? 0)
