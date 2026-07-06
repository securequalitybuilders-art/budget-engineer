import { useState, useMemo } from 'react';
import { AiBriefPanel } from '@/components/ai/AiBriefPanel';
import { RateCardPanel } from '@/components/rates/RateCardPanel';
import { RebarSpecPanel } from '@/components/structural/RebarSpecPanel';
import { FootingSizingPanel } from '@/components/structural/FootingSizingPanel';
import { LoadAnalysisPanel } from '@/components/structural/LoadAnalysisPanel';
import { SectionView } from '@/components/drawings/SectionView';
import { AnalysisPanel } from '@/components/dashboard/AnalysisPanel';
import { RATE_CARDS } from '@/lib/rates/rate-card';
import type { DesignOption } from '@/domain/boq';
import type { BOQ } from '@/lib/boq/boq-types';
import type { PlanModel } from '@/domain/plan';
import type { BimModel, CadDocument, CadFloor } from '@/domain/ws6-types';
import type { ParseResult } from '@/lib/ai/ai-provider';

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
      <p className="text-sm text-stone-400">{message}</p>
    </div>
  );
}

type TabId = 'ai' | 'rates' | 'rebar' | 'footings' | 'loads' | 'section' | 'analysis';

const TABS: { id: TabId; label: string }[] = [
  { id: 'ai', label: 'AI Brief' },
  { id: 'rates', label: 'Rates' },
  { id: 'rebar', label: 'Rebar' },
  { id: 'footings', label: 'Footings' },
  { id: 'loads', label: 'Loads' },
  { id: 'section', label: 'Section' },
  { id: 'analysis', label: 'Analysis' },
];

function safeSqrt(n: number): number {
  return n > 0 ? Math.sqrt(n) : 0;
}

function buildSampleCad(design: DesignOption | null): CadDocument | null {
  if (!design || design.grossFloorArea <= 0) return null;
  const floor: CadFloor = { id: 'f1', name: 'Ground', elevation: 0, height: 3 };
  const wallLen = safeSqrt(design.grossFloorArea) * 2;
  return {
    id: 'cad-sample',
    projectId: '',
    name: design.name,
    materialSystem: 'concrete',
    floors: [floor],
    walls: [
      {
        id: 'w1', floorId: 'f1', start: { x: 0, y: 0 }, end: { x: wallLen, y: 0 },
        thickness: 0.23, height: 3, name: 'Outer wall', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} },
      },
      {
        id: 'w2', floorId: 'f1', start: { x: wallLen, y: 0 }, end: { x: wallLen, y: wallLen / 2 },
        thickness: 0.23, height: 3, name: 'Outer wall', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: {} },
      },
    ],
    openings: [],
    blocks: [],
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

  const sampleCad = useMemo(() => buildSampleCad(selectedDesign), [selectedDesign]);
  const sampleBim = useMemo(() => buildSampleBim(selectedDesign), [selectedDesign]);

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

        <div id="section-panel" role="tabpanel" aria-labelledby="section-tab" hidden={activeTab !== 'section'}>{activeTab === 'section' && (
          sampleCad ? (
            <SectionView cad={sampleCad} />
          ) : (
            <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
              <p className="text-sm text-stone-400">Start with the AI Brief tab. Once a design exists, section views appear here.</p>
            </div>
          )
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
