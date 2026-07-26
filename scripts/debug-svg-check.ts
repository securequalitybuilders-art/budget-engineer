import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'temp-elevations')
const svg = readFileSync(join(dir, '80m2-front.svg'), 'utf-8')

console.log('ENTRY text:', svg.includes('ENTRY'))
console.log('canopy:', /canopy/i.test(svg))
console.log('entrance:', /entrance/i.test(svg))
console.log('opening-profile count:', (svg.match(/opening-profile/g) || []).length)
console.log('Has plinth:', svg.includes('PLINTH'))
console.log('Has scale:', svg.includes('Scale'))
