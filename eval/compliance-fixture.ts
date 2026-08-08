import type { CodeDocument } from '../src/engine/rag/types'
import { RagIndex } from '../src/engine/rag/ragIndex'

export const BYLAWS_GOLDEN_DOC: CodeDocument = {
  id: 'by-laws-1977',
  title: 'Model Building By-Laws 1977',
  code: 'by-laws-1977',
  sections: [
    {
      id: 'bylaws:sec-1-1.1',
      heading: '1.1 Ceiling Height',
      level: 2,
      text: 'The minimum ceiling height for any habitable room shall be 2.4m measured from finished floor to finished ceiling.',
    },
    {
      id: 'bylaws:sec-1-1.2',
      heading: '1.2 Travel Distance',
      level: 2,
      text: 'The travel distance from any point in a room to the nearest exit shall not exceed 18m in a residential occupancy.',
    },
    {
      id: 'bylaws:sec-1-1.3',
      heading: '1.3 Fire Resistance',
      level: 2,
      text: 'A party wall between attached dwellings shall have a fire resistance of at least 60 minutes.',
    },
    {
      id: 'bylaws:sec-1-1.4',
      heading: '1.4 Natural Ventilation',
      level: 2,
      text: 'Every habitable room shall be provided with natural ventilation through openable windows with a total area of not less than 5% of the floor area.',
    },
    {
      id: 'bylaws:sec-1-1.5',
      heading: '1.5 Minimum Floor Area',
      level: 2,
      text: 'The minimum floor area of a habitable room shall be 6m2 and no room dimension shall be less than 1.8m.',
    },
    {
      id: 'bylaws:sec-2-2.1',
      heading: '2.1 Means of Escape',
      level: 2,
      text: 'Every exit door shall have a clear opening of at least 800mm and shall open in the direction of travel.',
    },
    {
      id: 'bylaws:sec-3-3.1',
      heading: '3.1 Site Drainage',
      level: 2,
      text: 'Stormwater shall be drained from the site without ponding. No drainage works shall be carried out without approval.',
    },
  ],
}

export function buildGoldenRagIndex(): RagIndex {
  const index = new RagIndex()
  index.addDocument(BYLAWS_GOLDEN_DOC)
  return index
}
