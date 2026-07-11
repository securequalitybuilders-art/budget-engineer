import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HeliodonView } from '@/components/analysis/HeliodonView';
import { SiteAnalysisPanel } from '@/components/analysis/SiteAnalysisPanel';
import type { SiteContext } from '@/domain/site';
import { ArrowLeft } from 'lucide-react';

const DEFAULT_SITE: SiteContext = {
  projectId: 'demo',
  lat: -26.2041,
  lng: 28.0473,
  orientation: 15,
  terrain: 'flat',
  adjacentBuildings: [],
  windRose: {
    sectors: [
      { direction: 0, speed: 5.2, frequency: 0.15 },
      { direction: 45, speed: 4.1, frequency: 0.10 },
      { direction: 90, speed: 3.8, frequency: 0.12 },
      { direction: 135, speed: 4.5, frequency: 0.08 },
      { direction: 180, speed: 6.1, frequency: 0.20 },
      { direction: 225, speed: 5.5, frequency: 0.18 },
      { direction: 270, speed: 3.2, frequency: 0.10 },
      { direction: 315, speed: 4.0, frequency: 0.07 },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function SiteAnalysisStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const [site, setSite] = useState<SiteContext>({
    ...DEFAULT_SITE,
    projectId: projectId ?? 'demo',
  });

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">No project selected</h2>
          <Link to="/" className="text-sm text-[var(--brand-accent)] underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/project/${projectId}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Site Analysis</h1>
          <p className="text-xs text-[var(--text-muted)]">Heliodon, shadow casting, and environmental site assessment.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Latitude</span>
          <input
            type="number" min={-90} max={90} step={0.1}
            value={site.lat}
            onChange={(e) => setSite((s) => ({ ...s, lat: parseFloat(e.target.value) || 0 }))}
            className="w-28 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Longitude</span>
          <input
            type="number" min={-180} max={180} step={0.1}
            value={site.lng}
            onChange={(e) => setSite((s) => ({ ...s, lng: parseFloat(e.target.value) || 0 }))}
            className="w-28 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Orientation (°)</span>
          <input
            type="number" min={0} max={360} step={1}
            value={site.orientation}
            onChange={(e) => setSite((s) => ({ ...s, orientation: parseFloat(e.target.value) || 0 }))}
            className="w-28 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Terrain</span>
          <select
            value={site.terrain}
            onChange={(e) => setSite((s) => ({ ...s, terrain: e.target.value as SiteContext['terrain'] }))}
            className="w-28 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
          >
            <option value="flat">Flat</option>
            <option value="sloping">Sloping</option>
            <option value="steep">Steep</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Heliodon & Shadow</h2>
          <HeliodonView lat={site.lat} lng={site.lng} buildingFloors={2} />
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Site Analysis</h2>
          <SiteAnalysisPanel site={site} />
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">
        Site analysis data is for early-stage reference. Always consult a registered professional for final site assessment.
      </p>
    </div>
  );
}
