import { useState, useRef, useEffect } from 'react';
import { AiEngine, ParseResult, parseWithEngine } from '@/lib/ai/ai-provider';
import { generateDesignOptionsFromBriefText } from '@/adapters/aiDesignAdapter';
import type { DesignOption } from '@/domain/boq';
import type { Tier1ParsedBrief } from '@/engine/tier1-types';
import type { DesignConcept } from '@/engine/tier2/conceptEngine';
import type { FloorPlan } from '@/engine/tier3/layoutEngine';
import { Tier1Readout } from './Tier1Readout';
import { ConceptPanel } from '@/components/dashboard/ConceptPanel';

const BUILDING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto-detect from brief' },
  { value: 'house-residential', label: 'House / Residential' },
  { value: 'apartment-multi', label: 'Apartment / Flat' },
  { value: 'clinic-health', label: 'Clinic / Health Centre' },
  { value: 'school-classroom', label: 'School / Classroom Block' },
  { value: 'hotel-fullservice', label: 'Hotel (Full Service)' },
  { value: 'office-commercial', label: 'Office / Commercial' },
  { value: 'retail-shop', label: 'Retail / Shop' },
  { value: 'restaurant', label: 'Restaurant / Eatery' },
  { value: 'church-worship', label: 'Church / Place of Worship' },
  { value: 'warehouse-industrial', label: 'Warehouse / Industrial' },
  { value: 'community-hall', label: 'Community Hall' },
  { value: 'market', label: 'Market / Informal Trading' },
  { value: 'petrol-station', label: 'Petrol Station / Filling Station' },
  { value: 'mixed-use', label: 'Mixed-Use (Commercial + Residential)' },
]

const ENGINES: { id: AiEngine; label: string; disabled?: boolean; hint?: string }[] = [
  { id: 'local-rules', label: 'Rules (instant)' },
  { id: 'webllm', label: 'WebLLM — not installed', disabled: true, hint: 'npm install @mlc-ai/web-llm' },
];

interface AiBriefPanelProps {
  onParsed?: (result: ParseResult) => void;
  onDesignOptionsGenerated?: (options: DesignOption[]) => void;
  onTier3Plans?: (plans: FloorPlan[]) => void;
  onBuildingTypeChange?: (bt: string) => void;
}

export function AiBriefPanel({ onParsed, onDesignOptionsGenerated, onTier3Plans, onBuildingTypeChange }: AiBriefPanelProps) {
  const [briefText, setBriefText] = useState('');
  const [aiEngine, setAiEngine] = useState<AiEngine>('local-rules');
  const [buildingType, setBuildingType] = useState('auto');
  // useRef avoids stale closure in async handleGenerate (Sprint 39C)
  const buildingTypeRef = useRef(buildingType);
  useEffect(() => { buildingTypeRef.current = buildingType }, [buildingType]);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [tier1Parsed, setTier1Parsed] = useState<Tier1ParsedBrief | null>(null);
  const [tier2Concept, setTier2Concept] = useState<DesignConcept | null>(null);

  const handleGenerate = async () => {
    if (!briefText.trim()) return;
    setAiStatus('Parsing…');
    setTier2Concept(null);
    try {
      const result = await parseWithEngine(briefText, aiEngine);
      const optionsResult = generateDesignOptionsFromBriefText(briefText, 'zimbabwe', buildingTypeRef.current);
      const count = optionsResult.designOptions.length;
      setAiStatus(
        `✅ Generated ${count} design option${count > 1 ? 's' : ''} via local rules`
      );
      onParsed?.(result);
      onDesignOptionsGenerated?.(optionsResult.designOptions);
      // Tier 1 intelligence (layered — never blocks the main flow)
      try {
        const { parseBrief } = await import('@/engine/parseBrief')
        const parsed = parseBrief(briefText, { buildingType: buildingTypeRef.current })
        setTier1Parsed(parsed)
        // Tier 2 concept engine (layered on Tier 1 — never blocks main flow)
        let concept: DesignConcept | null = null
        try {
          const { generateDesignConcept } = await import('@/engine/tier2/conceptEngine')
          concept = generateDesignConcept(parsed)
          setTier2Concept(concept)
        } catch {
          // Tier 2 failure is non-fatal; concept panel just won't show
        }
        // Tier 3 layout engine (layered on Tier 1+2 — fallback protected)
        try {
          if (concept) {
            const { generateLayoutParameters, generateFloorPlans } = await import('@/engine/tier3/layoutEngine')
            const params = generateLayoutParameters(concept, parsed)
            const plans = generateFloorPlans(params, parsed)
            onTier3Plans?.(plans)
          }
        } catch {
          console.warn('[Tier 3] Layout engine failed — falling back to generic plan generation')
        }
      } catch {
        // Tier 1 failure is non-fatal; just won't show readout
      }
    } catch (err) {
      setAiStatus(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-4">
      <h3 className="font-semibold text-stone-100">Enterprise AI — Brief to Design</h3>
      <p className="mb-3 text-xs text-stone-400">Local &amp; offline · no paid API</p>

      <label htmlFor="building-type" className="mb-1 block text-xs font-medium text-stone-400">Building type</label>
      <select
        id="building-type"
        value={buildingType}
        onChange={(e) => { setBuildingType(e.target.value); onBuildingTypeChange?.(e.target.value) }}
        className="mb-3 w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200 focus:border-cyan-600 focus:outline-none"
      >
        {BUILDING_TYPE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <label className="mb-1 block text-xs font-medium text-stone-400">AI engine</label>
      <div className="mb-3 flex gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            disabled={e.disabled}
            onClick={() => setAiEngine(e.id)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              e.disabled
                ? 'cursor-not-allowed bg-stone-800/50 text-stone-400 line-through'
                : aiEngine === e.id
                  ? 'bg-cyan-700 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
            title={e.hint}
          >
            {e.label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs font-medium text-stone-400">Design brief (natural language)</label>
      <textarea
        rows={3}
        value={briefText}
        onChange={(e) => setBriefText(e.target.value)}
        placeholder="e.g. 3 bedroom house with 2 bathrooms, open plan, 120 m², single storey"
        className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200 placeholder-stone-500 focus:border-cyan-600 focus:outline-none"
      />
      <div className="mt-3">
        <button
          onClick={handleGenerate}
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
        >
          Generate Design →
        </button>
      </div>

      {aiStatus && (
        <p className={`mt-2 text-xs ${aiStatus.includes('⚠') ? 'text-amber-400' : aiStatus.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
          {aiStatus}
        </p>
      )}

      <Tier1Readout parsed={tier1Parsed} />
      <ConceptPanel concept={tier2Concept} />

      <p className="mt-2 text-xs text-stone-400">
        <span className="text-emerald-400">✅ Local rules active by default</span> — instant, offline, no dependencies.
        WebLLM requires <code className="text-amber-400">npm install @mlc-ai/web-llm</code>.
        Select a building type above or let the parser detect it from your text. The
        parametric engine then builds the 2D plan → BIM → BOQ for that type.
      </p>
    </div>
  );
}
