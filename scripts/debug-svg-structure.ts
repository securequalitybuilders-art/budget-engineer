import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = join(fileURLToPath(import.meta.url), '..')
const outDir = join(__dirname, '..', 'temp-elevations')

const svg = readFileSync(join(outDir, '80m2-front.svg'), 'utf-8')

// Extract all rect elements
const rects = [...svg.matchAll(/<rect\s+([^>]*)\/>/g)]
console.log('All rects:')
for (const r of rects) {
  console.log(`  ${r[0].slice(0, 200)}`)
}

// Extract all path elements (doors are often paths)
const paths = [...svg.matchAll(/<path\s+([^>]*)\/>/g)]
console.log(`\nAll paths (${paths.length}):`)
for (const p of paths) {
  console.log(`  ${p[0].slice(0, 250)}`)
}

// Extract text elements
const texts = [...svg.matchAll(/<text\s+([^>]*)>([^<]+)<\/text>/g)]
console.log(`\nAll text elements (${texts.length}):`)
for (const t of texts) {
  console.log(`  text at "${t[2]}"`)
}

// Check for the ENTRY label
if (svg.includes('ENTRY')) {
  console.log('\nENTRY label found!')
}

// Check for specific opening markers
for (const marker of ['door', 'window', 'opening', 'glazing', 'glass']) {
  if (svg.includes(marker)) {
    const idx = svg.indexOf(marker)
    console.log(`\nFound "${marker}" at position ${idx}: ...${svg.slice(Math.max(0, idx - 50), idx + 100)}...`)
  }
}

// Look for the opening-elevation-profile render output pattern
const openingProfiles = [...svg.matchAll(/class="[^"]*opening[^"]*"[^>]*>/g)]
console.log(`\nOpening profile elements: ${openingProfiles.length}`)
for (const op of openingProfiles) {
  console.log(`  ${op[0].slice(0, 200)}`)
}
