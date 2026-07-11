export type BOQLineItem = {
  id: string
  quantityRef: string
  category: string
  description: string
  unit: string
  quantity: number
  rate: number
  total: number
}

export type BOQSummary = {
  subtotal: number
  contingency: number
  professionalFees: number
  vat: number
  grandTotal: number
}

export type EstimateDepth = 'shell' | 'shell-with-allowances' | 'detailed'

export type BOQ = {
  id: string
  projectId: string
  currency: string
  items: BOQLineItem[]
  summary: BOQSummary
  estimateDepth?: EstimateDepth
}
