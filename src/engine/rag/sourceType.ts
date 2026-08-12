// Source-type taxonomy helpers — a leaf module so both the sync hybrid path
// (`hybrid.ts`) and the async KPI1 path (`hybridSearch.ts`) can filter by
// source without a circular import between them.
//
// Two taxonomies are supported:
//  - local `sourceTypeFor` -> 'standard' | 'catalogue' | 'guide' | 'statute' | 'document'
//  - spec `specSourceTypeFor` (dzenhare-sqb-starter DocChunk contract) ->
//    'bylaws_1977' | 'saz' | 'ziqs' | 'si56' | 'market_index' | 'historical'

export type SpecSourceType = 'bylaws_1977' | 'saz' | 'ziqs' | 'si56' | 'market_index' | 'historical'

export function sourceTypeFor(docId: string): string {
  const id = docId.toLowerCase()
  if (id.includes('saz') || id.includes('standard')) return 'standard'
  if (id.includes('catalogue') || id.includes('catalog')) return 'catalogue'
  if (id.includes('typolog') || id.includes('guide')) return 'guide'
  if (id.includes('by-laws') || id.includes('bylaws') || id.includes('legislation') || id.includes('si-56')) return 'statute'
  return 'document'
}

export function specSourceTypeFor(docId: string): SpecSourceType {
  const id = docId.toLowerCase()
  if (id.includes('si-56') || id.includes('si56') || id.includes('architects')) return 'si56'
  if (id.includes('ziqs')) return 'ziqs'
  if (id.includes('saz') || id.includes('standard')) return 'saz'
  if (id.includes('market') || id.includes('index')) return 'market_index'
  if (id.includes('bylaw') || id.includes('by-law') || id.includes('legislation') || id.includes('code') || id.includes('statute')) return 'bylaws_1977'
  return 'historical'
}

export function matchesSourceFilter(docId: string, filterSource?: string): boolean {
  if (!filterSource) return true
  return specSourceTypeFor(docId) === filterSource || sourceTypeFor(docId) === filterSource
}
