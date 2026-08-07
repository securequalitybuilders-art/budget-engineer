import { useState, useRef, useEffect } from 'react';
import { AiEngine, ParseResult, parseWithEngine, REMOTE_PROVIDERS } from '@/lib/ai/ai-provider';
import { useAiSettingsStore } from '@/stores/aiSettingsStore';
import { generateDesignOptionsFromBriefText } from '@/adapters/aiDesignAdapter';
import { composeDesignConstraints } from '@/adapters/designConstraints';
import { loadSiteContext } from '@/lib/site/siteContextReader';
import type { DesignOption } from '@/domain/boq';
import type { Tier1ParsedBrief } from '@/engine/tier1-types';
import type { DesignConcept } from '@/engine/tier2/conceptEngine';
import type { FloorPlan } from '@/engine/tier3/layoutEngine';
import { Tier1Readout } from './Tier1Readout';
import { ConceptPanel } from '@/components/dashboard/ConceptPanel';

const BUILDING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto-detect from brief' },
  { value: 'house-residential', label: 'House / Residential' },
  { value: 'duplex', label: 'Duplex / Semi-Detached' },
  { value: 'townhouse', label: 'Townhouse / Terraced' },
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
  ...REMOTE_PROVIDERS.map((p) => ({ id: p.id as AiEngine, label: p.label, hint: p.rateLimit })),
];

interface AiBriefPanelProps {
  projectId?: string;
  onParsed?: (result: ParseResult) => void;
  onDesignOptionsGenerated?: (options: DesignOption[]) => void;
  onTier3Plans?: (plans: FloorPlan[]) => void;
  onBuildingTypeChange?: (bt: string) => void;
}

export function AiBriefPanel({ projectId, onParsed, onDesignOptionsGenerated, onTier3Plans, onBuildingTypeChange }: AiBriefPanelProps) {
  const [briefText, setBriefText] = useState('');
  const { engine, apiKeys, setEngine, setApiKey } = useAiSettingsStore();
  const [aiEngine, setAiEngine] = useState<AiEngine>(engine);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [buildingType, setBuildingType] = useState('auto');
  // useRef avoids stale closure in async handleGenerate (Sprint 39C)
  const buildingTypeRef = useRef(buildingType);
  useEffect(() => { buildingTypeRef.current = buildingType }, [buildingType]);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [tier1Parsed, setTier1Parsed] = useState<Tier1ParsedBrief | null>(null);
  const [tier2Concept, setTier2Concept] = useState<DesignConcept | null>(null);

  const isRemote = (e: AiEngine) => REMOTE_PROVIDERS.some((p) => p.id === e);
  const remoteConfig = REMOTE_PROVIDERS.find((p) => p.id === aiEngine);

  const selectEngine = (e: AiEngine) => {
    setAiEngine(e);
    setEngine(e);
    setShowApiKeyInput(false);
  };

  const saveApiKey = () => {
    if (!apiKeyInput.trim() || !remoteConfig) return;
    setApiKey(remoteConfig.id, apiKeyInput.trim());
    setApiKeyInput('');
    setShowApiKeyInput(false);
  };

  const handleGenerate = async () => {
    if (!briefText.trim()) return;
    setAiStatus('Parsing…');
    setTier2Concept(null);
    try {
      const apiKey = aiEngine !== 'local-rules' && aiEngine !== 'webllm' ? apiKeys[aiEngine] : undefined;
      const result = await parseWithEngine(briefText, aiEngine, { apiKey });
      const optionsResult = generateDesignOptionsFromBriefText(briefText, 'zimbabwe', buildingTypeRef.current);
      const count = optionsResult.designOptions.length;
      const engineLabel = isRemote(result.engineUsed)
        ? REMOTE_PROVIDERS.find((p) => p.id === result.engineUsed)?.label ?? result.engineUsed
        : result.engineUsed;
      setAiStatus(
        result.fellBack
          ? `⚠ Generated ${count} option${count > 1 ? 's' : ''} — fell back to ${engineLabel}: ${result.fallbackReason}`
          : `✅ Generated ${count} design option${count > 1 ? 's' : ''} via ${engineLabel}`
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
            const siteContext = projectId ? loadSiteContext(projectId) : null
            const constraints = composeDesignConstraints(siteContext, {
              maxStructuralSpan: parsed.typology?.maxStructuralSpan,
            })
            const { generateLayoutParameters, generateFloorPlans } = await import('@/engine/tier3/layoutEngine')
            const params = generateLayoutParameters(concept, parsed, constraints)
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
      <p className="mb-3 text-xs text-stone-400">Local-first · free-tier LLM providers optional</p>

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
      <div className="mb-3 flex flex-wrap gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            disabled={e.disabled}
            onClick={() => selectEngine(e.id)}
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

      {remoteConfig && (
        <div className="mb-3 rounded border border-stone-700/60 bg-stone-800/60 p-3">
          <p className="mb-1 text-xs font-medium text-stone-300">
            {remoteConfig.label} — free tier · {remoteConfig.rateLimit}
          </p>
          {apiKeys[remoteConfig.id] ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-emerald-400">API key saved ✓</p>
              <button
                onClick={() => setShowApiKeyInput(true)}
                className="rounded bg-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-600"
              >
                Replace key
              </button>
            </div>
          ) : showApiKeyInput ? (
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={`Paste your ${remoteConfig.label} API key`}
                className="w-full rounded border border-stone-700 bg-stone-900 p-2 text-sm text-stone-200 focus:border-cyan-600 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveApiKey}
                  className="rounded bg-cyan-700 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
                >
                  Save key
                </button>
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="rounded bg-stone-700 px-3 py-1 text-xs text-stone-300 hover:bg-stone-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowApiKeyInput(true)}
                className="rounded bg-cyan-700 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
              >
                Add API key
              </button>
              <a
                href={remoteConfig.signupUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Get a free key →
              </a>
            </div>
          )}
        </div>
      )}

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
        Opt-in free-tier LLM providers (Gemini, Groq, GitHub Models, OpenRouter) parse richer briefs —
        keys stay in your browser.
        Select a building type above or let the parser detect it from your text. The
        parametric engine then builds the 2D plan → BIM → BOQ for that type.
      </p>
    </div>
  );
}
