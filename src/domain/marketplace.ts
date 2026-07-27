export type ProviderType = 'contractor' | 'supplier' | 'professional' | 'subcontractor' | 'consultant';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'flagged';

export type EscrowStatus = 'locked' | 'released' | 'refunded' | 'disputed';

export type ProjectRole = 'client' | 'developer' | 'contractor' | 'architect' | 'engineer' | 'supply_chain';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  email: string;
  phone: string;
  alternativePhone?: string;
  website?: string;
  taxId?: string;
  registrationNumber?: string;
  location: { address: string; city: string; province?: string; country: string; coordinates?: [number, number] };
  registrationDate: string;
  verificationStatus: VerificationStatus;
  rating: number;
  completedProjects: number;
  totalContractValue?: number;
  employeeCount?: number;
  yearEstablished?: number;
  credentials: Credential[];
  catalog: CatalogItem[];
  services: ServiceOffering[];
  portfolio: Portfolio[];
  reviews: Review[];
  insurance: InsuranceCoverage[];
  availability: ProviderAvailability;
}

export interface ProviderAvailability {
  status: 'available' | 'partially_available' | 'fully_booked' | 'unavailable';
  nextAvailableDate?: string;
  regions: string[];
  maxProjectSize?: number;
  preferredProjectTypes: string[];
}

export interface Review {
  id: string;
  projectId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  categories: { quality: number; timeliness: number; communication: number; value: number };
  createdAt: string;
  verified: boolean;
}

export interface InsuranceCoverage {
  id: string;
  type: 'public_liability' | 'professional_indemnity' | 'worker_compensation' | 'contractors_all_risk' | 'plant_equipment';
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  currency: string;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'cancelled';
}

export interface CatalogItem {
  id: string;
  providerId: string;
  name: string;
  category: 'material' | 'equipment' | 'service' | 'labour';
  subcategory: string;
  description: string;
  specifications: Record<string, string>;
  unit: string;
  unitPrice: number;
  currency: string;
  minOrder: number;
  maxOrder?: number;
  available: boolean;
  stockQuantity?: number;
  leadTimeDays: number;
  tags: string[];
  images: string[];
  complianceCertification?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: string;
  type: 'license' | 'certification' | 'insurance' | 'registration' | 'qualification' | 'accreditation';
  title: string;
  issuingBody: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'revoked' | 'pending_renewal';
  documentUrl?: string;
  documentType?: string;
  verificationStatus?: 'unverified' | 'verified' | 'failed';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface ServiceOffering {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  pricingModel: 'fixed' | 'hourly' | 'per_unit' | 'milestone' | 'cost_plus';
  price: number;
  currency: string;
  rateCard?: { name: string; rate: number; unit: string }[];
  availability: { days: string[]; hours: string; timezone?: string };
  serviceArea: string[];
  minimumEngagement?: string;
  certifications?: string[];
}

export interface Portfolio {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  completionDate: string;
  value: number;
  clientName?: string;
  location?: string;
  images: string[];
  documents?: string[];
  testimonial?: string;
  awards?: string[];
}

export interface EscrowAgreement {
  id: string;
  projectId: string;
  providerId: string;
  clientId: string;
  contractReference?: string;
  totalAmount: number;
  currency: string;
  milestones: EscrowMilestone[];
  status: EscrowStatus;
  terms: string;
  disputeResolution?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface EscrowMilestone {
  id: string;
  escrowId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'completed' | 'verified' | 'released' | 'disputed';
  verificationProof?: VerificationProof[];
  completedAt?: string;
  releasedAt?: string;
  disputedReason?: string;
  approvedBy?: string;
}

export interface VerificationProof {
  id: string;
  milestoneId: string;
  type: 'photo' | 'document' | 'inspection_report' | 'signoff' | 'video';
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
  geotagged?: { lat: number; lng: number };
}

export interface ProcurementOrder {
  id: string;
  projectId: string;
  providerId: string;
  rfqReference?: string;
  items: ProcurementLineItem[];
  totalAmount: number;
  taxAmount?: number;
  currency: string;
  status: 'draft' | 'sent' | 'confirmed' | 'in_production' | 'in_delivery' | 'completed' | 'cancelled' | 'disputed';
  deliveryDate?: string;
  deliveryLocation?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementLineItem {
  id: string;
  catalogItemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  deliveryStatus: 'pending' | 'partial' | 'delivered' | 'damaged';
  deliveredQuantity?: number;
  expectedDeliveryDate?: string;
}

export interface RFQ {
  id: string;
  projectId: string;
  title: string;
  description: string;
  items: RFQLineItem[];
  issueDate: string;
  closingDate: string;
  status: 'draft' | 'open' | 'evaluating' | 'awarded' | 'cancelled';
  awardedTo?: string;
  awardedAmount?: number;
}

export interface RFQLineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
}

export interface ExecutionStatus {
  projectId: string;
  projectName?: string;
  overallProgress: number;
  criticalPath: string[];
  schedule: { taskId: string; taskName: string; planned: number; actual: number; variance: number; status: 'ahead' | 'on_track' | 'behind' | 'critical' }[];
  budget: { category: string; budgeted: number; actual: number; variance: number; percentageUsed: number }[];
  quality: { metric: string; score: number; target: number; status: 'pass' | 'warn' | 'fail' }[];
  resources: { role: string; required: number; assigned: number; gap: number; utilizationPercent: number }[];
  risks: RiskIndicator[];
}

export interface RiskIndicator {
  id: string;
  category: 'schedule' | 'budget' | 'quality' | 'resource' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
  status: 'active' | 'mitigated' | 'closed';
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entrypoint: string;
  permissions: string[];
  hooks: string[];
  dependencies?: { extensionId: string; version: string }[];
  config: Record<string, unknown>;
  ui?: { sidebar?: boolean; toolbar?: boolean; panel?: string };
}

export interface ExtensionInstance {
  manifest: ExtensionManifest;
  enabled: boolean;
  loaded: boolean;
  hooks: Map<string, (...args: unknown[]) => unknown>;
  config: Record<string, unknown>;
  metrics: { calls: number; errors: number; lastRun?: string };
}

export interface MarketplaceEvent {
  id: string;
  type: 'provider_registered' | 'catalog_updated' | 'credential_verified' | 'escrow_created' | 'milestone_released' | 'order_placed' | 'order_delivered';
  providerId?: string;
  projectId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}
