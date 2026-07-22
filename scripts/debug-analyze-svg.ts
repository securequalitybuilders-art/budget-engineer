import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = join(fileURLToPath(import.meta.url), '..')
const outDir = join(__dirname, '..', 'temp-elevations')

// Opening/glazing patterns in SVG: rect elements with glazing fill / window-like dimensions
function countOpeningRects(svg: string): number {
  // Count rect elements that have fill="url(#glazing-hatch)" or contain "glazing"
  const glazingMatches = svg.match(/fill="url\(#glazing-hatch\)"/g) || []
  return glazingMatches.length
}

// Count distinct "window" or opening instances (rects with light fill over wall face)
function countWindows(svg: string): number {
  const glassGrad = svg.match(/fill="url\(#glass-gradient\)"/g) || []
  const glazingHatch = svg.match(/fill="url\(#glazing-hatch\)"/g) || []
  return glassGrad.length + glazingHatch.length
}

// Check for entrance canopy
function hasEntranceCanopy(svg: string): boolean {
  return svg.includes('ENTRY') || svg.includes('canopy')
}

// Count distinct door-door openings (door leaf arcs are lines)
function countDoors(svg: string): number {
  // Door arcs appear as paths with specific radius or arcs
  const doorMatches = svg.match(/M\s+\d+\.\d+,\d+\.\d+\s+A\s+0\.9,0\.9/g) || []
  return doorMatches.length
}

const AREAS = [80, 100, 140]
const ORIENTATIONS = ['front', 'rear', 'left', 'right']

console.log('')
console.log('| Area | Facade | Windows | Entrances | Opening Rects |')
console.log('|------|--------|---------|-----------|---------------|')

for (const area of AREAS) {
  for (const orient of ORIENTATIONS) {
    const filename = `${area}m2-${orient}.svg`
    const svg = readFileSync(join(outDir, filename), 'utf-8')
    const windows = countWindows(svg)
    const openings = countOpeningRects(svg)
    const canopy = hasEntranceCanopy(svg) ? 1 : 0
    console.log(`| ${area}m² | ${orient} | ${windows} | ${canopy} | ${openings} |`)
  }
}
