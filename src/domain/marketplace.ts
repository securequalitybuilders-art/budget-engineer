export type ProviderType = 'contractor' | 'supplier' | 'professional' | 'subcontractor' | 'consultant';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'flagged';

export type EscrowStatus = 'locked' | 'released' | 'refunded' | 'disputed';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  email: string;
  phone: string;
  location: { address: string; city: string; country: string; coordinates?: [number, number] };
  registrationDate: string;
  verificationStatus: VerificationStatus;
  rating: number;
  completedProjects: number;
  credentials: Credential[];
  catalog: CatalogItem[];
  services: ServiceOffering[];
  portfolio: Portfolio[];
}

export interface CatalogItem {
  id: string;
  providerId: string;
  name: string;
  category: 'material' | 'equipment' | 'service';
  subcategory: string;
  description: string;
  unit: string;
  unitPrice: number;
  currency: string;
  minOrder: number;
  available: boolean;
  leadTimeDays: number;
  tags: string[];
}

export interface Credential {
  id: string;
  type: 'license' | 'certification' | 'insurance' | 'registration';
  title: string;
  issuingBody: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'revoked';
  documentUrl?: string;
}

export interface ServiceOffering {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: string;
  pricingModel: 'fixed' | 'hourly' | 'per_unit' | 'milestone';
  price: number;
  currency: string;
  availability: { days: string[]; hours: string };
  serviceArea: string[];
}

export interface Portfolio {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  completionDate: string;
  value: number;
  images: string[];
  testimonial?: string;
}

export interface EscrowAgreement {
  id: string;
  projectId: string;
  providerId: string;
  clientId: string;
  totalAmount: number;
  currency: string;
  milestones: EscrowMilestone[];
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
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
}

export interface VerificationProof {
  id: string;
  milestoneId: string;
  type: 'photo' | 'document' | 'inspection_report' | 'signoff';
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface ProcurementOrder {
  id: string;
  projectId: string;
  providerId: string;
  items: ProcurementLineItem[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'confirmed' | 'in_delivery' | 'completed' | 'cancelled';
  deliveryDate?: string;
  deliveryLocation?: string;
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
  deliveryStatus: 'pending' | 'partial' | 'delivered';
}

export interface ExecutionStatus {
  projectId: string;
  overallProgress: number;
  criticalPath: string[];
  schedule: { taskId: string; planned: number; actual: number; variance: number }[];
  budget: { category: string; budgeted: number; actual: number; variance: number }[];
  quality: { metric: string; score: number; target: number; status: 'pass' | 'warn' | 'fail' }[];
  resources: { role: string; required: number; assigned: number; gap: number }[];
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
  config: Record<string, unknown>;
}

export interface ExtensionInstance {
  manifest: ExtensionManifest;
  enabled: boolean;
  loaded: boolean;
  hooks: Map<string, (...args: unknown[]) => unknown>;
  config: Record<string, unknown>;
}
