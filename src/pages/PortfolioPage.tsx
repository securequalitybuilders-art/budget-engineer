import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { loadExecutivePortfolioMetrics } from '@/lib/portfolio/executive-portfolio';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Building2, Home, Archive, DollarSign, Layers, SlidersHorizontal, Warehouse, DoorOpen, Box, Activity } from 'lucide-react';
import type { ExecutivePortfolioSummary, SchemePortfolioItem } from '@/lib/portfolio/executive-portfolio';

const CATEGORY_ICONS: Record<string, typeof Home> = {
  Walls: Layers,
  Slabs: SlidersHorizontal,
  Roof: Warehouse,
  Openings: DoorOpen,
  Objects: Box,
};

const CATEGORY_COLORS: Record<string, string> = {
  Walls: 'text-blue-400',
  Slabs: 'text-purple-400',
  Roof: 'text-amber-400',
  Openings: 'text-emerald-400',
  Objects: 'text-rose-400',
};

function SchemeCard({ scheme }: { scheme: SchemePortfolioItem }) {
  return (
    <Link to={`/project/${scheme.id}`}>
      <Card className="h-full transition-all hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{scheme.name}</CardTitle>
            <Badge variant={scheme.isArchived ? 'secondary' : 'success'}>
              {scheme.isArchived ? 'Archived' : 'Active'}
            </Badge>
          </div>
          <CardDescription>
            {scheme.zoneCount} zones &bull; {scheme.wallCount} walls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Grand Total</span>
              <span className="font-semibold">{formatCurrency(scheme.grandTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span>{formatCurrency(scheme.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Cost / Zone</span>
              <span>{formatCurrency(scheme.costPerZone)}</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {['Walls', 'Slabs', 'Roof', 'Openings', 'Objects'].map((cat) => {
              const Icon = CATEGORY_ICONS[cat] ?? Box;
              const values: Record<string, number> = {
                Walls: scheme.wallsTotal,
                Slabs: scheme.slabsTotal,
                Roof: scheme.roofTotal,
                Openings: scheme.openingsTotal,
                Objects: scheme.objectsTotal,
              };
              const maxVal = Math.max(
                scheme.wallsTotal, scheme.slabsTotal, scheme.roofTotal,
                scheme.openingsTotal, scheme.objectsTotal, 1
              );
              const pct = (values[cat] / maxVal) * 100;
              return (
                <div key={cat} className="flex flex-col items-center gap-0.5">
                  <Icon size={14} className={CATEGORY_COLORS[cat] ?? 'text-[var(--text-muted)]'} />
                  <div className="h-12 w-full rounded-sm bg-[var(--bg-tertiary)] overflow-hidden" title={`${cat}: ${formatCurrency(values[cat])}`}>
                    <div
                      className={`h-full w-full rounded-sm transition-all ${cat === 'Walls' ? 'bg-blue-500/40' : cat === 'Slabs' ? 'bg-purple-500/40' : cat === 'Roof' ? 'bg-amber-500/40' : cat === 'Openings' ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`}
                      style={{ height: `${Math.max(pct, 4)}%`, alignSelf: 'flex-end' }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{cat.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SummaryStat({ icon: Icon, label, value, sub }: { icon: typeof DollarSign; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">{label}</CardTitle>
        <Icon size={18} className="text-[var(--brand-accent)]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function PortfolioPage() {
  const { projects, loadProjects, isLoading, isHydrated } = useProjectStore();
  const [summary, setSummary] = useState<ExecutivePortfolioSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) loadProjects();
  }, [isHydrated, loadProjects]);

  useEffect(() => {
    if (projects.length === 0) {
      setSummary(null);
      return;
    }
    loadExecutivePortfolioMetrics(projects)
      .then(setSummary)
      .catch((err: unknown) => setSummaryError(err instanceof Error ? err.message : 'Failed to load portfolio'));
  }, [projects]);

  if (isLoading && !isHydrated) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--brand-accent)]" />
      </main>
    );
  }

  const activeSchemes = summary?.schemes.filter((s) => !s.isArchived) ?? [];
  const archivedSchemes = summary?.schemes.filter((s) => s.isArchived) ?? [];

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="absolute inset-0 aurora opacity-20 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft size={16} />
                </Button>
              </Link>
              <h1 className="font-display text-3xl font-bold">Portfolio Dashboard</h1>
            </div>
            <p className="mt-1 ml-11 text-sm text-[var(--text-secondary)]">
              Executive overview across all your building projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="brand">{projects.length} projects</Badge>
            {summary && (
              <Badge variant={activeSchemes.length > 0 ? 'success' : 'secondary'}>
                {activeSchemes.length} active
              </Badge>
            )}
          </div>
        </div>

        {/* Summary error */}
        {summaryError && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {summaryError}
          </div>
        )}

        {/* Summary stats */}
        {summary && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat
              icon={DollarSign}
              label="Total Portfolio Value"
              value={formatCurrency(summary.totalPortfolioValue)}
              sub={`Across ${activeSchemes.length} active projects`}
            />
            <SummaryStat
              icon={Building2}
              label="Average Scheme Cost"
              value={formatCurrency(summary.avgSchemeCost)}
            />
            <SummaryStat
              icon={Activity}
              label="Active / Archived"
              value={`${summary.activeCount} / ${summary.archivedCount}`}
            />
            <SummaryStat
              icon={Home}
              label="Projects with Data"
              value={`${summary.schemes.length}`}
              sub={`${projects.length - summary.schemes.length} have no BOQ/BIM`}
            />
          </div>
        )}

        {/* Category distribution */}
        {summary && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Category Distribution (Active Projects)</CardTitle>
              <CardDescription>
                Total cost breakdown by category across all active schemes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-5">
                {Object.entries(summary.categoryDistribution).map(([cat, total]) => {
                  const grandTotal = activeSchemes.reduce((a, s) => a + s.grandTotal, 0);
                  const pct = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0.0';
                  const Icon = CATEGORY_ICONS[cat] ?? Box;
                  return (
                    <div key={cat} className="rounded-lg bg-[var(--bg-tertiary)] p-4">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={CATEGORY_COLORS[cat] ?? 'text-[var(--text-muted)]'} />
                        <span className="text-sm font-medium">{cat}</span>
                      </div>
                      <div className="mt-2 text-lg font-semibold">{formatCurrency(total)}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cat === 'Walls' ? 'bg-blue-500' : cat === 'Slabs' ? 'bg-purple-500' : cat === 'Roof' ? 'bg-amber-500' : cat === 'Openings' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active projects */}
        {activeSchemes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold">Active Projects</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeSchemes.map((scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} />
              ))}
            </div>
          </section>
        )}

        {/* Archived projects */}
        {archivedSchemes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold text-[var(--text-muted)]">
              <Archive size={18} className="mr-2 inline" />
              Archived Projects
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedSchemes.map((scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {projects.length === 0 && isHydrated && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Building2 size={48} className="mb-4 text-[var(--text-muted)]" />
            <h2 className="font-display text-xl font-semibold">No projects yet</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Create your first project to see portfolio metrics.
            </p>
            <Link to="/new" className="mt-6">
              <Button className="gap-2">
                <Building2 size={16} />
                Start New Project
              </Button>
            </Link>
          </div>
        )}

        {/* No data projects */}
        {projects.length > 0 && summary && summary.schemes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Activity size={36} className="mb-3 text-[var(--text-muted)]" />
            <h2 className="font-display text-lg font-semibold">No portfolio data yet</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Projects exist but none have BOQ/BIM data. Open a project and generate designs first.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
