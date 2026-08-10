// Local building-code corpus for the KPI2 researcher node.
//
// The agent orchestrator's `search-codes` tool needs a RagIndex. This module
// ships a compact browser-safe corpus (same ingestion path as production: raw
// text -> parseCodeDocument -> chunkDocument) so the agent can retrieve code
// evidence fully offline. It bundles the Model Building By-Laws 1977, the
// SI 56/2025 Architects (Amendment) Regulations, plus the curated SAZ standards
// catalogue and Building Typologies guide (see `curatedCorpus.ts`). The full
// extracted `corpus/` directory holds the larger source library (textbooks,
// estimation files) for the Node-only MCP path; these four docs are small
// enough to bundle for the in-app browser agent.

import type { CodeDocument } from './types'
import { parseCodeDocument } from './extraction'
import { RagIndex, createIndex } from './ragIndex'
import { SAZ_CATALOGUE_DOC, TYPOLOGIES_GUIDE_DOC } from './curatedCorpus'

export const BY_LAWS_1977_TEXT = [
  '1 General Requirements',
  '1.1 The minimum ceiling height for any habitable room shall be 2.4m measured from finished floor to finished ceiling.',
  '1.2 Every habitable room shall be provided with natural ventilation through openable windows with a total area of not less than 5% of the floor area.',
  '1.3 The minimum floor area of a habitable room shall be 6m2 and no room dimension shall be less than 1.8m.',
  '1.4 No habitable room shall be used for human habitation unless it has a window opening to the external air and adequate light.',
  '',
  '2 Means of Escape',
  '2.1 The travel distance from any point in a room to the nearest exit shall not exceed 18m in a residential occupancy.',
  '2.2 Every exit door shall have a clear opening of at least 800mm and shall open in the direction of travel.',
  '2.3 Corridors serving as means of escape shall have a clear width of not less than 900mm.',
  '2.4 A party wall between attached dwellings shall have a fire resistance of at least 60 minutes.',
  '',
  '3 Masonry and Brickwork',
  '3.1 External and boundary walls shall have a minimum thickness of 230mm and shall be constructed of solid masonry.',
  '3.2 Internal partition walls of loadbearing masonry shall have a minimum thickness of 115mm.',
  '3.3 Masonry units shall comply with SAZ standards for common bricks of 7MPa minimum compressive strength.',
  '3.4 Hollow blocks shall not be used in boundary walls or any wall subject to lateral pressure.',
  '3.5 Standard masonry unit dimensions are 400mm x 200mm x 200mm (length x height x depth).',
  '',
  '4 Structural Loading',
  '4.1 Residential floors shall be designed for a minimum imposed load of 1.5 kN/m2.',
  '4.2 Roofs shall be designed to resist wind uplift in accordance with the applicable loading code for the region.',
  '',
  '5 Site Drainage and Environment',
  '5.1 Stormwater shall be drained from the site without ponding.',
  '5.2 No drainage works shall be carried out without the prior approval of the local authority.',
  '5.3 The site shall not be located on a wetland or watercourse unless mitigation is approved by the environmental authority.',
  '',
  '6 Staircases',
  '6.1 A staircase serving a habitable building shall have a minimum clear width of 900mm.',
  '6.2 The maximum rise of any step shall be 180mm and the minimum going shall be 250mm.',
  '6.3 A staircase shall have a landing of at least 900mm at the top and bottom.',
  '',
  '7 Sanitary Provision',
  '7.1 Every dwelling shall be provided with at least one water closet, a wash basin, and a bath or shower.',
  '7.2 Sanitary fixtures shall discharge into an approved drainage system.',
].join('\n')

export const BY_LAWS_1977_DOC: CodeDocument = parseCodeDocument({
  id: 'by-laws-1977',
  code: 'zbc',
  jurisdiction: 'zimbabwe',
  title: 'Model Building By-Laws 1977',
  text: BY_LAWS_1977_TEXT,
})

// SI 56/2025 — Architects (Amendment) Regulations, 2025 (No. 1), which rewrites
// the registration thresholds in the Second Schedule to the Architects Act
// [Chapter 27:01]. Clean transcription of the gazetted text (Veritas copy), with
// page markers and the distribution footer stripped.
export const SI_56_2025_TEXT = [
  '1 Citation',
  '1.1 These regulations may be cited as the Architects (Amendment) Regulations, 2025 (No. 1).',
  '',
  '2 Amendment of Second Schedule',
  '2.1 The Second Schedule to the Architects Act [Chapter 27:01] is amended by the insertion after paragraph 3 of the following provisions.',
  '',
  '3 Registered person — double storey, 400 square metres',
  '3.1 A person—',
  '(a) whose structures are limited to double storey, areas not exceeding 400 square metres;',
  '(b) whose structures are farm buildings with area limited to 500 square metres;',
  '(c) whose structures are residential complexes limited to 4 units maximum; and',
  '(d) who holds a bachelor of architectural studies or equivalent from accredited tertiary institutions.',
  '',
  '4 Registered person — double storey, 300 square metres',
  '4.1 A person—',
  '(a) whose structures are limited to double storey, areas not exceeding 300 square metres;',
  '(b) whose structures are limited to farm buildings with area limited to 350 square metres;',
  '(c) whose structures are limited to mining structures with area limited to 350 square metres;',
  '(d) whose structures are limited to residential complexes limited to a maximum of 2 units; and',
  '(e) who holds a bachelor of technology, diploma or equivalent from accredited tertiary institutions.',
  '',
  '5 Registered person — single storey, 200 square metres',
  '5.1 A person—',
  '(a) whose structures are limited to single storey;',
  '(b) whose structures are limited to areas not exceeding 200 square metres;',
  '(c) whose structures are limited to farm buildings with area limited to 200 square metres;',
  '(d) whose structures are limited to mining structures limited to 250 square metres;',
  '(e) whose structures are limited to residential structures for 1 family (maximum area to apply); and',
  '(f) who holds a certificate from accredited institutions.',
  '',
  '6 Registered person — interior design',
  '6.1 A person who specialises in interiors and is limited to interior design works, and who holds a degree in interior architecture or a qualification in interior design (minimum being a diploma).',
  '',
  '7 Registered person — landscape design',
  '7.1 A person who specialises in landscape and is limited to landscape design works, and who holds a minimum qualification of a diploma in landscape design.',
].join('\n')

export const SI_56_2025_DOC: CodeDocument = parseCodeDocument({
  id: 'si-56-2025',
  code: 'si562025',
  jurisdiction: 'zimbabwe',
  title: 'SI 56/2025 Architects Registration',
  text: SI_56_2025_TEXT,
})

export function buildDefaultRagIndex(): RagIndex {
  return createIndex([BY_LAWS_1977_DOC, SI_56_2025_DOC, SAZ_CATALOGUE_DOC, TYPOLOGIES_GUIDE_DOC])
}
