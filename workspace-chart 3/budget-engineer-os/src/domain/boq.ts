export type BOQLineItem = { id: string; quantityRef: string; category: 'Walls' | 'Slabs' | 'Roof' | 'Openings' | 'Objects'; description: string; unit: string; quantity: number; rate: number; total: number };
export type BOQSummary = { subtotal: number; contingency: number; professionalFees: number; vat: number; grandTotal: number };
export type BOQ = { id: string; projectId: string; currency: string; items: BOQLineItem[]; summary: BOQSummary };
