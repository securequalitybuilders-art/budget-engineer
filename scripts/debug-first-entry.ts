import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

// Find all text elements near y=115
const texts = [...svg.matchAll(/<text\s+x="([^"]+)"\s+y="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
for (const t of texts) {
  const y = parseFloat(t[2])
  if (y >= 100 && y <= 130) {
    console.log(`x=${t[1]} y=${t[2]} >${t[3]}<`)
  }
}

console.log('\n---')

// Find the position: what comes BEFORE the first ENTRY text
const idx = svg.indexOf('ENTRY')
const before = svg.slice(Math.max(0, idx - 300), idx)
console.log('Before first ENTRY (last 300 chars):')
console.log(before)
