export type WbsCategory =
  | 'material'
  | 'labour'
  | 'equipment'
  | 'subcontract'
  | 'service'
  | 'overhead'

export type LedgerSource = 'purchase-order' | 'invoice' | 'boq' | 'manual'

export type CodingMethod = 'auto' | 'auto-fallback' | 'manual'

export interface WbsCode {
  code: string
  level: 1 | 2 | 3
  name: string
  category: WbsCategory
  keywords: string[]
  restockable: boolean
  unit?: string
}

export interface LedgerEntry {
  id: string
  projectId: string
  source: LedgerSource
  sourceId: string
  sourceLineItemId: string
  description: string
  quantity: number
  unit: string
  unitPriceCents: number
  amountCents: number
  wbsCode: string
  wbsName: string
  wbsCategory: WbsCategory
  restockable: boolean
  codingMethod: CodingMethod
  confidence: number
  codedAt: string
  codedBy: string
}

export interface LedgerCodeTotal {
  code: string
  name: string
  category: WbsCategory
  amountCents: number
  count: number
  restockable: boolean
}

export interface LedgerSummary {
  totalCents: number
  entryCount: number
  byCategory: Record<WbsCategory, number>
  restockableCents: number
  oneTimeCents: number
  unallocatedCents: number
  unallocatedCount: number
  byCode: LedgerCodeTotal[]
}

export interface WbsCodingResult {
  wbs: WbsCode
  method: CodingMethod
  confidence: number
  matchedKeywords: string[]
}
