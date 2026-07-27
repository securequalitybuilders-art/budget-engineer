import { CatalogItem, ProcurementOrder, ProcurementLineItem, RFQ, RFQLineItem } from '../../domain/marketplace';
import type { BOQ, BOQLineItem } from '../../lib/boq/boq-types';

export interface MatchCriteria {
  items: { catalogItemId: string; quantity: number; maxUnitPrice?: number; preferredDeliveryDate?: string; required?: boolean }[];
  location?: { lat: number; lng: number; maxDistanceKm: number };
  minRating?: number;
  preferredProviders?: string[];
  verifiedOnly?: boolean;
  deliveryDeadline?: string;
}

export interface SupplierMatch {
  providerId: string;
  providerName: string;
  rating: number;
  verified: boolean;
  distanceKm?: number;
  score: number;
  availableItems: { catalogItemId: string; matched: boolean; unitPrice: number; totalPrice: number; leadDays: number }[];
  totalCost: number;
  estimatedDeliveryDays: number;
  coverageScore: number;
  recommendation: 'strong' | 'moderate' | 'fallback';
}

export function matchSuppliers(catalog: CatalogItem[], criteria: MatchCriteria): SupplierMatch[] {
  const providerGroups = new Map<string, CatalogItem[]>();
  for (const item of catalog) {
    const group = providerGroups.get(item.providerId) ?? [];
    group.push(item);
    providerGroups.set(item.providerId, group);
  }
  const requiredIds = criteria.items.filter(i => i.required).map(i => i.catalogItemId);
  const matches: SupplierMatch[] = [];
  for (const [providerId, items] of providerGroups) {
    const availableItems = criteria.items.map(ci => {
      const catItem = items.find(i => i.id === ci.catalogItemId && i.available && (!ci.maxUnitPrice || i.unitPrice <= ci.maxUnitPrice));
      return {
        catalogItemId: ci.catalogItemId, matched: !!catItem,
        unitPrice: catItem?.unitPrice ?? 0, totalPrice: catItem ? catItem.unitPrice * ci.quantity : 0,
        leadDays: catItem?.leadTimeDays ?? 999,
      };
    });
    const matchedCount = availableItems.filter(i => i.matched).length;
    if (matchedCount === 0) continue;
    if (requiredIds.length > 0 && requiredIds.some(id => !availableItems.find(a => a.catalogItemId === id)?.matched)) continue;
    const coverageScore = matchedCount / criteria.items.length;
    const totalCost = availableItems.reduce((s, i) => s + i.totalPrice, 0);
    const maxLeadTime = Math.max(...availableItems.filter(i => i.matched).map(i => i.leadDays), 0);
    const score = coverageScore * 0.5 + (1 - Math.min(totalCost / 100000, 1)) * 0.3 + Math.min(maxLeadTime > 0 ? 30 / maxLeadTime : 0, 1) * 0.2;
    matches.push({
      providerId, providerName: '', rating: 0, verified: false, score, coverageScore,
      availableItems, totalCost, estimatedDeliveryDays: maxLeadTime,
      recommendation: coverageScore >= 0.8 ? 'strong' : coverageScore >= 0.5 ? 'moderate' : 'fallback',
    });
  }
  return matches.sort((a, b) => b.score - a.score || a.coverageScore - b.coverageScore || a.totalCost - b.totalCost);
}

export function createRFQ(params: {
  projectId: string; title: string; description: string;
  items: { name: string; description: string; quantity: number; unit: string; estimatedPrice?: number }[];
  closingDate: string;
}): RFQ {
  return {
    id: crypto.randomUUID(), projectId: params.projectId, title: params.title,
    description: params.description, issueDate: new Date().toISOString(),
    closingDate: params.closingDate, status: 'draft',
    items: params.items.map(i => ({ ...i, id: crypto.randomUUID() })),
  };
}

export function createProcurementOrder(params: {
  projectId: string; providerId: string; rfqReference?: string;
  items: { catalogItemId: string; name: string; quantity: number; unit: string; unitPrice: number; expectedDeliveryDate?: string }[];
  deliveryDate?: string; deliveryLocation?: string; shippingMethod?: string; paymentTerms?: string; notes?: string;
}): ProcurementOrder {
  const now = new Date().toISOString();
  const lineItems: ProcurementLineItem[] = params.items.map(i => ({
    id: crypto.randomUUID(), catalogItemId: i.catalogItemId, name: i.name,
    quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice,
    totalPrice: i.quantity * i.unitPrice, deliveryStatus: 'pending',
    expectedDeliveryDate: i.expectedDeliveryDate,
  }));
  return {
    id: crypto.randomUUID(), projectId: params.projectId, providerId: params.providerId,
    rfqReference: params.rfqReference, items: lineItems,
    totalAmount: lineItems.reduce((s, i) => s + i.totalPrice, 0),
    taxAmount: lineItems.reduce((s, i) => s + i.totalPrice, 0) * 0.15,
    currency: 'USD', status: 'draft', deliveryDate: params.deliveryDate,
    deliveryLocation: params.deliveryLocation, shippingMethod: params.shippingMethod,
    paymentTerms: params.paymentTerms, notes: params.notes,
    createdAt: now, updatedAt: now,
  };
}

export function calculateLaborNeeds(boqItems: { category: string; quantity: number; unit: string; complexity?: number }[]): { role: string; count: number; totalHours: number; costEstimate: number }[] {
  const laborRates: Record<string, { role: string; hoursPerUnit: number; hourlyRate: number }> = {
    'substructure': { role: 'General Laborer', hoursPerUnit: 2.5, hourlyRate: 8.5 },
    'superstructure': { role: 'Mason', hoursPerUnit: 3.0, hourlyRate: 12.0 },
    'roofing': { role: 'Roofer', hoursPerUnit: 2.0, hourlyRate: 14.0 },
    'plumbing': { role: 'Plumber', hoursPerUnit: 4.0, hourlyRate: 15.0 },
    'electrical': { role: 'Electrician', hoursPerUnit: 3.5, hourlyRate: 16.0 },
    'finishes': { role: 'Finisher', hoursPerUnit: 2.0, hourlyRate: 10.0 },
    'carpentry': { role: 'Carpenter', hoursPerUnit: 3.0, hourlyRate: 13.0 },
    'steel': { role: 'Steel Fixer', hoursPerUnit: 3.5, hourlyRate: 14.0 },
  };
  const laborMap = new Map<string, { role: string; hours: number; rate: number }>();
  for (const item of boqItems) {
    const rate = laborRates[item.category.toLowerCase()];
    if (rate) {
      const existing = laborMap.get(rate.role) ?? { role: rate.role, hours: 0, rate: rate.hourlyRate };
      const complexity = item.complexity ?? 1;
      existing.hours += item.quantity * rate.hoursPerUnit * complexity;
      laborMap.set(rate.role, existing);
    }
  }
  return Array.from(laborMap.values()).map(l => ({
    role: l.role, count: Math.ceil(l.hours / 160), totalHours: Math.ceil(l.hours),
    costEstimate: Math.ceil(l.hours * l.rate),
  }));
}

export function scheduleDeliveries(order: ProcurementOrder, startDate: string): { itemId: string; itemName: string; scheduledDate: string; deliveryWindow: string; status: 'scheduled' | 'in_transit' | 'delivered' }[] {
  const start = new Date(startDate);
  return order.items.map((item, i) => {
    const deliveryDate = new Date(start);
    deliveryDate.setDate(deliveryDate.getDate() + i * 3);
    return {
      itemId: item.id, itemName: item.name,
      scheduledDate: deliveryDate.toISOString().split('T')[0],
      deliveryWindow: `${deliveryDate.toISOString().split('T')[0]} - ${new Date(deliveryDate.getTime() + 86400000).toISOString().split('T')[0]}`,
      status: 'scheduled' as const,
    };
  });
}

export function calculateFreight(order: ProcurementOrder, distanceKm: number): { cost: number; method: string; estimatedDays: number } {
  const weight = order.items.reduce((s, i) => s + i.quantity, 0);
  if (distanceKm <= 50) return { cost: weight * 0.5, method: 'Local pickup/delivery', estimatedDays: 1 };
  if (distanceKm <= 300) return { cost: weight * 1.2 + 50, method: 'Regional trucking', estimatedDays: 3 };
  return { cost: weight * 2.5 + 150, method: 'Long-distance freight', estimatedDays: 7 };
}

export function getOrderTimeline(order: ProcurementOrder): { status: string; date: string; description: string }[] {
  const timeline: { status: string; date: string; description: string }[] = [];
  if (order.createdAt) timeline.push({ status: 'draft', date: order.createdAt, description: 'Order created' });
  if (order.status !== 'draft') timeline.push({ status: 'sent', date: order.updatedAt ?? order.createdAt, description: 'Order sent to provider' });
  if (order.status === 'confirmed' || ['in_production','in_delivery','completed','disputed'].includes(order.status))
    timeline.push({ status: 'confirmed', date: order.updatedAt, description: 'Provider confirmed order' });
  if (order.status === 'in_production') timeline.push({ status: 'in_production', date: order.updatedAt, description: 'Items in production' });
  if (order.status === 'in_delivery' || order.status === 'completed')
    timeline.push({ status: 'in_delivery', date: order.deliveryDate ?? order.updatedAt, description: 'Items shipped' });
  if (order.status === 'completed') timeline.push({ status: 'completed', date: order.updatedAt, description: 'Order delivered' });
  return timeline;
}

export function boqToProcurementItems(boq: BOQ, providerId: string): { catalogItemId: string; name: string; quantity: number; unit: string; unitPrice: number }[] {
  return boq.items.map(item => ({
    catalogItemId: item.id,
    name: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.rate,
  }));
}

export function boqToRFQItems(boq: BOQ): { name: string; description: string; quantity: number; unit: string; estimatedPrice?: number }[] {
  return boq.items.map(item => ({
    name: item.description,
    description: `${item.category} — ${item.description}`,
    quantity: item.quantity,
    unit: item.unit,
    estimatedPrice: item.rate,
  }));
}

export function createProcurementPlan(boq: BOQ, providerId: string, projectId: string): { order: ProcurementOrder; rfq: RFQ } {
  const items = boqToProcurementItems(boq, providerId);
  const rfqItems = boqToRFQItems(boq);
  const order = createProcurementOrder({
    projectId,
    providerId,
    items,
  });
  const rfq = createRFQ({
    projectId,
    title: `RFQ — ${boq.estimateDepth ?? 'Standard'} Estimate`,
    description: `Procurement request for ${boq.items.length} line items (${boq.currency}), estimated total ${boq.summary.grandTotal}`,
    items: rfqItems,
    closingDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });
  return { order, rfq };
}

export function matchBoQToCatalog(boq: BOQ, catalog: CatalogItem[]): { boqItemId: string; description: string; matches: CatalogItem[]; bestMatch?: CatalogItem; savings: number }[] {
  return boq.items.map(boqItem => {
    const matches = catalog.filter(c =>
      (c.category === boqItem.category || c.tags.some(t => boqItem.category.toLowerCase().includes(t.toLowerCase()))) &&
      c.available
    );
    const sorted = matches.sort((a, b) => Math.abs(a.unitPrice - boqItem.rate) - Math.abs(b.unitPrice - boqItem.rate));
    return {
      boqItemId: boqItem.id,
      description: boqItem.description,
      matches: sorted,
      bestMatch: sorted[0],
      savings: sorted[0] ? (boqItem.rate - sorted[0].unitPrice) * boqItem.quantity : 0,
    };
  });
}
