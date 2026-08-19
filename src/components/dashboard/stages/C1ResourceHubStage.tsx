import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Building2, Lock, Search, SlidersHorizontal } from 'lucide-react';
import type { BoqResult } from '@/adapters/designToBoq';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import { buildDemandRadar, RESOURCE_LOCK_DAYS, isLocked, tradeForDescription } from '@/engine/greenflag/resourceHub';
import { aggregateMaterialDemand, estimateBulkDiscount } from '@/engine/ecosystem/groupBuy';
import { hashStr } from '@/engine/greenflag/resourceHub';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, GreenFlagBadge, Kicker, MarketPriceTicker, type TickerItem, Money, PageEnter } from '@/components/dzenhare';
import type { ResourceCategory } from '@/domain/greenflag';

const CATEGORIES: ResourceCategory[] = ['supplier', 'contractor', 'material', 'service', 'consultant'];
const RATINGS = [0, 3, 4, 4.5] as const;

const VERIFIED_CREDENTIALS = ['ZIMRA Compliance', 'NSSA Clearance', 'Public Liability Insurance'];

function tickerFromDemandRadar(material: string, unit: string, indexPriceCents: number): TickerItem {
  const h = hashStr(material);
  const changePct = ((h % 1000) / 1000 - 0.5) * 8;
  return { symbol: material.slice(0, 4).toUpperCase(), label: material, unit, currentCents: indexPriceCents, changePct: Math.round(changePct * 100) / 100 };
}

export function C1ResourceHubStage({ boq }: { boq: BoqResult | null }) {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { resources, isLoading, loadForProject, buildHub } = useGreenFlagStore(
    useShallow((s) => ({ resources: s.resources, isLoading: s.isLoading, loadForProject: s.loadForProject, buildHub: s.buildHub })),
  );

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ResourceCategory | 'all'>('all');
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(999);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const handleBuild = useCallback(() => {
    if (!projectId) return;
    void buildHub(projectId, boq);
  }, [projectId, boq, buildHub]);

  const lockedUntil = resources[0]?.lockedUntil ?? null;
  const lockActive = lockedUntil ? isLocked(lockedUntil) : false;

  const demandRadar = useMemo(() => buildDemandRadar(new Date(), 'zimbabwe', lockedUntil ?? ''), [lockedUntil]);

  const groupBuy = useMemo(() => {
    const boqLines = resources.filter((r) => r.category === 'material').slice(0, 8).map((r) => ({
      id: r.id,
      projectId: r.projectId,
      description: r.trade,
      quantity: 100,
      unit: r.unit,
      unitCostCents: r.baseRateCents,
    }));
    const demand = aggregateMaterialDemand(boqLines);
    const totalQuantity = demand.reduce((s, d) => s + d.quantity, 0);
    const bulk = estimateBulkDiscount(totalQuantity, demand[0]?.avgUnitCostCents ?? 0);
    return { demand, bulk };
  }, [resources]);

  const filtered = useMemo(() => {
    let list = resources;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.trade.toLowerCase().includes(q));
    }
    if (category !== 'all') list = list.filter((r) => r.category === category);
    if (minRating > 0) list = list.filter((r) => r.rating >= minRating);
    if (maxDistance < 999) list = list.filter((r) => r.distanceKm <= maxDistance);
    return list;
  }, [resources, query, category, minRating, maxDistance]);

  const tickerItems = useMemo(
    () => demandRadar.entries.slice(0, 6).map((e) => tickerFromDemandRadar(e.material, e.unit, e.indexPriceCents)),
    [demandRadar],
  );

  return (
    <StageScaffold
      stageId="c1-resource-hub"
      icon={Building2}
      empty={!isLoading && resources.length === 0}
      emptyTitle="Resource Hub not built yet"
      emptyMessage="Build the hub from the Budget Engineered BOQ + SADC market rate catalogue to discover verified suppliers, demand radar and the 30-day price lock."
      emptyAction={
        <button
          type="button"
          onClick={handleBuild}
          disabled={!boq}
          className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {boq ? 'Build Resource Hub from BOQ' : 'Generate a design + BOQ first'}
        </button>
      }
      action={
        lockedUntil && (
          <DzPill tone={lockActive ? 'verified' : 'disputed'}>
            <Lock className="h-3 w-3" aria-hidden="true" />
            {lockActive ? `Prices locked until ${lockedUntil}` : 'Price lock expired'}
          </DzPill>
        )
      }
    >
      <PageEnter className="space-y-4">
        <MarketPriceTicker items={tickerItems} currency="USD" dayKey={lockedUntil ?? undefined} />

        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Hub</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{resources.length}</p>
            <p className="text-xs text-[var(--text-muted)]">resources discovered · {resources.filter((r) => r.verified).length} verified</p>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              {RESOURCE_LOCK_DAYS}-day SADC market price lock applies after build.
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Group Buy</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">
              {groupBuy.bulk.discountPct.toFixed(0)}%
            </p>
            <p className="text-xs text-[var(--text-muted)]">bulk discount on aggregated demand</p>
            <p className="mt-2 font-mono text-[11px] text-[var(--brand-accent)]">
              saving ≈ <Money cents={groupBuy.bulk.savingCents} />
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Demand Radar</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{demandRadar.entries.length}</p>
            <p className="text-xs text-[var(--text-muted)]">regional forward-demand lines</p>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              {demandRadar.entries[0]?.region ?? '—'} · {demandRadar.entries[0]?.quarter ?? '—'}
            </p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Trades</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{new Set(resources.map((r) => r.trade)).size}</p>
            <p className="text-xs text-[var(--text-muted)]">unique trade categories</p>
          </DzCard>
        </div>

        <DzCard className="p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Kicker>Resource Hub List</Kicker>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search resources..."
                  className="h-8 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/60 pl-7 pr-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-accent)] focus:outline-none"
                  aria-label="Search resources"
                />
              </div>
              <div className="flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3 text-[var(--text-muted)]" aria-hidden="true" />
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(category === cat ? 'all' : cat)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                      category === cat ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-tertiary)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/60 px-2 text-[11px] text-[var(--text-primary)] focus:border-[var(--brand-accent)] focus:outline-none"
                aria-label="Minimum rating"
              >
                {RATINGS.map((r) => (
                  <option key={r} value={r}>{r === 0 ? 'Any rating' : `${r}★+`}</option>
                ))}
              </select>
              <select
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/60 px-2 text-[11px] text-[var(--text-primary)] focus:border-[var(--brand-accent)] focus:outline-none"
                aria-label="Maximum distance"
              >
                <option value={999}>Any distance</option>
                <option value={8}>Within 8 km</option>
                <option value={15}>Within 15 km</option>
                <option value={30}>Within 30 km</option>
              </select>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Resource', render: (r) => (r.verified ? <GreenFlagBadge name={r.name} verified={VERIFIED_CREDENTIALS} /> : <span className="text-[13px] text-[var(--text-primary)]">{r.name}</span>) },
              { key: 'category', header: 'Type', render: (r) => <DzPill tone="neutral">{r.category}</DzPill> },
              { key: 'trade', header: 'Trade' },
              { key: 'rating', header: 'Rating', align: 'right', render: (r) => `${r.rating.toFixed(1)}★` },
              { key: 'distanceKm', header: 'Distance', align: 'right', render: (r) => `${r.distanceKm} km` },
              { key: 'baseRateCents', header: 'Rate', align: 'right', render: (r) => <Money cents={r.baseRateCents} /> },
              { key: 'verified', header: 'Flag', render: (r) => (r.verified ? <DzPill tone="verified">Green Flag</DzPill> : <DzPill tone="neutral">Unverified</DzPill>) },
            ]}
            rows={filtered.slice(0, 20)}
            rowKey={(r) => r.id}
            className="mt-2"
          />
          {filtered.length !== resources.length && (
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">Showing {filtered.length} of {resources.length} resources</p>
          )}
        </DzCard>

        <DzCard className="p-4">
          <Kicker>Demand Radar — forward demand by material</Kicker>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {demandRadar.entries.map((e) => (
              <div key={`${e.material}-${e.quarter}`} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{e.material}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {e.region} · {e.quarter} · {e.activeProjects} active projects
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm tabular-nums text-[var(--text-primary)]">{e.demandUnits.toLocaleString()}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">@ <Money cents={e.indexPriceCents} />/{e.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </DzCard>

        {groupBuy.demand.length > 0 && (
          <DzCard className="p-4">
            <Kicker>Group Buy Aggregator — pooled demand</Kicker>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {tradeForDescription('pool')} demand pooled across {groupBuy.demand.length} material lines unlocks the bulk tier.
            </p>
          </DzCard>
        )}
      </PageEnter>
    </StageScaffold>
  );
}
