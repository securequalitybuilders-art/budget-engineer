export interface BOQLineItem {
  id: string;
  category: 'Walls' | 'Slabs' | 'Roof' | 'Openings' | 'Objects';
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  total: number;
  isEstimated?: boolean;
  linkedBimIds?: string[];
}

export interface BOQSummary {
  subtotal: number;
  contingency: number;
  professionalFees: number;
  vat: number;
  grandTotal: number;
}

export interface BOQ {
  id: string;
  projectId: string;
  currency: string;
  items: BOQLineItem[];
  summary: BOQSummary;
}
