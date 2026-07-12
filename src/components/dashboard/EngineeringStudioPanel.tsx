import { useState, useMemo } from 'react';
import { AiBriefPanel } from '@/components/ai/AiBriefPanel';
import { RateCardPanel } from '@/components/rates/RateCardPanel';
import { RebarSpecPanel } from '@/components/structural/RebarSpecPanel';
import { FootingSizingPanel } from '@/components/structural/FootingSizingPanel';
import { LoadAnalysisPanel } from '@/components/structural/LoadAnalysisPanel';
import { AnalysisPanel } from '@/components/dashboard/AnalysisPanel';
import { StructuralGeneratorPanel } from '@/components/structural/StructuralGeneratorPanel';
import { MaterialSwitchPanel } from '@/components/structural/MaterialSwitchPanel';
import { ClashHealerPanel } from '@/components/structural/ClashHealerPanel';
import { RATE_CARDS } from '@/lib/rates/rate-card';
import type { DesignOption } from '@/domain/boq';
import type { BOQ } from '@/lib/boq/boq-types';
import type { PlanModel } from '@/domain/plan';
import type { BimModel, CadFloor } from '@/domain/ws6-types';
import type { ParseResult } from '@/lib/ai/ai-provider';
import type { BuildingGraph } from '@/domain/building';

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
      <p className="text-sm text-stone-400">{message}</p>
    </div>
  );
}

type TabId = 'ai' | 'rates' | 'rebar' | 'footings' | 'loads' | 'section' | 'analysis' | 'columns' | 'materials' | 'clashes';

const TABS: { id: TabId; label: string }[] = [
  { id: 'ai', label: 'AI Brief' },
  { id: 'rates', label: 'Rates' },
  { id: 'rebar', label: 'Rebar' },
  { id: 'footings', label: 'Footings' },
  { id: 'loads', label: 'Loads' },
  { id: 'columns', label: 'Columns' },
  { id: 'materials', label: 'Materials' },
  { id: 'clashes', label: 'Clashes' },
  { id: 'section', label: 'Section' },
  { id: 'analysis', label: 'Analysis' },
];

function safeSqrt(n: number): number {
  return n > 0 ? Math.sqrt(n) : 0;
}

function sampleGraph(design: DesignOption | null): BuildingGraph | null {
  if (!design || design.grossFloorArea <= 0) return null;
  const dim = Math.sqrt(design.grossFloorArea);
  return {
    meta: { projectId: '', projectName: design.name, projectType: design.buildingType ?? 'house', clientName: '', createdAt: '', updatedAt: '', version: '1.0', units: 'metric', coordinates: { lat: 0, lng: 0 }, description: '' },
    dimensions: { length: dim * 2, width: dim, height: 6, area: design.grossFloorArea, levels: 2, maxHeight: 6 },
    walls: [
      { id: 'w-ext-1', start: { x: 0, y: 0, z: 0 }, end: { x: dim * 2, y: 0, z: 0 }, length: dim * 2, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
      { id: 'w-ext-2', start: { x: dim * 2, y: 0, z: 0 }, end: { x: dim * 2, y: dim, z: 0 }, length: dim, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
      { id: 'w-ext-3', start: { x: dim * 2, y: dim, z: 0 }, end: { x: 0, y: dim, z: 0 }, length: dim * 2, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
      { id: 'w-ext-4', start: { x: 0, y: dim, z: 0 }, end: { x: 0, y: 0, z: 0 }, length: dim, thickness: 0.2, height: 3, role: 'exterior', material: 'brick', type: 'wall', levelId: 'l1' },
    ],
    slabs: [],
    openings: [
      { id: 'o-w1', wallId: 'w-ext-1', kind: 'window', width: 1.2, height: 1.5, sillHeight: 0.9, xPosition: 2 },
      { id: 'o-d1', wallId: 'w-ext-1', kind: 'door', width: 0.9, height: 2.1, sillHeight: 0, xPosition: 0.5 },
    ],
    spaces: [{ id: 'sp1', name: 'Main Area', programme: 'living', levelId: 'l1', areaM2: design.grossFloorArea, bbox: { minX: 0, minY: 0, maxX: dim * 2, maxY: dim } }],
    levels: [{ id: 'l1', name: 'Ground', elevation: 0, height: 3, order: 0 }, { id: 'l2', name: 'First', elevation: 3, height: 3, order: 1 }],
    columns: [], beams: [], stairs: [], roof: null, materials: [],
    structural: { foundation: 'strip', framing: 'timber', roofType: 'pitched' },
    mechanical: { coolingLoad: 10, heatingLoad: 12, ventilationRate: 1.5 },
  };
}

function buildSampleBim(design: DesignOption | null): BimModel | null {
  if (!design || design.grossFloorArea <= 0) return null;
  const floor: CadFloor = { id: 'f1', name: 'Ground', elevation: 0, height: 3 };
  return {
    id: 'bim-sample',
    projectId: '',
    name: design.name,
    floors: [floor],
    elements: [
      {
        id: 'slab1', cadId: 'cad1', type: 'slab', floorId: 'f1',
        name: 'Ground slab', x: 0, y: 0,
        width: safeSqrt(design.grossFloorArea) * 2,
        depth: safeSqrt(design.grossFloorArea),
        height: 0.15, area: design.grossFloorArea,
        metadata: { ifcClass: 'IfcSlab', category: 'slab', properties: {} },
      },
    ],
  };
}

import type { FloorPlan } from '@/engine/tier3/layoutEngine';

interface EngineeringStudioPanelProps {
  selectedDesign: DesignOption | null;
  activePlan?: PlanModel | null;
  boq?: BOQ | null;
  onDesignOptionsGenerated?: (options: DesignOption[]) => void;
  onParsed?: (result: ParseResult) => void;
  onTier3Plans?: (plans: FloorPlan[]) => void;
  onBuildingTypeChange?: (bt: string) => void;
}

export function EngineeringStudioPanel({ selectedDesign, activePlan, boq, onDesignOptionsGenerated, onParsed, onTier3Plans, onBuildingTypeChange }: EngineeringStudioPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ai');

  const sampleBim = useMemo(() => buildSampleBim(selectedDesign), [selectedDesign]);

  const sampleBuildingGraph = useMemo(() => sampleGraph(selectedDesign), [selectedDesign]);

  const slabArea = selectedDesign?.grossFloorArea ?? 0;
  const buildingType = selectedDesign?.buildingType ?? 'house';

  return (
    <div className="flex flex-col border-l border-stone-700/60 bg-stone-950/80">
      <div className="flex items-center gap-1 border-b border-stone-700/60 px-2 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Engineering Studio</span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-700/60 px-2 py-1.5" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={tab.id + '-tab'}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={tab.id + '-panel'}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-600/20 text-cyan-300'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div id="ai-panel" role="tabpanel" aria-labelledby="ai-tab" hidden={activeTab !== 'ai'}>{activeTab === 'ai' && <AiBriefPanel onParsed={onParsed} onDesignOptionsGenerated={onDesignOptionsGenerated} onTier3Plans={onTier3Plans} onBuildingTypeChange={onBuildingTypeChange} />}</div>

        <div id="rates-panel" role="tabpanel" aria-labelledby="rates-tab" hidden={activeTab !== 'rates'}>{activeTab === 'rates' && <RateCardPanel card={RATE_CARDS.zimbabwe} />}</div>

        <div id="rebar-panel" role="tabpanel" aria-labelledby="rebar-tab" hidden={activeTab !== 'rebar'}>{activeTab === 'rebar' && <RebarSpecPanel slabArea={slabArea} />}</div>

        <div id="footings-panel" role="tabpanel" aria-labelledby="footings-tab" hidden={activeTab !== 'footings'}>{activeTab === 'footings' && (
          sampleBim ? <FootingSizingPanel bim={sampleBim} /> : <EmptyState message="Start with the AI Brief tab to describe your project. Once a design is generated, footings can be sized here." />
        )}</div>

        <div id="loads-panel" role="tabpanel" aria-labelledby="loads-tab" hidden={activeTab !== 'loads'}>{activeTab === 'loads' && (
          sampleBim ? <LoadAnalysisPanel bim={sampleBim} /> : <EmptyState message="Start with the AI Brief tab to describe your project. Load analysis runs once a design is ready." />
        )}</div>

        <div id="columns-panel" role="tabpanel" aria-labelledby="columns-tab" hidden={activeTab !== 'columns'}>{activeTab === 'columns' && (
          sampleBuildingGraph ? <StructuralGeneratorPanel graph={sampleBuildingGraph} /> : <EmptyState message="Start with the AI Brief tab to generate a design." />
        )}</div>

        <div id="materials-panel" role="tabpanel" aria-labelledby="materials-tab" hidden={activeTab !== 'materials'}>{activeTab === 'materials' && (
          <MaterialSwitchPanel slabArea={slabArea} />
        )}</div>

        <div id="clashes-panel" role="tabpanel" aria-labelledby="clashes-tab" hidden={activeTab !== 'clashes'}>{activeTab === 'clashes' && (
          sampleBuildingGraph ? <ClashHealerPanel graph={sampleBuildingGraph} /> : <EmptyState message="Start with the AI Brief tab to generate a design." />
        )}</div>

        <div id="section-panel" role="tabpanel" aria-labelledby="section-tab" hidden={activeTab !== 'section'}>{activeTab === 'section' && (
          <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
            <p className="text-sm text-stone-400">Professional orthographic section drawings are now in the main Drawings view (toggle button in the canvas toolbar).</p>
          </div>
        )}</div>

        <div id="analysis-panel" role="tabpanel" aria-labelledby="analysis-tab" hidden={activeTab !== 'analysis'}>{activeTab === 'analysis' && (
          <AnalysisPanel plan={activePlan ?? null} design={selectedDesign} boq={boq ?? null} buildingType={buildingType} jurisdiction="zimbabwe" />
        )}</div>
      </div>

      {selectedDesign && (
        <div className="border-t border-stone-700/60 px-3 py-2">
          <p className="text-xs text-stone-400">
            Using <span className="text-stone-300">{selectedDesign.name}</span> —
            {slabArea > 0 ? ` ${slabArea.toFixed(0)} m²` : ' sample data'}
          </p>
        </div>
      )}
    </div>
  );
}
