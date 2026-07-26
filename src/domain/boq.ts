export type RateSection =
  | 'substructure'
  | 'superstructure'
  | 'finishes'
  | 'services'
  | 'external'
  | 'general'

export interface RateCardItem {
  code: string
  title: string
  unit: string
  rateCents: number
  section: RateSection
  category: string
}

export interface BuildingElement {
  id: string
  type: string
  category: string
  name: string
  unit: string
  quantity: number
}

export interface DesignOption {
  id: string
  name: string
  grossFloorArea: number
  floors: number
  buildingType: string
  elements: BuildingElement[]
}

export interface BOQLineItem {
  id: string
  designOptionId: string
  rateCode: string
  title: string
  section: RateSection
  unit: string
  quantity: number
  unitRateCents: number
  amountCents: number
  estimated: boolean
  sourceElementIds: string[]
}

export interface BOQTotals {
  subtotalCents: number
  contingencyCents: number
  professionalFeesCents: number
  vatCents: number
  grandTotalCents: number
}

export interface BOQ {
  id: string
  projectId: string
  designOptionId: string
  currency: string
  lineItems: BOQLineItem[]
  totals: BOQTotals
  createdAt: string
}
