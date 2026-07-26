import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Check for polygon elements (pediment from strong canopy)
const polygons = svg.match(/<polygon/g)
console.log('Polygon count:', polygons?.length ?? 0)

// Check for specific strong-canopy elements
console.log('Has sidelight:', svg.includes('sideLight') || svg.includes('sidelight'))
console.log('Has pediment:', svg.includes('pediment'))
console.log('Has column capitals:', svg.includes('capital'))

// Check for moderate-canopy elements
console.log('Has THRESHOLD datum:', svg.includes('THRESHOLD'))
console.log('Has HD text:', (svg.match(/HD \+/g) || []).length, 'occurrences')

// Find what comes between the two ENTRY texts
const firstEntry = svg.indexOf('ENTRY')
const secondEntry = svg.indexOf('ENTRY', firstEntry + 1)
if (firstEntry >= 0 && secondEntry >= 0) {
  const between = svg.slice(firstEntry, secondEntry)
  console.log('\nBetween first and second ENTRY (length', between.length, '):')
  console.log(between.slice(0, 500))
}
