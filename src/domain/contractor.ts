export type VerificationState = 'unverified' | 'pending' | 'verified' | 'suspended' | 'blacklisted'

export type ContractorTrade =
  | 'civil' | 'structural' | 'architectural' | 'mep'
  | 'electrical' | 'plumbing' | 'hvac' | 'fire'
  | 'finishes' | 'roofing' | 'glazing' | 'joinery'
  | 'steelwork' | 'concrete' | 'paving' | 'landscaping'
  | 'painting' | 'waterproofing' | 'demolition' | 'general'

export type SupplierCategory =
  | 'materials' | 'equipment' | 'fixtures' | 'finishes'
  | 'structural' | 'mep' | 'hardware' | 'specialty'

export interface ContractorProfile {
  id: string
  name: string
  registrationNumber: string
  taxId: string
  trade: ContractorTrade
  subTrades: ContractorTrade[]
  verificationState: VerificationState
  contactPerson: string
  email: string
  phone: string
  address: string
  insuranceExpiry?: string
  licenseExpiry?: string
  safetyRating: number
  qualityRating: number
  timelinessRating: number
  reliabilityScore: number
  completedProjects: number
  linkedProjectIds: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface SubcontractorProfile {
  id: string
  contractorId: string
  name: string
  trade: ContractorTrade
  verificationState: VerificationState
  contactPerson: string
  email: string
  phone: string
  licenseNumber: string
  insuranceExpiry?: string
  performanceScore: number
  safetyRecord: string
  linkedProjectIds: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface SupplierProfile {
  id: string
  name: string
  category: SupplierCategory
  verificationState: VerificationState
  contactPerson: string
  email: string
  phone: string
  address: string
  paymentTerms: string
  deliveryLeadDays: number
  qualityRating: number
  reliabilityScore: number
  linkedProjectIds: string[]
  preferred: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ConsultantProfile {
  id: string
  name: string
  discipline: 'architect' | 'structural' | 'mep' | 'quantity-surveyor' | 'project-manager' | 'civil' | 'environmental' | 'other'
  registrationNumber: string
  verificationState: VerificationState
  email: string
  phone: string
  firmName: string
  insuranceExpiry?: string
  linkedProjectIds: string[]
  notes: string
  createdAt: string
  updatedAt: string
}
