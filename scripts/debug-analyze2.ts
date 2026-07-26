import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const items: [number, string][] = [[80,'front'],[80,'rear'],[80,'left'],[80,'right'],[100,'front'],[100,'rear'],[100,'left'],[100,'right'],[140,'front'],[140,'rear'],[140,'left'],[140,'right']]

for (const [area, orient] of items) {
  const svg = readFileSync(join(dir, `${area}m2-${orient}.svg`), 'utf-8')
  const glazing = svg.match(/fill="url\(#glass-gradient\)"/g)?.length ?? 0
  // Count door arcs (door swing indicators)
  const doorArcs = svg.match(/A\s+0\.9/g)?.length ?? 0
  // Count window-like rects (small/medium rekt on wall face, not ground/plinth/roof)
  const allRects = [...svg.matchAll(/<rect\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"[^>]*\/>/g)]
  // Filter rects that are on the wall face (y between ground and roof)
  const openingRects = allRects.filter(r => {
    const y = parseFloat(r[2]), h = parseFloat(r[4])
    return y > 50 && y < 240 && h > 10 && h < 30
  })
  console.log(`${area}m² ${orient}: glazingFills=${glazing} doorArcs=${doorArcs} openingRects=${openingRects.length} total=${svg.length}`)
}
