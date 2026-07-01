import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { loadExecutivePortfolioMetrics } from '@/lib/portfolio/executive-portfolio';
import { filterAndSortPortfolioProjects } from '@/adapters/portfolioFiltersAdapter';
import { archiveProject, restoreProject } from '@/services/projectArchiveService';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Building2, Home, Archive, DollarSign, Layers, SlidersHorizontal, Warehouse, DoorOpen, Box, Activity, Search, RotateCcw, X, Bug } from 'lucide-react';
import type { ExecutivePortfolioSummary, SchemePortfolioItem } from '@/lib/portfolio/executive-portfolio';
import type { StatusFilter, SortBy } from '@/adapters/portfolioFiltersAdapter';

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

function SchemeCard({
  scheme,
  onArchive,
  onRestore,
}: {
  scheme: SchemePortfolioItem;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const handleAction = (e: React.MouseEvent, action: 'archive' | 'restore') => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'archive') onArchive(scheme.id);
    else onRestore(scheme.id);
  };

  return (
    <div className="group relative h-full">
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
                        className={`w-full rounded-sm transition-all ${cat === 'Walls' ? 'bg-blue-500/40' : cat === 'Slabs' ? 'bg-purple-500/40' : cat === 'Roof' ? 'bg-amber-500/40' : cat === 'Openings' ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`}
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
      <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        {scheme.isArchived ? (
          <button
            onClick={(e) => handleAction(e, 'restore')}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            title="Restore project"
          >
            <RotateCcw size={14} />
          </button>
        ) : (
          <button
            onClick={(e) => handleAction(e, 'archive')}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            title="Archive project"
          >
            <Archive size={14} />
          </button>
        )}
      </div>
    </div>
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

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'highest-cost', label: 'Highest Cost' },
  { value: 'lowest-cost', label: 'Lowest Cost' },
];

export function PortfolioPage() {
  const { projects, loadProjects, isLoading, isHydrated } = useProjectStore();
  const [summary, setSummary] = useState<ExecutivePortfolioSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshMetrics = useCallback(async () => {
    if (projects.length === 0) {
      setSummary(null);
      return;
    }
    try {
      const result = await loadExecutivePortfolioMetrics(projects);
      setSummary(result);
      setSummaryError(null);
    } catch (err: unknown) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to load portfolio');
    }
  }, [projects]);

  useEffect(() => {
    if (!isHydrated) loadProjects();
  }, [isHydrated, loadProjects]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const handleArchive = useCallback(async (projectId: string) => {
    try {
      await archiveProject(projectId);
      setStatusMessage('Project archived');
      await loadProjects();
    } catch {
      setStatusMessage('Failed to archive project');
    }
  }, [loadProjects]);

  const handleRestore = useCallback(async (projectId: string) => {
    try {
      await restoreProject(projectId);
      setStatusMessage('Project restored');
      await loadProjects();
    } catch {
      setStatusMessage('Failed to restore project');
    }
  }, [loadProjects]);

  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  if (isLoading && !isHydrated) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--brand-accent)]" />
      </main>
    );
  }

  const schemes = summary?.schemes ?? [];
  const filteredSchemes = filterAndSortPortfolioProjects({ projects: schemes, search, statusFilter, sortBy });

  const activeSchemesCount = schemes.filter((s) => !s.isArchived).length;

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="absolute inset-0 aurora opacity-20 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
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
              <Badge variant={activeSchemesCount > 0 ? 'success' : 'secondary'}>
                {activeSchemesCount} active
              </Badge>
            )}
            <Link to="/feedback">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Send feedback">
                <Bug size={16} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="ml-auto">
              <X size={14} />
            </button>
          </div>
        )}

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
              sub={`Across ${activeSchemesCount} active projects`}
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
        {summary && schemes.length > 0 && (
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
                  const grandTotal = activeSchemesCount > 0 ? schemes.filter((s) => !s.isArchived).reduce((a, s) => a + s.grandTotal, 0) : 0;
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

        {/* Filters + search */}
        {schemes.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? 'bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-accent)]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Project count info */}
        {schemes.length > 0 && filteredSchemes.length < schemes.length && (
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Showing {filteredSchemes.length} of {schemes.length} projects
          </p>
        )}

        {/* Filtered projects */}
        {filteredSchemes.length > 0 && (
          <section className="mb-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSchemes.map((scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} onArchive={handleArchive} onRestore={handleRestore} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state: no filter matches */}
        {schemes.length > 0 && filteredSchemes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Search size={36} className="mb-3 text-[var(--text-muted)]" />
            <h2 className="font-display text-lg font-semibold">No projects match your filters</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Try changing the search term or status filter.
            </p>
            <Button
              variant="secondary"
              className="mt-4 gap-2"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
            >
              <X size={14} />
              Clear filters
            </Button>
          </div>
        )}

        {/* Empty state: no projects */}
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
        {projects.length > 0 && summary && schemes.length === 0 && !summaryError && (
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
