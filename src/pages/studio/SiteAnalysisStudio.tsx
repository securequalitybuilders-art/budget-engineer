import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HeliodonView } from '@/components/analysis/HeliodonView';
import { SiteAnalysisPanel } from '@/components/analysis/SiteAnalysisPanel';
import { computeFullSiteAnalysis, createDefaultSiteContext } from '@/engine/analysis/siteAnalysisEngine';
import type { SiteContext, DiagramType } from '@/domain/site';
import { ArrowLeft, Sun, Wind, Map, Trees, Route, Building2, Download } from 'lucide-react';

const DIAGRAM_TABS: { type: DiagramType; label: string; icon: React.ReactNode }[] = [
  { type: 'sun-wind-path', label: 'Sun & Wind', icon: <Sun size={14} /> },
  { type: 'access-noise', label: 'Access & Noise', icon: <Route size={14} /> },
  { type: 'figure-ground', label: 'Figure-Ground', icon: <Building2 size={14} /> },
  { type: 'natural-features', label: 'Natural Features', icon: <Trees size={14} /> },
  { type: 'permeability-transport', label: 'Permeability', icon: <Wind size={14} /> },
  { type: 'concept-urban-context', label: 'Concept', icon: <Map size={14} /> },
];

const STORAGE_KEY = (pid: string) => `site-analysis-${pid}`;

function loadPersistedSite(projectId: string): SiteContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(projectId));
    if (raw) return JSON.parse(raw) as SiteContext;
  } catch { /* ignore corrupt data */ }
  return null;
}

function persistSite(projectId: string, site: SiteContext): void {
  try {
    localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(site));
  } catch { /* storage full — ignore */ }
}

export function SiteAnalysisStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const [site, setSite] = useState<SiteContext>(() => {
    if (projectId) {
      const saved = loadPersistedSite(projectId);
      if (saved) return saved;
    }
    return { ...createDefaultSiteContext(projectId ?? 'demo') };
  });

  useEffect(() => {
    if (projectId) persistSite(projectId, site);
  }, [projectId, site]);
  const [selectedTab, setSelectedTab] = useState<DiagramType>('sun-wind-path');
  const [showHeliodon, setShowHeliodon] = useState(true);

  const fullAnalysis = computeFullSiteAnalysis(site);
  const selectedDiagram = fullAnalysis.diagrams.find(d => d.type === selectedTab);

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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/project/${projectId}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Site Analysis & Heliodon Studio</h1>
          <p className="text-xs text-[var(--text-muted)]">Six board-ready site analysis diagrams with heliodon, shadow, and environmental assessment.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Latitude</span>
          <input type="number" min={-90} max={90} step={0.1}
            value={site.lat}
            onChange={(e) => setSite(s => ({ ...s, lat: parseFloat(e.target.value) || 0 }))}
            className="w-24 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Longitude</span>
          <input type="number" min={-180} max={180} step={0.1}
            value={site.lng}
            onChange={(e) => setSite(s => ({ ...s, lng: parseFloat(e.target.value) || 0 }))}
            className="w-24 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Orientation</span>
          <input type="number" min={0} max={360} step={1}
            value={site.orientation}
            onChange={(e) => setSite(s => ({ ...s, orientation: parseFloat(e.target.value) || 0 }))}
            className="w-20 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Terrain</span>
          <select value={site.terrain}
            onChange={(e) => setSite(s => ({ ...s, terrain: e.target.value as SiteContext['terrain'] }))}
            className="w-24 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]">
            <option value="flat">Flat</option>
            <option value="sloping">Sloping</option>
            <option value="steep">Steep</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">Adj. Buildings</span>
          <input type="number" min={0} max={20}
            value={site.adjacentBuildings.length}
            onChange={(e) => setSite(s => ({
              ...s,
              adjacentBuildings: Array.from({ length: parseInt(e.target.value) || 0 }, (_, i) => ({
                id: `adj-${i}`, vertices: [{ x: i * 2, y: 0 }, { x: i * 2 + 8, y: 0 }, { x: i * 2 + 8, y: 6 }, { x: i * 2, y: 6 }],
                height: 6 + i, name: `Block ${String.fromCharCode(65 + i)}`,
              }))
            }))}
            className="w-16 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]" />
        </label>
        <button
          onClick={() => setShowHeliodon(v => !v)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            showHeliodon ? 'bg-[var(--brand-accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
          }`}
        >
          Heliodon
        </button>
      </div>

      {showHeliodon && (
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
      )}

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Six Board-Ready Site Diagrams</h2>
          <div className="flex items-center gap-2">
            {fullAnalysis.summary.recommendations.slice(0, 2).map((rec, i) => (
              <span key={i} className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                {rec}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {DIAGRAM_TABS.map(tab => (
            <button
              key={tab.type}
              onClick={() => setSelectedTab(tab.type)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTab === tab.type
                  ? 'bg-[var(--brand-accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full">
          {selectedDiagram && (
            <div className="flex items-center justify-center rounded-lg bg-white p-4">
              <div dangerouslySetInnerHTML={{ __html: selectedDiagram.svgContent }} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
              <div className="text-[10px] text-[var(--text-muted)]">Orientation Score</div>
              <div className={`text-lg font-bold ${fullAnalysis.summary.orientationScore >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                {fullAnalysis.summary.orientationScore}/100
              </div>
            </div>
            <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
              <div className="text-[10px] text-[var(--text-muted)]">Optimal Glazing</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{fullAnalysis.summary.optimalGlazingDirection}</div>
            </div>
            <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
              <div className="text-[10px] text-[var(--text-muted)]">Terrain</div>
              <div className="text-lg font-bold text-[var(--text-primary)] capitalize">{fullAnalysis.summary.terrainChallenge}</div>
            </div>
            <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
              <div className="text-[10px] text-[var(--text-muted)]">Wind Protection</div>
              <div className={`text-lg font-bold ${fullAnalysis.summary.windProtectionNeeded ? 'text-amber-400' : 'text-green-400'}`}>
                {fullAnalysis.summary.windProtectionNeeded ? 'Needed' : 'OK'}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Recommendations</h3>
          <ul className="space-y-1.5">
            {fullAnalysis.summary.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-accent)]" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 rounded-md bg-[var(--brand-accent)] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90">
          <Download size={14} />
          Export All Site Diagrams
        </button>
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">
        Site analysis data is for early-stage reference. Always consult a registered professional for final site assessment. Diagrams are board-ready for presentation and technical review.
      </p>
    </div>
  );
}
