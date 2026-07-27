import { CatalogItem, ProcurementOrder, ProcurementLineItem } from '../../domain/marketplace';

export interface MatchCriteria {
  items: { catalogItemId: string; quantity: number; maxUnitPrice?: number; preferredDeliveryDate?: string }[];
  location?: { lat: number; lng: number; maxDistanceKm: number };
  minRating?: number;
  preferredProviders?: string[];
}

export interface SupplierMatch {
  providerId: string;
  providerName: string;
  rating: number;
  distanceKm?: number;
  score: number;
  availableItems: { catalogItemId: string; matched: boolean; unitPrice: number; totalPrice: number }[];
  totalCost: number;
  estimatedDeliveryDays: number;
}

export function matchSuppliers(catalog: CatalogItem[], criteria: MatchCriteria): SupplierMatch[] {
  const providerGroups = new Map<string, CatalogItem[]>();
  for (const item of catalog) {
    const group = providerGroups.get(item.providerId) ?? [];
    group.push(item);
    providerGroups.set(item.providerId, group);
  }
  const matches: SupplierMatch[] = [];
  for (const [providerId, items] of providerGroups) {
    const availableItems = criteria.items.map(ci => {
      const catItem = items.find(i => i.id === ci.catalogItemId && i.available);
      return {
        catalogItemId: ci.catalogItemId, matched: !!catItem,
        unitPrice: catItem?.unitPrice ?? 0, totalPrice: catItem ? catItem.unitPrice * ci.quantity : 0,
      };
    });
    const matchedCount = availableItems.filter(i => i.matched).length;
    if (matchedCount === 0) continue;
    const score = matchedCount / criteria.items.length;
    const totalCost = availableItems.reduce((s, i) => s + i.totalPrice, 0);
    const maxLeadTime = Math.max(...items.filter(i => availableItems.find(a => a.catalogItemId === i.id)?.matched).map(i => i.leadTimeDays), 0);
    matches.push({
      providerId, providerName: '', rating: 0, score,
      availableItems, totalCost, estimatedDeliveryDays: maxLeadTime,
    });
  }
  return matches.sort((a, b) => b.score - a.score || a.totalCost - b.totalCost);
}

export function createProcurementOrder(params: {
  projectId: string; providerId: string;
  items: { catalogItemId: string; name: string; quantity: number; unit: string; unitPrice: number }[];
  deliveryDate?: string; deliveryLocation?: string;
}): ProcurementOrder {
  const now = new Date().toISOString();
  const lineItems: ProcurementLineItem[] = params.items.map(i => ({
    id: crypto.randomUUID(), catalogItemId: i.catalogItemId, name: i.name,
    quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice,
    totalPrice: i.quantity * i.unitPrice, deliveryStatus: 'pending',
  }));
  return {
    id: crypto.randomUUID(), projectId: params.projectId, providerId: params.providerId,
    items: lineItems, totalAmount: lineItems.reduce((s, i) => s + i.totalPrice, 0),
    currency: 'USD', status: 'draft', deliveryDate: params.deliveryDate,
    deliveryLocation: params.deliveryLocation, createdAt: now, updatedAt: now,
  };
}

export function calculateLaborNeeds(boqItems: { category: string; quantity: number; unit: string }[]): { role: string; count: number; totalHours: number }[] {
  const laborRates: Record<string, { role: string; hoursPerUnit: number }> = {
    'substructure': { role: 'General Laborer', hoursPerUnit: 2.5 },
    'superstructure': { role: 'Mason', hoursPerUnit: 3.0 },
    'roofing': { role: 'Roofer', hoursPerUnit: 2.0 },
    'plumbing': { role: 'Plumber', hoursPerUnit: 4.0 },
    'electrical': { role: 'Electrician', hoursPerUnit: 3.5 },
    'finishes': { role: 'Finisher', hoursPerUnit: 2.0 },
  };
  const laborMap = new Map<string, { role: string; hours: number }>();
  for (const item of boqItems) {
    const rate = laborRates[item.category.toLowerCase()];
    if (rate) {
      const existing = laborMap.get(rate.role) ?? { role: rate.role, hours: 0 };
      existing.hours += item.quantity * rate.hoursPerUnit;
      laborMap.set(rate.role, existing);
    }
  }
  return Array.from(laborMap.values()).map(l => ({
    role: l.role, count: Math.ceil(l.hours / 160), totalHours: Math.ceil(l.hours),
  }));
}

export function scheduleDeliveries(order: ProcurementOrder, startDate: string): { itemId: string; scheduledDate: string; deliveryWindow: string }[] {
  const start = new Date(startDate);
  return order.items.map((item, i) => {
    const deliveryDate = new Date(start);
    deliveryDate.setDate(deliveryDate.getDate() + i * 3);
    return {
      itemId: item.id, scheduledDate: deliveryDate.toISOString().split('T')[0],
      deliveryWindow: `${deliveryDate.toISOString().split('T')[0]} - ${new Date(deliveryDate.getTime() + 86400000).toISOString().split('T')[0]}`,
    };
  });
}
