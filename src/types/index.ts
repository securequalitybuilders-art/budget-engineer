/**
 * Budget Engineer OS — core type definitions.
 * All monetary values are stored as integer cents (number) to avoid float errors.
 */

export type UserProfile =
  | 'first-time'
  | 'aspirational'
  | 'institution'
  | 'business'
  | 'professional';

export type ProjectStatus =
  | 'draft'
  | 'concept'
  | 'design'
  | 'engineering'
  | 'costing'
  | 'tender';

export type Region = 'zimbabwe' | 'south-africa' | 'zambia' | 'botswana' | 'other';

export type Currency = 'USD' | 'ZWG';

export interface Project {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  profile: UserProfile;
  region: Region;
  currency: Currency;
  status: ProjectStatus;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Brief {
  projectId: string;
  rawText: string;
  parsed: {
    buildingType: string;
    floors: number;
    bedrooms?: number;
    areaM2?: number;
    budgetCents?: number;
    location: string;
    standards: string[];
  };
  aiReasoning?: string;
}

export type DesignNodeType =
  | 'wall'
  | 'slab'
  | 'roof'
  | 'foundation'
  | 'column'
  | 'beam'
  | 'opening'
  | 'fixture';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BuildingElement {
  id: string;
  category: DesignNodeType;
  material: string;
  dimensions: Partial<{
    length: number;
    width: number;
    height: number;
    count: number;
  }>;
  quantity: Quantity;
}

export interface Quantity {
  value: number;
  unit: 'm' | 'm2' | 'm3' | 'kg' | 'each' | 'l' | 'hr';
  formula: string;
}

export interface Design {
  id: string;
  projectId: string;
  name: string;
  optionIndex: number;
  parameters: Record<string, number>;
  elements: BuildingElement[];
  generatedAt: string;
}

export interface BOQItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rateCents: number;
  totalCents: number;
  elementIds: string[];
  source: 'auto' | 'manual' | 'ai-suggested';
  aiConfidence: number;
}

export interface BOQSection {
  id: string;
  code: string;
  title: string;
  items: BOQItem[];
  subtotalCents: number;
}

export interface BOQ {
  id: string;
  projectId: string;
  designId: string;
  sections: BOQSection[];
  totalCents: number;
  contingencyCents: number;
  currency: string;
  generatedAt: string;
}

export type TransactionAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'AI_GENERATE';

export type TransactionEntity =
  | 'brief'
  | 'design'
  | 'element'
  | 'boq'
  | 'rate'
  | 'export'
  | 'project';

export interface ProjectTransaction {
  id: string;
  projectId: string;
  userId?: string;
  actor: 'USER' | 'AI_AGENT' | 'SYSTEM';
  action: TransactionAction;
  entityType: TransactionEntity;
  entityId: string;
  before?: unknown;
  after?: unknown;
  diff?: unknown;
  reason?: string;
  createdAt: string;
}

export interface Rate {
  id: string;
  region: Region;
  code: string;
  description: string;
  unit: string;
  baseRateCents: number;
  source: 'cwicr' | 'zimbabwe' | 'custom';
  year: number;
}

export type AppTheme = 'dark' | 'light' | 'system';
