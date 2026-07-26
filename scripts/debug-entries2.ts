import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Find second ENTRY occurrence with large context
let idx = 28700
console.log('Context around second ENTRY:')
console.log(svg.slice(Math.max(0, idx - 150), Math.min(svg.length, idx + 250)))

// Search for the canopy rect elements
const entryX = 183.6
// canopy rect at x = entryX - 36/2 = 165.6, width=36, height=8
const searchStr = `<rect x="165.6" y="`
console.log('\nSearching for rect at x=165.6:', svg.includes(searchStr))

// Look for any rect at groundY - 40 position
const groundYMatch = svg.match(/groundY\s*=\s*(\d+\.?\d*)/)
console.log('groundY in SVG:', groundYMatch?.[1] ?? 'not found')
