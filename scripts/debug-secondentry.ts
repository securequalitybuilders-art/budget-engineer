import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

const idx = svg.indexOf('ENTRY', svg.indexOf('ENTRY') + 1)
const start = Math.max(0, idx - 400)
const end = Math.min(svg.length, idx + 200)
console.log('Full context around second ENTRY:')
console.log(svg.slice(start, end))
