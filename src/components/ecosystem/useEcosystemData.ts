import { useEffect, useState } from 'react';
import { db } from '@/db/db';
import type { Project, BOQ, Rate } from '@/types';
import type { Milestone } from '@/domain/milestone';
import type { EscrowAgreement } from '@/domain/marketplace';
import type { ProcurementRequest, SupplierQuote, PurchaseOrder, DeliveryRecord } from '@/domain/procurement';
import type { ChangeOrder, RFI } from '@/domain/change';
import { useProviderStore } from '@/stores/providerStore';
import type { Provider } from '@/domain/marketplace';

export interface EcosystemData {
  loading: boolean;
  projects: Project[];
  boqs: BOQ[];
  milestones: Milestone[];
  escrows: EscrowAgreement[];
  procurementRequests: ProcurementRequest[];
  supplierQuotes: SupplierQuote[];
  purchaseOrders: PurchaseOrder[];
  deliveryRecords: DeliveryRecord[];
  changeOrders: ChangeOrder[];
  rfis: RFI[];
  rates: Rate[];
  providers: Provider[];
  refresh: () => Promise<void>;
}

export function useEcosystemData(): EcosystemData {
  const providers = useProviderStore((s) => s.providers);
  const [state, setState] = useState<Omit<EcosystemData, 'loading' | 'providers' | 'refresh'>>({
    projects: [],
    boqs: [],
    milestones: [],
    escrows: [],
    procurementRequests: [],
    supplierQuotes: [],
    purchaseOrders: [],
    deliveryRecords: [],
    changeOrders: [],
    rfis: [],
    rates: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [
      projects, boqs, milestones, escrows, procurementRequests, supplierQuotes,
      purchaseOrders, deliveryRecords, changeOrders, rfis, rates,
    ] = await Promise.all([
      db.projects.toArray(),
      db.boqs.toArray(),
      db.milestones.toArray(),
      db.escrows.toArray(),
      db.procurementRequests.toArray(),
      db.supplierQuotes.toArray(),
      db.purchaseOrders.toArray(),
      db.deliveryRecords.toArray(),
      db.changeOrders.toArray(),
      db.rfis.toArray(),
      db.rates.toArray(),
    ]);
    return {
      projects, boqs, milestones, escrows, procurementRequests, supplierQuotes,
      purchaseOrders, deliveryRecords, changeOrders, rfis, rates,
    } as const;
  };

  const load = async () => {
    setLoading(true);
    try {
      setState(await fetchAll());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchAll()
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, loading, providers, refresh: load };
}

export function fmtCents(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function fmtPct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function projectById(projects: Project[], id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
